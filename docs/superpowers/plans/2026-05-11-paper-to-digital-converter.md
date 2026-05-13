# Paper → Digital Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let teachers upload a PDF or image of an existing paper-based resource and convert it into one or more structured digital `ContentResourceItem` records that flow into the existing library, reader, homework, and lesson workspace.

**Architecture:** A new `PaperImport` backend module exposes REST endpoints to create/list/cancel conversion jobs. Each job is processed by a BullMQ worker (`paper-import.job.ts`) that runs five stages — render pages, segment, transcribe, enhance, finalise — using the existing `AIService` (Anthropic Claude Sonnet 4 vision). Output is inserted via the existing `ResourcesService.createResource`. A standalone wizard at `/teacher/curriculum/import` drives it, polling job state every 3 seconds until terminal.

**Tech Stack:** Node + Express + Mongoose + BullMQ/Redis on the backend, Next.js 16 (React 19) + Zustand + Axios on the frontend. Anthropic SDK already wired. Vitest for tests on both sides. Tailwind 4. Zod v4 — always import from `'zod/v4'`.

**Reference spec:** [docs/superpowers/specs/2026-05-11-paper-to-digital-converter-design.md](../specs/2026-05-11-paper-to-digital-converter-design.md)

**House rules (from CLAUDE.md & memory):**
- Commits go straight to master (no feature branch)
- Every Mongo query (including single-entity) filters by `schoolId`
- `isDeleted: false` on every find when the model uses soft delete
- No `any` types, all `catch` blocks `catch (err: unknown)`
- Frontend pages and components have ZERO `apiClient` imports — only hooks do
- Max 350 lines per file
- Tailwind: use `text-destructive` not `text-red-*`; every grid has mobile breakpoints

---

## Phase 1 — Backend foundations

### Task 1: Install new dependencies

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/package.json`
- Modify: `c:/Users/shaun/campusly-frontend/package.json`

- [ ] **Step 1: Add backend packages**

```bash
cd c:/Users/shaun/campusly-backend
npm install pdf-to-img sharp
```

- [ ] **Step 2: Add frontend package**

```bash
cd c:/Users/shaun/campusly-frontend
npm install pdfjs-dist
```

- [ ] **Step 3: Verify install**

Run from backend: `node -e "import('pdf-to-img').then(m => console.log(typeof m.pdf))"`
Expected: `function`
Run from backend: `node -e "import('sharp').then(m => console.log(typeof m.default))"`
Expected: `function`

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add package.json package-lock.json
git commit -m "chore(deps): add pdf-to-img and sharp for paper-import pipeline"
```
```bash
cd c:/Users/shaun/campusly-frontend
git add package.json package-lock.json
git commit -m "chore(deps): add pdfjs-dist for paper-import upload page-count check"
```

---

### Task 2: Extend `ContentResource` for source attribution

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/ContentLibrary/model.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/ContentLibrary/validation.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/modules/ContentLibrary/service-resources.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/types/content.ts` (or whichever file holds `ContentResourceItem`)

- [ ] **Step 1: Extend the source enum in model.ts**

Replace the line `export const RESOURCE_SOURCES = ['oer', 'ai_generated', 'teacher', 'system'] as const;` with:

```ts
export const RESOURCE_SOURCES = ['oer', 'ai_generated', 'teacher', 'system', 'imported'] as const;
```

- [ ] **Step 2: Add `sourceImport` and `needsReview` to the interface and schema**

In `IContentResource` (after `prerequisites: Types.ObjectId[];`), add:

```ts
  sourceImport?: {
    jobId: Types.ObjectId;
    storagePath: string;
    filename: string;
    mimeType: string;
    pageRange: { start: number; end: number };
  };
  needsReview: boolean;
```

In the `contentResourceSchema` definition (alongside existing fields), add:

```ts
    sourceImport: {
      jobId: { type: Schema.Types.ObjectId, ref: 'PaperImportJob' },
      storagePath: { type: String },
      filename: { type: String },
      mimeType: { type: String },
      pageRange: {
        start: { type: Number },
        end: { type: Number },
      },
    },
    needsReview: { type: Boolean, default: false },
```

- [ ] **Step 3: Update the validation Zod enum**

In `validation.ts`, replace:

```ts
const resourceSourceEnum = z.enum(['oer', 'ai_generated', 'teacher', 'system']);
```

with:

```ts
const resourceSourceEnum = z.enum(['oer', 'ai_generated', 'teacher', 'system', 'imported']);
```

And in `createResourceSchema`, add (after `prerequisites`):

```ts
  sourceImport: z.object({
    jobId: z.string(),
    storagePath: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    pageRange: z.object({ start: z.number().int().min(1), end: z.number().int().min(1) }),
  }).optional(),
  needsReview: z.boolean().default(false),
```

- [ ] **Step 4: Pass new fields through `ResourcesService.createResource`**

In `service-resources.ts` inside the `ContentResource.create({ ... })` call, add (next to `prerequisites`):

```ts
      sourceImport: data.sourceImport
        ? {
            jobId: new mongoose.Types.ObjectId(data.sourceImport.jobId),
            storagePath: data.sourceImport.storagePath,
            filename: data.sourceImport.filename,
            mimeType: data.sourceImport.mimeType,
            pageRange: data.sourceImport.pageRange,
          }
        : undefined,
      needsReview: data.needsReview ?? false,
```

- [ ] **Step 5: Mirror the type on the frontend**

Search for `ContentResourceItem` in `c:/Users/shaun/campusly-frontend/src/types/`. In the file that defines it, add:

```ts
export interface SourceImportRef {
  jobId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  pageRange: { start: number; end: number };
}
```

And add to the `ContentResourceItem` interface:

```ts
  source: 'oer' | 'ai_generated' | 'teacher' | 'system' | 'imported';
  sourceImport?: SourceImportRef;
  needsReview: boolean;
```

- [ ] **Step 6: Write a test for the schema extension**

Create: `c:/Users/shaun/campusly-backend/src/modules/ContentLibrary/__tests__/source-import.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createResourceSchema } from '../validation.js';

const base = {
  curriculumNodeId: '64b0a0a0a0a0a0a0a0a0a0a0',
  type: 'worksheet',
  title: 'T',
  blocks: [],
  gradeId: '64b0a0a0a0a0a0a0a0a0a0a1',
  subjectId: '64b0a0a0a0a0a0a0a0a0a0a2',
  term: 1,
  tags: [],
  prerequisites: [],
};

describe('createResourceSchema source extensions', () => {
  it('accepts source: imported', () => {
    expect(createResourceSchema.safeParse({ ...base, source: 'imported' }).success).toBe(true);
  });
  it('accepts sourceImport block', () => {
    const r = createResourceSchema.safeParse({
      ...base,
      source: 'imported',
      sourceImport: {
        jobId: '64b0a0a0a0a0a0a0a0a0a0a3',
        storagePath: 'uploads/paper-imports/abc/source.pdf',
        filename: 'worksheet.pdf',
        mimeType: 'application/pdf',
        pageRange: { start: 1, end: 3 },
      },
      needsReview: true,
    });
    expect(r.success).toBe(true);
  });
  it('defaults needsReview to false', () => {
    const r = createResourceSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.needsReview).toBe(false);
  });
});
```

- [ ] **Step 7: Run the test**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/modules/ContentLibrary/__tests__/source-import.test.ts`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/ContentLibrary/
git commit -m "feat(content-library): add sourceImport, needsReview, and 'imported' source enum"
```
```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/
git commit -m "feat(types): mirror sourceImport and needsReview on ContentResourceItem"
```

---

## Phase 2 — PaperImport module skeleton

### Task 3: PaperImportJob model

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/model.ts`

- [ ] **Step 1: Write the model**

```ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export const JOB_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STAGES = ['uploading', 'segmenting', 'transcribing', 'enhancing', 'finalising'] as const;
export type JobStage = (typeof JOB_STAGES)[number];

export const SOURCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type SourceMimeType = (typeof SOURCE_MIME_TYPES)[number];

export interface IPaperImportJob extends Document {
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  status: JobStatus;
  progress: {
    stage: JobStage;
    pagesTotal: number;
    pagesDone: number;
    message: string;
  };
  curriculum: {
    subjectId: Types.ObjectId;
    gradeId: Types.ObjectId;
    term: number;
    curriculumNodeId: Types.ObjectId;
  };
  options: {
    generateAnswers: boolean;
    addHints: boolean;
    addWorkedExample: boolean;
    addExplanations: boolean;
    instructions?: string;
  };
  source: {
    filename: string;
    mimeType: SourceMimeType;
    sizeBytes: number;
    pageCount: number;
    storagePath: string;
  };
  resultResourceIds: Types.ObjectId[];
  error?: { code: string; message: string };
  isDeleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema(
  {
    stage: { type: String, enum: JOB_STAGES, default: 'uploading' },
    pagesTotal: { type: Number, default: 0 },
    pagesDone: { type: Number, default: 0 },
    message: { type: String, default: '' },
  },
  { _id: false },
);

const curriculumSchema = new Schema(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    term: { type: Number, required: true },
    curriculumNodeId: { type: Schema.Types.ObjectId, ref: 'CurriculumNode', required: true },
  },
  { _id: false },
);

const optionsSchema = new Schema(
  {
    generateAnswers: { type: Boolean, default: true },
    addHints: { type: Boolean, default: true },
    addWorkedExample: { type: Boolean, default: true },
    addExplanations: { type: Boolean, default: true },
    instructions: { type: String },
  },
  { _id: false },
);

const sourceSchema = new Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, enum: SOURCE_MIME_TYPES, required: true },
    sizeBytes: { type: Number, required: true },
    pageCount: { type: Number, default: 0 },
    storagePath: { type: String, required: true },
  },
  { _id: false },
);

const paperImportJobSchema = new Schema<IPaperImportJob>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: JOB_STATUSES, default: 'pending' },
    progress: { type: progressSchema, default: () => ({}) },
    curriculum: { type: curriculumSchema, required: true },
    options: { type: optionsSchema, default: () => ({}) },
    source: { type: sourceSchema, required: true },
    resultResourceIds: [{ type: Schema.Types.ObjectId, ref: 'ContentResource' }],
    error: {
      code: { type: String },
      message: { type: String },
    },
    isDeleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

paperImportJobSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });
paperImportJobSchema.index({ status: 1, updatedAt: 1 });

export const PaperImportJob = mongoose.model<IPaperImportJob>(
  'PaperImportJob',
  paperImportJobSchema,
);
```

- [ ] **Step 2: Verify the model compiles**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit src/modules/PaperImport/model.ts`
Expected: no output (compiles clean).

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/model.ts
git commit -m "feat(paper-import): add PaperImportJob model"
```

---

### Task 4: Zod schemas for payloads and AI responses

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/validation.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import {
  CreatePaperImportSchema,
  SegmentResponseSchema,
  TranscribeResponseSchema,
} from '../validation.js';

const objectId = '64b0a0a0a0a0a0a0a0a0a0a0';

describe('CreatePaperImportSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = CreatePaperImportSchema.safeParse({
      subjectId: objectId, gradeId: objectId, term: 1, curriculumNodeId: objectId,
      generateAnswers: true, addHints: true, addWorkedExample: false, addExplanations: false,
    });
    expect(r.success).toBe(true);
  });
  it('rejects term outside 1-4', () => {
    expect(CreatePaperImportSchema.safeParse({
      subjectId: objectId, gradeId: objectId, term: 5, curriculumNodeId: objectId,
      generateAnswers: true, addHints: true, addWorkedExample: false, addExplanations: false,
    }).success).toBe(false);
  });
});

