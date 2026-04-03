# Content Library Phase 2a — Backend + Teacher Content UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ContentResource + ContentBlock backend module with CRUD, review workflow, and teacher-facing content browsing/creation UI. AI generation and student-facing interactive views are deferred to Phase 2b.

**Architecture:** New `ContentLibrary` backend module with `ContentResource` document containing `ContentBlock[]` subdocument array. Review workflow (draft → pending_review → approved/rejected) with role-based access. Frontend gets teacher content browser page and block-based content editor.

**Tech Stack:** Mongoose/MongoDB (backend), Zod v4 (validation), Express (routes), Anthropic SDK (AI generation via existing AIService), React 19 / Next.js (frontend), Tailwind CSS 4, shadcn components.

**Spec:** `docs/superpowers/specs/2026-04-03-curriculum-content-engine-design.md` — Layer 2

**Phase 2a scope:** Backend models, CRUD services, review workflow, AI generation service, teacher content browser, block editor, HOD review queue.
**Deferred to Phase 2b:** Student interactive block renderers, StudentAttempt tracking, StudentMastery aggregation, student/parent views.

---

## File Structure

### Backend — `campusly-backend/src/modules/ContentLibrary/`

| File | Responsibility |
|------|---------------|
| `model.ts` | ContentResource + ContentBlock Mongoose schemas |
| `validation.ts` | Zod schemas for create/update resource, review, query filters |
| `service-resources.ts` | Resource CRUD with role-based visibility, pagination, filtering |
| `service-review.ts` | Review workflow (submit, approve, reject) |
| `service-generation.ts` | AI content generation via Anthropic SDK |
| `controller.ts` | HTTP handlers |
| `routes.ts` | Express router with role-based auth |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/types/content-library.ts` | TypeScript types for ContentResource, ContentBlock, payloads |
| `src/hooks/useContentLibrary.ts` | API calls for resources (CRUD, review, generate) |
| `src/components/content/ResourceCard.tsx` | Card showing resource title, type, status, node |
| `src/components/content/ResourceList.tsx` | Filterable grid of ResourceCards |
| `src/components/content/BlockEditor.tsx` | Block-based editor — add/remove/reorder blocks |
| `src/components/content/BlockEditorItem.tsx` | Single block editing UI (type-specific fields) |
| `src/components/content/ResourceFormDialog.tsx` | Create resource dialog (metadata + initial blocks) |
| `src/components/content/ReviewDialog.tsx` | HOD approve/reject dialog with notes |
| `src/app/(dashboard)/teacher/curriculum/content/page.tsx` | Teacher content browser |
| `src/app/(dashboard)/hod/curriculum/reviews/page.tsx` | HOD review queue |

---

## Task 1: Backend — ContentResource + ContentBlock Models

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/model.ts`

- [ ] **Step 1: Create the model file**

```typescript
// campusly-backend/src/modules/ContentLibrary/model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ResourceType = 'lesson' | 'study_notes' | 'worksheet' | 'worked_example' | 'activity';
export type ResourceFormat = 'static' | 'interactive';
export type ResourceSource = 'oer' | 'ai_generated' | 'teacher' | 'system';
export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type BlockType =
  | 'text'
  | 'image'
  | 'video'
  | 'quiz'
  | 'drag_drop'
  | 'fill_blank'
  | 'match_columns'
  | 'ordering'
  | 'hotspot'
  | 'step_reveal'
  | 'code';

// ─── ContentBlock (subdocument) ──────────────────────────────────────────────

export interface ICognitiveLevel {
  caps: string;
  blooms: string;
}

export interface IContentBlock {
  blockId: string;
  type: BlockType;
  order: number;
  content: string;
  curriculumNodeId: Types.ObjectId | null;
  cognitiveLevel: ICognitiveLevel | null;
  points: number;
  hints: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

const cognitiveLevelSchema = new Schema<ICognitiveLevel>(
  {
    caps: { type: String, default: '' },
    blooms: { type: String, default: '' },
  },
  { _id: false },
);

const contentBlockSchema = new Schema<IContentBlock>(
  {
    blockId: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'quiz', 'drag_drop', 'fill_blank',
        'match_columns', 'ordering', 'hotspot', 'step_reveal', 'code'],
      required: true,
    },
    order: { type: Number, required: true, default: 0 },
    content: { type: String, default: '' },
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', default: null },
    cognitiveLevel: { type: cognitiveLevelSchema, default: null },
    points: { type: Number, default: 0 },
    hints: { type: [String], default: [] },
    explanation: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

// ─── ContentResource ─────────────────────────────────────────────────────────

export interface IContentResource extends Document {
  curriculumNodeId: Types.ObjectId;
  schoolId: Types.ObjectId | null;
  type: ResourceType;
  format: ResourceFormat;
  title: string;
  blocks: IContentBlock[];
  source: ResourceSource;
  sourceAttribution: string;
  gradeId: Types.ObjectId;
  subjectId: Types.ObjectId;
  term: number;
  tags: string[];
  status: ResourceStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewNotes: string;
  createdBy: Types.ObjectId;
  aiModel: string;
  aiPrompt: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  difficulty: number;
  estimatedMinutes: number;
  prerequisites: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contentResourceSchema = new Schema<IContentResource>(
  {
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    type: {
      type: String,
      enum: ['lesson', 'study_notes', 'worksheet', 'worked_example', 'activity'],
      required: true,
    },
    format: {
      type: String,
      enum: ['static', 'interactive'],
      default: 'static',
    },
    title: { type: String, required: true, trim: true },
    blocks: { type: [contentBlockSchema], default: [] },
    source: {
      type: String,
      enum: ['oer', 'ai_generated', 'teacher', 'system'],
      default: 'teacher',
    },
    sourceAttribution: { type: String, default: '' },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    term: { type: Number, required: true, min: 1, max: 4 },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aiModel: { type: String, default: '' },
    aiPrompt: { type: String, default: '' },
    downloads: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    difficulty: { type: Number, default: 3, min: 1, max: 5 },
    estimatedMinutes: { type: Number, default: 0 },
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'CurriculumNode' }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes
contentResourceSchema.index({ schoolId: 1, status: 1, isDeleted: 1 });
contentResourceSchema.index({ curriculumNodeId: 1, isDeleted: 1 });
contentResourceSchema.index({ createdBy: 1, status: 1, isDeleted: 1 });
contentResourceSchema.index({ subjectId: 1, gradeId: 1, term: 1, isDeleted: 1 });
contentResourceSchema.index({ tags: 1 });

export const ContentResource = mongoose.model<IContentResource>(
  'ContentResource',
  contentResourceSchema,
);
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/ContentLibrary/model.ts`

- [ ] **Step 3: Commit**

```bash
git add src/modules/ContentLibrary/model.ts
git commit -m "feat(content-library): add ContentResource and ContentBlock models"
```

---

