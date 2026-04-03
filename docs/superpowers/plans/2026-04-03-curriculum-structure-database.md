# Curriculum Structure Database (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a structured curriculum tree database for CAPS, IEB, and Cambridge curricula — the backbone that all content, assessments, and pacing will reference.

**Architecture:** New `CurriculumStructure` backend module with `CurriculumNode` tree model (self-referential via `parentId`). Extends existing `CurriculumFramework` model to support system-wide frameworks (`schoolId: null`). Frontend gets admin tree management page and node picker component for reuse across modules.

**Tech Stack:** Mongoose/MongoDB (backend), Zod v4 (validation), Express (routes), React 19 / Next.js (frontend), Zustand (auth store), Tailwind CSS 4, shadcn components.

**Spec:** `docs/superpowers/specs/2026-04-03-curriculum-content-engine-design.md` — Layer 1

---

## File Structure

### Backend — `campusly-backend/src/modules/CurriculumStructure/`

| File | Responsibility |
|------|---------------|
| `model.ts` | `CurriculumNode` Mongoose schema + interface. Extends existing `CurriculumFramework` to allow `schoolId: null`. |
| `validation.ts` | Zod schemas for create/update node, bulk import, query filters |
| `service-frameworks.ts` | Framework CRUD (list, create custom). System frameworks are read-only. |
| `service-nodes.ts` | Node CRUD, tree traversal (`getSubtree`), bulk import, search |
| `controller.ts` | HTTP handlers delegating to services |
| `routes.ts` | Express router with role-based auth |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/types/curriculum-structure.ts` | TypeScript types for `CurriculumNode`, `CurriculumFramework`, API payloads |
| `src/hooks/useCurriculumStructure.ts` | API calls for frameworks + nodes (list, create, update, delete, bulk import, tree) |
| `src/components/curriculum/NodeTree.tsx` | Recursive tree view for browsing curriculum nodes |
| `src/components/curriculum/NodeTreeItem.tsx` | Single tree node with expand/collapse + actions |
| `src/components/curriculum/NodeFormDialog.tsx` | Create/edit node dialog |
| `src/components/curriculum/BulkImportDialog.tsx` | Bulk JSON import dialog with preview |
| `src/components/curriculum/NodePicker.tsx` | Reusable node picker (dropdown/dialog) for other modules |
| `src/app/(dashboard)/admin/curriculum/structure/page.tsx` | Admin structure management page |

---

## Task 1: Backend — CurriculumNode Model

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/model.ts`

- [ ] **Step 1: Create the CurriculumNode model file**

```typescript
// campusly-backend/src/modules/CurriculumStructure/model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type NodeType =
  | 'phase'
  | 'grade'
  | 'subject'
  | 'term'
  | 'topic'
  | 'subtopic'
  | 'outcome';

// ─── CurriculumNode ──────────────────────────────────────────────────────────

export interface ICognitiveWeighting {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

export interface INodeMetadata {
  weekNumbers: number[];
  capsReference: string;
  assessmentStandards: string[];
  notionalHours: number;
  cognitiveWeighting: ICognitiveWeighting | null;
}

export interface ICurriculumNode extends Document {
  frameworkId: Types.ObjectId;
  type: NodeType;
  parentId: Types.ObjectId | null;
  title: string;
  code: string;
  description: string;
  metadata: INodeMetadata;
  order: number;
  schoolId: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cognitiveWeightingSchema = new Schema<ICognitiveWeighting>(
  {
    knowledge: { type: Number, required: true, min: 0, max: 100 },
    routine: { type: Number, required: true, min: 0, max: 100 },
    complex: { type: Number, required: true, min: 0, max: 100 },
    problemSolving: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const nodeMetadataSchema = new Schema<INodeMetadata>(
  {
    weekNumbers: { type: [Number], default: [] },
    capsReference: { type: String, default: '' },
    assessmentStandards: { type: [String], default: [] },
    notionalHours: { type: Number, default: 0 },
    cognitiveWeighting: { type: cognitiveWeightingSchema, default: null },
  },
  { _id: false },
);

const curriculumNodeSchema = new Schema<ICurriculumNode>(
  {
    frameworkId: { type: Schema.Types.ObjectId, ref: 'CurriculumFramework', required: true },
    type: {
      type: String,
      enum: ['phase', 'grade', 'subject', 'term', 'topic', 'subtopic', 'outcome'],
      required: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', default: null },
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    metadata: { type: nodeMetadataSchema, default: () => ({}) },
    order: { type: Number, required: true, default: 0 },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for common queries
curriculumNodeSchema.index({ frameworkId: 1, parentId: 1, isDeleted: 1 });
curriculumNodeSchema.index({ frameworkId: 1, type: 1, isDeleted: 1 });
curriculumNodeSchema.index({ code: 1 }, { unique: true });
curriculumNodeSchema.index({ schoolId: 1, isDeleted: 1 });

export const CurriculumNode = mongoose.model<ICurriculumNode>(
  'CurriculumNode',
  curriculumNodeSchema,
);
```

- [ ] **Step 2: Verify the model compiles**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/CurriculumStructure/model.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/CurriculumStructure/model.ts
git commit -m "feat(curriculum-structure): add CurriculumNode model with tree structure"
```

---

## Task 2: Backend — Validation Schemas

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/validation.ts`

- [ ] **Step 1: Create validation schemas**