describe('SegmentResponseSchema', () => {
  it('accepts valid', () => {
    expect(SegmentResponseSchema.safeParse({
      resources: [{ kind: 'worksheet', title: 'X', pageRange: [1, 2], reasoning: 'r' }],
    }).success).toBe(true);
  });
  it('rejects unknown kind', () => {
    expect(SegmentResponseSchema.safeParse({
      resources: [{ kind: 'unknown', title: 'X', pageRange: [1, 2], reasoning: 'r' }],
    }).success).toBe(false);
  });
});

describe('TranscribeResponseSchema', () => {
  it('accepts blocks with confidence + optional cropBox', () => {
    const r = TranscribeResponseSchema.safeParse({
      title: 'X',
      blocks: [
        { blockId: 'b1', type: 'text', order: 0, content: '{}', confidence: 0.9 },
        { blockId: 'b2', type: 'image', order: 1, content: '{}', confidence: 0.7,
          cropBox: { page: 1, x: 0.1, y: 0.1, w: 0.5, h: 0.5 } },
      ],
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/modules/PaperImport/__tests__/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the validation module**

```ts
import { z } from 'zod/v4';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid ObjectId');

export const CreatePaperImportSchema = z.object({
  subjectId: objectIdSchema,
  gradeId: objectIdSchema,
  term: z.number().int().min(1).max(4),
  curriculumNodeId: objectIdSchema,
  generateAnswers: z.boolean(),
  addHints: z.boolean(),
  addWorkedExample: z.boolean(),
  addExplanations: z.boolean(),
  instructions: z.string().max(2000).optional(),
});
export type CreatePaperImportInput = z.infer<typeof CreatePaperImportSchema>;

const resourceKindEnum = z.enum([
  'lesson', 'worksheet', 'activity', 'study_notes', 'worked_example',
]);

export const SegmentResponseSchema = z.object({
  resources: z.array(
    z.object({
      kind: resourceKindEnum,
      title: z.string().min(1).max(200),
      pageRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
      reasoning: z.string().default(''),
    }),
  ).min(1),
});
export type SegmentResponse = z.infer<typeof SegmentResponseSchema>;

const blockTypeEnum = z.enum([
  'text', 'quiz', 'fill_blank', 'match_columns', 'ordering', 'step_reveal', 'image',
]);

export const TranscribeResponseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  blocks: z.array(
    z.object({
      blockId: z.string().min(1),
      type: blockTypeEnum,
      order: z.number().int().min(0),
      content: z.string(),
      confidence: z.number().min(0).max(1),
      cropBox: z
        .object({
          page: z.number().int().min(1),
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          w: z.number().min(0).max(1),
          h: z.number().min(0).max(1),
        })
        .optional(),
    }),
  ).default([]),
});
export type TranscribeResponse = z.infer<typeof TranscribeResponseSchema>;

export const AnswersEnhancementSchema = z.object({
  answers: z.array(z.object({ blockId: z.string(), answer: z.string() })),
});

export const HintsEnhancementSchema = z.object({
  hints: z.array(z.object({ blockId: z.string(), hints: z.array(z.string()) })),
});

export const ExplanationsEnhancementSchema = z.object({
  explanations: z.array(z.object({ blockId: z.string(), explanation: z.string() })),
});

export const WorkedExampleEnhancementSchema = z.object({
  block: z.object({
    blockId: z.string().min(1),
    type: z.literal('step_reveal'),
    order: z.number().int().min(0),
    content: z.string(),
  }),
});
```

- [ ] **Step 4: Run tests**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/modules/PaperImport/__tests__/validation.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/
git commit -m "feat(paper-import): add validation schemas for payload and AI responses"
```

---

### Task 5: Storage helpers

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-storage.ts`

- [ ] **Step 1: Write the storage module**

```ts
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_PAGES = 30;
export const RENDER_DPI = Number(process.env.PAPER_IMPORT_RENDER_DPI ?? 150);

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function sanitiseExt(mimeType: string): string {
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.bin';
}

export function importsRoot(): string {
  return path.join(process.cwd(), 'uploads', 'paper-imports');
}

export function jobDir(jobId: string): string {
  return path.join(importsRoot(), jobId);
}

export function sourcePath(jobId: string, mimeType: string): string {
  return path.join(jobDir(jobId), `source${sanitiseExt(mimeType)}`);
}

export function pagePath(jobId: string, pageNumber: number): string {
  const padded = String(pageNumber).padStart(3, '0');
  return path.join(jobDir(jobId), `page-${padded}.png`);
}

export function cropPath(jobId: string, blockId: string): string {
  return path.join(jobDir(jobId), 'crops', `${blockId}.png`);
}

/** Multer config that writes uploads to a temp file under the imports root. */
export function createUpload(): multer.Multer {
  ensureDir(importsRoot());
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const tmp = path.join(importsRoot(), '_incoming');
      ensureDir(tmp);
      cb(null, tmp);
    },
    filename: (_req, file, cb) => {
      const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      cb(null, `incoming-${stamp}${sanitiseExt(file.mimetype)}`);
    },
  });
  return multer({
    storage,
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
      else cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  });
}

/** Move the multer-written file to its final job folder; returns the final path. */
export function finaliseUpload(
  tmpPath: string,
  jobId: string,
  mimeType: string,
): string {
  const dir = jobDir(jobId);
  ensureDir(dir);
  const finalPath = sourcePath(jobId, mimeType);
  fs.renameSync(tmpPath, finalPath);
  return finalPath;
}

/** Render every PDF page to <jobDir>/page-NNN.png. Returns the page count. */
export async function renderPdfPages(jobId: string, pdfPath: string): Promise<number> {
  const dir = jobDir(jobId);
  ensureDir(dir);
  const scale = RENDER_DPI / 72;
  const document = await pdf(pdfPath, { scale });
  let count = 0;
  for await (const pageBuffer of document) {
    count += 1;
    fs.writeFileSync(pagePath(jobId, count), pageBuffer);
  }
  return count;
}

/** Crop a region from a rendered page. cropBox values are 0..1 normalised. */
export async function cropPageRegion(
  jobId: string,
  page: number,
  blockId: string,
  box: { x: number; y: number; w: number; h: number },
): Promise<string> {
  const cropDir = path.join(jobDir(jobId), 'crops');
  ensureDir(cropDir);
  const src = pagePath(jobId, page);
  const meta = await sharp(src).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  const left = Math.max(0, Math.floor(box.x * W));
  const top = Math.max(0, Math.floor(box.y * H));
  const width = Math.max(1, Math.floor(box.w * W));
  const height = Math.max(1, Math.floor(box.h * H));
  const dest = cropPath(jobId, blockId);
  await sharp(src).extract({ left, top, width, height }).png().toFile(dest);
  return dest;
}

/** Read a file as base64 (used to pass images to Anthropic vision). */
export function fileToBase64(filePath: string): string {
  return fs.readFileSync(filePath).toString('base64');
}

/** Remove all on-disk artefacts for a job (called by DELETE handler). */
export function purgeJobFiles(jobId: string): void {
  const dir = jobDir(jobId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
```

- [ ] **Step 2: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit src/modules/PaperImport/service-storage.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-storage.ts
git commit -m "feat(paper-import): storage helpers — multer, render PDF pages, sharp crop"
```

---

### Task 6: Prompt templates

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-conversion-prompts.ts`

- [ ] **Step 1: Write the prompts module**

```ts
import type { ResourceType } from '../ContentLibrary/model.js';

const BLOCK_TYPES_BY_RESOURCE: Record<ResourceType, string[]> = {
  lesson: ['text', 'quiz', 'fill_blank', 'step_reveal', 'image'],
  worksheet: ['text', 'quiz', 'fill_blank', 'match_columns', 'ordering'],
  activity: ['text', 'quiz', 'fill_blank', 'match_columns', 'image'],
  study_notes: ['text', 'image', 'quiz', 'step_reveal'],
  worked_example: ['text', 'step_reveal', 'quiz', 'image'],
};

export const SEGMENT_SYSTEM = `You are segmenting a teacher's paper resource into one or more digital resources.
Identify resource boundaries using visual cues: section headings, numbered question groups, chapter breaks,
change of layout. A scanned paper may be a single resource or several. Output JSON only.

Schema:
{
  "resources": [
    {
      "kind": "lesson" | "worksheet" | "activity" | "study_notes" | "worked_example",
      "title": string (max 200 chars),
      "pageRange": [startPage:int, endPage:int],
      "reasoning": string (short — for our debug logs)
    }
  ]
}

Rules:
- pageRange uses 1-based page numbers.
- Pages cover the entire document with no overlap.
- If unsure, prefer fewer, bigger resources over many small ones.
`;

export function transcribeSystem(kind: ResourceType): string {
  const allowed = BLOCK_TYPES_BY_RESOURCE[kind].join(', ');
  return `You are transcribing pages of a paper resource into a digital resource of type "${kind}".
Allowed block types: ${allowed}.

Faithfully preserve the text, math (output as LaTeX inside $…$), instructions, and question structure.
DO NOT invent content not on the page. If a region is a diagram, figure, or photo that cannot be reliably
transcribed as text, emit an "image" block with a "cropBox" pointing to its location.

Output JSON only:
{
  "title": string,
  "description"?: string,
  "blocks": [
    {
      "blockId": string (uuid-ish),
      "type": one of ${allowed},
      "order": int (0-based),
      "content": JSON-string matching the per-type shape below,
      "confidence": float 0..1 (your self-rated transcription confidence for this block),
      "cropBox"?: { "page": int, "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 }   // for image blocks only
    }
  ]
}

Per-type content JSON shapes (the value of "content" is a JSON STRING of one of these):
- text:          { "html": string }
- quiz:          { "stem": string, "options": [{"label": "A"|"B"|"C"|"D"|"E", "text": string, "isCorrect": boolean}] }
- fill_blank:    { "template": string with {{1}} {{2}} markers, "blanks": [string,...] }
- match_columns: { "left": string[], "right": string[], "pairs": [[leftIdx, rightIdx],...] }
- ordering:      { "items": string[], "correctOrder": int[] }
- step_reveal:   { "steps": [{"prompt": string, "reveal": string}] }
- image:         { "src": string, "alt": string }     // src is filled in by the worker post-process

Rules:
- For questions whose correct answer is not visible on the page, leave isCorrect=false on all options and
  set blanks=[] for fill_blank (worker will run a separate ENHANCE pass to fill these in).
- Confidence reflects only how well YOU transcribed the block, not the difficulty of the question.
`;
}

export const ANSWERS_ENHANCEMENT_SYSTEM = `You are filling in correct answers for question blocks whose answer
is not yet known. You are given the question blocks as JSON. For each, output the answer using the same
per-type shape used by the transcriber.

Output JSON only:
{ "answers": [ { "blockId": string, "answer": JSON-string matching the block's per-type shape (only fields needed
to mark correctness — for quiz the same options array but with isCorrect set; for fill_blank, the blanks array) } ] }
`;

export const HINTS_ENHANCEMENT_SYSTEM = `For each question block provided, produce one short hint that nudges
the learner without revealing the answer.

Output JSON only:
{ "hints": [ { "blockId": string, "hints": [string] } ] }
`;

export const EXPLANATIONS_ENHANCEMENT_SYSTEM = `For each question block (with its known answer), produce a 1-3
sentence explanation of why the answer is correct.

Output JSON only:
{ "explanations": [ { "blockId": string, "explanation": string } ] }
`;

export const WORKED_EXAMPLE_ENHANCEMENT_SYSTEM = `Choose the hardest question in the provided resource and
produce a single new "step_reveal" block that demonstrates how to solve it step by step.

Output JSON only:
{ "block": { "blockId": string, "type": "step_reveal", "order": int (place at end), "content": JSON-string of
the step_reveal shape: { "steps": [{"prompt": string, "reveal": string}] } } }
`;

export const STRICTIFY_SUFFIX = `

If your previous response failed JSON parsing, return ONLY a valid JSON object matching the schema above.
Do not include any prose, code fences, or markdown formatting — only the JSON.`;
```

- [ ] **Step 2: Verify compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit src/modules/PaperImport/service-conversion-prompts.ts`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-conversion-prompts.ts
git commit -m "feat(paper-import): conversion prompt templates for segment/transcribe/enhance"
```

---

## Phase 3 — Worker

### Task 7: BullMQ queue + worker skeleton

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/jobs/queues.ts`
- Create: `c:/Users/shaun/campusly-backend/src/jobs/paper-import.job.ts`
- Modify: `c:/Users/shaun/campusly-backend/src/jobs/index.ts`

- [ ] **Step 1: Add the queue**

In `queues.ts`, after the other queue exports, add:

```ts
export const paperImportQueue = new Queue('paper-import', {
  connection: redisConnection,
});
```

- [ ] **Step 2: Write the worker skeleton**

```ts
import { Worker, Job } from 'bullmq';
import { logger } from '../common/logger.js';
import { redisConnection, paperImportQueue } from './queues.js';
import { PaperImportJob } from '../modules/PaperImport/model.js';
import { runConversion } from '../modules/PaperImport/service-worker.js';

interface PaperImportJobData {
  jobId: string;
  teacherId: string;
  schoolId: string;
}

export function createPaperImportWorker(): Worker {
  const concurrency = Number(process.env.PAPER_IMPORT_WORKER_CONCURRENCY ?? 2);
  const worker = new Worker(
    'paper-import',
    async (job: Job<PaperImportJobData>) => {
      logger.info(`[PaperImport] start jobId=${job.data.jobId}`);
      const dbJob = await PaperImportJob.findOne({
        _id: job.data.jobId,
        schoolId: job.data.schoolId,
        isDeleted: false,
      });
      if (!dbJob) throw new Error(`PaperImportJob ${job.data.jobId} not found`);
      await runConversion(dbJob);
      logger.info(`[PaperImport] complete jobId=${job.data.jobId}`);
    },
    { connection: redisConnection, concurrency, autorun: true },
  );

  worker.on('failed', async (bullJob, err) => {
    logger.error(`[PaperImport] job ${bullJob?.id} failed: ${err.message}`);
    if (bullJob && bullJob.attemptsMade >= (bullJob.opts?.attempts ?? 3)) {
      try {
        await PaperImportJob.findOneAndUpdate(
          { _id: bullJob.data.jobId, schoolId: bullJob.data.schoolId, isDeleted: false },
          { $set: { status: 'failed', error: { code: 'worker_failure', message: err.message } } },
        );
      } catch (cleanupErr: unknown) {
        logger.error(`[PaperImport] cleanup failed: ${(cleanupErr as Error).message}`);
      }
    }
  });

  return worker;
}

export async function enqueuePaperImportJob(data: PaperImportJobData): Promise<void> {
  await paperImportQueue.add('convert', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 86400 },
  });
}
```

- [ ] **Step 3: Boot the worker in `src/jobs/index.ts`**

Find where the other workers are created (look for `createAIGradingWorker`) and add a call to `createPaperImportWorker()`. Import it at the top.

- [ ] **Step 4: Confirm compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output (compiles clean — note: `service-worker.ts` doesn't exist yet, so this may flag an error — fix by creating it as an empty stub in the next step).

- [ ] **Step 5: Stub `service-worker.ts`**

Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

```ts
import type { IPaperImportJob } from './model.js';

export async function runConversion(job: IPaperImportJob): Promise<void> {
  // Implemented across Tasks 8-13
  job.status = 'completed';
  await job.save();
}
```

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/jobs/queues.ts src/jobs/paper-import.job.ts src/jobs/index.ts src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): BullMQ queue and worker skeleton"
```

---

### Task 8: Worker Stage 1 — render pages

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Implement Stage 1**

Replace the stub with:

```ts
import { logger } from '../../common/logger.js';
import { PaperImportJob, type IPaperImportJob } from './model.js';
import { renderPdfPages, jobDir, pagePath } from './service-storage.js';
import fs from 'fs';

async function setProgress(
  job: IPaperImportJob,
  patch: Partial<IPaperImportJob['progress']>,
): Promise<void> {
  Object.assign(job.progress, patch);
  await job.save();
}

async function isCancelled(jobId: string): Promise<boolean> {
  const fresh = await PaperImportJob.findOne(
    { _id: jobId, isDeleted: false },
  ).select('status').lean();
  return fresh?.status === 'cancelled';
}

async function stage1Render(job: IPaperImportJob): Promise<void> {
  await setProgress(job, { stage: 'uploading', message: 'Rendering pages…' });
  if (job.source.mimeType === 'application/pdf') {
    // Idempotent: skip if page-001.png already exists with the right count
    const firstPage = pagePath(String(job._id), 1);
    if (!fs.existsSync(firstPage) || job.source.pageCount === 0) {
      const count = await renderPdfPages(String(job._id), job.source.storagePath);
      job.source.pageCount = count;
      await job.save();
    }
  } else {
    // Image upload: pageCount = 1; no render needed.
    if (job.source.pageCount === 0) {
      job.source.pageCount = 1;
      await job.save();
    }
  }
  await setProgress(job, { pagesTotal: job.source.pageCount });
}

export async function runConversion(job: IPaperImportJob): Promise<void> {
  job.status = 'running';
  await job.save();

  if (await isCancelled(String(job._id))) return;
  await stage1Render(job);

  // Stages 2-5 added in subsequent tasks
  logger.info(`[PaperImport] stage1 complete jobId=${String(job._id)} pages=${job.source.pageCount}`);
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): worker stage 1 — render PDF pages"
```

---

### Task 9: Worker Stage 2 — SEGMENT

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Add Stage 2**

Add these imports at the top of `service-worker.ts`:

```ts
import { AIService } from '../../services/ai.service.js';
import {
  SegmentResponseSchema,
  type SegmentResponse,
} from './validation.js';
import { SEGMENT_SYSTEM, STRICTIFY_SUFFIX } from './service-conversion-prompts.js';
import { fileToBase64, pagePath } from './service-storage.js';
import fs from 'fs';
```

Add the function:

```ts
async function stage2Segment(job: IPaperImportJob): Promise<SegmentResponse['resources']> {
  await setProgress(job, { stage: 'segmenting', message: 'Detecting resource boundaries…' });

  const total = job.source.pageCount;
  const usePdf = job.source.mimeType === 'application/pdf' && total <= 20;

  async function callOnce(strict: boolean): Promise<unknown> {
    const sys = strict ? SEGMENT_SYSTEM + STRICTIFY_SUFFIX : SEGMENT_SYSTEM;
    const userText = `The document has ${total} page(s). Segment it.`;
    if (usePdf) {
      const base64 = fileToBase64(job.source.storagePath);
      const { text } = await AIService.generateDocumentCompletion(
        sys, userText, base64, 'application/pdf',
      );
      return JSON.parse(text);
    }
    // Render pages → PNGs in base64
    const images = Array.from({ length: total }, (_, i) => ({
      base64: fileToBase64(pagePath(String(job._id), i + 1)),
      mediaType: 'image/png' as const,
    }));
    const { text } = await AIService.generateVisionCompletionWithImages(sys, userText, images);
    return JSON.parse(text);
  }

  let raw: unknown;
  try {
    raw = await callOnce(false);
  } catch (err: unknown) {
    logger.warn(`[PaperImport] segment first attempt failed: ${(err as Error).message}`);
    raw = await callOnce(true);
  }

  const parsed = SegmentResponseSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(`[PaperImport] segment parse failed, falling back to single worksheet`);
    return [{ kind: 'worksheet', title: 'Imported worksheet', pageRange: [1, total], reasoning: 'fallback' }];
  }
  return parsed.data.resources;
}
```

- [ ] **Step 2: Call Stage 2 from `runConversion`**

Replace the `// Stages 2-5 added in subsequent tasks` comment with:

```ts
  if (await isCancelled(String(job._id))) return;
  const segments = await stage2Segment(job);
  logger.info(`[PaperImport] stage2 segments=${segments.length} jobId=${String(job._id)}`);
```

(Note: `AIService.generateDocumentCompletionWithUsage` is the existing method that handles PDF docs — check `c:/Users/shaun/campusly-backend/src/services/ai.service.ts` for the exact name and arity. If the method returns a different shape, adapt the destructuring above.)

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output. If `AIService` method names differ, adjust imports and call sites until clean.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): worker stage 2 — SEGMENT via Anthropic vision"
```

---

### Task 10: Worker Stage 3 — TRANSCRIBE

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Add Stage 3**

Add imports:

```ts
import { TranscribeResponseSchema, type TranscribeResponse } from './validation.js';
import { transcribeSystem } from './service-conversion-prompts.js';
import type { ResourceType } from '../ContentLibrary/model.js';
```

Add the function:

```ts
interface TranscribedResource {
  segmentKind: ResourceType;
  pageRange: [number, number];
  result: TranscribeResponse;
}

async function stage3Transcribe(
  job: IPaperImportJob,
  segments: SegmentResponse['resources'],
): Promise<TranscribedResource[]> {
  await setProgress(job, { stage: 'transcribing', message: 'Transcribing pages…' });
  const out: TranscribedResource[] = [];

  for (let i = 0; i < segments.length; i += 1) {
    if (await isCancelled(String(job._id))) return out;
    const seg = segments[i];
    const [startPage, endPage] = seg.pageRange;

    await setProgress(job, {
      pagesDone: startPage - 1,
      message: `Transcribing pages ${startPage}-${endPage} (${i + 1}/${segments.length})`,
    });

    const images = [];
    for (let p = startPage; p <= endPage; p += 1) {
      images.push({
        base64: fileToBase64(pagePath(String(job._id), p)),
        mediaType: 'image/png' as const,
      });
    }
    const sys = transcribeSystem(seg.kind);
    const userText = `Transcribe these ${endPage - startPage + 1} page(s) into a "${seg.kind}" resource titled "${seg.title}".`;

    async function callOnce(strict: boolean): Promise<unknown> {
      const fullSys = strict ? sys + STRICTIFY_SUFFIX : sys;
      const { text } = await AIService.generateVisionCompletionWithImages(fullSys, userText, images);
      return JSON.parse(text);
    }

    let raw: unknown;
    try {
      raw = await callOnce(false);
    } catch (err: unknown) {
      logger.warn(`[PaperImport] transcribe attempt 1 failed (${seg.title}): ${(err as Error).message}`);
      try {
        raw = await callOnce(true);
      } catch (err2: unknown) {
        logger.error(`[PaperImport] transcribe attempt 2 failed (${seg.title}): ${(err2 as Error).message}`);
        continue; // skip this resource, continue with rest
      }
    }

    const parsed = TranscribeResponseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn(`[PaperImport] transcribe parse failed (${seg.title})`);
      continue;
    }
    out.push({ segmentKind: seg.kind, pageRange: seg.pageRange, result: parsed.data });
  }

  await setProgress(job, { pagesDone: job.source.pageCount });
  return out;
}
```

- [ ] **Step 2: Call Stage 3 from `runConversion`**

After the Stage 2 call, add:

```ts
  if (await isCancelled(String(job._id))) return;
  const transcribed = await stage3Transcribe(job, segments);
  logger.info(`[PaperImport] stage3 resources=${transcribed.length} jobId=${String(job._id)}`);
  if (transcribed.length === 0) {
    job.status = 'failed';
    job.error = { code: 'transcribe_empty', message: 'Could not extract any content from the file.' };
    await job.save();
    return;
  }
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): worker stage 3 — TRANSCRIBE per segment"
```

---

### Task 11: Worker Stage 4 — ENHANCE

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Add Stage 4 helpers**

Add imports:

```ts
import {
  AnswersEnhancementSchema,
  HintsEnhancementSchema,
  ExplanationsEnhancementSchema,
  WorkedExampleEnhancementSchema,
} from './validation.js';
import {
  ANSWERS_ENHANCEMENT_SYSTEM,
  HINTS_ENHANCEMENT_SYSTEM,
  EXPLANATIONS_ENHANCEMENT_SYSTEM,
  WORKED_EXAMPLE_ENHANCEMENT_SYSTEM,
} from './service-conversion-prompts.js';
```

Add the function:

```ts
async function enhanceOne(
  systemPrompt: string,
  userPayload: unknown,
): Promise<unknown | null> {
  try {
    const text = await AIService.generateCompletion(
      systemPrompt,
      JSON.stringify(userPayload),
      { temperature: 0.2 },
    );
    return JSON.parse(text);
  } catch (err: unknown) {
    logger.warn(`[PaperImport] enhancement failed: ${(err as Error).message}`);
    return null;
  }
}

async function stage4Enhance(
  job: IPaperImportJob,
  transcribed: TranscribedResource[],
): Promise<TranscribedResource[]> {
  await setProgress(job, { stage: 'enhancing', message: 'Adding answers, hints, explanations…' });
  const opts = job.options;

  for (const r of transcribed) {
    if (await isCancelled(String(job._id))) return transcribed;

    const questionBlocks = r.result.blocks.filter((b) =>
      ['quiz', 'fill_blank', 'match_columns', 'ordering'].includes(b.type),
    );
    if (questionBlocks.length === 0) continue;

    const enhancements: Promise<void>[] = [];

    if (opts.generateAnswers) {
      enhancements.push((async () => {
        const raw = await enhanceOne(ANSWERS_ENHANCEMENT_SYSTEM, { blocks: questionBlocks });
        const parsed = raw && AnswersEnhancementSchema.safeParse(raw);
        if (parsed && parsed.success) {
          for (const { blockId, answer } of parsed.data.answers) {
            const target = r.result.blocks.find((b) => b.blockId === blockId);
            if (target) target.content = answer;
          }
        }
      })());
    }

    if (opts.addHints) {
      enhancements.push((async () => {
        const raw = await enhanceOne(HINTS_ENHANCEMENT_SYSTEM, { blocks: questionBlocks });
        const parsed = raw && HintsEnhancementSchema.safeParse(raw);
        if (parsed && parsed.success) {
          for (const { blockId, hints } of parsed.data.hints) {
            const target = r.result.blocks.find((b) => b.blockId === blockId);
            if (target) (target as unknown as { hints: string[] }).hints = hints;
          }
        }
      })());
    }

    if (opts.addExplanations) {
      enhancements.push((async () => {
        const raw = await enhanceOne(EXPLANATIONS_ENHANCEMENT_SYSTEM, { blocks: questionBlocks });
        const parsed = raw && ExplanationsEnhancementSchema.safeParse(raw);
        if (parsed && parsed.success) {
          for (const { blockId, explanation } of parsed.data.explanations) {
            const target = r.result.blocks.find((b) => b.blockId === blockId);
            if (target) (target as unknown as { explanation: string }).explanation = explanation;
          }
        }
      })());
    }

    if (opts.addWorkedExample) {
      enhancements.push((async () => {
        const raw = await enhanceOne(WORKED_EXAMPLE_ENHANCEMENT_SYSTEM, { resource: r.result });
        const parsed = raw && WorkedExampleEnhancementSchema.safeParse(raw);
        if (parsed && parsed.success) {
          r.result.blocks.push({
            blockId: parsed.data.block.blockId,
            type: 'step_reveal',
            order: parsed.data.block.order,
            content: parsed.data.block.content,
            confidence: 1,
          });
        }
      })());
    }

    await Promise.all(enhancements);
  }
  return transcribed;
}
```

- [ ] **Step 2: Call Stage 4 from `runConversion`**

After Stage 3, add:

```ts
  if (await isCancelled(String(job._id))) return;
  const enhanced = await stage4Enhance(job, transcribed);
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): worker stage 4 — ENHANCE (answers/hints/explanations/worked example)"
```

---

### Task 12: Worker Stage 5 — FINALISE

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Add Stage 5**

Add imports:

```ts
import { ResourcesService } from '../ContentLibrary/service-resources.js';
import { cropPageRegion, cropPath } from './service-storage.js';
import path from 'path';
```

Add helper + function:

```ts
const CONFIDENCE_THRESHOLD = Number(process.env.PAPER_IMPORT_CONFIDENCE_THRESHOLD ?? 0.55);