## Task 2: Backend — Validation Schemas

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/validation.ts`

- [ ] **Step 1: Create validation schemas**

```typescript
// campusly-backend/src/modules/ContentLibrary/validation.ts
import { z } from 'zod/v4';
import { objectIdSchema } from '../../common/validation.js';

// ─── Enums ───────────────────────────────────────────────────────────────────

const resourceTypeEnum = z.enum(['lesson', 'study_notes', 'worksheet', 'worked_example', 'activity']);
const resourceFormatEnum = z.enum(['static', 'interactive']);
const resourceSourceEnum = z.enum(['oer', 'ai_generated', 'teacher', 'system']);
const blockTypeEnum = z.enum([
  'text', 'image', 'video', 'quiz', 'drag_drop', 'fill_blank',
  'match_columns', 'ordering', 'hotspot', 'step_reveal', 'code',
]);

// ─── Cognitive Level ─────────────────────────────────────────────────────────

const cognitiveLevelSchema = z.object({
  caps: z.string().default(''),
  blooms: z.string().default(''),
}).strict();

// ─── Content Block ───────────────────────────────────────────────────────────

const contentBlockSchema = z.object({
  blockId: z.string().min(1),
  type: blockTypeEnum,
  order: z.number().int().min(0).default(0),
  content: z.string().default(''),
  curriculumNodeId: objectIdSchema.nullable().default(null),
  cognitiveLevel: cognitiveLevelSchema.nullable().default(null),
  points: z.number().min(0).default(0),
  hints: z.array(z.string()).default([]),
  explanation: z.string().default(''),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

// ─── Create Resource ─────────────────────────────────────────────────────────

export const createResourceSchema = z.object({
  curriculumNodeId: objectIdSchema,
  type: resourceTypeEnum,
  format: resourceFormatEnum.default('static'),
  title: z.string().min(1, 'Title is required').trim(),
  blocks: z.array(contentBlockSchema).default([]),
  source: resourceSourceEnum.default('teacher'),
  sourceAttribution: z.string().default(''),
  gradeId: objectIdSchema,
  subjectId: objectIdSchema,
  term: z.number().int().min(1).max(4),
  tags: z.array(z.string()).default([]),
  difficulty: z.number().int().min(1).max(5).default(3),
  estimatedMinutes: z.number().int().min(0).default(0),
  prerequisites: z.array(objectIdSchema).default([]),
}).strict();

// ─── Update Resource ─────────────────────────────────────────────────────────

export const updateResourceSchema = z.object({
  title: z.string().min(1).trim().optional(),
  blocks: z.array(contentBlockSchema).optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  prerequisites: z.array(objectIdSchema).optional(),
  format: resourceFormatEnum.optional(),
}).strict();

// ─── Review ──────────────────────────────────────────────────────────────────

export const reviewResourceSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().default(''),
}).strict();

// ─── Submit for Review ───────────────────────────────────────────────────────

export const submitForReviewSchema = z.object({}).strict();

// ─── Generate Content ────────────────────────────────────────────────────────

export const generateContentSchema = z.object({
  curriculumNodeId: objectIdSchema,
  type: resourceTypeEnum,
  gradeId: objectIdSchema,
  subjectId: objectIdSchema,
  term: z.number().int().min(1).max(4),
  blockTypes: z.array(blockTypeEnum).min(1, 'At least one block type is required'),
  difficulty: z.number().int().min(1).max(5).default(3),
  instructions: z.string().default(''),
}).strict();

// ─── Query ───────────────────────────────────────────────────────────────────

