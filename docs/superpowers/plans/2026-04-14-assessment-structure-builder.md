# Assessment Structure Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guided assessment structure builder with weighted categories, live term mark calculations, templates, and lock/submit workflow for both school-based and standalone teachers.

**Architecture:** Extend the existing Academic module with a new `AssessmentStructure` model (embedded categories → line items). Backend: new service + controller + routes under `/api/assessment-structures`. Frontend: new hooks, pages, and components under the teacher curriculum section. The calculation engine lives in a dedicated service file. Marks flow through the existing `Assessment` + `Mark` models.

**Tech Stack:** MongoDB/Mongoose (backend), Express + Zod validation, React 19 + Next.js (frontend), Zustand (auth store), Sonner (toasts), TanStack Table (term marks grid), Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-04-14-assessment-structure-builder-design.md`

---

## File Map

### Backend — New Files
```
src/modules/AssessmentStructure/
  model.ts                              — AssessmentStructure schema + IAssessmentStructure interface
  validation.ts                         — Zod schemas for all endpoints
  routes.ts                             — Express routes
  controller.ts                         — Barrel re-exporting controllers
  controllers/
    structure.controller.ts             — CRUD + status transitions
    category.controller.ts              — Category + line item management
    template.controller.ts              — Template + clone operations
    term-marks.controller.ts            — Term mark calculation + export
    student.controller.ts               — Standalone student management
  services/
    structure.service.ts                — CRUD + status transitions
    category.service.ts                 — Category + line item management
    calculation.service.ts              — Term mark calculation engine
    template.service.ts                 — Template + clone logic
```

### Backend — Modified Files
```
src/modules/Academic/model.ts           — Add structureId to Assessment, isAbsent to Mark
src/app.ts                              — Mount assessment-structure routes
```

### Frontend — New Files
```
src/types/assessment-structure.ts       — All TypeScript interfaces
src/hooks/useAssessmentStructures.ts    — List, create, delete + templates
src/hooks/useAssessmentStructureDetail.ts — Single structure CRUD, categories, line items, status
src/hooks/useTermMarks.ts               — Fetch live term mark calculations

src/app/(dashboard)/teacher/curriculum/assessment-structure/
  page.tsx                              — List page (thin orchestrator)
  [id]/page.tsx                         — Builder page (thin orchestrator)

src/components/assessment-structure/
  AssessmentStructureList.tsx            — Cards + filters
  AssessmentStructureBuilder.tsx         — Tabs: Structure | Term Marks | Students
  CategoryCard.tsx                       — Single category with line items
  LineItemRow.tsx                        — Single line item row
  WeightIndicator.tsx                    — Live weight total
  AddCategoryForm.tsx                    — Inline category creation
  AddLineItemForm.tsx                    — Inline line item creation
  TermMarksTable.tsx                     — Marks grid with calculations
  TermMarksStudentCard.tsx               — Mobile card per student
  MarkEntryDialog.tsx                    — Mark entry with absent checkbox
  CreateStructureDialog.tsx              — Initial creation form
  TemplateSelectDialog.tsx               — Pick template + configure
  CloneStructureDialog.tsx               — Clone to new term/class
  LockValidationDialog.tsx               — Missing marks feedback
  StudentManager.tsx                     — Add/remove students (standalone)
```

### Frontend — Modified Files
```
src/lib/constants.ts                    — Add nav item + route constant
src/types/academic.ts                   — Add structureId to Assessment
```

---

## Task 1: Backend — AssessmentStructure Model + Schema Modifications

**Files:**
- Create: `src/modules/AssessmentStructure/model.ts` (in campusly-backend)
- Modify: `src/modules/Academic/model.ts:259,299,327,356` (in campusly-backend)

- [ ] **Step 1: Create the AssessmentStructure model file**

```typescript
// src/modules/AssessmentStructure/model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

/* ── Sub-document interfaces ─────────────────────────────── */

export interface ILineItem {
  _id: Types.ObjectId;
  name: string;
  totalMarks: number;
  weight?: number;
  date?: Date;
  assessmentId?: Types.ObjectId;
  status: 'pending' | 'capturing' | 'closed';
}

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  type: 'test' | 'exam' | 'assignment' | 'practical' | 'project' | 'other';
  weight: number;
  lineItems: ILineItem[];
}

/* ── Main document interface ─────────────────────────────── */

export interface IAssessmentStructure extends Document {
  teacherId: Types.ObjectId;
  schoolId: Types.ObjectId | null;
  subjectId: Types.ObjectId | null;
  subjectName: string;
  classId: Types.ObjectId | null;
  gradeId: Types.ObjectId | null;
  term: number;
  academicYear: number;
  name: string;
  studentIds: Types.ObjectId[];
  categories: ICategory[];
  status: 'draft' | 'active' | 'locked';
  lockedAt: Date | null;
  unlockedBy: Types.ObjectId | null;
  unlockReason: string | null;
  unlockedAt: Date | null;
  isTemplate: boolean;
  templateName: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Sub-schemas ─────────────────────────────────────────── */

const lineItemSchema = new Schema<ILineItem>(
  {
    name: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true, min: 1 },
    weight: { type: Number, default: null, min: 0, max: 100 },
    date: { type: Date, default: null },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', default: null },
    status: {
      type: String,
      enum: ['pending', 'capturing', 'closed'],
      default: 'pending',
    },
  },
  { _id: true },
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['test', 'exam', 'assignment', 'practical', 'project', 'other'],
      required: true,
    },
    weight: { type: Number, required: true, min: 0, max: 100 },
    lineItems: { type: [lineItemSchema], default: [] },
  },
  { _id: true },
);

/* ── Main schema ─────────────────────────────────────────── */

const assessmentStructureSchema = new Schema<IAssessmentStructure>(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', default: null },
    subjectName: { type: String, required: true, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', default: null },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', default: null },
    term: { type: Number, required: true, min: 1, max: 4 },
    academicYear: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    categories: { type: [categorySchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'active', 'locked'],
      default: 'draft',
    },
    lockedAt: { type: Date, default: null },
    unlockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unlockReason: { type: String, default: null },
    unlockedAt: { type: Date, default: null },
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String, default: null, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/* ── Indexes ─────────────────────────────────────────────── */

// Fast lookups: teacher's structures for a school
assessmentStructureSchema.index({ teacherId: 1, schoolId: 1, isDeleted: 1 });

// Uniqueness: one live structure per subject/class/term
assessmentStructureSchema.index(
  { teacherId: 1, subjectId: 1, classId: 1, term: 1, academicYear: 1 },
  {
    unique: true,
    partialFilterExpression: { isTemplate: false, isDeleted: false },
  },
);

// Template listing
assessmentStructureSchema.index({ teacherId: 1, isTemplate: 1, isDeleted: 1 });

export const AssessmentStructure = mongoose.model<IAssessmentStructure>(
  'AssessmentStructure',
  assessmentStructureSchema,
);
```

- [ ] **Step 2: Add `structureId` to the Assessment interface and schema**

In `src/modules/Academic/model.ts`, find the `IAssessment` interface (around line 259) and add after `paperId`:

```typescript
structureId?: Types.ObjectId;
```

Then find the Assessment schema definition (around line 299) and add after the `paperId` field:

```typescript
structureId: {
  type: Schema.Types.ObjectId,
  ref: 'AssessmentStructure',
  default: null,
},
```

- [ ] **Step 3: Add `isAbsent` to the Mark interface and schema**

In the same file, find the `IMark` interface (around line 327) and add after `comment`:

```typescript
isAbsent: boolean;
```

Then find the Mark schema (around line 356) and add after the `comment` field:

```typescript
isAbsent: {
  type: Boolean,
  default: false,
},
```

- [ ] **Step 4: Verify the backend compiles**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors related to the new model or modified fields.

- [ ] **Step 5: Commit**

```bash
git add src/modules/AssessmentStructure/model.ts src/modules/Academic/model.ts
git commit -m "feat(assessment-structure): add AssessmentStructure model and extend Assessment/Mark schemas"
```

---

## Task 2: Backend — Zod Validation Schemas

**Files:**
- Create: `src/modules/AssessmentStructure/validation.ts` (in campusly-backend)

- [ ] **Step 1: Create validation schemas for all endpoints**

```typescript
// src/modules/AssessmentStructure/validation.ts
import { z } from 'zod/v4';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

/* ── CRUD ─────────────────────────────────────────────────── */

export const createStructureSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  subjectId: objectId.nullable().optional(),
  subjectName: z.string().min(1, 'Subject name is required').trim(),
  classId: objectId.nullable().optional(),
  gradeId: objectId.nullable().optional(),
  term: z.number().int().min(1).max(4),
  academicYear: z.number().int().min(2020).max(2100),
}).strict();

export const updateStructureSchema = z.object({
  name: z.string().min(1).trim().optional(),
  subjectName: z.string().min(1).trim().optional(),
  gradeId: objectId.nullable().optional(),
}).strict();

/* ── Categories ───────────────────────────────────────────── */

export const addCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  type: z.enum(['test', 'exam', 'assignment', 'practical', 'project', 'other']),
  weight: z.number().min(0).max(100),
}).strict();

export const updateCategorySchema = z.object({
  name: z.string().min(1).trim().optional(),
  type: z.enum(['test', 'exam', 'assignment', 'practical', 'project', 'other']).optional(),
  weight: z.number().min(0).max(100).optional(),
}).strict();

/* ── Line Items ───────────────────────────────────────────── */

export const addLineItemSchema = z.object({
  name: z.string().min(1, 'Line item name is required').trim(),
  totalMarks: z.number().int().min(1),
  weight: z.number().min(0).max(100).nullable().optional(),
  date: z.string().datetime().nullable().optional(),
  existingAssessmentId: objectId.optional(), // link existing instead of auto-creating
}).strict();

export const updateLineItemSchema = z.object({
  name: z.string().min(1).trim().optional(),
  totalMarks: z.number().int().min(1).optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  date: z.string().datetime().nullable().optional(),
  status: z.enum(['pending', 'capturing', 'closed']).optional(),
}).strict();

export const linkAssessmentSchema = z.object({
  assessmentId: objectId,
}).strict();

/* ── Students (standalone) ────────────────────────────────── */

export const addStudentsSchema = z.object({
  studentIds: z.array(objectId).min(1, 'At least one student is required'),
}).strict();

/* ── Status transitions ───────────────────────────────────── */

export const unlockSchema = z.object({
  reason: z.string().min(1, 'Unlock reason is required').trim(),
}).strict();

/* ── Templates & Cloning ──────────────────────────────────── */

export const saveAsTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required').trim(),
}).strict();

export const fromTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  subjectId: objectId.nullable().optional(),
  subjectName: z.string().min(1, 'Subject name is required').trim(),
  classId: objectId.nullable().optional(),
  gradeId: objectId.nullable().optional(),
  term: z.number().int().min(1).max(4),
  academicYear: z.number().int().min(2020).max(2100),
}).strict();

export const cloneStructureSchema = z.object({
  term: z.number().int().min(1).max(4),
  academicYear: z.number().int().min(2020).max(2100),
  classId: objectId.nullable().optional(),
  gradeId: objectId.nullable().optional(),
  name: z.string().min(1).trim().optional(),
}).strict();

/* ── Export ────────────────────────────────────────────────── */

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']).default('csv'),
}).strict();
```

- [ ] **Step 2: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AssessmentStructure/validation.ts
git commit -m "feat(assessment-structure): add Zod validation schemas for all endpoints"
```

---

## Task 3: Backend — Structure CRUD Service

**Files:**
- Create: `src/modules/AssessmentStructure/services/structure.service.ts` (in campusly-backend)

- [ ] **Step 1: Create the structure CRUD service**

