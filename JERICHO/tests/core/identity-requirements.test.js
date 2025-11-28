import { deriveIdentityRequirements } from '../../src/core/identity-requirements.js';

describe('deriveIdentityRequirements', () => {
  it('merges baseline with goals and deduplicates by capability', () => {
    const requirements = deriveIdentityRequirements(
      {
        goals: [{ domain: 'health', capability: 'daily-movement', targetLevel: 2 }]
      },
      {}
    );

    const movement = requirements.find((req) => req.capability === 'daily-movement');
    expect(movement.targetLevel).toBeGreaterThanOrEqual(3);
  });

  it('infers current level from identity structure', () => {
    const requirements = deriveIdentityRequirements(
      { goals: [] },
      { focus: { 'deep-work': { level: 4 } } }
    );

    const deepWork = requirements.find((req) => req.capability === 'deep-work');
    expect(deepWork.currentLevel).toBe(4);
  });
});