```typescript
// campusly-backend/src/modules/CurriculumStructure/validation.ts
import { z } from 'zod/v4';
import { objectIdSchema } from '../../common/validation.js';

// ─── Node Types ──────────────────────────────────────────────────────────────

const nodeTypeEnum = z.enum([
  'phase', 'grade', 'subject', 'term', 'topic', 'subtopic', 'outcome',
]);

// ─── Cognitive Weighting ─────────────────────────────────────────────────────

const cognitiveWeightingSchema = z.object({
  knowledge: z.number().min(0).max(100),
  routine: z.number().min(0).max(100),
  complex: z.number().min(0).max(100),
  problemSolving: z.number().min(0).max(100),
}).strict();

// ─── Node Metadata ───────────────────────────────────────────────────────────

const nodeMetadataSchema = z.object({
  weekNumbers: z.array(z.number().int().min(1)).default([]),
  capsReference: z.string().default(''),
  assessmentStandards: z.array(z.string()).default([]),
  notionalHours: z.number().min(0).default(0),
  cognitiveWeighting: cognitiveWeightingSchema.nullable().default(null),
}).strict();

// ─── Create / Update ─────────────────────────────────────────────────────────

export const createNodeSchema = z.object({
  frameworkId: objectIdSchema,
  type: nodeTypeEnum,
  parentId: objectIdSchema.nullable().default(null),
  title: z.string().min(1, 'Title is required').trim(),
  code: z.string().min(1, 'Code is required').trim(),
  description: z.string().default(''),
  metadata: nodeMetadataSchema.default({}),
  order: z.number().int().min(0).default(0),
}).strict();

export const updateNodeSchema = z.object({
  title: z.string().min(1).trim().optional(),
  code: z.string().min(1).trim().optional(),
  description: z.string().optional(),
  metadata: nodeMetadataSchema.partial().optional(),
  order: z.number().int().min(0).optional(),
  parentId: objectIdSchema.nullable().optional(),
}).strict();

// ─── Bulk Import ─────────────────────────────────────────────────────────────

const bulkNodeSchema = z.object({
  type: nodeTypeEnum,
  parentCode: z.string().nullable().default(null),
  title: z.string().min(1).trim(),
  code: z.string().min(1).trim(),
  description: z.string().default(''),
  metadata: nodeMetadataSchema.default({}),
  order: z.number().int().min(0).default(0),
});

export const bulkImportSchema = z.object({
  frameworkId: objectIdSchema,
  nodes: z.array(bulkNodeSchema).min(1).max(500),
}).strict();

// ─── Query ───────────────────────────────────────────────────────────────────

export const nodeQuerySchema = z.object({
  frameworkId: objectIdSchema.optional(),
  parentId: objectIdSchema.nullable().optional(),
  type: nodeTypeEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

// ─── Framework ───────────────────────────────────────────────────────────────

export const createFrameworkSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  description: z.string().default(''),
}).strict();

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
export type BulkImportInput = z.infer<typeof bulkImportSchema>;
export type NodeQueryInput = z.infer<typeof nodeQuerySchema>;
export type CreateFrameworkInput = z.infer<typeof createFrameworkSchema>;
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/CurriculumStructure/validation.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/CurriculumStructure/validation.ts
git commit -m "feat(curriculum-structure): add Zod validation schemas for nodes and frameworks"
```

---

## Task 3: Backend — Framework Service

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/service-frameworks.ts`

- [ ] **Step 1: Create the frameworks service**

```typescript
// campusly-backend/src/modules/CurriculumStructure/service-frameworks.ts
import mongoose from 'mongoose';
import { CurriculumFramework } from '../TeacherWorkbench/model.js';
import { ConflictError } from '../../common/errors.js';
import type { CreateFrameworkInput } from './validation.js';

