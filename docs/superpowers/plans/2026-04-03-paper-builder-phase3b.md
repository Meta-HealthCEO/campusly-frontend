# Paper Builder Phase 3b — Assembly UI + AI Generation + PDF Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the paper assembly UI (manual + AI-assisted modes), PDF generation for papers and memorandums in standard SA exam format.

**Architecture:** Backend PDF generation service using a template-based approach (HTML → PDF via puppeteer or similar). AI paper generation service that pulls approved questions + generates missing ones. Frontend paper builder page with section management, question search/add, real-time compliance panel, and PDF download.

**Tech Stack:** Mongoose/MongoDB, Express, Anthropic SDK, Puppeteer (PDF), React 19 / Next.js, Tailwind CSS 4, shadcn.

**Spec:** `docs/superpowers/specs/2026-04-03-curriculum-content-engine-design.md` — Layer 3 (Assessment Builder, PDF Generation)

---

## File Structure

### Backend — extend `campusly-backend/src/modules/QuestionBank/`

| File | Responsibility |
|------|---------------|
| `service-paper-generation.ts` | AI paper generation (pull approved + generate missing) |
| `service-pdf.ts` | PDF generation for papers and memos (HTML template → PDF) |
| Add endpoints to existing `controller.ts` and `routes.ts` |

### Frontend — `campusly-frontend/`

| File | Responsibility |
|------|---------------|
| `src/components/questions/PaperSection.tsx` | Single section with question list + add/remove |
| `src/components/questions/QuestionSearchPanel.tsx` | Search panel for finding questions to add |
| `src/components/questions/PaperGenerateDialog.tsx` | AI paper generation parameters dialog |
| `src/app/(dashboard)/teacher/curriculum/assessments/[paperId]/page.tsx` | Paper builder page |

---

