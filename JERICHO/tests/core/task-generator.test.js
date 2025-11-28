import { generateTasks } from '../../src/core/task-generator.js';

describe('generateTasks', () => {
  it('creates tasks for gaps with positive severity', () => {
    const tasks = generateTasks([
      { domain: 'focus', capability: 'deep-work', targetLevel: 5, currentLevel: 2, gap: 3 }
    ]);

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((task) => task.priority > 0)).toBe(true);
  });

  it('skips gaps already closed', () => {
    const tasks = generateTasks([{ domain: 'health', capability: 'sleep', gap: 0 }]);
    expect(tasks).toHaveLength(0);
  });
});