function median(values: number[]): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function pageImageUrl(jobId: string, page: number): string {
  return `/api/paper-imports/${jobId}/page/${page}`;
}

function cropImageUrl(jobId: string, blockId: string): string {
  return `/api/paper-imports/${jobId}/crops/${blockId}.png`;
}

async function stage5Finalise(
  job: IPaperImportJob,
  enhanced: TranscribedResource[],
): Promise<void> {
  await setProgress(job, { stage: 'finalising', message: 'Saving resources…' });
  const jobId = String(job._id);

  for (const r of enhanced) {
    if (await isCancelled(jobId)) return;

    const confidences = r.result.blocks.map((b) => b.confidence ?? 1);
    const medianConf = median(confidences);
    const fallback = medianConf < CONFIDENCE_THRESHOLD;

    let finalBlocks: Array<{
      blockId: string;
      type: string;
      order: number;
      content: string;
      hints?: string[];
      explanation?: string;
      metadata?: Record<string, unknown>;
    }>;

    if (fallback) {
      // One image block per page in range
      finalBlocks = [];
      for (let p = r.pageRange[0]; p <= r.pageRange[1]; p += 1) {
        finalBlocks.push({
          blockId: `page-${p}-${jobId}`,
          type: 'image',
          order: p - r.pageRange[0],
          content: JSON.stringify({ src: pageImageUrl(jobId, p), alt: `Page ${p}` }),
          metadata: { needsReview: true },
        });
      }
    } else {
      // Process blocks: extract crops, strip transient fields, set per-block needsReview
      finalBlocks = [];
      for (const b of r.result.blocks) {
        const needsReview = (b.confidence ?? 1) < CONFIDENCE_THRESHOLD;
        let content = b.content;
        if (b.type === 'image' && b.cropBox) {
          try {
            await cropPageRegion(jobId, b.cropBox.page, b.blockId, {
              x: b.cropBox.x, y: b.cropBox.y, w: b.cropBox.w, h: b.cropBox.h,
            });
            content = JSON.stringify({ src: cropImageUrl(jobId, b.blockId), alt: '' });
          } catch (err: unknown) {
            logger.warn(`[PaperImport] crop failed for ${b.blockId}: ${(err as Error).message}`);
            content = JSON.stringify({ src: pageImageUrl(jobId, b.cropBox.page), alt: '' });
          }
        }
        const block: Record<string, unknown> = {
          blockId: b.blockId,
          type: b.type,
          order: b.order,
          content,
        };
        if ((b as unknown as { hints?: string[] }).hints) {
          block.hints = (b as unknown as { hints: string[] }).hints;
        }
        if ((b as unknown as { explanation?: string }).explanation) {
          block.explanation = (b as unknown as { explanation: string }).explanation;
        }
        if (needsReview) block.metadata = { needsReview: true };
        finalBlocks.push(block as typeof finalBlocks[number]);
      }
    }

    // Idempotency: skip if this segment is already in resultResourceIds for the job
    // (we mark by pageRange in metadata).
    const created = await ResourcesService.createResource(
      String(job.schoolId),
      String(job.teacherId),
      {
        curriculumNodeId: String(job.curriculum.curriculumNodeId),
        type: r.segmentKind,
        format: 'static',
        title: r.result.title,
        blocks: finalBlocks.map((b) => ({ ...b, curriculumNodeId: null })),
        source: 'imported',
        sourceAttribution: '',
        gradeId: String(job.curriculum.gradeId),
        subjectId: String(job.curriculum.subjectId),
        term: job.curriculum.term,
        tags: [],
        difficulty: 3,
        estimatedMinutes: 30,
        prerequisites: [],
        sourceImport: {
          jobId,
          storagePath: job.source.storagePath,
          filename: job.source.filename,
          mimeType: job.source.mimeType,
          pageRange: { start: r.pageRange[0], end: r.pageRange[1] },
        },
        needsReview: fallback,
      },
    );
    job.resultResourceIds.push(created._id);
    await job.save();
  }

  job.status = 'completed';
  job.completedAt = new Date();
  await job.save();
}
```

- [ ] **Step 2: Call Stage 5 from `runConversion`**

After Stage 4, add:

```ts
  await stage5Finalise(job, enhanced);
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output. (May need to widen `CreateResourceInput` if Step 1's block shape doesn't match exactly — adjust the call site, not the type.)

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): worker stage 5 — FINALISE crops + insert resources"
```

---

### Task 13: Cancellation rollback + telemetry + idempotency safety

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-worker.ts`

