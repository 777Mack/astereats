// Sanity checks for the matching logic. Run with: npm run check
import { readFileSync } from 'node:fs';
import { rankFarms, evaluateFarm, buildSeedRequests } from '../src/lib/match.js';
import { parseRequest } from '../src/lib/parseRequest.js';

const data = JSON.parse(readFileSync(new URL('../src/data/sample.json', import.meta.url)));
const pantry = Object.fromEntries(data.pantries.map((p) => [p.id, p]));
const farm = Object.fromEntries(data.farms.map((f) => [f.id, f]));

let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failed++;
};

const seeds = buildSeedRequests(data.seedRequests, data.pantries, data.farms);
const r1 = seeds.find((r) => r.id === 'r1');

// --- Headline demo: 100 lbs of greens, Sample Farm A ---
const ranked = rankFarms(r1, pantry.p1, data.farms);
console.log('\nRanking for r1 (100 lbs greens, 24 h, Adamsville):');
for (const e of ranked) {
  console.log(
    `  ${e.farm.name.padEnd(14)} ${e.eligible ? 'score ' + String(e.score).padStart(3) : 'ineligible'}  ` +
      `${e.miles.toFixed(1)} mi  ${e.eligible ? '$' + e.produceCost + ' + $' + e.transportCost : e.reasons[0]}`,
  );
}
console.log('');

ok(ranked[0].farm.id === 'fA', 'Farm A ranks first for the headline request');
const evA = evaluateFarm(r1, pantry.p1, farm.fA);
ok(Math.abs(evA.miles - 6) < 0.3, `Farm A is about 6 mi away (got ${evA.miles.toFixed(2)})`);
ok(evA.produceCost === 75, `Produce cost is $75 (got $${evA.produceCost})`);
ok(evA.transportCost === 25, `Delivery cost is $25 (got $${evA.transportCost})`);
ok(r1.goal === 100, `Funding goal is $100 (got $${r1.goal})`);
ok(r1.pledged === 65, `Seed pledge is $65 (got $${r1.pledged})`);

// --- Deadline logic ---
const evF = evaluateFarm(r1, pantry.p1, farm.fF);
ok(!evF.eligible && /deadline/.test(evF.reasons[0]), 'Farm F is ineligible because it misses the 24 h deadline');
const evD = evaluateFarm(r1, pantry.p1, farm.fD);
ok(!evD.eligible && /No leafy greens/.test(evD.reasons[0]), 'Farm D is ineligible (no greens listed)');

// --- Partial coverage is allowed but scored lower ---
const evC = evaluateFarm(r1, pantry.p1, farm.fC);
ok(evC.eligible && evC.coverage === 0.6 && evC.score < evA.score, 'Farm C covers 60% and scores below Farm A');
ok(evC.produceCost === 0, 'Farm C donates surplus, so produce cost is $0');

// --- Every seed is internally consistent ---
for (const r of seeds) {
  if (r.status === 'funded' || r.status === 'delivered') {
    ok(r.pledged === r.goal && r.goal > 0, `${r.id} (${r.status}) is fully funded at $${r.goal}`);
  }
  if (r.status === 'open') ok(r.farmId === null, `${r.id} is open with no farm chosen`);
}
const r2 = seeds.find((r) => r.id === 'r2');
const rank2 = rankFarms(r2, pantry.p2, data.farms);
ok(rank2[0].farm.id === 'fD', `Decatur roots request ranks Farm D first (got ${rank2[0].farm.name})`);

// --- Request parser ---
const p = parseRequest('We are low on greens, maybe 100 lbs? Need it by tomorrow.');
ok(p.category === 'greens' && p.lbs === 100 && p.deadlineHours === 24, 'Parser reads "low on greens, maybe 100 lbs, tomorrow"');
const p2 = parseRequest('need about 40 pounds of sweet potatoes within 2 days');
ok(p2.category === 'roots' && p2.lbs === 40 && p2.deadlineHours === 48, 'Parser reads pounds, sweet potatoes, and "within 2 days"');
const p3 = parseRequest('anything helps');
ok(!p3.found.category && !p3.found.lbs && !p3.found.deadline, 'Parser reports missing fields instead of guessing');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
