# Curriculum Content Engine — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Approach:** Layered Modules (Structure > Content > Assessments)

---

## Overview

A comprehensive curriculum content engine for South African schools covering CAPS, IEB, and Cambridge curricula. Three independent layers built on a shared curriculum structure backbone:

1. **Curriculum Structure Database** — Structured CAPS/IEB/Cambridge topic trees parsed from official documents
2. **Interactive Content Library** — Lesson plans, study notes, worksheets with interactive blocks (quiz, drag-drop, fill-blank, etc.), sourced from OER, AI generation, and teacher contributions
3. **Question Bank & Assessment Builder** — Cognitive-level-tagged questions with manual and AI-assisted paper generation, CAPS weighting compliance validation, and PDF output with memorandums

All content is tagged to curriculum nodes with dual cognitive level tagging (CAPS 4-level + Bloom's 6-level). Student interaction tracking and mastery aggregation are designed in from day one to support future adaptive learning.

---

## Research Context

### South African Curriculum Landscape

- **CAPS** (Curriculum and Assessment Policy Statement): National curriculum for Grades R-12, freely available from DBE as PDFs. Annual Teaching Plans (ATPs) provide week-by-week pacing. No government API exists — all documents are PDF-only.
- **IEB**: Assessment body, not a separate curriculum. IEB schools teach CAPS content but are examined by IEB. IEB assessment materials are proprietary. CAPS structure covers ~90% of IEB needs.
- **Cambridge** (IGCSE/AS/A-Level): Separate curriculum used by some private schools. Syllabi freely downloadable, content proprietary.
- **Other** (Montessori, Waldorf): Pedagogical approaches that align with CAPS for regulatory compliance. Not separate curricula to model.

### Content Sources

- **Siyavula open textbooks**: CC-BY licensed Maths and Science content (Grades 4-12). Available on GitHub. Best free content source for SA.
- **Thunderbolt Kids**: Free Natural Sciences and Technology (Grades 4-6), CAPS-aligned.
- **WCED ePortal / DBE Cloud / Mindset Learn**: Free resources but not structured as API data.
- **No third-party curriculum API exists** for SA — every edtech platform builds its own CAPS mapping. This is both the gap and the competitive advantage.

### Legal

- CAPS structure (subjects, topics, learning outcomes, assessment standards) is freely usable — government-published educational content.
- IEB exam papers and detailed assessment materials are copyrighted — cannot reproduce without licence.
- Textbook content (Pearson, Oxford, Via Afrika, etc.) is copyrighted — cannot reproduce.
- Siyavula content usable under CC-BY with attribution.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | 3 layered modules | Clean separation, each under 350 lines, ship incrementally |
| Primary curriculum | CAPS first, IEB as metadata overlay, Cambridge separate | CAPS covers majority of SA schools; IEB is CAPS + different assessment |
| Content sourcing | Hybrid: OER + AI-generated + teacher contributions | Broad coverage fast via AI, quality anchors from OER, community flywheel |
| Content format | Interactive block-based | Engaging learning, granular tracking per block |
| Resource types | Lessons + Assessments (not slides/video/interactive activities yet) | Highest teacher pain point; slides etc. come later |
| Cognitive tagging | Dual: CAPS 4-level + Bloom's 6-level | CAPS for SA compliance, Bloom's for Cambridge + richer analytics |
| Content sharing | School-scoped with HOD approval | Simpler than cross-school, avoids IP concerns, HODs have oversight role |
| Assessment builder | Manual + AI-assisted modes | Some teachers want full control, others want convenience |
| CAPS parsing | AI-assisted with human review | Much faster than manual; CAPS PDFs are well-structured |
| Adaptive learning | Data model designed in now, engine built later | StudentAttempt + StudentMastery accumulate data; algorithm work comes in Phase 4 |

---

## Layer 1: Curriculum Structure Database

### Data Models

#### CurriculumFramework (existing model, extended)

```
CurriculumFramework
├── name: "CAPS" | "IEB" | "Cambridge" | custom string
├── country: "ZA"
├── phases: ["Foundation", "Intermediate", "Senior", "FET"]
├── schoolId: ObjectId | null (null for system-wide, set for custom)
├── isDeleted: boolean
```

#### CurriculumNode (new — replaces flat topic list)

```
CurriculumNode
├── frameworkId → CurriculumFramework
├── type: "phase" | "grade" | "subject" | "term" | "topic" | "subtopic" | "outcome"
├── parentId → CurriculumNode | null (self-referential tree)
├── title: string
├── code: string (e.g. "CAPS-MAT-GR10-T1-ALG-01")
├── description: string
├── metadata:
│   ├── weekNumbers: number[] (from ATPs)
│   ├── capsReference: string (page/section in CAPS doc)
│   ├── assessmentStandards: string[]
│   ├── notionalHours: number
│   └── cognitiveWeighting: { knowledge: number, routine: number, complex: number, problemSolving: number }
├── order: number (sort within parent)
├── schoolId: ObjectId | null (null for system nodes)
├── isDeleted: boolean
```

### Design Decisions

- **Tree via `parentId`**: Arbitrary depth. CAPS is typically 6 levels deep but Cambridge structures differently — tree accommodates both.
- **System vs school nodes**: CAPS/IEB/Cambridge nodes have `schoolId: null`, read-only for schools. Schools can create custom frameworks with own nodes.
- **Code field**: Machine-readable stable identifier. Enables bulk import/export and stable cross-references.
- **Cognitive weighting at topic level**: CAPS prescribes percentage weightings per cognitive level per subject. Stored on nodes so assessment builder can validate compliance.

### Integration With Existing Modules

- `CurriculumPlan` (pacing) gains `frameworkId` and links topics to `CurriculumNode` IDs instead of free-text titles
- Teacher Workbench `CurriculumTopic` replaced by `CurriculumNode` (migration needed)
- Coverage tracking references `CurriculumNode` IDs

### Seeding Process

1. CAPS PDFs + Annual Teaching Plans fed to Claude for structured extraction
2. Output as JSON matching CurriculumNode schema
3. Human review pass per subject
4. Bulk import via extended `/nodes/bulk` endpoint
5. IEB: same CAPS nodes, flagged with IEB-specific assessment metadata
6. Cambridge: separate framework, separate extraction from CAIE syllabi

### API Endpoints — Base: `/api/curriculum-structure`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/frameworks` | List frameworks (CAPS, IEB, Cambridge, custom) |
| POST | `/frameworks` | Create custom framework |
| GET | `/nodes` | List/search nodes (filter by framework, parent, grade, subject, type) |
| GET | `/nodes/:id` | Get single node with children |
| GET | `/nodes/:id/tree` | Get full subtree from a node |
| POST | `/nodes` | Create node |
| PUT | `/nodes/:id` | Update node |
| DELETE | `/nodes/:id` | Soft delete node + descendants |
| POST | `/nodes/bulk` | Bulk import (for CAPS seeding) |

---

## Layer 2: Interactive Content Library

### Data Models

#### ContentResource

```
ContentResource
├── curriculumNodeId → CurriculumNode
├── schoolId: ObjectId | null (null for system-wide OER)
├── type: "lesson" | "study_notes" | "worksheet" | "worked_example" | "activity"
├── format: "static" | "interactive"
├── title: string
├── blocks: ContentBlock[] (ordered array)
├── source: "oer" | "ai_generated" | "teacher" | "system"
├── sourceAttribution: string (e.g. "Siyavula, CC-BY")
├── gradeId: string
├── subjectId: string
├── term: number
├── tags: string[]
├── status: "draft" | "pending_review" | "approved" | "rejected"
├── reviewedBy → User
├── reviewedAt: Date
├── reviewNotes: string
├── createdBy → User
├── aiModel: string (if AI-generated)
├── aiPrompt: string (stored for audit)
├── downloads: number
├── rating: number
├── ratingCount: number
├── difficulty: 1-5
├── estimatedMinutes: number
├── prerequisites: CurriculumNode[] (nodes student should know first)
├── isDeleted: boolean
```

#### ContentBlock (subdocument)

```
ContentBlock
├── type: "text" | "image" | "video" | "quiz" | "drag_drop" | "fill_blank"
│        | "match_columns" | "ordering" | "hotspot" | "step_reveal" | "code"
├── order: number
├── content: string (markdown for text, config JSON for interactive)
├── curriculumNodeId → CurriculumNode (granular per-block tagging)
├── cognitiveLevel: { caps: string, blooms: string }
├── points: number (for scored blocks)
├── hints: string[] (progressive hints)
├── explanation: string (shown after attempt)
├── metadata: object (block-type-specific config)
```

### Interactive Block Types

| Block Type | Description | Example |
|-----------|-------------|---------|
| `text` | Rich markdown with KaTeX | Explanation of quadratic formula |
| `image` | Image with optional caption | Diagram of cell structure |
| `video` | Embedded video link | YouTube/Vimeo embed |
| `quiz` | MCQ, true/false, short answer with auto-marking | "Solve for x: 2x + 3 = 7" |
| `fill_blank` | Sentence/equation with blanks | "The process of _____ converts light energy..." |
| `drag_drop` | Drag items to categories/positions | Sort numbers as rational/irrational |
| `match_columns` | Connect related items | Match events to dates |
| `ordering` | Arrange in correct sequence | Order steps of cell division |
| `step_reveal` | Worked example, reveal one step at a time | Long division step-by-step |
| `hotspot` | Click correct area on image/diagram | "Identify the mitochondria" |
| `code` | Code editor with test cases (CAT/IT) | "Write a Python function that..." |

### Student Performance Tracking

#### StudentAttempt

```
StudentAttempt
├── studentId → Student
├── contentResourceId → ContentResource
├── blockId: string
├── curriculumNodeId → CurriculumNode
├── cognitiveLevel: { caps: string, blooms: string }
├── correct: boolean
├── score: number
├── maxScore: number
├── timeSpentSeconds: number
├── hintsUsed: number
├── attemptNumber: number
├── response: string
├── createdAt: Date
```

#### StudentMastery (aggregated per node)

```
StudentMastery
├── studentId → Student
├── curriculumNodeId → CurriculumNode
├── masteryLevel: 0-100
├── attemptCount: number
├── lastAttemptAt: Date
├── cognitiveBreakdown: { knowledge: number, routine: number, complex: number, problemSolving: number }
├── weakAreas: string[]
├── updatedAt: Date
```

### Content Workflow

**OER imports (Siyavula Maths/Science):**
1. Parse Siyavula open textbook content (GitHub CC-BY source)
2. Map chapters to CurriculumNode IDs
3. Import as `source: "oer"`, `status: "approved"`, with attribution
4. Available system-wide (`schoolId: null`)

**AI generation (on-demand):**
1. Teacher selects curriculum node and resource type
2. System prompts Claude with topic details, grade level, CAPS requirements, cognitive level expectations
3. Output is structured JSON of ContentBlocks — rendered in block-based editor
4. Saved as `source: "ai_generated"`, `status: "draft"` (teacher's private draft)
5. Teacher edits, then keeps as personal or submits → `status: "pending_review"` → HOD approves/rejects
6. Rate limit: max 20 AI generations per teacher per day

**Teacher contributions:**
1. Teacher creates resource manually or edits AI-generated content
2. Submits to school library → `status: "pending_review"`
3. HOD reviews and approves/rejects with notes
4. Approved resources visible to all teachers in that school

### Access Control

| Role | View | Create | Approve | Delete |
|------|------|--------|---------|--------|
| Teacher | System-wide + own school approved + own drafts | Own drafts, submit for review | No | Own drafts only |
| HOD | Everything teacher sees + pending reviews in dept | Same as teacher | Yes (own dept) | Approved in own dept |
| Admin | All resources | System-wide resources | Yes (all) | Yes (all) |

### API Endpoints — Base: `/api/content-library`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/resources` | List/search resources (by node, type, format, status) |
| GET | `/resources/:id` | Get resource with blocks |
| POST | `/resources` | Create resource |
| PUT | `/resources/:id` | Update resource |
| DELETE | `/resources/:id` | Soft delete |
| POST | `/resources/generate` | AI-generate content for a node |
| PATCH | `/resources/:id/review` | HOD approve/reject |
| POST | `/resources/:id/attempt` | Submit student attempt on a block |
| GET | `/mastery/student/:studentId` | Get mastery profile |
| GET | `/mastery/class/:classId` | Get class mastery overview |

---

## Layer 3: Question Bank & Assessment Builder

### Data Models

#### Question

```
Question
├── curriculumNodeId → CurriculumNode
├── schoolId: ObjectId | null (null for system-wide)
├── subjectId: string
├── gradeId: string
├── type: "mcq" | "true_false" | "short_answer" | "structured" | "essay"
│        | "match" | "fill_blank" | "calculation" | "diagram_label" | "case_study"
├── stem: string (markdown + KaTeX)
├── media: { type: "image" | "diagram" | "table", url: string }[]
├── options: { label: string, text: string, isCorrect: boolean }[] (MCQ/true_false)
├── answer: string (model answer / memo)
├── markingRubric: string (detailed marking guide, markdown)
├── marks: number
├── cognitiveLevel: { caps: string, blooms: string }
├── difficulty: 1-5
├── tags: string[]
├── source: "system" | "ai_generated" | "teacher"
├── status: "draft" | "pending_review" | "approved" | "rejected"
├── reviewedBy → User
├── createdBy → User
├── usageCount: number
├── isDeleted: boolean
```

#### AssessmentPaper

```
AssessmentPaper
├── schoolId → School
├── title: string (e.g. "Grade 10 Mathematics Paper 1 — June 2026")
├── subjectId: string
├── gradeId: string
├── term: number
├── year: number
├── paperType: "class_test" | "assignment" | "mid_year" | "trial" | "final" | "custom"
├── totalMarks: number
├── duration: number (minutes)
├── sections: PaperSection[]
├── instructions: string
├── capsCompliance: CapsComplianceReport
├── status: "draft" | "finalised" | "archived"
├── createdBy → User
├── isDeleted: boolean
```

#### PaperSection (subdocument)

```
PaperSection
├── title: string (e.g. "Section A: Multiple Choice")
├── instructions: string
├── order: number
├── questions: PaperQuestion[]
```

#### PaperQuestion (subdocument)

```
PaperQuestion
├── questionId → Question
├── questionNumber: string (e.g. "1.1", "2.3.2")
├── marks: number (can override question default)
├── order: number
```

#### CapsComplianceReport (subdocument, auto-calculated)

```
CapsComplianceReport
├── topicCoverage: { nodeId: string, title: string, marks: number, percent: number }[]
├── cognitiveDistribution: { knowledge: number, routine: number, complex: number, problemSolving: number }
├── targetDistribution: { knowledge: number, routine: number, complex: number, problemSolving: number }
├── compliant: boolean
├── violations: string[] (e.g. "Knowledge questions are 35% — target is 20-25%")
├── difficultySpread: { easy: number, medium: number, hard: number }
```

### Assessment Builder — Two Modes

**Mode 1: Manual Assembly**
1. Teacher creates paper (subject, grade, term, type, total marks, duration)
2. Browses question bank with filters: topic, cognitive level, difficulty, marks, question type
3. Drags questions into sections
4. Real-time CAPS compliance panel shows:
   - Cognitive level distribution vs target (bar chart)
   - Topic coverage vs term plan (checklist)
   - Total marks tally
   - Violations highlighted in destructive colour
5. Reorder, swap questions, override marks
6. Generate printable PDF with memo

**Mode 2: AI-Assisted Generation**
1. Teacher specifies: subject, grade, term, paper type, total marks, duration
2. Selects topics (from tree, or "all Term 2 topics")
3. Sets cognitive level weighting (defaults to CAPS prescribed %)
4. Sets difficulty preference (easy/balanced/challenging)
5. System pulls approved questions from bank where possible
6. AI generates new questions to fill gaps
7. Outputs complete paper with sections, numbering, memo
8. Teacher opens in manual builder to review/edit
9. AI-generated questions saved to bank as `status: "draft"` for reuse

### CAPS Compliance Validation

Subject-level cognitive weightings stored on CurriculumNode metadata:

| Subject | Knowledge | Routine | Complex | Problem-solving |
|---------|-----------|---------|---------|----------------|
| Mathematics | 20% | 35% | 30% | 15% |
| Physical Sciences | 15% | 35% | 40% | 10% |
| Life Sciences | 40% | 25% | 25% | 10% |

Compliance checker:
- Sums marks per cognitive level across all questions
- Compares against target (with +/-5% tolerance)
- Flags violations before finalisation
- Blocks finalisation if total marks mismatch or critical violations

### Memo & PDF Generation

**Memorandum** auto-assembled from question `answer` and `markingRubric` fields:
- Structured questions: step-by-step marking with mark allocation per step
- MCQs: answer key in grid format
- Essays: rubric with level descriptors

**PDF** follows standard SA exam paper format:
- School letterhead (from school profile)
- Subject, grade, date, marks, duration in header
- General instructions
- Sections with clear numbering
- Mark allocations in brackets per question
- Separate memo document with matching numbering

### Access Control

| Role | Browse bank | Create questions | Create papers | Approve questions |
|------|------------|-----------------|---------------|-------------------|
| Teacher | Own school + system | Yes (draft) | Yes | No |
| HOD | Own school + system | Yes (draft) | Yes | Yes (own dept) |
| Admin | All | Yes (approved directly) | Yes | Yes (all) |

**Security:** Finalised papers visible only to creator + admins/HODs. Teachers cannot see each other's finalised papers.

### API Endpoints — Base: `/api/question-bank`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/questions` | List/search (by node, type, cognitive level, difficulty) |
| GET | `/questions/:id` | Get single question |
| POST | `/questions` | Create question |
| PUT | `/questions/:id` | Update question |
| DELETE | `/questions/:id` | Soft delete |
| POST | `/questions/generate` | AI-generate questions for a node |
| PATCH | `/questions/:id/review` | HOD approve/reject |
| GET | `/papers` | List papers for current teacher |
| GET | `/papers/:id` | Get paper with sections and questions |
| POST | `/papers` | Create paper (manual) |
| PUT | `/papers/:id` | Update paper |
| POST | `/papers/generate` | AI-generate complete paper |
| POST | `/papers/:id/finalise` | Finalise (runs compliance check) |
| GET | `/papers/:id/compliance` | Get compliance report |
| GET | `/papers/:id/pdf` | Download paper PDF |
| GET | `/papers/:id/memo-pdf` | Download memo PDF |
| POST | `/papers/:id/clone` | Clone paper as new draft |

---

## Integration Architecture

### Layer Dependencies

```
┌─────────────────────────────────────────────────┐
│           Existing Campusly Modules              │
│  (Pacing, Benchmarks, Workbench, Reports, AI)    │
└──────────┬──────────────┬───────────────┬────────┘
           │              │               │
    ┌──────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │  Content    │ │  Question  │ │  Student    │
    │  Library    │ │  Bank &    │ │  Learning   │
    │  (Layer 2)  │ │  Assessment│ │  (Adaptive) │
    │             │ │  (Layer 3) │ │  (Future)   │
    └──────┬──────┘ └─────┬──────┘ └──────┬──────┘
           │              │               │
           └──────────────┼───────────────┘
                          │
              ┌───────────▼───────────┐
              │  Curriculum Structure  │
              │  Database (Layer 1)    │
              │  CurriculumNode tree   │
              └───────────────────────┘
```

Layers don't reference each other directly — they're siblings connected through the structure backbone.

### Backend Module Layout

```
src/modules/
├── Curriculum/              (existing — pacing, benchmarks, interventions)
│   └── gains: frameworkId + nodeId references on plans
├── CurriculumStructure/     (new — Layer 1)
│   ├── model.ts
│   ├── routes.ts
│   ├── controller.ts
│   ├── service-frameworks.ts
│   ├── service-nodes.ts
│   └── validation.ts
├── ContentLibrary/          (new — Layer 2)
│   ├── model.ts
│   ├── routes.ts
│   ├── controller.ts
│   ├── service-resources.ts
│   ├── service-generation.ts
│   ├── service-attempts.ts
│   ├── service-mastery.ts
│   └── validation.ts
├── QuestionBank/            (new — Layer 3)
│   ├── model.ts
│   ├── routes.ts
│   ├── controller.ts
│   ├── service-questions.ts
│   ├── service-papers.ts
│   ├── service-generator.ts
│   ├── service-compliance.ts
│   ├── service-pdf.ts
│   └── validation.ts
```

### Frontend Page Structure

```
src/app/(dashboard)/
├── admin/curriculum/          (existing — gains structure management)
│   ├── page.tsx               (existing — pacing overview)
│   ├── benchmarks/page.tsx    (existing)
│   ├── structure/page.tsx     (new — manage CAPS/IEB tree, bulk import)
│   └── content/page.tsx       (new — admin view of all content)
├── teacher/curriculum/        (existing — gains content + assessments)
│   ├── page.tsx               (existing — pacing)
│   ├── content/page.tsx       (new — browse/create content)
│   ├── questions/page.tsx     (new — browse/create questions)
│   └── assessments/page.tsx   (new — paper builder)
├── hod/curriculum/
│   ├── page.tsx               (existing — department pacing)
│   ├── reviews/page.tsx       (new — pending content + question reviews)
│   └── mastery/page.tsx       (new — class/student mastery overview)
├── student/learn/             (new — student-facing)
│   ├── page.tsx               (subject/topic browser)
│   ├── [nodeId]/page.tsx      (interactive lesson view)
│   └── progress/page.tsx      (mastery dashboard)
└── parent/learn/              (new — parent view)
    └── page.tsx               (child's mastery/progress read-only)
```

### Existing Module Integration

- **Pacing**: `CurriculumPlan.topics[]` gains `nodeId` field. Auto-populate from structure tree. Progress maps to official ATP week numbers.
- **Benchmarks**: Cross-reference assessment results from `AssessmentPaper` against targets. Richer analytics: "Grade 10 Maths below target — specifically weak on Complex-level Algebra."
- **Teacher Workbench**: Framework/topic endpoints become wrappers around CurriculumStructure. Coverage references CurriculumNode IDs. Direct content library access from node viewer.
- **Reports**: New report types — mastery heatmap, cognitive level breakdown, content usage stats.
- **AI Tools**: Content/question generation routes through existing AI tools infrastructure. Shared rate limiting, prompt logging, usage tracking.

---

## Build & Ship Order

### Phase 1: Curriculum Structure Database

1. Build CurriculumStructure backend module (model, CRUD, bulk import, tree queries)
2. AI-parse CAPS for priority subjects: Mathematics, English, Afrikaans, Life Sciences, Physical Sciences, Natural Sciences (Grades 4-12)
3. Human review pass on parsed data
4. Build admin structure management page (tree viewer, edit, bulk import)
5. Migrate existing CurriculumPlan and Workbench topics to reference CurriculumNode IDs
6. Seed IEB metadata and Cambridge as separate framework

**Deliverable:** Complete searchable CAPS topic tree. Existing pacing/benchmarks immediately enriched.

### Phase 2: Interactive Content Library

1. Build ContentLibrary backend module (resource CRUD, block model, review workflow)
2. Import Siyavula OER for Maths/Science mapped to nodes
3. Build AI generation service for interactive content blocks
4. Build teacher content creation/editing UI (block-based editor)
5. Build HOD review queue
6. Build student interactive lesson view with block rendering
7. Build StudentAttempt tracking and StudentMastery aggregation
8. Build student progress dashboard and parent read-only view

**Deliverable:** Teachers create/find/generate interactive lessons. Students learn interactively. Mastery data accumulates.

### Phase 3: Question Bank & Assessment Builder

1. Build QuestionBank backend module (question CRUD, review, paper assembly)
2. Seed question bank via AI generation across priority subjects, human review
3. Build question browser/creator with cognitive level tagging
4. Build manual paper assembly with real-time CAPS compliance panel
5. Build AI paper generation
6. Build PDF generation (paper + memo) in SA exam format
7. Build HOD review queue for questions
8. Connect assessment results to mastery tracking and benchmark comparison

**Deliverable:** Full assessment workflow — browse, build, validate, print.

### Phase 4: Adaptive Learning Engine (Future)

1. Recommendation service reads StudentMastery and prerequisites
2. Suggests next content based on mastery gaps
3. Adjusts difficulty based on cognitive level breakdown
4. Teacher/parent dashboard with recommended learning paths
5. Spaced repetition for revision scheduling

**Not designed in detail now.** Data model from Phase 2 captures everything the adaptive engine needs.

### Subject Rollout Priority

| Priority | Subjects | Rationale |
|----------|----------|-----------|
| 1 | Mathematics, Mathematical Literacy | Highest demand, Siyavula OER, structured |
| 2 | Physical Sciences, Life Sciences, Natural Sciences | Siyavula OER for Phys Sci, high exam pressure |
| 3 | English (Home + FAL), Afrikaans (Home + FAL) | Every school needs these |
| 4 | Accounting, Business Studies, Economics | Popular FET electives |
| 5 | Geography, History, Social Sciences | Content-heavy, good for interactive |
| 6 | All remaining CAPS subjects | CAT, IT, Life Orientation, Creative Arts, etc. |
| 7 | Cambridge IGCSE/AS/A-Level | Private school market |

---

## Adaptive Learning — Data Design (Phase 4 Preparation)

The following is captured from Phase 2 onwards to enable adaptive learning later:

- **Every interactive block tagged** to curriculum node + cognitive level → know what skill each interaction tests
- **StudentMastery per node** with cognitive breakdown → know where student is strong/weak
- **Prerequisites on ContentResource** → know the learning sequence
- **Difficulty rating** → serve appropriate challenge level
- **Time spent + hints used** → measure fluency, not just correctness

Adaptive engine algorithm (future):
- Mastery < 40% on prerequisite → redirect to prerequisite content
- Mastery 40-70% → more practice at current difficulty
- Mastery > 70% → advance to next topic or increase cognitive level
