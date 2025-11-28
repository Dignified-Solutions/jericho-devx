import { scoreIntegrity } from '../core/scoring-engine.js';

export function evaluateIntegrity(taskBoard) {
  const integrityScore = scoreIntegrity(taskBoard?.history || []);
  const risk = integrityScore < 40 ? 'critical' : integrityScore < 70 ? 'warning' : 'stable';

  return {
    integrityScore,
    risk,
    recommendation: recommendationForRisk(risk)
  };
}

function recommendationForRisk(risk) {
  if (risk === 'critical') return 'Reduce scope and add accountability partner';
  if (risk === 'warning') return 'Tighten daily reviews and shorten tasks';
  return 'Maintain cadence and stretch target slightly';
}
