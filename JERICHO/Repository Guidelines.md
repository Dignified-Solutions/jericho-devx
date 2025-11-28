Repository Guidelines
Project Structure & Module Organization
The Jericho System repository is organized to reflect the closed-loop behavioral-execution architecture that powers the application MVP. Structural separation ensures clarity between identity-analysis logic, task-generation logic, scoring engines, and UI components.
/src
  /core            # identity requirements, gap analysis, task generation, scoring engine
  /ui              # screens, components, flows (identity capture, task board, dashboards)
  /data            # schemas, persistence adapters, mock data
  /services        # reinforcement logic, integrity scoring, calendar/task sync
  /api             # endpoints, integration stubs
/tests             # unit + integration tests aligned to core modules
/assets            # diagrams, icons, branding
/docs              # specification, patent-oriented architecture notes
Build, Test, and Development Commands
Examples assume a Glide or React-based local environment:
npm install — installs project dependencies.
npm run dev — launches the local development server.
npm run build — generates a production build.
npm test — runs the full test suite.
npm run lint — checks formatting and style compliance.
Coding Style & Naming Conventions
Indentation: 2 spaces.
Filenames: kebab-case for UI components, PascalCase for classes, snake_case for data schemas.
Functions: verbNoun (e.g., calculateGap, generateTasks).
State variables: current_identity, target_identity, gap_score.
Linting: ESLint + Prettier with strict mode enabled.
Testing Guidelines
Frameworks: Jest for unit tests; Playwright or Cypress for flow validation.
Coverage: minimum 80% on /src/core.
Naming: mirror source path — e.g., core/gap-analysis.test.js.
Run suite: npm test or npm test -- --watch during development.
Commit & Pull Request Guidelines
Commit messages:
Format: type(scope): concise message
Examples: feat(core): add identity update module, fix(ui): correct task rendering.
Pull Requests must include:
Summary of changes
Linked issue or requirement ID
Screenshots for UI changes
Confirmation that tests pass
Architecture Overview (Optional but Recommended)
The system follows a modular closed-loop pipeline:
Goal Input → Identity Requirement Generation → Gap Detection → Task Generation → Integrity Scoring → Reinforcement → Updated Identity State → Regenerated Tasks.
Each module exposes pure functions where possible to simplify testing and patent-oriented documentation.