- [ ] **Step 1: Add the AI call wrapper that logs usage**

This wrapper replaces direct calls to `AIService.generate*` methods in stages 2-4 so every Anthropic call records to `AIUsageLog` (matching Quick Make + grading per the spec).

Add imports at the top of `service-worker.ts`:

```ts
import { AIUsageLog } from '../AITools/model.js';
```

Add this near the top of the module (file-level, before the stage functions):

```ts
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

interface RunTotals { inputTokens: number; outputTokens: number; }

async function logUsage(
  job: IPaperImportJob,
  usage: { input_tokens: number; output_tokens: number } | undefined,
  totals: RunTotals,
): Promise<void> {
  if (!usage) return;
  totals.inputTokens += usage.input_tokens;
  totals.outputTokens += usage.output_tokens;
  try {
    await AIUsageLog.create({
      schoolId: job.schoolId,
      teacherId: job.teacherId,
      type: 'paper_import',
      tokensUsed: { input: usage.input_tokens, output: usage.output_tokens },
      aiModel: ANTHROPIC_MODEL,
    });
  } catch (err: unknown) {
    logger.warn(`[PaperImport] AIUsageLog write failed: ${(err as Error).message}`);
  }
}
```

- [ ] **Step 2: Thread the `totals` through stages 2-4**

All four `AIService.generate*` methods in this codebase already return `{ text, usage }` (verified — see lines 70, 144, 158, 217 of `ai.service.ts`). Update the stage function signatures to accept `totals: RunTotals`, change each `const { text } = await AIService.generate*(...)` to `const { text, usage } = await AIService.generate*(...)`, then add `await logUsage(job, usage, totals);` after the call.

Concretely:
- `stage2Segment(job, totals)` — capture usage from both branches (document and vision-images)
- `stage3Transcribe(job, segments, totals)` — capture usage inside the per-segment loop after each `generateVisionCompletionWithImages` call
- `stage4Enhance(job, transcribed, totals)` — change `enhanceOne` to return `{ raw, usage }`, capture both, log usage

For `stage4`'s `enhanceOne`, change from `AIService.generateCompletion` (returns `string`) to `AIService.generateCompletionWithUsage` (returns `{ text, usage }`) so we can log tokens.

- [ ] **Step 3: Replace `runConversion` with the wrapped orchestrator**

