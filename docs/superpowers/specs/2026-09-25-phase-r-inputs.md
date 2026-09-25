# Phase R inputs: exam blueprints (what exists, what's missing, what to send)

**Date:** 2026-09-25 · **Status:** preparation for Phase R of the [readiness programme](2026-09-25-readiness-programme.md) by lane 3, for Shaun's R gate. Read from code, scripts and seed files only (no database), backend master `56c2bef`. Companion to the [Phase E design](2026-09-25-evidence-diagnosis-design.md).

Paths: backend paths are relative to `campusly-backend/src/modules/` unless they start with `scripts/` or `src/`.

## 1. In short

- The curriculum tree exists and is rich. It includes Grades 10–12 for 13 subjects, parsed from Annual Teaching Plans (ATPs). It holds **no exam blueprint as data**:
  - `cognitiveWeighting` is null on every seeded node.
  - Paper structures and topic marks exist only as prose inside a few Grade 12 node descriptions, parsed by AI and never checked.
- **Nothing models a final-exam paper.** There is no paper number (P1/P2), no marks per topic per paper, and no cognitive-level targets per subject.
- **Past papers exist only as uploaded files.** The only past-paper record is a file link, and "paper import" converts documents into lesson content, not exam questions.
- **The cognitive levels differ by subject.** The question model's four CAPS levels are the Mathematics scheme. Accounting and Physical Sciences use their own, so R needs a scheme per subject.
- **R needs documents**, listed in §4. The proposal is to start with **Mathematics, Physical Sciences and Accounting** (§5).

## 2. What the code and data already have

### 2.1 The curriculum tree

- **`CurriculumNode`** (`CurriculumStructure/model.ts:78-101`).
  - Types are `phase | grade | subject | term | topic | subtopic | outcome` (`:5-12`).
  - Each node has `parentId`, a globally unique `code` (`:105`), and denormalised `phaseId / gradeId / subjectId`, which are **node** ids (`:94-97`). `termNumber` is set by a save hook, which bulk inserts skip (`:116-173`).
  - `schoolId: null` means a system node.
- **Metadata** (`:23-29, 67-76`): `weekNumbers`, `capsReference`, `assessmentStandards[]`, `notionalHours`, and `cognitiveWeighting {knowledge, routine, complex, problemSolving}` (0–100 each, `:57-65`). Nothing checks that the four add up to 100 (the Zod schema is at `CurriculumStructure/validation.ts:12-27`).
- **Links from the school side.** The school's `Subject` and `Grade` point into the tree through `curriculumNodeId` (`Academic/model.ts:12, 35, 139, 190`).
- **Frameworks.** CAPS, IEB and Cambridge are seeded (`CurriculumStructure/seed-frameworks.ts:4-37`). The framework model is at `TeacherWorkbench/model.ts:38-66`.
- **The tree's shape matters for R.** Topics hang under **terms** (subject → term → topic → subtopic). The same exam topic is therefore spread over several nodes and grades. For example, Grade 12 Mathematics has 9 topic nodes over 4 terms, and none of them is "Algebra, equations and inequalities", which Paper 1 examines for 25 marks. That content lives in the Grade 10 and 11 nodes (`CAPS-MATHEMATICS-GR10-T1-ALG`, `CAPS-MATHEMATICS-GR11-T1-EQN`).

### 2.2 The CAPS data and scripts

| Script | Reads | Writes | Notes |
|---|---|---|---|
| `scripts/parse-caps-atp.ts` | one ATP PDF, sent to Claude as base64 (`:125-154`) | `scripts/output/caps-<subject>-gr<N>.json` (`:258-263`) | The prompt fixes `cognitiveWeighting: null` (`:34, 85`) and puts SBA and exam details only in term descriptions (`:70-72`) |
| `scripts/parse-all-atps.ts` | a PDF folder, e.g. `C:/Users/shaun/OneDrive/Desktop/Curriculum` (`:25-70`) | runs the parser per ATP | Skips full CAPS policy documents (`:62-65`) |
| `scripts/import-curriculum-nodes.ts` | the JSON files | `POST /curriculum-structure/nodes/bulk` (`:50`) | Resolves `parentCode` (`CurriculumStructure/service-nodes.ts:271, 335-339`) |
| `scripts/seed-content-library.ts` | `scripts/seed-data/*` (`:103-111`) | content library | One pack (Grade 7 Mathematics) |
| `scripts/seed-grades.ts` | — | random SBA marks (`:28-32`) | Not curriculum |

