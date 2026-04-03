# Textbook / CourseBook Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Textbook model that wraps existing ContentResources into a structured, sequential book with chapters. Admin/teacher authoring view, student book reader, and AI-assisted chapter content generation.

**Architecture:** New `Textbook` model with `Chapter` subdocuments that reference ordered ContentResource arrays. Thin wrapper — no content duplication, chapters point to existing resources. Student reader provides sequential navigation through chapters.

**Tech Stack:** Mongoose/MongoDB, Zod v4, Express, React 19 / Next.js, Tailwind CSS 4, shadcn.

---

## File Structure

### Backend — `campusly-backend/src/modules/Textbook/`

| File | Responsibility |
|------|---------------|
| `model.ts` | Textbook + Chapter schemas |
| `validation.ts` | Zod schemas for CRUD, chapter management |
| `service.ts` | Textbook CRUD, chapter ordering, publish workflow |
| `controller.ts` | HTTP handlers |
| `routes.ts` | Express router |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/types/textbook.ts` | TypeScript types |
| `src/hooks/useTextbooks.ts` | API calls |
| `src/components/textbook/TextbookCard.tsx` | Card showing textbook cover info |
| `src/components/textbook/ChapterList.tsx` | Ordered chapter list with add/remove/reorder |
| `src/components/textbook/TextbookFormDialog.tsx` | Create/edit textbook metadata |
| `src/components/textbook/ChapterFormDialog.tsx` | Add/edit chapter with resource selection |
| `src/app/(dashboard)/admin/curriculum/textbooks/page.tsx` | Admin textbook management |
| `src/app/(dashboard)/student/learn/textbooks/page.tsx` | Student textbook browser |
| `src/app/(dashboard)/student/learn/textbooks/[textbookId]/page.tsx` | Student book reader |

---

## Task 1: Backend — Textbook Model

**Files:**
- Create: `campusly-backend/src/modules/Textbook/model.ts`

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type TextbookStatus = 'draft' | 'published' | 'archived';

// ─── ChapterResource (subdoc) ────────────────────────────────────────────────

export interface IChapterResource {
  resourceId: Types.ObjectId;
  order: number;
}

const chapterResourceSchema = new Schema<IChapterResource>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: 'ContentResource', required: true },
    order: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

// ─── Chapter (subdoc) ────────────────────────────────────────────────────────

export interface IChapter {
  title: string;
  description: string;
  curriculumNodeId: Types.ObjectId | null;
  order: number;
  resources: IChapterResource[];
}

const chapterSchema = new Schema<IChapter>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', default: null },
    order: { type: Number, required: true, default: 0 },
    resources: { type: [chapterResourceSchema], default: [] },
  },
  { _id: true },
);

// ─── Textbook ────────────────────────────────────────────────────────────────

export interface ITextbook extends Document {
  title: string;
  description: string;
  frameworkId: Types.ObjectId;
  subjectId: Types.ObjectId;
  gradeId: Types.ObjectId;
  coverImageUrl: string;
  chapters: IChapter[];
  status: TextbookStatus;
  schoolId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const textbookSchema = new Schema<ITextbook>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'CurriculumFramework', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    coverImageUrl: { type: String, default: '' },
    chapters: { type: [chapterSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

textbookSchema.index({ schoolId: 1, status: 1, isDeleted: 1 });
textbookSchema.index({ subjectId: 1, gradeId: 1, isDeleted: 1 });
textbookSchema.index({ frameworkId: 1, isDeleted: 1 });

export const Textbook = mongoose.model<ITextbook>('Textbook', textbookSchema);
```

Commit: `git commit -m "feat(textbook): add Textbook model with chapters and resource ordering"`

---

## Task 2: Backend — Validation + Service

**Files:**
- Create: `campusly-backend/src/modules/Textbook/validation.ts`
- Create: `campusly-backend/src/modules/Textbook/service.ts`

**Validation schemas:**
- `createTextbookSchema`: title, description, frameworkId, subjectId, gradeId, coverImageUrl
- `updateTextbookSchema`: partial of title, description, coverImageUrl, status
- `addChapterSchema`: title, description, curriculumNodeId (nullable), order
- `updateChapterSchema`: partial of title, description, order
- `addResourceToChapterSchema`: resourceId, order
- `textbookQuerySchema`: frameworkId, subjectId, gradeId, status, search, page, limit
- `publishTextbookSchema`: {} (empty)

**Service methods:**
- `listTextbooks(schoolId, filters)` — system (schoolId:null) published + school textbooks visible
- `getTextbook(id, schoolId)` — with populated chapters.resources.resourceId and chapters.curriculumNodeId
- `createTextbook(schoolId, userId, data)` — creates draft
- `updateTextbook(id, schoolId, userId, data)` — metadata updates
- `deleteTextbook(id, schoolId, userId)` — soft delete
- `addChapter(id, schoolId, userId, data)` — add chapter to textbook
- `updateChapter(id, schoolId, userId, chapterId, data)` — update chapter metadata
- `removeChapter(id, schoolId, userId, chapterId)` — remove chapter
- `addResourceToChapter(id, schoolId, userId, chapterId, data)` — add ContentResource ref to chapter
- `removeResourceFromChapter(id, schoolId, userId, chapterId, resourceId)` — remove resource ref
- `reorderChapters(id, schoolId, userId, chapterIds)` — reorder chapters
- `publishTextbook(id, schoolId, userId)` — draft → published (must have at least 1 chapter with resources)

Commit: `git commit -m "feat(textbook): add validation schemas and TextbookService"`

---