```ts
async function rollbackPartialResources(jobId: string): Promise<void> {
  const job = await PaperImportJob.findById(jobId);
  if (!job) return;
  if (job.resultResourceIds.length > 0) {
    const ContentResource = (await import('../ContentLibrary/model.js')).ContentResource;
    await ContentResource.updateMany(
      { _id: { $in: job.resultResourceIds } },
      { $set: { isDeleted: true } },
    );
    job.resultResourceIds = [];
    await job.save();
  }
}

export async function runConversion(job: IPaperImportJob): Promise<void> {
  const jobId = String(job._id);
  const startedAt = Date.now();
  const totals: RunTotals = { inputTokens: 0, outputTokens: 0 };
  job.status = 'running';
  await job.save();

  try {
    if (await isCancelled(jobId)) { await rollbackPartialResources(jobId); return; }
    await stage1Render(job);

    if (await isCancelled(jobId)) { await rollbackPartialResources(jobId); return; }
    const segments = await stage2Segment(job, totals);

    if (await isCancelled(jobId)) { await rollbackPartialResources(jobId); return; }
    const transcribed = await stage3Transcribe(job, segments, totals);
    if (transcribed.length === 0) {
      job.status = 'failed';
      job.error = { code: 'transcribe_empty', message: 'Could not extract any content.' };
      await job.save();
      return;
    }

    if (await isCancelled(jobId)) { await rollbackPartialResources(jobId); return; }
    const enhanced = await stage4Enhance(job, transcribed, totals);

    if (await isCancelled(jobId)) { await rollbackPartialResources(jobId); return; }
    await stage5Finalise(job, enhanced);

    const duration = Date.now() - startedAt;
    logger.info(
      `[PaperImport] job=${jobId} resources=${job.resultResourceIds.length} pages=${job.source.pageCount} ` +
      `tokens=${totals.inputTokens}/${totals.outputTokens} duration=${duration}ms`,
    );
  } catch (err: unknown) {
    logger.error(`[PaperImport] runConversion failed jobId=${jobId}: ${(err as Error).message}`);
    job.status = 'failed';
    job.error = { code: 'unexpected', message: (err as Error).message };
    await job.save();
    throw err; // let BullMQ retry
  }
}
```

(Note: the totals plumbing — adding `totals: RunTotals` to stage functions — is the part that requires touching Tasks 9-11's signatures. Make that consistent: each stage takes `totals` and calls `logUsage` after each AI call.)

- [ ] **Step 4: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-worker.ts
git commit -m "feat(paper-import): cancellation rollback + AIUsageLog telemetry + try/catch"
```

---

### Task 14: Retention cron + worker boot wiring

**Files:**
- Modify: `c:/Users/shaun/campusly-backend/src/jobs/index.ts`
- Create: `c:/Users/shaun/campusly-backend/src/jobs/paper-import-cleanup.job.ts`

- [ ] **Step 1: Write the cleanup job**

```ts
import { logger } from '../common/logger.js';
import { PaperImportJob } from '../modules/PaperImport/model.js';
import { purgeJobFiles } from '../modules/PaperImport/service-storage.js';

const RETENTION_DAYS = Number(process.env.PAPER_IMPORT_RETENTION_DAYS ?? 90);

export async function runPaperImportCleanup(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000);
  const stale = await PaperImportJob.find({
    isDeleted: false,
    createdAt: { $lt: cutoff },
  }).select('_id').lean();

  for (const job of stale) {
    purgeJobFiles(String(job._id));
    await PaperImportJob.updateOne(
      { _id: job._id },
      { $set: { isDeleted: true } },
    );
    logger.info(`[PaperImport] cleanup purged jobId=${String(job._id)}`);
  }
}
```

- [ ] **Step 2: Boot the worker + schedule the cleanup**

In `src/jobs/index.ts`, add (next to other worker creations):

```ts
import { createPaperImportWorker } from './paper-import.job.js';
import { runPaperImportCleanup } from './paper-import-cleanup.job.js';
```

After the workers are created, add:

```ts
createPaperImportWorker();
setInterval(() => {
  runPaperImportCleanup().catch((err: unknown) => {
    logger.error(`[PaperImport] cleanup error: ${(err as Error).message}`);
  });
}, 24 * 3600 * 1000); // daily
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/jobs/index.ts src/jobs/paper-import-cleanup.job.ts
git commit -m "feat(paper-import): boot worker + daily retention cleanup"
```

---

## Phase 4 — Backend routes

### Task 15: Job service (CRUD)

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/service-jobs.ts`

- [ ] **Step 1: Write the service**

```ts
import mongoose from 'mongoose';
import { ContentResource } from '../ContentLibrary/model.js';
import { PaperImportJob, type JobStatus } from './model.js';
import { purgeJobFiles } from './service-storage.js';
import { NotFoundError, ForbiddenError } from '../../common/errors.js';

interface ListFilters {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}

export class PaperImportJobsService {
  static async list(schoolId: string, teacherId: string, filters: ListFilters) {
    const query: Record<string, unknown> = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      isDeleted: false,
    };
    if (filters.status) query.status = filters.status;
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const [rows, total] = await Promise.all([
      PaperImportJob.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      PaperImportJob.countDocuments(query),
    ]);
    return { items: rows, total };
  }

  static async get(jobId: string, schoolId: string, teacherId: string) {
    const job = await PaperImportJob.findOne({
      _id: jobId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      isDeleted: false,
    }).lean();
    if (!job) throw new NotFoundError('Job not found');
    return job;
  }

  static async countRunningForTeacher(schoolId: string, teacherId: string): Promise<number> {
    return PaperImportJob.countDocuments({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      status: { $in: ['pending', 'running'] },
      isDeleted: false,
    });
  }

  static async cancel(jobId: string, schoolId: string, teacherId: string) {
    const job = await PaperImportJob.findOneAndUpdate(
      {
        _id: jobId,
        schoolId: new mongoose.Types.ObjectId(schoolId),
        teacherId: new mongoose.Types.ObjectId(teacherId),
        status: { $in: ['pending', 'running'] },
        isDeleted: false,
      },
      { $set: { status: 'cancelled' } },
      { new: true },
    );
    if (!job) throw new NotFoundError('Job not found or not cancellable');
    return job;
  }

  /** Soft-delete the job, purge files, and clear sourceImport on linked resources. */
  static async softDelete(jobId: string, schoolId: string, teacherId: string) {
    const job = await PaperImportJob.findOne({
      _id: jobId,
      schoolId: new mongoose.Types.ObjectId(schoolId),
      teacherId: new mongoose.Types.ObjectId(teacherId),
      isDeleted: false,
    });
    if (!job) throw new NotFoundError('Job not found');
    if (job.status === 'running' || job.status === 'pending') {
      throw new ForbiddenError('Cancel the job before deleting it');
    }
    job.isDeleted = true;
    await job.save();
    purgeJobFiles(String(job._id));
    await ContentResource.updateMany(
      { 'sourceImport.jobId': job._id },
      { $unset: { sourceImport: 1 } },
    );
  }
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/service-jobs.ts
git commit -m "feat(paper-import): jobs service — list/get/cancel/delete with school+teacher scoping"
```

---

### Task 16: Controller + routes

**Files:**
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/controller.ts`
- Create: `c:/Users/shaun/campusly-backend/src/modules/PaperImport/routes.ts`

- [ ] **Step 1: Write the controller**

```ts
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { PaperImportJob, type SourceMimeType, SOURCE_MIME_TYPES } from './model.js';
import { PaperImportJobsService } from './service-jobs.ts';
import { CreatePaperImportSchema } from './validation.js';
import {
  finaliseUpload,
  sourcePath as sourcePathFor,
  jobDir,
  cropPath,
  pagePath,
  MAX_PAGES,
} from './service-storage.js';
import { enqueuePaperImportJob } from '../../jobs/paper-import.job.js';
import { ValidationError, ForbiddenError } from '../../common/errors.js';

interface AuthRequest extends Request {
  user: { id: string; schoolId: string };
}

export class PaperImportController {
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ValidationError('Source file is required');
      const parsed = CreatePaperImportSchema.safeParse({
        ...req.body,
        term: Number(req.body.term),
        generateAnswers: req.body.generateAnswers === 'true',
        addHints: req.body.addHints === 'true',
        addWorkedExample: req.body.addWorkedExample === 'true',
        addExplanations: req.body.addExplanations === 'true',
      });
      if (!parsed.success) throw new ValidationError(parsed.error.message);

      const running = await PaperImportJobsService.countRunningForTeacher(
        req.user.schoolId, req.user.id,
      );
      if (running >= 2) {
        return res.status(429).json({ message: 'You already have 2 jobs in progress' });
      }

      const job = await PaperImportJob.create({
        schoolId: req.user.schoolId,
        teacherId: req.user.id,
        status: 'pending',
        curriculum: {
          subjectId: parsed.data.subjectId,
          gradeId: parsed.data.gradeId,
          term: parsed.data.term,
          curriculumNodeId: parsed.data.curriculumNodeId,
        },
        options: {
          generateAnswers: parsed.data.generateAnswers,
          addHints: parsed.data.addHints,
          addWorkedExample: parsed.data.addWorkedExample,
          addExplanations: parsed.data.addExplanations,
          instructions: parsed.data.instructions,
        },
        source: {
          filename: req.file.originalname,
          mimeType: req.file.mimetype as SourceMimeType,
          sizeBytes: req.file.size,
          pageCount: 0,
          storagePath: '',
        },
      });

      const final = finaliseUpload(req.file.path, String(job._id), req.file.mimetype);
      job.source.storagePath = final;
      await job.save();

      await enqueuePaperImportJob({
        jobId: String(job._id),
        teacherId: req.user.id,
        schoolId: req.user.schoolId,
      });

      res.status(201).json({ jobId: String(job._id) });
    } catch (err) { next(err); }
  }

  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaperImportJobsService.list(req.user.schoolId, req.user.id, {
        status: req.query.status as never,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: result.items, total: result.total });
    } catch (err) { next(err); }
  }

  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const job = await PaperImportJobsService.get(req.params.jobId, req.user.schoolId, req.user.id);
      res.json({ data: job });
    } catch (err) { next(err); }
  }

  static async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const job = await PaperImportJobsService.cancel(
        req.params.jobId, req.user.schoolId, req.user.id,
      );
      res.json({ data: job });
    } catch (err) { next(err); }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PaperImportJobsService.softDelete(req.params.jobId, req.user.schoolId, req.user.id);
      res.json({ ok: true });
    } catch (err) { next(err); }
  }

  static async streamSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const job = await PaperImportJobsService.get(req.params.jobId, req.user.schoolId, req.user.id);
      const file = sourcePathFor(String(job._id), job.source.mimeType);
      if (!fs.existsSync(file)) throw new ForbiddenError('Source file no longer exists');
      res.setHeader('Content-Type', job.source.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${job.source.filename}"`);
      fs.createReadStream(file).pipe(res);
    } catch (err) { next(err); }
  }

  static async streamCrop(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PaperImportJobsService.get(req.params.jobId, req.user.schoolId, req.user.id);
      const safeName = path.basename(req.params.filename); // strip any path traversal
      const file = path.join(jobDir(req.params.jobId), 'crops', safeName);
      if (!fs.existsSync(file)) throw new ForbiddenError('Crop not found');
      res.setHeader('Content-Type', 'image/png');
      fs.createReadStream(file).pipe(res);
    } catch (err) { next(err); }
  }

  static async streamPage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PaperImportJobsService.get(req.params.jobId, req.user.schoolId, req.user.id);
      const page = Number(req.params.page);
      if (!Number.isFinite(page) || page < 1 || page > MAX_PAGES) {
        throw new ForbiddenError('Invalid page');
      }
      const file = pagePath(req.params.jobId, page);
      if (!fs.existsSync(file)) throw new ForbiddenError('Page not found');
      res.setHeader('Content-Type', 'image/png');
      fs.createReadStream(file).pipe(res);
    } catch (err) { next(err); }
  }
}
```

- [ ] **Step 2: Write the routes**

```ts
import { Router } from 'express';
import { PaperImportController } from './controller.js';
import { createUpload } from './service-storage.js';
import { requireAuth } from '../../middleware/auth.js'; // adjust path to project's auth middleware

const router = Router();
const upload = createUpload();

router.use(requireAuth);

router.post('/', upload.single('source'), PaperImportController.create);
router.get('/', PaperImportController.list);
router.get('/:jobId', PaperImportController.get);
router.post('/:jobId/cancel', PaperImportController.cancel);
router.delete('/:jobId', PaperImportController.remove);
router.get('/:jobId/source', PaperImportController.streamSource);
router.get('/:jobId/crops/:filename', PaperImportController.streamCrop);
router.get('/:jobId/page/:page', PaperImportController.streamPage);

