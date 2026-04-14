# Assessment Structure Builder — Design Spec

**Date:** 2026-04-14
**Status:** Approved
**Approach:** Extend existing Academic module models (Approach A)

---

## Overview

A guided assessment structure builder that lets teachers define their term's assessment plan with weighted categories, individual line items, and live term mark calculations. Supports both school-based and standalone teachers.

Teachers create a two-level structure: **categories** (e.g. Tests 30%, Exam 40%) containing **line items** (e.g. Test 1, Test 2). As marks are entered against line items, the system calculates a live projected term mark per student. When all marks are captured, the teacher can lock the structure to signal readiness for report cards.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Who creates structures? | Teachers (full autonomy) | Supports standalone teachers + school teachers without admin dependency |
| Structure shape | Two-level: categories → line items | Mirrors CAPS formal/informal split, gives natural grouping |
| Templates | Teacher-created reusable templates (no CAPS presets) | CAPS varies by school; standalone teachers need personal templates |
| Calculation mode | Live, automatic, as marks come in | Teachers need running feedback, not just end-of-term totals |
| Lock & submit | Optional — school teachers lock for reports, standalone teachers just export | Both personas served without forcing one workflow |

---

## Data Model

### New Model: `AssessmentStructure`

```
AssessmentStructure {
  _id
  teacherId            — ObjectId, ref: User
  schoolId             — ObjectId, nullable (null for standalone)
  subjectId            — ObjectId, nullable (null for standalone)
  subjectName          — String, always set (display name)
  classId              — ObjectId, nullable (null for standalone)
  gradeId              — ObjectId, nullable
  term                 — Number (1-4)
  academicYear         — Number (e.g. 2026)
  name                 — String (e.g. "Maths Grade 8 Term 1")
  studentIds           — [ObjectId], used when classId is null (standalone teachers)

  categories: [
    {
      _id              — ObjectId
      name             — String (e.g. "Tests")
      type             — String enum: test | exam | assignment | practical | project | other
      weight           — Number (% of term mark)
      lineItems: [
        {
          _id          — ObjectId
          name         — String (e.g. "Test 1")
          totalMarks   — Number
          weight       — Number, optional (% within category; if unset, equal distribution)
          date         — Date, optional (scheduled date)
          assessmentId — ObjectId, ref: Assessment (auto-created or linked)
          status       — String enum: pending | capturing | closed
        }
      ]
    }
  ]

  status               — String enum: draft | active | locked
  lockedAt             — Date
  unlockedBy           — ObjectId, nullable
  unlockReason         — String, nullable
  unlockedAt           — Date, nullable
  isTemplate           — Boolean (saved as reusable template)
  templateName         — String, nullable
  isDeleted            — Boolean
  createdAt            — Date
  updatedAt            — Date
}
```

### Modifications to Existing Models

**Assessment** — add optional field:
- `structureId: ObjectId, ref: AssessmentStructure` — links back to the structure that created it

**Mark** — add field:
- `isAbsent: Boolean, default: false` — when true, `mark` is null, student was absent

### Key Rules

- Category weights must total exactly 100%
- Line item weights within a category must total 100% (if custom weights are set)
- If line item weights are not set, equal distribution: `100% / lineItemCount`
- When a line item is added, a corresponding Assessment record is auto-created (or an existing one is linked)
- `totalMarks` on a line item becomes read-only once marks exist for its linked assessment
- `status: locked` prevents all edits; requires all line items closed and all students having marks or absent flags
- `isTemplate: true` structures are cloneable but don't hold live data
- Soft-deleting a draft structure does NOT delete linked Assessment records (they may be used elsewhere)
- A structure can only be deleted in `draft` status. Active/locked structures must be unlocked and have all marks cleared first.

---

## API Endpoints

All under `/api/academic/assessment-structures`. Teacher + school_admin + super_admin can access.

### CRUD

| Method | Path | What |
|--------|------|------|
| `POST /` | Create new structure (draft) |
| `GET /` | List my structures (filter: term, year, classId, subjectId) |
| `GET /:id` | Get structure with full category/line item details |
| `PUT /:id` | Update structure (draft or active only, not locked) |
| `DELETE /:id` | Soft delete (draft only) |

