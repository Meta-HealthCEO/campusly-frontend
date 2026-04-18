# Multi-Page Paper Marking — Design Spec

**Status:** Approved
**Date:** 2026-04-13
**Author:** Shaun + Claude

## 1. Goal

Enable teachers to upload multi-page test papers (1-8 images per student), have AI grade them against the memo, persist the results, and optionally push marks into the gradebook. Replace the current single-image fire-and-forget flow with a production-ready marking pipeline.

## 2. Architecture

The marking flow becomes: **Select Paper → Select Student → Upload Pages → AI Marks → Review & Save → Next Student**. Each marking creates a `PaperMarking` record in the database. The teacher can review past markings and push marks to the gradebook.

Claude's Messages API supports multiple images in a single `content` array. We send all pages in one API call so the AI sees the complete paper context — no stitching or sequential processing needed.

## 3. Data Model

### 3.1 New: `PaperMarking` collection

```typescript
interface IPaperMarking extends Document {
  paperId: Types.ObjectId;         // GeneratedPaper or AssessmentPaper
  paperType: 'generated' | 'assessment';
  studentId?: Types.ObjectId;      // optional — roster-only students may not have one
  studentName: string;
  teacherId: Types.ObjectId;
  schoolId: Types.ObjectId;
  images: string[];                // base64 strings (stored for audit/re-review)
  imageTypes: string[];            // MIME types per image
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: Array<{
    questionNumber: number;
    studentAnswer: string;
    correctAnswer: string;
    marksAwarded: number;
    maxMarks: number;
    feedback: string;
  }>;
  status: 'processing' | 'completed' | 'failed' | 'published';
  gradebookEntryId?: Types.ObjectId; // link to Mark record if published
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `{ paperId, schoolId }`, `{ teacherId, schoolId }`, `{ studentId, paperId }`

**Note on image storage:** For MVP, base64 images are stored directly in the document. This is fine for 1-8 images at compressed JPEG quality. Phase 2 could move to S3/GridFS if storage becomes an issue.

## 4. Backend Changes

### 4.1 `AIService.generateVisionCompletion` — multi-image support

Change the signature from single image to array:

```typescript
// Before
static async generateVisionCompletion(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  imageMediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  options?: { maxTokens?: number; temperature?: number },
)

// After — backward-compatible overload
static async generateVisionCompletion(
  systemPrompt: string,
  userText: string,
  images: string | string[],
  imageMediaTypes: string | string[],
  options?: { maxTokens?: number; temperature?: number },
)
```

When `images` is an array, build multiple image content blocks in the messages array. Claude handles this natively.

### 4.2 `markPaperFromImages` — new service method

New method in `service-marking.ts` replacing `markPaperFromImage`:

- Accepts `images: string[]` and `imageTypes: string[]` instead of single image
- Creates a `PaperMarking` record with status `'processing'` before calling AI
- Sends all images in one Claude Vision call
- Updates the record to `'completed'` with results, or `'failed'` with error
- Returns the saved `PaperMarking` document

Keep `markPaperFromImage` as a thin wrapper that calls the new method with `[image]`.

### 4.3 Validation schema update

```typescript
export const markPaperMultiSchema = z.object({
  paperId: z.string().min(1),
  studentName: z.string().min(1).trim(),
  studentId: z.string().optional(),
  images: z.array(z.string().min(1)).min(1).max(8),
  imageTypes: z.array(z.enum(['image/jpeg', 'image/png', 'image/webp'])).min(1).max(8),
}).strict().refine(
  (d) => d.images.length === d.imageTypes.length,
  'images and imageTypes must have the same length',
);
```

### 4.4 New endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST /mark-paper-multi` | Mark a multi-page paper | Creates PaperMarking, calls AI, returns result |
| `GET /markings/paper/:paperId` | List all markings for a paper | For the "class results" view |
| `GET /markings/:id` | Get a single marking | For reviewing/editing |
| `PUT /markings/:id` | Update marks (teacher adjustments) | Allows mark corrections |
| `POST /markings/:id/publish` | Push marks to gradebook | Creates/updates Mark entries |