export const resourceQuerySchema = z.object({
  curriculumNodeId: objectIdSchema.optional(),
  type: resourceTypeEnum.optional(),
  format: resourceFormatEnum.optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  subjectId: objectIdSchema.optional(),
  gradeId: objectIdSchema.optional(),
  term: z.coerce.number().int().min(1).max(4).optional(),
  search: z.string().optional(),
  source: resourceSourceEnum.optional(),
  mine: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ReviewResourceInput = z.infer<typeof reviewResourceSchema>;
export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/ContentLibrary/validation.ts`

- [ ] **Step 3: Commit**

```bash
git add src/modules/ContentLibrary/validation.ts
git commit -m "feat(content-library): add Zod validation schemas for resources, blocks, and generation"
```

---

## Task 3: Backend — Resource Service

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/service-resources.ts`

- [ ] **Step 1: Create the resource CRUD service**

```typescript
// campusly-backend/src/modules/ContentLibrary/service-resources.ts
import mongoose from 'mongoose';
import { ContentResource } from './model.js';
import { NotFoundError, ForbiddenError } from '../../common/errors.js';
import { paginationHelper } from '../../common/utils.js';
import type { CreateResourceInput, UpdateResourceInput, ResourceQueryInput } from './validation.js';

export class ResourcesService {
  static async listResources(
    schoolId: string,
    userId: string,
    userRole: string,
    filters: ResourceQueryInput,
  ) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const query: Record<string, unknown> = { isDeleted: false };

    // Visibility rules:
    // - System-wide (schoolId: null) approved resources visible to all
    // - School approved resources visible to all in school
    // - Own drafts visible to creator
    // - HOD/admin see pending_review in their school
    if (filters.mine) {
      query.createdBy = new mongoose.Types.ObjectId(userId);
    } else if (filters.status === 'pending_review') {
      query.schoolId = soid;
      query.status = 'pending_review';
    } else {
      query.$or = [
        { schoolId: null, status: 'approved' },
        { schoolId: soid, status: 'approved' },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ];
    }

    if (filters.curriculumNodeId) {
      query.curriculumNodeId = new mongoose.Types.ObjectId(filters.curriculumNodeId);
    }
    if (filters.type) query.type = filters.type;
    if (filters.format) query.format = filters.format;
    if (filters.status && !filters.mine) query.status = filters.status;
    if (filters.subjectId) query.subjectId = new mongoose.Types.ObjectId(filters.subjectId);
    if (filters.gradeId) query.gradeId = new mongoose.Types.ObjectId(filters.gradeId);
    if (filters.term) query.term = filters.term;
    if (filters.source) query.source = filters.source;
    if (filters.search) {
      query.title = { $regex: filters.search, $options: 'i' };
    }

    const { skip, limit } = paginationHelper(filters.page, filters.limit);

    const [resources, total] = await Promise.all([
      ContentResource.find(query)
        .select('-blocks -aiPrompt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('curriculumNodeId', 'title code type')
        .populate('subjectId', 'name')
        .populate('gradeId', 'name level')
        .populate('createdBy', 'firstName lastName')
        .lean(),
      ContentResource.countDocuments(query),
    ]);

    return { resources, total, page: filters.page ?? 1, limit };
  }

  static async getResource(id: string, schoolId: string, userId: string) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);
    const uid = new mongoose.Types.ObjectId(userId);

    const resource = await ContentResource.findOne({
      _id: oid,
      isDeleted: false,
      $or: [
        { schoolId: null, status: 'approved' },
        { schoolId: soid, status: 'approved' },
        { createdBy: uid },
        { schoolId: soid, status: 'pending_review' },
      ],
    })
      .populate('curriculumNodeId', 'title code type')
      .populate('subjectId', 'name')
      .populate('gradeId', 'name level')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .lean();

    if (!resource) throw new NotFoundError('Content resource not found');
    return resource;
  }

  static async createResource(schoolId: string, userId: string, data: CreateResourceInput) {
    const resource = await ContentResource.create({
      curriculumNodeId: new mongoose.Types.ObjectId(data.curriculumNodeId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      type: data.type,
      format: data.format,
      title: data.title,
      blocks: data.blocks,
      source: data.source,
      sourceAttribution: data.sourceAttribution,
      gradeId: new mongoose.Types.ObjectId(data.gradeId),
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      term: data.term,
      tags: data.tags,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      prerequisites: data.prerequisites.map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: new mongoose.Types.ObjectId(userId),
      status: 'draft',
    });
    return resource.toObject();
  }

  static async updateResource(
    id: string,
    schoolId: string,
    userId: string,
    data: UpdateResourceInput,
  ) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);
    const uid = new mongoose.Types.ObjectId(userId);

    const resource = await ContentResource.findOne({
      _id: oid,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!resource) throw new NotFoundError('Content resource not found');

    // Only creator can edit drafts, only admin can edit approved
    if (resource.status === 'draft' && resource.createdBy.toString() !== userId) {
      throw new ForbiddenError('Only the creator can edit a draft resource');
    }

    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.blocks !== undefined) update.blocks = data.blocks;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.difficulty !== undefined) update.difficulty = data.difficulty;
    if (data.estimatedMinutes !== undefined) update.estimatedMinutes = data.estimatedMinutes;
    if (data.format !== undefined) update.format = data.format;
    if (data.prerequisites !== undefined) {
      update.prerequisites = data.prerequisites.map((pid) => new mongoose.Types.ObjectId(pid));
    }

    const updated = await ContentResource.findOneAndUpdate(
      { _id: oid, isDeleted: false },
      { $set: update },
      { new: true },
    )
      .populate('curriculumNodeId', 'title code type')
      .populate('subjectId', 'name')
      .populate('gradeId', 'name level')
      .lean();
    return updated;
  }

  static async deleteResource(id: string, schoolId: string, userId: string, userRole: string) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);

    const resource = await ContentResource.findOne({
      _id: oid,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!resource) throw new NotFoundError('Content resource not found');

    const isAdmin = ['super_admin', 'school_admin', 'principal'].includes(userRole);
    const isCreator = resource.createdBy.toString() === userId;

    if (!isAdmin && !isCreator) {
      throw new ForbiddenError('You do not have permission to delete this resource');
    }

    await ContentResource.findOneAndUpdate(
      { _id: oid, schoolId: soid },
      { $set: { isDeleted: true } },
    );
    return { success: true };
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/ContentLibrary/service-resources.ts`

- [ ] **Step 3: Commit**

```bash
git add src/modules/ContentLibrary/service-resources.ts
git commit -m "feat(content-library): add ResourcesService with CRUD and role-based visibility"
```

---

## Task 4: Backend — Review Service

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/service-review.ts`

- [ ] **Step 1: Create the review workflow service**

```typescript
// campusly-backend/src/modules/ContentLibrary/service-review.ts
import mongoose from 'mongoose';
import { ContentResource } from './model.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors.js';
import type { ReviewResourceInput } from './validation.js';

export class ReviewService {
  static async submitForReview(id: string, schoolId: string, userId: string) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);

    const resource = await ContentResource.findOne({
      _id: oid,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!resource) throw new NotFoundError('Content resource not found');

    if (resource.createdBy.toString() !== userId) {
      throw new ForbiddenError('Only the creator can submit for review');
    }
    if (resource.status !== 'draft' && resource.status !== 'rejected') {
      throw new BadRequestError('Only draft or rejected resources can be submitted for review');
    }
    if (resource.blocks.length === 0) {
      throw new BadRequestError('Resource must have at least one content block');
    }

    const updated = await ContentResource.findOneAndUpdate(
      { _id: oid, schoolId: soid },
      { $set: { status: 'pending_review' } },
      { new: true },
    ).lean();
    return updated;
  }

  static async reviewResource(
    id: string,
    schoolId: string,
    reviewerId: string,
    data: ReviewResourceInput,
  ) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);

    const resource = await ContentResource.findOne({
      _id: oid,
      schoolId: soid,
      isDeleted: false,
    }).lean();
    if (!resource) throw new NotFoundError('Content resource not found');

    if (resource.status !== 'pending_review') {
      throw new BadRequestError('Only pending_review resources can be reviewed');
    }

    const newStatus = data.action === 'approve' ? 'approved' : 'rejected';

    const updated = await ContentResource.findOneAndUpdate(
      { _id: oid, schoolId: soid },
      {
        $set: {
          status: newStatus,
          reviewedBy: new mongoose.Types.ObjectId(reviewerId),
          reviewedAt: new Date(),
          reviewNotes: data.notes,
        },
      },
      { new: true },
    )
      .populate('curriculumNodeId', 'title code type')
      .populate('createdBy', 'firstName lastName')
      .populate('reviewedBy', 'firstName lastName')
      .lean();
    return updated;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ContentLibrary/service-review.ts
git commit -m "feat(content-library): add ReviewService for submit/approve/reject workflow"
```

---

## Task 5: Backend — AI Generation Service

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/service-generation.ts`

- [ ] **Step 1: Create the AI generation service**

```typescript
// campusly-backend/src/modules/ContentLibrary/service-generation.ts
import mongoose from 'mongoose';
import { ContentResource } from './model.js';
import { CurriculumNode } from '../CurriculumStructure/model.js';
import { AIService } from '../../services/ai.service.js';
import { NotFoundError, BadRequestError } from '../../common/errors.js';
import type { GenerateContentInput } from './validation.js';
import type { IContentBlock } from './model.js';

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
const MAX_DAILY_GENERATIONS = 20;

export class GenerationService {
  static async generateContent(
    schoolId: string,
    userId: string,
    data: GenerateContentInput,
  ) {
    // Rate limit check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCount = await ContentResource.countDocuments({
      createdBy: new mongoose.Types.ObjectId(userId),
      source: 'ai_generated',
      createdAt: { $gte: todayStart },
    });
    if (todayCount >= MAX_DAILY_GENERATIONS) {
      throw new BadRequestError(
        `Daily AI generation limit reached (${MAX_DAILY_GENERATIONS}). Try again tomorrow.`,
      );
    }

    // Fetch curriculum node for context
    const node = await CurriculumNode.findOne({
      _id: new mongoose.Types.ObjectId(data.curriculumNodeId),
      isDeleted: false,
    }).lean();
    if (!node) throw new NotFoundError('Curriculum node not found');

    // Build prompt
    const blockTypesStr = data.blockTypes.join(', ');
    const prompt = buildGenerationPrompt(node, data, blockTypesStr);

    // Call AI
    const aiResponse = await AIService.chat([
      { role: 'user', content: prompt },
    ]);

    // Parse response into blocks
    const blocks = parseAIResponseToBlocks(aiResponse, data.blockTypes);

    // Determine format based on block types
    const interactiveTypes = ['quiz', 'drag_drop', 'fill_blank', 'match_columns',
      'ordering', 'hotspot', 'step_reveal', 'code'];
    const hasInteractive = blocks.some((b: IContentBlock) => interactiveTypes.includes(b.type));

    // Save as draft
    const resource = await ContentResource.create({
      curriculumNodeId: new mongoose.Types.ObjectId(data.curriculumNodeId),
      schoolId: new mongoose.Types.ObjectId(schoolId),
      type: data.type,
      format: hasInteractive ? 'interactive' : 'static',
      title: `${node.title} — ${data.type.replace('_', ' ')}`,
      blocks,
      source: 'ai_generated',
      gradeId: new mongoose.Types.ObjectId(data.gradeId),
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      term: data.term,
      tags: [node.title, node.code],
      difficulty: data.difficulty,
      createdBy: new mongoose.Types.ObjectId(userId),
      aiModel: ANTHROPIC_MODEL,
      aiPrompt: prompt,
      status: 'draft',
    });

    return resource.toObject();
  }
}

function buildGenerationPrompt(
  node: Record<string, unknown>,
  data: GenerateContentInput,
  blockTypesStr: string,
): string {
  const metadata = node.metadata as Record<string, unknown> | undefined;
  const capsRef = metadata?.capsReference ?? '';
  const standards = (metadata?.assessmentStandards as string[]) ?? [];

  return `You are creating educational content for a South African school.

Topic: ${node.title}
Code: ${node.code}
Grade level: Grade ${data.term} content
Subject area: This is a curriculum node
Difficulty: ${data.difficulty}/5
CAPS Reference: ${capsRef}
Assessment Standards: ${standards.join(', ') || 'N/A'}

Create a ${data.type.replace('_', ' ')} with the following block types: ${blockTypesStr}

${data.instructions ? `Additional instructions: ${data.instructions}` : ''}

Return your response as a JSON array of content blocks. Each block must have:
- "type": one of [${blockTypesStr}]
- "content": the content (markdown for text, JSON config string for interactive blocks)
- "cognitiveLevel": { "caps": "knowledge|routine|complex|problem_solving", "blooms": "remember|understand|apply|analyse|evaluate|create" }
- "points": number of points (0 for text blocks)
- "hints": array of progressive hint strings (empty for text blocks)
- "explanation": explanation shown after attempt (empty for text blocks)

For quiz blocks, the content should be a JSON string with:
{ "question": "...", "type": "mcq|true_false|short_answer", "options": [{"label":"A","text":"...","isCorrect":true}], "correctAnswer": "..." }

For fill_blank blocks:
{ "text": "The ___ is the powerhouse of the cell", "blanks": ["mitochondria"], "acceptAlternatives": [["mitochondrion"]] }

For match_columns blocks:
{ "left": ["item1","item2"], "right": ["match1","match2"], "correctPairs": [[0,0],[1,1]] }

For ordering blocks:
{ "items": ["step3","step1","step2"], "correctOrder": [1,2,0] }

For step_reveal blocks:
{ "steps": [{"title":"Step 1","content":"..."},{"title":"Step 2","content":"..."}] }

Return ONLY the JSON array, no other text.`;
}

function parseAIResponseToBlocks(
  aiResponse: string,
  requestedTypes: string[],
): IContentBlock[] {
  let parsed: unknown[];
  try {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: wrap the entire response as a text block
      return [{
        blockId: crypto.randomUUID(),
        type: 'text' as const,
        order: 0,
        content: aiResponse,
        curriculumNodeId: null,
        cognitiveLevel: null,
        points: 0,
        hints: [],
        explanation: '',
        metadata: {},
      }];
    }
    parsed = JSON.parse(jsonMatch[0]) as unknown[];
  } catch {
    return [{
      blockId: crypto.randomUUID(),
      type: 'text' as const,
      order: 0,
      content: aiResponse,
      curriculumNodeId: null,
      cognitiveLevel: null,
      points: 0,
      hints: [],
      explanation: '',
      metadata: {},
    }];
  }

  return parsed.map((block: unknown, index: number) => {
    const b = block as Record<string, unknown>;
    const type = (typeof b.type === 'string' && requestedTypes.includes(b.type))
      ? b.type
      : 'text';

    return {
      blockId: crypto.randomUUID(),
      type: type as IContentBlock['type'],
      order: index,
      content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content ?? ''),
      curriculumNodeId: null,
      cognitiveLevel: b.cognitiveLevel
        ? { caps: String((b.cognitiveLevel as Record<string, unknown>).caps ?? ''), blooms: String((b.cognitiveLevel as Record<string, unknown>).blooms ?? '') }
        : null,
      points: typeof b.points === 'number' ? b.points : 0,
      hints: Array.isArray(b.hints) ? b.hints.map(String) : [],
      explanation: typeof b.explanation === 'string' ? b.explanation : '',
      metadata: {},
    };
  });
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/ContentLibrary/service-generation.ts`

Check: The `AIService.chat` method signature — read `src/services/ai.service.ts` to verify the method exists and its parameters. If the method is named differently (e.g., `sendMessage`, `complete`, etc.), adjust the call accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/modules/ContentLibrary/service-generation.ts
git commit -m "feat(content-library): add AI generation service with rate limiting and structured block output"
```

---

## Task 6: Backend — Controller

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// campusly-backend/src/modules/ContentLibrary/controller.ts
import type { Request, Response } from 'express';
import { getUser } from '../../types/authenticated-request.js';
import { apiResponse } from '../../common/utils.js';
import { ResourcesService } from './service-resources.js';
import { ReviewService } from './service-review.js';
import { GenerationService } from './service-generation.js';
import type { ResourceQueryInput } from './validation.js';

export class ContentLibraryController {
  // ─── Resources ─────────────────────────────────────────────────────────────

  static async listResources(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const query = req.query as unknown as ResourceQueryInput;
    const result = await ResourcesService.listResources(
      user.schoolId!,
      user.id,
      user.role,
      query,
    );
    res.json(apiResponse(true, result));
  }

  static async getResource(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await ResourcesService.getResource(
      req.params.id as string,
      user.schoolId!,
      user.id,
    );
    res.json(apiResponse(true, resource));
  }

  static async createResource(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await ResourcesService.createResource(
      user.schoolId!,
      user.id,
      req.body,
    );
    res.status(201).json(apiResponse(true, resource, 'Resource created successfully'));
  }

  static async updateResource(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await ResourcesService.updateResource(
      req.params.id as string,
      user.schoolId!,
      user.id,
      req.body,
    );
    res.json(apiResponse(true, resource, 'Resource updated successfully'));
  }

  static async deleteResource(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await ResourcesService.deleteResource(
      req.params.id as string,
      user.schoolId!,
      user.id,
      user.role,
    );
    res.json(apiResponse(true, result, 'Resource deleted'));
  }

  // ─── Review ────────────────────────────────────────────────────────────────

  static async submitForReview(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await ReviewService.submitForReview(
      req.params.id as string,
      user.schoolId!,
      user.id,
    );
    res.json(apiResponse(true, resource, 'Submitted for review'));
  }

  static async reviewResource(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await ReviewService.reviewResource(
      req.params.id as string,
      user.schoolId!,
      user.id,
      req.body,
    );
    res.json(apiResponse(true, resource, `Resource ${req.body.action}d`));
  }

  // ─── Generation ────────────────────────────────────────────────────────────

  static async generateContent(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const resource = await GenerationService.generateContent(
      user.schoolId!,
      user.id,
      req.body,
    );
    res.status(201).json(apiResponse(true, resource, 'Content generated'));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/ContentLibrary/controller.ts
git commit -m "feat(content-library): add controller for resource, review, and generation endpoints"
```

---

## Task 7: Backend — Routes + App Registration

**Files:**
- Create: `campusly-backend/src/modules/ContentLibrary/routes.ts`
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Create routes**

```typescript
// campusly-backend/src/modules/ContentLibrary/routes.ts
import { Router } from 'express';
import { authorize, validate } from '../../middleware/index.js';
import { ContentLibraryController } from './controller.js';
import {
  createResourceSchema,
  updateResourceSchema,
  reviewResourceSchema,
  generateContentSchema,
  resourceQuerySchema,
} from './validation.js';

const router = Router();

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'] as const;
const HOD_ROLES = ['super_admin', 'school_admin', 'principal', 'hod'] as const;
const READ_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'] as const;

// ─── Resources ───────────────────────────────────────────────────────────────

router.get(
  '/resources',
  authorize(...READ_ROLES),
  validate({ query: resourceQuerySchema }),
  ContentLibraryController.listResources,
);

router.get(
  '/resources/:id',
  authorize(...READ_ROLES),
  ContentLibraryController.getResource,
);

router.post(
  '/resources',
  authorize(...READ_ROLES),
  validate(createResourceSchema),
  ContentLibraryController.createResource,
);

router.put(
  '/resources/:id',
  authorize(...READ_ROLES),
  validate(updateResourceSchema),
  ContentLibraryController.updateResource,
);

router.delete(
  '/resources/:id',
  authorize(...READ_ROLES),
  ContentLibraryController.deleteResource,
);

// ─── Review ──────────────────────────────────────────────────────────────────

router.patch(
  '/resources/:id/submit',
  authorize(...READ_ROLES),
  ContentLibraryController.submitForReview,
);

router.patch(
  '/resources/:id/review',
  authorize(...HOD_ROLES),
  validate(reviewResourceSchema),
  ContentLibraryController.reviewResource,
);

// ─── Generation ──────────────────────────────────────────────────────────────

router.post(
  '/resources/generate',
  authorize(...READ_ROLES),
  validate(generateContentSchema),
  ContentLibraryController.generateContent,
);

export default router;
```

- [ ] **Step 2: Register route in app.ts**

Add import near other module imports:
```typescript
import contentLibraryRoutes from './modules/ContentLibrary/routes.js';
```

Add route registration near curriculum-structure:
```typescript
app.use('/api/content-library', authenticate, contentLibraryRoutes);
```

- [ ] **Step 3: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/modules/ContentLibrary/routes.ts src/app.ts
git commit -m "feat(content-library): add routes and register /api/content-library"
```

---

## Task 8: Frontend — Types

**Files:**
- Create: `campusly-frontend/src/types/content-library.ts`
- Modify: `campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Create types file**

```typescript
// campusly-frontend/src/types/content-library.ts

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ResourceType = 'lesson' | 'study_notes' | 'worksheet' | 'worked_example' | 'activity';
export type ResourceFormat = 'static' | 'interactive';
export type ResourceSource = 'oer' | 'ai_generated' | 'teacher' | 'system';
export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type ContentBlockType =
  | 'text' | 'image' | 'video' | 'quiz' | 'drag_drop' | 'fill_blank'
  | 'match_columns' | 'ordering' | 'hotspot' | 'step_reveal' | 'code';

// ─── Cognitive Level ─────────────────────────────────────────────────────────

export interface CognitiveLevelTag {
  caps: string;
  blooms: string;
}

// ─── Content Block ───────────────────────────────────────────────────────────

export interface ContentBlockItem {
  blockId: string;
  type: ContentBlockType;
  order: number;
  content: string;
  curriculumNodeId: string | null;
  cognitiveLevel: CognitiveLevelTag | null;
  points: number;
  hints: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

// ─── Content Resource ────────────────────────────────────────────────────────

export interface ContentResourceItem {
  id: string;
  curriculumNodeId: string | { id: string; title: string; code: string; type: string };
  schoolId: string | null;
  type: ResourceType;
  format: ResourceFormat;
  title: string;
  blocks: ContentBlockItem[];
  source: ResourceSource;
  sourceAttribution: string;
  gradeId: string | { id: string; name: string; level: number };
  subjectId: string | { id: string; name: string };
  term: number;
  tags: string[];
  status: ResourceStatus;
  reviewedBy: string | { id: string; firstName: string; lastName: string } | null;
  reviewedAt: string | null;
  reviewNotes: string;
  createdBy: string | { id: string; firstName: string; lastName: string };
  aiModel: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  difficulty: number;
  estimatedMinutes: number;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateResourcePayload {
  curriculumNodeId: string;
  type: ResourceType;
  format?: ResourceFormat;
  title: string;
  blocks?: ContentBlockItem[];
  source?: ResourceSource;
  sourceAttribution?: string;
  gradeId: string;
  subjectId: string;
  term: number;
  tags?: string[];
  difficulty?: number;
  estimatedMinutes?: number;
  prerequisites?: string[];
}

export interface UpdateResourcePayload {
  title?: string;
  blocks?: ContentBlockItem[];
  tags?: string[];
  difficulty?: number;
  estimatedMinutes?: number;
  format?: ResourceFormat;
  prerequisites?: string[];
}

export interface ReviewPayload {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface GenerateContentPayload {
  curriculumNodeId: string;
  type: ResourceType;
  gradeId: string;
  subjectId: string;
  term: number;
  blockTypes: ContentBlockType[];
  difficulty?: number;
  instructions?: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface ResourceFilters {
  curriculumNodeId?: string;
  type?: ResourceType;
  format?: ResourceFormat;
  status?: ResourceStatus;
  subjectId?: string;
  gradeId?: string;
  term?: number;
  search?: string;
  source?: ResourceSource;
  mine?: boolean;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Add to barrel**

Add to `src/types/index.ts`:
```typescript
export * from './content-library';
```

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/types/content-library.ts src/types/index.ts
git commit -m "feat(content-library): add frontend types for resources, blocks, and payloads"
```

---

## Task 9: Frontend — Hook

**Files:**
- Create: `campusly-frontend/src/hooks/useContentLibrary.ts`

- [ ] **Step 1: Create the hook**

```typescript
// campusly-frontend/src/hooks/useContentLibrary.ts
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  ContentResourceItem,
  CreateResourcePayload,
  UpdateResourcePayload,
  ReviewPayload,
  GenerateContentPayload,
  ResourceFilters,
} from '@/types';

export function useContentLibrary() {
  const [resources, setResources] = useState<ContentResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchResources = useCallback(async (filters?: ResourceFilters) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {};
      if (filters?.curriculumNodeId) params.curriculumNodeId = filters.curriculumNodeId;
      if (filters?.type) params.type = filters.type;
      if (filters?.format) params.format = filters.format;
      if (filters?.status) params.status = filters.status;
      if (filters?.subjectId) params.subjectId = filters.subjectId;
      if (filters?.gradeId) params.gradeId = filters.gradeId;
      if (filters?.term) params.term = filters.term;
      if (filters?.search) params.search = filters.search;
      if (filters?.source) params.source = filters.source;
      if (filters?.mine) params.mine = 'true';
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const response = await apiClient.get('/content-library/resources', { params });
      const result = unwrapResponse<{ resources: ContentResourceItem[]; total: number }>(response);
      setResources(result.resources);
      setTotal(result.total);
    } catch (err: unknown) {
      console.error('Failed to load resources', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getResource = useCallback(async (id: string) => {
    const response = await apiClient.get(`/content-library/resources/${id}`);
    return unwrapResponse<ContentResourceItem>(response);
  }, []);

  const createResource = useCallback(async (data: CreateResourcePayload) => {
    const response = await apiClient.post('/content-library/resources', data);
    const created = unwrapResponse<ContentResourceItem>(response);
    toast.success('Resource created');
    return created;
  }, []);

  const updateResource = useCallback(async (id: string, data: UpdateResourcePayload) => {
    const response = await apiClient.put(`/content-library/resources/${id}`, data);
    const updated = unwrapResponse<ContentResourceItem>(response);
    toast.success('Resource updated');
    return updated;
  }, []);

  const deleteResource = useCallback(async (id: string) => {
    await apiClient.delete(`/content-library/resources/${id}`);
    toast.success('Resource deleted');
  }, []);

  const submitForReview = useCallback(async (id: string) => {
    const response = await apiClient.patch(`/content-library/resources/${id}/submit`);
    const updated = unwrapResponse<ContentResourceItem>(response);
    toast.success('Submitted for review');
    return updated;
  }, []);

  const reviewResource = useCallback(async (id: string, data: ReviewPayload) => {
    const response = await apiClient.patch(`/content-library/resources/${id}/review`, data);
    const updated = unwrapResponse<ContentResourceItem>(response);
    toast.success(`Resource ${data.action}d`);
    return updated;
  }, []);

  const generateContent = useCallback(async (data: GenerateContentPayload) => {
    const response = await apiClient.post('/content-library/resources/generate', data);
    const created = unwrapResponse<ContentResourceItem>(response);
    toast.success('Content generated — saved as draft');
    return created;
  }, []);

  return {
    resources,
    total,
    loading,
    fetchResources,
    getResource,
    createResource,
    updateResource,
    deleteResource,
    submitForReview,
    reviewResource,
    generateContent,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/hooks/useContentLibrary.ts
git commit -m "feat(content-library): add useContentLibrary hook for API calls"
```

---

## Task 10: Frontend — ResourceCard Component

**Files:**
- Create: `campusly-frontend/src/components/content/ResourceCard.tsx`

- [ ] **Step 1: Create the resource card**

```tsx
// campusly-frontend/src/components/content/ResourceCard.tsx
'use client';

import { BookOpen, FileText, PenTool, Lightbulb, Zap, Sparkles, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ContentResourceItem, ResourceType, ResourceStatus, ResourceSource } from '@/types';

interface ResourceCardProps {
  resource: ContentResourceItem;
  onClick: (resource: ContentResourceItem) => void;
}

const TYPE_ICONS: Record<ResourceType, typeof BookOpen> = {
  lesson: BookOpen,
  study_notes: FileText,
  worksheet: PenTool,
  worked_example: Lightbulb,
  activity: Zap,
};

const STATUS_VARIANTS: Record<ResourceStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  pending_review: 'outline',
  approved: 'default',
  rejected: 'destructive',
};

const SOURCE_LABELS: Record<ResourceSource, string> = {
  oer: 'OER',
  ai_generated: 'AI Generated',
  teacher: 'Teacher',
  system: 'System',
};

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const Icon = TYPE_ICONS[resource.type] ?? BookOpen;
  const nodeTitle = typeof resource.curriculumNodeId === 'object'
    ? resource.curriculumNodeId?.title ?? ''
    : '';
  const subjectName = typeof resource.subjectId === 'object'
    ? resource.subjectId?.name ?? ''
    : '';
  const creatorName = typeof resource.createdBy === 'object'
    ? `${resource.createdBy.firstName} ${resource.createdBy.lastName}`
    : '';

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(resource)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium">{resource.title}</h4>
            {nodeTitle && (
              <p className="truncate text-xs text-muted-foreground">{nodeTitle}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_VARIANTS[resource.status]} className="text-[10px]">
                {resource.status.replace('_', ' ')}
              </Badge>
              {resource.source === 'ai_generated' && (
                <Badge variant="outline" className="text-[10px]">
                  <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                  AI
                </Badge>
              )}
              {subjectName && (
                <Badge variant="outline" className="text-[10px]">{subjectName}</Badge>
              )}
            </div>
            {creatorName && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <User className="h-2.5 w-2.5" />
                <span className="truncate">{creatorName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/content/ResourceCard.tsx
git commit -m "feat(content-library): add ResourceCard component"
```

---

## Task 11: Frontend — BlockEditorItem Component

**Files:**
- Create: `campusly-frontend/src/components/content/BlockEditorItem.tsx`

- [ ] **Step 1: Create block editor item**

```tsx
// campusly-frontend/src/components/content/BlockEditorItem.tsx
'use client';

import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ContentBlockItem, ContentBlockType } from '@/types';

interface BlockEditorItemProps {
  block: ContentBlockItem;
  index: number;
  totalBlocks: number;
  onUpdate: (blockId: string, updates: Partial<ContentBlockItem>) => void;
  onRemove: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
}

const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  quiz: 'Quiz',
  drag_drop: 'Drag & Drop',
  fill_blank: 'Fill in the Blank',
  match_columns: 'Match Columns',
  ordering: 'Ordering',
  hotspot: 'Hotspot',
  step_reveal: 'Step Reveal',
  code: 'Code',
};

export function BlockEditorItem({
  block,
  index,
  totalBlocks,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: BlockEditorItemProps) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        <Badge variant="outline" className="text-[10px]">
          {BLOCK_TYPE_LABELS[block.type]}
        </Badge>
        <span className="text-xs text-muted-foreground">Block {index + 1}</span>
        <div className="ml-auto flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMoveUp(block.blockId)}
            disabled={index === 0}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMoveDown(block.blockId)}
            disabled={index === totalBlocks - 1}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRemove(block.blockId)}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {block.type === 'text' ? (
          <div className="space-y-1">
            <Label className="text-xs">Content (Markdown)</Label>
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={block.content}
              onChange={(e) => onUpdate(block.blockId, { content: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label className="text-xs">Content (JSON config)</Label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              value={block.content}
              onChange={(e) => onUpdate(block.blockId, { content: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Points</Label>
            <Input
              type="number"
              min={0}
              className="h-8 text-xs"
              value={block.points}
              onChange={(e) => onUpdate(block.blockId, { points: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Explanation (shown after attempt)</Label>
            <Input
              className="h-8 text-xs"
              value={block.explanation}
              onChange={(e) => onUpdate(block.blockId, { explanation: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/content/BlockEditorItem.tsx
git commit -m "feat(content-library): add BlockEditorItem component for editing individual blocks"
```

---

## Task 12: Frontend — BlockEditor Component

**Files:**
- Create: `campusly-frontend/src/components/content/BlockEditor.tsx`

- [ ] **Step 1: Create the block editor container**

```tsx
// campusly-frontend/src/components/content/BlockEditor.tsx
'use client';

import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlockEditorItem } from './BlockEditorItem';
import type { ContentBlockItem, ContentBlockType } from '@/types';

interface BlockEditorProps {
  blocks: ContentBlockItem[];
  onChange: (blocks: ContentBlockItem[]) => void;
}

const BLOCK_TYPES: { value: ContentBlockType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'match_columns', label: 'Match Columns' },
  { value: 'ordering', label: 'Ordering' },
  { value: 'drag_drop', label: 'Drag & Drop' },
  { value: 'step_reveal', label: 'Step Reveal' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'code', label: 'Code' },
];

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const addBlock = useCallback((type: ContentBlockType) => {
    const newBlock: ContentBlockItem = {
      blockId: crypto.randomUUID(),
      type,
      order: blocks.length,
      content: '',
      curriculumNodeId: null,
      cognitiveLevel: null,
      points: 0,
      hints: [],
      explanation: '',
      metadata: {},
    };
    onChange([...blocks, newBlock]);
  }, [blocks, onChange]);

  const updateBlock = useCallback((blockId: string, updates: Partial<ContentBlockItem>) => {
    onChange(blocks.map((b) => b.blockId === blockId ? { ...b, ...updates } : b));
  }, [blocks, onChange]);

  const removeBlock = useCallback((blockId: string) => {
    onChange(blocks.filter((b) => b.blockId !== blockId));
  }, [blocks, onChange]);

  const moveUp = useCallback((blockId: string) => {
    const idx = blocks.findIndex((b) => b.blockId === blockId);
    if (idx <= 0) return;
    const next = [...blocks];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }, [blocks, onChange]);

  const moveDown = useCallback((blockId: string) => {
    const idx = blocks.findIndex((b) => b.blockId === blockId);
    if (idx >= blocks.length - 1) return;
    const next = [...blocks];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next.map((b, i) => ({ ...b, order: i })));
  }, [blocks, onChange]);

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No blocks yet. Add a block below to start building content.
        </div>
      )}

      {blocks.map((block, index) => (
        <BlockEditorItem
          key={block.blockId}
          block={block}
          index={index}
          totalBlocks={blocks.length}
          onUpdate={updateBlock}
          onRemove={removeBlock}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      ))}

      <div className="flex items-center gap-2">
        <Select onValueChange={(val: unknown) => addBlock(val as ContentBlockType)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Add block..." />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/content/BlockEditor.tsx
git commit -m "feat(content-library): add BlockEditor container for managing content blocks"
```

---

## Task 13: Frontend — ResourceFormDialog

**Files:**
- Create: `campusly-frontend/src/components/content/ResourceFormDialog.tsx`

- [ ] **Step 1: Create the resource form dialog**

```tsx
// campusly-frontend/src/components/content/ResourceFormDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BlockEditor } from './BlockEditor';
import type {
  ContentBlockItem,
  ResourceType,
  CreateResourcePayload,
} from '@/types';

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateResourcePayload) => Promise<void>;
  frameworkId: string;
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
  selectedNodeId?: string;
  selectedNodeTitle?: string;
}

interface FormValues {
  title: string;
  type: ResourceType;
  term: number;
  difficulty: number;
  estimatedMinutes: number;
}

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'study_notes', label: 'Study Notes' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'worked_example', label: 'Worked Example' },
  { value: 'activity', label: 'Activity' },
];

export function ResourceFormDialog({
  open,
  onOpenChange,
  onSubmit,
  subjects,
  grades,
  selectedNodeId,
  selectedNodeTitle,
}: ResourceFormDialogProps) {
  const [blocks, setBlocks] = useState<ContentBlockItem[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      type: 'lesson',
      term: 1,
      difficulty: 3,
      estimatedMinutes: 30,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: selectedNodeTitle ? `${selectedNodeTitle} — Lesson` : '',
        type: 'lesson',
        term: 1,
        difficulty: 3,
        estimatedMinutes: 30,
      });
      setBlocks([]);
      setSubjectId('');
      setGradeId('');
    }
  }, [open, selectedNodeTitle, reset]);

  const onFormSubmit = async (values: FormValues) => {
    if (!selectedNodeId || !subjectId || !gradeId) return;
    await onSubmit({
      curriculumNodeId: selectedNodeId,
      type: values.type,
      title: values.title,
      blocks,
      gradeId,
      subjectId,
      term: values.term,
      difficulty: values.difficulty,
      estimatedMinutes: values.estimatedMinutes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col overflow-y-auto py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="res-title">Title <span className="text-destructive">*</span></Label>
              <Input id="res-title" {...register('title', { required: 'Title is required' })} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {selectedNodeTitle && (
              <p className="text-xs text-muted-foreground">Curriculum node: {selectedNodeTitle}</p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select
                  defaultValue="lesson"
                  onValueChange={(val: unknown) => setValue('type', val as ResourceType)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setSubjectId(val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grade <span className="text-destructive">*</span></Label>
                <Select onValueChange={(val: unknown) => setGradeId(val as string)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-term">Term</Label>
                <Input id="res-term" type="number" min={1} max={4} {...register('term', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-diff">Difficulty (1-5)</Label>
                <Input id="res-diff" type="number" min={1} max={5} {...register('difficulty', { valueAsNumber: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="res-mins">Est. Minutes</Label>
                <Input id="res-mins" type="number" min={0} {...register('estimatedMinutes', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content Blocks</Label>
              <BlockEditor blocks={blocks} onChange={setBlocks} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedNodeId || !subjectId || !gradeId}>
              {isSubmitting ? 'Creating...' : 'Create Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/content/ResourceFormDialog.tsx
git commit -m "feat(content-library): add ResourceFormDialog with block editor and metadata"
```

---

## Task 14: Frontend — ReviewDialog

**Files:**
- Create: `campusly-frontend/src/components/content/ReviewDialog.tsx`

- [ ] **Step 1: Create the review dialog**

```tsx
// campusly-frontend/src/components/content/ReviewDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ContentResourceItem, ReviewPayload } from '@/types';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: ContentResourceItem | null;
  onSubmit: (id: string, data: ReviewPayload) => Promise<void>;
}

export function ReviewDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
}: ReviewDialogProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!resource) return;
    setSubmitting(true);
    try {
      await onSubmit(resource.id, { action, notes });
      setNotes('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const creatorName = resource && typeof resource.createdBy === 'object'
    ? `${resource.createdBy.firstName} ${resource.createdBy.lastName}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Review Resource</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {resource && (
            <>
              <div>
                <p className="text-sm font-medium">{resource.title}</p>
                <p className="text-xs text-muted-foreground">
                  By {creatorName} | {resource.type.replace('_', ' ')} | {resource.blocks.length} blocks
                </p>
              </div>

              <div className="space-y-2">
                <Label>Review Notes</Label>
                <Textarea
                  rows={4}
                  placeholder="Optional feedback for the author..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => handleAction('reject')}
            disabled={submitting}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={() => handleAction('approve')}
            disabled={submitting}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/content/ReviewDialog.tsx
git commit -m "feat(content-library): add ReviewDialog for HOD approve/reject workflow"
```

---

## Task 15: Frontend — Teacher Content Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/teacher/curriculum/content/page.tsx`

- [ ] **Step 1: Create teacher content browser page**

```tsx
// campusly-frontend/src/app/(dashboard)/teacher/curriculum/content/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Sparkles, BookOpen, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { ResourceCard } from '@/components/content/ResourceCard';
import { ResourceFormDialog } from '@/components/content/ResourceFormDialog';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { ContentResourceItem, ResourceFilters, ResourceType, CreateResourcePayload } from '@/types';

export default function TeacherContentPage() {
  const {
    resources,
    total,
    loading,
    fetchResources,
    createResource,
    submitForReview,
  } = useContentLibrary();

  const { frameworks, selectedFramework } = useCurriculumStructure();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [showMine, setShowMine] = useState(false);

  const loadResources = useCallback(() => {
    const filters: ResourceFilters = {};
    if (search) filters.search = search;
    if (typeFilter !== 'all') filters.type = typeFilter as ResourceType;
    if (statusFilter !== 'all') filters.status = statusFilter as ResourceFilters['status'];
    if (showMine) filters.mine = true;
    fetchResources(filters);
  }, [search, typeFilter, statusFilter, showMine, fetchResources]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleCreate = async (data: CreateResourcePayload) => {
    try {
      await createResource(data);
      loadResources();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      throw err;
    }
  };

  const handleResourceClick = (resource: ContentResourceItem) => {
    // TODO: navigate to resource detail/edit page
    console.log('Resource clicked:', resource.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Library"
        description="Browse, create, and manage curriculum-aligned learning resources"
        icon={BookOpen}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search resources..."
            className="w-full sm:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={typeFilter}
            onValueChange={(val: unknown) => setTypeFilter(val as string)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lesson">Lesson</SelectItem>
              <SelectItem value="study_notes">Study Notes</SelectItem>
              <SelectItem value="worksheet">Worksheet</SelectItem>
              <SelectItem value="worked_example">Worked Example</SelectItem>
              <SelectItem value="activity">Activity</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(val: unknown) => setStatusFilter(val as string)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="draft">My Drafts</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showMine ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowMine(!showMine)}
          >
            <Filter className="mr-1 h-3.5 w-3.5" />
            Mine
          </Button>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Resource
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookOpen className="mb-2 h-10 w-10" />
          <p className="text-sm">No resources found</p>
          <p className="text-xs">Create your first resource or adjust filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={handleResourceClick}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{total} resources total</p>

      <ResourceFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        frameworkId={selectedFramework}
        subjects={[]}
        grades={[]}
        selectedNodeId=""
        selectedNodeTitle=""
      />
    </div>
  );
}
```

Note: The `subjects` and `grades` props are passed as empty arrays for now — the page will need to fetch these from the academic API. The implementer should check if there's an existing hook for academic data (e.g., `useAcademic` or similar) and use it to populate these. If no hook exists, fetch from `/academic/subjects` and `/academic/grades` within a new hook or by adding to the existing content library hook.

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add "src/app/(dashboard)/teacher/curriculum/content/page.tsx"
git commit -m "feat(content-library): add teacher content browser page with filters and create dialog"
```

---

## Task 16: Frontend — HOD Review Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/hod/curriculum/reviews/page.tsx`

- [ ] **Step 1: Create the HOD review queue page**

```tsx
// campusly-frontend/src/app/(dashboard)/hod/curriculum/reviews/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { ResourceCard } from '@/components/content/ResourceCard';
import { ReviewDialog } from '@/components/content/ReviewDialog';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { ContentResourceItem, ReviewPayload } from '@/types';

export default function HodReviewsPage() {
  const { resources, loading, fetchResources, reviewResource, getResource } = useContentLibrary();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ContentResourceItem | null>(null);

  const loadPending = useCallback(() => {
    fetchResources({ status: 'pending_review' });
  }, [fetchResources]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleResourceClick = async (resource: ContentResourceItem) => {
    try {
      const full = await getResource(resource.id);
      setSelectedResource(full);
      setReviewOpen(true);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleReview = async (id: string, data: ReviewPayload) => {
    try {
      await reviewResource(id, data);
      loadPending();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Reviews"
        description="Review and approve teacher-submitted content resources"
        icon={ClipboardCheck}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ClipboardCheck className="mb-2 h-10 w-10" />
          <p className="text-sm">No pending reviews</p>
          <p className="text-xs">All content has been reviewed</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={handleResourceClick}
            />
          ))}
        </div>
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        resource={selectedResource}
        onSubmit={handleReview}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add "src/app/(dashboard)/hod/curriculum/reviews/page.tsx"
git commit -m "feat(content-library): add HOD review queue page"
```

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | ContentResource + ContentBlock models | Backend |
| 2 | Zod validation schemas | Backend |
| 3 | ResourcesService (CRUD, visibility) | Backend |
| 4 | ReviewService (submit, approve, reject) | Backend |
| 5 | GenerationService (AI content with rate limit) | Backend |
| 6 | Controller | Backend |
| 7 | Routes + app.ts registration | Backend |
| 8 | TypeScript types | Frontend |
| 9 | useContentLibrary hook | Frontend |
| 10 | ResourceCard component | Frontend |
| 11 | BlockEditorItem component | Frontend |
| 12 | BlockEditor container | Frontend |
| 13 | ResourceFormDialog | Frontend |
| 14 | ReviewDialog | Frontend |
| 15 | Teacher content browser page | Frontend |
| 16 | HOD review queue page | Frontend |
