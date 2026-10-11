import { haversineMiles } from './geo.js';
import { labelFor } from './categories.js';

// ---- Tunable assumptions (all sample-data estimates, not real logistics) ----
export const MPH = 30; // average delivery speed
const TRANSPORT_BASE = 10; // flat $ per delivery
const TRANSPORT_PER_MILE = 2.5; // $ per straight-line mile

export const MILESTONES = [
  { at: 0.25, label: 'Spark' },
  { at: 0.5, label: 'Glow' },
  { at: 0.75, label: 'Blaze' },
  { at: 1, label: 'Funded' },
];

export function formatHours(h) {
  if (h < 1) return `${Math.max(5, Math.round((h * 60) / 5) * 5)} min`;
  const r = Math.round(h * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} h`;
}

/**
 * Scores one farm against one request and explains the result in plain words.
 * Eligible = sells the right produce AND can arrive before the deadline.
 * Score (0-100) = supply 40 + distance 30 + timing 20 + cost 10.
 */
export function evaluateFarm(request, pantry, farm) {
  const label = labelFor(request.category).toLowerCase();
  const stock = farm.produce.find((p) => p.category === request.category);
  const miles = haversineMiles(pantry, farm);
  const base = { farm, miles, stock: stock || null };

  if (!stock || stock.lbs <= 0) {
    return { ...base, eligible: false, score: 0, reasons: [`No ${label} listed right now`] };
  }

  const etaHours = farm.prepHours + miles / MPH;
  if (etaHours > request.deadlineHours) {
    return {
      ...base,
      eligible: false,
      score: 0,
      etaHours,
      reasons: [
        `Earliest delivery is about ${formatHours(etaHours)}, after the ${formatHours(
          request.deadlineHours,
        )} deadline`,
      ],
    };
  }

  const lbs = Math.min(stock.lbs, request.lbsNeeded);
  const coverage = lbs / request.lbsNeeded;
  const produceCost = farm.mode === 'donate' ? 0 : Math.round(lbs * stock.pricePerLb);
  const transportCost = Math.round(TRANSPORT_BASE + TRANSPORT_PER_MILE * miles);
  const total = produceCost + transportCost;

  const supplyScore = 40 * coverage;
  const distanceScore = 30 * Math.max(0, 1 - miles / 40);
  const timingScore = 20 * (0.4 + 0.6 * Math.max(0, 1 - etaHours / request.deadlineHours));
  const costScore = 10 * Math.max(0, 1 - total / lbs / 2.5);
  const score = Math.round(supplyScore + distanceScore + timingScore + costScore);

  const reasons = [
    coverage >= 1
      ? `Has ${stock.lbs} lbs available (needs ${request.lbsNeeded})`
      : `Covers ${Math.round(coverage * 100)}% of the request (${stock.lbs} of ${request.lbsNeeded} lbs)`,
    `About ${Math.round(miles)} mi away`,
    `Can deliver in about ${formatHours(etaHours)}, ${formatHours(
      request.deadlineHours - etaHours,
    )} before the deadline`,
    farm.mode === 'donate'
      ? 'Donates surplus, so only delivery needs funding'
      : `Sells at $${stock.pricePerLb.toFixed(2)}/lb`,
  ];

  return {
    ...base,
    eligible: true,
    score,
    lbs,
    coverage,
    etaHours,
    produceCost,
    transportCost,
    total,
    reasons,
  };
}

export function rankFarms(request, pantry, farms) {
  const evals = farms.map((f) => evaluateFarm(request, pantry, f));
  const ok = evals.filter((e) => e.eligible).sort((a, b) => b.score - a.score);
  const no = evals.filter((e) => !e.eligible).sort((a, b) => a.farm.name.localeCompare(b.farm.name));
  return [...ok, ...no];
}

export function applyMatch(request, ev) {
  return {
    ...request,
    status: 'matched',
    farmId: ev.farm.id,
    goal: ev.total,
    produceCost: ev.produceCost,
    transportCost: ev.transportCost,
    lbsPlanned: ev.lbs,
    pledged: 0,
    pledgeCount: 0,
  };
}

export function buildSeedRequests(seed, pantries, farms) {
  const pantryById = Object.fromEntries(pantries.map((p) => [p.id, p]));
  const farmById = Object.fromEntries(farms.map((f) => [f.id, f]));
  return seed.map((s) => {
    const base = {
      id: s.id,
      pantryId: s.pantryId,
      category: s.category,
      lbsNeeded: s.lbsNeeded,
      deadlineHours: s.deadlineHours,
      status: s.status,
      farmId: null,
      goal: 0,
      produceCost: 0,
      transportCost: 0,
      lbsPlanned: 0,
      pledged: 0,
      pledgeCount: s.pledgeCount || 0,
      deliveredLbs: 0,
    };
    if (!s.farmId) return base;
    const ev = evaluateFarm(base, pantryById[s.pantryId], farmById[s.farmId]);
    if (!ev.eligible) throw new Error(`Seed request ${s.id} is matched to an ineligible farm`);
    const matched = { ...applyMatch(base, ev), status: s.status, pledgeCount: s.pledgeCount || 0 };
    matched.pledged =
      s.status === 'matched' ? Math.round(matched.goal * (s.pledgedFraction ?? 0)) : matched.goal;
    matched.deliveredLbs =
      s.status === 'delivered' || s.status === 'partial' ? Math.min(matched.lbsPlanned, s.deliveredLbs ?? matched.lbsPlanned) : 0;
    return matched;
  });
}