### 4.5 Publish to gradebook

`POST /markings/:id/publish`:
- Finds the PaperMarking record
- Finds or creates an Assessment for this paper (type: 'test', classId from student's class, subjectId from paper)
- Creates a Mark entry: `{ studentId, assessmentId, mark: totalMarks, total: maxMarks, schoolId }`
- Sets `marking.status = 'published'` and `marking.gradebookEntryId`
- If already published, updates the existing Mark entry

## 5. Frontend Changes

### 5.1 ImageDropzone — multi-file support

Modify `src/components/ai-tools/ImageDropzone.tsx`:
- Accept `multiple?: boolean` prop (default false for backward compat)
- When `multiple`, allow drag-and-drop of multiple files
- Show thumbnail preview strip with reorder (drag) and remove (X) buttons
- New callback: `onFilesChange: (files: { base64: string; type: string }[]) => void`
- Keep existing `onImageCapture` for single-file backward compat

### 5.2 Mark Papers page rewrite

Rewrite `src/app/(dashboard)/teacher/curriculum/mark-papers/page.tsx`:

**New flow (5 steps):**
1. **Select Paper** — pick from generated papers or assessment papers (existing)
2. **Select Student** — pick from class roster (new) or type a name manually
3. **Upload Pages** — multi-file ImageDropzone. Show page count. "Add more pages" button.
4. **AI Marking** — show progress, then results table (question, student answer, correct answer, marks, feedback). Teacher can adjust any mark.
5. **Save & Continue** — save result, show summary, "Mark next student" button loops to step 2, or "View all results" button.

Extract step components to keep each file under 350 lines.

### 5.3 New: Marking Results View

New component accessible from the mark-papers page:
- Table showing all students marked for a paper
- Columns: Student, Total, Max, %, Status (Completed/Published)
- "Publish to gradebook" button (individual or bulk)
- Click a row to review that student's marking

### 5.4 Hook

New `src/hooks/useTeacherMarking.ts`:
- `markPaper(data)` — POST /mark-paper-multi
- `getMarkings(paperId)` — GET /markings/paper/:paperId
- `getMarking(id)` — GET /markings/:id
- `updateMarking(id, data)` — PUT /markings/:id
- `publishMarking(id)` — POST /markings/:id/publish

## 6. System prompt update

The system prompt needs to handle multi-page context:

```
You are marking a South African school test paper. You will be shown photographs of a student's handwritten answers — the paper may span multiple pages. Read ALL pages before marking. Compare each answer against the memo provided. Award marks according to the marking guideline. For partial answers, award partial marks where appropriate. Be fair but accurate.

If handwriting is illegible, note this in the feedback for that question and award 0 marks for the illegible portion.

Return ONLY a JSON object with this structure: ...
```

## 7. Limits and constraints

- Max 8 images per marking (covers even long exam papers)
- Max 20MB total payload (compressed JPEGs are typically 200KB-2MB each)
- Claude Vision timeout: 360s (already configured)
- Concurrency: existing semaphore (max 5 concurrent AI calls) applies
- Base64 storage: acceptable for MVP. ~1-2MB per image * 8 max = ~16MB per document. MongoDB 16MB document limit may be hit for 8 large images — mitigate by compressing client-side to max 1MB per image.

## 8. What's NOT in scope

- Batch marking (mark 30 students in one go) — Phase 2
- Automatic student detection from handwriting — too unreliable
- PDF upload support — requires server-side PDF-to-image conversion, deferred
- Re-marking (re-run AI on saved images) — simple to add later since images are persisted
- AI Studio output wiring (save as homework/test) — separate feature

## 9. Migration

None required. New collection, additive endpoints. Existing single-image endpoint continues to work via the wrapper.
