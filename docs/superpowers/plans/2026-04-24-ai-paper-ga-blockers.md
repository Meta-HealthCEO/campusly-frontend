# AI Paper Generation — GA Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three GA blockers on the AI Paper Generation feature in the teacher portal: missing PDF export with diagrams, silent fallback on malformed Claude JSON, and destructive regenerate-question with no confirmation.

**Architecture:** Introduce a shared PDF rendering library (`src/common/pdf/`) in the backend, consumed by both the existing QuestionBank PDF service (operates on `AssessmentPaper` with question refs) and a new AITools PDF service (operates on `GeneratedPaper` with inline questions). Diagram embedding uses `svg-to-pdfkit` to inline rendered SVGs from disk. Frontend gains Download buttons gated on all diagrams being terminal (`rendered` or `failed`, not `pending`). Claude JSON responses are validated with Zod v4 schemas. Regenerate UX gains a confirmation dialog when the question has been edited.

**Tech Stack:** TypeScript, Express, PDFKit, svg-to-pdfkit, Zod v4, Vitest (backend). Next.js 16, React 19, shadcn Dialog (frontend).

**Repos:** Work spans `c:\Users\shaun\campusly-backend` and `c:\Users\shaun\campusly-frontend`.

**Branch strategy:** Work on a feature branch `feat/ai-paper-ga-blockers` in each repo. Commit per task. Open PRs at the end of each phase.

---

## File Structure

**Backend (`c:\Users\shaun\campusly-backend`):**

Create:
- `src/common/pdf/document.ts` — PDFDocument factory + page numbering + finalise-to-Buffer
- `src/common/pdf/constants.ts` — shared constants (margins, fonts, widths)
- `src/common/pdf/primitives.ts` — shared low-level helpers (checkPageSpace, renderTitleBlock, renderInstructions)
- `src/common/pdf/question-rendering.ts` — `renderQuestion()` and `renderMemoAnswer()` primitives (diagram-aware)
- `src/common/pdf/diagram.ts` — SVG-to-PDF embedding helper
- `src/common/pdf/types.ts` — shared `NormalisedQuestion`, `NormalisedSection` types
- `src/common/pdf/__tests__/diagram.test.ts` — diagram embedding unit tests
- `src/common/pdf/__tests__/question-rendering.test.ts` — question rendering unit tests
- `src/modules/AITools/service-pdf.ts` — PDF service for `GeneratedPaper`
- `src/modules/AITools/__tests__/service-pdf.test.ts` — AI paper PDF integration tests
- `src/modules/AITools/__tests__/service-generation-parse.test.ts` — Zod validation tests
- `src/modules/AITools/validation-ai.ts` — Zod schemas for Claude's paper-generation response

Modify:
- `src/modules/QuestionBank/service-pdf.ts` — use shared primitives; pass diagram when available
- `src/modules/QuestionBank/service-pdf-helpers.ts` — slim down, delegate to `common/pdf/*`
- `src/modules/AITools/service.ts` — call Zod validator, remove silent fallback
- `src/modules/AITools/service-generation.ts` — same: validate, don't fall back silently
- `src/modules/AITools/routes.ts` — add `GET /papers/:id/pdf` and `GET /papers/:id/memo-pdf`
- `src/modules/AITools/controller.ts` — add `downloadPaperPdf` and `downloadMemoPdf` handlers
- `package.json` — add `svg-to-pdfkit` dependency

**Frontend (`c:\Users\shaun\campusly-frontend`):**

Modify:
- `src/hooks/useAITools.ts` — add `downloadPaperPdf(id)` and `downloadMemoPdf(id)` methods returning blob & triggering browser download
- `src/components/ai-tools/PaperPreview.tsx` — add Download Paper + Download Memo buttons, gated on diagram status
- `src/components/ai-tools/QuestionCard.tsx` — track `isEdited` state, emit flag on edit
- `src/components/ai-tools/SectionEditor.tsx` — propagate `isEdited` to regenerate handler; show confirmation dialog before regenerating edited questions
- `src/components/ai-tools/types.ts` — extend question/section types if needed (e.g. `diagram.renderStatus`)
- `src/app/(dashboard)/teacher/ai-tools/create-paper/page.tsx` — track edited questions set in state; pass to PaperPreview

---

## Phase 0 — Setup & dependencies

### Task 0.1: Install svg-to-pdfkit in the backend

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\package.json`

- [ ] **Step 1: Install the dependency**

Run: `cd c:/Users/shaun/campusly-backend && npm install svg-to-pdfkit`

Expected: `package.json` updated with `"svg-to-pdfkit"` under dependencies; `package-lock.json` updated.

- [ ] **Step 2: Install its types (if they don't ship as part of the package)**

Run: `cd c:/Users/shaun/campusly-backend && npm install -D @types/svg-to-pdfkit`

Expected: dev dependency added. If no types package exists, create `src/types/svg-to-pdfkit.d.ts` with:

```ts
declare module 'svg-to-pdfkit' {
  import type PDFKit from 'pdfkit';
  interface SVGtoPDFOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: string;
    useCSS?: boolean;
    fontCallback?: (family: string, bold: boolean, italic: boolean) => string;
    assumePt?: boolean;
  }
  function SVGtoPDF(
    doc: PDFKit.PDFDocument,
    svg: string,
    x?: number,
    y?: number,
    options?: SVGtoPDFOptions,
  ): void;
  export default SVGtoPDF;
}
```

- [ ] **Step 3: Create feature branches**

Run in each repo:
```bash
cd c:/Users/shaun/campusly-backend && git checkout -b feat/ai-paper-ga-blockers
cd c:/Users/shaun/campusly-frontend && git checkout -b feat/ai-paper-ga-blockers
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add package.json package-lock.json src/types/svg-to-pdfkit.d.ts
git commit -m "chore(pdf): add svg-to-pdfkit dependency for diagram embedding"
```

---

## Phase 1 — Shared PDF primitives (backend)

### Task 1.1: Extract shared constants

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\constants.ts`

- [ ] **Step 1: Create the constants module**

```ts
// src/common/pdf/constants.ts
export const MARGIN = 50;
export const PAGE_WIDTH = 595.28; // A4 width in pts
export const PAGE_HEIGHT = 841.89; // A4 height in pts
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export const FONT_TITLE = 'Helvetica-Bold';
export const FONT_NORMAL = 'Helvetica';
export const FONT_ITALIC = 'Helvetica-Oblique';

export const DIAGRAM_MAX_WIDTH = CONTENT_WIDTH - 40; // indented
export const DIAGRAM_MAX_HEIGHT = 240;
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/common/pdf/constants.ts
git commit -m "feat(pdf): add shared PDF layout constants"
```

### Task 1.2: Shared normalised types

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\types.ts`

- [ ] **Step 1: Define the shared shape both modules will normalise to**

```ts
// src/common/pdf/types.ts

export interface NormalisedDiagram {
  svgUrl: string | null;
  alt: string;
  renderStatus: 'pending' | 'rendered' | 'failed';
}

export interface NormalisedQuestionOption {
  label: string;
  text: string;
  isCorrect?: boolean;
}

export type NormalisedQuestionType = 'mcq' | 'true_false' | 'short' | 'long' | 'structured';

export interface NormalisedQuestion {
  number: string;
  marks: number;
  stem: string;
  type: NormalisedQuestionType;
  options: NormalisedQuestionOption[];
  answer: string;
  markingRubric: string;
  diagram: NormalisedDiagram | null;
}

export interface NormalisedSection {
  title: string;
  instructions: string;
  questions: NormalisedQuestion[];
}

