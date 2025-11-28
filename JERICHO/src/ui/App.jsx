import { useEffect, useState } from 'react';
import IdentityCapture from './identity-capture.jsx';
import TaskBoard from './task-board.jsx';
import Dashboard from './dashboard.jsx';
import { fetchHealth, fetchPipeline, postGoal, postIdentity, postTaskStatus } from './api-client.js';

function AnalysisStrip({ analysis }) {
  if (!analysis) return null;

  const { systemHealth, forecast, strategicCalendar, cycleGovernance } = analysis || {};
  const healthStatus = systemHealth?.health?.status || 'unknown';
  const mode = cycleGovernance?.mode || 'execute';
  const allowedTasks = cycleGovernance?.allowedTasks ?? null;

  const healthLabel =
    healthStatus === 'green'
      ? 'System health: GREEN'
      : healthStatus === 'yellow'
        ? 'System health: YELLOW'
        : healthStatus === 'red'
          ? 'System health: RED'
          : 'System health: UNKNOWN';

  const modeLabel = `Cycle mode: ${mode.toUpperCase()}`;
  const capLabel = allowedTasks != null ? `Allowed tasks this cycle: ${allowedTasks}` : null;

  const forecastLabel = forecast?.goalForecast
    ? `Forecast: ${forecast.goalForecast.onTrack ? 'On track' : 'Off track'}`
    : null;

  const calendarSummary = strategicCalendar?.summary;
  const scheduleLabel =
    calendarSummary && typeof calendarSummary.averageLoad === 'number'
      ? `Cycles planned: ${calendarSummary.totalCycles}, avg load: ${calendarSummary.averageLoad.toFixed(1)}`
      : null;

  return (
    <div className="analysis-strip pills">
      <div className={`analysis-pill health-${healthStatus}`}>{healthLabel}</div>
      <div className={`analysis-pill mode-${mode}`}>{modeLabel}</div>
      {capLabel && <div className="analysis-pill">{capLabel}</div>}
      {forecastLabel && <div className="analysis-pill">{forecastLabel}</div>}
      {scheduleLabel && <div className="analysis-pill">{scheduleLabel}</div>}
    </div>
  );
}

