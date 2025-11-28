import { classifyGoalCategory, deriveIdentityRequirements } from '../../src/core/identity-requirements.js';

const creativeGoal = {
  id: '1',
  raw: 'I will release a 10-track album by 2026-10-01',
  outcome: 'I will release a 10-track album',
  metric: '10',
  deadline: '2026-10-01T00:00:00.000Z',
  type: 'production'
};

const productGoal = {
  id: '2',
  raw: 'I will launch an app by 2026-03-01',
  outcome: 'I will launch an app',
  metric: '',
  deadline: '2026-03-01T00:00:00.000Z',
  type: 'event'
};

const bodyGoal = {
  id: '3',
  raw: 'I will lose 10 pounds by 2026-04-01',
  outcome: 'I will lose 10 pounds',
  metric: '10',
  deadline: '2026-04-01T00:00:00.000Z',
  type: 'production'
};

const learningGoal = {
  id: '4',
  raw: 'I will pass the bar exam by 2026-07-01',
  outcome: 'I will pass the bar exam',
  metric: '',
  deadline: '2026-07-01T00:00:00.000Z',
  type: 'event'
};

describe('classifyGoalCategory', () => {
  it('classifies creative project', () => {
    expect(classifyGoalCategory(creativeGoal)).toBe('creative_project');
  });

  it('classifies product launch', () => {
    expect(classifyGoalCategory(productGoal)).toBe('product_launch');
  });

  it('classifies body composition', () => {
    expect(classifyGoalCategory(bodyGoal)).toBe('body_composition');
  });

  it('classifies learning goal', () => {
    expect(classifyGoalCategory(learningGoal)).toBe('learning_goal');
  });

  it('defaults to generic execution', () => {
    expect(
      classifyGoalCategory({
        id: '5',
        raw: 'I will improve my execution by 2026-01-01',
        outcome: 'I will improve my execution',
        metric: '',
        deadline: '2026-01-01T00:00:00.000Z',
        type: 'event'
      })
    ).toBe('generic_execution');
  });
});

describe('deriveIdentityRequirements', () => {
  it('returns mapped requirements for creative project', () => {
    const reqs = deriveIdentityRequirements(creativeGoal);
    expect(reqs.length).toBe(5);
    reqs.forEach((req) => {
      expect(req.id).toBeDefined();
      expect(req.domain).toBeDefined();
      expect(req.capability).toBeDefined();
      expect(req.targetLevel).toBeGreaterThanOrEqual(1);
      expect(req.targetLevel).toBeLessThanOrEqual(10);
      expect(req.weight).toBeGreaterThanOrEqual(0);
      expect(req.weight).toBeLessThanOrEqual(1);
      expect(req.rationale).toBeDefined();
    });
  });

  it('returns mapped requirements for product launch', () => {
    const reqs = deriveIdentityRequirements(productGoal);
    expect(reqs.length).toBe(5);
  });

  it('returns mapped requirements for body composition', () => {
    const reqs = deriveIdentityRequirements(bodyGoal);
    expect(reqs.length).toBe(4);
  });

  it('returns mapped requirements for learning goal', () => {
    const reqs = deriveIdentityRequirements(learningGoal);
    expect(reqs.length).toBe(4);
  });

  it('returns generic requirements for unmatched goal', () => {
    const reqs = deriveIdentityRequirements({
      id: '5',
      raw: 'I will improve my execution by 2026-01-01',
      outcome: 'I will improve my execution',
      metric: '',
      deadline: '2026-01-01T00:00:00.000Z',
      type: 'event'
    });
    expect(reqs.length).toBe(4);
  });
});
