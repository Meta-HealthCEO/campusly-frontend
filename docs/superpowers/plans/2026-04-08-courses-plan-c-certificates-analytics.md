# Courses Plan C — Certificates + Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship certificates and analytics on top of Plans A + B. After this plan, a student who passes a course (completes all lessons AND achieves the course pass mark on graded quizzes) automatically gets a `Certificate` record issued at the moment their enrolment flips to `completed`. They can download a signed PDF of the certificate via a student endpoint. Anyone — even unauthenticated users — can verify a certificate's authenticity via a public endpoint using its verification code. Teachers get a per-course analytics dashboard showing enrolment counts, completion rate, average quiz score, certificates issued, per-lesson drop-off, and per-class breakdown.

**Architecture:** Extends the existing `src/modules/Course/` module. Adds three new files: `service-certificates.ts` for issuance + verification logic, `service-pdf.ts` for `pdfkit`-based PDF rendering (mirrors the QuestionBank pattern), and `service-analytics.ts` for the teacher dashboard aggregation. Hooks the issuance trigger into the existing `recomputeEnrolmentProgress` in `service-progress.ts` where Plan B left a placeholder. Adds a single new top-level route `/api/certificates/verify/:code` mounted WITHOUT `authenticate` — it's the only public endpoint in the whole module and deliberately leaks the four snapshotted identity fields that make up the cert. Analytics lives at `/api/courses/:id/analytics` and is gated by the existing author-tier role guard.

**Tech Stack:** Express 5, Mongoose 9, Zod 4, TypeScript strict. `pdfkit` already in `package.json` (since Plan A). No test framework — verification is `tsc --noEmit` + manual smoke test.

**Related spec:** [docs/superpowers/specs/2026-04-08-courses-design.md](../specs/2026-04-08-courses-design.md)

**Plans A + B status:** Complete. The Course module has 7 models (Certificate is the stub we fill in here), authoring + review workflow, student catalog + enrolment + lesson player + progress + quiz grading, and the critical unlock enforcement in `loadStudentLessonContext` that makes progress trustworthy. Plan B's final review explicitly called out that "progress is now server-enforced, so certificates minted from this data are trustworthy" — this plan cashes in that precondition.

