// The guided tour: each step says what to show (which tab, which pantry, what state the requests are in)
// and what to say. Numbers in the text come from the same matching code the app uses, so they can't drift.
//
// Going to a step always rebuilds the demo state from scratch, so Back, Next and auto-play all behave the same.
import sample from '../data/sample.json';
import { applyMatch, buildSeedRequests, formatHours, rankFarms } from './match.js';
import { labelFor } from './categories.js';

const { pantries, farms } = sample;
const FOCUS = 'p2'; // Decatur: its request starts open, so the whole story can be told from it
const focusPantry = pantries.find((p) => p.id === FOCUS);
const baseSeed = buildSeedRequests(sample.seedRequests, pantries, farms);
const baseReq = baseSeed.find((r) => r.pantryId === FOCUS);
const top = rankFarms(baseReq, focusPantry, farms)[0];

const onFocus = (base, fn) => base.map((r) => (r.pantryId === FOCUS ? fn(r) : r));
const matched = (base) => onFocus(base, (r) => applyMatch(r, top));
const partlyFunded = (base) =>
  onFocus(matched(base), (r) => ({ ...r, pledged: Math.round(r.goal * 0.6), pledgeCount: 8 }));
const funded = (base) => onFocus(matched(base), (r) => ({ ...r, pledged: r.goal, pledgeCount: 12, status: 'funded' }));
const delivered = (base) => onFocus(funded(base), (r) => ({ ...r, status: 'delivered', deliveredLbs: r.lbsPlanned }));

const farmName = top.farm.name;
const food = labelFor(baseReq.category).toLowerCase();
const goal = top.total;
const deliveredTotal = delivered(baseSeed).reduce((s, r) => s + r.deliveredLbs, 0);

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Fresh food is nearby. It just isn’t connected.',
    text: 'In Georgia, 1 in 6 people experienced food insecurity in 2024 (Feeding America). AsterEats starts from what each pantry actually needs, finds the best nearby farm, and lets neighbors fund the delivery. Everything here is sample data.',
    requests: (b) => b,
    pantry: null,
  },
  {
    id: 'sky',
    title: 'Planets are pantries. Stars are farms.',
    text: 'Each planet is a food pantry; each star is a local farm. The red dot on Decatur means it has posted a need that nobody has matched yet. Distances on the map are to scale.',
    requests: (b) => b,
    pantry: null,
    target: `g[data-tour="planet-${FOCUS}"] circle.ring-fill`,
  },
  {
    id: 'need',
    title: 'A pantry says what it needs',
    text: `Decatur needs ${baseReq.lbsNeeded} lbs of ${food} within ${formatHours(baseReq.deadlineHours)}. The request starts from the pantry’s need, not from whatever a farm happens to have.`,
    requests: (b) => b,
    pantry: FOCUS,
    target: '[data-tour="req-head"]',
  },
  {
    id: 'rank',
    title: 'Nearby farms are ranked, with reasons',
    text: `Each farm is scored on supply, distance, timing and cost, explained in plain words. ${farmName} comes first at ${top.score}/100: it has ${top.stock.lbs} lbs and is about ${Math.round(top.miles)} miles away. Distances are straight-line estimates.`,
    requests: (b) => b,
    pantry: FOCUS,
    target: '[data-tour="top-farm"]',
  },
  {
    id: 'match',
    title: 'One click makes the match',
    text: `The pantry picks ${farmName}. The line is the match, and the comet is stardust traveling to the farm. The goal is $${top.produceCost} for the produce plus $${top.transportCost} for delivery: $${goal} in all.`,
    requests: matched,
    pantry: FOCUS,
    target: `g[data-tour="farm-${top.farm.id}"] polygon`,
  },
  {
    id: 'fund',
    title: 'Neighbors chip in',
    text: 'People pledge small amounts and the gold ring fills as the goal gets closer. Milestones (Spark, Glow, Blaze) celebrate the community, not the biggest donor. There is no leaderboard. Pledges here are simulated.',
    requests: partlyFunded,
    pantry: FOCUS,
    target: '[data-tour="meter"]',
  },
  {
    id: 'funded',
    title: 'Fully funded',
    text: 'The last pledge lands and the request is funded. The farm can now make the delivery.',
    requests: funded,
    pantry: FOCUS,
    target: '[data-tour="meter"]',
  },
  {
    id: 'delivered',
    title: 'The pantry confirms what arrived',
    text: 'A delivery only counts once the pantry confirms the pounds it actually received. That keeps our numbers honest, and the planet glows to show it.',
    requests: delivered,
    pantry: FOCUS,
    target: `g[data-tour="planet-${FOCUS}"] circle.ring-fill`,
  },
  {
    id: 'impact',
    title: 'Impact you can trust',
    text: `The Impact tab counts only pantry-confirmed deliveries: ${deliveredTotal} lbs so far in this sample. Nothing is counted just because a pledge was made.`,
    requests: delivered,
    view: 'impact',
    pantry: FOCUS,
    target: '[data-tour="tiles"]',
  },
  {
    id: 'map',
    title: 'A plain map for anyone who prefers one',
    text: 'Not everyone wants a night sky. Map view shows highways and city names, and “Larger text” makes every label bigger. The roads are simplified, so it is for orientation, not directions.',
    requests: delivered,
    pantry: FOCUS,
    mapMode: 'map',
    target: '[data-tour="views"]',
  },
  {
    id: 'end',
    title: 'Your turn',
    text: 'That is the loop: a need, a match, funding, and a verified delivery. Click any star to see a farm’s details, or open the Questions tab for straight answers about money and trust. “Reset demo” always restores the start.',
    requests: delivered,
    pantry: FOCUS,
  },
];