```typescript
// src/modules/AssessmentStructure/services/structure.service.ts
import mongoose from 'mongoose';
import { AssessmentStructure } from '../model.js';
import type { IAssessmentStructure } from '../model.js';
import { Mark } from '../../Academic/model.js';
import { NotFoundError, BadRequestError, ConflictError } from '../../../common/errors.js';

interface ListQuery {
  term?: number;
  academicYear?: number;
  classId?: string;
  subjectId?: string;
}

interface TenantFilter {
  teacherId: string;
  schoolId: string | null;
}

function buildTenantFilter(tenant: TenantFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = { teacherId: tenant.teacherId, isDeleted: false };
  if (tenant.schoolId) {
    filter.schoolId = new mongoose.Types.ObjectId(tenant.schoolId);
  } else {
    filter.schoolId = null;
  }
  return filter;
}

export class StructureService {
  static async create(
    tenant: TenantFilter,
    data: {
      name: string;
      subjectId?: string | null;
      subjectName: string;
      classId?: string | null;
      gradeId?: string | null;
      term: number;
      academicYear: number;
    },
  ): Promise<IAssessmentStructure> {
    try {
      const structure = new AssessmentStructure({
        teacherId: tenant.teacherId,
        schoolId: tenant.schoolId ?? null,
        subjectId: data.subjectId ?? null,
        subjectName: data.subjectName,
        classId: data.classId ?? null,
        gradeId: data.gradeId ?? null,
        term: data.term,
        academicYear: data.academicYear,
        name: data.name,
        status: 'draft',
        isTemplate: false,
      });
      return await structure.save();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
        throw new ConflictError(
          'A structure already exists for this subject, class, term, and year',
        );
      }
      throw err;
    }
  }

  static async list(
    tenant: TenantFilter,
    query: ListQuery,
  ): Promise<IAssessmentStructure[]> {
    const filter: Record<string, unknown> = {
      ...buildTenantFilter(tenant),
      isTemplate: false,
    };
    if (query.term) filter.term = query.term;
    if (query.academicYear) filter.academicYear = query.academicYear;
    if (query.classId) filter.classId = new mongoose.Types.ObjectId(query.classId);
    if (query.subjectId) filter.subjectId = new mongoose.Types.ObjectId(query.subjectId);

    return AssessmentStructure.find(filter).sort('-updatedAt').lean().exec();
  }

  static async getById(
    id: string,
    tenant: TenantFilter,
  ): Promise<IAssessmentStructure> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    }).lean();
    if (!structure) throw new NotFoundError('Assessment structure not found');
    return structure;
  }

  static async update(
    id: string,
    tenant: TenantFilter,
    data: { name?: string; subjectName?: string; gradeId?: string | null },
  ): Promise<IAssessmentStructure> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    });
    if (!structure) throw new NotFoundError('Assessment structure not found');
    if (structure.status === 'locked') {
      throw new BadRequestError('Cannot edit a locked structure');
    }

    if (data.name !== undefined) structure.name = data.name;
    if (data.subjectName !== undefined) structure.subjectName = data.subjectName;
    if (data.gradeId !== undefined) {
      structure.gradeId = data.gradeId
        ? new mongoose.Types.ObjectId(data.gradeId)
        : null;
    }

    return structure.save();
  }

  static async delete(id: string, tenant: TenantFilter): Promise<void> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    });
    if (!structure) throw new NotFoundError('Assessment structure not found');
    if (structure.status !== 'draft') {
      throw new BadRequestError('Only draft structures can be deleted');
    }
    structure.isDeleted = true;
    await structure.save();
  }

  /* ── Status transitions ─────────────────────────────────── */

  static async activate(id: string, tenant: TenantFilter): Promise<IAssessmentStructure> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    });
    if (!structure) throw new NotFoundError('Assessment structure not found');
    if (structure.status !== 'draft') {
      throw new BadRequestError('Only draft structures can be activated');
    }

    // Validate weights sum to 100
    const totalWeight = structure.categories.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestError(`Category weights must total 100% (currently ${totalWeight}%)`);
    }

    // Each category must have at least 1 line item
    for (const cat of structure.categories) {
      if (cat.lineItems.length === 0) {
        throw new BadRequestError(`Category "${cat.name}" must have at least one line item`);
      }
      // Each line item must have totalMarks
      for (const item of cat.lineItems) {
        if (!item.totalMarks || item.totalMarks < 1) {
          throw new BadRequestError(
            `Line item "${item.name}" in "${cat.name}" must have totalMarks set`,
          );
        }
      }
      // If custom weights set, they must sum to 100
      const customWeights = cat.lineItems.filter((li) => li.weight != null);
      if (customWeights.length > 0 && customWeights.length === cat.lineItems.length) {
        const itemWeightTotal = customWeights.reduce((s, li) => s + (li.weight ?? 0), 0);
        if (Math.abs(itemWeightTotal - 100) > 0.01) {
          throw new BadRequestError(
            `Line item weights in "${cat.name}" must total 100% (currently ${itemWeightTotal}%)`,
          );
        }
      }
    }

    structure.status = 'active';
    return structure.save();
  }

  static async lock(id: string, tenant: TenantFilter): Promise<{
    structure?: IAssessmentStructure;
    errors?: Array<{ lineItem: string; missingStudents: string[]; missingCount: number }>;
  }> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    });
    if (!structure) throw new NotFoundError('Assessment structure not found');
    if (structure.status !== 'active') {
      throw new BadRequestError('Only active structures can be locked');
    }

    // Get student list
    const studentIds = await this.getStudentIds(structure);
    if (studentIds.length === 0) {
      throw new BadRequestError('No students associated with this structure');
    }

    // Check every line item is closed
    const errors: Array<{ lineItem: string; missingStudents: string[]; missingCount: number }> = [];
    for (const cat of structure.categories) {
      for (const item of cat.lineItems) {
        if (item.status !== 'closed') {
          throw new BadRequestError(
            `Line item "${item.name}" in "${cat.name}" must be closed before locking`,
          );
        }
        if (!item.assessmentId) continue;

        // Check all students have marks
        const marks = await Mark.find({
          assessmentId: item.assessmentId,
          studentId: { $in: studentIds },
          isDeleted: false,
        }).lean();

        const markedStudentIds = new Set(marks.map((m) => m.studentId.toString()));
        const missing = studentIds.filter((sid) => !markedStudentIds.has(sid.toString()));

        if (missing.length > 0) {
          errors.push({
            lineItem: `${cat.name} → ${item.name}`,
            missingStudents: missing.map((s) => s.toString()),
            missingCount: missing.length,
          });
        }
      }
    }

    if (errors.length > 0) {
      return { errors };
    }

    structure.status = 'locked';
    structure.lockedAt = new Date();
    const saved = await structure.save();
    return { structure: saved };
  }

  static async unlock(
    id: string,
    tenant: TenantFilter,
    userId: string,
    reason: string,
  ): Promise<IAssessmentStructure> {
    const structure = await AssessmentStructure.findOne({
      _id: id,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    });
    if (!structure) throw new NotFoundError('Assessment structure not found');
    if (structure.status !== 'locked') {
      throw new BadRequestError('Only locked structures can be unlocked');
    }

    structure.status = 'active';
    structure.unlockedBy = new mongoose.Types.ObjectId(userId);
    structure.unlockReason = reason;
    structure.unlockedAt = new Date();
    return structure.save();
  }

  /* ── Student resolution ─────────────────────────────────── */

  static async getStudentIds(structure: IAssessmentStructure): Promise<Types.ObjectId[]> {
    if (structure.studentIds && structure.studentIds.length > 0) {
      return structure.studentIds;
    }
    if (structure.classId) {
      // Import Class model to find enrolled students
      const { Class } = await import('../../Academic/model.js');
      const cls = await Class.findOne({
        _id: structure.classId,
        isDeleted: false,
      }).lean();
      return cls?.students ?? [];
    }
    return [];
  }
}

// Re-export Types for convenience
import type { Types } from 'mongoose';
```

- [ ] **Step 2: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AssessmentStructure/services/structure.service.ts
git commit -m "feat(assessment-structure): add structure CRUD service with status transitions"
```

---

## Task 4: Backend — Category & Line Item Service

**Files:**
- Create: `src/modules/AssessmentStructure/services/category.service.ts` (in campusly-backend)

- [ ] **Step 1: Create the category and line item management service**

```typescript
// src/modules/AssessmentStructure/services/category.service.ts
import mongoose from 'mongoose';
import { AssessmentStructure } from '../model.js';
import type { IAssessmentStructure, ICategory, ILineItem } from '../model.js';
import { Assessment, Mark } from '../../Academic/model.js';
import { NotFoundError, BadRequestError } from '../../../common/errors.js';

interface TenantFilter {
  teacherId: string;
  schoolId: string | null;
}

async function findStructure(
  id: string,
  tenant: TenantFilter,
): Promise<IAssessmentStructure & mongoose.Document> {
  const filter: Record<string, unknown> = {
    _id: id,
    teacherId: tenant.teacherId,
    isDeleted: false,
    isTemplate: false,
  };
  if (tenant.schoolId) {
    filter.schoolId = new mongoose.Types.ObjectId(tenant.schoolId);
  } else {
    filter.schoolId = null;
  }

  const structure = await AssessmentStructure.findOne(filter);
  if (!structure) throw new NotFoundError('Assessment structure not found');
  if (structure.status === 'locked') {
    throw new BadRequestError('Cannot modify a locked structure');
  }
  return structure;
}

function findCategory(structure: IAssessmentStructure, catId: string): ICategory {
  const cat = structure.categories.find((c) => c._id.toString() === catId);
  if (!cat) throw new NotFoundError('Category not found');
  return cat;
}

function findLineItem(category: ICategory, itemId: string): ILineItem {
  const item = category.lineItems.find((li) => li._id.toString() === itemId);
  if (!item) throw new NotFoundError('Line item not found');
  return item;
}

async function hasMarks(assessmentId: mongoose.Types.ObjectId): Promise<boolean> {
  const count = await Mark.countDocuments({
    assessmentId,
    isDeleted: false,
  });
  return count > 0;
}

export class CategoryService {
  /* ── Category CRUD ──────────────────────────────────────── */

  static async addCategory(
    structureId: string,
    tenant: TenantFilter,
    data: { name: string; type: string; weight: number },
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    structure.categories.push({
      _id: new mongoose.Types.ObjectId(),
      name: data.name,
      type: data.type as ICategory['type'],
      weight: data.weight,
      lineItems: [],
    });
    return structure.save();
  }

  static async updateCategory(
    structureId: string,
    catId: string,
    tenant: TenantFilter,
    data: { name?: string; type?: string; weight?: number },
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);

    if (data.name !== undefined) cat.name = data.name;
    if (data.type !== undefined) cat.type = data.type as ICategory['type'];
    if (data.weight !== undefined) cat.weight = data.weight;