**Plan C scope:**
- IN: Certificate model fleshing-out (it's already a stub — just add methods), `service-certificates.ts` (issueCertificate, getCertificate, verifyCertificate), `service-pdf.ts` (renderCertificatePdf returning Buffer), `service-analytics.ts` (one aggregation method), controller additions, routes (student GET `/api/enrolments/:id/certificate`, public GET `/api/certificates/verify/:code`, teacher GET `/api/courses/:id/analytics`), app mount for the public verify route, smoke script extension
- OUT (future): Custom certificate templates per-school (MVP ships Campusly-branded only), real-time analytics via websockets (MVP is on-demand HTTP), bulk certificate export as a zip, analytics drill-down by question type, student-side analytics ("where did my cohort get stuck"), signing of PDFs with a cryptographic signature beyond the verification code
- OUT (frontend — Plans D+): All UI — teacher analytics dashboard, student certificate download page, public verify landing page

---

## Critical decisions made by this plan

These are the decisions that shape Plan C's design. They're explicit here so implementers don't rediscover them.

### 1. Certificates are generated on demand, not persisted to disk

The spec originally proposed writing PDFs to `uploads/` and storing a `pdfUrl` on the Certificate record. After reading `src/modules/QuestionBank/service-pdf.ts` and its controller pattern, **a simpler approach exists**: generate the PDF as a `Buffer` on every request and stream it directly to the HTTP response. This matches how the QuestionBank module already handles paper/memo PDF downloads.

Benefits:
- No disk management, no orphan file cleanup, no URL lifecycle
- Certificate regeneration cost is trivial (~50ms) — fine for on-demand
- No need for file upload infrastructure in the Course module
- If the school's logo or Campusly's branding changes, re-issued PDFs pick it up automatically; snapshotted identity fields on the Certificate row keep the content stable
- The `Certificate.pdfUrl` field from Plan A's stub stays in the model but defaults to `''` and is never written — reserved for a future caching strategy without breaking the schema

**Tradeoff:** if the student downloads the cert once on a Monday and the school renames itself on a Tuesday, the Monday download (as a file on the student's disk) still shows the old name. But any future download reflects the new name. Snapshot fields on the Certificate row (`studentName`, `courseName`, `schoolName`) keep the PDF contents stable at the moment of issuance even if the underlying records later change — so if the student's name was `'Ayanda Ndlovu'` when the cert issued, subsequent downloads still say `'Ayanda Ndlovu'` even if the user record later changes.

### 2. Certificate issuance is triggered inside `recomputeEnrolmentProgress`

Plan B left a placeholder comment in `service-progress.ts` at the exact point where the enrolment flips to `completed`:

```ts
if (enrolment.progressPercent >= 100 && enrolment.status === 'active') {
  enrolment.status = 'completed';
  enrolment.completedAt = new Date();
  // Plan C will issue the certificate here.
}
```

Plan C adds a call to `CourseCertificateService.issueIfEligible(enrolment, soid)` right after the comment. The "if eligible" part checks:

1. `course.certificateEnabled === true` (teachers can disable certificates per-course)
2. The student passed the course pass mark — computed as the average percent across all graded `QuizAttempt` rows for this enrolment, with the highest attempt per quiz lesson winning
3. A `Certificate` row doesn't already exist for this enrolment (idempotent — won't issue twice)

If all three are true, the service creates a `Certificate` row with snapshotted fields, generates a 12-char `verificationCode`, sets `enrolment.certificateId`, and saves. The PDF is NOT generated at issuance time — that happens at download.

### 3. Course pass mark calculation: average of best quiz attempts

The spec says "pass mark = avg of graded quiz attempts ≥ `course.passMarkPercent`". There are three interpretations:

- **(a)** Average across all quiz attempts (every retry counts)
- **(b)** Average across the latest attempt per quiz lesson
- **(c)** Average across the best attempt per quiz lesson

Plan C uses **(c)** — **best-per-lesson**. Rationale: the student's best demonstrated competence is what a certificate should recognise, and retry-to-improve is the learning model the linear-unlock system already incentivises. A student who scored 60% on their first attempt and 90% on retry should be credited with 90%, not 75%.

**Edge case**: a course with zero graded quiz lessons. In that case there's no quiz score to average, so the pass mark check is effectively "always passes" — completion alone issues the certificate. That matches the spec's intent that completion-only courses are a valid shape.

### 4. Verification endpoint leaks four fields on purpose

The public verify endpoint returns `{ valid, studentName, courseName, schoolName, issuedAt }` for a valid code, or `{ valid: false }` for an invalid/unknown code. This is the only un-authenticated route in the Course module.

Leaking these fields is the entire point — a certificate that can't be verified by anyone isn't a certificate. The attacker model is:
- Possession of a verification code (from a certificate PDF that was legitimately shared) → can confirm the certificate is real
- No possession of a code → cannot enumerate certificates (codes are 12 random chars, ~62^12 ≈ 3×10^21 combinations)
- Timing / enumeration attacks → mitigated by the normal `NotFoundError` path returning in constant time (no rate-limiting required at MVP scale)

What the endpoint does NOT leak:
- Whether a given student has any certificates (you need a code, not a student name)
- Any other certificates held by that student
- The course's content, lesson list, enrolment data, or progress details
- Any user records beyond the snapshotted `studentName` string

### 5. Analytics is a single aggregation, not many round-trips

The spec already committed to this. The `/api/courses/:id/analytics` endpoint runs one MongoDB aggregation pipeline that returns the full dashboard payload: enrolment count, completion rate, average quiz score, certificates issued, per-lesson drop-off, per-class breakdown. The aggregation joins `enrolments` to `lessonprogresses` to `quizattempts` to `certificates`, grouped appropriately.

**Tradeoff:** aggregation pipelines are harder to read than multiple queries. The plan compensates with heavy inline comments so the pipeline stages are self-explanatory.

### 6. No analytics endpoint for students

Teachers get the dashboard; students do not. Students see their own progress tree via `getEnrolment` (Plan B) which already has per-lesson status and overall `progressPercent`. A student-facing "how am I doing compared to my peers" view is out of scope. If it's ever added it belongs on a different endpoint, not this one.

---

## File Structure

### New files in `campusly-backend/src/`

- `modules/Course/service-certificates.ts` — issuance trigger (idempotent), getCertificate by enrolment, verifyCertificate by code, internal eligibility check
- `modules/Course/service-pdf.ts` — `pdfkit` rendering of the certificate as a `Buffer`. Mirrors `src/modules/QuestionBank/service-pdf.ts` patterns (createDocument, finalise helpers)
- `modules/Course/service-analytics.ts` — single `getCourseAnalytics(courseId, schoolId, actor)` method running one aggregation pipeline

### Modified files

- `modules/Course/service-progress.ts` — `recomputeEnrolmentProgress` calls `CourseCertificateService.issueIfEligible` at the completed transition
- `modules/Course/controller-student.ts` — adds `getCertificate` handler (student-side PDF download)
- `modules/Course/controller.ts` — adds `getCourseAnalytics` handler (teacher-side)
- `modules/Course/routes-student.ts` — adds `GET /:id/certificate` route
- `modules/Course/routes.ts` — adds `GET /:id/analytics` route
- `modules/Course/validation.ts` — no new schemas needed (verify and certificate are both GET-only by path param); skipped
- `src/app.ts` — adds new top-level mount `/api/certificates` with a fresh router that has NO `authenticate` middleware (the one and only public route in the module)
- `scripts/smoke-courses.ts` — extends steps 12-14: completion flow, certificate download, verification

### Why the new file split

Plan B already established `service.ts` + `service-student.ts` + `service-progress.ts` as the layer-based split. Plan C follows the same pattern:
- `service-certificates.ts` — ~220 lines, narrow responsibility (issuance + verification)
- `service-pdf.ts` — ~180 lines, pdfkit-only, matches QuestionBank convention
- `service-analytics.ts` — ~160 lines, single aggregation

None of these exceed 350 lines. The existing Course files stay about the same (only `service-progress.ts` grows by ~3 lines for the issuance call).

---

## Task 1 — `service-certificates.ts`: issuance + verification logic

**Files:**
- Create: `campusly-backend/src/modules/Course/service-certificates.ts`

- [ ] **Step 1: Pre-flight verify imports**

```bash
cd c:\Users\shaun\campusly-backend
grep -n "export const Certificate\|export const Enrolment\|export const Course\|export const CourseLesson\|export const QuizAttempt" src/modules/Course/model.ts
grep -n "export const Student" src/modules/Student/model.ts
grep -n "export const School" src/modules/School/model.ts
grep -n "export.*crypto\|randomBytes" src/common/utils.ts || echo "no crypto helper — will use node:crypto directly"
```

Expected: all models resolved from the paths shown. If `utils.ts` has no random helper, we import `randomBytes` from `node:crypto` directly.

- [ ] **Step 2: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\service-certificates.ts`:

```ts
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import {
  Course,
  Enrolment,
  CourseLesson,
  QuizAttempt,
  Certificate,
  type IEnrolment,
} from './model.js';
import { Student } from '../Student/model.js';
import { School } from '../School/model.js';
import {
  NotFoundError,
  BadRequestError,
} from '../../common/errors.js';

// ─── Verification code generation ────────────────────────────────────────

const VERIFY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const VERIFY_CODE_LENGTH = 12;

/**
 * Generate a 12-character verification code using a confusable-free
 * alphabet (no 0/O/1/I). This is the string that appears on the PDF and
 * in the public verify URL. ~32^12 ≈ 10^18 combinations — effectively
 * unguessable for the MVP's scale.
 */
function generateVerificationCode(): string {
  const bytes = randomBytes(VERIFY_CODE_LENGTH);
  let out = '';
  for (let i = 0; i < VERIFY_CODE_LENGTH; i++) {
    out += VERIFY_ALPHABET[bytes[i]! % VERIFY_ALPHABET.length];
  }
  return out;
}

export class CourseCertificateService {
  /**
   * Issue a certificate for an enrolment if the student is eligible and a
   * certificate does not already exist. Idempotent — safe to call on
   * every transition to `completed`.
   *
   * Eligibility:
   *   1. The course has `certificateEnabled === true`
   *   2. The student meets the course pass mark (best quiz attempt per
   *      graded quiz lesson, averaged across all graded quiz lessons).
   *      Courses with zero graded quiz lessons auto-pass this check.
   *   3. No Certificate row exists for this enrolment
   *
   * On eligibility, creates a Certificate with snapshotted identity
   * fields, sets `enrolment.certificateId`, and returns the new cert.
   * On non-eligibility, returns `null` without error — the enrolment
   * still transitions to `completed` but without a certificate.
   */
  static async issueIfEligible(
    enrolment: IEnrolment,
    schoolId: mongoose.Types.ObjectId,
  ): Promise<NonNullable<Awaited<ReturnType<typeof Certificate.create>>> | null> {
    // Idempotency: if a cert already exists for this enrolment, return it.
    const existing = await Certificate.findOne({
      enrolmentId: enrolment._id,
      schoolId,
      isDeleted: false,
    });
    if (existing) return existing;

    const course = await Course.findOne({
      _id: enrolment.courseId,
      schoolId,
      isDeleted: false,
    })
      .select('title passMarkPercent certificateEnabled publishedBy')
      .lean();
    if (!course) return null;
    if (!course.certificateEnabled) return null;

    // Compute the student's best quiz score per graded quiz lesson, then
    // average across all graded quiz lessons to get the course score.
    const gradedQuizLessons = await CourseLesson.find({
      courseId: enrolment.courseId,
      schoolId,
      isDeleted: false,
      type: 'quiz',
      isGraded: true,
    })
      .select('_id')
      .lean();

    if (gradedQuizLessons.length > 0) {
      const lessonIds = gradedQuizLessons.map((l) => l._id);
      const bestScores = await QuizAttempt.aggregate<{
        lessonId: mongoose.Types.ObjectId;
        bestPercent: number;
      }>([
        {
          $match: {
            enrolmentId: enrolment._id,
            schoolId,
            isDeleted: false,
            lessonId: { $in: lessonIds },
          },
        },
        {
          $group: {
            _id: '$lessonId',
            bestPercent: { $max: '$percent' },
          },
        },
        {
          $project: {
            _id: 0,
            lessonId: '$_id',
            bestPercent: 1,
          },
        },
      ]);

      // Always divide by gradedQuizLessons.length (not bestScores.length)
      // so that a student who skipped a quiz gets a 0 contribution from
      // the missing lesson rather than having their average computed
      // only on the quizzes they DID attempt. This is the stricter
      // interpretation and matches Plan B's gating: you can't get a cert
      // by completing lessons 1-3 and skipping the quiz at lesson 4.
      const totalScore = bestScores.reduce((sum, s) => sum + s.bestPercent, 0);
      const avgScore = totalScore / gradedQuizLessons.length;
      if (avgScore < course.passMarkPercent) return null;
    }
    // else: no graded quizzes → eligibility depends only on completion,
    // which the caller already verified (enrolment just flipped to
    // 'completed' at 100% progress).

    // Snapshot identity fields.
    const student = await Student.findOne({
      _id: enrolment.studentId,
      schoolId,
      isDeleted: false,
    })
      .populate({ path: 'userId', select: 'firstName lastName' })
      .lean();
    if (!student) return null;

    const userObj = student.userId as unknown as {
      firstName?: string;
      lastName?: string;
    };
    const studentName = `${userObj?.firstName ?? ''} ${userObj?.lastName ?? ''}`.trim()
      || 'Student';

    const school = await School.findOne({
      _id: schoolId,
      isDeleted: false,
    })
      .select('name')
      .lean();
    const schoolName = school?.name ?? 'School';

    // issuedBy: prefer the course's publisher (who approved the course);
    // fall back to the course's creator if publishedBy isn't set (shouldn't
    // happen for published courses but defensive).
    const issuedBy = course.publishedBy as mongoose.Types.ObjectId | null
      ?? enrolment.enrolledBy;

    // Ensure the verification code is unique. Collisions are vanishingly
    // unlikely but the partial unique index will throw on duplicate —
    // retry up to 3 times.
    let verificationCode = generateVerificationCode();
    for (let attempt = 0; attempt < 3; attempt++) {
      const collision = await Certificate.findOne({ verificationCode })
        .select('_id')
        .lean();
      if (!collision) break;
      verificationCode = generateVerificationCode();
    }

    const certificate = await Certificate.create({
      schoolId,
      isDeleted: false,
      enrolmentId: enrolment._id,
      studentId: enrolment.studentId,
      courseId: enrolment.courseId,
      studentName,
      courseName: course.title,
      schoolName,
      issuedAt: new Date(),
      issuedBy,
      pdfUrl: '',
      verificationCode,
    });

    // Link the cert back to the enrolment.
    enrolment.certificateId = certificate._id;
    await enrolment.save();

    return certificate;
  }

  /**
   * Fetch the certificate for a student's enrolment. The calling user
   * must be the enrolled student (validated upstream — this service
   * trusts its caller). Returns the Certificate row; the caller is
   * responsible for generating the PDF Buffer.
   */
  static async getCertificateForEnrolment(
    enrolmentId: string,
    userId: string,
    schoolId: string,
  ) {
    if (!mongoose.Types.ObjectId.isValid(enrolmentId)) {
      throw new NotFoundError('Certificate not found');
    }
    const soid = new mongoose.Types.ObjectId(schoolId);
    const enrolment = await Enrolment.findOne({
      _id: new mongoose.Types.ObjectId(enrolmentId),
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!enrolment) throw new NotFoundError('Enrolment not found');

    // Ownership: student must own this enrolment.
    const student = await Student.findOne({
      _id: enrolment.studentId,
      schoolId: soid,
      isDeleted: false,
    })
      .select('userId')
      .lean();
    if (!student || student.userId.toString() !== userId) {
      throw new NotFoundError('Certificate not found');
    }

    const cert = await Certificate.findOne({
      enrolmentId: enrolment._id,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!cert) {
      throw new BadRequestError(
        'No certificate available. The course is either incomplete, has certificates disabled, or you did not meet the pass mark.',
      );
    }
    return cert;
  }

  /**
   * PUBLIC — verify a certificate by its verification code. Returns the
   * four snapshotted identity fields on success or `{ valid: false }` on
   * unknown/invalid code. This is the ONLY un-authenticated endpoint in
   * the Course module.
   *
   * Deliberately leaks: studentName, courseName, schoolName, issuedAt.
   * That's what a certificate IS — anyone holding the code can confirm
   * these four things are real.
   */
  static async verifyCertificate(code: string): Promise<
    | { valid: true; studentName: string; courseName: string; schoolName: string; issuedAt: Date }
    | { valid: false }
  > {
    // Cheap input guard — don't let obviously bogus codes hit the DB.
    if (!code || code.length !== VERIFY_CODE_LENGTH) {
      return { valid: false };
    }
    const cert = await Certificate.findOne({
      verificationCode: code,
      isDeleted: false,
    })
      .select('studentName courseName schoolName issuedAt')
      .lean();
    if (!cert) return { valid: false };
    return {
      valid: true,
      studentName: cert.studentName,
      courseName: cert.courseName,
      schoolName: cert.schoolName,
      issuedAt: cert.issuedAt,
    };
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. If `tsc` complains about:
- The `Certificate.create` return type in `issueIfEligible` — the generic `NonNullable<Awaited<ReturnType<...>>>` may be overly clever. Simplify to `InstanceType<typeof Certificate>` or just `Awaited<ReturnType<typeof Certificate.create>>` without the `NonNullable` wrapper. `Model.create()` never returns null, so the `NonNullable` is redundant.
- `student.userId` populate shape — the cast `as unknown as { firstName?: string; lastName?: string }` handles lean + populate. If tsc still complains, add another `as unknown as` layer.
- `gradedQuizLessons.map((l) => l._id)` — Mongoose lean types may need `new mongoose.Types.ObjectId(l._id.toString())` if the inferred type is wrong.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-certificates.ts
git commit -m "feat(courses): add certificate issuance and verification service"
```

---

## Task 2 — `service-pdf.ts`: pdfkit rendering

**Files:**
- Create: `campusly-backend/src/modules/Course/service-pdf.ts`

- [ ] **Step 1: Pre-flight check — existing pdfkit usage**

```bash
cd c:\Users\shaun\campusly-backend
grep -n "^import.*pdfkit\|new PDFDocument" src/modules/QuestionBank/service-pdf.ts | head -5
```

Confirm the pattern: `import PDFDocument from 'pdfkit';` + `new PDFDocument({ size: 'A4', margins: {...}, bufferPages: true })`.

- [ ] **Step 2: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\service-pdf.ts`:

```ts
import PDFDocument from 'pdfkit';
import type { ICertificate } from './model.js';

/**
 * Certificate PDF dimensions. A4 landscape (297×210mm → 842×595 pt) is
 * the traditional certificate orientation and reads well as both a
 * screen download and a printed page.
 */
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 50;

/**
 * Render a certificate as a PDF Buffer. The caller streams the buffer to
 * the HTTP response with Content-Type: application/pdf. Matches the
 * pattern used by src/modules/QuestionBank/service-pdf.ts.
 */
export class CourseCertificatePdfService {
  static async render(cert: ICertificate): Promise<Buffer> {
    const doc = createDocument();
    renderBorder(doc);
    renderTitle(doc);
    renderStudentName(doc, cert.studentName);
    renderCompletionText(doc, cert.courseName);
    renderFooter(doc, cert);
    return finalise(doc);
  }
}

// ─── Document helpers ────────────────────────────────────────────────────

function createDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: {
      Title: 'Certificate of Completion',
      Author: 'Campusly',
    },
  });
}

function finalise(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────

/**
 * A double border ~15pt inside the page edge. Gives the cert its
 * "official document" feel without needing custom fonts or images.
 */
function renderBorder(doc: PDFKit.PDFDocument): void {
  const outer = 20;
  const inner = 30;
  doc
    .lineWidth(2)
    .strokeColor('#1e3a8a') // deep blue — matches Campusly brand
    .rect(outer, outer, PAGE_WIDTH - 2 * outer, PAGE_HEIGHT - 2 * outer)
    .stroke()
    .lineWidth(0.75)
    .rect(inner, inner, PAGE_WIDTH - 2 * inner, PAGE_HEIGHT - 2 * inner)
    .stroke();
}

/**
 * The "Certificate of Completion" headline and the school name, centred
 * near the top of the page.
 */
function renderTitle(doc: PDFKit.PDFDocument): void {
  doc
    .fillColor('#1e3a8a')
    .font('Helvetica-Bold')
    .fontSize(32)
    .text('Certificate of Completion', 0, 90, {
      align: 'center',
      width: PAGE_WIDTH,
    });

  doc
    .moveDown(0.5)
    .fillColor('#6b7280')
    .font('Helvetica')
    .fontSize(14)
    .text('This certificate is presented to', 0, 150, {
      align: 'center',
      width: PAGE_WIDTH,
    });
}

/**
 * The student's name in a large serif-ish weight, centred. This is the
 * visual centrepiece of the certificate.
 */
function renderStudentName(doc: PDFKit.PDFDocument, name: string): void {
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(42)
    .text(name, 0, 200, {
      align: 'center',
      width: PAGE_WIDTH,
    });

  // Underline beneath the name.
  const underlineY = 260;
  const lineWidth = 400;
  doc
    .moveTo((PAGE_WIDTH - lineWidth) / 2, underlineY)
    .lineTo((PAGE_WIDTH + lineWidth) / 2, underlineY)
    .lineWidth(1)
    .strokeColor('#1e3a8a')
    .stroke();
}

/**
 * "For successfully completing the course: [course name]" centred below
 * the student name.
 */
function renderCompletionText(
  doc: PDFKit.PDFDocument,
  courseName: string,
): void {
  doc
    .fillColor('#6b7280')
    .font('Helvetica')
    .fontSize(14)
    .text('for successfully completing the course', 0, 285, {
      align: 'center',
      width: PAGE_WIDTH,
    });

  doc
    .moveDown(0.5)
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(courseName, 0, 315, {
      align: 'center',
      width: PAGE_WIDTH,
    });
}

/**
 * School name on the left, issued date in the middle, verification code
 * on the right — all near the bottom of the page.
 */
function renderFooter(
  doc: PDFKit.PDFDocument,
  cert: ICertificate,
): void {
  const footerY = PAGE_HEIGHT - 100;
  const issued = cert.issuedAt.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Left: school name
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(cert.schoolName, MARGIN + 20, footerY, {
      align: 'left',
      width: (PAGE_WIDTH - 2 * MARGIN - 40) / 3,
    });
  doc
    .fillColor('#6b7280')
    .font('Helvetica')
    .fontSize(10)
    .text('Issued by', MARGIN + 20, footerY + 18, {
      align: 'left',
      width: (PAGE_WIDTH - 2 * MARGIN - 40) / 3,
    });

  // Middle: issued date
  doc
    .fillColor('#111827')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(issued, 0, footerY, {
      align: 'center',
      width: PAGE_WIDTH,
    });
  doc
    .fillColor('#6b7280')
    .font('Helvetica')
    .fontSize(10)
    .text('Date of issue', 0, footerY + 18, {
      align: 'center',
      width: PAGE_WIDTH,
    });

  // Right: verification code
  const rightX = PAGE_WIDTH - MARGIN - 20 - (PAGE_WIDTH - 2 * MARGIN - 40) / 3;
  doc
    .fillColor('#111827')
    .font('Courier-Bold')
    .fontSize(12)
    .text(cert.verificationCode, rightX, footerY, {
      align: 'right',
      width: (PAGE_WIDTH - 2 * MARGIN - 40) / 3,
    });
  doc
    .fillColor('#6b7280')
    .font('Helvetica')
    .fontSize(10)
    .text('Verification code', rightX, footerY + 18, {
      align: 'right',
      width: (PAGE_WIDTH - 2 * MARGIN - 40) / 3,
    });

  // Verification URL hint beneath the code.
  doc
    .fontSize(8)
    .fillColor('#9ca3af')
    .text(`Verify at /verify/${cert.verificationCode}`, 0, footerY + 40, {
      align: 'center',
      width: PAGE_WIDTH,
    });
}
```

Notes on the design:

- **A4 landscape (842×595 pt)** is the traditional certificate orientation. Matches what most school certificates look like.
- **No images, no custom fonts.** pdfkit ships with Helvetica and Courier as standard PDF fonts — no font file resolution, no image loading, no external assets. The border + typography do the "official document" lifting.
- **Campusly deep blue (#1e3a8a)** for the border and headline. If you want to pick a different brand colour later, this is a one-line change.
- **Text placement is absolute (using `0, Y, { align: 'center', width: PAGE_WIDTH }`)** rather than relying on pdfkit's cursor-based flow. This makes the layout predictable for arbitrary name/course-title lengths — long names will simply get clipped by the underline rather than pushing the whole document down.
- **No school logo yet.** The `School.logo` field exists but is optional, and `pdfkit` image loading requires either a Buffer or a filesystem path. Adding this is a one-method extension in a later plan — mention it in the "out of scope" list.

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. If `tsc` complains about `PDFKit.PDFDocument` type (the global namespace isn't always visible), add `/// <reference types="pdfkit" />` at the top, or import the type explicitly as `import type PDFDocument from 'pdfkit';` and use `InstanceType<typeof PDFDocument>`. The QuestionBank helpers file has a working pattern — match whatever it does.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-pdf.ts
git commit -m "feat(courses): add pdfkit certificate renderer"
```

---

## Task 3 — Wire issuance into `recomputeEnrolmentProgress`

**Files:**
- Modify: `campusly-backend/src/modules/Course/service-progress.ts`

- [ ] **Step 1: Find the placeholder**

Open `c:\Users\shaun\campusly-backend\src\modules\Course\service-progress.ts` and find the `recomputeEnrolmentProgress` function. The current body has a completion transition with a placeholder comment:

```ts
if (enrolment.progressPercent >= 100 && enrolment.status === 'active') {
  enrolment.status = 'completed';
  enrolment.completedAt = new Date();
  // Plan C will issue the certificate here.
}
await enrolment.save();
```

- [ ] **Step 2: Add the issuance call**

Replace with:

```ts
if (enrolment.progressPercent >= 100 && enrolment.status === 'active') {
  enrolment.status = 'completed';
  enrolment.completedAt = new Date();
  await enrolment.save();
  // Issue the certificate (idempotent — safe even if this code is
  // reached twice). issueIfEligible returns null for courses with
  // certificates disabled or students who didn't meet the pass mark;
  // the enrolment still transitions to 'completed' in those cases.
  await CourseCertificateService.issueIfEligible(enrolment, schoolId);
  return;
}
await enrolment.save();
```

Note the **change in save order**: previously we set `status + completedAt` and then called `enrolment.save()` once at the end. Now we save FIRST (so the certificate service sees the updated row if it refetches), then issue the certificate, then return. The non-completion path still falls through to the single `await enrolment.save()` at the end.

- [ ] **Step 3: Add the import**

At the top of `service-progress.ts` where the other service imports live, add:

```ts
import { CourseCertificateService } from './service-certificates.js';
```

- [ ] **Step 4: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. If `tsc` complains that `issueIfEligible` expects `IEnrolment` but gets a hydrated document, add `.toObject()` or cast as `enrolment as unknown as IEnrolment`. The service is supposed to accept a hydrated doc directly — if the signature is too strict, loosen it in `service-certificates.ts` rather than fighting the type.

- [ ] **Step 5: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-progress.ts
git commit -m "feat(courses): trigger certificate issuance on enrolment completion"
```

---

## Task 4 — Student-side controller: GET `/api/enrolments/:id/certificate`

**Files:**
- Modify: `campusly-backend/src/modules/Course/controller-student.ts`
- Modify: `campusly-backend/src/modules/Course/routes-student.ts`

- [ ] **Step 1: Add the handler to `controller-student.ts`**

In `c:\Users\shaun\campusly-backend\src\modules\Course\controller-student.ts`, add these imports alongside the existing service imports:

```ts
import { CourseCertificateService } from './service-certificates.js';
import { CourseCertificatePdfService } from './service-pdf.js';
```

Then append a new static method to the `CourseStudentController` class (after `dropEnrolment`):

```ts
// ─── Certificate download ────────────────────────────────────────────────

static async getCertificate(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const cert = await CourseCertificateService.getCertificateForEnrolment(
    req.params.id as string,
    user.id,
    user.schoolId!,
  );
  const buffer = await CourseCertificatePdfService.render(cert);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="certificate-${cert.verificationCode}.pdf"`,
  );
  res.setHeader('Content-Length', buffer.length.toString());
  res.end(buffer);
}
```

Note the `res.end(buffer)` rather than `res.json(...)` — this is a binary download, not a JSON envelope. Matches the `QuestionBank` controller pattern at line 357-360.

- [ ] **Step 2: Add the route to `routes-student.ts`**

In `c:\Users\shaun\campusly-backend\src\modules\Course\routes-student.ts`, add a new route near the other `/:id/lessons/:lessonId` family (after `router.post('/:id/lessons/:lessonId/quiz-attempt', ...)`):

```ts
// ─── Certificate download ──────────────────────────────────────────────────

router.get(
  '/:id/certificate',
  authorize(...STUDENT_ROLES),
  CourseStudentController.getCertificate,
);
```

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/controller-student.ts src/modules/Course/routes-student.ts
git commit -m "feat(courses): add student certificate download endpoint"
```

---

## Task 5 — Public verification endpoint + mount

**Files:**
- Create: `campusly-backend/src/modules/Course/routes-public.ts`
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Create the public routes file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\routes-public.ts`:

```ts
import { Router, type Request, type Response } from 'express';
import { apiResponse } from '../../common/utils.js';
import { CourseCertificateService } from './service-certificates.js';

const router = Router();

/**
 * PUBLIC — verify a certificate by its verification code. This is the
 * ONLY un-authenticated endpoint in the entire Course module.
 *
 * Returns:
 *   - { valid: true, studentName, courseName, schoolName, issuedAt } on
 *     success
 *   - { valid: false } for unknown / invalid / malformed codes
 *
 * The endpoint deliberately leaks the four snapshotted identity fields
 * on success — that is the entire point of a verification endpoint.
 */
router.get('/verify/:code', async (req: Request, res: Response): Promise<void> => {
  const result = await CourseCertificateService.verifyCertificate(
    req.params.code as string,
  );
  res.json(apiResponse(true, result));
});

export default router;
```

Notes:
- **No `authorize(...)`, no `authenticate`, no `requireModule(...)`.** This is the public endpoint.
- The handler is inline rather than in a controller class — it's a single endpoint that calls one service method, so the ceremony of a controller class isn't warranted. If Plan D adds more public endpoints (e.g. public course discovery), promote it to `controller-public.ts` then.
- `apiResponse(true, result)` wraps the result even though the service's return includes its own `valid` flag — that keeps the envelope consistent with the rest of the API.

- [ ] **Step 2: Mount in `app.ts` WITHOUT `authenticate`**

In `c:\Users\shaun\campusly-backend\src\app.ts`, find the line:

```ts
import courseStudentRoutes from './modules/Course/routes-student.js';
```

Immediately after it, add:

```ts
import coursePublicRoutes from './modules/Course/routes-public.js';
```

Find the line:

```ts
app.use('/api/enrolments', authenticate, requireModule('courses'), courseStudentRoutes);
```

Immediately after it, add:

```ts
// PUBLIC — no authenticate, no requireModule. Certificate verification
// must work for anyone holding a verification code, including unregistered
// users outside the school.
app.use('/api/certificates', coursePublicRoutes);
```

**Important:** do NOT add `authenticate` to this mount. Do NOT add `requireModule('courses')` — the verifier is a global service, not gated by module subscription. A school that later disables the `courses` module should still have its previously-issued certificates verifiable (otherwise employers chasing a dropped-school's past certificates would hit 403s).

- [ ] **Step 3: Type-check + dev server smoke boot**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

Then boot the server to confirm the new routes mount cleanly:

```bash
cd c:\Users\shaun\campusly-backend
npm run dev
```

Look for:
- `[Campusly] Server running on port 4500` — baseline OK
- No `Cannot overwrite ... model` errors
- No unfamiliar stack traces referencing `Course/service-certificates.ts` or `Course/service-pdf.ts`
- No reference to the security backdoor (should be long gone)

Press `Ctrl+C` to stop. Confirm graceful shutdown.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/routes-public.ts src/app.ts
git commit -m "feat(courses): add public certificate verify endpoint at /api/certificates/verify/:code"
```

---

## Task 6 — `service-analytics.ts`: teacher dashboard aggregation

**Files:**
- Create: `campusly-backend/src/modules/Course/service-analytics.ts`

- [ ] **Step 1: Write the file**

Create `c:\Users\shaun\campusly-backend\src\modules\Course\service-analytics.ts`:

```ts
import mongoose from 'mongoose';
import {
  Course,
  CourseLesson,
  Enrolment,
  LessonProgress,
  QuizAttempt,
  Certificate,
} from './model.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../../common/errors.js';
import type { CourseActor } from './service.js';

export interface CourseAnalytics {
  enrolmentCount: number;
  activeCount: number;
  completedCount: number;
  droppedCount: number;
  completionRate: number; // 0-100
  avgQuizScore: number; // 0-100, avg of best-per-lesson per enrolment
  certificatesIssued: number;
  perLessonDropOff: Array<{
    lessonId: string;
    title: string;
    orderIndex: number;
    studentsReached: number;
    studentsCompleted: number;
  }>;
  perClassBreakdown: Array<{
    classId: string | null;
    enroled: number;
    completed: number;
  }>;
}

/**
 * Teacher-facing analytics. Gated by canAuthor — any teacher who owns
 * the course, plus school_admin / super_admin / HOD / principal, can
 * read this. Returns the full dashboard in one request.
 */
export class CourseAnalyticsService {
  static async getCourseAnalytics(
    courseId: string,
    schoolId: string,
    actor: CourseActor,
  ): Promise<CourseAnalytics> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new NotFoundError('Course not found');
    }
    const soid = new mongoose.Types.ObjectId(schoolId);
    const course = await Course.findOne({
      _id: new mongoose.Types.ObjectId(courseId),
      schoolId: soid,
      isDeleted: false,
    })
      .select('createdBy')
      .lean();
    if (!course) throw new NotFoundError('Course not found');

    // Teachers without HOD/principal flag can only see analytics for
    // courses they authored. Admins (school_admin, super_admin) and
    // HODs/principals see any course in their school.
    const isAdminTier = actor.role === 'super_admin'
      || actor.role === 'school_admin'
      || actor.isHOD
      || actor.isSchoolPrincipal;
    if (!isAdminTier && course.createdBy.toString() !== actor.userId) {
      throw new ForbiddenError('You can only view analytics for your own courses');
    }

    const courseOid = new mongoose.Types.ObjectId(courseId);

    // ─── Enrolment counts ─────────────────────────────────────────────────
    const enrolCounts = await Enrolment.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { courseId: courseOid, schoolId: soid, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const countByStatus = new Map<string, number>();
    for (const row of enrolCounts) countByStatus.set(row._id, row.count);
    const activeCount = countByStatus.get('active') ?? 0;
    const completedCount = countByStatus.get('completed') ?? 0;
    const droppedCount = countByStatus.get('dropped') ?? 0;
    const enrolmentCount = activeCount + completedCount + droppedCount;
    const completionRate = enrolmentCount === 0
      ? 0
      : Math.round((completedCount / enrolmentCount) * 100);

    // ─── Certificates issued ─────────────────────────────────────────────
    const certificatesIssued = await Certificate.countDocuments({
      courseId: courseOid,
      schoolId: soid,
      isDeleted: false,
    });

    // ─── Average quiz score across enrolments ───────────────────────────
    // Aggregation pipeline:
    //   1. Match all quiz attempts for this course
    //   2. Group by (enrolmentId, lessonId) → keep the best percent
    //   3. Group by enrolmentId → average best-per-lesson
    //   4. Group all → average the per-enrolment scores
    const avgScoreAgg = await QuizAttempt.aggregate<{
      avgScore: number;
    }>([
      {
        $match: {
          courseId: courseOid,
          schoolId: soid,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { enrolmentId: '$enrolmentId', lessonId: '$lessonId' },
          bestPercent: { $max: '$percent' },
        },
      },
      {
        $group: {
          _id: '$_id.enrolmentId',
          perEnrolmentAvg: { $avg: '$bestPercent' },
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$perEnrolmentAvg' },
        },
      },
    ]);
    const avgQuizScore = avgScoreAgg.length > 0
      ? Math.round(avgScoreAgg[0]!.avgScore)
      : 0;

    // ─── Per-lesson drop-off ────────────────────────────────────────────
    // For each lesson, count how many students have a LessonProgress row
    // (regardless of status) vs. how many completed it.
    const lessons = await CourseLesson.find({
      courseId: courseOid,
      schoolId: soid,
      isDeleted: false,
    })
      .select('_id title orderIndex moduleId')
      .sort({ orderIndex: 1 })
      .lean();

    const progressCounts = await LessonProgress.aggregate<{
      _id: mongoose.Types.ObjectId;
      reached: number;
      completed: number;
    }>([
      {
        $match: {
          courseId: courseOid,
          schoolId: soid,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$lessonId',
          reached: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    const progressByLesson = new Map<
      string,
      { reached: number; completed: number }
    >();
    for (const row of progressCounts) {
      progressByLesson.set(row._id.toString(), {
        reached: row.reached,
        completed: row.completed,
      });
    }

    const perLessonDropOff = lessons.map((l) => {
      const p = progressByLesson.get(l._id.toString());
      return {
        lessonId: l._id.toString(),
        title: l.title,
        orderIndex: l.orderIndex,
        studentsReached: p?.reached ?? 0,
        studentsCompleted: p?.completed ?? 0,
      };
    });

    // ─── Per-class breakdown ────────────────────────────────────────────
    // If the course is assigned to multiple classes, show the split.
    const classBreakdown = await Enrolment.aggregate<{
      _id: mongoose.Types.ObjectId | null;
      enroled: number;
      completed: number;
    }>([
      {
        $match: {
          courseId: courseOid,
          schoolId: soid,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$classId',
          enroled: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);
    const perClassBreakdown = classBreakdown.map((row) => ({
      classId: row._id ? row._id.toString() : null,
      enroled: row.enroled,
      completed: row.completed,
    }));

    return {
      enrolmentCount,
      activeCount,
      completedCount,
      droppedCount,
      completionRate,
      avgQuizScore,
      certificatesIssued,
      perLessonDropOff,
      perClassBreakdown,
    };
  }
}
```

Notes on the aggregation:

- **Five pipelines, not one**. The spec said "one aggregation" but that was aspirational — a single pipeline joining enrolments, lessons, progress, quizattempts, and certificates in MongoDB is possible via `$lookup` but would be substantially harder to read and debug. Five focused pipelines are a defensible trade; each returns in the single-digit milliseconds for typical course sizes (< 1000 enrolments).
- **`avgQuizScore` uses the best-per-lesson-per-enrolment** logic that matches Plan C's certificate pass-mark calculation. Consistency across analytics and issuance matters — if a teacher sees `avgQuizScore = 75%` but the student didn't get a cert because their score was 60% by a different rule, that's a bug.
- **`perClassBreakdown` groups by `classId`** including `null` for any self-enrolled rows (Plan C out-of-scope) so the aggregation is future-proof.
- **`perLessonDropOff.studentsReached` vs `studentsCompleted`** — "reached" means any LessonProgress row exists (in_progress or completed), "completed" is specifically `status: 'completed'`. A teacher viewing the chart sees where students drop off by comparing the two bars per lesson.

- [ ] **Step 2: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`. If `tsc` complains about the aggregation generic types, simplify the typed-result generics — Mongoose's aggregate typings are finicky. Fall back to `aggregate<Record<string, unknown>>(...)` and cast the result if needed.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/service-analytics.ts
git commit -m "feat(courses): add teacher analytics aggregation service"
```

---

## Task 7 — Teacher analytics controller + route

**Files:**
- Modify: `campusly-backend/src/modules/Course/controller.ts`
- Modify: `campusly-backend/src/modules/Course/routes.ts`

- [ ] **Step 1: Add the handler to `controller.ts`**

In `c:\Users\shaun\campusly-backend\src\modules\Course\controller.ts` (the Plan A authoring controller, NOT `controller-student.ts`), add this import alongside the existing `CourseService` import:

```ts
import { CourseAnalyticsService } from './service-analytics.js';
```

Then append a new static method to the `CourseController` class (after `listEnrolments` — the last existing method):

```ts
// ─── Analytics ───────────────────────────────────────────────────────────

static async getCourseAnalytics(req: Request, res: Response): Promise<void> {
  const { user, actor } = buildContext(req);
  const result = await CourseAnalyticsService.getCourseAnalytics(
    req.params.id as string,
    user.schoolId!,
    actor,
  );
  res.json(apiResponse(true, result));
}
```

`buildContext` is the helper introduced in Plan A Task 5 — confirm it exists at the top of `controller.ts` before adding this handler.

- [ ] **Step 2: Add the route to `routes.ts`**

In `c:\Users\shaun\campusly-backend\src\modules\Course\routes.ts`, append a new route in the Analytics section (after the last existing route). Since there's no existing Analytics section, add one at the bottom of the file before `export default router;`:

```ts
// ─── Analytics ─────────────────────────────────────────────────────────────

router.get(
  '/:id/analytics',
  authorize(...COURSE_ROLES),
  CourseController.getCourseAnalytics,
);
```

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add src/modules/Course/controller.ts src/modules/Course/routes.ts
git commit -m "feat(courses): add teacher analytics endpoint at /api/courses/:id/analytics"
```

---

## Task 8 — Smoke script extension

**Files:**
- Modify: `campusly-backend/scripts/smoke-courses.ts`

- [ ] **Step 1: Extend `main()` with Plan C steps**

Open `c:\Users\shaun\campusly-backend\scripts\smoke-courses.ts`. Find the final `console.log('\nOK Smoke test passed');` line at the bottom of `main()`.

Insert this block **immediately before** the final success log:

```ts
console.log('12. Teacher fetching analytics...');
const analyticsRes = await call<{
  enrolmentCount: number;
  completionRate: number;
  avgQuizScore: number;
  certificatesIssued: number;
}>(TEACHER_JWT!, 'GET', `/courses/${courseId}/analytics`);
console.log(
  `    -> enrolments=${analyticsRes.data?.enrolmentCount} completion=${analyticsRes.data?.completionRate}% avgScore=${analyticsRes.data?.avgQuizScore}% certs=${analyticsRes.data?.certificatesIssued}`,
);

console.log('13. Public certificate verify with invalid code...');
const badVerifyRes = await call<{ valid: false } | { valid: true }>(
  '',
  'GET',
  '/certificates/verify/INVALID12345',
);
const badValid = badVerifyRes.data && 'valid' in badVerifyRes.data
  ? badVerifyRes.data.valid
  : undefined;
console.log(`    -> valid=${badValid} (expected: false)`);

// Step 14 — certificate download — only runs if the student actually
// completed the course and got a cert. Most smoke runs won't trigger
// completion because step 11 only wrote scrolledToEnd for one lesson.
// So we attempt the download and tolerate a 400 (no certificate yet).
if (myEnrolment) {
  console.log('14. Student attempting certificate download (may 400 if not yet completed)...');
  try {
    const res = await fetch(`${API}/enrolments/${myEnrolment._id}/certificate`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${STUDENT_JWT!}` },
    });
    if (res.status === 200) {
      const length = res.headers.get('content-length') ?? '(unknown)';
      console.log(`    -> 200 OK, PDF size=${length} bytes`);
    } else if (res.status === 400) {
      console.log(`    -> 400 (expected — course not yet fully completed)`);
    } else {
      console.log(`    -> ${res.status} (unexpected)`);
    }
  } catch (err) {
    console.log(`    -> fetch error: ${String(err)}`);
  }
}
```

Note the **public verify step** uses an empty string for the token argument to `call(...)`. We need to update the `call` helper to accept an optional/empty token and skip the Authorization header in that case. Find the existing `call` function at the top of the file and change the Authorization header logic from:

```ts
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
},
```

to:

```ts
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
};
if (token) headers.Authorization = `Bearer ${token}`;
```

And adjust the `fetch` call to use the new `headers` variable. This is a minor mechanical change — match the existing style.

- [ ] **Step 2: Update the docstring**

At the top of `smoke-courses.ts`, update the `What it does:` list to include the new steps 12-14:

```
*   12. Teacher fetches analytics dashboard
*   13. Public certificate verify with a bogus code (expects valid=false)
*   14. Student attempts certificate download (may 400 if the course wasn't
*       fully completed in this run — that's expected)
```

- [ ] **Step 3: Type-check**

```bash
cd c:\Users\shaun\campusly-backend
npx tsc --noEmit
```

Expected: `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
cd c:\Users\shaun\campusly-backend
git add scripts/smoke-courses.ts
git commit -m "chore(courses): extend smoke script with Plan C analytics + certificate flow"
```

---

## Self-review — Plan C

After executing every task, do a final pass:

- [ ] **Spec coverage check:** all Plan C requirements from the design spec are implemented: certificate issuance trigger (Task 3), PDF generation (Task 2), student download endpoint (Task 4), public verify endpoint (Task 5), teacher analytics endpoint (Tasks 6-7). No Plan D frontend work.

- [ ] **Multi-tenancy audit on the new files:**

```bash
cd c:\Users\shaun\campusly-backend
grep -nE 'find\(|findOne|findById|countDocuments|updateOne|updateMany|deleteOne|deleteMany|bulkWrite|create\(|aggregate' src/modules/Course/service-certificates.ts src/modules/Course/service-analytics.ts
```

Walk through every hit and confirm `schoolId` + `isDeleted: false` are in the filter. The verification endpoint's query is the ONE exception — it searches by `verificationCode` only, across all schools. That's intentional: the verifier must work for any cert, regardless of which school's subscription may have lapsed. Document this exception explicitly.

- [ ] **Idempotent issuance verification:** `issueIfEligible` is called once per completion transition, but `recomputeEnrolmentProgress` can be called repeatedly. Confirm the idempotency path: second call finds the existing Certificate row via the unique `enrolmentId` index and returns it without creating a new one.

- [ ] **Public endpoint is the ONLY un-authenticated route in the module:** `routes-public.ts` has no `authorize`, `authenticate`, or `requireModule`. Every other route still has all three. Double-check `app.ts` — the `/api/certificates` mount has no `authenticate` middleware.

- [ ] **`tsc --noEmit` exit 0** across all 8 tasks.

- [ ] **Server boots cleanly** after Task 5 (the mount). No Mongoose model collisions, no reference errors, no pdfkit import failures.

---

## What Plan C does NOT do

- **No custom certificate templates per school** — one Campusly-branded template ships. Phase 2 can add a template picker using the `School.logo` field.
- **No cryptographic signing of the PDF** — the verification code is the trust anchor, not a signed PDF. The verify endpoint is the ground truth.
- **No certificate revocation flow** — once issued, a certificate is forever. If a teacher retroactively discovers academic dishonesty, they can soft-delete the Certificate row manually; the verify endpoint returns `{ valid: false }` because the query includes `isDeleted: false`.
- **No bulk export of certificates as a zip** — each cert is downloaded individually by the student
- **No email delivery** — the certificate is available for download via the student dashboard when Plan D ships the UI
- **No real-time analytics via websockets** — teacher dashboard is on-demand HTTP
- **No student-facing analytics** — students see their own progress via Plan B's `getEnrolment`, not a stats view
- **No drill-down analytics** — the dashboard returns aggregates, not individual student histories
- **No frontend** — certificate download page, teacher dashboard view, and public verify landing page are all Plans D+

---

## Plan D readiness

After Plan C ships, the entire backend is done. Plan D is purely frontend:

- **Teacher authoring UI** — course builder at `/teacher/courses/[id]/edit`, uses Plan A's endpoints
- **Teacher analytics dashboard** — `/teacher/courses/[id]/analytics`, uses Plan C's endpoint
- **HOD review UI** — `/admin/courses/review`, uses Plan A's review endpoints
- **Student catalog + learner** — `/student/courses`, `/student/courses/[id]`, `/student/courses/[id]/learn/[lessonId]`, uses Plan B's endpoints
- **Student certificate page** — `/student/courses/[id]/certificate`, uses Plan C's download endpoint
- **Public verify page** — `/verify/certificate/[code]` on the frontend (NOT under `/dashboard`), hits Plan C's public verify endpoint and renders a card showing the four snapshotted fields

The backend is fully wired by Plan C. All Plan D needs to do is paint the UI.
