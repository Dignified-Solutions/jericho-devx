# Repository Guidelines

## Project Structure & Module Organization
- Root contains `JERICHO/` (primary application), plus `src/` and `tests/` for supplementary tooling and specs; most day-to-day work happens inside `JERICHO/`.
- `JERICHO/src/`: API server (`api/`), pipeline/services (`core/`, `services/`), data helpers (`data/`), and UI (`ui/`). Assets live under `JERICHO/assets/`; entry HTML is `JERICHO/index.html`.
- Tests mirror source layout inside `JERICHO/tests/`. Keep new specs near their corresponding modules and co-locate fixtures when they serve only one test suite.

## Build, Test, and Development Commands
- From `JERICHO/`: `npm install` to install dependencies.
- `npm run dev`: concurrently runs the API (`dev:api`) and Vite UI (`dev:client`) for local iteration.
- `npm run build`: lints, tests, and builds the production bundle.
- `npm test`: executes the Jest suite (VM modules enabled).
- `npm run lint`: runs ESLint across `src` and `tests`. Add `npm run preview` to serve the production build locally for QA.

## Coding Style & Naming Conventions
- Use 2-space indentation for JS/TS/JSX. Prefer ES modules with `const`/`let`; avoid `var`.
- CamelCase for variables/functions; PascalCase for React components/classes; kebab-case for files when idiomatic to the stack. Keep components small and pure where possible.
- Run Prettier/ESLint before commits; never wrap imports in try/catch. Document non-obvious behavior with concise comments.

## Testing Guidelines
- Write unit/integration tests in `JERICHO/tests/`, naming files `*.test.js` or `*.spec.js` alongside similar paths to source.
- Cover API handlers, pipeline steps, and UI behaviors; include edge cases, error handling, and security-sensitive flows (auth/CORS/payload limits). Aim for meaningful coverage, not just line counts.
- Use Jest defaults; keep tests deterministic and avoid network or filesystem side effects unless explicitly mocked.

## Commit & Pull Request Guidelines
- Commit messages should be concise and imperative (e.g., "Add task status validation"). Group related changes together.
- Pull requests should summarize changes, list tests run, and note security/privacy considerations. Include screenshots for UI-affecting updates.
- Keep diffs focused and documented; link issues or tickets when available. Surface any notable risks or follow-ups in the PR description.

## Security & Configuration Tips
- Keep secrets in environment variables; never commit credentials or API keys. Validate request payloads, enforce size limits, and harden CORS/auth when exposing the API. Avoid default-open network listeners in production.
- Configure data storage outside the repo path in production and prefer atomic/durable writes. Review third-party dependencies regularly and track advisories. Rotate keys and tokens when roles change.