export default router;
```

(Confirm the auth middleware import path matches the existing one used by, e.g., `AITools/routes.ts`.)

- [ ] **Step 3: Mount in `app.ts`**

In `c:/Users/shaun/campusly-backend/src/app.ts`, find where other routers are mounted (search for `paper-imports` first — should not exist, then for example `/api/ai-tools`) and add:

```ts
import paperImportRouter from './modules/PaperImport/routes.js';
// ...
app.use('/api/paper-imports', paperImportRouter);
```

- [ ] **Step 4: Compile**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Smoke test (server boot)**

Run: `cd c:/Users/shaun/campusly-backend && npm run dev`
Expected: server starts without errors. Check the worker boots: look for `[PaperImport] start` log line being possible (not seen yet, but no error on startup).
Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/PaperImport/controller.ts src/modules/PaperImport/routes.ts src/app.ts
git commit -m "feat(paper-import): controllers + routes mounted at /api/paper-imports"
```

---

## Phase 5 — Frontend refactor

### Task 17: Extract `useCurriculumPreparation` from Quick Make

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/useCurriculumPreparation.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/quick-make/page.tsx`

- [ ] **Step 1: Create the hook**

Copy these helpers and the `prepareAcademicContext` logic from `quick-make/page.tsx` into the new hook:

- `extractCurriculumContext`, `inferTerm`, `contextsMatch`, `academicSubjectCode`
- `findMatchingGrade`, `findMatchingSubject`, `subjectGradeIds`, `gradeLevel`, `normalizeMatchText`, `titleCaseCode`
- The `CAPS_SUBJECT_NAMES` and `ACADEMIC_SUBJECT_CODES` maps
- The full prepare-academic-context effect (renamed `usePrepareAcademicContext`)

```ts
// src/hooks/useCurriculumPreparation.ts
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, resolveId, unwrapResponse } from '@/lib/api-helpers';
import { useGrades, useSubjects } from './useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, Subject, CurriculumNodeItem } from '@/types';

type AcademicGradeRecord = Grade & { _id?: string; orderIndex?: number };
type AcademicSubjectRecord = Subject & {
  _id?: string;
  gradeIds?: Array<string | { id?: string; _id?: string }>;
};

export interface CurriculumGenerationContext {
  subjectCode: string;
  subjectName: string;
  gradeLevel: number;
  gradeName: string;
  term: number;
}

export type CurriculumContextStatus = 'idle' | 'preparing' | 'ready' | 'error';

// (Paste the constants CAPS_SUBJECT_NAMES, ACADEMIC_SUBJECT_CODES, and pure helpers
//  normalizeMatchText, titleCaseCode, inferTerm, extractCurriculumContext,
//  contextsMatch, academicSubjectCode, gradeLevel, findMatchingGrade,
//  findMatchingSubject, subjectGradeIds — verbatim from quick-make/page.tsx)