## Task 3: Backend — Controller + Routes + Registration

**Files:**
- Create: `campusly-backend/src/modules/Textbook/controller.ts`
- Create: `campusly-backend/src/modules/Textbook/routes.ts`
- Modify: `campusly-backend/src/app.ts`

**Routes at `/api/textbooks`:**
- GET `/` — list textbooks (READ_ROLES)
- GET `/:id` — get textbook (READ_ROLES + student)
- POST `/` — create (ADMIN_ROLES)
- PUT `/:id` — update metadata (ADMIN_ROLES)
- DELETE `/:id` — soft delete (ADMIN_ROLES)
- POST `/:id/chapters` — add chapter (ADMIN_ROLES)
- PUT `/:id/chapters/:chapterId` — update chapter (ADMIN_ROLES)
- DELETE `/:id/chapters/:chapterId` — remove chapter (ADMIN_ROLES)
- POST `/:id/chapters/:chapterId/resources` — add resource to chapter (ADMIN_ROLES)
- DELETE `/:id/chapters/:chapterId/resources/:resourceId` — remove resource (ADMIN_ROLES)
- PUT `/:id/chapters/reorder` — reorder chapters (ADMIN_ROLES)
- POST `/:id/publish` — publish textbook (ADMIN_ROLES)

STUDENT_ROLES for GET endpoints (students can browse/read published textbooks).

Register: `app.use('/api/textbooks', authenticate, textbookRoutes);`

Commit: `git commit -m "feat(textbook): add controller, routes, and register /api/textbooks"`

---

## Task 4: Frontend — Types + Hook

**Files:**
- Create: `campusly-frontend/src/types/textbook.ts`
- Create: `campusly-frontend/src/hooks/useTextbooks.ts`
- Modify: `campusly-frontend/src/types/index.ts`

**Types:**
- TextbookStatus, ChapterResourceItem, ChapterItem, TextbookItem (with populated refs)
- Payloads: CreateTextbook, UpdateTextbook, AddChapter, UpdateChapter, AddResourceToChapter
- TextbookFilters

**Hook methods:**
- fetchTextbooks, getTextbook, createTextbook, updateTextbook, deleteTextbook
- addChapter, updateChapter, removeChapter, reorderChapters
- addResourceToChapter, removeResourceFromChapter
- publishTextbook

Commit: `git commit -m "feat(textbook): add frontend types and useTextbooks hook"`

---

## Task 5: Frontend — TextbookCard + TextbookFormDialog

**Files:**
- Create: `campusly-frontend/src/components/textbook/TextbookCard.tsx`
- Create: `campusly-frontend/src/components/textbook/TextbookFormDialog.tsx`

**TextbookCard:** Shows title, subject/grade badges, chapter count, status badge, framework badge, description truncated. Click handler.

**TextbookFormDialog:** Create/edit dialog with: title, description, framework selector, subject selector, grade selector, cover image URL. Uses react-hook-form.

Commit: `git commit -m "feat(textbook): add TextbookCard and TextbookFormDialog components"`

---

## Task 6: Frontend — ChapterList + ChapterFormDialog

**Files:**
- Create: `campusly-frontend/src/components/textbook/ChapterList.tsx`
- Create: `campusly-frontend/src/components/textbook/ChapterFormDialog.tsx`

**ChapterList:** Ordered list of chapters with: title, description, resource count, curriculum node reference, move up/down buttons, edit/delete buttons, "Add Resource" button per chapter. Expandable to show resources within each chapter.

**ChapterFormDialog:** Add/edit chapter with: title, description, curriculum node picker (optional). Uses react-hook-form.

Commit: `git commit -m "feat(textbook): add ChapterList and ChapterFormDialog components"`

---

## Task 7: Frontend — Admin Textbook Management Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/admin/curriculum/textbooks/page.tsx`

Admin page with:
1. PageHeader with Book icon
2. Filters: framework, subject, grade, status, search
3. "Create Textbook" button
4. Grid of TextbookCards
5. Click navigates to textbook detail/editor (inline on same page or separate route)

For the detail view: show textbook metadata + ChapterList. Ability to add chapters, add resources to chapters (using a resource search similar to QuestionSearchPanel but for ContentResources), reorder, publish.

Since this page needs both list and detail views, use a state toggle: `selectedTextbook` — null shows list, set shows detail editor.

Commit: `git commit -m "feat(textbook): add admin textbook management page"`

---

## Task 8: Frontend — Student Textbook Browser + Reader

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/student/learn/textbooks/page.tsx`
- Create: `campusly-frontend/src/app/(dashboard)/student/learn/textbooks/[textbookId]/page.tsx`

**Browser:** Grid of published textbooks as cards. Filter by subject/grade. Click navigates to reader.

**Reader:**
1. Load textbook with populated chapters and resources
2. Sidebar: table of contents (chapter list, clickable)
3. Main area: selected chapter's resources rendered via BlockRenderer
4. Previous/Next navigation between chapters
5. Progress indicator (chapters completed)
6. Mobile: collapsible sidebar

Commit: `git commit -m "feat(textbook): add student textbook browser and book reader"`

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | Textbook + Chapter models | Backend |
| 2 | Validation + TextbookService | Backend |
| 3 | Controller + routes + registration | Backend |
| 4 | Types + useTextbooks hook | Frontend |
| 5 | TextbookCard + TextbookFormDialog | Frontend |
| 6 | ChapterList + ChapterFormDialog | Frontend |
| 7 | Admin textbook management page | Frontend |
| 8 | Student textbook browser + reader | Frontend |