### Category & Line Item Management

| Method | Path | What |
|--------|------|------|
| `POST /:id/categories` | Add category |
| `PUT /:id/categories/:catId` | Edit category name/type/weight |
| `DELETE /:id/categories/:catId` | Remove category (only if no marks captured) |
| `POST /:id/categories/:catId/line-items` | Add line item + auto-create Assessment (or link existing) |
| `PUT /:id/categories/:catId/line-items/:itemId` | Edit line item (totalMarks read-only if marks exist) |
| `DELETE /:id/categories/:catId/line-items/:itemId` | Remove (only if no marks captured) |
| `POST /:id/categories/:catId/line-items/:itemId/link` | Link existing Assessment to line item |

### Student Management (Standalone Teachers)

| Method | Path | What |
|--------|------|------|
| `POST /:id/students` | Add students to structure |
| `DELETE /:id/students/:studentId` | Remove student from structure |

### Status Transitions

| Method | Path | What |
|--------|------|------|
| `POST /:id/activate` | Validate and move draft → active |
| `POST /:id/lock` | Validate all marks present, move active → locked |
| `POST /:id/unlock` | Requires `{ reason }` body, move locked → active |

### Term Mark Calculation

| Method | Path | What |
|--------|------|------|
| `GET /:id/term-marks` | Live term marks for all students |
| `GET /:id/term-marks/:studentId` | Detailed breakdown for one student |

### Templates & Cloning

| Method | Path | What |
|--------|------|------|
| `POST /:id/save-as-template` | Clone structure as reusable template |
| `GET /templates` | List my saved templates |
| `POST /from-template/:templateId` | Create new structure from template |
| `DELETE /templates/:id` | Delete saved template |
| `POST /:id/clone` | Clone structure to new term/class/year (one-step) |

### Export

| Method | Path | What |
|--------|------|------|
| `GET /:id/export` | Download term marks as PDF/CSV (all teachers) |

### Validation Rules

- **Activate:** Category weights sum to 100%. Each category has >= 1 line item. Each line item has totalMarks set. Line item weights within each category sum to 100% (if custom weights set).
- **Lock:** Every line item status is `closed`. Every student has a mark or `isAbsent: true` for every line item.
- **Delete category/line item:** No marks captured against any assessment in the category/line item.
- **Edit totalMarks:** Blocked if marks exist for the linked assessment.

---

## Term Mark Calculation Engine

### Line Item Status Flow

```
pending → capturing → closed
```

- `pending`: Not yet graded. Excluded from all calculations.
- `capturing`: Marks being entered. Included in live calculation.
- `closed`: All marks finalized. Included in live calculation.

### Calculation Steps

**Step 1: Within each category, calculate the category score per student**

Only `capturing` and `closed` line items participate. Re-normalize their weights among participating items.

```
Category: "Tests" (weight: 30%)
  - Test 1: 42/50 = 84%  (line item weight: 50%)
  - Test 2: 71/100 = 71% (line item weight: 50%)

  Category score = (84 × 0.5) + (71 × 0.5) = 77.5%
```

If line item weights are not set, equal distribution: each = `100% / participatingCount`.

**Absent students:** If a student is absent for a line item (`isAbsent: true`), that line item is excluded for that student. Remaining line item weights are re-normalized for that student only.

**Step 2: Across categories, calculate the term mark**

```
Tests:       77.5% × 0.30 = 23.25
Assignment:  65.0% × 0.10 =  6.50
Project:     72.0% × 0.20 = 14.40
Exam:        58.0% × 0.40 = 23.20
───────────────────────────────────
Term mark = 67.35% → 67% (Math.round)
Achievement level = 5 (Substantial)
```

**Step 3: Handle partial data (live calculation)**