## Task 1: Backend — AI Paper Generation Service

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/service-paper-generation.ts`

Service that generates a complete paper:
1. Accept params: subjectId, gradeId, term, paperType, totalMarks, duration, topics (node IDs or "all"), cognitiveWeighting (defaults to CAPS), difficulty preference
2. First pull approved questions from the bank that match the criteria
3. Calculate how many marks are covered vs target
4. For gaps, generate new questions via AI (reuse generation service pattern)
5. Organize into sections by question type (MCQ section, structured section, etc.)
6. Auto-number questions (1.1, 1.2, 2.1, etc.)
7. Return a complete paper with sections, questions, and compliance report
8. Save generated questions to bank as drafts

Methods:
- `generatePaper(schoolId, userId, params)` — returns created AssessmentPaper with populated questions

Commit: `git commit -m "feat(question-bank): add AI paper generation service"`

---

## Task 2: Backend — PDF Generation Service

**Files:**
- Create: `campusly-backend/src/modules/QuestionBank/service-pdf.ts`

PDF generation for papers and memos. Check if puppeteer is already a dependency — if not, use a simpler approach with a library that's already available or that doesn't require a browser binary (e.g., `pdfkit`, `jspdf`, or generate HTML and use a lighter converter).

Actually, check `package.json` first for any PDF-related dependency. If none exists, use `pdfkit` which is pure Node.js.

**Paper PDF format (standard SA exam):**
- School name header (from school profile — fetch via School model)
- Subject, Grade, Date, Total Marks, Duration
- General instructions
- For each section: section title, section instructions
- For each question: question number, stem text, marks in brackets [X]
- MCQ options listed as A, B, C, D
- Page numbers

**Memo PDF format:**
- Same header
- "MEMORANDUM" title
- For each question: question number, model answer, mark allocation
- MCQ: answer grid
- Structured: step-by-step marking with marks per step

Methods:
- `generatePaperPdf(paperId, schoolId)` — returns Buffer
- `generateMemoPdf(paperId, schoolId)` — returns Buffer

Commit: `git commit -m "feat(question-bank): add PDF generation for papers and memorandums"`

---

## Task 3: Backend — Add Endpoints for Generation + PDF

**Files:**
- Modify: `campusly-backend/src/modules/QuestionBank/controller.ts`
- Modify: `campusly-backend/src/modules/QuestionBank/routes.ts`
- Modify: `campusly-backend/src/modules/QuestionBank/validation.ts`

Add to controller:
- `generatePaper` — POST /papers/generate
- `downloadPaperPdf` — GET /papers/:id/pdf
- `downloadMemoPdf` — GET /papers/:id/memo-pdf

Add validation schema for paper generation:
```typescript
export const generatePaperSchema = z.object({
  subjectId: objectIdSchema,
  gradeId: objectIdSchema,
  term: z.number().int().min(1).max(4),
  year: z.number().int(),
  paperType: paperTypeEnum,
  totalMarks: z.number().int().min(1),
  duration: z.number().int().min(1),
  topicNodeIds: z.array(objectIdSchema).default([]),
  cognitiveWeighting: z.object({
    knowledge: z.number().min(0).max(100),
    routine: z.number().min(0).max(100),
    complex: z.number().min(0).max(100),
    problemSolving: z.number().min(0).max(100),
  }).optional(),
  difficulty: z.enum(['easy', 'balanced', 'challenging']).default('balanced'),
  instructions: z.string().default(''),
}).strict();
```

PDF endpoints should set response headers:
```typescript
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', `attachment; filename="${paper.title}.pdf"`);
res.send(pdfBuffer);
```

Commit: `git commit -m "feat(question-bank): add paper generation and PDF download endpoints"`

---

## Task 4: Frontend — Types + Hook Updates

**Files:**
- Modify: `campusly-frontend/src/types/question-bank.ts`
- Modify: `campusly-frontend/src/hooks/useQuestionBank.ts`

Add types:
```typescript
export interface GeneratePaperPayload {
  subjectId: string;
  gradeId: string;
  term: number;
  year: number;
  paperType: PaperType;
  totalMarks: number;
  duration: number;
  topicNodeIds?: string[];
  cognitiveWeighting?: CognitiveDistribution;
  difficulty?: 'easy' | 'balanced' | 'challenging';
  instructions?: string;
}
```

Add hook methods:
- `generatePaper(data: GeneratePaperPayload)` — POST /papers/generate, returns paper
- `downloadPaperPdf(paperId: string)` — GET /papers/:id/pdf, triggers download
- `downloadMemoPdf(paperId: string)` — GET /papers/:id/memo-pdf, triggers download

For PDF download, use `apiClient.get()` with `responseType: 'blob'`, then create a download link:
```typescript
const downloadPaperPdf = useCallback(async (paperId: string) => {
  const response = await apiClient.get(`/question-bank/papers/${paperId}/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `paper-${paperId}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
  toast.success('Paper PDF downloaded');
}, []);
```

Commit: `git commit -m "feat(question-bank): add paper generation and PDF download to types and hook"`

---

## Task 5: Frontend — PaperSection Component

**Files:**
- Create: `campusly-frontend/src/components/questions/PaperSection.tsx`

A section within the paper builder showing:
1. Section header with title, edit button, delete section button
2. Section instructions (editable)
3. List of questions in the section, each showing: question number, truncated stem, marks, type badge, cognitive level badge
4. Remove question button per row
5. "Add Question" button opens the question search panel
6. Reorder questions (up/down buttons)
7. Section marks subtotal

Props:
```typescript
interface PaperSectionProps {
  section: PaperSectionItem;
  sectionIndex: number;
  onRemoveQuestion: (sectionIndex: number, questionOrder: number) => void;
  onAddQuestion: (sectionIndex: number) => void;
  onUpdateSection: (sectionIndex: number, updates: { title?: string; instructions?: string }) => void;
  onRemoveSection: (sectionIndex: number) => void;
  populatedQuestions: Map<string, QuestionItem>;
}
```

Commit: `git commit -m "feat(question-bank): add PaperSection component for paper builder"`

---

## Task 6: Frontend — QuestionSearchPanel Component

**Files:**
- Create: `campusly-frontend/src/components/questions/QuestionSearchPanel.tsx`

A side panel or inline search for finding questions to add to a paper section:
1. Search input
2. Filters: type, cognitive level, difficulty, marks range
3. Shows matching approved questions as compact rows
4. "Add" button per question
5. Shows question stem, marks, type, cognitive level

Props:
```typescript
interface QuestionSearchPanelProps {
  onAdd: (questionId: string) => void;
  subjectId: string;
  gradeId: string;
  excludeQuestionIds: string[];
}
```

Uses `useQuestionBank().fetchQuestions()` internally — wait, components can't use hooks that call apiClient. The component needs to receive a `searchQuestions` callback from the page.

Actually, the component CAN use the `useQuestionBank` hook since the hook doesn't import apiClient in the component — the hook itself is used by the component. Wait — hooks are allowed in components, the rule is that apiClient cannot be directly imported. Hooks that wrap apiClient are fine to use in components.

Let me re-read CLAUDE.md: "Components: Pure UI. Accept typed props. ZERO apiClient imports allowed." — The rule is about direct apiClient imports, not about using hooks. Hooks ARE the approved way to make API calls. So components CAN use hooks.

But wait, looking at existing patterns, components like NodeTree originally had apiClient and we had to fix that. The pattern in this codebase seems to be: components get callbacks from pages, not use hooks directly. Let me be safe and pass a search callback.

Props:
```typescript
interface QuestionSearchPanelProps {
  questions: QuestionItem[];
  loading: boolean;
  onSearch: (filters: QuestionFilters) => void;
  onAdd: (question: QuestionItem) => void;
  subjectId: string;
  gradeId: string;
  excludeQuestionIds: Set<string>;
}
```

Commit: `git commit -m "feat(question-bank): add QuestionSearchPanel for finding questions to add"`

---

## Task 7: Frontend — PaperGenerateDialog

**Files:**
- Create: `campusly-frontend/src/components/questions/PaperGenerateDialog.tsx`

Dialog for AI paper generation parameters:
1. Subject + Grade (pre-filled from paper or selectable)
2. Term, Year
3. Paper type selector
4. Total marks input
5. Duration input
6. Topic selection (NodePicker or multi-select from curriculum tree)
7. Cognitive weighting sliders/inputs (knowledge %, routine %, complex %, problem-solving %) — default to CAPS standard
8. Difficulty preference (easy/balanced/challenging radio)
9. Additional instructions textarea
10. "Generate" button

Props:
```typescript
interface PaperGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: GeneratePaperPayload) => Promise<void>;
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
}
```

Commit: `git commit -m "feat(question-bank): add PaperGenerateDialog for AI paper generation"`

---

## Task 8: Frontend — Paper Builder Page

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/teacher/curriculum/assessments/[paperId]/page.tsx`

