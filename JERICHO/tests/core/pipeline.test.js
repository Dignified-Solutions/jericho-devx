import { runPipeline } from '../../src/core/pipeline.js';
import { mockGoals, mockIdentity } from '../../src/data/mock-data.js';

describe('runPipeline', () => {
  it('returns requirements, gaps, tasks, and sync payload', () => {
    const result = runPipeline(mockGoals, mockIdentity, [
      { id: 'habit-health-daily-movement', status: 'done' }
    ]);

    expect(result.requirements.length).toBeGreaterThan(0);
    expect(result.gaps.length).toBeGreaterThan(0);
    expect(result.taskBoard.tasks.length).toBeGreaterThan(0);
    expect(result.syncPayload.length).toBe(result.taskBoard.tasks.length);
  });
});