    return structure.save();
  }

  static async deleteCategory(
    structureId: string,
    catId: string,
    tenant: TenantFilter,
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);

    // Check no marks exist for any line item in this category
    for (const item of cat.lineItems) {
      if (item.assessmentId && (await hasMarks(item.assessmentId))) {
        throw new BadRequestError(
          `Cannot delete category "${cat.name}" — marks exist for "${item.name}"`,
        );
      }
    }

    structure.categories = structure.categories.filter(
      (c) => c._id.toString() !== catId,
    );
    return structure.save();
  }

  /* ── Line Item CRUD ─────────────────────────────────────── */

  static async addLineItem(
    structureId: string,
    catId: string,
    tenant: TenantFilter,
    data: {
      name: string;
      totalMarks: number;
      weight?: number | null;
      date?: string | null;
      existingAssessmentId?: string;
    },
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);

    let assessmentId: mongoose.Types.ObjectId | undefined;

    if (data.existingAssessmentId) {
      // Link an existing assessment
      const existing = await Assessment.findOne({
        _id: data.existingAssessmentId,
        isDeleted: false,
      });
      if (!existing) throw new NotFoundError('Assessment not found');
      assessmentId = existing._id as mongoose.Types.ObjectId;

      // Set structureId back-link on the assessment
      existing.structureId = structure._id as mongoose.Types.ObjectId;
      await existing.save();
    } else {
      // Auto-create a new Assessment record
      const assessment = new Assessment({
        name: data.name,
        subjectId: structure.subjectId,
        classId: structure.classId,
        schoolId: structure.schoolId,
        type: cat.type === 'other' ? 'test' : cat.type,
        totalMarks: data.totalMarks,
        weight: data.weight ?? 0,
        term: structure.term,
        academicYear: structure.academicYear,
        date: data.date ?? undefined,
        structureId: structure._id,
      });
      const saved = await assessment.save();
      assessmentId = saved._id as mongoose.Types.ObjectId;
    }

    cat.lineItems.push({
      _id: new mongoose.Types.ObjectId(),
      name: data.name,
      totalMarks: data.totalMarks,
      weight: data.weight ?? undefined,
      date: data.date ? new Date(data.date) : undefined,
      assessmentId,
      status: 'pending',
    } as ILineItem);

    return structure.save();
  }

  static async updateLineItem(
    structureId: string,
    catId: string,
    itemId: string,
    tenant: TenantFilter,
    data: {
      name?: string;
      totalMarks?: number;
      weight?: number | null;
      date?: string | null;
      status?: 'pending' | 'capturing' | 'closed';
    },
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);
    const item = findLineItem(cat, itemId);

    // Block totalMarks change if marks exist
    if (data.totalMarks !== undefined && item.assessmentId) {
      if (await hasMarks(item.assessmentId)) {
        throw new BadRequestError(
          `Cannot change totalMarks for "${item.name}" — marks already captured. Clear marks first.`,
        );
      }
    }

    // Status changes only allowed when structure is active
    if (data.status !== undefined && structure.status !== 'active') {
      throw new BadRequestError('Line item status can only be changed on active structures');
    }

    if (data.name !== undefined) item.name = data.name;
    if (data.totalMarks !== undefined) item.totalMarks = data.totalMarks;
    if (data.weight !== undefined) item.weight = data.weight ?? undefined;
    if (data.date !== undefined) item.date = data.date ? new Date(data.date) : undefined;
    if (data.status !== undefined) item.status = data.status;

    return structure.save();
  }

  static async deleteLineItem(
    structureId: string,
    catId: string,
    itemId: string,
    tenant: TenantFilter,
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);
    const item = findLineItem(cat, itemId);

    if (item.assessmentId && (await hasMarks(item.assessmentId))) {
      throw new BadRequestError(
        `Cannot delete "${item.name}" — marks already captured. Clear marks first.`,
      );
    }

    cat.lineItems = cat.lineItems.filter((li) => li._id.toString() !== itemId);
    return structure.save();
  }

  static async linkAssessment(
    structureId: string,
    catId: string,
    itemId: string,
    tenant: TenantFilter,
    assessmentId: string,
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    const cat = findCategory(structure, catId);
    const item = findLineItem(cat, itemId);

    const assessment = await Assessment.findOne({
      _id: assessmentId,
      isDeleted: false,
    });
    if (!assessment) throw new NotFoundError('Assessment not found');

    item.assessmentId = assessment._id as mongoose.Types.ObjectId;
    assessment.structureId = structure._id as mongoose.Types.ObjectId;
    await assessment.save();

    return structure.save();
  }

  /* ── Student management (standalone) ────────────────────── */

  static async addStudents(
    structureId: string,
    tenant: TenantFilter,
    studentIds: string[],
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    if (structure.classId) {
      throw new BadRequestError(
        'Cannot manually add students to a class-based structure',
      );
    }

    const newIds = studentIds.map((id) => new mongoose.Types.ObjectId(id));
    const existingSet = new Set(structure.studentIds.map((s) => s.toString()));
    for (const nid of newIds) {
      if (!existingSet.has(nid.toString())) {
        structure.studentIds.push(nid);
      }
    }
    return structure.save();
  }

  static async removeStudent(
    structureId: string,
    studentId: string,
    tenant: TenantFilter,
  ): Promise<IAssessmentStructure> {
    const structure = await findStructure(structureId, tenant);
    if (structure.classId) {
      throw new BadRequestError(
        'Cannot manually remove students from a class-based structure',
      );
    }

    structure.studentIds = structure.studentIds.filter(
      (s) => s.toString() !== studentId,
    );
    return structure.save();
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AssessmentStructure/services/category.service.ts
git commit -m "feat(assessment-structure): add category/line-item management and student service"
```

---

## Task 5: Backend — Term Mark Calculation Engine

**Files:**
- Create: `src/modules/AssessmentStructure/services/calculation.service.ts` (in campusly-backend)

- [ ] **Step 1: Create the calculation service**

```typescript
// src/modules/AssessmentStructure/services/calculation.service.ts
import mongoose from 'mongoose';
import { AssessmentStructure } from '../model.js';
import type { IAssessmentStructure, ICategory, ILineItem } from '../model.js';
import { Mark } from '../../Academic/model.js';
import { NotFoundError } from '../../../common/errors.js';
import { StructureService } from './structure.service.js';

/* ── CAPS Achievement Levels ──────────────────────────────── */

function getAchievementLevel(pct: number): { level: number; description: string } {
  if (pct >= 80) return { level: 7, description: 'Outstanding' };
  if (pct >= 70) return { level: 6, description: 'Meritorious' };
  if (pct >= 60) return { level: 5, description: 'Substantial' };
  if (pct >= 50) return { level: 4, description: 'Adequate' };
  if (pct >= 40) return { level: 3, description: 'Moderate' };
  if (pct >= 30) return { level: 2, description: 'Elementary' };
  return { level: 1, description: 'Not Achieved' };
}

/* ── Response types ───────────────────────────────────────── */

interface LineItemMark {
  lineItemId: string;
  name: string;
  mark: number | null;
  total: number;
  percentage: number | null;
  isAbsent: boolean;
}

interface StudentCategoryResult {
  categoryId: string;
  name: string;
  weight: number;
  score: number | null;
  lineItems: LineItemMark[];
}

interface StudentResult {
  studentId: string;
  studentName: string;
  capturedWeight: number;
  capturedTotal: number;
  projectedTermMark: number | null;
  finalTermMark: number | null;
  achievementLevel: { level: number; description: string } | null;
  categories: StudentCategoryResult[];
}

interface CategorySummary {
  categoryId: string;
  name: string;
  weight: number;
  status: 'pending' | 'in_progress' | 'complete';
  lineItems: Array<{
    lineItemId: string;
    name: string;
    totalMarks: number;
    studentsCaptured: number;
    studentsPending: number;
  }>;
}

export interface TermMarksResponse {
  structureId: string;
  structureName: string;
  term: number;
  academicYear: number;
  completionPercent: number;
  categories: CategorySummary[];
  students: StudentResult[];
}

/* ── Main calculation ─────────────────────────────────────── */

export class CalculationService {
  static async getTermMarks(
    structureId: string,
    tenant: { teacherId: string; schoolId: string | null },
  ): Promise<TermMarksResponse> {
    // 1. Load structure
    const structure = await StructureService.getById(structureId, tenant);

    // 2. Get student IDs
    const studentObjectIds = await StructureService.getStudentIds(
      structure as IAssessmentStructure,
    );
    const studentIds = studentObjectIds.map((s) => s.toString());

    // 3. Collect all assessmentIds from non-pending line items
    const assessmentIds: mongoose.Types.ObjectId[] = [];
    for (const cat of structure.categories) {
      for (const item of cat.lineItems) {
        if (item.status !== 'pending' && item.assessmentId) {
          assessmentIds.push(item.assessmentId as unknown as mongoose.Types.ObjectId);
        }
      }
    }

    // 4. Batch-fetch all marks in one query
    const allMarks = assessmentIds.length > 0
      ? await Mark.find({
          assessmentId: { $in: assessmentIds },
          studentId: { $in: studentObjectIds },
          isDeleted: false,
        }).lean()
      : [];

    // Index marks: assessmentId -> studentId -> mark doc
    const markIndex = new Map<string, Map<string, { mark: number | null; isAbsent: boolean }>>();
    for (const m of allMarks) {
      const aId = m.assessmentId.toString();
      if (!markIndex.has(aId)) markIndex.set(aId, new Map());
      markIndex.get(aId)!.set(m.studentId.toString(), {
        mark: m.isAbsent ? null : m.mark,
        isAbsent: m.isAbsent ?? false,
      });
    }

    // 5. Get student names (batch lookup)
    const Student = (await import('../../Academic/model.js')).Student
      ?? (await import('../../Academic/model.js')).Class;
    // Use a simple user lookup if Student model doesn't have names
    const User = (await import('../../Auth/model.js')).User;
    const users = await User.find({ _id: { $in: studentObjectIds } })
      .select('firstName lastName')
      .lean();
    const nameMap = new Map<string, string>();
    for (const u of users) {
      nameMap.set(u._id.toString(), `${u.firstName} ${u.lastName}`);
    }

    // 6. Calculate per-student results
    const students: StudentResult[] = [];
    const totalStudentCount = studentIds.length;

    for (const sid of studentIds) {
      const studentCategories: StudentCategoryResult[] = [];
      let totalCapturedWeight = 0;
      let totalCapturedScore = 0;

      for (const cat of structure.categories) {
        const participatingItems = cat.lineItems.filter(
          (li) => li.status !== 'pending' && li.assessmentId,
        );

        const lineItemResults: LineItemMark[] = [];
        const studentScores: Array<{ weight: number; percentage: number }> = [];

        for (const item of cat.lineItems) {
          const aId = item.assessmentId?.toString();
          const markData = aId ? markIndex.get(aId)?.get(sid) : undefined;

          if (item.status === 'pending' || !item.assessmentId) {
            lineItemResults.push({
              lineItemId: (item._id as mongoose.Types.ObjectId).toString(),
              name: item.name,
              mark: null,
              total: item.totalMarks,
              percentage: null,
              isAbsent: false,
            });
            continue;
          }

          const isAbsent = markData?.isAbsent ?? false;
          const mark = markData?.mark ?? null;
          const percentage = mark != null ? Math.round((mark / item.totalMarks) * 100) : null;

          lineItemResults.push({
            lineItemId: (item._id as mongoose.Types.ObjectId).toString(),
            name: item.name,
            mark,
            total: item.totalMarks,
            percentage,
            isAbsent,
          });

          // Only include in calculation if not absent and has a mark
          if (!isAbsent && percentage != null) {
            const itemWeight = item.weight ?? 100 / participatingItems.length;
            studentScores.push({ weight: itemWeight, percentage });
          }
        }

        // Calculate category score for this student
        let categoryScore: number | null = null;
        if (studentScores.length > 0) {
          // Re-normalize weights among items that have marks (not absent, not pending)
          const totalItemWeight = studentScores.reduce((s, x) => s + x.weight, 0);
          if (totalItemWeight > 0) {
            categoryScore = studentScores.reduce(
              (s, x) => s + (x.percentage * x.weight) / totalItemWeight,
              0,
            );
            categoryScore = Math.round(categoryScore);

            // Proportion of category captured for this student
            const proportion = totalItemWeight / 100; // What fraction of the category's items
            totalCapturedWeight += cat.weight * proportion;
            totalCapturedScore += (categoryScore / 100) * cat.weight * proportion;
          }
        }

        studentCategories.push({
          categoryId: (cat._id as mongoose.Types.ObjectId).toString(),
          name: cat.name,
          weight: cat.weight,
          score: categoryScore,
          lineItems: lineItemResults,
        });
      }

      // Projected + final
      const projectedTermMark =
        totalCapturedWeight > 0
          ? Math.round((totalCapturedScore / totalCapturedWeight) * 100)
          : null;

      const isLocked = structure.status === 'locked';
      const finalTermMark = isLocked ? projectedTermMark : null;
      const achievementLevel = finalTermMark != null ? getAchievementLevel(finalTermMark) : null;

      students.push({
        studentId: sid,
        studentName: nameMap.get(sid) ?? 'Unknown',
        capturedWeight: Math.round(totalCapturedWeight * 100) / 100,
        capturedTotal: Math.round(totalCapturedScore * 100) / 100,
        projectedTermMark,
        finalTermMark,
        achievementLevel,
        categories: studentCategories,
      });
    }

    // 7. Build category summaries
    const categorySummaries: CategorySummary[] = structure.categories.map((cat) => {
      const liSummaries = cat.lineItems.map((item) => {
        const aId = item.assessmentId?.toString();
        let captured = 0;
        if (aId && item.status !== 'pending') {
          const marksForAssessment = markIndex.get(aId);
          captured = marksForAssessment ? marksForAssessment.size : 0;
        }
        return {
          lineItemId: (item._id as mongoose.Types.ObjectId).toString(),
          name: item.name,
          totalMarks: item.totalMarks,
          studentsCaptured: captured,
          studentsPending: totalStudentCount - captured,
        };
      });

      // Derive category status
      const allPending = cat.lineItems.every((li) => li.status === 'pending');
      const allClosed = cat.lineItems.length > 0 && cat.lineItems.every((li) => li.status === 'closed');
      const allComplete =
        allClosed && liSummaries.every((s) => s.studentsPending === 0);

      let catStatus: 'pending' | 'in_progress' | 'complete' = 'in_progress';
      if (allPending) catStatus = 'pending';
      if (allComplete) catStatus = 'complete';

      return {
        categoryId: (cat._id as mongoose.Types.ObjectId).toString(),
        name: cat.name,
        weight: cat.weight,
        status: catStatus,
        lineItems: liSummaries,
      };
    });

    // 8. Completion percentage
    const totalWeight = structure.categories.reduce((s, c) => s + c.weight, 0);
    const completedWeight = categorySummaries
      .filter((c) => c.status === 'complete')
      .reduce((s, c) => s + c.weight, 0);
    const completionPercent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    return {
      structureId: (structure._id as mongoose.Types.ObjectId).toString(),
      structureName: structure.name,
      term: structure.term,
      academicYear: structure.academicYear,
      completionPercent,
      categories: categorySummaries,
      students,
    };
  }

  static async getStudentTermMarks(
    structureId: string,
    studentId: string,
    tenant: { teacherId: string; schoolId: string | null },
  ): Promise<StudentResult> {
    const full = await this.getTermMarks(structureId, tenant);
    const student = full.students.find((s) => s.studentId === studentId);
    if (!student) throw new NotFoundError('Student not found in this structure');
    return student;
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AssessmentStructure/services/calculation.service.ts
git commit -m "feat(assessment-structure): add term mark calculation engine with CAPS levels"
```

---

## Task 6: Backend — Template & Clone Service

**Files:**
- Create: `src/modules/AssessmentStructure/services/template.service.ts` (in campusly-backend)

- [ ] **Step 1: Create the template and clone service**

```typescript
// src/modules/AssessmentStructure/services/template.service.ts
import mongoose from 'mongoose';
import { AssessmentStructure } from '../model.js';
import type { IAssessmentStructure } from '../model.js';
import { NotFoundError, ConflictError } from '../../../common/errors.js';

interface TenantFilter {
  teacherId: string;
  schoolId: string | null;
}

function buildTenantFilter(tenant: TenantFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = { teacherId: tenant.teacherId, isDeleted: false };
  if (tenant.schoolId) {
    filter.schoolId = new mongoose.Types.ObjectId(tenant.schoolId);
  } else {
    filter.schoolId = null;
  }
  return filter;
}

export class TemplateService {
  static async saveAsTemplate(
    structureId: string,
    tenant: TenantFilter,
    templateName: string,
  ): Promise<IAssessmentStructure> {
    const source = await AssessmentStructure.findOne({
      _id: structureId,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    }).lean();
    if (!source) throw new NotFoundError('Assessment structure not found');

    // Clone categories without assessmentIds or statuses
    const cleanCategories = source.categories.map((cat) => ({
      _id: new mongoose.Types.ObjectId(),
      name: cat.name,
      type: cat.type,
      weight: cat.weight,
      lineItems: cat.lineItems.map((li) => ({
        _id: new mongoose.Types.ObjectId(),
        name: li.name,
        totalMarks: li.totalMarks,
        weight: li.weight,
        date: null,
        assessmentId: null,
        status: 'pending' as const,
      })),
    }));

    const template = new AssessmentStructure({
      teacherId: tenant.teacherId,
      schoolId: tenant.schoolId ?? null,
      subjectId: source.subjectId,
      subjectName: source.subjectName,
      classId: null,
      gradeId: source.gradeId,
      term: source.term,
      academicYear: source.academicYear,
      name: templateName,
      categories: cleanCategories,
      status: 'draft',
      isTemplate: true,
      templateName,
    });

    return template.save();
  }

  static async listTemplates(tenant: TenantFilter): Promise<IAssessmentStructure[]> {
    return AssessmentStructure.find({
      ...buildTenantFilter(tenant),
      isTemplate: true,
    })
      .sort('-updatedAt')
      .lean()
      .exec();
  }

  static async deleteTemplate(id: string, tenant: TenantFilter): Promise<void> {
    const result = await AssessmentStructure.updateOne(
      { _id: id, ...buildTenantFilter(tenant), isTemplate: true },
      { $set: { isDeleted: true } },
    );
    if (result.matchedCount === 0) throw new NotFoundError('Template not found');
  }

  static async createFromTemplate(
    templateId: string,
    tenant: TenantFilter,
    data: {
      name: string;
      subjectId?: string | null;
      subjectName: string;
      classId?: string | null;
      gradeId?: string | null;
      term: number;
      academicYear: number;
    },
  ): Promise<IAssessmentStructure> {
    const template = await AssessmentStructure.findOne({
      _id: templateId,
      ...buildTenantFilter(tenant),
      isTemplate: true,
    }).lean();
    if (!template) throw new NotFoundError('Template not found');

    const cleanCategories = template.categories.map((cat) => ({
      _id: new mongoose.Types.ObjectId(),
      name: cat.name,
      type: cat.type,
      weight: cat.weight,
      lineItems: cat.lineItems.map((li) => ({
        _id: new mongoose.Types.ObjectId(),
        name: li.name,
        totalMarks: li.totalMarks,
        weight: li.weight,
        date: null,
        assessmentId: null,
        status: 'pending' as const,
      })),
    }));

    try {
      const structure = new AssessmentStructure({
        teacherId: tenant.teacherId,
        schoolId: tenant.schoolId ?? null,
        subjectId: data.subjectId ?? null,
        subjectName: data.subjectName,
        classId: data.classId ?? null,
        gradeId: data.gradeId ?? null,
        term: data.term,
        academicYear: data.academicYear,
        name: data.name,
        categories: cleanCategories,
        status: 'draft',
        isTemplate: false,
      });
      return await structure.save();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
        throw new ConflictError(
          'A structure already exists for this subject, class, term, and year',
        );
      }
      throw err;
    }
  }

  static async clone(
    structureId: string,
    tenant: TenantFilter,
    data: {
      term: number;
      academicYear: number;
      classId?: string | null;
      gradeId?: string | null;
      name?: string;
    },
  ): Promise<IAssessmentStructure> {
    const source = await AssessmentStructure.findOne({
      _id: structureId,
      ...buildTenantFilter(tenant),
      isTemplate: false,
    }).lean();
    if (!source) throw new NotFoundError('Assessment structure not found');

    const cleanCategories = source.categories.map((cat) => ({
      _id: new mongoose.Types.ObjectId(),
      name: cat.name,
      type: cat.type,
      weight: cat.weight,
      lineItems: cat.lineItems.map((li) => ({
        _id: new mongoose.Types.ObjectId(),
        name: li.name,
        totalMarks: li.totalMarks,
        weight: li.weight,
        date: null,
        assessmentId: null,
        status: 'pending' as const,
      })),
    }));

    try {
      const structure = new AssessmentStructure({
        teacherId: tenant.teacherId,
        schoolId: tenant.schoolId ?? null,
        subjectId: source.subjectId,
        subjectName: source.subjectName,
        classId: data.classId !== undefined ? (data.classId ?? null) : source.classId,
        gradeId: data.gradeId !== undefined ? (data.gradeId ?? null) : source.gradeId,
        term: data.term,
        academicYear: data.academicYear,
        name: data.name ?? `${source.name} (copy)`,
        categories: cleanCategories,
        status: 'draft',
        isTemplate: false,
      });
      return await structure.save();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
        throw new ConflictError(
          'A structure already exists for this subject, class, term, and year',
        );
      }
      throw err;
    }
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AssessmentStructure/services/template.service.ts
git commit -m "feat(assessment-structure): add template save/load and clone service"
```

---

## Task 7: Backend — Controllers

**Files:**
- Create: `src/modules/AssessmentStructure/controller.ts` (barrel)
- Create: `src/modules/AssessmentStructure/controllers/structure.controller.ts`
- Create: `src/modules/AssessmentStructure/controllers/category.controller.ts`
- Create: `src/modules/AssessmentStructure/controllers/template.controller.ts`
- Create: `src/modules/AssessmentStructure/controllers/term-marks.controller.ts`
- Create: `src/modules/AssessmentStructure/controllers/student.controller.ts`

All in campusly-backend.

- [ ] **Step 1: Create the structure controller**

```typescript
// src/modules/AssessmentStructure/controllers/structure.controller.ts
import type { Request, Response } from 'express';
import { StructureService } from '../services/structure.service.js';
import { apiResponse } from '../../../common/utils.js';

function getTenant(req: Request) {
  return {
    teacherId: req.user!.id,
    schoolId: req.user!.schoolId ?? null,
  };
}

export class StructureController {
  static async create(req: Request, res: Response): Promise<void> {
    const structure = await StructureService.create(getTenant(req), req.body);
    res.status(201).json(apiResponse(true, structure, 'Assessment structure created'));
  }

  static async list(req: Request, res: Response): Promise<void> {
    const query = {
      term: req.query.term ? Number(req.query.term) : undefined,
      academicYear: req.query.academicYear ? Number(req.query.academicYear) : undefined,
      classId: req.query.classId as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
    };
    const structures = await StructureService.list(getTenant(req), query);
    res.json(apiResponse(true, structures, 'Structures retrieved'));
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const structure = await StructureService.getById(req.params.id, getTenant(req));
    res.json(apiResponse(true, structure, 'Structure retrieved'));
  }

  static async update(req: Request, res: Response): Promise<void> {
    const structure = await StructureService.update(req.params.id, getTenant(req), req.body);
    res.json(apiResponse(true, structure, 'Structure updated'));
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await StructureService.delete(req.params.id, getTenant(req));
    res.json(apiResponse(true, null, 'Structure deleted'));
  }

  static async activate(req: Request, res: Response): Promise<void> {
    const structure = await StructureService.activate(req.params.id, getTenant(req));
    res.json(apiResponse(true, structure, 'Structure activated'));
  }

  static async lock(req: Request, res: Response): Promise<void> {
    const result = await StructureService.lock(req.params.id, getTenant(req));
    if (result.errors) {
      res.status(400).json(apiResponse(false, result.errors, undefined, 'Cannot lock — missing marks'));
    } else {
      res.json(apiResponse(true, result.structure, 'Structure locked'));
    }
  }

  static async unlock(req: Request, res: Response): Promise<void> {
    const structure = await StructureService.unlock(
      req.params.id,
      getTenant(req),
      req.user!.id,
      req.body.reason,
    );
    res.json(apiResponse(true, structure, 'Structure unlocked'));
  }
}
```

- [ ] **Step 2: Create the category controller**

```typescript
// src/modules/AssessmentStructure/controllers/category.controller.ts
import type { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';
import { apiResponse } from '../../../common/utils.js';

function getTenant(req: Request) {
  return {
    teacherId: req.user!.id,
    schoolId: req.user!.schoolId ?? null,
  };
}

export class CategoryController {
  static async addCategory(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.addCategory(req.params.id, getTenant(req), req.body);
    res.status(201).json(apiResponse(true, structure, 'Category added'));
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.updateCategory(
      req.params.id, req.params.catId, getTenant(req), req.body,
    );
    res.json(apiResponse(true, structure, 'Category updated'));
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.deleteCategory(
      req.params.id, req.params.catId, getTenant(req),
    );
    res.json(apiResponse(true, structure, 'Category deleted'));
  }

  static async addLineItem(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.addLineItem(
      req.params.id, req.params.catId, getTenant(req), req.body,
    );
    res.status(201).json(apiResponse(true, structure, 'Line item added'));
  }

  static async updateLineItem(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.updateLineItem(
      req.params.id, req.params.catId, req.params.itemId, getTenant(req), req.body,
    );
    res.json(apiResponse(true, structure, 'Line item updated'));
  }

  static async deleteLineItem(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.deleteLineItem(
      req.params.id, req.params.catId, req.params.itemId, getTenant(req),
    );
    res.json(apiResponse(true, structure, 'Line item deleted'));
  }

  static async linkAssessment(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.linkAssessment(
      req.params.id, req.params.catId, req.params.itemId, getTenant(req), req.body.assessmentId,
    );
    res.json(apiResponse(true, structure, 'Assessment linked'));
  }
}
```

- [ ] **Step 3: Create the student controller**

```typescript
// src/modules/AssessmentStructure/controllers/student.controller.ts
import type { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';
import { apiResponse } from '../../../common/utils.js';

function getTenant(req: Request) {
  return {
    teacherId: req.user!.id,
    schoolId: req.user!.schoolId ?? null,
  };
}

export class StudentController {
  static async addStudents(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.addStudents(
      req.params.id, getTenant(req), req.body.studentIds,
    );
    res.json(apiResponse(true, structure, 'Students added'));
  }

  static async removeStudent(req: Request, res: Response): Promise<void> {
    const structure = await CategoryService.removeStudent(
      req.params.id, req.params.studentId, getTenant(req),
    );
    res.json(apiResponse(true, structure, 'Student removed'));
  }
}
```

- [ ] **Step 4: Create the template controller**

```typescript
// src/modules/AssessmentStructure/controllers/template.controller.ts
import type { Request, Response } from 'express';
import { TemplateService } from '../services/template.service.js';
import { apiResponse } from '../../../common/utils.js';

function getTenant(req: Request) {
  return {
    teacherId: req.user!.id,
    schoolId: req.user!.schoolId ?? null,
  };
}

export class TemplateController {
  static async saveAsTemplate(req: Request, res: Response): Promise<void> {
    const template = await TemplateService.saveAsTemplate(
      req.params.id, getTenant(req), req.body.templateName,
    );
    res.status(201).json(apiResponse(true, template, 'Template saved'));
  }

  static async listTemplates(req: Request, res: Response): Promise<void> {
    const templates = await TemplateService.listTemplates(getTenant(req));
    res.json(apiResponse(true, templates, 'Templates retrieved'));
  }

  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    await TemplateService.deleteTemplate(req.params.id, getTenant(req));
    res.json(apiResponse(true, null, 'Template deleted'));
  }

  static async createFromTemplate(req: Request, res: Response): Promise<void> {
    const structure = await TemplateService.createFromTemplate(
      req.params.templateId, getTenant(req), req.body,
    );
    res.status(201).json(apiResponse(true, structure, 'Structure created from template'));
  }

  static async clone(req: Request, res: Response): Promise<void> {
    const structure = await TemplateService.clone(
      req.params.id, getTenant(req), req.body,
    );
    res.status(201).json(apiResponse(true, structure, 'Structure cloned'));
  }
}
```

- [ ] **Step 5: Create the term marks controller**

```typescript
// src/modules/AssessmentStructure/controllers/term-marks.controller.ts
import type { Request, Response } from 'express';
import { CalculationService } from '../services/calculation.service.js';
import { apiResponse } from '../../../common/utils.js';

function getTenant(req: Request) {
  return {
    teacherId: req.user!.id,
    schoolId: req.user!.schoolId ?? null,
  };
}

export class TermMarksController {
  static async getTermMarks(req: Request, res: Response): Promise<void> {
    const result = await CalculationService.getTermMarks(req.params.id, getTenant(req));
    res.json(apiResponse(true, result, 'Term marks calculated'));
  }

  static async getStudentTermMarks(req: Request, res: Response): Promise<void> {
    const result = await CalculationService.getStudentTermMarks(
      req.params.id, req.params.studentId, getTenant(req),
    );
    res.json(apiResponse(true, result, 'Student term marks retrieved'));
  }
}
```

- [ ] **Step 6: Create the barrel controller**

```typescript
// src/modules/AssessmentStructure/controller.ts
export { StructureController } from './controllers/structure.controller.js';
export { CategoryController } from './controllers/category.controller.js';
export { StudentController } from './controllers/student.controller.js';
export { TemplateController } from './controllers/template.controller.js';
export { TermMarksController } from './controllers/term-marks.controller.js';
```

- [ ] **Step 7: Also create a barrel for services**

```typescript
// src/modules/AssessmentStructure/service.ts
export { StructureService } from './services/structure.service.js';
export { CategoryService } from './services/category.service.js';
export { CalculationService } from './services/calculation.service.js';
export { TemplateService } from './services/template.service.js';
```

- [ ] **Step 8: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/modules/AssessmentStructure/controller.ts src/modules/AssessmentStructure/service.ts src/modules/AssessmentStructure/controllers/
git commit -m "feat(assessment-structure): add all controllers and service barrel"
```

---

## Task 8: Backend — Routes + Mount in app.ts

**Files:**
- Create: `src/modules/AssessmentStructure/routes.ts` (in campusly-backend)
- Modify: `src/app.ts:21,142` (in campusly-backend)

- [ ] **Step 1: Create the routes file**

```typescript
// src/modules/AssessmentStructure/routes.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  StructureController,
  CategoryController,
  StudentController,
  TemplateController,
  TermMarksController,
} from './controller.js';
import {
  createStructureSchema,
  updateStructureSchema,
  addCategorySchema,
  updateCategorySchema,
  addLineItemSchema,
  updateLineItemSchema,
  linkAssessmentSchema,
  addStudentsSchema,
  unlockSchema,
  saveAsTemplateSchema,
  fromTemplateSchema,
  cloneStructureSchema,
} from './validation.js';

const router = Router();
const roles = ['super_admin', 'school_admin', 'teacher'] as const;

/* ── Templates (before /:id routes to avoid param conflict) ── */
router.get('/templates', authenticate, authorize(...roles), TemplateController.listTemplates);
router.post(
  '/from-template/:templateId',
  authenticate, authorize(...roles), validate(fromTemplateSchema),
  TemplateController.createFromTemplate,
);
router.delete('/templates/:id', authenticate, authorize(...roles), TemplateController.deleteTemplate);

/* ── CRUD ─────────────────────────────────────────────────── */
router.post('/', authenticate, authorize(...roles), validate(createStructureSchema), StructureController.create);
router.get('/', authenticate, authorize(...roles), StructureController.list);
router.get('/:id', authenticate, authorize(...roles), StructureController.getById);
router.put('/:id', authenticate, authorize(...roles), validate(updateStructureSchema), StructureController.update);
router.delete('/:id', authenticate, authorize(...roles), StructureController.delete);

/* ── Status transitions ───────────────────────────────────── */
router.post('/:id/activate', authenticate, authorize(...roles), StructureController.activate);
router.post('/:id/lock', authenticate, authorize(...roles), StructureController.lock);
router.post('/:id/unlock', authenticate, authorize(...roles), validate(unlockSchema), StructureController.unlock);

/* ── Categories ───────────────────────────────────────────── */
router.post('/:id/categories', authenticate, authorize(...roles), validate(addCategorySchema), CategoryController.addCategory);
router.put('/:id/categories/:catId', authenticate, authorize(...roles), validate(updateCategorySchema), CategoryController.updateCategory);
router.delete('/:id/categories/:catId', authenticate, authorize(...roles), CategoryController.deleteCategory);

/* ── Line Items ───────────────────────────────────────────── */
router.post('/:id/categories/:catId/line-items', authenticate, authorize(...roles), validate(addLineItemSchema), CategoryController.addLineItem);
router.put('/:id/categories/:catId/line-items/:itemId', authenticate, authorize(...roles), validate(updateLineItemSchema), CategoryController.updateLineItem);
router.delete('/:id/categories/:catId/line-items/:itemId', authenticate, authorize(...roles), CategoryController.deleteLineItem);
router.post('/:id/categories/:catId/line-items/:itemId/link', authenticate, authorize(...roles), validate(linkAssessmentSchema), CategoryController.linkAssessment);

/* ── Students (standalone) ────────────────────────────────── */
router.post('/:id/students', authenticate, authorize(...roles), validate(addStudentsSchema), StudentController.addStudents);
router.delete('/:id/students/:studentId', authenticate, authorize(...roles), StudentController.removeStudent);

/* ── Term marks ───────────────────────────────────────────── */
router.get('/:id/term-marks', authenticate, authorize(...roles), TermMarksController.getTermMarks);
router.get('/:id/term-marks/:studentId', authenticate, authorize(...roles), TermMarksController.getStudentTermMarks);

/* ── Templates & Cloning ──────────────────────────────────── */
router.post('/:id/save-as-template', authenticate, authorize(...roles), validate(saveAsTemplateSchema), TemplateController.saveAsTemplate);
router.post('/:id/clone', authenticate, authorize(...roles), validate(cloneStructureSchema), TemplateController.clone);

export default router;
```

- [ ] **Step 2: Mount routes in app.ts**

In `src/app.ts`, add the import near the other route imports (around line 21):

```typescript
import assessmentStructureRoutes from './modules/AssessmentStructure/routes.js';
```

Then after the academic routes mount (around line 142), add:

```typescript
app.use('/api/assessment-structures', authenticate, requireModule('academic'), assessmentStructureRoutes);
```

- [ ] **Step 3: Verify the entire backend compiles**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Start the backend and verify routes register**

Run: `cd /c/Users/shaun/campusly-backend && npm run dev`
Expected: Server starts without errors. Check console for route registration.

- [ ] **Step 5: Commit**

```bash
git add src/modules/AssessmentStructure/routes.ts src/app.ts
git commit -m "feat(assessment-structure): add routes and mount in app.ts"
```

---

## Task 9: Frontend — Types

**Files:**
- Create: `src/types/assessment-structure.ts` (in campusly-frontend)
- Modify: `src/types/academic.ts` (add structureId to Assessment)

- [ ] **Step 1: Create the assessment structure types file**

```typescript
// src/types/assessment-structure.ts

/* ── Line Item ────────────────────────────────────────────── */

export type LineItemStatus = 'pending' | 'capturing' | 'closed';

export interface LineItem {
  id: string;
  name: string;
  totalMarks: number;
  weight?: number | null;
  date?: string | null;
  assessmentId?: string | null;
  status: LineItemStatus;
}

/* ── Category ─────────────────────────────────────────────── */

export type CategoryType = 'test' | 'exam' | 'assignment' | 'practical' | 'project' | 'other';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  weight: number;
  lineItems: LineItem[];
}

/* ── Structure ────────────────────────────────────────────── */

export type StructureStatus = 'draft' | 'active' | 'locked';

export interface AssessmentStructure {
  id: string;
  teacherId: string;
  schoolId: string | null;
  subjectId: string | null;
  subjectName: string;
  classId: string | null;
  gradeId: string | null;
  term: number;
  academicYear: number;
  name: string;
  studentIds: string[];
  categories: Category[];
  status: StructureStatus;
  lockedAt: string | null;
  unlockedBy: string | null;
  unlockReason: string | null;
  unlockedAt: string | null;
  isTemplate: boolean;
  templateName: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ── Payloads ─────────────────────────────────────────────── */

export interface CreateStructurePayload {
  name: string;
  subjectId?: string | null;
  subjectName: string;
  classId?: string | null;
  gradeId?: string | null;
  term: number;
  academicYear: number;
}

export interface AddCategoryPayload {
  name: string;
  type: CategoryType;
  weight: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: CategoryType;
  weight?: number;
}

export interface AddLineItemPayload {
  name: string;
  totalMarks: number;
  weight?: number | null;
  date?: string | null;
  existingAssessmentId?: string;
}

export interface UpdateLineItemPayload {
  name?: string;
  totalMarks?: number;
  weight?: number | null;
  date?: string | null;
  status?: LineItemStatus;
}

export interface ClonePayload {
  term: number;
  academicYear: number;
  classId?: string | null;
  gradeId?: string | null;
  name?: string;
}

export interface FromTemplatePayload {
  name: string;
  subjectId?: string | null;
  subjectName: string;
  classId?: string | null;
  gradeId?: string | null;
  term: number;
  academicYear: number;
}

/* ── Term Marks (calculation response) ────────────────────── */

export interface TermMarkLineItem {
  lineItemId: string;
  name: string;
  mark: number | null;
  total: number;
  percentage: number | null;
  isAbsent: boolean;
}

export interface StudentCategoryResult {
  categoryId: string;
  name: string;
  weight: number;
  score: number | null;
  lineItems: TermMarkLineItem[];
}

export interface StudentTermResult {
  studentId: string;
  studentName: string;
  capturedWeight: number;
  capturedTotal: number;
  projectedTermMark: number | null;
  finalTermMark: number | null;
  achievementLevel: { level: number; description: string } | null;
  categories: StudentCategoryResult[];
}

export type CategoryStatus = 'pending' | 'in_progress' | 'complete';

export interface CategorySummaryItem {
  lineItemId: string;
  name: string;
  totalMarks: number;
  studentsCaptured: number;
  studentsPending: number;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  weight: number;
  status: CategoryStatus;
  lineItems: CategorySummaryItem[];
}

export interface TermMarksResponse {
  structureId: string;
  structureName: string;
  term: number;
  academicYear: number;
  completionPercent: number;
  categories: CategorySummary[];
  students: StudentTermResult[];
}

/* ── Lock validation errors ───────────────────────────────── */

export interface LockError {
  lineItem: string;
  missingStudents: string[];
  missingCount: number;
}
```

- [ ] **Step 2: Add `structureId` to the Assessment type in academic.ts**

Find the `Assessment` interface in `src/types/academic.ts` and add:

```typescript
structureId?: string | null;
```

- [ ] **Step 3: Re-export from the types barrel**

In `src/types/index.ts`, add:

```typescript
export * from './assessment-structure';
```

- [ ] **Step 4: Verify the frontend compiles**

Run: `cd /c/Users/shaun/campusly-frontend && npx next build --no-lint`
Expected: No type errors from the new file.

- [ ] **Step 5: Commit**

```bash
git add src/types/assessment-structure.ts src/types/academic.ts src/types/index.ts
git commit -m "feat(assessment-structure): add frontend TypeScript types"
```

---

## Task 10: Frontend — Hooks

**Files:**
- Create: `src/hooks/useAssessmentStructures.ts`
- Create: `src/hooks/useAssessmentStructureDetail.ts`
- Create: `src/hooks/useTermMarks.ts`

All in campusly-frontend.

- [ ] **Step 1: Create the list/CRUD hook**

```typescript
// src/hooks/useAssessmentStructures.ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AssessmentStructure,
  CreateStructurePayload,
  FromTemplatePayload,
} from '@/types';

interface ListFilters {
  term?: number;
  academicYear?: number;
  classId?: string;
  subjectId?: string;
}

export function useAssessmentStructures(filters?: ListFilters) {
  const [structures, setStructures] = useState<AssessmentStructure[]>([]);
  const [templates, setTemplates] = useState<AssessmentStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStructures = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters?.term) params.set('term', String(filters.term));
      if (filters?.academicYear) params.set('academicYear', String(filters.academicYear));
      if (filters?.classId) params.set('classId', filters.classId);
      if (filters?.subjectId) params.set('subjectId', filters.subjectId);
      const qs = params.toString();

      const res = await apiClient.get(`/assessment-structures${qs ? `?${qs}` : ''}`);
      setStructures(unwrapList<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load structures', err);
      toast.error('Could not load assessment structures');
    } finally {
      setLoading(false);
    }
  }, [filters?.term, filters?.academicYear, filters?.classId, filters?.subjectId]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  const createStructure = useCallback(async (payload: CreateStructurePayload) => {
    try {
      const res = await apiClient.post('/assessment-structures', payload);
      const created = unwrapResponse<AssessmentStructure>(res);
      toast.success('Assessment structure created');
      await fetchStructures();
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create structure'));
      throw err;
    }
  }, [fetchStructures]);

  const deleteStructure = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/assessment-structures/${id}`);
      toast.success('Structure deleted');
      setStructures((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete'));
      throw err;
    }
  }, []);

  /* ── Templates ──────────────────────────────────────────── */

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiClient.get('/assessment-structures/templates');
      setTemplates(unwrapList<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load templates', err);
    }
  }, []);

  const createFromTemplate = useCallback(async (templateId: string, payload: FromTemplatePayload) => {
    try {
      const res = await apiClient.post(`/assessment-structures/from-template/${templateId}`, payload);
      const created = unwrapResponse<AssessmentStructure>(res);
      toast.success('Structure created from template');
      await fetchStructures();
      return created;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create from template'));
      throw err;
    }
  }, [fetchStructures]);

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/assessment-structures/templates/${id}`);
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete template'));
      throw err;
    }
  }, []);

  return {
    structures,
    templates,
    loading,
    fetchStructures,
    createStructure,
    deleteStructure,
    fetchTemplates,
    createFromTemplate,
    deleteTemplate,
  };
}
```