- **capturedWeight:** Sum of category weights that have at least one participating (capturing/closed) line item, proportional to participation. E.g., Tests (30%) with 1 of 2 items participating = 15%.
- **capturedTotal:** Raw weighted sum from participating assessments.
- **projectedTermMark:** `capturedTotal / (capturedWeight / 100)` — pro-rated projection.
- **completionPercent:** `capturedWeight` as a percentage of 100%.
- **finalTermMark:** Only set when status is `locked` (all marks captured). This is the real term mark.

**Step 4: Achievement levels (CAPS)**

| Level | Description | Range |
|-------|-------------|-------|
| 7 | Outstanding | 80–100% |
| 6 | Meritorious | 70–79% |
| 5 | Substantial | 60–69% |
| 4 | Adequate | 50–59% |
| 3 | Moderate | 40–49% |
| 2 | Elementary | 30–39% |
| 1 | Not Achieved | 0–29% |

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Student has mark of 0 | 0%, included in calculation |
| Student absent (`isAbsent: true`) | Excluded from that line item, weights re-normalized |
| Category has 0 participating line items | Excluded from projected calculation, shows "no data" |
| All marks missing | No calculation, show "no assessments captured" |
| Line item weights don't sum to 100% | Blocked at activate validation |
| Category weights don't sum to 100% | Blocked at activate validation |
| Single line item in category | That item = 100% of category |
| Mark > totalMarks | Rejected at capture: `0 <= mark <= totalMarks` |

### Rounding

Standard rounding (`Math.round()`) to nearest whole number for all displayed percentages and term marks.

### Performance

Backend uses a MongoDB aggregation pipeline to fetch structure + all related marks in a single query. No N+1 queries.

### Response Shape: `GET /:id/term-marks`

```json
{
  "structureId": "...",
  "structureName": "Maths Grade 8 Term 1",
  "term": 1,
  "academicYear": 2026,
  "completionPercent": 40,
  "categories": [
    {
      "name": "Tests",
      "weight": 30,
      "status": "complete",
      "lineItems": [
        { "name": "Test 1", "totalMarks": 50, "marksCaptured": 28, "marksPending": 0 }
      ]
    }
  ],
  "students": [
    {
      "studentId": "...",
      "studentName": "John Doe",
      "capturedWeight": 40,
      "capturedTotal": 29.75,
      "projectedTermMark": 74,
      "finalTermMark": null,
      "achievementLevel": null,
      "categories": [
        {
          "name": "Tests",
          "weight": 30,
          "score": 78,
          "lineItems": [
            { "name": "Test 1", "mark": 42, "total": 50, "percentage": 84 },
            { "name": "Test 2", "mark": 71, "total": 100, "percentage": 71 }
          ]
        },
        {
          "name": "Exam",
          "weight": 40,
          "score": null,
          "lineItems": [
            { "name": "Final Exam", "mark": null, "total": 150, "percentage": null }
          ]
        }
      ]
    }
  ]
}
```

Category status is derived:
- `pending` — all line items are pending
- `in_progress` — at least one line item is capturing/closed, but not all closed
- `complete` — all line items closed and all students have marks or absent flags

---

## Frontend UI

### Pages

```
src/app/(dashboard)/teacher/curriculum/assessment-structure/
  page.tsx                          — list view (thin orchestrator)
  [id]/page.tsx                     — builder/detail view (thin orchestrator)
```

### Components

```
src/components/assessment-structure/
  AssessmentStructureList.tsx        — cards + filters (term, year, subject)
  AssessmentStructureBuilder.tsx     — tabs: Structure | Term Marks | Students (standalone only)
  CategoryCard.tsx                   — single category with line items, edit/delete
  LineItemRow.tsx                    — single line item with status badge, actions
  WeightIndicator.tsx                — live weight total (category-level + overall)
  AddCategoryForm.tsx                — inline category creation (name, type, weight)
  AddLineItemForm.tsx                — inline line item creation + link existing assessment option
  TermMarksTable.tsx                 — marks grid with live calculation columns
  TermMarksStudentCard.tsx           — mobile card view per student (responsive)
  MarkEntryDialog.tsx                — mark entry with absent checkbox, save/close actions
  TemplateSelectDialog.tsx           — pick template → set class/term/year → create
  CloneStructureDialog.tsx           — clone to another term/class/year
  LockValidationDialog.tsx           — shows exactly what's missing before lock
  StudentManager.tsx                 — add/remove students (standalone teachers only)
```

