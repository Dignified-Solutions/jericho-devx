# Jericho System

Closed-loop behavioral execution MVP following the repository guidelines. The project maps the pipeline from goal input through identity requirements, gap detection, task generation, scoring, reinforcement, and synchronization. React/Vite UI surfaces identity capture and task board views backed by the core pipeline.

## Structure

- `src/core` — identity requirements, gap analysis, task generation, scoring engine.
- `src/services` — reinforcement, integrity scoring, sync adapters.
- `src/data` — schemas and mock data for identities and tasks.
- `src/ui` — React/Vite client for identity capture and task board flows.
- `src/api` — minimal endpoint that runs the pipeline.
- `tests` — Jest coverage aligned to core modules.

## Commands

- `npm install` — install dependencies.
- `npm run dev` — run API + client together via concurrent processes.
- `npm run dev:api` — start the minimal API server.
- `npm run dev:client` — start the Vite client (http://localhost:5173).
- `npm run lint` — run ESLint with Prettier rules.
- `npm test` — execute the Jest suite (with coverage on `src/core`).
- `npm run build` — lint, test, and build the Vite client.

## Pipeline

`Goal Input -> Identity Requirement Generation -> Gap Detection -> Task Generation -> Integrity Scoring -> Reinforcement -> Updated Identity State -> Regenerated Tasks`

Each module favors pure functions for clarity and testability.