- [ ] **Step 2: Create the detail/management hook**

```typescript
// src/hooks/useAssessmentStructureDetail.ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  AssessmentStructure,
  AddCategoryPayload,
  UpdateCategoryPayload,
  AddLineItemPayload,
  UpdateLineItemPayload,
  ClonePayload,
  LockError,
} from '@/types';

export function useAssessmentStructureDetail(id: string | null) {
  const [structure, setStructure] = useState<AssessmentStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [lockErrors, setLockErrors] = useState<LockError[] | null>(null);

  const fetchStructure = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    try {
      const res = await apiClient.get(`/assessment-structures/${id}`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load structure', err);
      toast.error('Could not load assessment structure');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStructure(); }, [fetchStructure]);

  /* ── Structure updates ──────────────────────────────────── */

  const updateStructure = useCallback(async (data: { name?: string; subjectName?: string; gradeId?: string | null }) => {
    if (!id) return;
    try {
      const res = await apiClient.put(`/assessment-structures/${id}`, data);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Structure updated');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update'));
      throw err;
    }
  }, [id]);

  /* ── Category management ────────────────────────────────── */

  const addCategory = useCallback(async (payload: AddCategoryPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/categories`, payload);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Category added');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add category'));
      throw err;
    }
  }, [id]);

  const updateCategory = useCallback(async (catId: string, payload: UpdateCategoryPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.put(`/assessment-structures/${id}/categories/${catId}`, payload);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Category updated');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update category'));
      throw err;
    }
  }, [id]);

  const deleteCategory = useCallback(async (catId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(`/assessment-structures/${id}/categories/${catId}`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Category deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete category'));
      throw err;
    }
  }, [id]);

  /* ── Line item management ───────────────────────────────── */

  const addLineItem = useCallback(async (catId: string, payload: AddLineItemPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/categories/${catId}/line-items`, payload);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Assessment added');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add assessment'));
      throw err;
    }
  }, [id]);

  const updateLineItem = useCallback(async (catId: string, itemId: string, payload: UpdateLineItemPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.put(`/assessment-structures/${id}/categories/${catId}/line-items/${itemId}`, payload);
      setStructure(unwrapResponse<AssessmentStructure>(res));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update'));
      throw err;
    }
  }, [id]);

  const deleteLineItem = useCallback(async (catId: string, itemId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(`/assessment-structures/${id}/categories/${catId}/line-items/${itemId}`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Assessment removed');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to remove'));
      throw err;
    }
  }, [id]);

  const linkAssessment = useCallback(async (catId: string, itemId: string, assessmentId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/categories/${catId}/line-items/${itemId}/link`, { assessmentId });
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Assessment linked');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to link'));
      throw err;
    }
  }, [id]);

  /* ── Status transitions ─────────────────────────────────── */

  const activate = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/activate`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Structure activated — you can now enter marks');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Cannot activate'));
      throw err;
    }
  }, [id]);

  const lock = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/lock`);
      const data = res.data;
      if (data.success === false && data.data) {
        setLockErrors(data.data as LockError[]);
        return false;
      }
      setStructure(unwrapResponse<AssessmentStructure>(res));
      setLockErrors(null);
      toast.success('Structure locked for report cards');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Cannot lock'));
      throw err;
    }
  }, [id]);

  const unlock = useCallback(async (reason: string) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/unlock`, { reason });
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Structure unlocked');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Cannot unlock'));
      throw err;
    }
  }, [id]);

  /* ── Students (standalone) ──────────────────────────────── */

  const addStudents = useCallback(async (studentIds: string[]) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/students`, { studentIds });
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Students added');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add students'));
      throw err;
    }
  }, [id]);

  const removeStudent = useCallback(async (studentId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(`/assessment-structures/${id}/students/${studentId}`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
      toast.success('Student removed');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to remove student'));
      throw err;
    }
  }, [id]);

  /* ── Clone & template ───────────────────────────────────── */

  const saveAsTemplate = useCallback(async (templateName: string) => {
    if (!id) return;
    try {
      await apiClient.post(`/assessment-structures/${id}/save-as-template`, { templateName });
      toast.success('Saved as template');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save template'));
      throw err;
    }
  }, [id]);

  const cloneStructure = useCallback(async (payload: ClonePayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/clone`, payload);
      const cloned = unwrapResponse<AssessmentStructure>(res);
      toast.success('Structure cloned');
      return cloned;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to clone'));
      throw err;
    }
  }, [id]);

  return {
    structure,
    loading,
    lockErrors,
    setLockErrors,
    fetchStructure,
    updateStructure,
    addCategory,
    updateCategory,
    deleteCategory,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    linkAssessment,
    activate,
    lock,
    unlock,
    addStudents,
    removeStudent,
    saveAsTemplate,
    cloneStructure,
  };
}
```

- [ ] **Step 3: Create the term marks hook**

```typescript
// src/hooks/useTermMarks.ts
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { TermMarksResponse } from '@/types';

export function useTermMarks(structureId: string | null) {
  const [termMarks, setTermMarks] = useState<TermMarksResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTermMarks = useCallback(async () => {
    if (!structureId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/assessment-structures/${structureId}/term-marks`);
      setTermMarks(unwrapResponse<TermMarksResponse>(res));
    } catch (err: unknown) {
      console.error('Failed to load term marks', err);
      toast.error(extractErrorMessage(err, 'Could not calculate term marks'));
    } finally {
      setLoading(false);
    }
  }, [structureId]);

  useEffect(() => { fetchTermMarks(); }, [fetchTermMarks]);

  return { termMarks, loading, fetchTermMarks };
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd /c/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAssessmentStructures.ts src/hooks/useAssessmentStructureDetail.ts src/hooks/useTermMarks.ts
git commit -m "feat(assessment-structure): add frontend hooks for structures, detail, and term marks"
```

---

## Task 11: Frontend — Navigation + List Page + Create Dialog

**Files:**
- Modify: `src/lib/constants.ts` (in campusly-frontend)
- Create: `src/app/(dashboard)/teacher/curriculum/assessment-structure/page.tsx`
- Create: `src/components/assessment-structure/AssessmentStructureList.tsx`
- Create: `src/components/assessment-structure/CreateStructureDialog.tsx`

- [ ] **Step 1: Add route constant and nav item to constants.ts**

In `src/lib/constants.ts`, add the route constant to the ROUTES object (teacher section):

```typescript
TEACHER_ASSESSMENT_STRUCTURES: '/teacher/curriculum/assessment-structure',
```

Then find the TEACHER_NAV Curriculum children array and add between "Assessments" and "Generated Papers":

```typescript
{ label: 'Assessment Structure', href: '/teacher/curriculum/assessment-structure', icon: BarChart3 },
```

Make sure `BarChart3` is imported from `lucide-react` at the top of the file.

- [ ] **Step 2: Create the CreateStructureDialog component**

```typescript
// src/components/assessment-structure/CreateStructureDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherSubjects } from '@/hooks/useTeacherSubjects';
import type { CreateStructurePayload } from '@/types';

