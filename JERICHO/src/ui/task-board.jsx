export default function TaskBoard({ tasks, integrityScore, onTaskAction }) {
  const pending = (tasks || []).filter((task) => task.status !== 'done');
  const done = (tasks || []).filter((task) => task.status === 'done');

  return (
    <div className="stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Task board</p>
          <h2>Highest-leverage tasks</h2>
        </div>
        <div className="pill accent">Integrity {integrityScore}%</div>
      </div>

      <div className="lanes">
        <Lane
          title="Pending"
          accent="var(--amber)"
          tasks={pending}
          onAction={(id) => onTaskAction(id, 'done')}
          actionLabel="Mark done"
        />
        <Lane
          title="Done"
          accent="var(--mint)"
          tasks={done}
          onAction={(id) => onTaskAction(id, 'missed')}
          actionLabel="Reopen"
        />
      </div>
    </div>
  );
}

function Lane({ title, tasks, accent, onAction, actionLabel }) {
  return (
    <div className="lane">
      <div className="lane-header">
        <p className="eyebrow" style={{ color: accent }}>
          {title}
        </p>
        <span className="pill">{tasks.length} items</span>
      </div>
      <div className="lane-body">
        {tasks.map((task) => (
          <article key={task.id} className="task-card">
            <p className="eyebrow">{task.domain}</p>
            <h3>{task.title}</h3>
            <p className="small">{task.description}</p>
            <div className="task-meta">
              <span className="pill tiny">Priority {task.priority}</span>
              <span className="pill tiny ghost">Integrity {task.integrityScore}</span>
            </div>
            <button className="cta small" onClick={() => onAction(task.id)}>
              {actionLabel}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