### Hooks

```
src/hooks/
  useAssessmentStructures.ts         — list, create, delete structures + template operations
  useAssessmentStructureDetail.ts    — single structure CRUD, category/line item management, status transitions
  useTermMarks.ts                    — fetch live term mark calculation, per-student breakdowns
```

### Navigation

Add to `TEACHER_NAV` Curriculum dropdown:

```
Curriculum
  ├─ ... existing items ...
  ├─ Assessment Structure    ← NEW (between Assessments and Generated Papers)
  ├─ ...
```

### List View

Cards per structure showing: name, term/year, subject, status badge (draft/active/locked).
- Filters: term, year, subject
- Actions: "Create New", "Use Template"
- Click card → navigates to builder

**Empty state:** "No assessment structures yet. Create one to define your term's assessment plan."

### Builder View — Structure Tab

Categories displayed as collapsible cards. Each card shows:
- Category name, type, weight percentage
- Edit/delete actions (respecting status-based restrictions)
- Line items listed within, each showing: name, totalMarks, date, status badge, actions
- "Add assessment" button per category
- "Add Category" button at bottom
- Weight total indicator (green ✓ at 100%, red ✗ otherwise)
- Within-category weight indicator when custom weights are set

Footer actions based on status:
- Draft: [Save as Template] [Activate]
- Active: [Save as Template] [Lock] [Clone to...]
- Locked: [Unlock] [Export CSV] [Export PDF]

### Builder View — Term Marks Tab

Scrollable DataTable:
- Columns: Student name | per-line-item percentage | per-category score | projected term mark
- Rows: one per student, class average row at bottom
- Cell indicators: `—` = pending, `ABS` = absent, percentage for captured
- Projected term mark greyed out with "projected" label until locked
- "Enter Marks" button → opens MarkEntryDialog for next capturing assessment
- Click any empty cell in a capturing column → opens MarkEntryDialog for that assessment

**Mobile:** Collapses to per-student cards with expandable category breakdowns.

**Empty state:** "No marks captured yet. Activate the structure and start entering marks."

### Builder View — Students Tab (Standalone Only)

Visible only when `classId` is null.
- List of students associated with the structure
- "Add Student" from their existing student roster
- Remove student action

### Mark Entry Dialog

```
Enter Marks: Test 1 (50 marks)

| Student        | Mark  | Absent |
|----------------|-------|--------|
| John Doe       | [42 ] | ☐      |
| Jane Smith     | [46 ] | ☑      |

Validation: 0 – 50
Absent checkbox → disables mark input, creates Mark with isAbsent: true

[Cancel]  [Save]  [Save & Close Item]
```

"Save & Close Item" saves marks AND sets line item status to `closed`.

### Confirmation Dialogs

- **Activate:** "This will allow mark entry. Structure can still be edited. Continue?"
- **Lock:** "This will freeze all marks for report card submission. Continue?"
- **Unlock:** Requires reason text field. "Unlocking allows mark changes. Provide a reason."
- **Delete:** "This will permanently remove this structure. This cannot be undone."

### Lock Validation Dialog

When lock fails, shows exactly what's incomplete:

```
Cannot lock — missing marks:
• Test 2: 3 students (John Doe, Jane Smith, Bob Wilson)
• Final Exam: 28 students (all)
```

### Status-Based Edit Restrictions

| Element | Draft | Active | Locked |
|---------|-------|--------|--------|
| Add/remove categories | ✓ | ✓ (if no marks) | ✗ |
| Add/remove line items | ✓ | ✓ (if no marks) | ✗ |
| Edit weights | ✓ | ✓ | ✗ |
| Edit totalMarks | ✓ | ✓ (if no marks) | ✗ |
| Enter marks | ✗ | ✓ | ✗ |
| Change line item status | ✗ | ✓ | ✗ |
| Reopen closed line item | ✗ | ✓ | ✗ |

### Loading States

All data-fetching views use `<LoadingSpinner />` while loading.
