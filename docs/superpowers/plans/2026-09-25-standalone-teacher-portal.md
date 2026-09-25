# Standalone Teacher Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the self-sign-up (standalone) teacher portal ready for real users: one sign-up with email verification and a CAPS-driven onboarding, one AI allowance for every AI action, a trimmed navigation where Units are "Lessons" and Assignments become a Homework "Project" type, a simple Register, billing that shows usage, and a scripted launch walkthrough.

**Architecture:** Three phases, each its own branch pair and PRs (backend first): **A** sign-up + verification + onboarding, **B** AI allowance ledger and enforcement, **C** navigation/pages/billing/launch check. All behaviour is gated on `isStandaloneTeacher` (user) / standalone school so school users are unchanged.

**Tech Stack:** Backend Express 5 + Mongoose 9 + zod + vitest (real Mongo); frontend Next.js 16 + React 19 + Tailwind 4 + base-ui + vitest; Playwright for the launch walkthrough.

**Spec:** `docs/superpowers/specs/2026-09-25-standalone-teacher-portal-design.md`

## Global Constraints

- Backend: every query filters `schoolId` and `isDeleted: false`; tests use `set -a; . C:/dev/campusly/test-dev.env; set +a` (Mongo 127.0.0.1:27047, `directConnection=true`).
- Frontend (CLAUDE.md): no `apiClient` in pages/components (hooks only), no `any`, files ≤ 350 lines, `catch (err: unknown)`, semantic tokens, 44px targets (`min-h-11`), dialogs flex-col with sticky footer, mobile-first.
- Copy: plain, active, sentence case; name what the teacher controls. "Lesson(s)" for Units only for standalone teachers, via one helper.
- Constants: `FREE_AI_ACTIONS_PER_MONTH = 20`, `PRO_AI_ACTIONS_PER_MONTH = 500`, verification link lifetime 24 h, resend limit 3 per hour.
- Month = calendar month in SAST (UTC+2, no DST).
- School (non-standalone) users: no behaviour change anywhere.
- Commits: `LANE_SWEEP_OK=1 git commit`, conventional message, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Worktrees: never force-remove a worktree with a `node_modules` junction (see memory `worktree-junction-danger`).

## Review Focus

1. An AI action at 23:30 UTC on the last day of a month (01:30 SAST next day) counts in the NEW month — test in B1.
2. An AI call that fails (AI error / 503) does not use an allowance slot — test in B2.
3. Learners' homework submissions that are auto-marked by AI never use the teacher's allowance (only teacher-triggered re-grades do) — test in B3.
4. A teacher who existed before verification shipped is not locked out of AI — backfill test in A1.
5. A standalone teacher calling a hidden AI route directly (lesson chat, Library generate, LessonPlan AI) gets 403, while a school teacher still gets through — test in B4.

## Rulings made while planning

- Ruling: a unit counts as **one** AI action for the outline and **one** for building its items (not one per item) — a free teacher could otherwise not finish one unit. Cost if wrong: units are cheap relative to papers.
- Ruling: homework AI grading of learner submissions is **not** counted (it follows from homework the teacher already set); a teacher-triggered re-grade is. The existing per-day safety caps bound cost. Cost if wrong: heavy AI-marked homework on the free plan costs us.
- Ruling: AI marking of handwritten scripts counts **one per script**. Cost if wrong: free teachers can mark ~20 scripts a month — that's the upgrade reason.
- Ruling: two AI actions racing at 19/20 may both pass (limit overshoot by at most the concurrency); not worth a lock. Cost if wrong: one extra action.
- Ruling: the OneGate sandbox check needs real sandbox credentials the owner holds; Phase C writes the runbook and the automated part, and the owner runs the paid step.

---

# Phase A — Sign-up, email verification, onboarding

Branches: `feat/standalone-a-signup` in backend (`C:\dev\campusly\.worktrees\backend-master`) and frontend (`C:\dev\campusly\campusly-frontend`).

### Task A1 (backend): email verification

**Files:**
- Modify: `src/modules/Auth/model.ts` (IUser + schema: `emailVerifiedAt?: Date | null`, `emailVerifyToken?: string | null`, `emailVerifyExpires?: Date | null`, `emailVerifySentAt?: Date[]`)
- Create: `src/modules/Auth/email-verification.ts` (issue/verify/resend)
- Modify: `src/services/email.service.ts` (add `sendEmailVerification(to, link)`)
- Modify: `src/modules/Auth/standalone.service.ts` (`signup` issues verification), `src/modules/Auth/routes.ts`, `controller.ts` (routes below), `/auth/me` response includes `emailVerifiedAt`
- Create: `src/scripts/backfill-email-verified.ts` + `package.json` script `migrate:email-verified`
- Test: `src/modules/Auth/__tests__/email-verification.test.ts`