**Coverage of `scripts/output/`** (107 files):

| Grades | Subjects |
|---|---|
| 1–2 | English FAL, English HL, Life Skills, Mathematics |
| 3 | English HL, Life Skills, Mathematics |
| 4–6 | Afrikaans FAL/HL, English FAL/HL, Life Skills, Mathematics, NS-Tech, Social Sciences |
| 7–9 | Afrikaans FAL/HL, EMS, English FAL/HL, LO, Mathematics, Natural Sciences, Social Sciences, Technology, Visual Arts |
| **10–12** | **Accounting, Business Studies, CAT, Economics, Geography, History, IT, Life Orientation, Life Sciences, Maths Lit, Mathematics, Physical Sciences, Tourism** (13 each). **No Grade 10–12 languages.** |

`scripts/seed-data/` holds 10 questions, quizzes and resources for Grade 7 Mathematics only. Those questions do carry CAPS levels (3 knowledge, 6 routine, 1 complex).

**Grade 12 files: what they hold** (counted from the JSON):

| Subject | Topics | Subtopics | `notionalHours` > 0 | `capsReference` set | `assessmentStandards` set | `cognitiveWeighting` set | Exam structure (prose only) |
|---|---|---|---|---|---|---|---|
| Mathematics | 9 | 36 | 0 | 0 | 0 | 0 | P1 and P2 marks per topic (`caps-mathematics-gr12.json:468`) |
| Physical Sciences | 15 | 34 | 0 | 0 | 0 | 0 | P1 and P2 marks per knowledge area (`caps-physical-sciences-gr12.json:493, 522`) |
| Accounting | 13 | 29 | 0 | 22 | 13 | 0 | P1 and P2 (150 marks, 2 h each), **cognitive levels 30/40/30**, 10–15% problem solving, difficulty 30/40/30, citing "2020 exam guidelines" (`caps-accounting-gr12.json:381-382`; final exam `:416-425`) |
| Life Sciences | 14 | 45 | 0 | 0 | 0 | 0 | P1 and P2 marks per topic (trial, `caps-life-sciences-gr12.json:568`) |
| Maths Lit | 13 | 33 | 0 | 0 | 0 | 0 | "Paper 1" and "Paper 2" stored as *subtopics* (`:314, 323, 390, 399`); final contents without marks (`:476`) |
| Geography, History | 20, 7 | 35, 12 | 0 | 0 | 0 | 0 | Topics per paper, no marks (`geography:1076`, `history:419`) |
| Tourism | 14 | 0 | 0 | 16 | 4 | 0 | "200 marks" (`:392`) |
| CAT, IT | 23, 16 | 0 | 27, 20 | 0 | 23, 16 | 0 | none |
| Business Studies, Economics, LO | 16, 14, 13 | 24, 28, 0 | 0 | 40, 42, 0 | 0, 0, 4 | 0 | none |

**Caveats on this data:**
- The figures are AI transcriptions of ATP text. They are unverified and are **not** a source R can rely on as they stand.
- The files also contain topics that are not content, which R must exclude from mastery:
  - "Trial Examination", "Revision", "Final NSC Examination" (Physical Sciences `-T3-TRIAL`, `-T4-REV`, `-T4-EXAM`)
  - "Revision and Trial Examination", "Final NCS Examination" and a stale "Planning for 2024/25" (Accounting `-T3-REVISION`, `-T4-FINALEXAM`, `-T4-PLANNING`)
- "Planning for 2024/25" suggests the ATPs are older than 2026.

### 2.3 Questions and papers

- **`Question`** (`QuestionBank/model.ts:136-174`).
  - It has `curriculumNodeId` (required), `cognitiveLevel {caps, blooms}` (required), `marks`, `difficulty` 1–5, `markingRubric`, and a flat structure with no sub-questions.
  - `caps` is `knowledge | routine | complex | problem_solving` (`:12-14`), the Mathematics scheme.
  - `source` is `system | ai_generated | teacher` (`:24`). There is **no past-paper provenance**: no year, session, paper or question number.
- **`AssessmentPaper`** (`QuestionBank/model-papers.ts:93-288`).
  - `paperType` is `class_test | assignment | mid_year | trial | final | custom` (`:6-8`). There is **no paper number**.
  - It has `topicIds`, `totalMarks`, `duration`, and `sections[].questions[]`.
  - `capsCompliance` records topic coverage, the cognitive distribution against a target, and violations (`:71-78, 208-218`).