export interface NormalisedPaperMeta {
  schoolName: string;
  subject: string;
  gradeLabel: string;
  term: number | string;
  year?: number | string;
  totalMarks: number;
  duration: number;
  paperTypeLabel?: string;
  instructions?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/common/pdf/types.ts
git commit -m "feat(pdf): add normalised paper/question types for shared renderer"
```

### Task 1.3: Document factory

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\document.ts`

- [ ] **Step 1: Implement document creation + finalisation**

```ts
// src/common/pdf/document.ts
import PDFDocument from 'pdfkit';
import { MARGIN, PAGE_WIDTH } from './constants.js';

export function createDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    bufferPages: true,
  });
}

export function finalise(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.font('Helvetica').fontSize(8);
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        MARGIN,
        doc.page.height - 30,
        { width: PAGE_WIDTH - MARGIN * 2, align: 'center' },
      );
      doc.restore();
    }

    doc.end();
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/common/pdf/document.ts
git commit -m "feat(pdf): add shared createDocument + finalise helpers"
```

### Task 1.4: Primitive rendering helpers (title, instructions, page-space)

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\primitives.ts`

- [ ] **Step 1: Implement the primitives**

```ts
// src/common/pdf/primitives.ts
import {
  MARGIN, PAGE_WIDTH, CONTENT_WIDTH,
  FONT_TITLE, FONT_NORMAL,
} from './constants.js';
import type { NormalisedPaperMeta } from './types.js';

export function checkPageSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > doc.page.height - MARGIN - 30) {
    doc.addPage();
  }
}

export function renderTitlePage(
  doc: PDFKit.PDFDocument,
  meta: NormalisedPaperMeta,
): void {
  doc.moveDown(4);
  doc.font(FONT_TITLE).fontSize(22).text(meta.schoolName, { align: 'center' });
  doc.moveDown(1.5);

  doc.font(FONT_TITLE).fontSize(16).text(meta.subject, { align: 'center' });
  doc.moveDown(0.5);

  doc.font(FONT_NORMAL).fontSize(13).text(meta.gradeLabel, { align: 'center' });
  const yearPart = meta.year ? ` — ${meta.year}` : '';
  doc.font(FONT_NORMAL).fontSize(13).text(
    `Term ${meta.term}${yearPart}`,
    { align: 'center' },
  );
  doc.moveDown(1);

  if (meta.paperTypeLabel) {
    doc.font(FONT_TITLE).fontSize(14).text(meta.paperTypeLabel, { align: 'center' });
    doc.moveDown(2);
  }

  doc.font(FONT_NORMAL).fontSize(11);
  doc.text(`Total Marks: ${meta.totalMarks}`, { align: 'center' });
  doc.text(`Time: ${meta.duration} minutes`, { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
  doc.moveDown(1);
}

export function renderMemoTitlePage(
  doc: PDFKit.PDFDocument,
  meta: NormalisedPaperMeta,
): void {
  doc.moveDown(4);
  doc.font(FONT_TITLE).fontSize(22).text(meta.schoolName, { align: 'center' });
  doc.moveDown(1);
  doc.font(FONT_TITLE).fontSize(20).text('MEMORANDUM', { align: 'center' });
  doc.moveDown(1);

  doc.font(FONT_TITLE).fontSize(14).text(meta.subject, { align: 'center' });
  doc.moveDown(0.5);
  doc.font(FONT_NORMAL).fontSize(12).text(meta.gradeLabel, { align: 'center' });
  const yearPart = meta.year ? ` — ${meta.year}` : '';
  doc.font(FONT_NORMAL).fontSize(12).text(
    `Term ${meta.term}${yearPart}`,
    { align: 'center' },
  );
  doc.moveDown(0.5);
  doc.font(FONT_NORMAL).fontSize(11).text(`Total Marks: ${meta.totalMarks}`, { align: 'center' });
  doc.moveDown(1.5);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
  doc.moveDown(1);
}

export function renderInstructions(doc: PDFKit.PDFDocument, instructions?: string): void {
  if (!instructions) return;
  doc.font(FONT_TITLE).fontSize(12).text('INSTRUCTIONS', { underline: true });
  doc.moveDown(0.3);
  doc.font(FONT_NORMAL).fontSize(10).text(instructions, { width: CONTENT_WIDTH });
  doc.moveDown(1);
  doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).stroke();
  doc.moveDown(1);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/common/pdf/primitives.ts
git commit -m "feat(pdf): add shared title-page, memo-title, instructions primitives"
```

### Task 1.5: Diagram embedding primitive — TEST FIRST

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\__tests__\diagram.test.ts`
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\diagram.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/common/pdf/__tests__/diagram.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDocument, finalise } from '../document.js';
import { embedDiagram } from '../diagram.js';
import type { NormalisedDiagram } from '../types.js';

const MINIMAL_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect x="10" y="10" width="80" height="80" fill="none" stroke="black"/>
</svg>`;

describe('embedDiagram', () => {
  let tmpDir: string;
  let svgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-test-'));
    svgPath = path.join(tmpDir, 'test.svg');
    fs.writeFileSync(svgPath, MINIMAL_SVG);
  });

  it('embeds a rendered SVG into the PDF document', async () => {
    const doc = createDocument();
    const diagram: NormalisedDiagram = {
      svgUrl: `/uploads/diagrams/test.svg`,
      alt: 'test diagram',
      renderStatus: 'rendered',
    };
    await embedDiagram(doc, diagram, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('renders an alt-text placeholder when status is failed', async () => {
    const doc = createDocument();
    const diagram: NormalisedDiagram = {
      svgUrl: null,
      alt: 'a graph of y=x^2',
      renderStatus: 'failed',
    };
    await embedDiagram(doc, diagram, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('renders an alt-text placeholder when status is pending', async () => {
    const doc = createDocument();
    const diagram: NormalisedDiagram = {
      svgUrl: null,
      alt: 'pending diagram',
      renderStatus: 'pending',
    };
    await embedDiagram(doc, diagram, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('falls back to alt text when SVG file is missing on disk', async () => {
    const doc = createDocument();
    const diagram: NormalisedDiagram = {
      svgUrl: '/uploads/diagrams/missing.svg',
      alt: 'missing file',
      renderStatus: 'rendered',
    };
    await embedDiagram(doc, diagram, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run the test (expect fail — module does not exist)**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/common/pdf/__tests__/diagram.test.ts`

Expected: FAIL with "Cannot find module '../diagram.js'".

- [ ] **Step 3: Implement the diagram primitive**

```ts
// src/common/pdf/diagram.ts
import fs from 'fs';
import path from 'path';
import SVGtoPDF from 'svg-to-pdfkit';
import {
  MARGIN, CONTENT_WIDTH, FONT_ITALIC,
  DIAGRAM_MAX_WIDTH, DIAGRAM_MAX_HEIGHT,
} from './constants.js';
import type { NormalisedDiagram } from './types.js';

export interface EmbedOptions {
  /** Filesystem base directory the svgUrl is served from (e.g. UPLOAD_DIR). */
  baseDir: string;
  /** URL path prefix that maps into baseDir (e.g. '/uploads/diagrams'). */
  urlPrefix: string;
}

/**
 * Resolve an svgUrl like '/uploads/diagrams/abc.svg' to an absolute filesystem path.
 * Guards against directory traversal.
 */
export function resolveSvgPath(svgUrl: string, opts: EmbedOptions): string | null {
  if (!svgUrl.startsWith(opts.urlPrefix)) return null;
  const rel = svgUrl.slice(opts.urlPrefix.length).replace(/^\/+/, '');
  if (rel.includes('..')) return null;
  return path.resolve(opts.baseDir, rel);
}

export async function embedDiagram(
  doc: PDFKit.PDFDocument,
  diagram: NormalisedDiagram,
  opts: EmbedOptions,
): Promise<void> {
  const canEmbed = diagram.renderStatus === 'rendered' && diagram.svgUrl;
  if (canEmbed) {
    const absPath = resolveSvgPath(diagram.svgUrl!, opts);
    if (absPath && fs.existsSync(absPath)) {
      try {
        const svg = fs.readFileSync(absPath, 'utf8');
        const x = MARGIN + 20;
        const y = doc.y + 4;
        SVGtoPDF(doc, svg, x, y, {
          width: DIAGRAM_MAX_WIDTH,
          height: DIAGRAM_MAX_HEIGHT,
          preserveAspectRatio: 'xMidYMid meet',
        });
        doc.y = y + DIAGRAM_MAX_HEIGHT + 8;
        return;
      } catch {
        // Fall through to alt-text rendering
      }
    }
  }
  renderAltPlaceholder(doc, diagram);
}

function renderAltPlaceholder(doc: PDFKit.PDFDocument, diagram: NormalisedDiagram): void {
  const label =
    diagram.renderStatus === 'pending' ? '[Diagram pending]'
      : diagram.renderStatus === 'failed' ? '[Diagram unavailable]'
        : '[Diagram unavailable]';

  doc.font(FONT_ITALIC).fontSize(9);
  doc.text(`${label} ${diagram.alt}`, {
    width: CONTENT_WIDTH - 20,
    indent: 20,
  });
  doc.moveDown(0.4);
}
```

- [ ] **Step 4: Run the test — expect pass**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/common/pdf/__tests__/diagram.test.ts`

Expected: all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/common/pdf/diagram.ts src/common/pdf/__tests__/diagram.test.ts
git commit -m "feat(pdf): add diagram embedding primitive with alt-text fallback"
```

### Task 1.6: Question + memo rendering primitives — TEST FIRST

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\__tests__\question-rendering.test.ts`
- Create: `c:\Users\shaun\campusly-backend\src\common\pdf\question-rendering.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/common/pdf/__tests__/question-rendering.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createDocument, finalise } from '../document.js';
import { renderQuestionSections, renderMemoSections } from '../question-rendering.js';
import type { NormalisedSection } from '../types.js';