The main paper builder page:
1. Load paper via `getPaper(paperId)` with populated questions
2. Paper metadata header: title, subject, grade, term, marks, duration, status badges
3. "Add Section" button
4. List of PaperSection components
5. Question search panel (shown when adding questions, can be toggled)
6. CompliancePanel sidebar/footer showing real-time CAPS compliance
7. Action buttons: "Save", "Check Compliance", "Finalise", "Download PDF", "Download Memo"
8. "Finalise" shows confirmation if compliant, blocks if not
9. PDF downloads trigger browser download

State management:
- Paper data from API
- Track which section is in "add question" mode
- Refresh compliance after any question add/remove

Commit: `git commit -m "feat(question-bank): add paper builder page with sections, compliance, and PDF download"`

---

## Task 9: Update Assessments List Page — Wire Navigation

**Files:**
- Modify: `campusly-frontend/src/app/(dashboard)/teacher/curriculum/assessments/page.tsx`

Update the paper card click handler to navigate to `/teacher/curriculum/assessments/${paper.id}` instead of logging.

Add "Generate Paper" button that opens PaperGenerateDialog.

Commit: `git commit -m "feat(question-bank): wire assessments page navigation and add generate button"`

---

## Summary

| Task | What It Builds | Backend/Frontend |
|------|---------------|-----------------|
| 1 | AI paper generation service | Backend |
| 2 | PDF generation (paper + memo) | Backend |
| 3 | Generation + PDF endpoints | Backend |
| 4 | Types + hook updates | Frontend |
| 5 | PaperSection component | Frontend |
| 6 | QuestionSearchPanel component | Frontend |
| 7 | PaperGenerateDialog | Frontend |
| 8 | Paper builder page | Frontend |
| 9 | Wire assessments page navigation | Frontend |
