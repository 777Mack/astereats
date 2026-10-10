import { CATEGORIES } from './categories.js';

/**
 * DEMO PARSER: a simple keyword/regex reader that turns a messy sentence like
 * "low on greens, maybe 100 lbs, need it by tomorrow" into structured fields.
 *
 * It is NOT an AI model. To use Gemini (or any LLM) instead, keep this function's
 * return shape and call your model from a small server function, never from the
 * browser, so the API key stays private.
 */
export function parseRequest(text) {
  const t = (text || '').toLowerCase();

  let category = null;
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => t.includes(k))) {
      category = c.id;
      break;
    }
  }

  const lbsMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:lbs?\b|pounds?\b)/);
  const lbs = lbsMatch ? Math.round(parseFloat(lbsMatch[1])) : null;

  let deadlineHours = null;
  const dur = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|days?|d)\b/);
  if (dur) {
    const n = parseFloat(dur[1]);
    deadlineHours = dur[2].startsWith('d') ? n * 24 : n;
  } else if (/tomorrow/.test(t)) {
    deadlineHours = 24;
  } else if (/today|tonight|asap|urgent/.test(t)) {
    deadlineHours = 8;
  } else if (/week/.test(t)) {
    deadlineHours = 120;
  }

  return {
    category,
    lbs,
    deadlineHours,
    found: { category: !!category, lbs: lbs != null, deadline: deadlineHours != null },
  };
}
