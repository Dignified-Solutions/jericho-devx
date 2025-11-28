const REASON_TEXT = {
  over_weighted_domain: 'This area is already heavily represented in recent cycles.',
  under_weighted_domain: 'This area is underrepresented and needs attention.',
  deferred_by_compression: 'Deferred to protect capacity and keep this cycle realistic.',
  dropped_by_compression: 'Dropped from this cycle to prevent overload.',
  above_cycle_cap: "Above this cycle's task cap; kept but inactive this round.",
  deadline_priority: 'Prioritized because its deadline is approaching.',
  identity_priority: 'Prioritized because it reinforces your target identity.'
};

export function explainReasonCode(code) {
  if (!code) return 'Reason unavailable';
  return REASON_TEXT[code] || `Reason: ${code}`;
}

export function explainTaskReasons(task) {
  const decision = task?.decision;
  const governanceEligible = !!task?.governanceEligible;
  let headline = null;

  if (decision === 'keep' && governanceEligible) {
    headline = 'Scheduled for this cycle.';
  } else if (decision === 'keep' && !governanceEligible) {
    headline = 'Kept, but inactive this cycle due to load limits.';
  } else if (decision === 'defer') {
    headline = 'Deferred to a later cycle to protect capacity.';
  } else if (decision === 'drop') {
    headline = 'Dropped from the current plan.';
  }

  const details = Array.isArray(task?.reasons) ? task.reasons.map((r) => explainReasonCode(r)) : [];

  return { headline, details };
}

export default {
  explainReasonCode,
  explainTaskReasons
};
