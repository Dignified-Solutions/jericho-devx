export default function Dashboard({ summary }) {
  return (
    <div className="metrics">
      <Metric label="Integrity" value={`${summary.integrity}%`} tone="mint" />
      <Metric label="Pending tasks" value={summary.tasksPending} tone="amber" />
      <Metric label="Completed" value={summary.tasksDone} tone="ink" />
      <Metric label="Sync payload" value={summary.syncReady} tone="aqua" />
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className={`metric metric-${tone}`}>
      <p className="eyebrow">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}