export class FrameworksService {
  /**
   * List all frameworks visible to a school:
   * - System frameworks (schoolId: null)
   * - School-specific custom frameworks
   */
  static async listFrameworks(schoolId: string) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const frameworks = await CurriculumFramework.find({
      $or: [{ schoolId: null }, { schoolId: soid }],
      isDeleted: false,
    })
      .sort({ isDefault: -1, name: 1 })
      .lean();
    return frameworks;
  }

  /**
   * Create a custom framework for a school.
   * System frameworks (CAPS, IEB, Cambridge) are seeded, not created via API.
   */
  static async createFramework(schoolId: string, userId: string, data: CreateFrameworkInput) {
    const soid = new mongoose.Types.ObjectId(schoolId);

    const existing = await CurriculumFramework.findOne({
      schoolId: soid,
      name: data.name,
      isDeleted: false,
    }).lean();
    if (existing) {
      throw new ConflictError(`A framework named "${data.name}" already exists`);
    }

    const framework = await CurriculumFramework.create({
      schoolId: soid,
      name: data.name,
      description: data.description,
      isDefault: false,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    return framework.toObject();
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/CurriculumStructure/service-frameworks.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/CurriculumStructure/service-frameworks.ts
git commit -m "feat(curriculum-structure): add FrameworksService for listing and creating frameworks"
```

---

## Task 4: Backend — Node Service

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/service-nodes.ts`

- [ ] **Step 1: Create the nodes service**

```typescript
// campusly-backend/src/modules/CurriculumStructure/service-nodes.ts
import mongoose from 'mongoose';
import { CurriculumNode } from './model.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors.js';
import { paginationHelper } from '../../common/utils.js';
import type { CreateNodeInput, UpdateNodeInput, BulkImportInput, NodeQueryInput } from './validation.js';

export class NodesService {
  /**
   * List nodes with filters. Supports pagination, parent filtering, type, search.
   */
  static async listNodes(schoolId: string, filters: NodeQueryInput) {
    const query: Record<string, unknown> = { isDeleted: false };

    if (filters.frameworkId) {
      query.frameworkId = new mongoose.Types.ObjectId(filters.frameworkId);
    }
    if (filters.parentId !== undefined) {
      query.parentId = filters.parentId
        ? new mongoose.Types.ObjectId(filters.parentId)
        : null;
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.search) {
      query.title = { $regex: filters.search, $options: 'i' };
    }

    // Show system nodes + school-specific nodes
    const soid = new mongoose.Types.ObjectId(schoolId);
    query.$or = [{ schoolId: null }, { schoolId: soid }];

    const { skip, limit } = paginationHelper(filters.page, filters.limit);

    const [nodes, total] = await Promise.all([
      CurriculumNode.find(query)
        .sort({ order: 1, title: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CurriculumNode.countDocuments(query),
    ]);

    return { nodes, total, page: filters.page ?? 1, limit };
  }

  /**
   * Get a single node with its direct children.
   */
  static async getNode(id: string, schoolId: string) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const oid = new mongoose.Types.ObjectId(id);

    const node = await CurriculumNode.findOne({
      _id: oid,
      $or: [{ schoolId: null }, { schoolId: soid }],
      isDeleted: false,
    }).lean();
    if (!node) throw new NotFoundError('Curriculum node not found');

    const children = await CurriculumNode.find({
      parentId: oid,
      isDeleted: false,
      $or: [{ schoolId: null }, { schoolId: soid }],
    })
      .sort({ order: 1, title: 1 })
      .lean();

    return { ...node, children };
  }

  /**
   * Get full subtree from a node (recursive via aggregation).
   */
  static async getSubtree(id: string, schoolId: string) {
    const soid = new mongoose.Types.ObjectId(schoolId);
    const oid = new mongoose.Types.ObjectId(id);

    const root = await CurriculumNode.findOne({
      _id: oid,
      $or: [{ schoolId: null }, { schoolId: soid }],
      isDeleted: false,
    }).lean();
    if (!root) throw new NotFoundError('Curriculum node not found');

    const descendants = await CurriculumNode.aggregate([
      {
        $match: {
          _id: oid,
          isDeleted: false,
        },
      },
      {
        $graphLookup: {
          from: 'curriculumnodes',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'descendants',
          restrictSearchWithMatch: { isDeleted: false },
        },
      },
      { $project: { descendants: 1 } },
    ]);

    const allDescendants = descendants[0]?.descendants ?? [];
    return { root, descendants: allDescendants };
  }

  /**
   * Create a single node. Only school-specific or system (admin-seeded).
   */
  static async createNode(schoolId: string | null, data: CreateNodeInput) {
    // Check for duplicate code
    const existing = await CurriculumNode.findOne({
      code: data.code,
      isDeleted: false,
    }).lean();
    if (existing) {
      throw new ConflictError(`A node with code "${data.code}" already exists`);
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parent = await CurriculumNode.findOne({
        _id: new mongoose.Types.ObjectId(data.parentId),
        isDeleted: false,
      }).lean();
      if (!parent) throw new NotFoundError('Parent node not found');
    }

    const node = await CurriculumNode.create({
      frameworkId: new mongoose.Types.ObjectId(data.frameworkId),
      type: data.type,
      parentId: data.parentId ? new mongoose.Types.ObjectId(data.parentId) : null,
      title: data.title,
      code: data.code,
      description: data.description,
      metadata: data.metadata,
      order: data.order,
      schoolId: schoolId ? new mongoose.Types.ObjectId(schoolId) : null,
    });
    return node.toObject();
  }

  /**
   * Update a node. System nodes can only be updated by super_admin.
   */
  static async updateNode(id: string, schoolId: string, data: UpdateNodeInput) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);

    const node = await CurriculumNode.findOne({
      _id: oid,
      $or: [{ schoolId: null }, { schoolId: soid }],
      isDeleted: false,
    }).lean();
    if (!node) throw new NotFoundError('Curriculum node not found');

    // Check code uniqueness if changing
    if (data.code && data.code !== node.code) {
      const dup = await CurriculumNode.findOne({
        code: data.code,
        _id: { $ne: oid },
        isDeleted: false,
      }).lean();
      if (dup) throw new ConflictError(`A node with code "${data.code}" already exists`);
    }

    // Build update payload — merge metadata if partial
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.code !== undefined) update.code = data.code;
    if (data.description !== undefined) update.description = data.description;
    if (data.order !== undefined) update.order = data.order;
    if (data.parentId !== undefined) {
      update.parentId = data.parentId
        ? new mongoose.Types.ObjectId(data.parentId)
        : null;
    }
    if (data.metadata) {
      for (const [key, val] of Object.entries(data.metadata)) {
        if (val !== undefined) update[`metadata.${key}`] = val;
      }
    }

    const updated = await CurriculumNode.findOneAndUpdate(
      { _id: oid, isDeleted: false },
      { $set: update },
      { new: true },
    ).lean();
    return updated;
  }

  /**
   * Soft-delete a node and all its descendants.
   */
  static async deleteNode(id: string, schoolId: string) {
    const oid = new mongoose.Types.ObjectId(id);
    const soid = new mongoose.Types.ObjectId(schoolId);

    const node = await CurriculumNode.findOne({
      _id: oid,
      $or: [{ schoolId: null }, { schoolId: soid }],
      isDeleted: false,
    }).lean();
    if (!node) throw new NotFoundError('Curriculum node not found');

    // Collect all descendant IDs via $graphLookup
    const result = await CurriculumNode.aggregate([
      { $match: { _id: oid } },
      {
        $graphLookup: {
          from: 'curriculumnodes',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'descendants',
          restrictSearchWithMatch: { isDeleted: false },
        },
      },
      { $project: { descendantIds: '$descendants._id' } },
    ]);

    const descendantIds: mongoose.Types.ObjectId[] = result[0]?.descendantIds ?? [];
    const allIds = [oid, ...descendantIds];

    await CurriculumNode.updateMany(
      { _id: { $in: allIds } },
      { $set: { isDeleted: true } },
    );

    return { deleted: allIds.length };
  }

  /**
   * Bulk import nodes. Uses `parentCode` to resolve parent references.
   * Nodes are inserted in array order — parents must come before children.
   */
  static async bulkImport(schoolId: string | null, data: BulkImportInput) {
    const frameworkOid = new mongoose.Types.ObjectId(data.frameworkId);
    const codeToId = new Map<string, mongoose.Types.ObjectId>();

    // Pre-load existing codes for this framework
    const existingNodes = await CurriculumNode.find({
      frameworkId: frameworkOid,
      isDeleted: false,
    })
      .select('code _id')
      .lean();
    for (const n of existingNodes) {
      codeToId.set(n.code, n._id as mongoose.Types.ObjectId);
    }

    const toInsert: Array<Record<string, unknown>> = [];
    const skipped: string[] = [];

    for (const node of data.nodes) {
      // Skip duplicates
      if (codeToId.has(node.code)) {
        skipped.push(node.code);
        continue;
      }

      // Resolve parent
      let parentId: mongoose.Types.ObjectId | null = null;
      if (node.parentCode) {
        const resolved = codeToId.get(node.parentCode);
        if (!resolved) {
          throw new BadRequestError(
            `Parent code "${node.parentCode}" not found for node "${node.code}". Ensure parents appear before children.`,
          );
        }
        parentId = resolved;
      }

      const newId = new mongoose.Types.ObjectId();
      codeToId.set(node.code, newId);

      toInsert.push({
        _id: newId,
        frameworkId: frameworkOid,
        type: node.type,
        parentId,
        title: node.title,
        code: node.code,
        description: node.description,
        metadata: node.metadata,
        order: node.order,
        schoolId: schoolId ? new mongoose.Types.ObjectId(schoolId) : null,
        isDeleted: false,
      });
    }

    if (toInsert.length > 0) {
      await CurriculumNode.insertMany(toInsert);
    }

    return { imported: toInsert.length, skipped: skipped.length, skippedCodes: skipped };
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/CurriculumStructure/service-nodes.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/CurriculumStructure/service-nodes.ts
git commit -m "feat(curriculum-structure): add NodesService with CRUD, tree traversal, and bulk import"
```

---

## Task 5: Backend — Controller

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
// campusly-backend/src/modules/CurriculumStructure/controller.ts
import type { Request, Response } from 'express';
import { getUser } from '../../types/authenticated-request.js';
import { apiResponse } from '../../common/utils.js';
import { FrameworksService } from './service-frameworks.js';
import { NodesService } from './service-nodes.js';

export class CurriculumStructureController {
  // ─── Frameworks ──────────────────────────────────────────────────────────────

  static async listFrameworks(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const frameworks = await FrameworksService.listFrameworks(user.schoolId!);
    res.json(apiResponse(true, frameworks));
  }

  static async createFramework(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const framework = await FrameworksService.createFramework(
      user.schoolId!,
      user.id,
      req.body,
    );
    res.status(201).json(apiResponse(true, framework, 'Framework created successfully'));
  }

  // ─── Nodes ───────────────────────────────────────────────────────────────────

  static async listNodes(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await NodesService.listNodes(user.schoolId!, {
      frameworkId: req.query.frameworkId as string | undefined,
      parentId: req.query.parentId === 'null'
        ? null
        : (req.query.parentId as string | undefined),
      type: req.query.type as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    } as Record<string, unknown>);
    res.json(apiResponse(true, result));
  }

  static async getNode(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const node = await NodesService.getNode(req.params.id, user.schoolId!);
    res.json(apiResponse(true, node));
  }

  static async getSubtree(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const tree = await NodesService.getSubtree(req.params.id, user.schoolId!);
    res.json(apiResponse(true, tree));
  }

  static async createNode(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const node = await NodesService.createNode(user.schoolId!, req.body);
    res.status(201).json(apiResponse(true, node, 'Node created successfully'));
  }

  static async updateNode(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const node = await NodesService.updateNode(req.params.id, user.schoolId!, req.body);
    res.json(apiResponse(true, node, 'Node updated successfully'));
  }

  static async deleteNode(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await NodesService.deleteNode(req.params.id, user.schoolId!);
    res.json(apiResponse(true, result, 'Node and descendants deleted'));
  }

  static async bulkImport(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const result = await NodesService.bulkImport(user.schoolId!, req.body);
    res.status(201).json(apiResponse(true, result, 'Bulk import completed'));
  }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd campusly-backend && npx tsc --noEmit src/modules/CurriculumStructure/controller.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/CurriculumStructure/controller.ts
git commit -m "feat(curriculum-structure): add controller for framework and node endpoints"
```

---

## Task 6: Backend — Routes + App Registration

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/routes.ts`
- Modify: `campusly-backend/src/app.ts`

- [ ] **Step 1: Create the routes file**

```typescript
// campusly-backend/src/modules/CurriculumStructure/routes.ts
import { Router } from 'express';
import { authorize, validate } from '../../middleware/index.js';
import { CurriculumStructureController } from './controller.js';
import {
  createFrameworkSchema,
  createNodeSchema,
  updateNodeSchema,
  bulkImportSchema,
  nodeQuerySchema,
} from './validation.js';

const router = Router();

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'] as const;
const READ_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'] as const;

// ─── Frameworks ──────────────────────────────────────────────────────────────

router.get(
  '/frameworks',
  authorize(...READ_ROLES),
  CurriculumStructureController.listFrameworks,
);

router.post(
  '/frameworks',
  authorize(...ADMIN_ROLES),
  validate(createFrameworkSchema),
  CurriculumStructureController.createFramework,
);

// ─── Nodes ───────────────────────────────────────────────────────────────────

router.get(
  '/nodes',
  authorize(...READ_ROLES),
  validate({ query: nodeQuerySchema }),
  CurriculumStructureController.listNodes,
);

router.get(
  '/nodes/:id',
  authorize(...READ_ROLES),
  CurriculumStructureController.getNode,
);

router.get(
  '/nodes/:id/tree',
  authorize(...READ_ROLES),
  CurriculumStructureController.getSubtree,
);

router.post(
  '/nodes',
  authorize(...ADMIN_ROLES),
  validate(createNodeSchema),
  CurriculumStructureController.createNode,
);

router.put(
  '/nodes/:id',
  authorize(...ADMIN_ROLES),
  validate(updateNodeSchema),
  CurriculumStructureController.updateNode,
);

router.delete(
  '/nodes/:id',
  authorize(...ADMIN_ROLES),
  CurriculumStructureController.deleteNode,
);

router.post(
  '/nodes/bulk',
  authorize(...ADMIN_ROLES),
  validate(bulkImportSchema),
  CurriculumStructureController.bulkImport,
);

export default router;
```

- [ ] **Step 2: Register the route in app.ts**

Add these lines to `campusly-backend/src/app.ts`:

After the existing curriculum import, add:
```typescript
import curriculumStructureRoutes from './modules/CurriculumStructure/routes.js';
```

After the existing curriculum route registration (`app.use('/api/curriculum', ...)`), add:
```typescript
app.use('/api/curriculum-structure', authenticate, curriculumStructureRoutes);
```

- [ ] **Step 3: Verify the backend compiles and starts**

Run: `cd campusly-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/CurriculumStructure/routes.ts src/app.ts
git commit -m "feat(curriculum-structure): add routes and register /api/curriculum-structure"
```

---

## Task 7: Frontend — Types

**Files:**
- Create: `campusly-frontend/src/types/curriculum-structure.ts`
- Modify: `campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Create the types file**

```typescript
// campusly-frontend/src/types/curriculum-structure.ts

// ─── Enums ───────────────────────────────────────────────────────────────────

export type CurriculumNodeType =
  | 'phase'
  | 'grade'
  | 'subject'
  | 'term'
  | 'topic'
  | 'subtopic'
  | 'outcome';

// ─── Cognitive Weighting ─────────────────────────────────────────────────────

export interface CognitiveWeighting {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

// ─── Node Metadata ───────────────────────────────────────────────────────────

export interface CurriculumNodeMetadata {
  weekNumbers: number[];
  capsReference: string;
  assessmentStandards: string[];
  notionalHours: number;
  cognitiveWeighting: CognitiveWeighting | null;
}

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface CurriculumFrameworkItem {
  id: string;
  name: string;
  description: string;
  schoolId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumNodeItem {
  id: string;
  frameworkId: string;
  type: CurriculumNodeType;
  parentId: string | null;
  title: string;
  code: string;
  description: string;
  metadata: CurriculumNodeMetadata;
  order: number;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumNodeWithChildren extends CurriculumNodeItem {
  children: CurriculumNodeItem[];
}

export interface CurriculumSubtree {
  root: CurriculumNodeItem;
  descendants: CurriculumNodeItem[];
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateNodePayload {
  frameworkId: string;
  type: CurriculumNodeType;
  parentId: string | null;
  title: string;
  code: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
}

export interface UpdateNodePayload {
  title?: string;
  code?: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
  parentId?: string | null;
}

export interface BulkImportNodeItem {
  type: CurriculumNodeType;
  parentCode: string | null;
  title: string;
  code: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
}

export interface BulkImportPayload {
  frameworkId: string;
  nodes: BulkImportNodeItem[];
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  skippedCodes: string[];
}

export interface CreateFrameworkPayload {
  name: string;
  description?: string;
}

// ─── Query Filters ───────────────────────────────────────────────────────────

export interface NodeFilters {
  frameworkId?: string;
  parentId?: string | null;
  type?: CurriculumNodeType;
  search?: string;
  page?: number;
  limit?: number;
}
```

- [ ] **Step 2: Add to barrel file**

Add this line to `campusly-frontend/src/types/index.ts` after the existing exports:
```typescript
export * from './curriculum-structure';
```

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/types/curriculum-structure.ts src/types/index.ts
git commit -m "feat(curriculum-structure): add frontend types for nodes, frameworks, and payloads"
```

---

## Task 8: Frontend — Hook

**Files:**
- Create: `campusly-frontend/src/hooks/useCurriculumStructure.ts`

- [ ] **Step 1: Create the hook**

```typescript
// campusly-frontend/src/hooks/useCurriculumStructure.ts
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  CurriculumFrameworkItem,
  CurriculumNodeItem,
  CurriculumNodeWithChildren,
  CurriculumSubtree,
  CreateNodePayload,
  UpdateNodePayload,
  BulkImportPayload,
  BulkImportResult,
  CreateFrameworkPayload,
  NodeFilters,
} from '@/types';

export function useCurriculumStructure() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [frameworks, setFrameworks] = useState<CurriculumFrameworkItem[]>([]);
  const [nodes, setNodes] = useState<CurriculumNodeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string>('');

  // ─── Frameworks ──────────────────────────────────────────────────────────────

  const fetchFrameworks = useCallback(async () => {
    try {
      const response = await apiClient.get('/curriculum-structure/frameworks');
      const data = unwrapList<CurriculumFrameworkItem>(response);
      setFrameworks(data);
      if (data.length > 0 && !selectedFramework) {
        const defaultFw = data.find((f: CurriculumFrameworkItem) => f.isDefault) ?? data[0];
        setSelectedFramework(defaultFw.id);
      }
    } catch (err: unknown) {
      console.error('Failed to load frameworks', err);
    }
  }, [selectedFramework]);

  const createFramework = useCallback(async (data: CreateFrameworkPayload) => {
    const response = await apiClient.post('/curriculum-structure/frameworks', data);
    const created = unwrapResponse<CurriculumFrameworkItem>(response);
    setFrameworks((prev) => [...prev, created]);
    toast.success('Framework created');
    return created;
  }, []);

  // ─── Nodes ───────────────────────────────────────────────────────────────────

  const fetchNodes = useCallback(async (filters?: NodeFilters) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters?.frameworkId) params.frameworkId = filters.frameworkId;
      if (filters?.parentId !== undefined) {
        params.parentId = filters.parentId === null ? 'null' : filters.parentId;
      }
      if (filters?.type) params.type = filters.type;
      if (filters?.search) params.search = filters.search;
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const response = await apiClient.get('/curriculum-structure/nodes', { params });
      const result = unwrapResponse<{ nodes: CurriculumNodeItem[]; total: number }>(response);
      setNodes(result.nodes);
      setTotal(result.total);
    } catch (err: unknown) {
      console.error('Failed to load nodes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getNode = useCallback(async (id: string) => {
    const response = await apiClient.get(`/curriculum-structure/nodes/${id}`);
    return unwrapResponse<CurriculumNodeWithChildren>(response);
  }, []);

  const getSubtree = useCallback(async (id: string) => {
    const response = await apiClient.get(`/curriculum-structure/nodes/${id}/tree`);
    return unwrapResponse<CurriculumSubtree>(response);
  }, []);

  const createNode = useCallback(async (data: CreateNodePayload) => {
    const response = await apiClient.post('/curriculum-structure/nodes', data);
    const created = unwrapResponse<CurriculumNodeItem>(response);
    toast.success('Node created');
    return created;
  }, []);

  const updateNode = useCallback(async (id: string, data: UpdateNodePayload) => {
    const response = await apiClient.put(`/curriculum-structure/nodes/${id}`, data);
    const updated = unwrapResponse<CurriculumNodeItem>(response);
    toast.success('Node updated');
    return updated;
  }, []);

  const deleteNode = useCallback(async (id: string) => {
    await apiClient.delete(`/curriculum-structure/nodes/${id}`);
    toast.success('Node deleted');
  }, []);

  const bulkImport = useCallback(async (data: BulkImportPayload) => {
    const response = await apiClient.post('/curriculum-structure/nodes/bulk', data);
    const result = unwrapResponse<BulkImportResult>(response);
    toast.success(`Imported ${result.imported} nodes${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`);
    return result;
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (schoolId) fetchFrameworks();
  }, [schoolId, fetchFrameworks]);

  return {
    frameworks,
    nodes,
    total,
    loading,
    selectedFramework,
    setSelectedFramework,
    fetchFrameworks,
    createFramework,
    fetchNodes,
    getNode,
    getSubtree,
    createNode,
    updateNode,
    deleteNode,
    bulkImport,
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd campusly-frontend && npx tsc --noEmit src/hooks/useCurriculumStructure.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/hooks/useCurriculumStructure.ts
git commit -m "feat(curriculum-structure): add useCurriculumStructure hook for API calls"
```

---

## Task 9: Frontend — NodeTreeItem Component

**Files:**
- Create: `campusly-frontend/src/components/curriculum/NodeTreeItem.tsx`

- [ ] **Step 1: Create the tree item component**

```tsx
// campusly-frontend/src/components/curriculum/NodeTreeItem.tsx
'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CurriculumNodeItem } from '@/types';

interface NodeTreeItemProps {
  node: CurriculumNodeItem;
  children: CurriculumNodeItem[];
  level: number;
  onExpand: (nodeId: string) => void;
  onEdit: (node: CurriculumNodeItem) => void;
  onDelete: (node: CurriculumNodeItem) => void;
  onAddChild: (parentNode: CurriculumNodeItem) => void;
  expandedNodes: Set<string>;
  childrenMap: Map<string, CurriculumNodeItem[]>;
  isAdmin: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  phase: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  grade: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  subject: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  term: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  topic: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  subtopic: 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300',
  outcome: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export function NodeTreeItem({
  node,
  children,
  level,
  onExpand,
  onEdit,
  onDelete,
  onAddChild,
  expandedNodes,
  childrenMap,
  isAdmin,
}: NodeTreeItemProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = children.length > 0;
  const paddingLeft = level * 24;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center"
          onClick={() => onExpand(node.id)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
        </button>

        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[node.type] ?? ''}`}>
          {node.type}
        </Badge>

        <span className="flex-1 truncate text-sm font-medium">{node.title}</span>

        <span className="hidden text-xs text-muted-foreground group-hover:inline">
          {node.code}
        </span>

        {isAdmin && (
          <div className="hidden gap-0.5 group-hover:flex">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(node)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(node)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded &&
        children.map((child) => (
          <NodeTreeItem
            key={child.id}
            node={child}
            children={childrenMap.get(child.id) ?? []}
            level={level + 1}
            onExpand={onExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
            expandedNodes={expandedNodes}
            childrenMap={childrenMap}
            isAdmin={isAdmin}
          />
        ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/curriculum/NodeTreeItem.tsx
git commit -m "feat(curriculum-structure): add NodeTreeItem recursive tree component"
```

---

## Task 10: Frontend — NodeTree Component

**Files:**
- Create: `campusly-frontend/src/components/curriculum/NodeTree.tsx`

- [ ] **Step 1: Create the tree container component**

```tsx
// campusly-frontend/src/components/curriculum/NodeTree.tsx
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Loader2, TreePine } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { NodeTreeItem } from './NodeTreeItem';
import type { CurriculumNodeItem } from '@/types';

interface NodeTreeProps {
  frameworkId: string;
  onEdit: (node: CurriculumNodeItem) => void;
  onDelete: (node: CurriculumNodeItem) => void;
  onAddChild: (parentNode: CurriculumNodeItem) => void;
  isAdmin: boolean;
  refreshKey?: number;
}

export function NodeTree({
  frameworkId,
  onEdit,
  onDelete,
  onAddChild,
  isAdmin,
  refreshKey,
}: NodeTreeProps) {
  const [nodesByParent, setNodesByParent] = useState<Map<string, CurriculumNodeItem[]>>(new Map());
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async (parentId: string | null) => {
    const params: Record<string, string | number> = {
      frameworkId,
      limit: 200,
    };
    params.parentId = parentId === null ? 'null' : parentId;

    const response = await apiClient.get('/curriculum-structure/nodes', { params });
    const result = response.data?.data ?? response.data;
    const nodes: CurriculumNodeItem[] = Array.isArray(result)
      ? result
      : (result?.nodes ?? []);
    return nodes;
  }, [frameworkId]);

  // Load root nodes on mount / framework change
  useEffect(() => {
    if (!frameworkId) return;
    setLoading(true);
    setNodesByParent(new Map());
    setExpandedNodes(new Set());

    fetchChildren(null)
      .then((roots) => {
        setNodesByParent(new Map([['root', roots]]));
      })
      .catch(() => {
        setNodesByParent(new Map());
      })
      .finally(() => setLoading(false));
  }, [frameworkId, fetchChildren, refreshKey]);

  const handleExpand = useCallback(async (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });

    // Lazy-load children if not yet fetched
    if (!nodesByParent.has(nodeId)) {
      const children = await fetchChildren(nodeId);
      setNodesByParent((prev) => {
        const next = new Map(prev);
        next.set(nodeId, children);
        return next;
      });
    }
  }, [nodesByParent, fetchChildren]);

  const rootNodes = nodesByParent.get('root') ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <TreePine className="mb-2 h-10 w-10" />
        <p className="text-sm">No curriculum nodes yet</p>
        <p className="text-xs">Use bulk import or add nodes manually</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {rootNodes.map((node) => (
        <NodeTreeItem
          key={node.id}
          node={node}
          children={nodesByParent.get(node.id) ?? []}
          level={0}
          onExpand={handleExpand}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          expandedNodes={expandedNodes}
          childrenMap={nodesByParent}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/curriculum/NodeTree.tsx
git commit -m "feat(curriculum-structure): add NodeTree container with lazy-loading children"
```

---

## Task 11: Frontend — NodeFormDialog Component

**Files:**
- Create: `campusly-frontend/src/components/curriculum/NodeFormDialog.tsx`

- [ ] **Step 1: Create the node form dialog**

```tsx
// campusly-frontend/src/components/curriculum/NodeFormDialog.tsx
'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurriculumNodeItem, CurriculumNodeType, CreateNodePayload, UpdateNodePayload } from '@/types';

interface NodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitCreate: (data: CreateNodePayload) => Promise<void>;
  onSubmitUpdate: (id: string, data: UpdateNodePayload) => Promise<void>;
  editingNode: CurriculumNodeItem | null;
  parentNode: CurriculumNodeItem | null;
  frameworkId: string;
}

interface FormValues {
  title: string;
  code: string;
  type: CurriculumNodeType;
  description: string;
  order: number;
}

const NODE_TYPES: { value: CurriculumNodeType; label: string }[] = [
  { value: 'phase', label: 'Phase' },
  { value: 'grade', label: 'Grade' },
  { value: 'subject', label: 'Subject' },
  { value: 'term', label: 'Term' },
  { value: 'topic', label: 'Topic' },
  { value: 'subtopic', label: 'Subtopic' },
  { value: 'outcome', label: 'Outcome' },
];

export function NodeFormDialog({
  open,
  onOpenChange,
  onSubmitCreate,
  onSubmitUpdate,
  editingNode,
  parentNode,
  frameworkId,
}: NodeFormDialogProps) {
  const isEditing = !!editingNode;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      code: '',
      type: 'topic',
      description: '',
      order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingNode) {
        reset({
          title: editingNode.title,
          code: editingNode.code,
          type: editingNode.type,
          description: editingNode.description,
          order: editingNode.order,
        });
      } else {
        reset({
          title: '',
          code: '',
          type: parentNode ? inferChildType(parentNode.type) : 'phase',
          description: '',
          order: 0,
        });
      }
    }
  }, [open, editingNode, parentNode, reset]);

  const onSubmit = async (values: FormValues) => {
    if (isEditing && editingNode) {
      await onSubmitUpdate(editingNode.id, {
        title: values.title,
        code: values.code,
        description: values.description,
        order: values.order,
      });
    } else {
      await onSubmitCreate({
        frameworkId,
        type: values.type,
        parentId: parentNode?.id ?? null,
        title: values.title,
        code: values.code,
        description: values.description,
        order: values.order,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Node' : parentNode ? `Add Child to "${parentNode.title}"` : 'Add Root Node'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input id="title" {...register('title', { required: 'Title is required' })} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
            <Input id="code" placeholder="e.g. CAPS-MAT-GR10-T1" {...register('code', { required: 'Code is required' })} />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select
                defaultValue={parentNode ? inferChildType(parentNode.type) : 'phase'}
                onValueChange={(val: unknown) => setValue('type', val as CurriculumNodeType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NODE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Sort Order</Label>
            <Input id="order" type="number" {...register('order', { valueAsNumber: true })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function inferChildType(parentType: CurriculumNodeType): CurriculumNodeType {
  const hierarchy: Record<CurriculumNodeType, CurriculumNodeType> = {
    phase: 'grade',
    grade: 'subject',
    subject: 'term',
    term: 'topic',
    topic: 'subtopic',
    subtopic: 'outcome',
    outcome: 'outcome',
  };
  return hierarchy[parentType];
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/curriculum/NodeFormDialog.tsx
git commit -m "feat(curriculum-structure): add NodeFormDialog for creating/editing nodes"
```

---

## Task 12: Frontend — BulkImportDialog Component

**Files:**
- Create: `campusly-frontend/src/components/curriculum/BulkImportDialog.tsx`

- [ ] **Step 1: Create the bulk import dialog**

```tsx
// campusly-frontend/src/components/curriculum/BulkImportDialog.tsx
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
import { Upload, AlertCircle } from 'lucide-react';
import type { BulkImportPayload, BulkImportNodeItem } from '@/types';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BulkImportPayload) => Promise<void>;
  frameworkId: string;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSubmit,
  frameworkId,
}: BulkImportDialogProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<BulkImportNodeItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleValidate = () => {
    setError('');
    setPreview([]);
    try {
      const parsed = JSON.parse(jsonText) as unknown;
      if (!Array.isArray(parsed)) {
        setError('JSON must be an array of node objects');
        return;
      }
      const nodes = parsed as BulkImportNodeItem[];
      if (nodes.length === 0) {
        setError('Array is empty');
        return;
      }
      if (nodes.length > 500) {
        setError('Maximum 500 nodes per import');
        return;
      }
      for (const [i, node] of nodes.entries()) {
        if (!node.title || !node.code || !node.type) {
          setError(`Node at index ${i} is missing required fields (title, code, type)`);
          return;
        }
      }
      setPreview(nodes);
    } catch {
      setError('Invalid JSON format');
    }
  };

  const handleSubmit = async () => {
    if (preview.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({ frameworkId, nodes: preview });
      setJsonText('');
      setPreview([]);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Nodes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label>JSON Array</Label>
            <Textarea
              rows={12}
              className="font-mono text-xs"
              placeholder={`[\n  {\n    "type": "phase",\n    "parentCode": null,\n    "title": "FET Phase",\n    "code": "CAPS-FET",\n    "order": 1\n  }\n]`}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview.length > 0 && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Preview: {preview.length} nodes</p>
              <div className="max-h-40 overflow-y-auto text-xs">
                {preview.slice(0, 20).map((node, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="text-muted-foreground">{node.type}</span>
                    <span className="font-medium">{node.title}</span>
                    <span className="text-muted-foreground">({node.code})</span>
                  </div>
                ))}
                {preview.length > 20 && (
                  <p className="pt-1 text-muted-foreground">...and {preview.length - 20} more</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {preview.length === 0 ? (
            <Button onClick={handleValidate} disabled={!jsonText.trim()}>
              Validate JSON
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              <Upload className="mr-2 h-4 w-4" />
              {submitting ? 'Importing...' : `Import ${preview.length} Nodes`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/curriculum/BulkImportDialog.tsx
git commit -m "feat(curriculum-structure): add BulkImportDialog with JSON validation and preview"
```

---

## Task 13: Frontend — NodePicker Reusable Component

**Files:**
- Create: `campusly-frontend/src/components/curriculum/NodePicker.tsx`

- [ ] **Step 1: Create the reusable node picker**

```tsx
// campusly-frontend/src/components/curriculum/NodePicker.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import type { CurriculumNodeItem } from '@/types';

interface NodePickerProps {
  frameworkId: string;
  value: string | null;
  onChange: (nodeId: string | null, node: CurriculumNodeItem | null) => void;
  filterTypes?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function NodePicker({
  frameworkId,
  value,
  onChange,
  filterTypes,
  placeholder = 'Select curriculum node...',
  disabled = false,
}: NodePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CurriculumNodeItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Load selected node label on mount
  useEffect(() => {
    if (value && !selectedNode) {
      apiClient.get(`/curriculum-structure/nodes/${value}`)
        .then((res) => {
          const node = res.data?.data ?? res.data;
          setSelectedNode(node);
        })
        .catch(() => { /* node may not exist */ });
    }
  }, [value, selectedNode]);

  const handleSearch = useCallback(async (term: string) => {
    setSearch(term);
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        frameworkId,
        search: term,
        limit: 20,
      };
      if (filterTypes && filterTypes.length > 0) {
        params.type = filterTypes[0];
      }
      const response = await apiClient.get('/curriculum-structure/nodes', { params });
      const data = response.data?.data ?? response.data;
      setResults(data?.nodes ?? (Array.isArray(data) ? data : []));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [frameworkId, filterTypes]);

  const handleSelect = (node: CurriculumNodeItem) => {
    setSelectedNode(node);
    onChange(node.id, node);
    setOpen(false);
    setSearch('');
    setResults([]);
  };

  const handleClear = () => {
    setSelectedNode(null);
    onChange(null, null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedNode ? (
            <span className="flex items-center gap-2 truncate">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {selectedNode.type}
              </Badge>
              <span className="truncate">{selectedNode.title}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="flex items-center gap-2 pb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            className="h-8 text-sm"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {loading && <p className="py-4 text-center text-xs text-muted-foreground">Searching...</p>}
          {!loading && results.length === 0 && search.length >= 2 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No results</p>
          )}
          {!loading && search.length < 2 && (
            <p className="py-4 text-center text-xs text-muted-foreground">Type at least 2 characters</p>
          )}
          {results.map((node) => (
            <button
              key={node.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => handleSelect(node)}
            >
              {value === node.id && <Check className="h-3.5 w-3.5 text-primary" />}
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                {node.type}
              </Badge>
              <span className="flex-1 truncate">{node.title}</span>
              <span className="text-[10px] text-muted-foreground">{node.code}</span>
            </button>
          ))}
        </div>
        {selectedNode && (
          <div className="border-t pt-2 mt-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleClear}>
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/components/curriculum/NodePicker.tsx
git commit -m "feat(curriculum-structure): add reusable NodePicker search/select component"
```

---

## Task 14: Frontend — Admin Structure Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/admin/curriculum/structure/page.tsx`

- [ ] **Step 1: Create the admin structure management page**

```tsx
// campusly-frontend/src/app/(dashboard)/admin/curriculum/structure/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Upload, TreePine } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { NodeTree } from '@/components/curriculum/NodeTree';
import { NodeFormDialog } from '@/components/curriculum/NodeFormDialog';
import { BulkImportDialog } from '@/components/curriculum/BulkImportDialog';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  CurriculumNodeItem,
  CreateNodePayload,
  UpdateNodePayload,
  BulkImportPayload,
} from '@/types';

export default function CurriculumStructurePage() {
  const {
    frameworks,
    selectedFramework,
    setSelectedFramework,
    fetchFrameworks,
    createNode,
    updateNode,
    deleteNode,
    bulkImport,
  } = useCurriculumStructure();

  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CurriculumNodeItem | null>(null);
  const [parentNode, setParentNode] = useState<CurriculumNodeItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAddRoot = () => {
    setEditingNode(null);
    setParentNode(null);
    setNodeDialogOpen(true);
  };

  const handleAddChild = (parent: CurriculumNodeItem) => {
    setEditingNode(null);
    setParentNode(parent);
    setNodeDialogOpen(true);
  };

  const handleEdit = (node: CurriculumNodeItem) => {
    setEditingNode(node);
    setParentNode(null);
    setNodeDialogOpen(true);
  };

  const handleDelete = async (node: CurriculumNodeItem) => {
    if (!confirm(`Delete "${node.title}" and all its children?`)) return;
    try {
      await deleteNode(node.id);
      refresh();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleCreate = async (data: CreateNodePayload) => {
    try {
      await createNode(data);
      refresh();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      throw err;
    }
  };

  const handleUpdate = async (id: string, data: UpdateNodePayload) => {
    try {
      await updateNode(id, data);
      refresh();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      throw err;
    }
  };

  const handleBulkImport = async (data: BulkImportPayload) => {
    try {
      await bulkImport(data);
      refresh();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Structure"
        description="Manage CAPS, IEB, and Cambridge curriculum topic trees"
        icon={TreePine}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={selectedFramework}
          onValueChange={(val: unknown) => setSelectedFramework(val as string)}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select framework..." />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((fw) => (
              <SelectItem key={fw.id} value={fw.id}>
                {fw.name}
                {fw.isDefault && ' (Default)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} disabled={!selectedFramework}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={handleAddRoot} disabled={!selectedFramework}>
            <Plus className="mr-2 h-4 w-4" />
            Add Root Node
          </Button>
        </div>
      </div>

      {selectedFramework && (
        <div className="rounded-lg border p-4">
          <NodeTree
            frameworkId={selectedFramework}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddChild={handleAddChild}
            isAdmin={true}
            refreshKey={refreshKey}
          />
        </div>
      )}

      <NodeFormDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={handleUpdate}
        editingNode={editingNode}
        parentNode={parentNode}
        frameworkId={selectedFramework}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSubmit={handleBulkImport}
        frameworkId={selectedFramework}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd campusly-frontend
git add src/app/\(dashboard\)/admin/curriculum/structure/page.tsx
git commit -m "feat(curriculum-structure): add admin structure management page with tree, forms, and bulk import"
```

---

## Task 15: Update Existing Admin Curriculum Page — Add Structure Link

**Files:**
- Modify: `campusly-frontend/src/app/(dashboard)/admin/curriculum/page.tsx`

- [ ] **Step 1: Read the current page to find where to add the link**

Read `campusly-frontend/src/app/(dashboard)/admin/curriculum/page.tsx` to identify the tab list or navigation area.

- [ ] **Step 2: Add a navigation link to the structure page**

Add a link/button in the page header or tab area that navigates to `/admin/curriculum/structure`. The exact edit depends on the current page layout — add a `Link` from `next/link` pointing to `/admin/curriculum/structure` near the existing tabs or header actions.

For example, if there's a header with buttons, add:
```tsx
import Link from 'next/link';

// In the header actions area:
<Link href="/admin/curriculum/structure">
  <Button variant="outline">
    <TreePine className="mr-2 h-4 w-4" />
    Manage Structure
  </Button>
</Link>
```

- [ ] **Step 3: Commit**

```bash
cd campusly-frontend
git add src/app/\(dashboard\)/admin/curriculum/page.tsx
git commit -m "feat(curriculum-structure): add navigation link to structure page from admin curriculum"
```

---

## Task 16: Seed System Frameworks

**Files:**
- Create: `campusly-backend/src/modules/CurriculumStructure/seed-frameworks.ts`

- [ ] **Step 1: Create a seed script for system frameworks**

```typescript
// campusly-backend/src/modules/CurriculumStructure/seed-frameworks.ts
import { CurriculumFramework } from '../TeacherWorkbench/model.js';

/**
 * Seed system-wide curriculum frameworks (CAPS, IEB, Cambridge).
 * Safe to run multiple times — uses findOneAndUpdate with upsert.
 */
export async function seedSystemFrameworks(): Promise<void> {
  const systemFrameworks = [
    {
      name: 'CAPS',
      description: 'Curriculum and Assessment Policy Statement — South African national curriculum (Grades R-12)',
      isDefault: true,
    },
    {
      name: 'IEB',
      description: 'Independent Examinations Board — IEB assessment overlay on CAPS curriculum',
      isDefault: false,
    },
    {
      name: 'Cambridge',
      description: 'Cambridge International — IGCSE, AS Level, and A Level curricula',
      isDefault: false,
    },
  ];

  for (const fw of systemFrameworks) {
    await CurriculumFramework.findOneAndUpdate(
      { name: fw.name, schoolId: null },
      {
        $setOnInsert: {
          schoolId: null,
          name: fw.name,
          description: fw.description,
          isDefault: fw.isDefault,
          createdBy: null,
          isDeleted: false,
        },
      },
      { upsert: true },
    );
  }

  console.log('System curriculum frameworks seeded (CAPS, IEB, Cambridge)');
}
```

- [ ] **Step 2: Note on CurriculumFramework schema change**

The existing `CurriculumFramework` schema has `schoolId` as `required: true`. For system frameworks, `schoolId` must be `null`. Update the schema in `campusly-backend/src/modules/TeacherWorkbench/model.ts`:

Change line in `curriculumFrameworkSchema`:
```typescript
// Before:
schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },

// After:
schoolId: { type: Schema.Types.ObjectId, ref: 'School', default: null },
```

Also update the `createdBy` field to allow null for system frameworks:
```typescript
// Before:
createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

// After:
createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
```

- [ ] **Step 3: Wire up the seed function**

Add the seed call to the server startup. Find where the server starts (usually `src/server.ts` or `src/index.ts`) and add after the database connection:

```typescript
import { seedSystemFrameworks } from './modules/CurriculumStructure/seed-frameworks.js';

// After mongoose.connect() succeeds:
await seedSystemFrameworks();
```

- [ ] **Step 4: Verify the backend starts and seeds**

Run: `cd campusly-backend && npm run dev`
Expected: Console logs "System curriculum frameworks seeded (CAPS, IEB, Cambridge)"

- [ ] **Step 5: Commit**

```bash
git add src/modules/CurriculumStructure/seed-frameworks.ts src/modules/TeacherWorkbench/model.ts src/server.ts
git commit -m "feat(curriculum-structure): seed system frameworks (CAPS, IEB, Cambridge) and allow null schoolId"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start the backend**

Run: `cd campusly-backend && npm run dev`
Expected: Server starts on port 4500, frameworks seeded

- [ ] **Step 2: Test framework listing**

Run: `curl -s http://localhost:4500/api/curriculum-structure/frameworks -H "Authorization: Bearer <TOKEN>" | jq`
Expected: JSON array with CAPS, IEB, Cambridge frameworks

- [ ] **Step 3: Test node creation**

Run:
```bash
curl -s -X POST http://localhost:4500/api/curriculum-structure/nodes \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"frameworkId":"<CAPS_FRAMEWORK_ID>","type":"phase","parentId":null,"title":"FET Phase","code":"CAPS-FET","order":1}' | jq
```
Expected: 201 response with created node

- [ ] **Step 4: Test node listing**

Run: `curl -s "http://localhost:4500/api/curriculum-structure/nodes?frameworkId=<CAPS_ID>&parentId=null" -H "Authorization: Bearer <TOKEN>" | jq`
Expected: JSON with nodes array containing the FET Phase node

- [ ] **Step 5: Start the frontend and verify the page**

Run: `cd campusly-frontend && npm run dev`
Navigate to: `http://localhost:3500/admin/curriculum/structure`
Expected: Page loads with framework selector showing CAPS/IEB/Cambridge, tree area shows empty state

- [ ] **Step 6: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix(curriculum-structure): smoke test fixes"
```

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | CurriculumNode Mongoose model | Backend |
| 2 | Zod validation schemas | Backend |
| 3 | FrameworksService (list, create) | Backend |
| 4 | NodesService (CRUD, tree, bulk import) | Backend |
| 5 | Controller (HTTP handlers) | Backend |
| 6 | Routes + app.ts registration | Backend |
| 7 | TypeScript types | Frontend |
| 8 | useCurriculumStructure hook | Frontend |
| 9 | NodeTreeItem component | Frontend |
| 10 | NodeTree container | Frontend |
| 11 | NodeFormDialog | Frontend |
| 12 | BulkImportDialog | Frontend |
| 13 | NodePicker (reusable) | Frontend |
| 14 | Admin structure page | Frontend |
| 15 | Link from existing admin page | Frontend |
| 16 | Seed system frameworks + schema update | Backend |
| 17 | End-to-end smoke test | Both |
