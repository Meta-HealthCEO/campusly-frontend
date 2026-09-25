# End-to-end walkthroughs (Playwright)

`standalone-launch.spec.ts` is the standalone teacher launch check (spec 2026-09-25 §6): a new
teacher signs up through the real `/signup/teacher` form, says what they teach, creates a class,
verifies their email, gets a learner in with the join code, tries to build a lesson, sets
homework, opens a project, takes the register, opens the gradebook, sees Billing, runs out of
free AI actions and sees the upgrade prompt, then opens every page in the standalone nav. All at
375 px wide; it fails on any console error, uncaught page error or failed `/api` call except the
ones it expects (below).

## Run it

1. Start the dev stack: backend on :4500, frontend on :3500, dev Mongo on 127.0.0.1:27047.
2. `npm run e2e` (or `npx playwright test e2e/standalone-launch.spec.ts`). The first run may
   need `npx playwright install chromium`.

Options: `E2E_BASE_URL` (default `http://localhost:3500`), `E2E_MONGODB_URI` (default the dev DB;
the helper refuses anything that isn't localhost).

## What it does outside the browser

`support/db.ts` talks to the local dev database only:

- **Email verification.** The backend stores only the sha256 of a link's token, so the test can't
  read a link it didn't make. It makes a token, stores its hash and a 24-hour expiry on the
  teacher exactly as the backend does, and opens `/verify-email?token=…`, so the real page and
  `POST /api/auth/verify-email` do the verifying.
- **Using up the free allowance.** It records 20 AI actions for the teacher this month, so the
  next AI page shows the used-up state and the upgrade prompt without spending real AI.

## Expected failures

- With no `ANTHROPIC_API_KEY` on the backend, every AI action returns 503 and the page shows
  "AI isn't set up on this server yet…". The walkthrough asserts that message where the AI would
  run (lesson outline, homework questions, project brief) and allows those 503s.
- After the allowance is used up, AI calls return 402; those are allowed too.

Each run leaves one teacher (`test+launch-<timestamp>@example.test`), their class and one learner
(`test+learner-<timestamp>@example.test`) in the dev database.