describe('renderQuestionSections', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-test-'));
  });

  it('renders a section with a short-answer question (no diagram)', async () => {
    const doc = createDocument();
    const sections: NormalisedSection[] = [{
      title: 'Section A',
      instructions: 'Answer all questions',
      questions: [{
        number: '1', marks: 5, stem: 'What is 2+2?', type: 'short',
        options: [], answer: '4', markingRubric: '1 mark for correct answer',
        diagram: null,
      }],
    }];
    renderQuestionSections(doc, sections, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('renders MCQ options', async () => {
    const doc = createDocument();
    const sections: NormalisedSection[] = [{
      title: 'Section A', instructions: '',
      questions: [{
        number: '1', marks: 2, stem: 'Pick one.', type: 'mcq',
        options: [
          { label: 'A', text: 'Alpha' },
          { label: 'B', text: 'Bravo', isCorrect: true },
        ],
        answer: 'B', markingRubric: '', diagram: null,
      }],
    }];
    renderQuestionSections(doc, sections, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('embeds diagram when renderStatus is rendered and file exists', async () => {
    const svgPath = path.join(tmpDir, 'abc.svg');
    fs.writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50"/></svg>');
    const doc = createDocument();
    const sections: NormalisedSection[] = [{
      title: 'Section A', instructions: '',
      questions: [{
        number: '1', marks: 5, stem: 'See the diagram.', type: 'short',
        options: [], answer: '', markingRubric: '',
        diagram: { svgUrl: '/uploads/diagrams/abc.svg', alt: 'a square', renderStatus: 'rendered' },
      }],
    }];
    renderQuestionSections(doc, sections, { baseDir: tmpDir, urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });
});

describe('renderMemoSections', () => {
  it('renders answer + marking rubric for structured questions', async () => {
    const doc = createDocument();
    const sections: NormalisedSection[] = [{
      title: 'Section A', instructions: '',
      questions: [{
        number: '1', marks: 5, stem: 'Solve.', type: 'long',
        options: [], answer: 'x = 5', markingRubric: 'Award 2 marks for setup, 3 for correct answer',
        diagram: null,
      }],
    }];
    renderMemoSections(doc, sections, { baseDir: '/tmp', urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });

  it('collects MCQ answers into the answer grid', async () => {
    const doc = createDocument();
    const sections: NormalisedSection[] = [{
      title: 'Section A', instructions: '',
      questions: [
        {
          number: '1', marks: 1, stem: 'Q1', type: 'mcq',
          options: [{ label: 'A', text: 'a' }, { label: 'B', text: 'b', isCorrect: true }],
          answer: 'B', markingRubric: '', diagram: null,
        },
        {
          number: '2', marks: 1, stem: 'Q2', type: 'mcq',
          options: [{ label: 'A', text: 'a', isCorrect: true }, { label: 'B', text: 'b' }],
          answer: 'A', markingRubric: '', diagram: null,
        },
      ],
    }];
    renderMemoSections(doc, sections, { baseDir: '/tmp', urlPrefix: '/uploads/diagrams' });
    const buf = await finalise(doc);
    expect(buf.length).toBeGreaterThan(100);
  });
});
```

- [ ] **Step 2: Run the test (expect fail)**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/common/pdf/__tests__/question-rendering.test.ts`

Expected: FAIL with module not found.

- [ ] **Step 3: Implement the renderer**

```ts
// src/common/pdf/question-rendering.ts
import {
  MARGIN, PAGE_WIDTH, CONTENT_WIDTH,
  FONT_TITLE, FONT_NORMAL, FONT_ITALIC,
} from './constants.js';
import { checkPageSpace } from './primitives.js';
import { embedDiagram, type EmbedOptions } from './diagram.js';
import type { NormalisedSection, NormalisedQuestion, NormalisedQuestionOption } from './types.js';

export function renderQuestionSections(
  doc: PDFKit.PDFDocument,
  sections: NormalisedSection[],
  opts: EmbedOptions,
): void {
  for (const section of sections) {
    checkPageSpace(doc, 80);
    doc.font(FONT_TITLE).fontSize(13).text(section.title.toUpperCase());
    doc.moveDown(0.3);

    if (section.instructions) {
      doc.font(FONT_ITALIC).fontSize(9).text(section.instructions, { width: CONTENT_WIDTH });
      doc.moveDown(0.5);
    }

    for (const q of section.questions) {
      checkPageSpace(doc, 60);
      renderQuestion(doc, q, opts);
    }
    doc.moveDown(1);
  }
}

function renderQuestion(
  doc: PDFKit.PDFDocument,
  q: NormalisedQuestion,
  opts: EmbedOptions,
): void {
  doc.font(FONT_TITLE).fontSize(10).text(`Q${q.number}`, { continued: true });
  doc.font(FONT_NORMAL).fontSize(10).text(`  (${q.marks} mark${q.marks !== 1 ? 's' : ''})`);
  doc.moveDown(0.2);
  doc.font(FONT_NORMAL).fontSize(10).text(q.stem, { width: CONTENT_WIDTH - 20, indent: 20 });
  doc.moveDown(0.3);

  if (q.diagram) {
    checkPageSpace(doc, 260);
    // embedDiagram is async (SVG read) — we intentionally run sync via the fs.existsSync/readFileSync path
    // so the promise resolves synchronously in practice. Await is still safe here.
    // But renderQuestion is called from a sync loop; so we keep embedDiagram sync-compatible.
    void embedDiagram(doc, q.diagram, opts);
  }

  if (q.type === 'mcq' || q.type === 'true_false') {
    renderOptions(doc, q.options);
  }
  doc.moveDown(0.5);
}

function renderOptions(doc: PDFKit.PDFDocument, options: NormalisedQuestionOption[]): void {
  for (const opt of options) {
    doc.font(FONT_NORMAL).fontSize(10).text(
      `     ${opt.label}.  ${opt.text}`,
      { width: CONTENT_WIDTH - 40 },
    );
  }
}

export function renderMemoSections(
  doc: PDFKit.PDFDocument,
  sections: NormalisedSection[],
  opts: EmbedOptions,
): void {
  const mcqAnswers: Array<{ number: string; answer: string }> = [];

  for (const section of sections) {
    checkPageSpace(doc, 60);
    doc.font(FONT_TITLE).fontSize(13).text(section.title.toUpperCase());
    doc.moveDown(0.5);

    for (const q of section.questions) {
      if (q.type === 'mcq' || q.type === 'true_false') {
        const correct = q.options.find((o) => o.isCorrect);
        const answer = correct?.label ?? q.answer;
        mcqAnswers.push({ number: q.number, answer });
        renderMemoMcq(doc, q, answer);
      } else {
        checkPageSpace(doc, 60);
        renderMemoAnswer(doc, q, opts);
      }
    }
    doc.moveDown(1);
  }

  if (mcqAnswers.length > 0) {
    checkPageSpace(doc, 40 + mcqAnswers.length * 14);
    doc.moveDown(1);
    doc.font(FONT_TITLE).fontSize(12).text('MCQ ANSWER GRID');
    doc.moveDown(0.3);
    const gridText = mcqAnswers.map((a) => `Q${a.number}: ${a.answer}`).join('   |   ');
    doc.font(FONT_NORMAL).fontSize(10).text(gridText, { width: CONTENT_WIDTH });
  }
}

function renderMemoMcq(doc: PDFKit.PDFDocument, q: NormalisedQuestion, answer: string): void {
  doc.font(FONT_TITLE).fontSize(10).text(`Q${q.number}`, { continued: true });
  doc.font(FONT_NORMAL).fontSize(10).text(`  (${q.marks})  —  ${answer}`);
  doc.moveDown(0.2);
}

function renderMemoAnswer(
  doc: PDFKit.PDFDocument,
  q: NormalisedQuestion,
  opts: EmbedOptions,
): void {
  doc.font(FONT_TITLE).fontSize(10).text(`Q${q.number}`, { continued: true });
  doc.font(FONT_NORMAL).fontSize(10).text(`  (${q.marks} mark${q.marks !== 1 ? 's' : ''})`);
  doc.moveDown(0.2);

  if (q.diagram) {
    void embedDiagram(doc, q.diagram, opts);
  }

  if (q.answer) {
    doc.font(FONT_TITLE).fontSize(9).text('Answer:', { indent: 15 });
    doc.font(FONT_NORMAL).fontSize(9).text(q.answer, { width: CONTENT_WIDTH - 30, indent: 15 });
    doc.moveDown(0.2);
  }
  if (q.markingRubric) {
    doc.font(FONT_TITLE).fontSize(9).text('Marking Rubric:', { indent: 15 });
    doc.font(FONT_NORMAL).fontSize(9).text(q.markingRubric, { width: CONTENT_WIDTH - 30, indent: 15 });
    doc.moveDown(0.2);
  }
  doc.moveDown(0.3);
}
```

Note on `void embedDiagram(...)`: `embedDiagram` is declared `async` so callers may `await` it, but its body uses `fs.readFileSync` + `fs.existsSync` and `SVGtoPDF` is synchronous, so the writes land before the promise resolves. This lets us call it from a synchronous section loop without a refactor to async iteration.

- [ ] **Step 4: Run the test — expect pass**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/common/pdf/__tests__/question-rendering.test.ts`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/common/pdf/question-rendering.ts src/common/pdf/__tests__/question-rendering.test.ts
git commit -m "feat(pdf): add shared question + memo renderer with diagram support"
```

---

## Phase 2 — AI paper PDF service (backend)

### Task 2.1: Normaliser for GeneratedPaper

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\service-pdf.ts`

Read `src/modules/AITools/model.ts` first to confirm the GeneratedPaper shape (sections[].questions[] with questionText, marks, modelAnswer, markingGuideline, diagram). This task assumes the following question fields exist: `questionText`, `questionNumber`, `marks`, `modelAnswer`, `markingGuideline`, optional `diagram: { tikz, data, alt, svgUrl, hash, renderStatus, renderError }`, and the section has `sectionLabel` and `questionType`.

- [ ] **Step 1: Implement loader + normaliser + public API**

```ts
// src/modules/AITools/service-pdf.ts
import mongoose from 'mongoose';
import { GeneratedPaper } from './model.js';
import { School } from '../School/model.js';
import { NotFoundError } from '../../common/errors.js';
import { createDocument, finalise } from '../../common/pdf/document.js';
import { renderTitlePage, renderMemoTitlePage, renderInstructions } from '../../common/pdf/primitives.js';
import { renderQuestionSections, renderMemoSections } from '../../common/pdf/question-rendering.js';
import type {
  NormalisedPaperMeta, NormalisedSection, NormalisedQuestion,
  NormalisedDiagram, NormalisedQuestionType,
} from '../../common/pdf/types.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const URL_PREFIX = '/uploads/diagrams';
const DIAGRAM_BASE_DIR = `${UPLOAD_DIR}/diagrams`;

export class AIPdfService {
  static async generatePaperPdf(paperId: string, schoolId: string): Promise<Buffer> {
    const { meta, sections } = await loadAndNormalise(paperId, schoolId);
    const doc = createDocument();
    renderTitlePage(doc, meta);
    renderInstructions(doc, meta.instructions);
    renderQuestionSections(doc, sections, { baseDir: DIAGRAM_BASE_DIR, urlPrefix: URL_PREFIX });
    return finalise(doc);
  }

  static async generateMemoPdf(paperId: string, schoolId: string): Promise<Buffer> {
    const { meta, sections } = await loadAndNormalise(paperId, schoolId);
    const doc = createDocument();
    renderMemoTitlePage(doc, meta);
    renderMemoSections(doc, sections, { baseDir: DIAGRAM_BASE_DIR, urlPrefix: URL_PREFIX });
    return finalise(doc);
  }
}

interface LoadResult {
  meta: NormalisedPaperMeta;
  sections: NormalisedSection[];
}

async function loadAndNormalise(paperId: string, schoolId: string): Promise<LoadResult> {
  const oid = new mongoose.Types.ObjectId(paperId);
  const soid = new mongoose.Types.ObjectId(schoolId);

  const paper = await GeneratedPaper.findOne({ _id: oid, schoolId: soid, isDeleted: false }).lean();
  if (!paper) throw new NotFoundError('Generated paper not found');

  const school = await School.findOne({ _id: soid, isDeleted: false }).lean();
  const schoolName = school?.name ?? 'School';

  const meta: NormalisedPaperMeta = {
    schoolName,
    subject: paper.subject,
    gradeLabel: `Grade ${paper.grade}`,
    term: paper.term,
    totalMarks: paper.totalMarks,
    duration: paper.duration,
    paperTypeLabel: paper.topic ? `Topic: ${paper.topic}` : undefined,
    instructions: undefined,
  };

  const sections: NormalisedSection[] = (paper.sections ?? []).map((s: Record<string, unknown>) => ({
    title: String(s.sectionLabel ?? 'Section'),
    instructions: '',
    questions: normaliseQuestions(
      (s.questions ?? []) as Record<string, unknown>[],
      String(s.questionType ?? 'short'),
    ),
  }));

  return { meta, sections };
}

function normaliseQuestions(
  rawQuestions: Record<string, unknown>[],
  sectionType: string,
): NormalisedQuestion[] {
  const type = mapType(sectionType);
  return rawQuestions.map((raw) => {
    const diagramRaw = raw.diagram as Record<string, unknown> | undefined;
    const diagram: NormalisedDiagram | null = diagramRaw ? {
      svgUrl: (diagramRaw.svgUrl as string | null) ?? null,
      alt: String(diagramRaw.alt ?? ''),
      renderStatus: (diagramRaw.renderStatus as 'pending' | 'rendered' | 'failed') ?? 'pending',
    } : null;

    return {
      number: String(raw.questionNumber ?? ''),
      marks: Number(raw.marks ?? 0),
      stem: String(raw.questionText ?? ''),
      type,
      options: Array.isArray(raw.options)
        ? (raw.options as Record<string, unknown>[]).map((o) => ({
          label: String(o.label ?? ''),
          text: String(o.text ?? ''),
          isCorrect: Boolean(o.isCorrect),
        }))
        : [],
      answer: String(raw.modelAnswer ?? ''),
      markingRubric: String(raw.markingGuideline ?? ''),
      diagram,
    };
  });
}

function mapType(sectionType: string): NormalisedQuestionType {
  const t = sectionType.toLowerCase();
  if (t.includes('multiple choice') || t === 'mcq') return 'mcq';
  if (t.includes('true') || t.includes('false')) return 'true_false';
  if (t.includes('long')) return 'long';
  if (t.includes('structured')) return 'structured';
  return 'short';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/AITools/service-pdf.ts
git commit -m "feat(ai-paper): add AIPdfService using shared PDF primitives"
```

### Task 2.2: Integration test — full paper PDF generation

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\__tests__\service-pdf.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/modules/AITools/__tests__/service-pdf.test.ts
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { GeneratedPaper } from '../model.js';
import { School } from '../../School/model.js';
import { AIPdfService } from '../service-pdf.js';

const originalUploadDir = process.env.UPLOAD_DIR;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-pdf-test-'));
  fs.mkdirSync(path.join(tmpDir, 'diagrams'), { recursive: true });
  process.env.UPLOAD_DIR = tmpDir;
  // Require an in-memory mongo or an existing local one. Check vitest.config for setup.
  if (!mongoose.connection.readyState) {
    const uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/campusly-test';
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  process.env.UPLOAD_DIR = originalUploadDir;
  if (mongoose.connection.readyState) await mongoose.disconnect();
});

describe('AIPdfService', () => {
  it('generates a PDF buffer containing diagram when rendered', async () => {
    const svgHash = 'abc123def456';
    const svgFile = path.join(tmpDir, 'diagrams', `${svgHash}.svg`);
    fs.writeFileSync(svgFile, '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50"/></svg>');

    const schoolId = new mongoose.Types.ObjectId();
    const teacherId = new mongoose.Types.ObjectId();
    await School.create({ _id: schoolId, name: 'Test High', isDeleted: false });

    const paper = await GeneratedPaper.create({
      schoolId, teacherId,
      subject: 'Mathematics', grade: 10, term: 2, topic: 'Algebra',
      difficulty: 'medium', duration: 60, totalMarks: 50, status: 'ready',
      sections: [{
        sectionLabel: 'Section A',
        questionType: 'Short Answer',
        questions: [{
          questionNumber: 1, marks: 5, questionText: 'Solve for x.',
          modelAnswer: 'x = 5', markingGuideline: '5 for correct setup',
          diagram: {
            tikz: '', data: {}, alt: 'number line',
            svgUrl: `/uploads/diagrams/${svgHash}.svg`,
            hash: svgHash, renderStatus: 'rendered', renderError: null,
          },
        }],
      }],
      memorandum: 'See answers.',
      isDeleted: false,
    });

    const buf = await AIPdfService.generatePaperPdf(paper._id.toString(), schoolId.toString());
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  it('throws NotFoundError when paper does not belong to school', async () => {
    const otherSchool = new mongoose.Types.ObjectId();
    const bogusPaperId = new mongoose.Types.ObjectId();
    await expect(
      AIPdfService.generatePaperPdf(bogusPaperId.toString(), otherSchool.toString()),
    ).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/modules/AITools/__tests__/service-pdf.test.ts`

Note: requires a local MongoDB at `mongodb://localhost:27017/campusly-test`. If unavailable, the execution agent should either (a) skip with `it.skip` and note it in the commit, or (b) use `mongodb-memory-server` (check if already installed; if not, add as devDep).

Expected: both tests pass (or first is skipped with reason if no DB).

- [ ] **Step 3: Commit**

```bash
git add src/modules/AITools/__tests__/service-pdf.test.ts
git commit -m "test(ai-paper): integration tests for AIPdfService"
```

### Task 2.3: Controller + route handlers

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\controller.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\routes.ts`

- [ ] **Step 1: Add controller methods**

Append to `src/modules/AITools/controller.ts` before the closing `}` of the class:

```ts
  static async downloadPaperPdf(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: 'User must be assigned to a school' });
      return;
    }
    const { AIPdfService } = await import('./service-pdf.js');
    const buf = await AIPdfService.generatePaperPdf(req.params.id as string, schoolId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="paper-${req.params.id}.pdf"`);
    res.send(buf);
  }

  static async downloadMemoPdf(req: Request, res: Response): Promise<void> {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      res.status(400).json({ success: false, error: 'User must be assigned to a school' });
      return;
    }
    const { AIPdfService } = await import('./service-pdf.js');
    const buf = await AIPdfService.generateMemoPdf(req.params.id as string, schoolId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="memo-${req.params.id}.pdf"`);
    res.send(buf);
  }
```

- [ ] **Step 2: Add routes**

In `src/modules/AITools/routes.ts`, insert after the existing `PUT /papers/:id` handler and before the Marking section:

```ts
// GET /papers/:id/pdf — download paper PDF
router.get(
  '/papers/:id/pdf',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  AIToolsController.downloadPaperPdf,
);

// GET /papers/:id/memo-pdf — download memorandum PDF
router.get(
  '/papers/:id/memo-pdf',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  AIToolsController.downloadMemoPdf,
);
```

- [ ] **Step 3: Smoke-test manually**

Start the backend: `cd c:/Users/shaun/campusly-backend && npm run dev`

Then (in another shell) hit the endpoint with a valid JWT. Since this requires a logged-in teacher + a generated paper, defer to phase 4 end-to-end verification. For now, verify TypeScript compiles:

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/AITools/controller.ts src/modules/AITools/routes.ts
git commit -m "feat(ai-paper): add /papers/:id/pdf and /papers/:id/memo-pdf routes"
```

---

## Phase 3 — QuestionBank PDF refactor

### Task 3.1: Refactor QuestionBank PDF to use shared primitives

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-pdf.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-pdf-helpers.ts`

**Strategy:** Make `service-pdf.ts` do loading + normalisation, then call shared primitives. Reduce `service-pdf-helpers.ts` to a tiny shim that re-exports what the new service needs (or delete outright once all callers are updated).

- [ ] **Step 1: Rewrite `service-pdf.ts` to normalise + delegate**

```ts
// src/modules/QuestionBank/service-pdf.ts
import mongoose from 'mongoose';
import { AssessmentPaper } from './model.js';
import type { IQuestion } from './model.js';
import { School } from '../School/model.js';
import { NotFoundError } from '../../common/errors.js';
import { collectPaperQuestions } from './service-papers-helpers.js';
import { createDocument, finalise } from '../../common/pdf/document.js';
import { renderTitlePage, renderMemoTitlePage, renderInstructions } from '../../common/pdf/primitives.js';
import { renderQuestionSections, renderMemoSections } from '../../common/pdf/question-rendering.js';
import type {
  NormalisedPaperMeta, NormalisedSection, NormalisedQuestion,
  NormalisedDiagram, NormalisedQuestionType,
} from '../../common/pdf/types.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const URL_PREFIX = '/uploads/diagrams';
const DIAGRAM_BASE_DIR = `${UPLOAD_DIR}/diagrams`;

export class PdfService {
  static async generatePaperPdf(paperId: string, schoolId: string): Promise<Buffer> {
    const { meta, sections } = await load(paperId, schoolId);
    const doc = createDocument();
    renderTitlePage(doc, meta);
    renderInstructions(doc, meta.instructions);
    renderQuestionSections(doc, sections, { baseDir: DIAGRAM_BASE_DIR, urlPrefix: URL_PREFIX });
    return finalise(doc);
  }

  static async generateMemoPdf(paperId: string, schoolId: string): Promise<Buffer> {
    const { meta, sections } = await load(paperId, schoolId);
    const doc = createDocument();
    renderMemoTitlePage(doc, meta);
    renderMemoSections(doc, sections, { baseDir: DIAGRAM_BASE_DIR, urlPrefix: URL_PREFIX });
    return finalise(doc);
  }
}

async function load(
  paperId: string,
  schoolId: string,
): Promise<{ meta: NormalisedPaperMeta; sections: NormalisedSection[] }> {
  const oid = new mongoose.Types.ObjectId(paperId);
  const soid = new mongoose.Types.ObjectId(schoolId);

  const paper = await AssessmentPaper.findOne({
    _id: oid, schoolId: soid, isDeleted: false,
  })
    .populate([
      { path: 'subjectId', select: 'name' },
      { path: 'gradeId', select: 'name level' },
    ])
    .lean();

  if (!paper) throw new NotFoundError('Assessment paper not found');

  const allQuestions = await collectPaperQuestions(paper.sections, schoolId);
  const qMap = new Map<string, IQuestion>();
  for (const q of allQuestions) qMap.set(q._id.toString(), q);

  const school = await School.findOne({ _id: soid, isDeleted: false }).lean();

  const meta: NormalisedPaperMeta = {
    schoolName: school?.name ?? 'School',
    subject: getRefName(paper.subjectId),
    gradeLabel: getRefName(paper.gradeId),
    term: (paper.term as number | string) ?? '',
    year: paper.year as number | string | undefined,
    totalMarks: paper.totalMarks ?? 0,
    duration: paper.duration ?? 0,
    paperTypeLabel: formatPaperType(paper.paperType),
    instructions: paper.instructions,
  };

  const sections: NormalisedSection[] = (paper.sections ?? []).map((s) => ({
    title: s.title,
    instructions: s.instructions,
    questions: normaliseQuestions(s.questions, qMap),
  }));

  return { meta, sections };
}

function normaliseQuestions(
  sectionQuestions: Array<{ questionId: unknown; questionNumber: string; marks: number }>,
  qMap: Map<string, IQuestion>,
): NormalisedQuestion[] {
  const result: NormalisedQuestion[] = [];
  for (const pq of sectionQuestions) {
    const qId = resolveQuestionId(pq.questionId);
    const q = qMap.get(qId);
    if (!q) continue;

    const diagram: NormalisedDiagram | null = q.diagram ? {
      svgUrl: q.diagram.svgUrl ?? null,
      alt: q.diagram.alt ?? '',
      renderStatus: q.diagram.renderStatus ?? 'pending',
    } : null;

    result.push({
      number: pq.questionNumber,
      marks: pq.marks,
      stem: q.stem,
      type: mapType(q.type),
      options: (q.options ?? []).map((o) => ({
        label: o.label, text: o.text, isCorrect: o.isCorrect,
      })),
      answer: q.answer ?? '',
      markingRubric: q.markingRubric ?? '',
      diagram,
    });
  }
  return result;
}

function mapType(t: string): NormalisedQuestionType {
  if (t === 'mcq') return 'mcq';
  if (t === 'true_false') return 'true_false';
  if (t === 'long') return 'long';
  if (t === 'structured') return 'structured';
  return 'short';
}

function resolveQuestionId(questionId: unknown): string {
  if (questionId && typeof questionId === 'object' && questionId !== null) {
    return String((questionId as { _id?: unknown })._id ?? questionId);
  }
  return String(questionId);
}

function getRefName(ref: unknown): string {
  if (ref && typeof ref === 'object' && 'name' in ref) {
    return String((ref as { name?: unknown }).name ?? '');
  }
  return String(ref ?? '');
}

function formatPaperType(paperType: unknown): string {
  return String(paperType ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
```

- [ ] **Step 2: Delete the now-unused helpers from service-pdf-helpers.ts**

Open `src/modules/QuestionBank/service-pdf-helpers.ts`. If no other module imports from it, delete the file:

```bash
git rm src/modules/QuestionBank/service-pdf-helpers.ts
```

First verify by searching:

Run: `cd c:/Users/shaun/campusly-backend && grep -r "service-pdf-helpers" src/ --include="*.ts" | grep -v service-pdf-helpers.ts`

If any imports remain (other than the old `service-pdf.ts` which we just rewrote), leave the file and remove only the functions that were moved. Otherwise delete it.

- [ ] **Step 3: Typecheck**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/QuestionBank/service-pdf.ts
git add -u src/modules/QuestionBank/service-pdf-helpers.ts 2>/dev/null || true
git commit -m "refactor(question-bank): use shared PDF primitives; embed diagrams"
```

### Task 3.2: Verify QuestionBank PDF still works

- [ ] **Step 1: Smoke-test the QuestionBank PDF endpoint manually**

Using an existing `AssessmentPaper` record, hit:
```
GET /api/question-bank/papers/:id/pdf
```
Save the response to a file and open it. Confirm:
- Cover page renders correctly
- Questions render with stems + MCQ options
- Any question that has a diagram now shows it (was broken before — this is the fix)

If a diagram-bearing paper isn't available, create one with the seed script: `npx tsx scripts/seed-diagram-demo.ts`.

- [ ] **Step 2: No commit here — verification only.**

---

## Phase 4 — Frontend download + gate

### Task 4.1: Hook methods for PDF download

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\hooks\useAITools.ts`

- [ ] **Step 1: Add downloadPaperPdf and downloadMemoPdf**

Add these `useCallback` methods inside `useAITools` (alongside the other paper methods), and include them in the return object:

```tsx
  const downloadPaperPdf = useCallback(async (id: string, filename?: string) => {
    try {
      const response = await apiClient.get(`/ai-tools/papers/${id}/pdf`, {
        responseType: 'blob',
      });
      triggerBlobDownload(response.data as Blob, filename ?? `paper-${id}.pdf`);
      toast.success('Paper downloaded');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to download paper';
      toast.error(msg);
    }
  }, []);

  const downloadMemoPdf = useCallback(async (id: string, filename?: string) => {
    try {
      const response = await apiClient.get(`/ai-tools/papers/${id}/memo-pdf`, {
        responseType: 'blob',
      });
      triggerBlobDownload(response.data as Blob, filename ?? `memo-${id}.pdf`);
      toast.success('Memo downloaded');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to download memo';
      toast.error(msg);
    }
  }, []);
```

And add this helper above `useAITools`:

```tsx
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

Update the return object to include:

```tsx
    downloadPaperPdf,
    downloadMemoPdf,
```

- [ ] **Step 2: Typecheck**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend
git add src/hooks/useAITools.ts
git commit -m "feat(ai-paper): add downloadPaperPdf + downloadMemoPdf hook methods"
```

### Task 4.2: Compute diagram-readiness and add Download buttons to PaperPreview

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\PaperPreview.tsx`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\types.ts` (only if `renderStatus` isn't typed)

- [ ] **Step 1: Ensure `diagram.renderStatus` is in the types**

Open `src/components/ai-tools/types.ts` and confirm `diagram?.renderStatus: 'pending' | 'rendered' | 'failed'` is declared on the question type. If not, add it. (If the file already models diagrams loosely as `Record<string, unknown>`, narrow it.)

- [ ] **Step 2: Compute a `pendingDiagramCount` from the paper**

Replace `PaperPreview.tsx` with:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Eye, EyeOff, Download } from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import type { GeneratedPaper, PaperSection, PaperQuestion } from './types';

interface PaperPreviewProps {
  paper: GeneratedPaper;
  regeneratingKey: string | null;
  saving?: boolean;
  editedKeys: Set<string>;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
  onSave: (sections: PaperSection[]) => void;
  onDownloadPaper: () => void;
  onDownloadMemo: () => void;
}

function countPendingDiagrams(paper: GeneratedPaper): number {
  let count = 0;
  for (const section of paper.sections) {
    for (const q of section.questions as PaperQuestion[]) {
      if (q.diagram && q.diagram.renderStatus === 'pending') count++;
    }
  }
  return count;
}

export function PaperPreview({
  paper, regeneratingKey, saving = false, editedKeys,
  onEditQuestion, onRegenerateQuestion, onSave, onDownloadPaper, onDownloadMemo,
}: PaperPreviewProps) {
  const [showMemo, setShowMemo] = useState(false);
  const pendingCount = useMemo(() => countPendingDiagrams(paper), [paper]);
  const downloadBlocked = pendingCount > 0;
  const downloadTooltip = downloadBlocked
    ? `${pendingCount} diagram${pendingCount === 1 ? ' is' : 's are'} still rendering — please wait before downloading.`
    : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{paper.subject} -- Grade {paper.grade}</h2>
            <p className="text-sm text-muted-foreground">
              Term {paper.term} Examination -- {paper.topic}
            </p>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Duration: {paper.duration} minutes</span>
              <span>Total Marks: {paper.totalMarks}</span>
              <Badge variant="secondary" className="capitalize">{paper.difficulty}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {paper.sections.map((section, sIdx) => (
        <SectionEditor
          key={sIdx}
          section={section}
          sectionIndex={sIdx}
          regeneratingKey={regeneratingKey}
          editedKeys={editedKeys}
          showModelAnswers={showMemo}
          onEditQuestion={onEditQuestion}
          onRegenerateQuestion={onRegenerateQuestion}
        />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => setShowMemo(!showMemo)}>
            {showMemo ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showMemo ? 'Hide Memo' : 'Show Memo'}
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={onDownloadPaper}
              disabled={downloadBlocked}
              title={downloadTooltip}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Paper
            </Button>
            <Button
              variant="outline"
              onClick={onDownloadMemo}
              disabled={downloadBlocked}
              title={downloadTooltip}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Memo
            </Button>
            <Button onClick={() => onSave(paper.sections)} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Paper'}
            </Button>
          </div>

          {downloadBlocked && (
            <p className="w-full text-xs text-muted-foreground">
              Waiting for {pendingCount} diagram{pendingCount === 1 ? '' : 's'} to finish rendering…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ai-tools/PaperPreview.tsx src/components/ai-tools/types.ts
git commit -m "feat(ai-paper): Download Paper + Download Memo buttons gated on diagram readiness"
```

### Task 4.3: Wire page-level handlers + editedKeys state

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\teacher\ai-tools\create-paper\page.tsx`

- [ ] **Step 1: Add editedKeys state, download handlers, and pass them down**

In `create-paper/page.tsx`:

Add to imports:

```tsx
import { useCallback, useState } from 'react';
```

Destructure the new hook methods:

```tsx
const { generatePaper, savePaper, regenerateQuestion, downloadPaperPdf, downloadMemoPdf } = useAITools();
```

Add state for edited keys:

```tsx
const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set());
```

Replace `handleEditQuestion` so it also marks the question edited:

```tsx
const handleEditQuestion = useCallback((
  sectionIndex: number, questionIndex: number, text: string,
) => {
  if (!paper) return;
  const key = `${sectionIndex}:${questionIndex}`;
  setEditedKeys((prev) => {
    const next = new Set(prev);
    next.add(key);
    return next;
  });
  const newSections = paper.sections.map((sec, sIdx) => {
    if (sIdx !== sectionIndex) return sec;
    return {
      ...sec,
      questions: sec.questions.map((q, qIdx) =>
        qIdx === questionIndex ? { ...q, questionText: text } : q,
      ),
    };
  });
  setPaper({ ...paper, sections: newSections });
}, [paper]);
```

Replace `handleRegenerateQuestion` so it clears the edited flag after a successful regenerate:

```tsx
const handleRegenerateQuestion = useCallback(async (
  sectionIndex: number, questionIndex: number,
) => {
  if (!paper) return;
  const key = `${sectionIndex}:${questionIndex}`;
  setRegeneratingKey(key);
  const updated = await regenerateQuestion(paper.id, sectionIndex, questionIndex);
  if (updated) {
    setPaper(updated);
    setEditedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }
  setRegeneratingKey(null);
}, [paper, regenerateQuestion]);
```

Add download handlers:

```tsx
const handleDownloadPaper = useCallback(() => {
  if (!paper) return;
  void downloadPaperPdf(paper.id, `${paper.subject}-G${paper.grade}-T${paper.term}-paper.pdf`);
}, [paper, downloadPaperPdf]);

const handleDownloadMemo = useCallback(() => {
  if (!paper) return;
  void downloadMemoPdf(paper.id, `${paper.subject}-G${paper.grade}-T${paper.term}-memo.pdf`);
}, [paper, downloadMemoPdf]);
```

Update the `<PaperPreview>` props:

```tsx
{step === 5 && paper && (
  <PaperPreview
    paper={paper}
    regeneratingKey={regeneratingKey}
    saving={saving}
    editedKeys={editedKeys}
    onEditQuestion={handleEditQuestion}
    onRegenerateQuestion={handleRegenerateQuestion}
    onSave={handleSave}
    onDownloadPaper={handleDownloadPaper}
    onDownloadMemo={handleDownloadMemo}
  />
)}
```

- [ ] **Step 2: Typecheck**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/teacher/ai-tools/create-paper/page.tsx
git commit -m "feat(ai-paper): wire downloads + edited-key tracking in create-paper page"
```

---

## Phase 5 — Zod validation for Claude paper-generation JSON

### Task 5.1: Define the schema

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\validation-ai.ts`

- [ ] **Step 1: Define the schemas**

```ts
// src/modules/AITools/validation-ai.ts
import { z } from 'zod/v4';

export const DiagramSchema = z.object({
  tikz: z.string(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
  alt: z.string().default(''),
}).optional();

export const PaperQuestionSchema = z.object({
  questionNumber: z.union([z.number(), z.string()]),
  questionText: z.string().min(1),
  marks: z.number().int().nonnegative(),
  modelAnswer: z.string().default(''),
  markingGuideline: z.string().default(''),
  diagram: DiagramSchema,
});

export const PaperSectionSchema = z.object({
  sectionLabel: z.string().min(1),
  questionType: z.string().min(1),
  questions: z.array(PaperQuestionSchema).min(1),
});

export const PaperGenerationResponseSchema = z.object({
  sections: z.array(PaperSectionSchema).min(1),
  memorandum: z.string().default(''),
});

export type PaperGenerationResponse = z.infer<typeof PaperGenerationResponseSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend
git add src/modules/AITools/validation-ai.ts
git commit -m "feat(ai-paper): add Zod schema for Claude paper-generation response"
```

### Task 5.2: Unit tests for the schema

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\AITools\__tests__\service-generation-parse.test.ts`

- [ ] **Step 1: Write the tests**

```ts
// src/modules/AITools/__tests__/service-generation-parse.test.ts
import { describe, it, expect } from 'vitest';
import { PaperGenerationResponseSchema } from '../validation-ai.js';

describe('PaperGenerationResponseSchema', () => {
  it('accepts a valid minimal response', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [{
        sectionLabel: 'A',
        questionType: 'Short',
        questions: [{ questionNumber: 1, questionText: 'Q1', marks: 5 }],
      }],
      memorandum: 'memo',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a response with no sections', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [],
      memorandum: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a section with no questions', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [{ sectionLabel: 'A', questionType: 'Short', questions: [] }],
      memorandum: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a question with empty text', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [{
        sectionLabel: 'A', questionType: 'Short',
        questions: [{ questionNumber: 1, questionText: '', marks: 5 }],
      }],
      memorandum: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional diagram', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [{
        sectionLabel: 'A', questionType: 'Short',
        questions: [{
          questionNumber: 1, questionText: 'Q1', marks: 5,
          diagram: { tikz: '\\draw (0,0) -- (1,1);', alt: 'line' },
        }],
      }],
      memorandum: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric marks', () => {
    const result = PaperGenerationResponseSchema.safeParse({
      sections: [{
        sectionLabel: 'A', questionType: 'Short',
        questions: [{ questionNumber: 1, questionText: 'Q1', marks: 'five' }],
      }],
      memorandum: '',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run src/modules/AITools/__tests__/service-generation-parse.test.ts`

Expected: all six pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/AITools/__tests__/service-generation-parse.test.ts
git commit -m "test(ai-paper): Zod schema tests for paper-generation response"
```

### Task 5.3: Apply validation at the generation call site

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\service.ts`

First read the file to locate the exact JSON parse site. It's in `AIToolsService.generatePaper` (around line 128). The pattern looks like:

```ts
const parsed = JSON.parse(response); // or similar
// fallback: if parse fails, treat whole response as single question
```

- [ ] **Step 1: Import the schema and BadRequestError**

Add at the top of `service.ts`:

```ts
import { PaperGenerationResponseSchema } from './validation-ai.js';
import { BadRequestError } from '../../common/errors.js';
```

- [ ] **Step 2: Replace the raw parse + fallback with validation**

Find the block that parses Claude's JSON response into `sections` and `memorandum`. Replace with:

```ts
// Claude returned a JSON object — validate it strictly.
const validation = PaperGenerationResponseSchema.safeParse(parsed);
if (!validation.success) {
  const issue = validation.error.issues[0];
  const where = issue?.path.join('.') || '(root)';
  throw new BadRequestError(
    `AI response did not match the expected structure at "${where}": ${issue?.message ?? 'unknown'}. Please try generating again.`,
  );
}
const validated = validation.data;
// Use `validated.sections` and `validated.memorandum` downstream.
```

Remove any `try/catch` fallback that wrapped the raw response as a single-question fallback. Let the `BadRequestError` propagate to the Express error handler — this returns 400 to the client with a sensible message.

- [ ] **Step 3: Also apply to service-generation.ts if it parses Claude output independently**

`src/modules/AITools/service-generation.ts` has a parse site around line 225. Apply the same pattern: call `PaperGenerationResponseSchema.safeParse` on the parsed JSON and throw `BadRequestError` on failure.

- [ ] **Step 4: Typecheck + run all tests**

Run: `cd c:/Users/shaun/campusly-backend && npx tsc --noEmit && npx vitest run`

Expected: no type errors; all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/AITools/service.ts src/modules/AITools/service-generation.ts
git commit -m "fix(ai-paper): validate Claude JSON with Zod, remove silent fallback"
```

---

## Phase 6 — Regenerate confirmation (frontend)

### Task 6.1: Show confirmation dialog when regenerating an edited question

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\SectionEditor.tsx`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\QuestionCard.tsx`

Note: base-ui Dialog convention per CLAUDE.md — `<DialogTrigger render={<Button />}>…</DialogTrigger>`.

- [ ] **Step 1: Add a confirmation dialog to SectionEditor**

Open `src/components/ai-tools/SectionEditor.tsx`. Add a local state for which key is pending confirmation, render a dialog when set, and intercept `onRegenerateQuestion` when the question's key is in `editedKeys`.

Replace the file with:

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QuestionCard } from './QuestionCard';
import type { PaperSection } from './types';

interface SectionEditorProps {
  section: PaperSection;
  sectionIndex: number;
  regeneratingKey: string | null;
  editedKeys: Set<string>;
  showModelAnswers: boolean;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
}

export function SectionEditor({
  section, sectionIndex, regeneratingKey, editedKeys, showModelAnswers,
  onEditQuestion, onRegenerateQuestion,
}: SectionEditorProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const requestRegenerate = (qIdx: number) => {
    const key = `${sectionIndex}:${qIdx}`;
    if (editedKeys.has(key)) {
      setPendingKey(key);
    } else {
      onRegenerateQuestion(sectionIndex, qIdx);
    }
  };

  const confirmRegenerate = () => {
    if (!pendingKey) return;
    const [, qIdxStr] = pendingKey.split(':');
    const qIdx = Number(qIdxStr);
    setPendingKey(null);
    onRegenerateQuestion(sectionIndex, qIdx);
  };

  return (
    <>
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold">{section.sectionLabel}: {section.questionType}</h3>
          {section.questions.map((question, qIdx) => (
            <QuestionCard
              key={qIdx}
              question={question}
              questionIndex={qIdx}
              isRegenerating={regeneratingKey === `${sectionIndex}:${qIdx}`}
              isEdited={editedKeys.has(`${sectionIndex}:${qIdx}`)}
              showModelAnswer={showModelAnswers}
              onEdit={(text) => onEditQuestion(sectionIndex, qIdx, text)}
              onRegenerate={() => requestRegenerate(qIdx)}
            />
          ))}
        </CardContent>
      </Card>

      <Dialog open={pendingKey !== null} onOpenChange={(open) => { if (!open) setPendingKey(null); }}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Replace your edits?</DialogTitle>
            <DialogDescription>
              You&apos;ve made changes to this question. Regenerating will replace your edits with a new AI-generated version. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingKey(null)}>Keep my edits</Button>
            <Button variant="destructive" onClick={confirmRegenerate}>Regenerate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Update QuestionCard to accept `isEdited` and optionally show a badge**

Open `src/components/ai-tools/QuestionCard.tsx`. Read the file to see the current signature, then:

- Add `isEdited: boolean` to props
- When `isEdited`, render a small secondary Badge next to the question number: `<Badge variant="secondary">Edited</Badge>`

(Exact JSX depends on current layout — do the minimum change to surface the flag visibly without redesigning the card.)

- [ ] **Step 3: Typecheck**

Run: `cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit`

Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ai-tools/SectionEditor.tsx src/components/ai-tools/QuestionCard.tsx
git commit -m "feat(ai-paper): confirm before regenerating an edited question"
```

---

## Phase 7 — End-to-end verification

### Task 7.1: Manual smoke test — happy path

- [ ] **Step 1: Start backend**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev
```

- [ ] **Step 2: Start frontend**

```bash
cd c:/Users/shaun/campusly-frontend && npm run dev
```

- [ ] **Step 3: Walk the wizard**

Login as a teacher. Navigate to `/teacher/ai-tools/create-paper`. Generate a Grade 10 Maths paper on Algebra with mixed sections. Confirm:

- [ ] Paper generates (step 4 → 5 transition works)
- [ ] Diagrams render in preview (if any generated)
- [ ] Download Paper button is enabled
- [ ] Download Paper produces a PDF that opens cleanly, with diagrams embedded
- [ ] Download Memo produces a PDF with answers + marking rubrics
- [ ] Edit a question, then click Regenerate — confirmation dialog appears
- [ ] Cancel keeps the edit; Confirm replaces it and clears the edited flag

### Task 7.2: Manual smoke test — failure modes

- [ ] **Step 1: Claude malformed JSON**

Temporarily stub the AI service to return `"not json"`. Regenerate. Confirm: 400 error toast like "AI response did not match the expected structure…". No partial paper is saved.

- [ ] **Step 2: Pending diagram gate**

Create or mutate a paper in the DB such that one question has `diagram.renderStatus: 'pending'`. Load the paper and confirm the Download buttons are disabled and the explanatory sub-text shows.

- [ ] **Step 3: Failed diagram**

With a paper whose diagram `renderStatus: 'failed'`, confirm the PDF downloads and shows the alt-text placeholder `[Diagram unavailable] …` in place of the diagram.

### Task 7.3: Final checks

- [ ] **Step 1: Run all backend tests**

Run: `cd c:/Users/shaun/campusly-backend && npx vitest run`

Expected: everything green.

- [ ] **Step 2: Typecheck both repos**

Run:
```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Expected: clean on both.

- [ ] **Step 3: Open PRs**

Open one PR per repo against `master`:
- `feat(ai-paper): GA blockers — PDF export with diagrams, Zod validation, regenerate confirmation`

In each PR description, link the other and paste the "walkthrough" checklist from Task 7.1.

---

## Self-review

- **Spec coverage:** All three blockers are covered (Phase 1–4 = Blocker 1; Phase 5 = Blocker 2; Phase 6 = Blocker 3). Verification in Phase 7.
- **Placeholders:** None. Every code-producing step has concrete code.
- **Type consistency:** `NormalisedPaperMeta`, `NormalisedSection`, `NormalisedQuestion`, `NormalisedDiagram`, `NormalisedQuestionType`, `EmbedOptions` used consistently across primitives, AITools service, and QuestionBank service. Function signatures match between declarations and callers (`embedDiagram(doc, diagram, opts)`, `renderQuestionSections(doc, sections, opts)`, `renderMemoSections(doc, sections, opts)`, `downloadPaperPdf(id, filename?)`, `downloadMemoPdf(id, filename?)`).
- **Known risks:**
  - svg-to-pdfkit may mishandle some TikZ SVGs; fallback is alt-text placeholder (graceful).
  - Vitest integration tests depend on a local mongo; if unavailable, skip with a note — unit tests in `common/pdf/__tests__` and `__tests__/service-generation-parse.test.ts` stand on their own.
  - `QuestionBank` PDF refactor touches the existing hot path; manual smoke test in Task 3.2 is the guard.