**Interfaces — Produces:**
- `issueEmailVerification(userId: string): Promise<{ token: string }>` — random 32-byte hex token; stores `sha256(token)` in `emailVerifyToken`, `emailVerifyExpires = now + 24h`; sends `EmailService.sendEmailVerification(email, `${config.app.url}/verify-email?token=${token}`)`.
- `verifyEmail(token: string): Promise<{ userId: string }>` — finds by hash with unexpired `emailVerifyExpires`, sets `emailVerifiedAt = now`, clears token fields; throws `BadRequestError('This link has expired or was already used. Send a new one.')`.
- `resendEmailVerification(userId: string)` — refuses (429 `AppError`) when 3 sends in the last hour (`emailVerifySentAt`).
- Routes: `POST /api/auth/verify-email {token}` (public), `POST /api/auth/resend-verification` (authenticated).
- `isEmailVerified(user: { emailVerifiedAt?: Date | null }): boolean`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/modules/Auth/__tests__/email-verification.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../model.js';
import { issueEmailVerification, verifyEmail, resendEmailVerification } from '../email-verification.js';
import { EmailService } from '../../../services/email.service.js';
import { backfillEmailVerified } from '../../../scripts/backfill-email-verified.js';

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
afterAll(async () => { await mongoose.disconnect(); });

const newTeacher = async () => (await User.collection.insertOne({
  email: `v${new mongoose.Types.ObjectId()}@t.local`, firstName: 'Vee', lastName: 'T', role: 'teacher',
  schoolId: new mongoose.Types.ObjectId(), isStandaloneTeacher: true, isDeleted: false, isActive: true, createdAt: new Date(),
})).insertedId;

