import { useEffect, useMemo, useState } from 'react';
import IdentityCapture from './identity-capture.jsx';
import TaskBoard from './task-board.jsx';
import Dashboard from './dashboard.jsx';
import { fetchPipeline, postGoal, postIdentity, postTaskStatus } from './api-client.js';
import { runPipeline } from '../core/pipeline.js';
import { mockGoals, mockIdentity } from '../data/mock-data.js';

export default function App() {
  const [goalInput, setGoalInput] = useState(mockGoals);
  const [identity, setIdentity] = useState(mockIdentity);
  const [history, setHistory] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPipeline()
      .then((data) => {
        if (!active) return;
        const stateGoals = data?.state?.goals || mockGoals.goals;
        setGoalInput({ goals: stateGoals });
        setIdentity(data?.state?.identity || mockIdentity);
        setHistory(data?.state?.history || []);
        setCompletedIds((data?.state?.history || []).filter((h) => h.status === 'done').map((h) => h.id));
      })
      .catch(() => setError('Unable to reach API, using local mock data'))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const pipelineResult = useMemo(
    () => runPipeline(goalInput, identity, history),
    [goalInput, identity, history]
  );

  const tasksWithStatus = pipelineResult.taskBoard.tasks.map((task) =>
    completedIds.includes(task.id) ? { ...task, status: 'done' } : task
  );

  async function handleGoalSubmit(goal) {
    setError(null);
    setGoalInput((prev) => ({
      goals: [...(prev?.goals || []), goal]
    }));
    try {
      await postGoal(goal);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleIdentityUpdate(domain, capability, level) {
    setError(null);
    setIdentity((prev) => ({
      ...prev,
      [domain]: { ...(prev[domain] || {}), [capability]: { level } }
    }));
    try {
      await postIdentity({ domain, capability, level });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTaskToggle(taskId, status) {
    setHistory((prev) => [...prev, { id: taskId, status }]);
    setCompletedIds((prev) =>
      status === 'done' ? [...new Set([...prev, taskId])] : prev.filter((id) => id !== taskId)
    );
    try {
      await postTaskStatus({ id: taskId, status });
    } catch (err) {
      setError(err.message);
    }
  }

  const dashboardSummary = {
    integrity: pipelineResult.taskBoard.integrityScore,
    tasksPending: tasksWithStatus.filter((t) => t.status === 'pending').length,
    tasksDone: tasksWithStatus.filter((t) => t.status === 'done').length,
    syncReady: pipelineResult.syncPayload.length
  };

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

      <main className="grid">
        <section className="panel">
          <IdentityCapture
            requirements={pipelineResult.requirements}
            onAddGoal={handleGoalSubmit}
            onUpdateIdentity={handleIdentityUpdate}
          />
        </section>

        <section className="panel wide">
          <TaskBoard
            tasks={tasksWithStatus}
            integrityScore={dashboardSummary.integrity}
            onTaskAction={handleTaskToggle}
          />
        </section>
      </main>
    </div>
  );
}
