# Mobile App v1 — Plan 1: Backend Prep

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the backend changes the Campusly mobile app v1 needs — a consolidated mobile-context endpoint, OneGate-based fee and wallet payment flows, a shared `PaymentCompletionService`, deep-link-aware push payloads, and per-category notification preferences — so that mobile development is fully unblocked.

**Architecture:** All work lives in `campusly-backend`. Two new payment endpoints reuse the existing `OneGateClient` and write to the existing `OnlinePayment` model. A new provider-agnostic `PaymentCompletionService` is extracted so both the existing PayFast webhook and the extended OneGate webhook share idempotent fee-completion and wallet-credit logic. Notification preferences migrate from generic booleans to per-category toggles with a one-time backfill.

**Tech Stack:** Express 5, Mongoose 9, Vitest, Zod v4, TypeScript strict. Tests use `mongodb://localhost:27017/campusly-test` via `MONGODB_TEST_URI`.

**Working directory:** `c:\Users\shaun\campusly-backend`

**Spec:** `docs/superpowers/specs/2026-05-14-campusly-mobile-app-design.md` (in `campusly-frontend`)

---

## File Structure

**New files**
- `src/modules/Auth/controllers/mobileContext.controller.ts` — single `getMobileContext` handler
- `src/modules/Auth/__tests__/mobileContext.test.ts` — integration test for the endpoint
- `src/modules/PaymentGateway/services/payment-completion.service.ts` — provider-agnostic fee + wallet completion (extracted from `webhook.service.ts`)
- `src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts` — unit + integration tests for the new service
- `src/modules/PaymentGateway/controllers/onegate.controller.ts` — two new handlers (`initiateFeePayment`, `initiateWalletTopup`) for OneGate
- `src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts` — integration test for the two new endpoints
- `src/modules/subscription/__tests__/onegate-webhook-extended.test.ts` — integration test for the webhook fee + wallet branches
- `migrations/2026-05-XX-notification-prefs-categories.ts` — Mongo migration script

**Modified files**
- `src/modules/Auth/routes.ts` — mount mobile-context route
- `src/modules/PaymentGateway/routes.ts` — mount the two new OneGate routes
- `src/modules/PaymentGateway/validation.ts` — Zod schemas for the new payloads
- `src/modules/PaymentGateway/services/webhook.service.ts` — delegate `recordFeePayments` and `creditWallet` to `PaymentCompletionService`
- `src/modules/subscription/webhook.ts` — add `fee_` and `top_` prefix dispatches
- `src/modules/Notification/model.ts` — add `categories` field to `NotificationPreference`
- `src/services/notification.service.ts` — read category from `notification.data.category`, gate dispatch on `pref.categories[category]`, include `deepLink` in push payload
- `src/lib/onegate/client.ts` — verify `createPaymentKey` accepts the merchant_reference prefixes we'll use (no code change expected, just confirmation)

---

## Conventions for every task in this plan

- **One commit per task.** Commit messages follow `feat(...)` / `refactor(...)` / `fix(...)` Conventional-Commits style, matching the recent backend commit history.
- **TDD strictly.** Write the failing test, run it to confirm it fails, write the minimal implementation, run it to confirm it passes, commit.
- **Multi-tenant safety.** Every new query MUST include `schoolId` in the filter (per CLAUDE.md). Tests must include a "wrong-school query returns nothing" assertion where relevant.
- **No `any` types.** Use `unknown` + type guards where needed.
- **Run the test command shown.** Don't substitute — the command is part of the verification.

---

## Task 1: Mobile context endpoint — failing test

**Files:**
- Create: `src/modules/Auth/__tests__/mobileContext.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `src/modules/Auth/__tests__/mobileContext.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../../app.js';
import { User } from '../model.js';
import { School } from '../../School/model.js';
import { Parent } from '../../Parent/model.js';
import { Student } from '../../Student/model.js';
import { signAccessToken } from '../../../lib/jwt.js';

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