describe('email verification', () => {
  it('emails a link, and the link verifies the teacher once', async () => {
    const send = vi.spyOn(EmailService, 'sendEmailVerification').mockResolvedValue(undefined as never);
    const id = await newTeacher();
    const { token } = await issueEmailVerification(String(id));
    expect(send.mock.calls[0][1]).toContain(`/verify-email?token=${token}`);
    await verifyEmail(token);
    expect((await User.findById(id).lean())?.emailVerifiedAt).toBeInstanceOf(Date);
    await expect(verifyEmail(token)).rejects.toThrow('This link has expired or was already used');
  });

  it('refuses an expired link', async () => {
    vi.spyOn(EmailService, 'sendEmailVerification').mockResolvedValue(undefined as never);
    const id = await newTeacher();
    const { token } = await issueEmailVerification(String(id));
    await User.collection.updateOne({ _id: id }, { $set: { emailVerifyExpires: new Date(Date.now() - 1000) } });
    await expect(verifyEmail(token)).rejects.toThrow('expired');
  });

  it('allows three resends an hour, then refuses', async () => {
    vi.spyOn(EmailService, 'sendEmailVerification').mockResolvedValue(undefined as never);
    const id = String(await newTeacher());
    await resendEmailVerification(id); await resendEmailVerification(id); await resendEmailVerification(id);
    await expect(resendEmailVerification(id)).rejects.toThrow('Try again in an hour');
  });

  it('counts teachers who existed before verification shipped as verified', async () => {
    const id = await newTeacher();
    await backfillEmailVerified({ apply: true });
    const u = await User.findById(id).lean();
    expect(u?.emailVerifiedAt?.getTime()).toBe((u as unknown as { createdAt: Date }).createdAt.getTime());
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/modules/Auth/__tests__/email-verification.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement** `email-verification.ts` (crypto.randomBytes(32).toString('hex'); `createHash('sha256')`), model fields, `EmailService.sendEmailVerification` (mirror `sendPasswordReset`, subject "Verify your email for Campusly", one button), routes/controller, `StandaloneService.signup` calls `issueEmailVerification` after creating the user (failures logged, never fail sign-up), `backfillEmailVerified({ apply })` (dry run reports count; apply sets `emailVerifiedAt = createdAt` where missing, only for users created before now), `/auth/me` returns `emailVerifiedAt`.
- [ ] **Step 4: Run** the test file and `src/modules/Auth` → PASS.
- [ ] **Step 5: Commit** `feat(auth): email verification for standalone teachers`.

### Task A2 (frontend): verify page, banner, one sign-up path

**Files:**
- Create: `src/app/verify-email/page.tsx`, `src/hooks/useEmailVerification.ts`, `src/components/auth/VerifyEmailBanner.tsx`, `src/lib/email-verification.ts`
- Modify: `src/app/(dashboard)/layout.tsx` (mount banner for teachers), `src/types` (User `emailVerifiedAt?: string | null`), `next.config.ts` (redirect `/register-teacher` → `/signup/teacher`), `src/app/login/page.tsx:114`, `src/components/teachers-landing/StartFreeLink.tsx:12`
- Delete: `src/app/register-teacher/page.tsx`; remove `registerTeacher` from `src/hooks/useAuth.ts`
- Test: `tests/email-verification.test.ts`, `tests/signup-links.test.ts`

**Interfaces — Produces:** `needsEmailVerification(user: { role: string; isStandaloneTeacher?: boolean; emailVerifiedAt?: string | null } | null): boolean`; `useEmailVerification()` → `{ verify(token): Promise<'ok'|'expired'>, resend(): Promise<void>, resending, resent, error }`.

- [ ] **Step 1: Failing tests**

```ts
// tests/email-verification.test.ts
import { describe, expect, it } from 'vitest';
import { needsEmailVerification } from '../src/lib/email-verification';

describe('needsEmailVerification', () => {
  it('asks an unverified standalone teacher to verify', () => {
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: true, emailVerifiedAt: null })).toBe(true);
  });
  it('leaves verified teachers, school teachers and learners alone', () => {
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: true, emailVerifiedAt: '2026-09-25T00:00:00Z' })).toBe(false);
    expect(needsEmailVerification({ role: 'teacher', isStandaloneTeacher: false, emailVerifiedAt: null })).toBe(false);
    expect(needsEmailVerification({ role: 'student', emailVerifiedAt: null })).toBe(false);
    expect(needsEmailVerification(null)).toBe(false);
  });
});
```

```ts
// tests/signup-links.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { LEGACY_TEACHER_REDIRECTS } from '../next.config';

describe('one teacher sign-up', () => {
  it('sends /register-teacher to /signup/teacher', () => {
    expect(LEGACY_TEACHER_REDIRECTS).toContainEqual(expect.objectContaining({ source: '/register-teacher', destination: '/signup/teacher' }));
    expect(existsSync('src/app/register-teacher/page.tsx')).toBe(false);
  });
  it('links the login page and the teachers landing page to /signup/teacher', () => {
    for (const f of ['src/app/login/page.tsx', 'src/components/teachers-landing/StartFreeLink.tsx']) {
      expect(readFileSync(f, 'utf8')).not.toContain('/register-teacher');
    }
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/email-verification.test.ts tests/signup-links.test.ts` → FAIL.
- [ ] **Step 3: Implement.** `/verify-email` reads `?token`, calls `verify`, shows "Your email is verified" + "Go to Today" or "This link has expired or was already used" + "Send a new link" (signed-in) / "Sign in to send a new link". Banner (dashboard layout, when `needsEmailVerification(user)`): "Check your inbox to verify {email}. You'll need it to use AI." + "Resend link" (disabled while sending; "Sent — check your inbox"). After verify, refresh the auth store user (`/auth/me`).
- [ ] **Step 4: Run** the two tests + full `npx vitest run`; `npx tsc --noEmit`; eslint changed files.
- [ ] **Step 5: Commit** `feat(auth): verify-email page, banner, and one teacher sign-up`.

### Task A3 (backend): remove the duplicate teacher registration, report scope in onboarding status

**Files:** `src/modules/Auth/routes.ts:25` (remove `POST /register-teacher`), `controller.ts` (`registerTeacher`), `service.ts:79-123` (`registerTeacher`), any tests of it; `standalone.service.ts:getOnboardingStatus` adds `hasScope: boolean` (teachingScope.grades.length > 0) and `hasUnit: boolean` (a `Course` `kind: 'class_unit'` in the school).
**Test:** `src/modules/Auth/__tests__/onboarding-status.test.ts` — a new standalone teacher: `{ hasScope:false, hasClass:false, hasUnit:false }`; after `updateTeachingScope` + creating a class + a class_unit course → all true; `POST /api/auth/register-teacher` → 404.

- [ ] Steps: failing test → FAIL → remove route/service, add fields → PASS (`src/modules/Auth`) → commit `refactor(auth): one teacher sign-up; onboarding status knows scope and first lesson`.

### Task A4 (frontend): three-step onboarding (what you teach → first class → first lesson)

**Files:**
- Create: `src/components/onboarding/CapsScopePicker.tsx` (phase → grades → subjects, from `useCurriculumTree(capsFrameworkId)`), `src/components/onboarding/FirstClassStep.tsx`, `src/components/onboarding/FirstLessonStep.tsx`, `src/lib/onboarding.ts`
- Modify: `src/app/(dashboard)/teacher/onboarding/page.tsx` (orchestrates the 3 steps; ≤ 350 lines), `src/hooks/useTeacherOnboarding.ts` (status now `{hasScope, hasClass, hasStudent, hasUnit, dismissed}`), `src/app/(dashboard)/teacher/courses/new/page.tsx` (reads `?classId=&topicId=` to prefill)
- Test: `tests/onboarding.test.ts`

**Interfaces — Consumes:** `useTeachingScope().save(next: TeachingScope)` (`PUT /teacher-settings/teaching-scope`, body `{ grades: string[], subjectsByGrade: {gradeId, subjectIds}[] }`); `useCurriculumTree(frameworkId)`; `createClass(name, gradeId)` from `useTeacherOnboarding`; `ClassroomCodeCard`.
**Produces:** `onboardingStep(status): 1 | 2 | 3 | 'done'`; `scopeFromPicks(picks: { gradeId: string; subjectIds: string[] }[]): TeachingScope`; `joinMessage(code: string, origin: string): string`.

- [ ] **Step 1: Failing tests**

```ts
// tests/onboarding.test.ts
import { describe, expect, it } from 'vitest';
import { joinMessage, onboardingStep, scopeFromPicks } from '../src/lib/onboarding';

describe('onboarding', () => {
  it('resumes at the first unfinished step', () => {
    expect(onboardingStep({ hasScope: false, hasClass: false, hasUnit: false, dismissed: false })).toBe(1);
    expect(onboardingStep({ hasScope: true, hasClass: false, hasUnit: false, dismissed: false })).toBe(2);
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: false, dismissed: false })).toBe(3);
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: true, dismissed: false })).toBe('done');
    expect(onboardingStep({ hasScope: true, hasClass: true, hasUnit: false, dismissed: true })).toBe('done');
  });
  it('builds the teaching scope from grade and subject picks, dropping grades with no subject', () => {
    expect(scopeFromPicks([{ gradeId: 'g1', subjectIds: ['s1', 's2'] }, { gradeId: 'g2', subjectIds: [] }]))
      .toEqual({ grades: ['g1'], subjectsByGrade: [{ gradeId: 'g1', subjectIds: ['s1', 's2'] }] });
  });
  it('writes a join message a teacher can paste to learners', () => {
    expect(joinMessage('K7Q2MX', 'https://campusly.co.za'))
      .toBe('Join my class on Campusly: go to https://campusly.co.za/register-student and enter the code K7Q2MX.');
  });
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Step 1 "What you teach": the CAPS framework id comes from `GET /curriculum-structure/frameworks` (code `CAPS`); phases as tabs (Foundation/Intermediate/Senior/FET), grades as checkboxes, subjects per grade as chips; "Save and continue" disabled until one grade has one subject; saves via `save(scopeFromPicks(picks))`. Step 2 "Your first class": name (default "{Grade} {Subject}"), grade select from scope; after create: `ClassroomCodeCard` + "Copy join message" (`joinMessage(code, window.location.origin)`). Step 3 "Your first lesson": card "Build your first lesson with AI" → `/teacher/courses/new?classId=…&topicId=…` (first topic of that grade/subject for the current term); "Skip for now" → Today. Resume with `onboardingStep`. Today's checklist uses the same status.
- [ ] **Step 4: Run** tests, full suite, tsc, eslint.
- [ ] **Step 5: Commit** `feat(onboarding): pick what you teach from CAPS, first class with its join code, first lesson`.

### Phase A finish
Final review (fresh opus reviewer, Review Focus 4), one fix pass, PRs (backend first), Vercel, merge. Production step: `npm run migrate:email-verified -- --apply`.

---

# Phase B — One AI allowance

Branches: `feat/standalone-b-ai-allowance`.

### Task B1 (backend): usage ledger and allowance

**Files:**
- Create: `src/modules/subscription/ai-usage.model.ts` (`AIUsage`: `schoolId`, `userId`, `action`, `meta`, timestamps; index `{schoolId:1, createdAt:-1}`)
- Create: `src/modules/subscription/ai-allowance.ts`
- Test: `src/modules/subscription/__tests__/ai-allowance.test.ts`

**Interfaces — Produces:**
```ts
export const FREE_AI_ACTIONS_PER_MONTH = 20;
export const PRO_AI_ACTIONS_PER_MONTH = 500;
export const AI_ACTIONS = ['unit_outline','unit_build','unit_rewrite','revision_item','paper','paper_regenerate','homework_draft','homework_regrade','project_draft','marking','memo'] as const;
export type AIAction = (typeof AI_ACTIONS)[number];
export interface AIActor { schoolId: string; userId: string; isStandaloneTeacher: boolean; emailVerifiedAt?: Date | null }
export function sastMonthWindow(now: Date): { start: Date; end: Date };           // [start, end) in UTC
export async function aiAllowance(schoolId: string, now?: Date): Promise<{ used: number; limit: number; resetsAt: Date; plan: 'free' | 'pro' }>;
export async function assertAIAllowance(actor: AIActor, action: AIAction): Promise<void>; // no-op unless isStandaloneTeacher
export async function recordAIUse(actor: AIActor, action: AIAction, meta?: Record<string, unknown>): Promise<void>;
export async function withAIAllowance<T>(actor: AIActor, action: AIAction, run: () => Promise<T>, meta?: Record<string, unknown>): Promise<T>; // assert → run → record on success
```
Plan = `'pro'` when `resolveEntitlements(schoolId)` says entitled (trialing/active/past_due/canceled-in-period), else `'free'`. Errors: unverified → `AppError(403, 'Verify your email to use AI. We sent you a link.')` with `code: 'EMAIL_UNVERIFIED'`; over limit → `AppError(402, "You've used this month's 20 free AI actions. Upgrade to Pro for more.")` with `code: 'AI_ALLOWANCE'`, `details: { used, limit, resetsAt }` (check `AppError` supports a code/details payload; extend it if not, keeping existing callers working).

- [ ] **Step 1: Failing tests**

```ts
// src/modules/subscription/__tests__/ai-allowance.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { AIUsage } from '../ai-usage.model.js';
import { Subscription } from '../model.js';
import { aiAllowance, assertAIAllowance, recordAIUse, sastMonthWindow, withAIAllowance, FREE_AI_ACTIONS_PER_MONTH } from '../ai-allowance.js';

beforeAll(async () => { if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_TEST_URI!); });
afterAll(async () => { await mongoose.disconnect(); });

const actor = (over: Partial<{ verified: boolean }> = {}) => ({
  schoolId: String(new mongoose.Types.ObjectId()), userId: String(new mongoose.Types.ObjectId()),
  isStandaloneTeacher: true, emailVerifiedAt: over.verified === false ? null : new Date(),
});

describe('sastMonthWindow', () => {
  it('counts 23:30 UTC on the last day of a month in the next SAST month', () => {
    const { start } = sastMonthWindow(new Date('2026-09-30T23:30:00Z'));
    expect(start.toISOString()).toBe('2026-09-30T22:00:00.000Z'); // 1 Oct 00:00 SAST
  });
});

describe('the free AI allowance', () => {
  it('lets a free teacher use 20 AI actions a month, then refuses with the numbers', async () => {
    const a = actor();
    await AIUsage.insertMany(Array.from({ length: FREE_AI_ACTIONS_PER_MONTH }, () => ({ schoolId: a.schoolId, userId: a.userId, action: 'paper' })));
    const err = await assertAIAllowance(a, 'paper').catch((e: unknown) => e as { statusCode: number; code: string; details: { used: number; limit: number } });
    expect(err).toMatchObject({ statusCode: 402, code: 'AI_ALLOWANCE', details: { used: 20, limit: 20 } });
  });

  it('gives a trialing or paying teacher the Pro limit', async () => {
    const a = actor();
    await Subscription.collection.insertOne({ schoolId: new mongoose.Types.ObjectId(a.schoolId), status: 'trialing', planCode: 'pro_monthly', trialEndsAt: new Date(Date.now() + 86400000) });
    expect((await aiAllowance(a.schoolId)).limit).toBe(500);
  });

  it('does not count an AI call that failed', async () => {
    const a = actor();
    await expect(withAIAllowance(a, 'paper', async () => { throw new Error('AI down'); })).rejects.toThrow('AI down');
    expect((await aiAllowance(a.schoolId)).used).toBe(0);
  });

  it('refuses an unverified teacher, and never limits school teachers', async () => {
    await expect(assertAIAllowance(actor({ verified: false }), 'paper')).rejects.toMatchObject({ statusCode: 403, code: 'EMAIL_UNVERIFIED' });
    const school = { ...actor(), isStandaloneTeacher: false };
    await AIUsage.insertMany(Array.from({ length: 30 }, () => ({ schoolId: school.schoolId, userId: school.userId, action: 'paper' })));
    await expect(assertAIAllowance(school, 'paper')).resolves.toBeUndefined();
  });

  it('only counts this month', async () => {
    const a = actor();
    await AIUsage.collection.insertOne({ schoolId: new mongoose.Types.ObjectId(a.schoolId), userId: new mongoose.Types.ObjectId(a.userId), action: 'paper', createdAt: new Date('2026-01-15T10:00:00Z') });
    await recordAIUse(a, 'paper');
    expect((await aiAllowance(a.schoolId)).used).toBe(1);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/modules/subscription/__tests__/ai-allowance.test.ts` → FAIL.
- [ ] **Step 3: Implement** the model and module (SAST offset constant `SAST_OFFSET_MS = 2 * 3600_000`; `sastMonthWindow` computes the SAST calendar month of `now` and returns UTC bounds; `aiAllowance` counts `AIUsage` in window; `resetsAt` = window end).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(billing): one AI allowance ledger for standalone teachers`.

### Task B2 (backend): enforce on every standalone AI entry point, retire per-feature counters

**Files (each wraps its AI spend in `withAIAllowance(actor, action, run)`; actor built from `getUser(req)` plus `emailVerifiedAt` loaded once per request via a small `aiActorFor(req)` helper in `ai-allowance.ts`):**
- `src/modules/Course/controller-class-unit.ts` + `service-class-unit.ts:169` `draftOutline` → `unit_outline`; `approveOutline` (starts `runCourseGeneration`) → `unit_build` (one per approve, recorded when the job is queued successfully); `retryItem` → not counted (retry of a failed item)
- `src/modules/Course/service-unit-items.ts:201` `rewrite` → `unit_rewrite`; `:237` `addRevisionItem` → `revision_item`
- `src/modules/QuestionBank/controller.ts:297` `generatePaper` → `paper`; `postRegeneratePaperQuestion` → `paper_regenerate`; `controller.ts:142` `generateQuestions` (homework "Draft with AI") → `homework_draft`
- `src/modules/Homework` teacher `POST /homework/submissions/:id/regrade` → `homework_regrade` (learner auto-marking not counted)
- `src/modules/Assignment/controller.ts:208` (`POST /assignments/generate`) → `project_draft`
- `src/modules/AITools/controller.ts:137` `mark-paper` and `mark-paper-text` → `marking`
- `src/modules/TeacherWorkbench/controllers/memo.controller.ts:11` → `memo`
- Retire for standalone: `assertPaperGenerationAccess`, `assertCourseGenerationAccess`, `requirePaperGenerationAccess()`, `requireEntitlement('aiGeneration')` on these AI routes (the allowance replaces them); keep `usageLimits.ts` day caps; delete `free-allowance.ts` if nothing else uses it.
- Test: `src/modules/subscription/__tests__/ai-allowance-routes.test.ts`

- [ ] **Step 1: Failing route tests** (supertest; standalone free teacher token via `signTestToken({ role: 'teacher', isStandaloneTeacher: true, isSchoolPrincipal: true, schoolId, id })`, user doc inserted with `emailVerifiedAt`; AI calls stubbed with `vi.spyOn(AIService, …)` where an endpoint reaches the AI): for each of `POST /api/question-bank/papers/generate`, `POST /api/question-bank/questions/generate`, `POST /api/assignments/generate`, `POST /api/ai-tools/mark-paper-text`, `POST /api/teacher-workbench/memos/generate/:paperId`, `POST /api/courses/:id/outline`: (a) with 20 usages already this month → 402 `{ code: 'AI_ALLOWANCE' }` and the AI stub not called; (b) with 0 usages → success and exactly one `AIUsage` row with the right `action`. Plus: a learner homework submission auto-marked by AI adds no `AIUsage` row (Review Focus 3).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** wrappers in each controller/service listed; replace old gates; keep error messages plain.
- [ ] **Step 4: Run** the new test + every touched module's suite + `tests/committed-import-paths.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(billing): every standalone AI action draws from one allowance`.

### Task B3 (backend): hidden AI routes refuse standalone teachers; usage endpoint

**Files:** `src/middleware/refuse-standalone.ts` (`refuseStandalone(message?)` → 403 when `req.user.isStandaloneTeacher`); apply to `POST /api/lessons/:id/chat` (`Lesson/routes.ts:36`), every `LessonPlan` AI route, `POST /api/content-library/resources/generate`. New `GET /api/subscription/ai-usage` → `aiAllowance(user.schoolId)` (standalone only; school users get `{ plan: 'school' }`).
**Test:** `src/middleware/__tests__/refuse-standalone.test.ts` — standalone teacher → 403 on the three routes; school teacher → not 403 (Review Focus 5); `GET /api/subscription/ai-usage` returns `{ used, limit, resetsAt, plan }`.

- [ ] Steps: failing test → FAIL → implement → PASS → commit `feat(billing): hidden AI routes refuse standalone teachers; AI usage endpoint`.

### Task B4 (frontend): show usage, one upgrade prompt

**Files:**
- Create: `src/hooks/useAIUsage.ts` (`GET /subscription/ai-usage`), `src/lib/ai-allowance.ts`, `src/components/billing/AIUsageMeter.tsx`, `src/components/billing/AILimitDialog.tsx`, `src/stores/useAILimitStore.ts`
- Modify: `src/lib/api-client.ts` (response interceptor: on 402 with `code: 'AI_ALLOWANCE'` or 403 `EMAIL_UNVERIFIED`, publish to `useAILimitStore` and still reject), `src/app/(dashboard)/layout.tsx` (mount `AILimitDialog` once), `src/app/(dashboard)/my/billing/page.tsx` (usage card), AI buttons' hosts (Units new/outline, papers new, homework draft, marking hub) show `AIUsageMeter` compact when `remaining < 5`
- Remove per-hook 402 messages that now duplicate the dialog (e.g. `draftFailure` 402 branch in `src/lib/homework-ai-draft.ts`) — keep their non-402 errors
- Test: `tests/ai-allowance.test.ts`

**Produces:** `usageLine(u: { used: number; limit: number }): string` ("12 of 20 AI actions left this month"); `shouldWarn(u): boolean` (remaining < 5 and plan free); `resetLabel(resetsAt: string, now: Date): string` ("Resets on 1 October").

- [ ] **Step 1: Failing tests** for `usageLine`, `shouldWarn`, `resetLabel` (e.g. `usageLine({used: 8, limit: 20})` → `'12 of 20 AI actions left this month'`; `usageLine({used: 20, limit: 20})` → `'No AI actions left this month'`; `resetLabel('2026-09-30T22:00:00Z', new Date('2026-09-25T10:00:00Z'))` → `'Resets on 1 October'`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Dialog copy: title "You've used this month's free AI actions", body "{usageLine}. {resetLabel}. Pro gives you up to 500 a month for R149.", buttons "Upgrade to Pro" (→ `/my/billing`) and "Not now". Unverified: "Verify your email to use AI" + "Resend link".
- [ ] **Step 4: Run** tests, full suite, tsc, eslint.
- [ ] **Step 5: Commit** `feat(billing): AI usage on Billing and near AI buttons; one upgrade prompt`.

### Phase B finish
Final review (Review Focus 1–3, 5), fix pass, PRs, merge.

---

# Phase C — Navigation, Lessons, Project homework, Register, launch check

Branches: `feat/standalone-c-portal`.

### Task C1 (frontend): standalone navigation and allow-list

**Files:** `src/lib/nav/teacher-nav.ts:54-68` (`STANDALONE_TEACHER_NAV`), `src/lib/standalone-teacher-paths.ts`, `tests/teacher-nav.test.ts`

New `STANDALONE_TEACHER_NAV`: Today `/teacher`; Teach: Lessons `/teacher/courses` (AI badge), Textbooks `/teacher/curriculum/textbooks`; Assess: Homework, Test papers `/teacher/papers` (AI badge), Marking `/teacher/workbench/marking-hub` (AI badge), Gradebook `/teacher/grades`; Class: My classes `/teacher/classes`, Register `/teacher/attendance`; Me: Billing `/my/billing`, Settings `/teacher/settings`.
`STANDALONE_TEACHER_PREFIXES`: `/teacher/onboarding, /teacher/classes, /teacher/students, /teacher/attendance, /teacher/courses, /teacher/curriculum/textbooks, /teacher/curriculum/mark-papers, /teacher/workbench/marking-hub, /teacher/papers, /teacher/grades, /teacher/homework, /teacher/assignments (project pages), /teacher/settings, /my/billing, /subscription, /verify-email` — removed: `lesson-plans`, `quick-make`, `lessons`, `curriculum/content`, `curriculum/preview`, `curriculum/import`.

- [ ] **Step 1: Failing tests** (append to `tests/teacher-nav.test.ts`):

```ts
import { existsSync } from 'node:fs';
import { STANDALONE_TEACHER_PREFIXES, isStandaloneTeacherPathAllowed } from '../src/lib/standalone-teacher-paths';

describe('standalone teacher navigation', () => {
  it('shows exactly the launch sections and items', () => {
    const items = STANDALONE_TEACHER_NAV.map((i) => `${i.section}:${i.label}`);
    expect(items).toEqual(['Today:Today', 'Teach:Lessons', 'Teach:Textbooks', 'Assess:Homework', 'Assess:Test papers', 'Assess:Marking', 'Assess:Gradebook', 'Class:My classes', 'Class:Register', 'Me:Billing', 'Me:Settings']);
  });
  it('allows every nav link, and every allowed page exists', () => {
    for (const i of STANDALONE_TEACHER_NAV) expect(isStandaloneTeacherPathAllowed(i.href)).toBe(true);
    for (const p of STANDALONE_TEACHER_PREFIXES) {
      const base = `src/app/(dashboard)${p}`;
      expect(existsSync(`${base}/page.tsx`) || existsSync(`src/app${p}/page.tsx`)).toBe(true);
    }
  });
  it('keeps hidden pages out', () => {
    for (const p of ['/teacher/lessons', '/teacher/lesson-plans', '/teacher/curriculum/content', '/teacher/behaviour', '/teacher/messages']) expect(isStandaloneTeacherPathAllowed(p)).toBe(false);
  });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** full suite. **Step 5: Commit** `feat(standalone): launch navigation — Lessons, Register, no Assignments or Library`.

### Task C2 (frontend): "Lessons" wording for standalone teachers on the Units pages

**Files:** Create `src/lib/lesson-words.ts`; modify `src/app/(dashboard)/teacher/courses/page.tsx:74-75`, `courses/new/page.tsx`, `courses/[id]/page.tsx:63`, `src/components/courses/{CourseCard,CreateCourseDialog,UnitLibrary,UnitGenerationBanner,UnitHeader}.tsx` (the visible nouns only); test `tests/lesson-words.test.ts`.
**Produces:** `lessonWords(isStandalone: boolean): { one: 'lesson' | 'unit'; many: 'lessons' | 'units'; One: 'Lesson' | 'Unit'; Many: 'Lessons' | 'Courses' }`.

- [ ] Failing test (`lessonWords(true).Many === 'Lessons'`, `lessonWords(false).Many === 'Courses'`, `lessonWords(true).one === 'lesson'`) → FAIL → implement and apply (page title "Lessons", description "Lessons your learners work through: the AI drafts them from CAPS, you check them and release them to a class.", "New lesson", "Lesson not found") → PASS → commit `feat(standalone): Units read as Lessons for standalone teachers`.

### Task C3 (frontend): Homework "Project" type opens the assignment flow; one list

**Files:** `src/stores/useTeacherHomeworkWizardStore.ts:5` (`HomeworkWizardType = 'reading' | 'exercise' | 'project'`), homework wizard step 1 (type cards: Exercise / Reading / Project), `src/app/(dashboard)/teacher/homework/page.tsx` (list includes projects), create `src/lib/work-list.ts`; test `tests/work-list.test.ts`.
**Produces:** `mergeWorkList(homework: HomeworkItem[], assignments: AssignmentItem[]): WorkRow[]` where `WorkRow = { id, kind: 'homework' | 'project', title, className, dueDate, href }`, sorted by due date descending; project `href` = `/teacher/assignments/{id}`.

- [ ] Failing test: merges and sorts; project rows link to `/teacher/assignments/{id}` and carry `kind: 'project'` → FAIL → implement: choosing **Project** in the wizard routes to `/teacher/assignments/new` (existing brief + rubric flow, page title "New project"), the Homework list uses `useTeacherAssignments` + existing homework hook and shows a "Project" badge → PASS → full suite → commit `feat(homework): projects with a rubric are a Homework type`.

### Task C4 (backend): standalone modules

**Files:** `src/common/moduleConfig.ts:54-65` (`STANDALONE_DEFAULT_MODULES` without `incident_wellbeing`, `communication`), `src/scripts/standalone-modules.ts` + `package.json` `migrate:standalone-modules` (dry run / `--apply`: `$pull` those two from `School.modulesEnabled` where `plan: 'standalone'`); test `src/common/__tests__/standalone-modules.test.ts` (constant contents; the script pulls only from standalone schools).

- [ ] Failing test → FAIL → implement → PASS → commit `chore(standalone): only the modules the standalone portal uses`.

### Task C5 (frontend): Register works without a timetable

**Files:** `src/app/(dashboard)/teacher/attendance/page.tsx` (+ its hook), `src/lib/register.ts`, test `tests/register.test.ts`.
**Produces:** `defaultRegister(classes: {id: string}[], search: URLSearchParams, today: Date): { classId: string | null; date: string; period: number }` — first class when none chosen, today's local date (`toISODate` local, not UTC), period 1 when none given.

- [ ] Failing test (no params → first class, today (local), period 1; params respected) → FAIL → implement; page title "Register" for standalone teachers; a period picker (1–8) replaces timetable-dependent labels when the teacher has no timetable → PASS → commit `feat(standalone): a simple register without a timetable`.

### Task C6 (frontend + docs): Billing shows plan and AI usage; OneGate runbook

**Files:** `src/app/(dashboard)/my/billing/page.tsx` (usage card from Task B4 already; add "What you get" free vs Pro lines), create `docs/runbooks/onegate-sandbox.md` (env vars `ONEGATE_BASE_URL`, `ONEGATE_ORG_ID`, `ONEGATE_SALT`; steps: start trial → pay with sandbox card → confirm `status: active`, webhook received, invoice listed → cancel → confirm `canceled` with period end); test `tests/billing-copy.test.ts` for a `planLines(plan)` helper.

- [ ] Failing test → FAIL → implement → PASS → commit `feat(billing): plan and AI usage on Billing; OneGate sandbox runbook`.

### Task C7 (e2e): launch walkthrough

**Files:** Create `e2e/standalone-launch.spec.ts` (Playwright, runs against local dev; does NOT use the dev sign-in panel — it uses the real sign-up form with a generated `launch+{timestamp}@example.test` address and reads the verification token from Mongo via a small `e2e/support/db.ts` helper using `MONGODB_URI`), `e2e/README.md`.
Flow: sign up → onboarding step 1 pick Grade 4 Mathematics → step 2 create class, read join code → verify email via `/verify-email?token=…` → register a learner at `/register-student` with the code (second browser context) → build a lesson unit (AI stubbed? No: skip AI generation when `ANTHROPIC_API_KEY` is absent and assert the plain "AI isn't set up" message instead) → set Exercise homework → create a Project → open Register, save → open Gradebook → Billing shows usage → at 375 px every nav page renders without horizontal scroll; collect console errors and failed `/api` calls and assert none (except the documented AI-not-set-up 503 when no key).

- [ ] Write spec → run `npx playwright test e2e/standalone-launch.spec.ts` → fix what it finds (each fix test-first in its owning module) → commit `test(e2e): standalone teacher launch walkthrough`.

### Phase C finish
Final review, fix pass, PRs, merge; run the walkthrough against the merged build; tracker updated.

---

## Self-review

- **Spec coverage:** §1 nav → C1/C2/C4; §2 Assignments→Project → C3; §3 sign-up/verification/onboarding → A1–A4; §4 allowance → B1–B4; §5 Register → C5; §6 billing + launch check → C6/C7. Learner AI tutor explicitly out of scope (Project 2).
- **Placeholders:** none; UI copy is given where it matters.
- **Types:** `AIAction`/`AIActor`/`withAIAllowance` (B1) used in B2/B3; `needsEmailVerification` (A2) and `emailVerifiedAt` (A1) used by B1's actor; `onboardingStep`/`hasUnit` (A3/A4) consistent.
- **Review Focus:** 1 → B1 test; 2 → B1 test; 3 → B2 test; 4 → A1 backfill test; 5 → B3 test.