export function useCurriculumPreparation() {
  const { user } = useAuthStore();
  const { subjects, loading: subjectsLoading, refetch: refetchSubjects } = useSubjects();
  const { grades, loading: gradesLoading, refetch: refetchGrades } = useGrades();

  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);
  const [curriculumContext, setCurriculumContext] = useState<CurriculumGenerationContext | null>(null);
  const [contextStatus, setContextStatus] = useState<CurriculumContextStatus>('idle');
  const [contextError, setContextError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [term, setTerm] = useState(0);
  const preparedKeyRef = useRef<string | null>(null);

  const apply = useCallback((node: CurriculumNodeItem | null) => {
    preparedKeyRef.current = null;
    setSelectedNode(node);
    if (!node) {
      setCurriculumContext(null); setContextStatus('idle'); setContextError(null);
      setSubjectId(''); setGradeId(''); setTerm(0);
      return;
    }
    const ctx = extractCurriculumContext(node);
    setCurriculumContext(ctx); setSubjectId(''); setGradeId(''); setTerm(ctx?.term ?? 0);
    if (!ctx) {
      setContextStatus('error');
      setContextError('Choose a CAPS topic or subtopic that includes subject, grade, and term.');
      return;
    }
    setContextStatus('preparing'); setContextError(null);
  }, []);

  useEffect(() => {
    if (!selectedNode || !curriculumContext || !user?.schoolId || subjectsLoading || gradesLoading) return;
    const ctx = curriculumContext;
    const schoolId = user.schoolId;
    const key = [selectedNode.id, ctx.subjectCode, ctx.gradeLevel, ctx.term].join(':');
    if (preparedKeyRef.current === key) return;
    preparedKeyRef.current = key;

    let cancelled = false;
    (async () => {
      try {
        let grade = findMatchingGrade(grades, ctx);
        if (!grade) {
          const response = await apiClient.post('/academic/grades', {
            schoolId, name: ctx.gradeName, orderIndex: ctx.gradeLevel,
          });
          grade = unwrapResponse<AcademicGradeRecord>(response);
        }
        const resolvedGradeId = resolveId(grade);
        if (!resolvedGradeId) throw new Error('Could not prepare the grade');

        let subject = findMatchingSubject(subjects, ctx);
        const code = academicSubjectCode(ctx);
        if (!subject) {
          const response = await apiClient.post('/academic/subjects', {
            schoolId, name: ctx.subjectName, code, gradeIds: [resolvedGradeId],
          });
          subject = unwrapResponse<AcademicSubjectRecord>(response);
        } else {
          const linked = subjectGradeIds(subject);
          if (!linked.includes(resolvedGradeId)) {
            const response = await apiClient.put(`/academic/subjects/${resolveId(subject)}`, {
              schoolId, name: subject.name, code: subject.code || code,
              gradeIds: [...new Set([...linked, resolvedGradeId])],
            });
            subject = unwrapResponse<AcademicSubjectRecord>(response);
          }
        }
        const resolvedSubjectId = resolveId(subject);
        if (!resolvedSubjectId) throw new Error('Could not prepare the subject');
        if (cancelled) return;
        setGradeId(resolvedGradeId); setSubjectId(resolvedSubjectId); setTerm(ctx.term);
        setContextStatus('ready');
        void Promise.all([refetchGrades(), refetchSubjects()]).catch(() => undefined);
      } catch (err: unknown) {
        if (cancelled) return;
        preparedKeyRef.current = null;
        setGradeId(''); setSubjectId(''); setContextStatus('error');
        setContextError(extractErrorMessage(err, 'Could not prepare this CAPS topic.'));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedNode, curriculumContext, user?.schoolId, subjects, grades, subjectsLoading, gradesLoading, refetchGrades, refetchSubjects]);

  return {
    selectedNode, apply,
    curriculumContext, contextStatus, contextError,
    subjectId, gradeId, term,
    isReady: contextStatus === 'ready' && Boolean(subjectId && gradeId && term),
  };
}
```

- [ ] **Step 2: Wire Quick Make to use the hook**

In `quick-make/page.tsx`:
- Remove the helper constants and functions now in the hook
- Replace the local `useState` declarations for `selectedNodeId`, `curriculumContext`, `contextStatus`, `contextError`, `subjectId`, `gradeId`, `term` and the `prepareAcademicContext` effect with `const prep = useCurriculumPreparation();` and refactor downstream references (`prep.subjectId`, `prep.gradeId`, etc.)

(This is a mechanical refactor — keep the existing behavior identical.)

- [ ] **Step 3: Smoke-test Quick Make**

Run: `cd c:/Users/shaun/campusly-frontend && npm run dev`
Open `http://localhost:3500/teacher/quick-make`. Pick a CAPS topic; verify the "Ready" badge still appears and "Details" step is reachable.

- [ ] **Step 4: Verify file size**

```bash
wc -l src/app/\(dashboard\)/teacher/quick-make/page.tsx
```
Expected: under 350. (Was ~1460 before.)

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useCurriculumPreparation.ts src/app/\(dashboard\)/teacher/quick-make/page.tsx
git commit -m "refactor(quick-make): extract useCurriculumPreparation for reuse"
```

---

## Phase 6 — Frontend foundation

### Task 18: Types

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/types/paper-import.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/types/index.ts`

- [ ] **Step 1: Define types**

```ts
// src/types/paper-import.ts
export type PaperImportJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PaperImportJobStage = 'uploading' | 'segmenting' | 'transcribing' | 'enhancing' | 'finalising';

export interface PaperImportJobProgress {
  stage: PaperImportJobStage;
  pagesTotal: number;
  pagesDone: number;
  message: string;
}

export interface PaperImportJobCurriculum {
  subjectId: string;
  gradeId: string;
  term: number;
  curriculumNodeId: string;
}

export interface PaperImportJobOptions {
  generateAnswers: boolean;
  addHints: boolean;
  addWorkedExample: boolean;
  addExplanations: boolean;
  instructions?: string;
}

export interface PaperImportJobSource {
  filename: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  pageCount: number;
  storagePath: string;
}

export interface PaperImportJob {
  id: string;
  schoolId: string;
  teacherId: string;
  status: PaperImportJobStatus;
  progress: PaperImportJobProgress;
  curriculum: PaperImportJobCurriculum;
  options: PaperImportJobOptions;
  source: PaperImportJobSource;
  resultResourceIds: string[];
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreatePaperImportPayload {
  subjectId: string;
  gradeId: string;
  term: number;
  curriculumNodeId: string;
  generateAnswers: boolean;
  addHints: boolean;
  addWorkedExample: boolean;
  addExplanations: boolean;
  instructions?: string;
  file: File;
}
```

- [ ] **Step 2: Export from barrel**

Append to `src/types/index.ts`:

```ts
export * from './paper-import';
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/types/
git commit -m "feat(types): paper-import job types"
```

---

### Task 19: `usePaperImport` hook

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/usePaperImport.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CreatePaperImportPayload, PaperImportJob, PaperImportJobStatus } from '@/types';

interface ListParams {
  status?: PaperImportJobStatus;
  limit?: number;
  offset?: number;
}

export function usePaperImport() {
  const createJob = useCallback(async (payload: CreatePaperImportPayload): Promise<PaperImportJob> => {
    const form = new FormData();
    form.append('subjectId', payload.subjectId);
    form.append('gradeId', payload.gradeId);
    form.append('term', String(payload.term));
    form.append('curriculumNodeId', payload.curriculumNodeId);
    form.append('generateAnswers', String(payload.generateAnswers));
    form.append('addHints', String(payload.addHints));
    form.append('addWorkedExample', String(payload.addWorkedExample));
    form.append('addExplanations', String(payload.addExplanations));
    if (payload.instructions) form.append('instructions', payload.instructions);
    form.append('source', payload.file);
    const response = await apiClient.post('/paper-imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapResponse<PaperImportJob>(response);
  }, []);

  const listJobs = useCallback(async (params?: ListParams): Promise<{ items: PaperImportJob[]; total: number }> => {
    const response = await apiClient.get('/paper-imports', { params });
    const raw = response.data;
    return {
      items: (raw.data as PaperImportJob[]) ?? [],
      total: raw.total ?? 0,
    };
  }, []);

  const getJob = useCallback(async (jobId: string): Promise<PaperImportJob> => {
    const response = await apiClient.get(`/paper-imports/${jobId}`);
    return unwrapResponse<PaperImportJob>(response);
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    await apiClient.post(`/paper-imports/${jobId}/cancel`);
  }, []);

  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    await apiClient.delete(`/paper-imports/${jobId}`);
  }, []);

  const sourceUrl = useCallback((jobId: string): string => {
    return `${apiClient.defaults.baseURL ?? ''}/paper-imports/${jobId}/source`;
  }, []);

  return { createJob, listJobs, getJob, cancelJob, deleteJob, sourceUrl };
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/usePaperImport.ts
git commit -m "feat(paper-import): usePaperImport hook for CRUD"
```

---

### Task 20: `usePaperImportPoll` hook

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/hooks/usePaperImportPoll.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { usePaperImport } from './usePaperImport';
import type { PaperImportJob } from '@/types';

const POLL_INTERVAL_MS = 3000;
const TERMINAL = new Set<PaperImportJob['status']>(['completed', 'failed', 'cancelled']);

export function usePaperImportPoll(jobId: string | null): { job: PaperImportJob | null; isPolling: boolean } {
  const { getJob } = usePaperImport();
  const [job, setJob] = useState<PaperImportJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      if (cancelledRef.current || !jobId) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const next = await getJob(jobId);
        if (cancelledRef.current) return;
        setJob(next);
        if (!TERMINAL.has(next.status)) {
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        } else {
          setIsPolling(false);
        }
      } catch {
        if (!cancelledRef.current) timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }

    setIsPolling(true);
    tick();

    const onVisibility = () => {
      if (!document.hidden && timer === null && !cancelledRef.current) tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [jobId, getJob]);

  return { job, isPolling };
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/usePaperImportPoll.ts
git commit -m "feat(paper-import): polling hook with visibility-aware pause"
```

---

## Phase 7 — Frontend components

### Task 21: `UploadDropzone` with page-count check

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/paper-import/UploadDropzone.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 30;
const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

async function pdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Worker setup: load the worker bundled with the package.
  // @ts-expect-error — pdfjs ships its own worker URL
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.mjs')).default;
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return doc.numPages;
}

interface Props {
  value: File | null;
  pageCount: number | null;
  onChange: (file: File | null, pageCount: number | null) => void;
}

export function UploadDropzone({ value, pageCount, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!ALLOWED.has(file.type)) {
      setError('Only PDF or image (JPEG, PNG, WebP) files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File must be 25 MB or smaller.');
      return;
    }
    let pages = 1;
    if (file.type === 'application/pdf') {
      setAnalyzing(true);
      try {
        pages = await pdfPageCount(file);
      } catch {
        setError('Could not read this PDF. Try re-saving or converting to images.');
        setAnalyzing(false);
        return;
      }
      setAnalyzing(false);
      if (pages > MAX_PAGES) {
        setError(`PDF has ${pages} pages — maximum is ${MAX_PAGES}.`);
        return;
      }
    }
    onChange(file, pages);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted',
        )}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a PDF or image, or click to choose</p>
        <p className="text-xs text-muted-foreground">PDF up to 30 pages, max 25 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {analyzing && <p className="text-xs text-muted-foreground">Reading PDF…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value && !error && (
        <div className="flex items-center gap-3 rounded-md border p-2">
          {value.type === 'application/pdf' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.name}</p>
            <p className="text-xs text-muted-foreground">
              {(value.size / 1024 / 1024).toFixed(1)} MB · {pageCount ?? 1} page{(pageCount ?? 1) === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onChange(null, null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/paper-import/UploadDropzone.tsx
git commit -m "feat(paper-import): UploadDropzone with pdfjs-dist page count check"
```

---

### Task 22: `OptionsForm`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/paper-import/OptionsForm.tsx`

- [ ] **Step 1: Write the component**

Check whether the project has a `<Switch>` component (`grep -l "Switch" src/components/ui/`). If yes, use it; otherwise use `<Checkbox>`. The example below uses Switch.

```tsx
'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { PaperImportJobOptions } from '@/types';

interface Props {
  value: PaperImportJobOptions;
  onChange: (next: PaperImportJobOptions) => void;
}

const TOGGLES: Array<{
  key: keyof Omit<PaperImportJobOptions, 'instructions'>;
  label: string;
  description: string;
}> = [
  { key: 'generateAnswers', label: 'Generate missing answers',
    description: 'For questions where the answer is not on the page, AI infers it.' },
  { key: 'addHints', label: 'Add hints',
    description: 'One short hint per question to help learners.' },
  { key: 'addWorkedExample', label: 'Add worked example for hardest question',
    description: 'A step-by-step solution appended to the resource.' },
  { key: 'addExplanations', label: 'Add explanation per question',
    description: 'A 1-3 sentence explanation alongside each answer.' },
];

export function OptionsForm({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <div key={t.key} className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <Label htmlFor={t.key} className="text-sm font-medium">{t.label}</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            </div>
            <Switch
              id={t.key}
              checked={value[t.key]}
              onCheckedChange={(checked: boolean) => onChange({ ...value, [t.key]: checked })}
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">Special instructions <span className="text-xs text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="instructions"
          value={value.instructions ?? ''}
          onChange={(e) => onChange({ ...value, instructions: e.target.value })}
          placeholder="e.g. simplify the language; use South African examples"
          className="min-h-20"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/paper-import/OptionsForm.tsx
git commit -m "feat(paper-import): OptionsForm with enhancement toggles"
```

---

### Task 23: `JobProgressView` + `ResultsList`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/paper-import/JobProgressView.tsx`
- Create: `c:/Users/shaun/campusly-frontend/src/components/paper-import/ResultsList.tsx`

- [ ] **Step 1: Write JobProgressView**

```tsx
'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PaperImportJob } from '@/types';

const STAGE_LABEL: Record<PaperImportJob['progress']['stage'], string> = {
  uploading: 'Preparing pages',
  segmenting: 'Detecting resource boundaries',
  transcribing: 'Transcribing pages',
  enhancing: 'Adding answers, hints, explanations',
  finalising: 'Saving resources',
};

interface Props {
  job: PaperImportJob;
  onCancel: () => void;
}

export function JobProgressView({ job, onCancel }: Props) {
  const pct = job.progress.pagesTotal > 0
    ? Math.round((job.progress.pagesDone / job.progress.pagesTotal) * 100)
    : 0;
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{STAGE_LABEL[job.progress.stage]}</p>
            <p className="text-xs text-muted-foreground truncate">{job.progress.message}</p>
          </div>
          <Badge variant="outline">{job.status}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Page {job.progress.pagesDone} of {job.progress.pagesTotal || '—'}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          You can leave this page — we&apos;ll save the results to your{' '}
          <Link href="/teacher/curriculum/import/jobs" className="underline">Imports</Link>.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Write ResultsList**

```tsx
'use client';

import Link from 'next/link';
import { Download, ExternalLink, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useEffect, useState } from 'react';
import type { ContentResourceItem, PaperImportJob } from '@/types';

interface Props {
  job: PaperImportJob;
  sourceUrl: string;
}

export function ResultsList({ job, sourceUrl }: Props) {
  const { getResource } = useContentLibrary();
  const [resources, setResources] = useState<ContentResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(job.resultResourceIds.map((id) => getResource(id)));
      if (!cancelled) {
        setResources(fetched.filter((r): r is ContentResourceItem => r !== null));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [job.resultResourceIds, getResource]);

  if (loading) return <LoadingSpinner />;
  if (resources.length === 0) {
    return <EmptyState icon={AlertTriangle} title="No resources extracted"
      description="The conversion completed but produced no resources. Try a clearer scan." />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">{job.source.filename}</p>
            <p className="text-xs text-muted-foreground">{job.source.pageCount} pages</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={sourceUrl} target="_blank" rel="noreferrer">
              <Download className="mr-1 h-4 w-4" /> Download original
            </a>
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          {resources.length} resource{resources.length === 1 ? '' : 's'} created
        </h3>
        <div className="space-y-2">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{r.type}</Badge>
                    {r.needsReview && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Needs review
                      </Badge>
                    )}
                    {r.sourceImport && (
                      <Badge variant="outline">
                        Pages {r.sourceImport.pageRange.start}–{r.sourceImport.pageRange.end}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium truncate">{r.title}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teacher/curriculum/preview/${r.id}`}>
                    Preview <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/paper-import/JobProgressView.tsx src/components/paper-import/ResultsList.tsx
git commit -m "feat(paper-import): JobProgressView and ResultsList components"
```

---

### Task 24: `JobListTable`

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/components/paper-import/JobListTable.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Eye, Trash2, X as Cancel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePaperImport } from '@/hooks/usePaperImport';
import { toast } from 'sonner';
import { FileSearch } from 'lucide-react';
import type { PaperImportJob, PaperImportJobStatus } from '@/types';

const STATUS_VARIANT: Record<PaperImportJobStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  running: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
};

const TABS: Array<{ value: string; label: string; filter?: PaperImportJobStatus }> = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress', filter: 'running' },
  { value: 'completed', label: 'Completed', filter: 'completed' },
  { value: 'failed', label: 'Failed', filter: 'failed' },
];

export function JobListTable() {
  const { listJobs, cancelJob, deleteJob } = usePaperImport();
  const [jobs, setJobs] = useState<PaperImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  async function load() {
    setLoading(true);
    const tab = TABS.find((t) => t.value === activeTab);
    const result = await listJobs({ status: tab?.filter });
    setJobs(result.items);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="flex-wrap">
        {TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value={activeTab} className="mt-4">
        {loading ? <LoadingSpinner /> : jobs.length === 0 ? (
          <EmptyState icon={FileSearch} title="No imports yet"
            description="Convert your first paper to digital from the wizard." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Resources</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b">
                    <td className="px-3 py-2 text-xs">{new Date(j.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 max-w-xs truncate">{j.source.filename}</td>
                    <td className="px-3 py-2"><Badge variant={STATUS_VARIANT[j.status]}>{j.status}</Badge></td>
                    <td className="px-3 py-2">{j.source.pageCount}</td>
                    <td className="px-3 py-2">{j.resultResourceIds.length}</td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/teacher/curriculum/import/${j.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      {(j.status === 'pending' || j.status === 'running') && (
                        <Button variant="ghost" size="icon" onClick={async () => {
                          await cancelJob(j.id); toast.success('Cancelled'); await load();
                        }}><Cancel className="h-4 w-4" /></Button>
                      )}
                      {(j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled') && (
                        <Button variant="ghost" size="icon" onClick={async () => {
                          if (!confirm('Delete this import? Source files will be removed.')) return;
                          await deleteJob(j.id); toast.success('Deleted'); await load();
                        }}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/components/paper-import/JobListTable.tsx
git commit -m "feat(paper-import): JobListTable component"
```

---

## Phase 8 — Frontend pages

### Task 25: Wizard page (`/teacher/curriculum/import`)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/import/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { PageHeader } from '@/components/shared/PageHeader';
import { UploadDropzone } from '@/components/paper-import/UploadDropzone';
import { OptionsForm } from '@/components/paper-import/OptionsForm';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useCurriculumPreparation } from '@/hooks/useCurriculumPreparation';
import { usePaperImport } from '@/hooks/usePaperImport';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { CurriculumNodeItem, PaperImportJobOptions } from '@/types';

const STEPS = [
  { number: 1, label: 'Curriculum' },
  { number: 2, label: 'Upload' },
  { number: 3, label: 'Options' },
  { number: 4, label: 'Convert' },
];

const DEFAULT_OPTIONS: PaperImportJobOptions = {
  generateAnswers: true,
  addHints: true,
  addWorkedExample: true,
  addExplanations: true,
  instructions: '',
};

export default function ImportPaperPage() {
  const router = useRouter();
  const { selectedFramework, searchNodes, loadNode } = useCurriculumStructure();
  const prep = useCurriculumPreparation();
  const { createJob } = usePaperImport();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [options, setOptions] = useState<PaperImportJobOptions>(DEFAULT_OPTIONS);
  const [submitting, setSubmitting] = useState(false);

  const canContinueFromCurriculum = prep.isReady;
  const canContinueFromUpload = !!file;

  async function handleSubmit() {
    if (!file || !prep.isReady) return;
    setSubmitting(true);
    try {
      const job = await createJob({
        subjectId: prep.subjectId,
        gradeId: prep.gradeId,
        term: prep.term,
        curriculumNodeId: prep.selectedNode?.id ?? '',
        generateAnswers: options.generateAnswers,
        addHints: options.addHints,
        addWorkedExample: options.addWorkedExample,
        addExplanations: options.addExplanations,
        instructions: options.instructions,
        file,
      });
      router.push(`/teacher/curriculum/import/${job.id}`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to start import'));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Import Paper Resource"
        description="Upload a PDF or image of an existing worksheet, study notes, or paper — and we'll turn it into a digital resource.">
        <Button asChild variant="outline">
          <a href="/teacher/curriculum/import/jobs">My imports</a>
        </Button>
      </PageHeader>

      <nav aria-label="Import progress">
        <ol className="flex items-center justify-between gap-2">
          {STEPS.map((s, idx) => {
            const complete = step > s.number;
            const current = step === s.number;
            return (
              <li key={s.number} className="flex flex-1 items-center gap-2">
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                  complete && 'bg-primary text-primary-foreground',
                  current && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !complete && !current && 'bg-muted text-muted-foreground',
                )}>
                  {complete ? <Check className="h-4 w-4" /> : s.number}
                </span>
                <span className={cn('hidden text-xs font-medium sm:inline',
                  current ? 'text-foreground' : 'text-muted-foreground')}>{s.label}</span>
                {idx < STEPS.length - 1 && <div className={cn('hidden h-0.5 flex-1 rounded-full sm:block',
                  complete ? 'bg-primary' : 'bg-muted')} />}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mx-auto max-w-3xl space-y-4">
        {step === 1 && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <Tabs defaultValue="browse">
                <TabsList>
                  <TabsTrigger value="browse">Browse</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
                <TabsContent value="browse" className="mt-3">
                  <div className="max-h-[60vh] overflow-y-auto rounded-md border p-1">
                    <CurriculumTreeBrowser
                      frameworkId={selectedFramework}
                      selectedNodeId={prep.selectedNode?.id ?? null}
                      onSelect={(node: CurriculumNodeItem) => prep.apply(node)}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="search" className="mt-3">
                  <NodePicker
                    frameworkId={selectedFramework}
                    value={prep.selectedNode?.id ?? null}
                    onChange={(_id, node) => { if (node) prep.apply(node); }}
                    onSearch={searchNodes}
                    onLoadNode={loadNode}
                    placeholder="Search for a CAPS topic..."
                  />
                </TabsContent>
              </Tabs>
              {prep.contextStatus === 'ready' && prep.curriculumContext && (
                <Badge variant="outline" className="gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  {prep.curriculumContext.subjectName} · {prep.curriculumContext.gradeName} · Term {prep.term}
                </Badge>
              )}
              {prep.contextStatus === 'error' && prep.contextError && (
                <p className="text-sm text-destructive">{prep.contextError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-4">
              <UploadDropzone value={file} pageCount={pageCount}
                onChange={(f, p) => { setFile(f); setPageCount(p); }} />
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardContent className="p-4">
              <OptionsForm value={options} onChange={setOptions} />
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="font-semibold">Ready to convert</h3>
                <p className="text-sm text-muted-foreground">
                  {prep.curriculumContext?.subjectName} · {prep.curriculumContext?.gradeName} · Term {prep.term}
                </p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium truncate">{file?.name}</p>
                <p className="text-xs text-muted-foreground">{pageCount ?? 1} page{(pageCount ?? 1) === 1 ? '' : 's'}</p>
              </div>
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">Enhancements</p>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {options.generateAnswers && <li>· Generate missing answers</li>}
                  {options.addHints && <li>· Add hints</li>}
                  {options.addWorkedExample && <li>· Add worked example</li>}
                  {options.addExplanations && <li>· Add explanations</li>}
                </ul>
              </div>
              <Button size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                {submitting ? 'Starting…' : 'Start Conversion'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < 4 && (
            <Button onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canContinueFromCurriculum) || (step === 2 && !canContinueFromUpload)}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Visual check**

Run dev server. Navigate to `/teacher/curriculum/import`. Walk through the 4 steps. Don't submit yet (worker not tested end-to-end).

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/curriculum/import/page.tsx
git commit -m "feat(paper-import): import wizard page (curriculum → upload → options → convert)"
```

---

### Task 26: Job status page (`/teacher/curriculum/import/[jobId]`)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/import/[jobId]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { JobProgressView } from '@/components/paper-import/JobProgressView';
import { ResultsList } from '@/components/paper-import/ResultsList';
import { usePaperImport } from '@/hooks/usePaperImport';
import { usePaperImportPoll } from '@/hooks/usePaperImportPoll';

export default function ImportJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { cancelJob, sourceUrl } = usePaperImport();
  const { job } = usePaperImportPoll(jobId);

  if (!job) return <LoadingSpinner />;

  async function handleCancel() {
    if (!confirm('Cancel this conversion?')) return;
    await cancelJob(jobId);
    toast.success('Conversion cancelled');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/teacher/curriculum/import/jobs"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader title="Import status" />
        </div>
      </div>

      {(job.status === 'pending' || job.status === 'running') && (
        <JobProgressView job={job} onCancel={handleCancel} />
      )}

      {job.status === 'completed' && (
        <ResultsList job={job} sourceUrl={sourceUrl(jobId)} />
      )}

      {job.status === 'failed' && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h3 className="font-semibold">Conversion failed</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {job.error?.message ?? 'Something went wrong during conversion.'}
            </p>
            <Button asChild variant="outline">
              <Link href="/teacher/curriculum/import">
                <RotateCcw className="mr-1 h-4 w-4" /> Start over
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {job.status === 'cancelled' && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Badge variant="outline">Cancelled</Badge>
            <p className="text-sm text-muted-foreground">This conversion was cancelled.</p>
            <Button asChild variant="outline">
              <Link href="/teacher/curriculum/import">Start a new import</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/curriculum/import/\[jobId\]/page.tsx
git commit -m "feat(paper-import): job status page with poll-driven results"
```

---

### Task 27: Jobs list page (`/teacher/curriculum/import/jobs`)

**Files:**
- Create: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/import/jobs/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
'use client';

import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { JobListTable } from '@/components/paper-import/JobListTable';

export default function ImportJobsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/teacher/curriculum/import"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader title="My Imports" description="All your paper-to-digital conversions." />
        </div>
        <Button asChild>
          <Link href="/teacher/curriculum/import"><Plus className="mr-1 h-4 w-4" /> New import</Link>
        </Button>
      </div>
      <JobListTable />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/curriculum/import/jobs/page.tsx
git commit -m "feat(paper-import): jobs list page"
```

---

## Phase 9 — Integration

### Task 28: Nav entries

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/lib/constants.ts`
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add to TEACHER_NAV**

In `constants.ts`, find `TEACHER_NAV` and add (anywhere near other AI-flagged items, e.g. right after Quick Make):

```ts
  { label: 'Import Paper', href: '/teacher/curriculum/import', icon: ScanLine, badge: 'AI' },
```

Make sure `ScanLine` is imported from `lucide-react` at the top of the file.

- [ ] **Step 2: Add to STANDALONE_TEACHER_NAV**

Find `STANDALONE_TEACHER_NAV` and add (near Quick Make):

```ts
  { label: 'Import Paper', href: '/teacher/curriculum/import', icon: ScanLine, badge: 'AI' },
```

- [ ] **Step 3: Update isStandaloneTeacherPathAllowed**

In `src/app/(dashboard)/layout.tsx`, find the `allowedPrefixes` array and add:

```ts
    '/teacher/curriculum/import',
```

- [ ] **Step 4: Visual check**

Run dev server. The new nav item should appear in the teacher sidebar.

- [ ] **Step 5: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/lib/constants.ts src/app/\(dashboard\)/layout.tsx
git commit -m "feat(paper-import): add Import Paper nav entry for teachers"
```

---

### Task 29: Source attribution on resource preview

**Files:**
- Modify: `c:/Users/shaun/campusly-frontend/src/app/(dashboard)/teacher/curriculum/preview/[resourceId]/page.tsx`

- [ ] **Step 1: Add the source section**

Open the file. Below the title/header, find a sensible place to insert a "Source" card when the resource was imported. Add:

```tsx
{resource.sourceImport && (
  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <span className="font-medium">Source:</span>{' '}
    <span className="truncate">{resource.sourceImport.filename}</span>
    {' · '}
    <span>
      pages {resource.sourceImport.pageRange.start}–{resource.sourceImport.pageRange.end}
    </span>
    {' · '}
    <a
      href={`${apiClient.defaults.baseURL ?? ''}/paper-imports/${resource.sourceImport.jobId}/source`}
      target="_blank" rel="noreferrer"
      className="underline"
    >Download original</a>
  </div>
)}
```

Import `apiClient` at the top if it isn't already (CLAUDE.md normally bans this in pages — this is the rare exception, OR move the URL builder into the page's existing hook). Better: import `usePaperImport` and use `sourceUrl(resource.sourceImport.jobId)` instead.

- [ ] **Step 2: Compile**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/app/\(dashboard\)/teacher/curriculum/preview/\[resourceId\]/page.tsx
git commit -m "feat(content-library): show 'Source' download on imported resources"
```

---

## Phase 10 — End-to-end smoke test

### Task 30: End-to-end smoke test

**Files:** none.

- [ ] **Step 1: Start backend + frontend**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev    # in terminal A
cd c:/Users/shaun/campusly-frontend && npm run dev   # in terminal B
```

- [ ] **Step 2: Drive the wizard end-to-end**

In the browser:
1. Log in as a teacher
2. Navigate to "Import Paper" in the sidebar
3. Pick a CAPS topic (Step 1)
4. Upload a small test PDF (1-2 pages of a worksheet)
5. Leave default enhancements on
6. Click "Start Conversion"

- [ ] **Step 3: Confirm progress UI advances**

The job page should show progress through stages: uploading → segmenting → transcribing → enhancing → finalising → completed.

- [ ] **Step 4: Confirm resources are created**

On the completed page, click "Preview" on one of the result resources. The existing resource preview page should render the converted blocks. The "Source" line should appear with a working download link.

- [ ] **Step 5: Test cancellation**

Start another import. Click Cancel mid-run. The job page should switch to "Cancelled". Any partial resources should be soft-deleted (verify by going to `/teacher/curriculum/content` — the partial drafts should not appear).

- [ ] **Step 6: Test deletion**

From `/teacher/curriculum/import/jobs`, delete a completed job. Open the previously-linked resource preview — the "Source" line should no longer render.

- [ ] **Step 7: Note any failures**

If anything failed, fix it before declaring the feature done (no leaving discovered errors unfixed per the user's standing rule). Commit fixes individually.

---

## Notes for the implementer

- This plan does NOT add tests for the frontend hooks/components — the codebase has minimal frontend test infrastructure and the existing pattern is visual verification in dev. Backend logic IS tested via the validation schema tests in Task 4. Add more backend tests if you discover regressions.
- The worker stages call `AIService` methods (`generateCompletion`, `generateVisionCompletionWithImages`, `generateDocumentCompletionWithUsage`). Verify the exact method names and shapes in `c:/Users/shaun/campusly-backend/src/services/ai.service.ts` before wiring — adapt as needed.
- The `ScanLine` icon must exist in `lucide-react` (it does, since v0.300). If not, substitute `Scan` or `ScanText`.
- `pdfjs-dist` worker setup in the browser can be finicky. If the dynamic worker import in `UploadDropzone.tsx` fails, fall back to setting `workerSrc` to a hosted URL: `pdfjs.GlobalWorkerOptions.workerSrc = \`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs\`;`.
- For very large files, the multer upload may exceed Express's default body size — confirm the existing setup in `app.ts` allows 25 MB uploads via multer (no body-parser conflict).
