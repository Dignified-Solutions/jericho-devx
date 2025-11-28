# Jericho Architecture

The system follows a closed-loop behavioral execution pattern:

`Goal Input -> Identity Requirement Generation -> Gap Detection -> Task Generation -> Integrity Scoring -> Reinforcement -> Updated Identity State -> Regenerated Tasks`

## Modules

- `src/core` holds pure functions for requirements, gap analysis, task generation, and scoring.
- `src/services` houses reinforcement, integrity evaluation, and external sync adapters.
- `src/data` captures schemas for identity and tasks plus mock data for local runs.
- `src/api` exposes a minimal HTTP entry point that runs the pipeline for inspection.
- `src/ui` stubs the identity capture and task board experiences without a framework dependency.

## Data Flow

1. Goals and current identity feed `deriveIdentityRequirements`.
2. `calculateGap` ranks missing capabilities.
3. `generateTasks` emits tasks with priorities derived from gap severity.
4. `applyReinforcement` refreshes integrity scores and nudges.
5. `buildCalendarSyncPayload` prepares outbound data for calendar/task systems.