- **Paper generation.**
  - The input accepts an optional `cognitiveWeighting` (`QuestionBank/validation.ts:259-264`) and a `sectionConfig` (`:210-215`). It falls back to **20/35/30/15** (`service-paper-generation.ts:36-41`), which is the CAPS Mathematics split.
  - Questions are picked per level from the bank, and AI fills any shortfall (`service-paper-gen-helpers.ts:97-137, 227-279`).
  - `Subject.paperDefaults` stores only a question-type mix (`Academic/model.ts:123-166`).
- **Two defects that affect R:**
  - The compliance check looks up a CurriculumNode by the school's *Subject* id (`service-compliance.ts:114-145`). That never matches, so every paper is checked against the fixed 20/35/30/15 at ±5% (`:5`).
  - The question generator never produces `problem_solving` (`service-questions-generation.ts:40-50`).
- **Legacy models, not blueprint material:** `GeneratedPaper` (`AITools/model.ts:83-113`), `WorkbenchQuestion` with a 6-level Bloom enum (`TeacherWorkbench/model.assessment.ts:21-102`), `PaperMemo.markAllocation` (`:106-183`), and `AssessmentPlan.weight`, which is an SBA weight (`:250-316`).

### 2.4 Past papers and imports

- **`PastPaper`** (`Academic/model.ts:548-577`; routes `Academic/routes.ts:380-382`). A per-school file link with `subjectId`, `gradeId`, `year`, `term` and `fileUrl`. It has no paper number, no memo, and no questions.
- **`PaperImportJob`** (`PaperImport/model.ts:17-123`) is **not** a past-paper importer. It turns an uploaded PDF or image into content-library blocks. It has no year, paper, numbering or memo fields, and it saves blocks with `curriculumNodeId: null`, `cognitiveLevel: null`, `points: 0` (`PaperImport/service-worker.ts:321-323, 353-355, 384-386`).
- **`Exam` / `ExamTimetable`** (`Academic/model.ts:474-544`) hold scheduling only: date, venue, invigilator and duration.
- "NSC" appears only in career and APS code (`Career/services/aps.service.ts:4`). "Paper 1", "examination guidelines" and "blueprint" appear nowhere in `src/`.

## 3. What's missing to model the Grade 12 NSC blueprint

1. **A blueprint record** (new; R designs the details). One record per subject × grade × session (e.g. NSC November) × year in force, holding:
   - `source`: document title, edition and page references, plus a `verified` flag
   - `papers[]` with `paperNumber`, title, `totalMarks`, `durationMinutes`, and optional sections
   - per paper, `topicAllocations[] {examTopicKey, label, marks, nodeIds[]}`
   - per paper, `cognitiveLevels[] {levelKey, label, percent}`, in that subject's own scheme
2. **Exam topics mapped to curriculum nodes across Grades 10–12.** An exam topic, such as Maths P2 "Trigonometry 50", spans nodes in three grades and several terms. The mapping is data, and one exam topic can map to many nodes. It can be proposed by AI from node titles and descriptions, then reviewed.
3. **A role on each node:** `content | revision | assessment | admin`. This excludes "Revision", "Trial Examination", "Final NSC Examination" and "Planning…" topics from mastery and blueprints.
4. **A cognitive scheme per subject** with a mapping onto what questions store. `Question.cognitiveLevel.caps` has the four Mathematics levels. Accounting's guideline text uses three bands (30/40/30, `caps-accounting-gr12.json:381`), and other subjects' guidelines define their own. Either map each subject's levels onto the four stored values, or add a per-subject level field. R rules on this after reading the guidelines.
5. **Paper numbers and provenance.** `AssessmentPaper` needs `paperNumber` (P1/P2/P3), so mock exams (M) can be true to one paper. `Question` needs optional past-paper provenance (`{year, session, paperNumber, questionNumber}`) so imported past-paper questions can calibrate readiness and seed M.
6. **Verified numbers.** Every figure in §2.2 is unverified AI text from ATPs. The blueprint must come from the examination guidelines themselves, checked by hand (or by AI and then by hand) against the page.
7. **Current editions.** The ATP files look older than 2026, and Accounting cites "2020 exam guidelines". The 2026 ATP and the guideline edition in force for November 2026 are needed.
8. **The two defects in §2.3,** fixed so that generated papers can target a subject's own weighting.

## 4. Documents Shaun should provide

The documents are listed for the first three subjects. The same list applies later to any other subject. Supply them as the published PDFs, one folder per subject. The ATP parser already reads from `C:/Users/shaun/OneDrive/Desktop/Curriculum`, so for example use `…/Curriculum/NSC/Mathematics/`.