function GovernanceAdvisories({ analysis }) {
  if (!analysis?.cycleGovernance) return null;
  const advisories = analysis.cycleGovernance.advisories || [];
  if (!advisories.length) return null;

  return (
    <div className="analysis-advisories">
      <div className="advisories-title">Cycle advisories</div>
      <ul>
        {advisories.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
    </div>
  );
}

function TaskColumn({ title, tasks, variant, onUpdateTaskStatus }) {
  return (
    <div className={`gov-column gov-${variant}`}>
      <div className="gov-column-header">
        <span className="gov-column-title">{title}</span>
        <span className="gov-column-count">{tasks.length}</span>
      </div>
      <div className="gov-column-body">
        {tasks.map((task) => (
          <div key={task.id} className="gov-task-card">
            <div className="gov-task-main">
              <div className="gov-task-title">{task.title || task.name || 'Task'}</div>
              <div className="gov-task-meta">
                <span className={`domain-pill domain-${task.domainStatus}`}>
                  {(task.domain || 'Unknown')} · {task.domainStatus}
                </span>
              </div>
            </div>
            {task.explanations && (
              <div className="gov-task-explain">
                {task.explanations.headline && (
                  <div className="gov-task-headline">{task.explanations.headline}</div>
                )}
                {task.explanations.details && task.explanations.details.length > 0 && (
                  <ul className="gov-task-details">
                    {task.explanations.details.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="task-actions">
              <button
                className="task-btn-complete"
                onClick={() => onUpdateTaskStatus(task.id, 'completed')}
              >
                Done
              </button>
              <button className="task-btn-miss" onClick={() => onUpdateTaskStatus(task.id, 'missed')}>
                Missed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GovernanceTaskBoard({ taskBoard, onUpdateTaskStatus }) {
  if (!taskBoard) return null;

  const tasks = taskBoard.tasks || [];
  const eligible = tasks.filter((t) => t.decision === 'keep' && t.governanceEligible);
  const overflow = tasks.filter((t) => t.decision === 'keep' && !t.governanceEligible);
  const deferred = tasks.filter((t) => t.decision === 'defer');
  const summary = taskBoard.summary || {};
  const { allowedTasks, eligibleCount, keptCount, deferredCount } = summary;

  return (
    <div className="governance-board">
      <div className="governance-board-header">
        <div className="governance-metric">
          <span className="label">This cycle load</span>
          <span className="value">
            {eligibleCount ?? 0}
            {typeof allowedTasks === 'number' ? ` / ${allowedTasks}` : ''}
          </span>
        </div>
        <div className="governance-metric">
          <span className="label">Kept tasks</span>
          <span className="value">{keptCount ?? 0}</span>
        </div>
        <div className="governance-metric">
          <span className="label">Deferred</span>
          <span className="value">{deferredCount ?? 0}</span>
        </div>
      </div>

      <div className="governance-columns">
        <TaskColumn
          title="This cycle (active)"
          tasks={eligible}
          variant="active"
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
        <TaskColumn
          title="This cycle (overflow)"
          tasks={overflow}
          variant="overflow"
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
        <TaskColumn
          title="Later / deferred"
          tasks={deferred}
          variant="deferred"
          onUpdateTaskStatus={onUpdateTaskStatus}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [taskBoard, setTaskBoard] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [goalError, setGoalError] = useState(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [identityDraft, setIdentityDraft] = useState({});
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState(null);
  const [isRunningNextCycle, setIsRunningNextCycle] = useState(false);
  const [cycleError, setCycleError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  const extractIdentityDraft = (identityObj = {}) => {
    const draft = {};
    Object.entries(identityObj || {}).forEach(([domain, caps]) => {
      if (caps && typeof caps === 'object') {
        Object.entries(caps).forEach(([cap, data]) => {
          const level = typeof data === 'object' && data !== null ? data.level : data;
          draft[`${domain}.${cap}`] = Number(level) || 1;
        });
      }
    });
    return draft;
  };

  const loadPipeline = async () => {
    try {
      const data = await fetchPipeline();
      setPipeline(data.pipeline || data);
      setAnalysis(data.pipeline?.analysis || null);
      setTaskBoard(data.pipeline?.taskBoard || null);
      setState(data.state || null);
      if (data.state?.identity) {
        setIdentityDraft(extractIdentityDraft(data.state.identity));
      }
      setError(null);
    } catch (err) {
      setError('Unable to reach API');
      setApiAvailable(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetchHealth();
        if (!active) return;
        setApiAvailable(true);
        if (!active) return;
        await loadPipeline();
      } catch (err) {
        if (!active) return;
        setApiAvailable(false);
        setError('Unable to reach API');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleGoalSubmit(goal) {
    if (!apiAvailable) {
      setError('API unavailable; changes are local only');
      return;
    }
    setError(null);
    try {
      const { pipeline: pl, state: st } = await postGoal(goal);
      setPipeline(pl);
      setAnalysis(pl?.analysis || null);
      setTaskBoard(pl?.taskBoard || null);
      setState(st);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIdentityUpdate(domain, capability, level) {
    if (!apiAvailable) {
      setError('API unavailable; changes are local only');
      return;
    }
    setError(null);
    try {
      const { pipeline: pl, state: st } = await postIdentity({ domain, capability, level });
      setPipeline(pl);
      setAnalysis(pl?.analysis || null);
      setTaskBoard(pl?.taskBoard || null);
      setState(st);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTaskToggle(taskId, status) {
    if (!apiAvailable) {
      setError('API unavailable; changes are local only');
      return;
    }
    setError(null);
    try {
      const { pipeline: pl, state: st } = await postTaskStatus({ id: taskId, status });
      setPipeline(pl);
      setAnalysis(pl?.analysis || null);
      setTaskBoard(pl?.taskBoard || null);
      setState(st);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveGoal() {
    if (!goalText.trim()) {
      setGoalError('Please enter a definite goal first.');
      return;
    }
    setIsSavingGoal(true);
    try {
      const resp = await fetch('/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: goalText.trim() })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save goal.');
      }
      setGoalText('');
      setGoalError(null);
      await loadPipeline();
    } catch (err) {
      setGoalError(err.message || 'Failed to save goal.');
    } finally {
      setIsSavingGoal(false);
    }
  }

  async function saveIdentityDraft() {
    setIsSavingIdentity(true);
    setIdentityError(null);
    try {
      const resp = await fetch('/identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: identityDraft })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update identity.');
      }
      await loadPipeline();
    } catch (err) {
      setIdentityError(err.message || 'Failed to update identity.');
    } finally {
      setIsSavingIdentity(false);
    }
  }

  async function runNextCycle() {
    setIsRunningNextCycle(true);
    setCycleError(null);
    try {
      const resp = await fetch('/cycle/next', { method: 'POST' });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to advance cycle.');
      }
      await loadPipeline();
    } catch (err) {
      setCycleError(err.message || 'Failed to advance cycle.');
    } finally {
      setIsRunningNextCycle(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    try {
      await fetch('/task-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status })
      });
      await loadPipeline();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  }

  const dashboardSummary = {
    integrity: pipeline?.integrity?.score || 0,
    tasksPending: pipeline?.integrity?.pendingCount ?? 0,
    tasksDone: pipeline?.integrity?.completedCount ?? 0,
    syncReady: pipeline?.syncPayload?.length || 0
  };

  const integrity = pipeline?.integrity;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Jericho System</p>
          <h1>Closed-loop behavioral execution</h1>
          <p className="lede">
            Capture identity, surface capability gaps, and drive tasks with integrity scoring.
          </p>
        </div>
        <Dashboard summary={dashboardSummary} />
      </header>

      {error && <div className="alert">{error}</div>}
      {loading && <div className="alert subtle">Loading pipeline...</div>}

      <AnalysisStrip analysis={analysis} />
      <GovernanceAdvisories analysis={analysis} />
      <GovernanceTaskBoard taskBoard={taskBoard} onUpdateTaskStatus={updateTaskStatus} />

      <div className="cycle-controls">
        <button className="cycle-next-button" onClick={runNextCycle} disabled={isRunningNextCycle}>
          {isRunningNextCycle ? 'Updating…' : 'Run next cycle'}
        </button>
        {cycleError && <span className="cycle-error">{cycleError}</span>}
      </div>

      <section className="today-panel">
        <h3 className="today-heading">Today</h3>
        {pipeline?.schedule?.todayPriorityTaskId ? (
          <>
            <div className="today-main-task">
              <span className="today-label">Priority task:</span>
              <span className="today-title">
                {taskBoard?.tasks?.find((t) => t.id === pipeline.schedule.todayPriorityTaskId)?.title ||
                  'Task'}
              </span>
            </div>
            <div className="today-meta">
              <span>Overflow tasks: {pipeline.schedule.overflowTasks?.length || 0}</span>
              <span>Integrity: {Math.round(pipeline?.integrity?.score || 0)}%</span>
            </div>
          </>
        ) : (
          <div className="today-empty">No priority task scheduled for today yet.</div>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow">Definite goal</p>
        <input
          type="text"
          className="goal-input"
          placeholder='e.g. "Grow revenue to $10k/month by 2026-06-01"'
          value={goalText}
          onChange={(e) => {
            setGoalText(e.target.value);
            if (goalError) setGoalError(null);
          }}
        />
        <button className="goal-save-button" onClick={saveGoal} disabled={isSavingGoal}>
          {isSavingGoal ? 'Saving…' : 'Save goal & refresh'}
        </button>
        {goalError && <div className="goal-error">{goalError}</div>}
      </section>

      <section className="panel">
        <p className="eyebrow">Identity levels</p>
        <div className="identity-list">
          {Object.entries(identityDraft).map(([capId, level]) => (
            <div key={capId} className="identity-row">
              <span className="identity-label">{capId}</span>
              <input
                className="identity-input"
                type="number"
                min={1}
                max={10}
                value={level}
                onChange={(e) => {
                  const next = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                  setIdentityDraft((prev) => ({ ...prev, [capId]: next }));
                }}
              />
            </div>
          ))}
        </div>
        <button className="identity-save-button" onClick={saveIdentityDraft} disabled={isSavingIdentity}>
          {isSavingIdentity ? 'Saving…' : 'Save identity & recompute'}
        </button>
        {identityError && <div className="identity-error">{identityError}</div>}
      </section>

      <main className="grid">
        <section className="panel">
          <IdentityCapture
            requirements={pipeline?.requirements || []}
            onAddGoal={handleGoalSubmit}
            onUpdateIdentity={handleIdentityUpdate}
          />
        </section>

        <section className="panel wide">
          <TaskBoard
            tasks={taskBoard?.tasks || []}
            integrityScore={dashboardSummary.integrity}
            onTaskAction={handleTaskToggle}
          />
        </section>
      </main>
    </div>
  );
}
