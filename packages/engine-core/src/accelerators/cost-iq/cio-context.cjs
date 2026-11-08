'use strict';
/**
 * CQ12 slice 2: the context, priority and hotspot answers in the result. Nothing here moves a score or raises a finding; it
 * records what the client said, sets the CIO's expectations against the findings the scored answers raised, and attaches each
 * hotspot or share answer to the finding it qualifies. The mapping and its basis are in cio-context.json.
 */
const MAP = require('./cio-context.json');

const arr = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
const has = (answers, id) => answers[id] != null && answers[id] !== '' && !(Array.isArray(answers[id]) && answers[id].length === 0);
const one = (answers, id) => (has(answers, id) ? answers[id] : null);

/** @param {Record<string, unknown>} answers  @param {Array<{id: string, severity: string}>} findings */
function cioContext(answers, findings) {
  const raised = new Set(findings.map(f => f.id));
  const profile = Object.fromEntries(Object.entries(MAP.profile).map(([k, id]) => [k, one(answers, id)]));
  const p = MAP.priorities;

  // The client's own view set against the evidence: CORE-09 (value opportunities, up to five, the first three ranked) and
  // ADP-55 (the largest near-term cost opportunity, up to three). Each area is confirmed, not confirmed, or not assessed.
  const compare = (questionId, map) => arr(answers[questionId]).map(String).map((area, k) => {
    const findingIds = map[area] ?? [];
    const hit = findingIds.filter(f => raised.has(f));
    return { area, rank: k < 3 ? k + 1 : null, findingIds, raised: hit, status: !findingIds.length ? 'not-assessed' : hit.length ? 'confirmed' : 'not-confirmed' };
  });
  const expectations = compare(p.expectedOpportunities, MAP.expectedOpportunityFindings.map);
  const costHypotheses = compare(p.costHypotheses, MAP.costHypothesisFindings.map);
  const expectedFindings = new Set([...expectations, ...costHypotheses].flatMap(e => e.findingIds));
  const blindSpots = expectations.length + costHypotheses.length
    ? findings.filter(f => MAP.blindSpotSeverities.includes(f.severity) && !expectedFindings.has(f.id)).map(f => f.id)
    : [];

  const funding = one(answers, p.fundingChange);
  const fundingRecommendation = funding != null ? (MAP.fundingChangeRecommendation.map[funding] ?? null) : null;

  const findingContext = {};
  const unconfirmedHotspots = [];
  for (const q of MAP.findingContext.questions) {
    if (!has(answers, q.questionId)) continue;
    const answer = answers[q.questionId];
    if (arr(answer).length && arr(answer).every(v => q.none.includes(String(v)))) continue;
    const item = { questionId: q.questionId, kind: q.kind, label: q.label, answer };
    if (q.findingId && raised.has(q.findingId)) (findingContext[q.findingId] = findingContext[q.findingId] || []).push(item);
    else if (MAP.unconfirmedHotspots.kinds.includes(q.kind)) unconfirmedHotspots.push({ ...item, findingId: q.findingId });
  }

  return {
    version: MAP.version,
    profile,
    protect: arr(answers[p.protect]).map(String).slice(0, 3),
    pressure: one(answers, p.pressure),
    fundingChange: funding,
    fundingRecommendation,
    fundingRecommendationRaised: fundingRecommendation != null && findings.some(f => (f.recommendationIds || []).includes(fundingRecommendation)),
    redirect: arr(answers[p.redirect]).map(String),
    barriers: arr(answers[p.barriers]).map(String),
    protectCapabilities: arr(answers[p.protectCapabilities]).map(String),
    expectations,
    costHypotheses,
    blindSpots,
    findingContext,
    unconfirmedHotspots
  };
}

/** Every question this module reads: used by the test that no collected question goes unused. */
const CONTEXT_QUESTIONS = [...Object.values(MAP.profile), ...Object.values(MAP.priorities), ...MAP.findingContext.questions.map(q => q.questionId)];

module.exports = { cioContext, CONTEXT_QUESTIONS };