1. **CAPS FET (Grades 10–12) policy document** for the subject. It needs Section 3 (topics and content per grade) and Section 4 (assessment: programme of assessment, the final exam's papers, and the cognitive-level table).
2. **Grade 12 NSC Examination Guidelines** for the subject, in the edition in force for November 2026. These set paper structure, marks per topic, cognitive levels and what is examinable. For Physical Sciences, include the data sheets; for Mathematics, the Paper 2 information sheet.
3. **November NSC question papers with marking guidelines (memos) for 2023, 2024 and 2025**, Paper 1 and Paper 2 (Accounting: both papers and their answer books). The May/June supplementary papers are optional.
4. **DBE NSC Diagnostic Reports for 2023–2025,** the per-question "common errors and misconceptions" sections for these subjects. They serve two purposes: they seed Phase E's misconception list with real South African errors, and they help calibrate R.
5. **The 2026 Grade 12 ATP** for each subject, plus the Grade 10–11 ATPs if they changed. These refresh `scripts/output`, which appears to predate 2026.
6. **Optional:** provincial September trial papers with memos (2024–2025) from the provinces of the first teachers. They add calibration and question-bank material.

## 5. Which three Grade 12 subjects first

**Proposal: Mathematics, Physical Sciences, Accounting**, as the programme suggested. The reasons:

- **Least data work to a first blueprint.** Our Grade 12 data already carries the paper topic marks for Mathematics and Physical Sciences, and cognitive-level text for Accounting (§2.2). Guidelines turn those into verified data quickly.
- **Marked by memo, with method and step marks.** These three suit per-question AI marking, per-question evidence and misconception diagnosis best, because answers are worked, and the ways learners go wrong recur and are documented (DBE diagnostic reports).
- **High stakes and frequent tests.** Mathematics and Physical Sciences gate most science, engineering and health degrees, and Accounting gates commerce. Teachers of these subjects set many class tests and use past papers heavily, which gives E the evidence volume R needs.
- **Mathematics' cognitive scheme is already the one the code stores.** R can prove the readiness model on it before solving per-subject schemes for Physical Sciences and Accounting.

**Next:** Life Sciences (large enrolment; topic marks per paper already in our data, `caps-life-sciences-gr12.json:568`), then Mathematical Literacy (large enrolment; paper structure partly in our data). Languages come last. There is no Grade 10–12 language data at all, and their papers (comprehension, literature, essays) need a different evidence shape.

## 6. Added by the Phase R design (lane 2, 2026-09-25)

The [Phase R design](2026-09-25-readiness-path-design.md) (§2.6) needs a few more things, beyond the list in §4:

1. **The DBE 2026 NSC November examination timetable** gives the date and sitting (morning or afternoon) of each paper. The repo holds no exam dates. The date drives the countdown and the path's exam-proximity boost. Until it arrives, both stay off.
2. **The pages of the Mathematics Examination Guidelines (2026) that settle the draft blueprint.** Item 2 in §4 already covers this document; these are the parts it must answer:
   - **Marks per topic, with their ± tolerance.** Paper 2 has a conflict. The ATP transcription (`caps-mathematics-gr12.json:468`) gives **Trigonometry 50, Euclidean Geometry 40**. The CAPS table, as recalled rather than read from the repo, gives **Trigonometry 40 ± 3, Euclidean Geometry and Measurement 50 ± 3**.
   - **What Grade 10–11 content each paper examines.** In particular: which paper examines trigonometric graphs, measurement, and the factor and remainder theorems.
   - **The cognitive-level percentages.** The repo holds 20/35/30/15 only as a code fallback (`QuestionBank/service-paper-generation.ts:36-41`).
3. **Which exam body each first teacher's learners write, DBE or IEB.** This is not a document. R assumes DBE NSC for everyone. If any of the first schools write IEB, their IEB examination guidelines are needed too.
4. **Optional: the DBE NSC 2025 Examination Report,** for its national mark distribution per subject. It is a sanity check on band widths before the September trial results give Campusly's own calibration.

**Found while mapping (for Phase E, not a document).** E's `NON_CONTENT_TITLE` (`Evidence/tagging.ts:17`) drops content topics whose titles contain "(Revision)" from its tagging candidates. Examples: "Measurement (Revision)" (`CAPS-MATHEMATICS-GR11-T4-MEAS`) and "Quadratic patterns (revision)". R's validator matches whole titles only.