interface CreateStructureDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateStructurePayload) => Promise<unknown>;
}

const currentYear = new Date().getFullYear();

export function CreateStructureDialog({ open, onClose, onCreate }: CreateStructureDialogProps) {
  const { user } = useAuthStore();
  const isStandalone = !user?.schoolId;
  const { classes } = useTeacherClasses();
  const { subjects } = useTeacherSubjects();

  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [subjectName, setSubjectName] = useState('');
  const [classId, setClassId] = useState<string>('');
  const [term, setTerm] = useState<string>('');
  const [academicYear, setAcademicYear] = useState(String(currentYear));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setSubjectId('');
      setSubjectName('');
      setClassId('');
      setTerm('');
      setAcademicYear(String(currentYear));
    }
  }, [open]);

  // Auto-set subjectName when subjectId changes
  useEffect(() => {
    if (subjectId && subjects.length > 0) {
      const found = subjects.find((s) => s.id === subjectId);
      if (found) setSubjectName(found.name);
    }
  }, [subjectId, subjects]);

  const canSubmit = name.trim() && subjectName.trim() && term && academicYear;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      await onCreate({
        name: name.trim(),
        subjectId: subjectId || null,
        subjectName: subjectName.trim(),
        classId: classId || null,
        term: Number(term),
        academicYear: Number(academicYear),
      });
      onClose();
    } catch {
      // Error already toasted by hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create Assessment Structure</DialogTitle>
          <DialogDescription>Define the assessment plan for a subject and term.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="as-name">Name <span className="text-destructive">*</span></Label>
            <Input id="as-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maths Grade 8 Term 1" />
          </div>

          {isStandalone ? (
            <div className="space-y-2">
              <Label htmlFor="as-subject">Subject Name <span className="text-destructive">*</span></Label>
              <Input id="as-subject" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select value={subjectId} onValueChange={(val: unknown) => setSubjectId(val as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isStandalone && (
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={(val: unknown) => setClassId(val as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Term <span className="text-destructive">*</span></Label>
              <Select value={term} onValueChange={(val: unknown) => setTerm(val as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                  <SelectItem value="4">Term 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="as-year">Year <span className="text-destructive">*</span></Label>
              <Input id="as-year" type="number" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Creating...' : 'Create Structure'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create the AssessmentStructureList component**

```typescript
// src/components/assessment-structure/AssessmentStructureList.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssessmentStructure, StructureStatus } from '@/types';

interface AssessmentStructureListProps {
  structures: AssessmentStructure[];
  onSelect: (id: string) => void;
}

const statusVariant: Record<StructureStatus, 'secondary' | 'default' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  locked: 'destructive',
};

export function AssessmentStructureList({ structures, onSelect }: AssessmentStructureListProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {structures.map((s) => (
        <Card
          key={s.id}
          className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-shadow"
          onClick={() => onSelect(s.id)}
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium truncate">{s.name}</h4>
                <p className="text-sm text-muted-foreground truncate">{s.subjectName}</p>
              </div>
              <Badge variant={statusVariant[s.status]}>{s.status}</Badge>
            </div>
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span>Term {s.term}</span>
              <span>{s.academicYear}</span>
              <span>{s.categories.length} categories</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create the list page**

```typescript
// src/app/(dashboard)/teacher/curriculum/assessment-structure/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { AssessmentStructureList } from '@/components/assessment-structure/AssessmentStructureList';
import { CreateStructureDialog } from '@/components/assessment-structure/CreateStructureDialog';
import { useAssessmentStructures } from '@/hooks/useAssessmentStructures';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function AssessmentStructurePage() {
  const router = useRouter();
  const { structures, loading, createStructure } = useAssessmentStructures();
  const [createOpen, setCreateOpen] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessment Structures" description="Define weighted assessment plans for your subjects" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment Structures" description="Define weighted assessment plans for your subjects">
        <Button onClick={() => setCreateOpen(true)}>Create New</Button>
      </PageHeader>

      {structures.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No assessment structures yet"
          description="Create one to define your term's assessment plan with weighted categories."
          action={<Button onClick={() => setCreateOpen(true)}>Create Structure</Button>}
        />
      ) : (
        <AssessmentStructureList
          structures={structures}
          onSelect={(id) => router.push(`/teacher/curriculum/assessment-structure/${id}`)}
        />
      )}

      <CreateStructureDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createStructure}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify the page renders**

Run: `cd /c/Users/shaun/campusly-frontend && npm run dev`
Navigate to `/teacher/curriculum/assessment-structure` — should show the empty state with "Create New" button.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/app/(dashboard)/teacher/curriculum/assessment-structure/page.tsx src/components/assessment-structure/AssessmentStructureList.tsx src/components/assessment-structure/CreateStructureDialog.tsx
git commit -m "feat(assessment-structure): add list page, create dialog, and nav item"
```

---

## Task 12: Frontend — Builder Page + Structure Tab Components

**Files:**
- Create: `src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx`
- Create: `src/components/assessment-structure/AssessmentStructureBuilder.tsx`
- Create: `src/components/assessment-structure/CategoryCard.tsx`
- Create: `src/components/assessment-structure/LineItemRow.tsx`
- Create: `src/components/assessment-structure/WeightIndicator.tsx`
- Create: `src/components/assessment-structure/AddCategoryForm.tsx`
- Create: `src/components/assessment-structure/AddLineItemForm.tsx`

This is the largest task. Each component must stay under 350 lines per CLAUDE.md.

- [ ] **Step 1: Create the WeightIndicator component**

```typescript
// src/components/assessment-structure/WeightIndicator.tsx
'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface WeightIndicatorProps {
  total: number;
  target?: number;
  label?: string;
}

export function WeightIndicator({ total, target = 100, label = 'Total weight' }: WeightIndicatorProps) {
  const isValid = Math.abs(total - target) < 0.01;
  const rounded = Math.round(total * 100) / 100;

  return (
    <div className={`flex items-center gap-1.5 text-sm font-medium ${isValid ? 'text-green-600' : 'text-destructive'}`}>
      {isValid ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <span>{label}: {rounded}%</span>
      {!isValid && <span className="text-xs font-normal">(must be {target}%)</span>}
    </div>
  );
}
```

- [ ] **Step 2: Create the AddCategoryForm component**

```typescript
// src/components/assessment-structure/AddCategoryForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { AddCategoryPayload, CategoryType } from '@/types';

interface AddCategoryFormProps {
  onAdd: (payload: AddCategoryPayload) => Promise<void>;
  disabled?: boolean;
}

const CATEGORY_TYPES: Array<{ value: CategoryType; label: string }> = [
  { value: 'test', label: 'Test' },
  { value: 'exam', label: 'Exam' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'practical', label: 'Practical' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
];

export function AddCategoryForm({ onAdd, disabled }: AddCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('test');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" /> Add Category
      </Button>
    );
  }

  const handleSubmit = async () => {
    if (!name.trim() || !weight) return;
    try {
      setSaving(true);
      await onAdd({ name: name.trim(), type, weight: Number(weight) });
      setName('');
      setType('test');
      setWeight('');
      setOpen(false);
    } catch {
      // Error toasted by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tests" />
        </div>
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(val: unknown) => setType(val as CategoryType)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Weight (%)</Label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="30" min={0} max={100} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving || !name.trim() || !weight}>
          {saving ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the AddLineItemForm component**

```typescript
// src/components/assessment-structure/AddLineItemForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import type { AddLineItemPayload } from '@/types';

interface AddLineItemFormProps {
  onAdd: (payload: AddLineItemPayload) => Promise<void>;
  disabled?: boolean;
}

export function AddLineItemForm({ onAdd, disabled }: AddLineItemFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" /> Add assessment
      </button>
    );
  }

  const handleSubmit = async () => {
    if (!name.trim() || !totalMarks) return;
    try {
      setSaving(true);
      await onAdd({
        name: name.trim(),
        totalMarks: Number(totalMarks),
        date: date || null,
      });
      setName('');
      setTotalMarks('');
      setDate('');
      setOpen(false);
    } catch {
      // Error toasted by hook
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded p-3 space-y-2 ml-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test 1" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Total Marks</Label>
          <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="50" min={1} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date (optional)</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving || !name.trim() || !totalMarks}>
          {saving ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the LineItemRow component**

```typescript
// src/components/assessment-structure/LineItemRow.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { LineItem, LineItemStatus, StructureStatus } from '@/types';

interface LineItemRowProps {
  item: LineItem;
  structureStatus: StructureStatus;
  onUpdateStatus: (status: LineItemStatus) => void;
  onDelete: () => void;
}

const statusColors: Record<LineItemStatus, 'secondary' | 'default' | 'outline'> = {
  pending: 'secondary',
  capturing: 'default',
  closed: 'outline',
};

export function LineItemRow({ item, structureStatus, onUpdateStatus, onDelete }: LineItemRowProps) {
  const isActive = structureStatus === 'active';
  const isLocked = structureStatus === 'locked';
  const canDelete = !isLocked && structureStatus !== 'active'; // Draft only for delete if no marks
  const canChangeStatus = isActive;

  const formattedDate = item.date
    ? new Date(item.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md group">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{item.name}</span>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.totalMarks} marks</span>
      {formattedDate && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
      )}
      {item.weight != null && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{item.weight}%</span>
      )}
      <Badge variant={statusColors[item.status]} className="text-xs">{item.status}</Badge>
      {canChangeStatus && item.status === 'pending' && (
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onUpdateStatus('capturing')}>
          Start
        </Button>
      )}
      {canChangeStatus && item.status === 'closed' && (
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onUpdateStatus('capturing')}>
          Reopen
        </Button>
      )}
      {!isLocked && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create the CategoryCard component**

```typescript
// src/components/assessment-structure/CategoryCard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { LineItemRow } from './LineItemRow';
import { AddLineItemForm } from './AddLineItemForm';
import { WeightIndicator } from './WeightIndicator';
import type {
  Category,
  StructureStatus,
  AddLineItemPayload,
  LineItemStatus,
} from '@/types';

interface CategoryCardProps {
  category: Category;
  structureStatus: StructureStatus;
  onUpdateCategory: (data: { name?: string; type?: string; weight?: number }) => Promise<void>;
  onDeleteCategory: () => Promise<void>;
  onAddLineItem: (payload: AddLineItemPayload) => Promise<void>;
  onUpdateLineItem: (itemId: string, data: { status?: LineItemStatus }) => Promise<void>;
  onDeleteLineItem: (itemId: string) => Promise<void>;
}

export function CategoryCard({
  category,
  structureStatus,
  onUpdateCategory,
  onDeleteCategory,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
}: CategoryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const isLocked = structureStatus === 'locked';

  // Custom weight indicator for line items
  const customWeights = category.lineItems.filter((li) => li.weight != null);
  const hasCustomWeights = customWeights.length > 0;
  const lineItemWeightTotal = hasCustomWeights
    ? customWeights.reduce((s, li) => s + (li.weight ?? 0), 0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="p-0.5">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{category.name}</h3>
              <Badge variant="outline" className="text-xs">{category.type}</Badge>
              <span className="text-sm font-medium text-muted-foreground">{category.weight}%</span>
            </div>
          </div>
          {!isLocked && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDeleteCategory}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-1">
          {category.lineItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic px-3 py-2">No assessments yet</p>
          )}
          {category.lineItems.map((item) => (
            <LineItemRow
              key={item.id}
              item={item}
              structureStatus={structureStatus}
              onUpdateStatus={(status) => onUpdateLineItem(item.id, { status })}
              onDelete={() => onDeleteLineItem(item.id)}
            />
          ))}
          {hasCustomWeights && (
            <div className="px-3 pt-1">
              <WeightIndicator total={lineItemWeightTotal} label="Line item weights" />
            </div>
          )}
          {!isLocked && <AddLineItemForm onAdd={onAddLineItem} />}
        </CardContent>
      )}
    </Card>
  );
}
```

- [ ] **Step 6: Create the AssessmentStructureBuilder component**

```typescript
// src/components/assessment-structure/AssessmentStructureBuilder.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryCard } from './CategoryCard';
import { AddCategoryForm } from './AddCategoryForm';
import { WeightIndicator } from './WeightIndicator';
import type { AssessmentStructure, StructureStatus } from '@/types';

interface AssessmentStructureBuilderProps {
  structure: AssessmentStructure;
  onAddCategory: (data: { name: string; type: string; weight: number }) => Promise<void>;
  onUpdateCategory: (catId: string, data: { name?: string; type?: string; weight?: number }) => Promise<void>;
  onDeleteCategory: (catId: string) => Promise<void>;
  onAddLineItem: (catId: string, data: { name: string; totalMarks: number; date?: string | null }) => Promise<void>;
  onUpdateLineItem: (catId: string, itemId: string, data: { status?: string }) => Promise<void>;
  onDeleteLineItem: (catId: string, itemId: string) => Promise<void>;
  onActivate: () => Promise<void>;
  onLock: () => Promise<boolean | void>;
  onUnlock: (reason: string) => Promise<void>;
  onSaveAsTemplate: (name: string) => Promise<void>;
  termMarksTab: React.ReactNode;
  studentsTab?: React.ReactNode;
}

const statusVariant: Record<StructureStatus, 'secondary' | 'default' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  locked: 'destructive',
};

export function AssessmentStructureBuilder({
  structure,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
  onActivate,
  onLock,
  onUnlock,
  onSaveAsTemplate,
  termMarksTab,
  studentsTab,
}: AssessmentStructureBuilderProps) {
  const totalWeight = structure.categories.reduce((s, c) => s + c.weight, 0);
  const isLocked = structure.status === 'locked';
  const isDraft = structure.status === 'draft';
  const isActive = structure.status === 'active';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{structure.name}</h2>
          <p className="text-sm text-muted-foreground">
            {structure.subjectName} &middot; Term {structure.term} &middot; {structure.academicYear}
          </p>
        </div>
        <Badge variant={statusVariant[structure.status]} className="self-start sm:self-auto">
          {structure.status}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="structure">
        <TabsList className="flex-wrap">
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="term-marks" disabled={isDraft}>Term Marks</TabsTrigger>
          {studentsTab && <TabsTrigger value="students">Students</TabsTrigger>}
        </TabsList>

        <TabsContent value="structure" className="space-y-4 mt-4">
          {structure.categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              structureStatus={structure.status}
              onUpdateCategory={(data) => onUpdateCategory(cat.id, data)}
              onDeleteCategory={() => onDeleteCategory(cat.id)}
              onAddLineItem={(payload) => onAddLineItem(cat.id, payload)}
              onUpdateLineItem={(itemId, data) => onUpdateLineItem(cat.id, itemId, data)}
              onDeleteLineItem={(itemId) => onDeleteLineItem(cat.id, itemId)}
            />
          ))}

          {!isLocked && <AddCategoryForm onAdd={onAddCategory} />}

          {/* Weight total */}
          <WeightIndicator total={totalWeight} />

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            {isDraft && (
              <Button onClick={onActivate} disabled={Math.abs(totalWeight - 100) > 0.01}>
                Activate
              </Button>
            )}
            {isActive && <Button onClick={onLock}>Lock for Reports</Button>}
            {isLocked && (
              <Button variant="outline" onClick={() => {
                const reason = window.prompt('Reason for unlocking:');
                if (reason) onUnlock(reason);
              }}>
                Unlock
              </Button>
            )}
            {!isLocked && (
              <Button variant="outline" onClick={() => {
                const name = window.prompt('Template name:');
                if (name) onSaveAsTemplate(name);
              }}>
                Save as Template
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="term-marks" className="mt-4">
          {termMarksTab}
        </TabsContent>

        {studentsTab && (
          <TabsContent value="students" className="mt-4">
            {studentsTab}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 7: Create the builder page**

```typescript
// src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx
'use client';

import { use } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AssessmentStructureBuilder } from '@/components/assessment-structure/AssessmentStructureBuilder';
import { useAssessmentStructureDetail } from '@/hooks/useAssessmentStructureDetail';
import { useTermMarks } from '@/hooks/useTermMarks';

export default function AssessmentStructureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const detail = useAssessmentStructureDetail(id);
  const { termMarks, loading: marksLoading, fetchTermMarks } = useTermMarks(
    detail.structure?.status !== 'draft' ? id : null,
  );

  if (detail.loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessment Structure" />
        <LoadingSpinner />
      </div>
    );
  }

  if (!detail.structure) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assessment Structure" />
        <p className="text-muted-foreground">Structure not found.</p>
      </div>
    );
  }

  const isStandalone = !detail.structure.classId;

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment Structure" />
      <AssessmentStructureBuilder
        structure={detail.structure}
        onAddCategory={detail.addCategory}
        onUpdateCategory={detail.updateCategory}
        onDeleteCategory={detail.deleteCategory}
        onAddLineItem={detail.addLineItem}
        onUpdateLineItem={detail.updateLineItem}
        onDeleteLineItem={detail.deleteLineItem}
        onActivate={detail.activate}
        onLock={detail.lock}
        onUnlock={detail.unlock}
        onSaveAsTemplate={detail.saveAsTemplate}
        termMarksTab={
          marksLoading
            ? <LoadingSpinner />
            : <p className="text-muted-foreground">Term marks view — implemented in next task.</p>
        }
        studentsTab={isStandalone ? <p className="text-muted-foreground">Student management — implemented in next task.</p> : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 8: Verify the builder page renders**

Run: `cd /c/Users/shaun/campusly-frontend && npm run dev`
Create a structure from the list page, verify it navigates to the builder and categories/line items can be added.

- [ ] **Step 9: Commit**

```bash
git add src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx src/components/assessment-structure/
git commit -m "feat(assessment-structure): add builder page with category cards, line items, and weight indicators"
```

---

## Task 13: Frontend — Term Marks Table + Mark Entry Dialog

**Files:**
- Create: `src/components/assessment-structure/TermMarksTable.tsx`
- Create: `src/components/assessment-structure/TermMarksStudentCard.tsx`
- Create: `src/components/assessment-structure/MarkEntryDialog.tsx`
- Modify: `src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx` — replace placeholder with real components

- [ ] **Step 1: Create the MarkEntryDialog**

```typescript
// src/components/assessment-structure/MarkEntryDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { StudentTermResult, TermMarkLineItem } from '@/types';

interface MarkEntry {
  studentId: string;
  studentName: string;
  mark: string;
  isAbsent: boolean;
}

interface MarkEntryDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId: string | null;
  lineItemName: string;
  totalMarks: number;
  students: StudentTermResult[];
  lineItemId: string;
  onSaved: () => void;
  structureId: string;
  categoryId: string;
  onCloseItem?: () => void;
}

export function MarkEntryDialog({
  open,
  onClose,
  assessmentId,
  lineItemName,
  totalMarks,
  students,
  lineItemId,
  onSaved,
  structureId,
  categoryId,
  onCloseItem,
}: MarkEntryDialogProps) {
  const [entries, setEntries] = useState<MarkEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !students.length) return;
    setEntries(
      students.map((s) => {
        // Find existing mark for this line item
        let existingMark: TermMarkLineItem | undefined;
        for (const cat of s.categories) {
          existingMark = cat.lineItems.find((li) => li.lineItemId === lineItemId);
          if (existingMark) break;
        }
        return {
          studentId: s.studentId,
          studentName: s.studentName,
          mark: existingMark?.mark != null ? String(existingMark.mark) : '',
          isAbsent: existingMark?.isAbsent ?? false,
        };
      }),
    );
  }, [open, students, lineItemId]);

  const updateEntry = (idx: number, field: 'mark' | 'isAbsent', value: string | boolean) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === idx
          ? {
              ...e,
              [field]: value,
              ...(field === 'isAbsent' && value === true ? { mark: '' } : {}),
            }
          : e,
      ),
    );
  };

  const handleSave = async (closeItem: boolean) => {
    if (!assessmentId) { toast.error('No assessment linked'); return; }
    try {
      setSaving(true);
      const marks = entries
        .filter((e) => e.mark !== '' || e.isAbsent)
        .map((e) => ({
          studentId: e.studentId,
          assessmentId,
          mark: e.isAbsent ? 0 : Number(e.mark),
          total: totalMarks,
          percentage: e.isAbsent ? 0 : Math.round((Number(e.mark) / totalMarks) * 100),
          isAbsent: e.isAbsent,
        }));

      await apiClient.post('/academic/marks/bulk-capture', { marks });

      if (closeItem && onCloseItem) {
        await apiClient.put(
          `/assessment-structures/${structureId}/categories/${categoryId}/line-items/${lineItemId}`,
          { status: 'closed' },
        );
        onCloseItem();
      }

      toast.success('Marks saved');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save marks'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enter Marks: {lineItemName}</DialogTitle>
          <DialogDescription>Out of {totalMarks} marks</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={entry.studentId} className="flex items-center gap-3">
                <span className="flex-1 text-sm truncate">{entry.studentName}</span>
                <Input
                  type="number"
                  className="w-20 h-8 text-sm"
                  value={entry.mark}
                  onChange={(e) => updateEntry(idx, 'mark', e.target.value)}
                  disabled={entry.isAbsent}
                  min={0}
                  max={totalMarks}
                />
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={entry.isAbsent}
                    onCheckedChange={(checked) => updateEntry(idx, 'isAbsent', !!checked)}
                  />
                  <Label className="text-xs text-muted-foreground">Absent</Label>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {onCloseItem && (
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Close Item'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the TermMarksStudentCard (mobile view)**

```typescript
// src/components/assessment-structure/TermMarksStudentCard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { StudentTermResult } from '@/types';

interface TermMarksStudentCardProps {
  student: StudentTermResult;
}

export function TermMarksStudentCard({ student }: TermMarksStudentCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="pt-4">
        <button className="w-full flex items-center gap-2" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="flex-1 text-left font-medium text-sm truncate">{student.studentName}</span>
          {student.projectedTermMark != null ? (
            <Badge variant="outline">{student.projectedTermMark}%</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </button>
        {expanded && (
          <div className="mt-3 space-y-2 pl-6">
            {student.categories.map((cat) => (
              <div key={cat.categoryId}>
                <p className="text-xs font-medium text-muted-foreground">
                  {cat.name} ({cat.weight}%) — {cat.score != null ? `${cat.score}%` : 'no data'}
                </p>
                <div className="ml-2 space-y-0.5">
                  {cat.lineItems.map((li) => (
                    <div key={li.lineItemId} className="flex justify-between text-xs">
                      <span className="truncate">{li.name}</span>
                      <span>
                        {li.isAbsent ? 'ABS' : li.percentage != null ? `${li.percentage}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create the TermMarksTable**

```typescript
// src/components/assessment-structure/TermMarksTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TermMarksStudentCard } from './TermMarksStudentCard';
import type { TermMarksResponse, StudentTermResult, CategorySummary } from '@/types';

interface TermMarksTableProps {
  data: TermMarksResponse;
  onEnterMarks: (lineItemId: string, categoryId: string, assessmentId: string, name: string, totalMarks: number) => void;
}

export function TermMarksTable({ data, onEnterMarks }: TermMarksTableProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'mark'>('name');

  const filteredStudents = useMemo(() => {
    let result = data.students;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.studentName.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'mark') {
        return (b.projectedTermMark ?? -1) - (a.projectedTermMark ?? -1);
      }
      return a.studentName.localeCompare(b.studentName);
    });
    return result;
  }, [data.students, search, sortBy]);

  // Flatten all line items for column headers
  const columns = useMemo(() => {
    const cols: Array<{
      categoryId: string;
      categoryName: string;
      categoryWeight: number;
      lineItemId: string;
      lineItemName: string;
      totalMarks: number;
      assessmentId?: string;
    }> = [];
    for (const cat of data.categories) {
      for (const li of cat.lineItems) {
        // Find assessmentId from structure — it's in the summary data
        cols.push({
          categoryId: cat.categoryId,
          categoryName: cat.name,
          categoryWeight: cat.weight,
          lineItemId: li.lineItemId,
          lineItemName: li.name,
          totalMarks: li.totalMarks,
        });
      }
    }
    return cols;
  }, [data.categories]);

  const getLineItemValue = (student: StudentTermResult, lineItemId: string) => {
    for (const cat of student.categories) {
      const li = cat.lineItems.find((l) => l.lineItemId === lineItemId);
      if (li) {
        if (li.isAbsent) return 'ABS';
        if (li.percentage != null) return `${li.percentage}%`;
        return '—';
      }
    }
    return '—';
  };

  // Calculate class averages
  const classAvg = useMemo(() => {
    if (data.students.length === 0) return null;
    const validMarks = data.students.filter((s) => s.projectedTermMark != null);
    if (validMarks.length === 0) return null;
    return Math.round(validMarks.reduce((s, st) => s + (st.projectedTermMark ?? 0), 0) / validMarks.length);
  }, [data.students]);

  return (
    <div className="space-y-4">
      {/* Completion bar */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Captured: {data.completionPercent}% of term weight</span>
        <span className="text-muted-foreground">&middot;</span>
        <span className="text-muted-foreground">{data.students.length} students</span>
        {classAvg != null && (
          <>
            <span className="text-muted-foreground">&middot;</span>
            <span className="font-medium">Class avg: {classAvg}%</span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button variant="outline" size="sm" onClick={() => setSortBy(sortBy === 'name' ? 'mark' : 'name')}>
          Sort by {sortBy === 'name' ? 'term mark' : 'name'}
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-medium">Student</th>
              {columns.map((col) => (
                <th key={col.lineItemId} className="text-center py-2 px-2 font-medium whitespace-nowrap">
                  <div className="text-xs">{col.categoryName}</div>
                  <div>{col.lineItemName}</div>
                </th>
              ))}
              <th className="text-center py-2 px-2 font-medium">Projected</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.studentId} className="border-b hover:bg-muted/50">
                <td className="py-2 px-2 truncate max-w-[180px]">{student.studentName}</td>
                {columns.map((col) => (
                  <td key={col.lineItemId} className="text-center py-2 px-2 text-muted-foreground">
                    {getLineItemValue(student, col.lineItemId)}
                  </td>
                ))}
                <td className="text-center py-2 px-2 font-medium">
                  {student.projectedTermMark != null ? (
                    <span className="text-foreground">{student.projectedTermMark}%</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filteredStudents.map((student) => (
          <TermMarksStudentCard key={student.studentId} student={student} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire up TermMarksTable and MarkEntryDialog in the builder page**

Update `src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx` to replace the placeholder `termMarksTab` with the real `TermMarksTable` and add the `MarkEntryDialog` state management. Replace the `termMarksTab` prop with:

```typescript
termMarksTab={
  marksLoading ? (
    <LoadingSpinner />
  ) : termMarks ? (
    <>
      <TermMarksTable
        data={termMarks}
        onEnterMarks={(lineItemId, categoryId, assessmentId, name, totalMarks) => {
          setMarkEntry({ lineItemId, categoryId, assessmentId, name, totalMarks });
        }}
      />
      {markEntry && (
        <MarkEntryDialog
          open={!!markEntry}
          onClose={() => setMarkEntry(null)}
          assessmentId={markEntry.assessmentId}
          lineItemName={markEntry.name}
          totalMarks={markEntry.totalMarks}
          students={termMarks.students}
          lineItemId={markEntry.lineItemId}
          structureId={id}
          categoryId={markEntry.categoryId}
          onSaved={() => { fetchTermMarks(); detail.fetchStructure(); }}
          onCloseItem={() => detail.updateLineItem(markEntry.categoryId, markEntry.lineItemId, { status: 'closed' })}
        />
      )}
    </>
  ) : (
    <p className="text-muted-foreground">Activate the structure to see term marks.</p>
  )
}
```

Add the state and imports at the top of the page component:

```typescript
const [markEntry, setMarkEntry] = useState<{
  lineItemId: string;
  categoryId: string;
  assessmentId: string;
  name: string;
  totalMarks: number;
} | null>(null);
```

- [ ] **Step 5: Verify everything renders end-to-end**

Run: `cd /c/Users/shaun/campusly-frontend && npm run dev`
1. Create a structure
2. Add categories and line items
3. Activate
4. Switch to Term Marks tab — should show the table
5. Enter marks via the dialog

- [ ] **Step 6: Commit**

```bash
git add src/components/assessment-structure/TermMarksTable.tsx src/components/assessment-structure/TermMarksStudentCard.tsx src/components/assessment-structure/MarkEntryDialog.tsx src/app/(dashboard)/teacher/curriculum/assessment-structure/[id]/page.tsx
git commit -m "feat(assessment-structure): add term marks table, mobile cards, and mark entry dialog"
```

---

## Task 14: Frontend — Template, Clone, Lock Validation, and Student Manager Dialogs

**Files:**
- Create: `src/components/assessment-structure/TemplateSelectDialog.tsx`
- Create: `src/components/assessment-structure/CloneStructureDialog.tsx`
- Create: `src/components/assessment-structure/LockValidationDialog.tsx`
- Create: `src/components/assessment-structure/StudentManager.tsx`
- Modify: list page and builder page to wire in these components

- [ ] **Step 1: Create the TemplateSelectDialog**

```typescript
// src/components/assessment-structure/TemplateSelectDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { AssessmentStructure, FromTemplatePayload } from '@/types';

interface TemplateSelectDialogProps {
  open: boolean;
  onClose: () => void;
  templates: AssessmentStructure[];
  onUseTemplate: (templateId: string, payload: FromTemplatePayload) => Promise<unknown>;
}

const currentYear = new Date().getFullYear();

export function TemplateSelectDialog({ open, onClose, templates, onUseTemplate }: TemplateSelectDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [term, setTerm] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setSelectedId(null); setName(''); setSubjectName(''); setTerm(''); setYear(String(currentYear)); }
  }, [open]);

  const selected = templates.find((t) => t.id === selectedId);

  useEffect(() => {
    if (selected) {
      setSubjectName(selected.subjectName);
      setName(`${selected.subjectName} Term ${term || '?'} ${year}`);
    }
  }, [selected, term, year]);

  const handleSubmit = async () => {
    if (!selectedId || !name || !subjectName || !term) return;
    try {
      setSubmitting(true);
      await onUseTemplate(selectedId, {
        name, subjectName, term: Number(term), academicYear: Number(year),
      });
      onClose();
    } catch { /* toasted */ } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Use Template</DialogTitle>
          <DialogDescription>Select a saved template and configure for a new term.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {!selectedId ? (
            <div className="space-y-2">
              {templates.length === 0 && <p className="text-sm text-muted-foreground">No templates saved yet.</p>}
              {templates.map((t) => (
                <Card key={t.id} className="cursor-pointer hover:ring-2 hover:ring-primary/20" onClick={() => setSelectedId(t.id)}>
                  <CardContent className="py-3">
                    <p className="font-medium text-sm">{t.templateName ?? t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.subjectName} &middot; {t.categories.length} categories</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">Template: <strong>{selected?.templateName}</strong></p>
              <div className="space-y-2">
                <Label>Structure Name <span className="text-destructive">*</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Term <span className="text-destructive">*</span></Label>
                  <Select value={term} onValueChange={(v: unknown) => setTerm(v as string)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Term" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {selectedId && <Button variant="outline" onClick={() => setSelectedId(null)}>Back</Button>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {selectedId && (
            <Button onClick={handleSubmit} disabled={submitting || !name || !term}>
              {submitting ? 'Creating...' : 'Create from Template'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the CloneStructureDialog**

```typescript
// src/components/assessment-structure/CloneStructureDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import type { ClonePayload } from '@/types';

interface CloneStructureDialogProps {
  open: boolean;
  onClose: () => void;
  onClone: (payload: ClonePayload) => Promise<unknown>;
  currentName: string;
}

const currentYear = new Date().getFullYear();

export function CloneStructureDialog({ open, onClose, onClone, currentName }: CloneStructureDialogProps) {
  const [name, setName] = useState('');
  const [term, setTerm] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setName(`${currentName} (copy)`); setTerm(''); setYear(String(currentYear)); }
  }, [open, currentName]);

  const handleSubmit = async () => {
    if (!term) return;
    try {
      setSubmitting(true);
      await onClone({ name, term: Number(term), academicYear: Number(year) });
      onClose();
    } catch { /* toasted */ } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Structure</DialogTitle>
          <DialogDescription>Create a copy for a different term or year.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Term <span className="text-destructive">*</span></Label>
              <Select value={term} onValueChange={(v: unknown) => setTerm(v as string)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((t) => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !term}>
            {submitting ? 'Cloning...' : 'Clone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create the LockValidationDialog**

```typescript
// src/components/assessment-structure/LockValidationDialog.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import type { LockError } from '@/types';

interface LockValidationDialogProps {
  open: boolean;
  onClose: () => void;
  errors: LockError[];
}

export function LockValidationDialog({ open, onClose, errors }: LockValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cannot Lock — Missing Marks
          </DialogTitle>
          <DialogDescription>The following assessments have incomplete marks.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4 max-h-60 overflow-y-auto">
          {errors.map((err, i) => (
            <div key={i} className="text-sm">
              <p className="font-medium">{err.lineItem}</p>
              <p className="text-muted-foreground">
                {err.missingCount} student{err.missingCount > 1 ? 's' : ''} missing marks
              </p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create the StudentManager component**

```typescript
// src/components/assessment-structure/StudentManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UserPlus } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { EmptyState } from '@/components/shared/EmptyState';

interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
}

interface StudentManagerProps {
  studentIds: string[];
  onAdd: (ids: string[]) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function StudentManager({ studentIds, onAdd, onRemove }: StudentManagerProps) {
  const [allStudents, setAllStudents] = useState<SimpleStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/students');
        setAllStudents(unwrapList<SimpleStudent>(res));
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const enrolled = allStudents.filter((s) => studentIds.includes(s.id));
  const available = allStudents.filter((s) => !studentIds.includes(s.id));

  if (loading) return <p className="text-sm text-muted-foreground">Loading students...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrolled Students ({enrolled.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {enrolled.length === 0 ? (
            <EmptyState icon={UserPlus} title="No students" description="Add students to this structure." />
          ) : (
            <div className="space-y-1">
              {enrolled.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="text-sm">{s.firstName} {s.lastName}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onRemove(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {available.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Available Students</CardTitle>
              <Button size="sm" onClick={() => onAdd(available.map((s) => s.id))}>Add All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {available.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                  <span className="text-sm">{s.firstName} {s.lastName}</span>
                  <Button variant="ghost" size="sm" className="h-6" onClick={() => onAdd([s.id])}>Add</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire TemplateSelectDialog into the list page**

In the list page, add template button and dialog. Import `TemplateSelectDialog` and add state for `templateOpen`. Add a "Use Template" button next to "Create New" and render the dialog:

```typescript
<TemplateSelectDialog
  open={templateOpen}
  onClose={() => setTemplateOpen(false)}
  templates={templates}
  onUseTemplate={createFromTemplate}
/>
```

Call `fetchTemplates()` in a `useEffect` when `templateOpen` becomes true.

- [ ] **Step 6: Wire CloneStructureDialog, LockValidationDialog, and StudentManager into the builder page**

Update the builder page to:
- Import and render `CloneStructureDialog` (triggered from builder's "Clone to..." button)
- Import and render `LockValidationDialog` (shown when `detail.lockErrors` is non-null)
- Pass `StudentManager` as `studentsTab` for standalone teachers

- [ ] **Step 7: Verify full end-to-end flow**

Run: `cd /c/Users/shaun/campusly-frontend && npm run dev`
Test: create → add categories → add line items → activate → enter marks → lock → unlock → save as template → use template → clone.

- [ ] **Step 8: Commit**

```bash
git add src/components/assessment-structure/ src/app/(dashboard)/teacher/curriculum/assessment-structure/
git commit -m "feat(assessment-structure): add template, clone, lock validation, and student manager dialogs"
```

---

## Task 15: Backend — Export Endpoint

**Files:**
- Modify: `src/modules/AssessmentStructure/controllers/term-marks.controller.ts` (in campusly-backend)
- Modify: `src/modules/AssessmentStructure/routes.ts` (in campusly-backend)

- [ ] **Step 1: Add export handler to term-marks controller**

Add to `TermMarksController`:

```typescript
static async exportTermMarks(req: Request, res: Response): Promise<void> {
  const format = (req.query.format as string) || 'csv';
  const result = await CalculationService.getTermMarks(req.params.id, getTenant(req));

  if (format === 'csv') {
    // Build CSV
    const headers = ['Student'];
    for (const cat of result.categories) {
      for (const li of cat.lineItems) {
        headers.push(`${cat.name} - ${li.name}`);
      }
    }
    headers.push('Projected Term Mark', 'Achievement Level');

    const rows = result.students.map((s) => {
      const cols: string[] = [s.studentName];
      for (const cat of s.categories) {
        for (const li of cat.lineItems) {
          cols.push(li.isAbsent ? 'ABS' : li.percentage != null ? String(li.percentage) : '');
        }
      }
      cols.push(s.projectedTermMark != null ? String(s.projectedTermMark) : '');
      cols.push(s.achievementLevel ? `${s.achievementLevel.level} - ${s.achievementLevel.description}` : '');
      return cols.join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.structureName}.csv"`);
    res.send(csv);
  } else {
    // PDF export — return JSON for now, implement PDF generation as a follow-up
    res.status(501).json(apiResponse(false, null, undefined, 'PDF export not yet implemented'));
  }
}
```

- [ ] **Step 2: Add export route**

In `routes.ts`, add after the term-marks routes:

```typescript
router.get('/:id/export', authenticate, authorize(...roles), TermMarksController.exportTermMarks);
```

- [ ] **Step 3: Verify compilation and commit**

```bash
cd /c/Users/shaun/campusly-backend && npx tsc --noEmit
git add src/modules/AssessmentStructure/controllers/term-marks.controller.ts src/modules/AssessmentStructure/routes.ts
git commit -m "feat(assessment-structure): add CSV export endpoint"
```

---

## Task 16: Frontend — Weight Change Warning

**Files:**
- Modify: `src/components/assessment-structure/CategoryCard.tsx` (in campusly-frontend)

- [ ] **Step 1: Add weight edit with confirmation**

In `CategoryCard.tsx`, add inline weight editing. When the structure is active and marks exist (any line item has status !== 'pending'), show a confirm dialog before applying the weight change:

```typescript
// Add to CategoryCard — replace the static weight display with an editable one when not locked
const [editingWeight, setEditingWeight] = useState(false);
const [newWeight, setNewWeight] = useState(String(category.weight));

const hasMarks = category.lineItems.some((li) => li.status !== 'pending');

const handleWeightSave = async () => {
  const w = Number(newWeight);
  if (isNaN(w) || w < 0 || w > 100) return;

  if (structureStatus === 'active' && hasMarks) {
    const confirmed = window.confirm(
      `Changing this weight will recalculate all projected term marks. Students have marks captured in this category. Continue?`
    );
    if (!confirmed) { setNewWeight(String(category.weight)); setEditingWeight(false); return; }
  }

  await onUpdateCategory({ weight: w });
  setEditingWeight(false);
};
```

Replace the static `<span>{category.weight}%</span>` with a clickable/editable version that uses this logic.

- [ ] **Step 2: Commit**

```bash
git add src/components/assessment-structure/CategoryCard.tsx
git commit -m "feat(assessment-structure): add weight change warning when marks exist"
```

---

## Task 17: Final Integration Verification

- [ ] **Step 1: Run the frontend linter**

Run: `cd /c/Users/shaun/campusly-frontend && npx next lint`
Fix any lint errors.

- [ ] **Step 2: Run the frontend type checker**

Run: `cd /c/Users/shaun/campusly-frontend && npx tsc --noEmit`
Fix any type errors.

- [ ] **Step 3: Run the backend type checker**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`
Fix any type errors.

- [ ] **Step 4: Verify all files are under 350 lines**

Check each new component file:
```bash
wc -l src/components/assessment-structure/*.tsx src/hooks/useAssessmentStructure*.ts src/hooks/useTermMarks.ts
```
Any file over 350 lines must be split.

- [ ] **Step 5: Verify CLAUDE.md compliance audit**

Run through the pre-commit checklist from CLAUDE.md:
1. No `apiClient` import in any page or component file (except hooks and StudentManager which fetches student list — refactor to a hook if flagged)
2. No `any` types
3. No `text-red-*` — use `text-destructive`
4. No untyped `catch (err)` — all must be `catch (err: unknown)`
5. All grids have mobile breakpoints
6. All fixed widths are responsive
7. All dialogs use flex-col pattern with sticky footer
8. All files under 350 lines
9. Empty state + loading state exist for every data view

- [ ] **Step 6: Fix any violations found**

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "fix(assessment-structure): address lint, type, and CLAUDE.md compliance issues"
```