describe('GET /api/auth/me/mobile-context', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_URI);
    }
  });

  afterEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      School.deleteMany({}),
      Parent.deleteMany({}),
      Student.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('returns user, school, and parent with children for a parent account', async () => {
    const school = await School.create({ name: 'Test High', currency: 'ZAR' });
    const user = await User.create({
      email: 'parent@test.com',
      password: 'irrelevant',
      firstName: 'Parent',
      lastName: 'One',
      role: 'parent',
      schoolId: school._id,
    });
    const childUser = await User.create({
      email: 'child@test.com',
      password: 'irrelevant',
      firstName: 'Child',
      lastName: 'One',
      role: 'student',
      schoolId: school._id,
    });
    const studentDoc = await Student.create({
      userId: childUser._id,
      schoolId: school._id,
      firstName: 'Child',
      lastName: 'One',
    });
    await Parent.create({
      userId: user._id,
      schoolId: school._id,
      children: [studentDoc._id],
    });

    const token = signAccessToken({ id: String(user._id), schoolId: String(school._id), role: 'parent' });

    const res = await request(app)
      .get('/api/auth/me/mobile-context')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('parent@test.com');
    expect(res.body.user.role).toBe('parent');
    expect(res.body.school.name).toBe('Test High');
    expect(res.body.school.settings.currency).toBe('ZAR');
    expect(res.body.parent).not.toBeNull();
    expect(res.body.parent.children).toHaveLength(1);
    expect(res.body.parent.children[0].firstName).toBe('Child');
    expect(res.body.student).toBeNull();
  });

  it('returns student profile for a student account', async () => {
    const school = await School.create({ name: 'Test High', currency: 'ZAR' });
    const user = await User.create({
      email: 'student@test.com',
      password: 'irrelevant',
      firstName: 'Stu',
      lastName: 'Dent',
      role: 'student',
      schoolId: school._id,
    });
    await Student.create({
      userId: user._id,
      schoolId: school._id,
      firstName: 'Stu',
      lastName: 'Dent',
    });

    const token = signAccessToken({ id: String(user._id), schoolId: String(school._id), role: 'student' });

    const res = await request(app)
      .get('/api/auth/me/mobile-context')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.student).not.toBeNull();
    expect(res.body.parent).toBeNull();
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me/mobile-context');
    expect(res.status).toBe(401);
  });

  it('does not leak children from another school', async () => {
    const schoolA = await School.create({ name: 'A', currency: 'ZAR' });
    const schoolB = await School.create({ name: 'B', currency: 'ZAR' });
    const parentUser = await User.create({
      email: 'p@a.com', password: 'x', firstName: 'P', lastName: 'A',
      role: 'parent', schoolId: schoolA._id,
    });
    const otherChildUser = await User.create({
      email: 'c@b.com', password: 'x', firstName: 'C', lastName: 'B',
      role: 'student', schoolId: schoolB._id,
    });
    const otherChild = await Student.create({
      userId: otherChildUser._id, schoolId: schoolB._id, firstName: 'C', lastName: 'B',
    });
    await Parent.create({
      userId: parentUser._id, schoolId: schoolA._id, children: [otherChild._id],
    });

    const token = signAccessToken({ id: String(parentUser._id), schoolId: String(schoolA._id), role: 'parent' });
    const res = await request(app)
      .get('/api/auth/me/mobile-context')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.parent.children).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/modules/Auth/__tests__/mobileContext.test.ts
```
Expected: FAIL with 404 from the request (route not mounted yet).

---

## Task 2: Mobile context endpoint — controller + route

**Files:**
- Create: `src/modules/Auth/controllers/mobileContext.controller.ts`
- Modify: `src/modules/Auth/routes.ts`

- [ ] **Step 1: Implement the controller**

Create `src/modules/Auth/controllers/mobileContext.controller.ts`:

```typescript
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../model.js';
import { School } from '../../School/model.js';
import { Parent } from '../../Parent/model.js';
import { Student } from '../../Student/model.js';

type Authed = Request & { user: { id: string; schoolId: string; role: string } };

export async function getMobileContext(req: Request, res: Response): Promise<void> {
  const { id, schoolId } = (req as Authed).user;

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
  const userObjectId = new mongoose.Types.ObjectId(id);

  const [user, school, parentDoc, studentDoc] = await Promise.all([
    User.findOne({ _id: userObjectId, schoolId: schoolObjectId, isDeleted: { $ne: true } })
      .select('email firstName lastName role profileImage phone')
      .lean(),
    School.findOne({ _id: schoolObjectId, isDeleted: { $ne: true } })
      .select('name logo currency')
      .lean(),
    Parent.findOne({ userId: userObjectId, schoolId: schoolObjectId, isDeleted: { $ne: true } })
      .populate({
        path: 'children',
        match: { schoolId: schoolObjectId, isDeleted: { $ne: true } },
        select: 'firstName lastName profileImage classId gradeId',
      })
      .lean(),
    Student.findOne({ userId: userObjectId, schoolId: schoolObjectId, isDeleted: { $ne: true } })
      .select('classId gradeId')
      .lean(),
  ]);

  if (!user || !school) {
    res.status(404).json({ message: 'User or school not found' });
    return;
  }

  res.json({
    user: {
      id: String(user._id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImage: user.profileImage ?? null,
      phone: user.phone ?? null,
    },
    school: {
      id: String(school._id),
      name: school.name,
      logo: school.logo ?? null,
      settings: {
        currency: school.currency ?? 'ZAR',
        paymentProviders: ['onegate'],
      },
    },
    parent: parentDoc
      ? {
          id: String(parentDoc._id),
          children: (parentDoc.children ?? []).map((c: any) => ({
            id: String(c._id),
            firstName: c.firstName,
            lastName: c.lastName,
            profileImage: c.profileImage ?? null,
            classId: c.classId ? String(c.classId) : null,
            gradeId: c.gradeId ? String(c.gradeId) : null,
          })),
        }
      : null,
    student: studentDoc
      ? {
          id: String(studentDoc._id),
          classId: studentDoc.classId ? String(studentDoc.classId) : null,
          gradeId: studentDoc.gradeId ? String(studentDoc.gradeId) : null,
        }
      : null,
  });
}
```

- [ ] **Step 2: Mount the route**

In `src/modules/Auth/routes.ts`, add the import near the top:

```typescript
import { getMobileContext } from './controllers/mobileContext.controller.js';
```

And add the route alongside the other authenticated routes (look for an existing `router.get('/me', authenticate, ...)` line and add this after it):

```typescript
router.get('/me/mobile-context', authenticate, getMobileContext);
```

- [ ] **Step 3: Run the test to verify it passes**

Run:
```bash
npx vitest run src/modules/Auth/__tests__/mobileContext.test.ts
```
Expected: PASS (all four cases).

- [ ] **Step 4: Commit**

```bash
git add src/modules/Auth/controllers/mobileContext.controller.ts \
        src/modules/Auth/routes.ts \
        src/modules/Auth/__tests__/mobileContext.test.ts
git commit -m "feat(auth): mobile-context endpoint consolidating user, school, parent, student"
```

---

## Task 3: Push notification deep-link field

**Files:**
- Modify: `src/services/notification.service.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/notification.deeplink.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notification.service.js';
import * as PushModule from '../push.service.js';

describe('NotificationService.dispatch — deepLink propagation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards data.deepLink to push payload', async () => {
    const spy = vi.spyOn(PushModule.PushService, 'sendPushBatch').mockResolvedValue(undefined as any);

    await NotificationService.dispatch({
      userId: 'irrelevant-for-this-test',
      title: 'New homework',
      message: 'Maths due Friday',
      channels: ['push'],
      data: {
        category: 'homework',
        deepLink: 'campusly://homework/abc123',
        notificationId: 'n1',
      },
    } as any);

    expect(spy).toHaveBeenCalled();
    const [, , , extra] = spy.mock.calls[0];
    expect(extra).toBeDefined();
    expect(extra.deepLink).toBe('campusly://homework/abc123');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/services/__tests__/notification.deeplink.test.ts
```
Expected: FAIL — `extra.deepLink` is `undefined`.

- [ ] **Step 3: Update the dispatcher**

In `src/services/notification.service.ts`, find the push branch (around lines 54–59 where `PushService.sendPushBatch` is called). Replace the call:

```typescript
await PushService.sendPushBatch(
  tokens,
  notification.title,
  bodyText,
  notification.data
    ? {
        payload: JSON.stringify(notification.data),
        deepLink: notification.data.deepLink,
        category: notification.data.category,
        notificationId: notification.data.notificationId,
      }
    : undefined,
);
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/services/__tests__/notification.deeplink.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/notification.service.ts src/services/__tests__/notification.deeplink.test.ts
git commit -m "feat(notifications): include deepLink, category, and notificationId in push payload"
```

---

## Task 4: Per-category notification preferences — model

**Files:**
- Modify: `src/modules/Notification/model.ts`

- [ ] **Step 1: Add the `categories` field to the schema**

Open `src/modules/Notification/model.ts`. Find the `NotificationPreference` schema definition (around lines 88–135). Add a new schema field after the existing boolean flags:

```typescript
categories: {
  homework: { type: Boolean, default: true },
  grades: { type: Boolean, default: true },
  attendance: { type: Boolean, default: true },
  billing: { type: Boolean, default: true },
  announcements: { type: Boolean, default: true },
},
```

Also update the `INotificationPreference` TypeScript interface above (or below) the schema to include:

```typescript
categories: {
  homework: boolean;
  grades: boolean;
  attendance: boolean;
  billing: boolean;
  announcements: boolean;
};
```

- [ ] **Step 2: Write a model integration test**

Create `src/modules/Notification/__tests__/notification-prefs.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { NotificationPreference } from '../model.js';

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

describe('NotificationPreference.categories', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(TEST_URI);
  });
  afterEach(async () => { await NotificationPreference.deleteMany({}); });
  afterAll(async () => { await mongoose.connection.close(); });

  it('defaults every category to true', async () => {
    const pref = await NotificationPreference.create({
      userId: new mongoose.Types.ObjectId(),
      schoolId: new mongoose.Types.ObjectId(),
    });
    expect(pref.categories.homework).toBe(true);
    expect(pref.categories.grades).toBe(true);
    expect(pref.categories.attendance).toBe(true);
    expect(pref.categories.billing).toBe(true);
    expect(pref.categories.announcements).toBe(true);
  });

  it('allows disabling a single category', async () => {
    const pref = await NotificationPreference.create({
      userId: new mongoose.Types.ObjectId(),
      schoolId: new mongoose.Types.ObjectId(),
      categories: { homework: false, grades: true, attendance: true, billing: true, announcements: true },
    });
    expect(pref.categories.homework).toBe(false);
    expect(pref.categories.grades).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run:
```bash
npx vitest run src/modules/Notification/__tests__/notification-prefs.test.ts
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/Notification/model.ts src/modules/Notification/__tests__/notification-prefs.test.ts
git commit -m "feat(notifications): add per-category preferences (homework, grades, attendance, billing, announcements)"
```

---

## Task 5: Backfill migration for existing preferences

**Files:**
- Create: `migrations/2026-05-15-notification-prefs-categories.ts`

- [ ] **Step 1: Write the migration**

Create `migrations/2026-05-15-notification-prefs-categories.ts`:

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { NotificationPreference } from '../src/modules/Notification/model.js';

dotenv.config();

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await mongoose.connect(uri);
  console.log('Connected. Backfilling NotificationPreference.categories...');

  const result = await NotificationPreference.updateMany(
    { categories: { $exists: false } },
    {
      $set: {
        categories: {
          homework: true,
          grades: true,
          attendance: true,
          billing: true,
          announcements: true,
        },
      },
    },
  );

  console.log(`Updated ${result.modifiedCount} preference document(s).`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the migration against the test database (smoke test)**

```bash
MONGODB_URI=mongodb://localhost:27017/campusly-test npx tsx migrations/2026-05-15-notification-prefs-categories.ts
```
Expected: prints `Updated 0 preference document(s).` (test DB is empty between test runs). Re-run with a seeded doc to verify >0.

- [ ] **Step 3: Commit**

```bash
git add migrations/2026-05-15-notification-prefs-categories.ts
git commit -m "feat(migrations): backfill notification-pref categories to default true"
```

---

## Task 6: Notification dispatcher honors categories

**Files:**
- Modify: `src/services/notification.service.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/notification.categories.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { NotificationService } from '../notification.service.js';
import * as PushModule from '../push.service.js';
import { NotificationPreference } from '../../modules/Notification/model.js';
import { Device } from '../../modules/Communication/model.js'; // adjust if different

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

describe('NotificationService.dispatch — category gating', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(TEST_URI);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await NotificationPreference.deleteMany({});
    await Device.deleteMany({});
  });
  afterAll(async () => { await mongoose.connection.close(); });

  it('skips push when the user has disabled the category', async () => {
    const userId = new mongoose.Types.ObjectId();
    const schoolId = new mongoose.Types.ObjectId();
    await NotificationPreference.create({
      userId, schoolId,
      push: true,
      categories: { homework: false, grades: true, attendance: true, billing: true, announcements: true },
    });
    await Device.create({ userId, schoolId, deviceToken: 'tok-1', platform: 'ios' });

    const spy = vi.spyOn(PushModule.PushService, 'sendPushBatch').mockResolvedValue(undefined as any);

    await NotificationService.dispatch({
      userId: String(userId),
      schoolId: String(schoolId),
      title: 'New homework',
      message: 'Maths due Friday',
      channels: ['push'],
      data: { category: 'homework', deepLink: 'campusly://homework/x', notificationId: 'n1' },
    } as any);

    expect(spy).not.toHaveBeenCalled();
  });

  it('sends push when category is enabled', async () => {
    const userId = new mongoose.Types.ObjectId();
    const schoolId = new mongoose.Types.ObjectId();
    await NotificationPreference.create({ userId, schoolId, push: true });
    await Device.create({ userId, schoolId, deviceToken: 'tok-1', platform: 'ios' });

    const spy = vi.spyOn(PushModule.PushService, 'sendPushBatch').mockResolvedValue(undefined as any);

    await NotificationService.dispatch({
      userId: String(userId),
      schoolId: String(schoolId),
      title: 'New homework',
      message: 'Maths due Friday',
      channels: ['push'],
      data: { category: 'homework', deepLink: 'campusly://homework/x', notificationId: 'n1' },
    } as any);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/services/__tests__/notification.categories.test.ts
```
Expected: FAIL — `spy` is called in both cases because category gating doesn't exist yet.

- [ ] **Step 3: Implement category gating**

In `src/services/notification.service.ts`, find the push branch. Before calling `PushService.sendPushBatch`, look up the user's preference and gate:

```typescript
const pref = await NotificationPreference.findOne({
  userId: notification.userId,
  schoolId: notification.schoolId,
}).lean();

const category = notification.data?.category as
  | 'homework' | 'grades' | 'attendance' | 'billing' | 'announcements'
  | undefined;

const categoryAllowed = !pref || !category || pref.categories?.[category] !== false;

if (pref?.push !== false && categoryAllowed && tokens.length > 0) {
  await PushService.sendPushBatch(tokens, notification.title, bodyText, /* existing payload */);
}
```

(If the function already has a preference lookup, fold the new check into it — don't duplicate the query.)

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/services/__tests__/notification.categories.test.ts
```
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/services/notification.service.ts src/services/__tests__/notification.categories.test.ts
git commit -m "feat(notifications): gate push dispatch on per-category preference"
```

---

## Task 7: PaymentCompletionService — failing test (idempotency)

**Files:**
- Create: `src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { PaymentCompletionService } from '../payment-completion.service.js';
import { OnlinePayment } from '../../model.js';
import { Wallet, WalletTransaction } from '../../../Wallet/model.js';
import { Invoice, Payment } from '../../../Fee/model.js';

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

describe('PaymentCompletionService', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(TEST_URI);
  });
  afterEach(async () => {
    await Promise.all([
      OnlinePayment.deleteMany({}),
      Wallet.deleteMany({}),
      WalletTransaction.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
    ]);
  });
  afterAll(async () => { await mongoose.connection.close(); });

  describe('completeFeePayment', () => {
    it('marks the payment completed and allocates to invoices', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const inv = await Invoice.create({
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        amountDue: 1000,
        amountPaid: 0,
        status: 'pending',
      });
      const payment = await OnlinePayment.create({
        schoolId,
        paymentType: 'fee_payment',
        provider: 'onegate',
        status: 'pending',
        amount: 1000,
        invoiceIds: [inv._id],
      });

      await PaymentCompletionService.completeFeePayment(String(payment._id));

      const updated = await OnlinePayment.findById(payment._id);
      expect(updated?.status).toBe('completed');

      const invAfter = await Invoice.findById(inv._id);
      expect(invAfter?.status).toBe('paid');
      expect(invAfter?.amountPaid).toBe(1000);
    });

    it('is idempotent — a second call is a no-op', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const inv = await Invoice.create({
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        amountDue: 500,
        amountPaid: 0,
        status: 'pending',
      });
      const payment = await OnlinePayment.create({
        schoolId,
        paymentType: 'fee_payment',
        provider: 'onegate',
        status: 'pending',
        amount: 500,
        invoiceIds: [inv._id],
      });

      await PaymentCompletionService.completeFeePayment(String(payment._id));
      await PaymentCompletionService.completeFeePayment(String(payment._id));

      const paymentsForInvoice = await Payment.find({ invoiceId: inv._id });
      expect(paymentsForInvoice.length).toBe(1); // not 2
      const invAfter = await Invoice.findById(inv._id);
      expect(invAfter?.amountPaid).toBe(500); // not 1000
    });
  });

  describe('completeWalletTopup', () => {
    it('credits the wallet and creates a LOAD transaction', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const wallet = await Wallet.create({
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        balance: 100,
      });
      const payment = await OnlinePayment.create({
        schoolId,
        paymentType: 'wallet_topup',
        provider: 'onegate',
        status: 'pending',
        amount: 250,
        walletId: wallet._id,
      });

      await PaymentCompletionService.completeWalletTopup(String(payment._id));

      const walletAfter = await Wallet.findById(wallet._id);
      expect(walletAfter?.balance).toBe(350);

      const txns = await WalletTransaction.find({ walletId: wallet._id });
      expect(txns.length).toBe(1);
      expect(txns[0].type).toBe('LOAD');
      expect(txns[0].amount).toBe(250);
    });

    it('is idempotent', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const wallet = await Wallet.create({
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        balance: 0,
      });
      const payment = await OnlinePayment.create({
        schoolId,
        paymentType: 'wallet_topup',
        provider: 'onegate',
        status: 'pending',
        amount: 100,
        walletId: wallet._id,
      });

      await PaymentCompletionService.completeWalletTopup(String(payment._id));
      await PaymentCompletionService.completeWalletTopup(String(payment._id));

      const walletAfter = await Wallet.findById(wallet._id);
      expect(walletAfter?.balance).toBe(100); // not 200

      const txns = await WalletTransaction.find({ walletId: wallet._id });
      expect(txns.length).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts
```
Expected: FAIL — module `payment-completion.service.js` does not exist.

---

## Task 8: PaymentCompletionService — extract from webhook.service.ts

**Files:**
- Create: `src/modules/PaymentGateway/services/payment-completion.service.ts`
- Modify: `src/modules/PaymentGateway/services/webhook.service.ts`

- [ ] **Step 1: Read the existing logic**

Open `src/modules/PaymentGateway/services/webhook.service.ts` and read:
- `recordFeePayments()` (lines 126–181)
- `creditWallet()` (lines 185–213)

Note the exact behaviors: invoice allocation logic, Payment doc shape, wallet balance update, WalletTransaction shape.

- [ ] **Step 2: Create the new service**

Create `src/modules/PaymentGateway/services/payment-completion.service.ts`:

```typescript
import { OnlinePayment } from '../model.js';
import { Wallet, WalletTransaction } from '../../Wallet/model.js';
import { Invoice, Payment } from '../../Fee/model.js';

export class PaymentCompletionService {
  /**
   * Idempotent: marks the OnlinePayment as completed, allocates
   * the amount across attached invoices, and creates Payment records.
   * Safe to call multiple times — checks status === 'completed' first.
   */
  static async completeFeePayment(paymentId: string): Promise<void> {
    const payment = await OnlinePayment.findById(paymentId);
    if (!payment) throw new Error(`OnlinePayment ${paymentId} not found`);
    if (payment.status === 'completed') return; // idempotent guard
    if (payment.paymentType !== 'fee_payment') {
      throw new Error(`Payment ${paymentId} is not a fee_payment`);
    }

    const invoices = await Invoice.find({
      _id: { $in: payment.invoiceIds ?? [] },
      schoolId: payment.schoolId,
    });

    let remaining = payment.amount;
    for (const inv of invoices) {
      const outstanding = inv.amountDue - (inv.amountPaid ?? 0);
      const allocation = Math.min(remaining, outstanding);
      if (allocation <= 0) continue;

      await Payment.create({
        schoolId: payment.schoolId,
        invoiceId: inv._id,
        amount: allocation,
        method: 'online',
        onlinePaymentId: payment._id,
        paidAt: new Date(),
      });

      inv.amountPaid = (inv.amountPaid ?? 0) + allocation;
      if (inv.amountPaid >= inv.amountDue) inv.status = 'paid';
      await inv.save();
      remaining -= allocation;
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();
  }

  /**
   * Idempotent: credits the wallet, creates a LOAD transaction,
   * and marks the OnlinePayment completed.
   */
  static async completeWalletTopup(paymentId: string): Promise<void> {
    const payment = await OnlinePayment.findById(paymentId);
    if (!payment) throw new Error(`OnlinePayment ${paymentId} not found`);
    if (payment.status === 'completed') return; // idempotent guard
    if (payment.paymentType !== 'wallet_topup') {
      throw new Error(`Payment ${paymentId} is not a wallet_topup`);
    }
    if (!payment.walletId) throw new Error(`Payment ${paymentId} missing walletId`);

    const wallet = await Wallet.findOne({
      _id: payment.walletId,
      schoolId: payment.schoolId,
    });
    if (!wallet) throw new Error(`Wallet ${payment.walletId} not found`);

    wallet.balance = (wallet.balance ?? 0) + payment.amount;
    await wallet.save();

    await WalletTransaction.create({
      schoolId: payment.schoolId,
      walletId: wallet._id,
      type: 'LOAD',
      amount: payment.amount,
      onlinePaymentId: payment._id,
      createdAt: new Date(),
    });

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();
  }
}
```

- [ ] **Step 3: Run the Task 7 test to verify it passes**

Run:
```bash
npx vitest run src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts
```
Expected: PASS (all four cases).

- [ ] **Step 4: Delegate existing webhook handlers to the new service**

In `src/modules/PaymentGateway/services/webhook.service.ts`, replace the bodies of `recordFeePayments` and `creditWallet` with thin delegations. Keep the original function signatures so the PayFast webhook caller doesn't change.

Replace `recordFeePayments(onlinePaymentId)` body with:
```typescript
import { PaymentCompletionService } from './payment-completion.service.js';
// ...
export async function recordFeePayments(onlinePaymentId: string): Promise<void> {
  await PaymentCompletionService.completeFeePayment(onlinePaymentId);
}
```

Replace `creditWallet(onlinePaymentId)` body with:
```typescript
export async function creditWallet(onlinePaymentId: string): Promise<void> {
  await PaymentCompletionService.completeWalletTopup(onlinePaymentId);
}
```

- [ ] **Step 5: Run the FULL backend test suite to verify no regression**

Run:
```bash
npx vitest run
```
Expected: PASS for everything. Pay attention to any existing PayFast webhook tests — they must still pass without modification.

- [ ] **Step 6: Commit**

```bash
git add src/modules/PaymentGateway/services/payment-completion.service.ts \
        src/modules/PaymentGateway/services/__tests__/payment-completion.service.test.ts \
        src/modules/PaymentGateway/services/webhook.service.ts
git commit -m "refactor(payments): extract idempotent PaymentCompletionService shared by PayFast and OneGate flows"
```

---

## Task 9: OneGate fee-payment endpoint — failing test

**Files:**
- Create: `src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../../app.js';
import { signAccessToken } from '../../../lib/jwt.js';
import { Invoice } from '../../Fee/model.js';
import { Wallet } from '../../Wallet/model.js';
import { OnlinePayment } from '../model.js';
import { Student } from '../../Student/model.js';
import * as OneGateLib from '../../../lib/onegate/client.js';

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

describe('OneGate parent payment endpoints', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(TEST_URI);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      Invoice.deleteMany({}),
      Wallet.deleteMany({}),
      OnlinePayment.deleteMany({}),
      Student.deleteMany({}),
    ]);
  });
  afterAll(async () => { await mongoose.connection.close(); });

  describe('POST /api/payment-gateway/onegate/fee-payment', () => {
    it('creates an OnlinePayment and returns OneGate redirectUrl', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const inv = await Invoice.create({
        schoolId, studentId, amountDue: 1500, amountPaid: 0, status: 'pending',
      });

      const spy = vi.spyOn(OneGateLib, 'getOneGateClient').mockReturnValue({
        createPaymentKey: vi.fn().mockResolvedValue({
          key: 'pk_test_xxx',
          url: 'https://payments.onegate.co.za/checkout/pk_test_xxx',
          origin: 'https://payments.onegate.co.za',
        }),
      } as any);

      const token = signAccessToken({
        id: String(new mongoose.Types.ObjectId()),
        schoolId: String(schoolId),
        role: 'parent',
      });

      const res = await request(app)
        .post('/api/payment-gateway/onegate/fee-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          invoiceIds: [String(inv._id)],
          returnUrl: 'campusly://payment-return',
        });

      expect(res.status).toBe(200);
      expect(res.body.paymentId).toBeDefined();
      expect(res.body.redirectUrl).toBe('https://payments.onegate.co.za/checkout/pk_test_xxx');
      expect(res.body.expiresAt).toBeDefined();

      const stored = await OnlinePayment.findById(res.body.paymentId);
      expect(stored?.status).toBe('pending');
      expect(stored?.provider).toBe('onegate');
      expect(stored?.paymentType).toBe('fee_payment');
      expect(stored?.amount).toBe(1500);
      expect(spy).toHaveBeenCalled();
    });

    it('rejects already-paid invoices', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const inv = await Invoice.create({
        schoolId, studentId: new mongoose.Types.ObjectId(),
        amountDue: 100, amountPaid: 100, status: 'paid',
      });

      const token = signAccessToken({
        id: String(new mongoose.Types.ObjectId()),
        schoolId: String(schoolId),
        role: 'parent',
      });

      const res = await request(app)
        .post('/api/payment-gateway/onegate/fee-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ invoiceIds: [String(inv._id)], returnUrl: 'campusly://payment-return' });

      expect(res.status).toBe(400);
    });

    it('rejects invoices from another school (multi-tenant)', async () => {
      const schoolA = new mongoose.Types.ObjectId();
      const schoolB = new mongoose.Types.ObjectId();
      const inv = await Invoice.create({
        schoolId: schoolB, studentId: new mongoose.Types.ObjectId(),
        amountDue: 100, amountPaid: 0, status: 'pending',
      });

      const token = signAccessToken({
        id: String(new mongoose.Types.ObjectId()),
        schoolId: String(schoolA),
        role: 'parent',
      });

      const res = await request(app)
        .post('/api/payment-gateway/onegate/fee-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({ invoiceIds: [String(inv._id)], returnUrl: 'campusly://payment-return' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/payment-gateway/onegate/wallet-topup', () => {
    it('creates an OnlinePayment and returns OneGate redirectUrl', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const wallet = await Wallet.create({
        schoolId, studentId: new mongoose.Types.ObjectId(), balance: 0,
      });

      vi.spyOn(OneGateLib, 'getOneGateClient').mockReturnValue({
        createPaymentKey: vi.fn().mockResolvedValue({
          key: 'pk_test_yyy',
          url: 'https://payments.onegate.co.za/checkout/pk_test_yyy',
          origin: 'https://payments.onegate.co.za',
        }),
      } as any);

      const token = signAccessToken({
        id: String(new mongoose.Types.ObjectId()),
        schoolId: String(schoolId),
        role: 'parent',
      });

      const res = await request(app)
        .post('/api/payment-gateway/onegate/wallet-topup')
        .set('Authorization', `Bearer ${token}`)
        .send({
          walletId: String(wallet._id),
          amount: 25000,
          returnUrl: 'campusly://payment-return',
        });

      expect(res.status).toBe(200);
      expect(res.body.redirectUrl).toContain('payments.onegate.co.za');

      const stored = await OnlinePayment.findById(res.body.paymentId);
      expect(stored?.paymentType).toBe('wallet_topup');
      expect(stored?.amount).toBe(25000);
      expect(stored?.walletId?.toString()).toBe(String(wallet._id));
    });

    it('rejects amount <= 0', async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const wallet = await Wallet.create({
        schoolId, studentId: new mongoose.Types.ObjectId(), balance: 0,
      });
      const token = signAccessToken({
        id: String(new mongoose.Types.ObjectId()),
        schoolId: String(schoolId),
        role: 'parent',
      });

      const res = await request(app)
        .post('/api/payment-gateway/onegate/wallet-topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ walletId: String(wallet._id), amount: 0, returnUrl: 'campusly://payment-return' });

      expect(res.status).toBe(400);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts
```
Expected: FAIL — routes not mounted.

---

## Task 10: OneGate fee-payment + wallet-topup — controllers, validation, routes

**Files:**
- Create: `src/modules/PaymentGateway/controllers/onegate.controller.ts`
- Modify: `src/modules/PaymentGateway/validation.ts`
- Modify: `src/modules/PaymentGateway/routes.ts`

- [ ] **Step 1: Add Zod validation schemas**

In `src/modules/PaymentGateway/validation.ts`, add at the bottom (above the export block if any):

```typescript
import { z } from 'zod/v4';

export const onegateFeePaymentSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1).max(20),
  returnUrl: z.string().min(1),
}).strict();

export const onegateWalletTopupSchema = z.object({
  walletId: z.string().min(1),
  amount: z.number().int().positive(),
  returnUrl: z.string().min(1),
}).strict();
```

- [ ] **Step 2: Implement the controllers**

Create `src/modules/PaymentGateway/controllers/onegate.controller.ts`:

```typescript
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OnlinePayment } from '../model.js';
import { Invoice } from '../../Fee/model.js';
import { Wallet } from '../../Wallet/model.js';
import { getOneGateClient } from '../../../lib/onegate/client.js';

type Authed = Request & { user: { id: string; schoolId: string; role: string } };

export async function initiateOneGateFeePayment(req: Request, res: Response): Promise<void> {
  const { schoolId } = (req as Authed).user;
  const { invoiceIds, returnUrl } = req.body as { invoiceIds: string[]; returnUrl: string };

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
  const invoiceObjectIds = invoiceIds.map((i) => new mongoose.Types.ObjectId(i));

  const invoices = await Invoice.find({
    _id: { $in: invoiceObjectIds },
    schoolId: schoolObjectId,
  });

  if (invoices.length !== invoiceIds.length) {
    res.status(404).json({ message: 'One or more invoices not found' });
    return;
  }
  if (invoices.some((i) => i.status === 'paid' || i.status === 'cancelled')) {
    res.status(400).json({ message: 'Cannot pay an invoice that is already paid or cancelled' });
    return;
  }

  const totalAmount = invoices.reduce(
    (sum, inv) => sum + (inv.amountDue - (inv.amountPaid ?? 0)),
    0,
  );

  const payment = await OnlinePayment.create({
    schoolId: schoolObjectId,
    paymentType: 'fee_payment',
    provider: 'onegate',
    status: 'pending',
    amount: totalAmount,
    invoiceIds: invoiceObjectIds,
    createdAt: new Date(),
  });

  const merchantReference = `fee_${String(payment._id)}`;
  const oneGate = getOneGateClient();
  const onegateResp = await oneGate.createPaymentKey({
    payment_type: 'direct',
    amount: (totalAmount / 100).toFixed(2),
    merchant_reference: merchantReference,
    success_url: returnUrl,
    cancel_url: returnUrl,
    notify_url: `${process.env.PUBLIC_API_URL}/api/webhooks/onegate`,
  } as any);

  payment.providerPaymentKey = onegateResp.key;
  await payment.save();

  res.json({
    paymentId: String(payment._id),
    redirectUrl: onegateResp.url,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
}

export async function initiateOneGateWalletTopup(req: Request, res: Response): Promise<void> {
  const { schoolId } = (req as Authed).user;
  const { walletId, amount, returnUrl } = req.body as {
    walletId: string;
    amount: number;
    returnUrl: string;
  };

  const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
  const walletObjectId = new mongoose.Types.ObjectId(walletId);

  const wallet = await Wallet.findOne({ _id: walletObjectId, schoolId: schoolObjectId });
  if (!wallet) {
    res.status(404).json({ message: 'Wallet not found' });
    return;
  }

  const payment = await OnlinePayment.create({
    schoolId: schoolObjectId,
    paymentType: 'wallet_topup',
    provider: 'onegate',
    status: 'pending',
    amount,
    walletId: walletObjectId,
    createdAt: new Date(),
  });

  const merchantReference = `top_${String(payment._id)}`;
  const oneGate = getOneGateClient();
  const onegateResp = await oneGate.createPaymentKey({
    payment_type: 'direct',
    amount: (amount / 100).toFixed(2),
    merchant_reference: merchantReference,
    success_url: returnUrl,
    cancel_url: returnUrl,
    notify_url: `${process.env.PUBLIC_API_URL}/api/webhooks/onegate`,
  } as any);

  payment.providerPaymentKey = onegateResp.key;
  await payment.save();

  res.json({
    paymentId: String(payment._id),
    redirectUrl: onegateResp.url,
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
}
```

- [ ] **Step 3: Mount the routes**

In `src/modules/PaymentGateway/routes.ts`, add the imports:

```typescript
import {
  initiateOneGateFeePayment,
  initiateOneGateWalletTopup,
} from './controllers/onegate.controller.js';
import {
  onegateFeePaymentSchema,
  onegateWalletTopupSchema,
} from './validation.js';
```

Then add the two routes alongside the existing PayFast `/pay` and `/wallet-topup` routes:

```typescript
router.post(
  '/onegate/fee-payment',
  authenticate,
  validate(onegateFeePaymentSchema),
  initiateOneGateFeePayment,
);
router.post(
  '/onegate/wallet-topup',
  authenticate,
  validate(onegateWalletTopupSchema),
  initiateOneGateWalletTopup,
);
```

- [ ] **Step 4: Run the Task 9 test to verify it passes**

Run:
```bash
npx vitest run src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts
```
Expected: PASS (all five cases).

- [ ] **Step 5: Commit**

```bash
git add src/modules/PaymentGateway/controllers/onegate.controller.ts \
        src/modules/PaymentGateway/validation.ts \
        src/modules/PaymentGateway/routes.ts \
        src/modules/PaymentGateway/__tests__/onegate-endpoints.test.ts
git commit -m "feat(payments): OneGate fee-payment and wallet-topup endpoints for mobile parent flows"
```

---

## Task 11: OneGate webhook — extend for fee_payment and wallet_topup

**Files:**
- Create: `src/modules/subscription/__tests__/onegate-webhook-extended.test.ts`
- Modify: `src/modules/subscription/webhook.ts`

- [ ] **Step 1: Write the failing test**

Create `src/modules/subscription/__tests__/onegate-webhook-extended.test.ts`:

```typescript
import { afterEach, beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../../../app.js';
import { OnlinePayment } from '../../PaymentGateway/model.js';
import { Invoice, Payment } from '../../Fee/model.js';
import { Wallet, WalletTransaction } from '../../Wallet/model.js';
import * as OneGateLib from '../../../lib/onegate/client.js';

const TEST_URI = process.env.MONGODB_TEST_URI ?? 'mongodb://localhost:27017/campusly-test';

const makeLookupFor = (ref: string, amount: string) => ({
  callpay_transaction_id: 'tx-1',
  merchant_reference: ref,
  status: 'success',
  amount,
  refunded: false,
});

describe('OneGate webhook — mobile fee + wallet branches', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) await mongoose.connect(TEST_URI);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([
      OnlinePayment.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      Wallet.deleteMany({}),
      WalletTransaction.deleteMany({}),
    ]);
  });
  afterAll(async () => { await mongoose.connection.close(); });

  it('marks invoice paid when fee_ ref arrives', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const inv = await Invoice.create({
      schoolId, studentId: new mongoose.Types.ObjectId(),
      amountDue: 1000, amountPaid: 0, status: 'pending',
    });
    const payment = await OnlinePayment.create({
      schoolId, paymentType: 'fee_payment', provider: 'onegate',
      status: 'pending', amount: 1000, invoiceIds: [inv._id],
    });

    vi.spyOn(OneGateLib, 'getOneGateClient').mockReturnValue({
      getTransaction: vi.fn().mockResolvedValue(makeLookupFor(`fee_${payment._id}`, '10.00')),
    } as any);

    const res = await request(app)
      .post('/api/webhooks/onegate')
      .set('X-Forwarded-For', process.env.ONEGATE_ALLOWLIST_TEST_IP ?? '127.0.0.1')
      .send({ callpay_transaction_id: 'tx-1' });

    expect(res.status).toBeLessThan(400);

    const updatedInv = await Invoice.findById(inv._id);
    expect(updatedInv?.status).toBe('paid');
    const updatedPayment = await OnlinePayment.findById(payment._id);
    expect(updatedPayment?.status).toBe('completed');
  });

  it('credits wallet when top_ ref arrives', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const wallet = await Wallet.create({
      schoolId, studentId: new mongoose.Types.ObjectId(), balance: 0,
    });
    const payment = await OnlinePayment.create({
      schoolId, paymentType: 'wallet_topup', provider: 'onegate',
      status: 'pending', amount: 500, walletId: wallet._id,
    });

    vi.spyOn(OneGateLib, 'getOneGateClient').mockReturnValue({
      getTransaction: vi.fn().mockResolvedValue(makeLookupFor(`top_${payment._id}`, '5.00')),
    } as any);

    const res = await request(app)
      .post('/api/webhooks/onegate')
      .set('X-Forwarded-For', process.env.ONEGATE_ALLOWLIST_TEST_IP ?? '127.0.0.1')
      .send({ callpay_transaction_id: 'tx-1' });

    expect(res.status).toBeLessThan(400);

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.balance).toBe(500);
    const txns = await WalletTransaction.find({ walletId: wallet._id });
    expect(txns.length).toBe(1);
  });

  it('handles duplicate webhooks idempotently', async () => {
    const schoolId = new mongoose.Types.ObjectId();
    const wallet = await Wallet.create({
      schoolId, studentId: new mongoose.Types.ObjectId(), balance: 0,
    });
    const payment = await OnlinePayment.create({
      schoolId, paymentType: 'wallet_topup', provider: 'onegate',
      status: 'pending', amount: 500, walletId: wallet._id,
    });

    vi.spyOn(OneGateLib, 'getOneGateClient').mockReturnValue({
      getTransaction: vi.fn().mockResolvedValue(makeLookupFor(`top_${payment._id}`, '5.00')),
    } as any);

    await request(app)
      .post('/api/webhooks/onegate')
      .set('X-Forwarded-For', process.env.ONEGATE_ALLOWLIST_TEST_IP ?? '127.0.0.1')
      .send({ callpay_transaction_id: 'tx-1' });
    await request(app)
      .post('/api/webhooks/onegate')
      .set('X-Forwarded-For', process.env.ONEGATE_ALLOWLIST_TEST_IP ?? '127.0.0.1')
      .send({ callpay_transaction_id: 'tx-1' });

    const updatedWallet = await Wallet.findById(wallet._id);
    expect(updatedWallet?.balance).toBe(500); // not 1000
  });
});
```

**Important:** the OneGate webhook is protected by an IP allowlist. Before running this test, set `ONEGATE_IP_ALLOWLIST=127.0.0.1` in `.env.test` (or your Vitest setup file). The webhook handler reads `req.ip`, which `supertest` sets to `127.0.0.1` by default — no need for `X-Forwarded-For` if you configure Express's `trust proxy` correctly for tests. If the existing handler hard-rejects on a missing allowlist env var, you may need to add a small `if (process.env.NODE_ENV !== 'test')` guard around the allowlist check, but only as a last resort and with the explicit reasoning that test isolation justifies it.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npx vitest run src/modules/subscription/__tests__/onegate-webhook-extended.test.ts
```
Expected: FAIL — the new prefixes aren't dispatched.

- [ ] **Step 3: Extend the dispatcher**

Open `src/modules/subscription/webhook.ts`. Find the `handleOneGateWebhook` function (around lines 14–64). After the existing `inv_` else-if branch, add:

```typescript
} else if (ref.startsWith('fee_') && !isRefund) {
  const onlinePaymentId = ref.slice('fee_'.length);
  await PaymentCompletionService.completeFeePayment(onlinePaymentId);
} else if (ref.startsWith('top_') && !isRefund) {
  const onlinePaymentId = ref.slice('top_'.length);
  await PaymentCompletionService.completeWalletTopup(onlinePaymentId);
}
```

Add the import at the top of the file:

```typescript
import { PaymentCompletionService } from '../PaymentGateway/services/payment-completion.service.js';
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npx vitest run src/modules/subscription/__tests__/onegate-webhook-extended.test.ts
```
Expected: PASS (all three cases — fee, wallet, idempotent).

- [ ] **Step 5: Run the FULL test suite to verify no regression**

Run:
```bash
npx vitest run
```
Expected: PASS for everything (subscription tokenisation tests still pass).

- [ ] **Step 6: Commit**

```bash
git add src/modules/subscription/webhook.ts \
        src/modules/subscription/__tests__/onegate-webhook-extended.test.ts
git commit -m "feat(payments): OneGate webhook dispatches fee_payment and wallet_topup completions"
```

---

## Task 12: End-to-end UAT smoke test against real OneGate

**Files:** None (manual verification step)

This task validates the full chain hits real OneGate UAT and the webhook lands. Do this once, after Tasks 1–11 are green.

- [ ] **Step 1: Ensure env vars are set on a staging/dev server reachable from the public internet**

Required:
- `ONEGATE_BASE_URL=https://payments.onegate.co.za`
- `ONEGATE_ORG_ID=21234`
- `ONEGATE_SALT=<UAT salt from the credentials PDF>`
- `PUBLIC_API_URL=https://<your-staging-host>`
- `ONEGATE_ALLOWLIST=<OneGate's webhook IPs>` (request from OneGate support if unsure)

Local OneGate cannot call `localhost`. Use `ngrok http 4500` or a staging server.

- [ ] **Step 2: Create a test invoice via the DB**

Seed an `Invoice` with `amountDue: 1000`, `status: 'pending'`, attached to a school and student you've created.

- [ ] **Step 3: Initiate payment via curl**

```bash
curl -X POST https://<your-staging-host>/api/payment-gateway/onegate/fee-payment \
  -H "Authorization: Bearer <parent-token>" \
  -H "Content-Type: application/json" \
  -d '{"invoiceIds":["<invoice-id>"],"returnUrl":"campusly://payment-return"}'
```

Expected: 200 response with `paymentId` and `redirectUrl` pointing at `payments.onegate.co.za`.

- [ ] **Step 4: Open the redirectUrl in a browser, pay with the UAT card**

UAT card details (from the OneGate credentials PDF):
- Number: `4229989999000012`
- CVV: `871`
- Expiry: `12/31`
- 3DS Auth Code: `test123`

Complete the payment.

- [ ] **Step 5: Verify the webhook landed**

Tail the staging server logs and confirm `POST /api/webhooks/onegate` was hit. Then check:
```bash
curl https://<your-staging-host>/api/payment-gateway/status/<paymentId> \
  -H "Authorization: Bearer <parent-token>"
```
Expected: `{ status: 'completed', ... }`.

Check the Invoice in the DB — `status` should be `paid`, `amountPaid` should match the original `amountDue`.

- [ ] **Step 6: Repeat for wallet top-up**

Same flow but POST to `/api/payment-gateway/onegate/wallet-topup`. Confirm the wallet balance increases by the topped-up amount.

- [ ] **Step 7: No commit needed**

Document the result in your sprint notes. If anything failed, file a bug and return to the appropriate task above.

---

## Self-review checklist (run this before marking the plan complete)

- [ ] Each task includes a failing-test step, a passing-test step, and a commit step.
- [ ] All new endpoints filter Mongo queries by `schoolId`.
- [ ] `PaymentCompletionService` methods are idempotent (tests cover this).
- [ ] OneGate webhook branches use `fee_` and `top_` prefixes (distinct from existing `sub_` and `inv_`).
- [ ] `deepLink`, `category`, and `notificationId` all flow through the push payload.
- [ ] `NotificationPreference.categories` defaults every category to `true`.
- [ ] Migration script is idempotent (`$exists: false` guard).
- [ ] No `any` types in production code paths (test files may use `as any` for spy mocking — acceptable).
- [ ] No file in this plan exceeds 350 lines after the change.
- [ ] Full test suite passes after Tasks 8 and 11 (cross-cutting commits).
