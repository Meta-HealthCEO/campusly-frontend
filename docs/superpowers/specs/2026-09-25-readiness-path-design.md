# Readiness and the path — design (Phase R)

**Date:** 2026-09-25 · **Status:** accepted by the orchestrator; decisions recorded 2026-09-26 (§12). Fact-checked against backend `origin/master` `7a68289` (worktree `.worktrees/backend-learner`), the Phase E branch `feat/evidence-diagnosis` at `f4d5281` (read by commit, because that worktree was mid-rebase), frontend `origin/master` `32ceff5` (Blueprint), and the Phase L learner screens on `feat/learner-screens` `55cd962`. This is Phase R of the [readiness programme](2026-09-25-readiness-programme.md). It builds on [Phase E](2026-09-25-evidence-diagnosis-design.md) §7.2 and E plan Tasks 17–18, and on the [Phase R inputs](2026-09-25-phase-r-inputs.md). Every screen is in the [Blueprint](2026-09-25-blueprint-design-system-design.md) look, under the no-tints rule.

Paths: backend paths are relative to `campusly-backend/src/modules/` unless they start with `src/` or `scripts/`. Frontend paths are relative to `campusly-frontend/src/`.

## Intent

For every Grade 12 learner and every subject with an exam blueprint, R answers three questions:
- *How ready am I for each paper?* A predicted mark range, and the topic map behind it.
- *Where are the marks?* Marks to gain per topic.
- *What do I do this week?* At most three next actions, each with a plain reason.

For the teacher, R answers the class's version of the same questions: which topics the class is weak on, who is heading where, and which learners need the same thing. Everything comes from Phase E's evidence rows, with **pure arithmetic and no AI**. A teacher can always see why a number is what it is.

Success looks like this:
- The walkthrough in §11 passes at 375 px with no console errors and no failed API calls.
- Readiness for a learner with 2,000 rows computes in under 150 ms on the server (p95, measured).
- No learner sees a prediction built on a blueprint that has not been checked against the 2026 Examination Guidelines.

**Decided here (lane 2; the orchestrator confirms):**
- **The blueprint is data, written by hand, imported by script.** It is written as a JSON file in the backend repo from Shaun's documents. It is validated (topic marks sum to the paper total; levels sum to 100%), imported as a draft, checked value by value, and published by a super admin. PDFs are never AI-parsed at runtime.
- **Learners see R only on a published blueprint whose every value is marked verified.** Teachers may see a published but unverified blueprint, with a plain "not yet checked" line.
- **The readiness model is explainable arithmetic.** A marks-weighted topic mastery, with recency decay (half-life 8 weeks, floor 0.2) and source weights. A topic counts as *tested* only with at least 3 answers and 6 marks. The predicted mark is Σ topic marks × mastery, plus a capped cognitive-level adjustment. The band is ±1 standard error. **Untested topics are assumed to sit at the learner's own average and widen the band**; they never count as 0 or 100.
- **The path is ranked by marks to gain**, boosted for recent misconceptions from E and for high-weight topics near the exam. There are at most 3 items per subject per week, and an item completes when new evidence on its topic arrives from any source. R generates only **practice** items. Explainer (V) and mini-mock (M) items are reserved types that switch on when those phases land; learners never see placeholders.
- **Navigation.** Learners get a **Readiness** item as their second nav item, which makes it a phone tab. Teachers get **Readiness** under **Assess**. Both items are gated by a server flag, so nobody sees an empty page.

**Decided 2026-09-26:** §12 (subjects, evidence threshold, what learners see, teacher pins).

Out of scope:
- mock exams and their paper generation (M), including `AssessmentPaper.paperNumber`, past-paper provenance on `Question`, and the two paper-generator defects in inputs §2.3
- weekly plans, nudges, notifications and teacher briefings (P)
- explainers (V)
- subjects other than Mathematics until their documents arrive
- Grades 10–11 exams
- IEB papers
- SBA (school-based assessment) and final-mark projection
- parents
- the school admin portal

## 1. What R builds on (fact check)

- **Evidence rows.** `AnswerEvidence` (`Evidence/model.ts` at `f4d5281`) has one row per answered question. R uses these fields:
  - `topicNodeId`, `subtopicNodeId` and `topicFrom`
  - `cognitiveLevel` (the four Mathematics levels)
  - `marksAwarded` and `marksAvailable`
  - `source.type` and `source.attemptNumber`
  - `questionKey`, `markedAt`, `status` and `totalOverridden`
  - `diagnosis {state, typeId, confidence}`

  The index `{schoolId, studentId, subjectId, topicNodeId, markedAt}` serves R's per-learner read. Diagnosis states on the branch are `none | pending | queued | ready | skipped | skipped_budget | failed | dismissed` (E plan ruling P5).
- **Summary contract.** R also depends on the summary and access contract, which is not built yet at `f4d5281` (E plan Tasks 17–18):
  - `learnerAccess`, `classAccess`, `meAsLearner` and `STAFF_ROLES = ['teacher','school_admin','super_admin']`. Each returns 404 when access is refused.
  - `learnerTopics` and `learnerRows`.

  These summaries are raw sums with no weighting ("weighting, decay and confidence are R's decisions", E §7.2).
- **Taxonomy.** `MisconceptionType` has `label`, `learnerLabel`, `kind` and `learnerVisible`. `LEARNER_MIN_CONFIDENCE = 0.6` (E plan). The learner-facing rules of E §7.1 apply to anything R shows a learner.
- **Practice by topic.** E §4.2.2 adds an optional `curriculumNodeId` to practice. Today `generatePracticeSchema` is `.strict()` with a free-text `topic` (`AITutor/validation.ts:62-73`). A practice set counts 1 against the learner pool: action `practice_set`, cap 60 a month (`subscription/learner-ai.ts:20-22`).
- **The curriculum tree** (inputs §2.1):
  - Topics sit under terms, and nodes carry `termNumber` (`CurriculumStructure/model.ts:51, 97`).
  - Codes are unique, e.g. `CAPS-MATHEMATICS-GR12-T1-FUNC` (`:105`).
  - A school `Subject` or `Grade` points into the tree through `curriculumNodeId` (`Academic/model.ts:12, 139`). A `Subject` can serve several grades (`gradeIds`, `:136`), and is matched by name when it was created by hand (`Academic/services/materialise-from-curriculum.service.ts:128-135`).
  - A standalone teaching group's subject is a `Timetable` row whose `subjectId` may be a CurriculumNode id rather than a `Subject` (`Academic/services/grade.service.ts:55-60, 348-400`).
  - `Class` has no subject (`Academic/model.ts:56-67`).
- **Rosters.** `classRosterFilter` and `learnerClassIds` (`src/common/class-roster.ts:24, 32`).
- **No exam model exists.** Nothing models exam body (DBE or IEB), NSC paper numbers or official exam dates. `School` has no curriculum or exam-body field. The only paper structure in the repo is the ATP prose in `scripts/output/caps-mathematics-gr12.json:468` (inputs §2.2).
- **Blueprint UI already built** (frontend `origin/master`):
  - `lib/readiness/mastery.ts`: `masteryLevel` and `marksToGain`; thresholds secure ≥ 70, building 60–69, weak < 60.
  - `lib/readiness/exam-map.ts`: `layoutExamMap`, `topicsByGain`; untested tiles are dashed and neutral.
  - `lib/readiness/countdown.ts`: days counted on the Johannesburg calendar.
  - `lib/readiness/band.ts`: `bandGeometry` and `bandSentence`.
  - Components `ExamMap`, `Countdown`, `NextUp`, `MarksToGain`, `ReadinessBand` and `TrendChart` (`components/readiness/*`), on the `tile-*` and `mark-*` tokens.
- **Navigation.** The learner nav and allow-list are on `feat/learner-screens`:
  - `lib/nav/student-nav.ts`: seven items. `lib/standalone-student-paths.ts`: `STANDALONE_STUDENT_PAGES`.
  - Tests: `tests/student-nav.test.ts` (exactly seven items; every page exists) and `tests/phone-tabs.test.ts` (the first four items are tabs, the rest go under More).

  The teacher nav and allow-list are on master: `lib/nav/teacher-nav.ts` and `lib/standalone-teacher-paths.ts`, tested in `tests/teacher-nav.test.ts`. Nav items are gated by `module`/`permission` in `lib/nav-visibility.ts:11-22`.
- **Jobs.** BullMQ; every job is off when Redis is down (E §2.8). E's reconcile runs at 00:30 UTC (E plan P17).

## 2. The exam blueprint as data

### 2.1 The record (`Readiness/model-blueprint.ts`, global, no `schoolId`)

There is one document per subject × grade × exam year × version. The papers live inside it, because they are published together and share the subject's cognitive scheme. Each paper is addressed by its `key`.

| Field | Type | Notes |
|---|---|---|
| `family` | string | stable identity, e.g. `NSC-MATHEMATICS-GR12` |
| `examBody`, `qualification`, `session` | `'DBE'`, `'NSC'`, `'november'` | enums with one value each for now |
| `subjectKey` | string | the subject node code without its grade suffix (`CAPS-MATHEMATICS`) |
| `slug`, `subjectTitle` | string | `mathematics` (for URLs) and `Mathematics` |
| `grade` | number | 12 |
| `examYear` | number | 2026 |
| `version` | number | 1, 2, … within a year |
| `status` | `'draft' \| 'published' \| 'retired'` | at most one `published` per (family, examYear) |
| `sources[]` | `{ ref, title, edition, publisher }` | e.g. `EG26` = "Mathematics Examination Guidelines Grade 12, 2026"; values cite a `ref` and page |
| `cognitiveScheme` | `{ key, levels: [{ key, label, percent, fromStored: CapsLevel[], sourceRef, verified }] }` | Mathematics: four levels, identity mapping. `fromStored` lets Accounting's three bands map onto the stored four later (inputs §3.4). |
| `papers[]` | see below | |
| `publishedBy`, `publishedAt`, `supersedes` | | audit |
| `isDeleted`, timestamps | | |

Each paper is `{ key: 'P1', title, totalMarks, durationMinutes, examDate: 'YYYY-MM-DD' | null, sitting: 'morning' | 'afternoon' | null, sourceRef, verified, topics[] }`. Each topic is:

```ts
{ key: 'P1.FUNC', label: 'Functions and graphs', group: 'Functions and calculus', marks: 35, tolerance: number | null,
  sourceRef: 'EG26 p.?', verified: false,
  nodes: [{ code: 'CAPS-MATHEMATICS-GR12-T1-FUNC', nodeId }, { code: 'CAPS-MATHEMATICS-GR10-T2-FUNC', nodeId }, …] }
```

- `group` is **display only**. It sets the exam map's rows (`ExamTopic.section`). It is not an official paper section.
- `tolerance` (the guideline's ± marks) is stored for Phase M. R doesn't use it.
- **Verified** is derived: a blueprint is verified when every paper, topic and level has `verified: true` and an `examDate`. Only the super-admin page (§5.5) sets these flags.

### 2.2 Mapping exam topics to curriculum nodes

- Nodes are referenced by **code**, the stable identifier, and resolved to `nodeId` at import and publish. A node may be a `topic` or a `subtopic`.
- **An evidence row maps to an exam topic by its subtopic first (wherever the blueprint maps that subtopic), then its topic.** This handles topics whose subtopics split across papers. For example, Grade 10 "Functions and Graphs (including Trigonometric Functions)" goes to P1 Functions, but its subtopics `-FUNC-05` and `-FUNC-06` (trigonometric graphs) go to P2 Trigonometry, and a row tagged with one of them counts in Paper 2 only.
- A row whose nodes map to nothing in a paper doesn't count for that paper. Examples are revision or examination nodes and rows with no topic.
- One node maps to **at most one exam topic per paper**. A row can count in two papers only if its node is mapped in both, which the Mathematics draft never does.
- No `role` field is added to `CurriculumNode` (inputs §3.3 suggested one). Mapping already excludes non-content nodes, and the validator warns about them (§2.3). That is enough for R.

### 2.3 Validation (`Readiness/blueprint-validate.ts`, pure, shared by the script and the API)

**Errors (they block import and publish):**
- Per paper, Σ topic `marks` = `totalMarks` exactly.
- Σ level `percent` = 100.
- Every node code resolves to a live system node (`schoolId: null`, `isDeleted: false`) of type `topic`/`subtopic` whose code starts with `subjectKey`.
- No code appears twice within a paper, except as a subtopic that overrides its own parent's topic.
- Keys are unique, `family`, `examYear` and `grade` are consistent, and `examDate` falls within `examYear`.

**Warnings (shown in the report; publish needs an explicit acknowledgement):**
- **Unmapped content nodes:** every topic or subtopic of the subject family in Grades 10–12 that no paper maps.
- **Non-content titles.** A node is flagged when its **whole** title is revision, trial, examination or planning. R's rule is `/^(revision|trial examination|final (nsc|ncs) examination|planning\b.*)$/i`.

  E's broader `NON_CONTENT_TITLE` (`Evidence/tagging.ts:17`) would wrongly exclude content such as "Measurement (Revision)" (`CAPS-MATHEMATICS-GR11-T4-MEAS`) and "Quadratic patterns (revision)"; see §9.
- Any value still `verified: false`.

**The report** lists: per-paper sums; nodes per topic; unmapped nodes; unverified values; and a diff against the current published version.

### 2.4 Import, versions and who sees what

- **Files.** Blueprints are written in `scripts/blueprints/<family>-<year>.json`, where they are reviewed in git. JSON needs no new dependency; the backend has no YAML library.
- **The importer script.** `npm run blueprint:import -- --file=scripts/blueprints/nsc-mathematics-gr12-2026.json`:
  - Runs a dry run by default and prints the §2.3 report.
  - `--apply` upserts the file as the **draft** for (family, examYear), creating it or replacing an existing draft.
  - Importing the same file twice changes nothing.
- **The admin API.** It offers the same validate and import (§6.3), for fixes without a deploy.
- **Editing.** Numbers change only through the file (or its pasted JSON). The UI edits only `verified` flags, `sourceRef`s and exam dates (§5.5). A form editor for marks is YAGNI.
- **Publishing** refuses on errors or unacknowledged warnings. When it succeeds:
  1. It sets the draft to `published` with `version = previous + 1`.
  2. It sets the previous published version to `retired`.
  3. It enqueues a recompute of every `LearnerReadiness` of that family and year (§3.10).
- **A new exam year.** "Copy to 2027" clones the published blueprint into a 2027 draft with every `verified` flag reset and `examDate`s cleared.
- **Visibility:**

| Blueprint state | Learners | Teachers |
|---|---|---|
| draft | nothing | nothing |
| published, unverified | nothing (no nav item, no Today item) | everything, under the line "Draft blueprint: marks not yet checked against the 2026 Examination Guidelines" |
| published, verified | everything | everything |

### 2.5 Which blueprint applies (`Readiness/blueprint-resolve.ts`)

- **Grade.** Take `Student.gradeId` → `Grade`. Use `curriculumNodeId`'s code (`CAPS-GR12` → 12); failing that, use `/\b(\d{1,2})\b/` on `Grade.name`.
- **Subject family.** A school `Subject` belongs to a family by its `curriculumNodeId`'s code with `-GR\d+$` stripped (`CAPS-MATHEMATICS-GR12` → `CAPS-MATHEMATICS`). Failing that, it belongs by an **exact**, case-insensitive name match to `subjectTitle`. So "Mathematical Literacy" never matches "Mathematics".
  - R reads evidence across **all** of the school's Subjects in the family (`subjectId: {$in: …}`), because a school may keep separate Subject rows per grade.
- **A teacher's class.** Take the class's `Timetable` rows for this teacher. If a row's `subjectId` is a CurriculumNode, it is mapped to the school Subject through `Subject.curriculumNodeId`, as E's `schoolSubjectForNode` does.
- **Exam year.** A Grade 12 learner in SAST calendar year Y writes the `examYear = Y` blueprint. There is no fallback to other years.
- **Exam body.** Every learner is assumed to write the DBE NSC; §9 covers IEB.

### 2.6 The draft: NSC Mathematics Grade 12, 2026

**It can be built only from what the repo holds.** Nothing in it has been checked against an Examination Guidelines document; none is in the repo. Every value ships with `verified: false`.

**Paper 1** (ATP text: 150 marks, 3 hours, `caps-mathematics-gr12.json:468`)

| Key | Exam topic | Marks | Display group | Nodes (topic level unless marked) |
|---|---|---|---|---|
| `P1.ALG` | Algebra, equations and inequalities | 25 | Algebra and patterns | `GR10-T1-ALG`, `GR10-T1-EXP`, `GR11-T1-EXP`, `GR11-T1-EQN` |
| `P1.PATT` | Number patterns, sequences and series | 25 | Algebra and patterns | `GR10-T4-PATT`, `GR11-T4-PATT`, `GR12-T1-SEQ` |
| `P1.FUNC` | Functions and graphs | 35 | Functions and calculus | `GR10-T2-FUNC`, `GR11-T2-FUNC`, `GR12-T1-FUNC` (their trig-graph subtopics go to P2, below) |
| `P1.CALC` | Differential calculus | 35 | Functions and calculus | `GR12-T2-CALC` (includes `-CALC-01` factor and remainder theorems; check against the guidelines) |
| `P1.FIN` | Finance, growth and decay | 15 | Finance and probability | `GR10-T3-FIN`, `GR11-T3-FIN`, `GR12-T3-FIN` |
| `P1.PROB` | Counting and probability | 15 | Finance and probability | `GR10-T3-PROB`, `GR11-T3-PROB`, `GR12-T3-PROB` |

**Paper 2** (ATP text: 150 marks, 3 hours)

| Key | Exam topic | Marks | Display group | Nodes |
|---|---|---|---|---|
| `P2.ANAG` | Analytical geometry | 40 | Geometry | `GR10-T2-ANAG`, `GR11-T2-ANAG`, `GR12-T2-ANAG` |
| `P2.GEOM` | Euclidean geometry and measurement | **40 (conflict)** | Geometry | `GR10-T2-GEOM`, `GR11-T2-GEOM`, `GR12-T2-GEOM`, `GR10-T4-MEAS`, `GR11-T4-MEAS` |
| `P2.TRIG` | Trigonometry | **50 (conflict)** | Trigonometry and statistics | `GR10-T1-TRIG`, `GR10-T3-TRIG2D`, `GR11-T1-TRIG`, `GR11-T3-TRIG`, `GR12-T1-TRIG`; subtopics `GR10-T2-FUNC-05`, `-06`, `GR11-T2-FUNC-03`…`-06` |
| `P2.STAT` | Statistics | 20 | Trigonometry and statistics | `GR10-T3-STAT`, `GR11-T3-STAT`, `GR12-T3-STAT` |

(Codes are shortened; each starts `CAPS-MATHEMATICS-`.) **Cognitive levels:** knowledge 20, routine procedures 35, complex procedures 30, problem solving 15. Source: the paper generator's fallback, `QuestionBank/service-paper-generation.ts:36-41`, which is a code constant with no document behind it.

**What is checked, and what is not:**
- **Checked (arithmetic and data):**
  - P1 sums to 150 (25+25+35+35+15+15).
  - P2 sums to 150 (40+40+50+20).
  - The levels sum to 100.
  - Every listed code exists in `scripts/output/caps-mathematics-gr1{0,1,2}.json`.
  - Every Grade 10–12 content topic of the family is mapped exactly once. Grade 12 Term 4 holds only the exam term, with no content topics.
- **Unverified; every value needs `EG26`:**
  - paper totals and durations, from ATP prose that an AI transcribed
  - every topic's marks
  - the cognitive percentages
  - tolerances, which the repo doesn't have
  - every node assignment, which was designed here from node titles
- **Known conflict.** The ATP transcription gives **Trigonometry 50 and Euclidean Geometry 40**. The CAPS assessment table, as lane 2 recalls it (not a repo source), gives **Trigonometry 40 ± 3 and Euclidean Geometry and Measurement 50 ± 3**. The draft carries the repo's figures with a `note` on both topics. The guidelines decide.
- **Missing:** both papers' 2026 exam dates, which need the DBE timetable (inputs §6). Until they arrive, the countdown is hidden and the path has no exam-proximity boost.

The frontend's `lib/readiness/example-data.ts` numbers are the gallery's illustration and not a source.

## 3. The readiness model (`Readiness/engine/*`, pure)

### 3.1 Inputs

R runs one read per learner per subject family:

`AnswerEvidence.find({ schoolId, studentId, subjectId: {$in: familySubjectIds}, status: 'final', isDeleted: false })`

It keeps only the fields listed in §1. R reads rows rather than E's `learnerTopics` sums, because decay, retry handling and source weights need each row. The same filter as E's summary contract applies: final rows only, and never provisional.

**Retries.** For each `questionKey`, only the **latest** answer counts. Quick checks and library blocks allow retries (E ruling "Quick checks … count every attempt"), and without this rule a learner could inflate a topic by re-answering the same five questions. Practice keys never repeat.

### 3.2 The weight of one answer

`w = recency × source × tag × override`

- **Recency:** `max(0.2, 0.5^(ageDays / 56))`. An answer loses half its weight every 8 weeks, down to a floor of a fifth. Recent work counts most, and older work never disappears.
  - In a weighted average, equal decay cancels out. So decay changes two things: how old and new answers balance, and the **effective answers** (Σ w). That count sets the band's width.
  - A topic mastered in February and not seen since keeps its score, with a wider range.
- **Source:**

  | Source | Weight | Why |
  |---|---|---|
  | test | 1.0 | written under test conditions, closest to the exam |
  | homework | 0.7 | help and notes are available |
  | unit check | 0.6 | short and auto-marked |
  | practice | 0.6 | chosen by the learner |
  | library | 0.5 | all-or-nothing blocks |

- **Tag:** × 0.8 when `topicFrom` is `ai_tag`, because the topic may be wrong (E §3).
- **Override:** × 0.5 when `totalOverridden` is set, because the teacher changed the total and not these questions (E §4.4).

All of these numbers live in `Readiness/constants.ts`.

### 3.3 Topic mastery and status

For exam topic *t*:
- `answers_t` = the raw count of answers, after retries are removed.
- `mastery_t` = Σ w·awarded ÷ Σ w·available, the weighted share of marks earned.
- `effective_t` = Σ w.

The **status** is set by raw counts, so it is easy to state:
- `tested` when there are ≥ 3 answers **and** ≥ 6 marks available
- `thin` when there is at least 1 answer, but fewer than that
- `untested` when there are none

**What the exam map shows.** Only tested topics show a percentage and a mastery colour (`masteryLevel`). A thin topic shows as the dashed neutral tile, captioned "2 answers so far". It never shows a 100% from one lucky answer.

### 3.4 The predicted mark and band

For one paper with total *T* and topic marks *W_t*:

- **The learner's average:** μ = Σ w·awarded ÷ Σ w·available over every **tested** topic of the subject, across both papers.
- **Base prediction:** P₀ = Σ_tested W_t · mastery_t + Σ_untested-or-thin W_t · μ.
- **Level adjustment.** Add C (§3.5), in marks. Then P = clamp(P₀ + C, 0, T).
- **Spread:**
  - a tested topic: σ_t = W_t · √( m\*(1−m\*) / effective_t + τ² ), where m\* = clamp(mastery_t, 0.1, 0.9) and τ = 0.05 (exam-day variation)
  - a thin or untested topic: σ_t = W_t · 0.25
  - a cognitive level with fewer than 3 effective answers: x_L · T · 0.15

  These combine as σ = √(Σ σ²).
- **Band:** [P − σ, P + σ] as a percentage of T, clamped to 0–100, each end rounded to a whole percent. It is the "likely range": about two times in three the mark should fall inside it (calibrated in §11).

**Untested topics** take the learner's **own** average, never 0 and never 100. Their spread of ±25 points on the topic's marks is what widens the band. The explanation says so, with the numbers (§3.9).

### 3.5 The cognitive-level adjustment

Class tests are often lighter on complex questions than the exam. The adjustment moves the prediction toward the paper's level mix.

- **Subject level mastery.** For each level L, over known-level rows of the subject: m_L = Σ w·awarded ÷ Σ w·available, and n_L = Σ w. The mean over those rows is m̄.
- **Level effect,** shrunk when level evidence is thin: b_L = n_L ÷ (n_L + 6) · (m_L − m̄).
- **Mixes.** e_L is the paper's evidence mix: the weighted marks available at level L over known-level rows mapped to the paper. x_L is the blueprint's percentage.
- **Adjustment** in points: Σ_L (x_L − e_L) · b_L, clamped to ±10 points, then × T for marks.
- It is **not applied** when the paper has fewer than 10 known-level answers. The explanation then says "not enough level data".
- Mastery on the exam map stays unadjusted: it is *what you have shown*. The band is *what we expect in the exam*.

### 3.6 Minimum evidence before any prediction (decided; §12 decision 2)

A paper shows a band only when both conditions hold:
- **at least 20 answers** map to the paper
- **tested topics cover at least 50% of its marks**

Otherwise the paper's state is `not_enough_evidence`, and the page shows progress towards the gate, e.g. "11 of 20 answers · 35 of 75 marks tested". The exam map, marks to gain and the path still work below the gate. The thresholds are constants.

### 3.7 Both papers, and the target

- **Both papers** (P1 + P2, out of 300): P = P₁ + P₂, σ = √(σ₁² + σ₂²). It shows only when both papers pass the gate.
- **Target.** The learner may set a target per subject from the NSC level boundaries: 30, 40, 50, 60, 70 or 80%. Until they do, the default is **the lowest boundary above the band's top**, capped at 80, and labelled "Next level" rather than "your target".
  - This extends `bandSentence` (`lib/readiness/band.ts`) with `targetKind: 'mine' | 'next_level'`.
  - Example sentence: "Heading for 50–65%. Next level 70%: 5 points to go."

### 3.8 Worked example (the engine's golden test)

The learner is on Paper 1 (T = 150), 60 days before the exam.

| Topic | W | Answers | Effective | Mastery | Status | W·m | σ_t |
|---|---|---|---|---|---|---|---|
| Functions | 35 | 14 | 10 | 49% | tested | 17.15 | 5.80 |
| Calculus | 35 | 11 | 8 | 52% | tested | 18.20 | 6.43 |
| Algebra | 25 | 16 | 12 | 78% | tested | 19.50 | 3.24 |
| Patterns | 25 | 7 | 5 | 71% | tested | 17.75 | 5.22 |
| Finance | 15 | 2 | — | — | thin | 15 × μ = 9.45 | 3.75 |
| Probability | 15 | 0 | — | — | untested | 9.45 | 3.75 |

- **Average:** μ = 63%, so P₀ = 91.5 marks (61.0%).
- **Levels.** Exam mix K/R/C/PS = 20/35/30/15; evidence mix = 30/45/20/5.
  - Level mastery = 80/68/46/35, with effective answers 15/20/10/3 and m̄ = 63%.
  - Level effects b = +12.1, +3.8, −10.6, −9.3 points.
  - Adjustment = (−.10)(12.1) + (−.10)(3.8) + (.10)(−10.6) + (.10)(−9.3) = **−3.6 points = −5.4 marks**.
- **Prediction:** P = 86.1 marks (57.4%). σ = √140.9 = 11.9 marks (7.9 points).
- **Band 49–65%**: (86.108 − 11.869) ÷ 150 = 49.49% rounds to 49, and (86.108 + 11.869) ÷ 150 = 65.32% rounds to 65. The default target is 70%; the learner sees "49–65% · level 3–5".
- **The gate passes:** 50 answers, with 120 of 150 marks tested.

### 3.9 Why this range: the explanation lines

The server builds the lines from templates, with no AI, and returns them with each paper. For the example above:
1. "Tested: 4 of 6 topics, 120 of 150 marks. Your weighted average there is 63%."
2. "Not yet tested: Probability (15 marks). Too few answers: Finance (15 marks, 2 answers). We assume your average for these, which widens the range by ±5 marks."
3. "Question levels: the exam has 45% complex and problem-solving questions; your work so far had 25%, and you score lower on them. This lowers the prediction by 5 marks."
4. "Evidence: 50 answers, 31 in the last 8 weeks. Tests count fully; homework and practice count a little less."

**Teachers** also get per-topic numbers (answers, effective answers, weighted mastery, last answered, by source) and an **answers behind this topic** list (§6.2). That list shows each row with its weight. This is how a teacher sees why.

### 3.10 Storage, recompute and the trend

**Collections** (`Readiness/model-readiness.ts`, `model-path.ts`). Each has `schoolId` and `isDeleted` and is added to the school cascade's model list (`cascadeSoftDeleteSchool`, `src/common/utils.ts:55`).

| Collection | Key (unique) | Holds |
|---|---|---|
| `LearnerReadiness` | `{schoolId, studentId, subjectKey}` | blueprint id and version, `familySubjectIds`, `computedAt`, `computedDay` (SAST), `staleSince`, the computed view (papers, topics, levels, band, explanation; explicit sub-schemas), the learner's `target`, `historyBackfilledAt`, `lastViewedAt` |
| `ReadinessSnapshot` | `{schoolId, studentId, subjectKey, day}` | per paper and both papers: state, low, high, mid, tested share, answers; `backfilled` |
| `PathItem` | index `{schoolId, studentId, subjectKey, weekStart}` | §4 |

**Triggers:**
- **New evidence.** E's `write-rows.ts` gets one line after a write that changed **final** rows: `emitEvidenceChanged({schoolId, studentId, subjectId})` (new `src/common/evidence-events.ts`, a tiny in-process emitter). R subscribes at boot. It resolves the family, and if a published blueprint applies it upserts `LearnerReadiness` with `staleSince = now`. It then enqueues `readiness-recompute` with `jobId = rr_<school>_<student>_<subjectKey>` and a 120 s delay. A second add while that job is waiting is a no-op; that is the debounce. The daily reconcile and backfill go through the same writer, so they fire it too.
- **Read.** When `staleSince` is set or `computedDay` is not today (SAST), the read recomputes synchronously. Correctness therefore never depends on Redis.
- **Nightly** at 01:00 UTC (03:00 SAST), after E's reconcile, the job recomputes readiness that had evidence in the last 180 days or was viewed in the last 30. On Mondays it also generates the week's path (§4.3).
- **Blueprint published:** a batch recompute of every readiness in the family and year, with concurrency 5.

**Snapshots.** At most one per learner, subject and day, written by the day's compute. A day whose rounded band and state equal the previous snapshot is skipped, except on Mondays, which are the trend's weekly anchor. The trend chart plots the band midpoint per SAST week for the last 12 weeks, one point per week.

**History on day one.** On the first compute, and after a new blueprint version, the engine recomputes **as of** each of the last 12 Mondays. It uses only rows with `markedAt ≤` that date, and the snapshots are written with `backfilled: true`. The chart's caption says "Earlier weeks: what we'd have predicted from the work marked by then." The input is the same single read, so it costs 12 in-memory computes.

## 4. The path

### 4.1 Ranking (`Readiness/engine/path-rank.ts`, pure)

**Candidates:**
- Every **tested** topic below secure (mastery < 70%).
- Every **thin or untested** topic whose content is *due*. A topic is due once every one of its Grade 12 nodes has `termNumber` below the current term (by month: Term 1 from January, 2 from April, 3 from July, 4 from October), or when it has no Grade 12 nodes. So nobody is told to practise calculus in February. In the last 12 weeks before the paper, every topic is due.

**Score** = gain × misconception boost × proximity boost:
- **gain:** W_t × (1 − mastery_t) for tested topics (the existing `marksToGain`). For thin or untested topics, W_t × (1 − μ).
- **Misconception boost:**
  - × 1.5 when a topic misconception type (`kind` misconception or procedural) appears on 2 or more of the topic's rows in the last 21 days
  - × 1.25 when it appears on 1 row

  A row counts only when it is `diagnosis.state: 'ready'`, has confidence ≥ 0.6 and is learner-visible. Generic types (arithmetic slip, no working) don't boost.
- **Proximity boost:** 1 + 0.5 × clamp((56 − daysToPaper) ÷ 56, 0, 1) × (W_t ÷ largest W in the paper). In the final 8 weeks the biggest topics rise, up to × 1.5 on exam day. There is no boost while the exam date is unknown.

**Tie-break:** the higher W first, then the older last-answered.

### 4.2 Actions

| Type | When | What it opens | Status in R |
|---|---|---|---|
| `practice` | tested topic | the AI tutor practice set, 5 questions, on the topic's weakest subtopic (lowest weighted mastery with ≥ 2 answers), or on the misconception's topic node **aimed at the misconception**; the prompt gets its label and description | **built** |
| `check_in` | thin or untested topic | the same practice, 5 questions across the topic's Grade 12 node (or its highest-grade node) | **built** |
| `explainer` | a boosted misconception that has a V explainer | the explainer, then practice | reserved; generated once V ships (flag `READINESS_EXPLAINERS`) |
| `mini_mock` | 6 weeks before a paper, with ≥ 2 weak topics of ≥ 25 marks | an M mini-mock on the two weakest high-weight topics | reserved; generated once M ships (flag `READINESS_MINI_MOCKS`) |

**Launch.** `href` is `/student/ai-tutor/practice?item=<pathItemId>`. The practice page reads the item and calls generate with `curriculumNodeId`, `focusMisconceptionTypeId` and `pathItemId`.
- `generatePracticeSchema` gains the two new optional fields. E adds `curriculumNodeId`.
- `PracticeAttempt` gains `pathItemId`, so starts and completions can be measured.
- The server checks that the item belongs to the learner.
- A set counts 1 `practice_set` against the learner pool, as practice already does (L §5). §7 covers cost.

### 4.3 Weekly cadence, completion and refresh

- **The week** is the SAST Monday to Sunday. The Monday nightly run (or the first read that week) creates **up to 3 items per subject**:
  1. items the teacher pinned (§4.5)
  2. open items carried over from last week, when their topic is still in the top 3
  3. the top-ranked remaining topics

  An item left open at the week's end is either `carried` (same id, new `weekStart`) or `expired`.
- **Done.** An item is `done` when at least 4 new final answers mapped to its exam topic arrive after the item was created, **from any source**. A teacher's test counts, and so does the practice. It is also done when the topic reaches secure (`doneReason: 'secured'`).
  - Explainers are done when watched (V); mini-mocks when marked (M).
  - Completion is checked in the recompute that the new evidence triggers.
- **No refill mid-week.** A learner who finishes all three sees "Done for this week", followed by the marks-to-gain list. Every row of that list can start its own practice, outside the path.
- **Empty path.** A learner with nothing to rank (everything secure, or nothing due) sees "Nothing urgent this week", with the list.

### 4.4 The "why" line (templates, no AI)

- **Tested with a misconception:** "Functions and graphs is 35 marks in Paper 1. You're at 49%, so up to 18 marks to gain. 'Didn't restrict the domain' came up twice in the last 3 weeks."
- **Tested:** "Differential calculus is 35 marks in Paper 1. You're at 52%: up to 17 marks to gain."
- **Check-in:** "Probability is 15 marks in Paper 1. Your class has covered it, but you haven't been tested on it yet. A short check shows where you stand."
- **Pinned:** "Your teacher picked this for you." followed by one of the lines above.

### 4.5 Teacher pins (decided; §12 decision 4)

- A teacher with learner access can **pin** an exam topic, optionally with a misconception, for one learner, or for up to 60 learners at once from a "who needs what" group.
- A pin becomes this week's item 1 and counts in the 3; the lowest open system item is `replaced`.
- A teacher can also **remove** an item.
- Teachers never edit mastery or bands.

## 5. Screens

**Rules** (as E §8):
- Colour appears only in solid marks, through tokens: `bg-tile-*` on exam-map tiles, `bg-mark-*` on bars and dots, `masteryLevel()` for every level. Surfaces are neutral: white cards on the off-white ground. No tints, pastel chips or `bg-x/10` washes.
- Hanken Grotesk tabular for figures.
- Touch targets ≥ 44 px on phones.
- Every data view has designed loading, empty and error states.
- New files ≤ 300 lines.
- Data access lives in hooks; types in `types/readiness.ts`; view mapping in pure helpers under `lib/readiness/` (frontend vitest runs in node, E plan P19).
- The new component folders join the palette and tint scanners (`tests/no-tints.test.ts`, `tests/palette-scan.test.ts`, `tests/support/design-scope.ts`).

### 5.1 Learner: "Exam readiness" (`/student/readiness/[subject]`, e.g. `/student/readiness/mathematics`)

`/student/readiness` goes straight to the subject when there is one. When there are several, it lists them: subject, next paper countdown line, band line and Open.

**Page, top to bottom at 375 px.** From 1024 px it becomes two columns: Countdown, band and map on the left; NextUp, this week and marks to gain on the right; the trend spans both.
- **`PageHeader`:** eyebrow "Mathematics · Grade 12", title "Exam readiness", context "From 50 answers · updated today 10:42".
- **Paper tabs** (underline tabs): Paper 1 · Paper 2 · Both. It opens on the paper with the nearest date.
- **`Countdown`** for the selected paper; hidden while `examDate` is null.
- **`NextUp`:** this subject's top open path item. Eyebrow "This week · Practice · 5 questions", title "Functions and graphs: restrict the domain of an inverse", the why line as detail, and "Start practice". It is the screen's one primary button.
- **`ReadinessBand`,** or `NotEnoughEvidence` below the gate. That shows two thin progress bars (neutral track, `bg-primary` fill): "Answers 11 of 20" and "Marks tested 35 of 75".
  - Under the band, a "Why this range" disclosure lists the §3.9 lines.
  - Then the caption "This predicts your exam mark, not your final mark, which also counts school-based assessment."
- **`ExamMap`** for the paper. On Both, P1 and P2 stack as two maps.
  - The map needs one change: `TileLevel` gains `'thin'`, drawn like `untested` with the caption "*n* answers so far" (`lib/readiness/exam-map.ts`).
- **"This week":** `PathList` shows up to 3 rows with state (to do, started, "Done Tue", expired). Rows 2 and 3 get a ghost Start button; row 1 is the NextUp.
- **`MarksToGain`.** Each row opens a sheet with that topic's mastery, answers, last answered, misconceptions (learner labels, counts), and a secondary "Practise this topic" button.
- **`TrendChart`:** "Predicted mark, last 12 weeks", with a dashed target line.

**States:**
- *Loading:* skeleton in the final layout.
- *Error:* `ErrorState` with Retry.
- *No evidence:* countdown, an all-untested map, and "Your readiness starts with your first marked test in Mathematics."

### 5.2 Learner: Today

- **The NextUp priority becomes:**
  1. homework or a test that is **overdue or due today or tomorrow**, because teacher-set work comes first
  2. **the top open path item** across subjects, the highest score first
  3. today's order: lesson under way, then homework, then test (`lib/standalone-today.ts:todayNextUp`)
- Under the due-work list, one quiet line reads "Exam readiness · Mathematics: heading for 50–65%", linking to the page.
- Today gains a single request, `GET /readiness/me` (§6.1).
- The school learner dashboard gets the same `NextUp` when an item exists.

### 5.3 Teacher: class readiness (`/teacher/readiness`, then `/teacher/readiness/[classId]?subject=mathematics&paper=P1`)

`/teacher/readiness` goes straight through when the teacher has one class and subject pair. Otherwise it shows class cards: class, subject, learners, learners with a prediction, and median band.

**The class page:**
- **`PageHeader`:** eyebrow "Grade 12 Maths A · Mathematics", title "Class readiness", context "28 learners · 22 with a prediction · updated 10:42".
- Then paper tabs and the Countdown. An unverified blueprint shows the plain draft line from §2.4, with an icon and no banner.
- **Class exam map:** `ExamMap`, whose tile mastery is the **class average** of tested learners. Its accessible name says "class average".
- **Topic breakdown** (`LevelCountsBar`, new) has one row per topic:
  - the name and the marks
  - a solid stacked bar of learner counts: `bg-mark-secure`, `-building`, `-weak`, then `bg-muted` for untested or thin
  - the text "9 weak · 12 building · 5 secure · 2 not yet tested"
- **Who needs what** (`NeedGroups`, new) shows up to 5 disclosure rows, ranked by learners × marks at stake:
  - *topic groups:* "Functions and graphs: 9 learners weak, up to 17 marks each"
  - *misconception groups:* "Domain not restricted on inverse (Functions): 6 learners". A group needs at least 2 learners with the same type in the last 6 weeks, using the teacher labels.

  Opening a row lists the learners, each linking to their page, and "Set as next practice for these learners" (§4.5).
- **Learners:** a `DataTable` sorted by predicted midpoint, lowest first. Columns are Learner, Predicted (a mini band bar and "50–65%"), Change over 4 weeks, Answers and Weakest topic.
  - Rows below the gate come last, marked "Not enough evidence · 11 answers".
  - It pages at 50. A row opens the learner.

**States:** loading skeleton; *empty* "Readiness appears once this class's tests are marked"; error with Retry.

### 5.4 Teacher: one learner (`/teacher/readiness/[classId]/learners/[studentId]?subject=`)

- The same composition as §5.1, with teacher labels.
- "Why this range" starts open.
- Each topic sheet adds effective answers, the split by source, and the answers behind the topic (§6.2), each with its weight and linking to the marked script.
- Path rows get Remove, and there is a "Pin a topic" dialog: an exam-topic select plus an optional misconception select. It uses the flex-col, sticky-footer dialog pattern.
- `/teacher/students/[id]` gets a link to this page: "Exam readiness →".

### 5.5 Super admin: blueprints (`/superadmin/blueprints`, `/superadmin/blueprints/[id]`)

- **The list** is a `DataTable` with columns: subject, grade, exam year, version, status, verified (e.g. "14 of 17 values"), updated. It adds an "Import JSON" dialog (a textarea, then Validate, then Save draft).
- **The detail page** shows:
  - the validation report (errors in `text-destructive`, and warnings)
  - the coverage list of unmapped nodes
  - per paper, the topics with marks, nodes and a **Verified** switch plus a source-reference input per value; the levels are listed the same way
  - exam date and sitting inputs per paper
  - Publish (disabled while there are errors or unacknowledged warnings) and "Copy to 2027"
- It is added to `SUPERADMIN_NAV` (`lib/constants.ts:213`) beside E's Misconceptions page.

### 5.6 Navigation (decided)

**Learner.** `{ label: 'Readiness', href: '/student/readiness', icon: Target, feature: 'readiness' }`:
- It becomes the **second item** of `STANDALONE_STUDENT_NAV` and of the school `STUDENT_NAV`.
- On a phone that makes it a tab: Today, Readiness, Lessons, Homework; More holds Tests, Marks, AI tutor and Profile.
- **Why second.** For a Grade 12 learner it is the product's point, and it holds the path. Tests still reach the learner through notifications and Today's NextUp, so moving Tests to More costs one tap, and only for learners who have readiness.

**Teacher.** `{ section: 'Assess', label: 'Readiness', href: '/teacher/readiness', icon: Gauge, feature: 'readiness' }`:
- It sits after Gradebook in both `TEACHER_NAV` and `STANDALONE_TEACHER_NAV`.
- **Why Assess and not Class.** Readiness is where assessment evidence ends up: set, mark, record, then see readiness. Class holds the roster and admin work.
- The standalone phone tabs stay as they are (Today, Teach, Assess, Class, More).

**Gating without permission keys.** `NavItem` gains `feature?: 'readiness'` and `NavAccess` gains `hasFeature()` (`lib/nav-visibility.ts`).
- `GET /auth/me` returns `user.readiness: boolean`:
  - *learner:* a `LearnerReadiness` exists on a published, verified blueprint
  - *teacher:* they have a class in a grade with a published blueprint
- Neither `permissions.ts` changes. The access rules are E's (plan P6).

**Allow-lists** add `'/student/readiness'` to `STANDALONE_STUDENT_PAGES` and `'/teacher/readiness'` to `STANDALONE_TEACHER_PREFIXES`.

**Gate tests updated:**
- `tests/student-nav.test.ts`: the items with and without the feature; every page exists; `/student/readiness/mathematics` is allowed.
- `tests/phone-tabs.test.ts`: every link is still reachable.
- `tests/teacher-nav.test.ts`: `sectionOf('Readiness') === 'Assess'`; sections stay in order.
- The portal-guard, nav-visibility (the feature gate) and internal-links tests.

**Lands after L-C** merges the learner nav.

## 6. APIs

Mounted at `app.use('/api/readiness', authenticate, readinessRoutes)`. Every query carries `schoolId`, and aggregations cast it to an ObjectId. There are no capability keys.
- **Learner routes:** `authorize('student')` + E's `meAsLearner`.
- **Teacher routes:** `authorize(...STAFF_ROLES)` + E's `classAccess` or `learnerAccess` (404 when refused).
- **Blueprint routes:** `authorize('super_admin')`.

### 6.1 Learner

| Endpoint | Returns |
|---|---|
| `GET /readiness/me` | `{ subjects: ReadinessSubjectCard[], next: PathItemView \| null }`; the list, and Today's one item |
| `GET /readiness/me/subjects/:slug` | `ReadinessView` (learner view) |
| `GET /readiness/me/subjects/:slug/trend?weeks=12` | `{ points: TrendPoint[] }` (weeks 1–26) |
| `PUT /readiness/me/subjects/:slug/target` | body `{ percent: 30\|40\|50\|60\|70\|80\|null }` → 204 |
| `POST /readiness/me/path/:itemId/start` | `{ href }`; sets `started` |

**The learner view:**
- only published, verified blueprints; 404 otherwise
- misconceptions under `learnerLabel`, only learner-visible types with confidence ≥ 0.6 that are not dismissed
- no effective answers, weights or teacher labels

### 6.2 Teacher

| Endpoint | Returns |
|---|---|
| `GET /readiness/classes` | the teacher's (class, subject) pairs that have a blueprint: `{ classId, className, slug, subjectTitle, learners, predicted, medianMid }[]` |
| `GET /readiness/classes/:classId?subject=&paper=` | `ClassReadinessView` |
| `GET /readiness/classes/:classId/learners?subject=&paper=&sort=band\|name\|change&page=1&limit=50` | `{ rows: ClassLearnerRow[], total, page, limit }` (limit ≤ 100) |
| `GET /readiness/learners/:studentId?subject=` | `ReadinessView` (teacher view) |
| `GET /readiness/learners/:studentId/trend?subject=&weeks=` | as for the learner |
| `GET /readiness/learners/:studentId/topics/:topicKey/answers?subject=&cursor=&limit=50` | `{ rows: WeightedAnswer[], nextCursor }`; the answers behind a topic, each with its weight parts and a link to the source |
| `POST /readiness/learners/:studentId/path` | body `{ subject, topicKey, misconceptionTypeId? }` → the pinned `PathItemView` |
| `DELETE /readiness/learners/:studentId/path/:itemId` | 204 (state `removed`; never a hard delete) |
| `POST /readiness/classes/:classId/path` | body `{ subject, topicKey, misconceptionTypeId?, studentIds (1–60, each on the roster) }` → `{ pinned }` |

The class roster is `classRosterFilter(classId)`, which includes second-group learners.

### 6.3 Super admin

| Endpoint | Notes |
|---|---|
| `GET /readiness/blueprints?status=&family=&examYear=&page=&limit=` | list |
| `GET /readiness/blueprints/:id` | with the validation and coverage report |
| `POST /readiness/blueprints/validate` | body: blueprint JSON → the report; writes nothing |
| `POST /readiness/blueprints/import` | body: blueprint JSON → upserts the draft; refuses on errors |
| `PATCH /readiness/blueprints/:id` | **drafts and unverified published only**: `verified`, `sourceRef`, `examDate`, `sitting` per value. A published blueprint's marks never change in place. |
| `POST /readiness/blueprints/:id/publish` | body `{ acknowledgeWarnings: true }` → version + 1, previous retired, recompute enqueued |
| `POST /readiness/blueprints/:id/copy` | body `{ examYear }` → a new draft |

Nothing is deleted; a blueprint is retired instead.

### 6.4 Shapes (`types/readiness.ts` mirrors them)

```ts
type TopicStatus = 'tested' | 'thin' | 'untested';
interface TopicReadiness {
  key: string; label: string; group: string; marks: number; status: TopicStatus;
  mastery: number | null;              // 0–100, only when tested
  answers: number; lastAnsweredAt: string | null; marksToGain: number | null; due: boolean;
  subtopics: Array<{ nodeId: string; title: string; mastery: number | null; answers: number }>;
  misconceptions: Array<{ typeId: string; label: string; count: number; lastSeenAt: string }>;
  effectiveAnswers?: number; bySource?: Record<SourceType, { answers: number; mastery: number | null }>; // teacher only
}
interface PaperReadiness {
  key: string; title: string; totalMarks: number; durationMinutes: number; examDate: string | null;
  state: 'predicted' | 'not_enough_evidence';
  band: { low: number; high: number; mid: number; lowMarks: number; highMarks: number } | null;
  gate: { answers: number; answersNeeded: number; testedMarks: number; testedMarksNeeded: number };
  levels: Array<{ key: string; label: string; examPercent: number; evidencePercent: number; mastery: number | null }>;
  adjustmentMarks: number | null;      // null when not applied
  explanation: string[];
  topics: TopicReadiness[];
}
interface ReadinessView {
  subject: { slug: string; title: string; grade: number };
  blueprint: { id: string; examYear: number; version: number; verified: boolean };
  computedAt: string; answers: number; unmappedAnswers: number;
  target: { percent: number; kind: 'mine' | 'next_level' };
  papers: PaperReadiness[]; both: { state: PaperReadiness['state']; band: PaperReadiness['band'] } | null;
  path: PathItemView[];                // this week
}
interface PathItemView {
  id: string; rank: number; weekStart: string; paperKey: string; topicKey: string; topicLabel: string;
  action: 'practice' | 'check_in' | 'explainer' | 'mini_mock';
  misconception: { typeId: string; label: string } | null;
  marksToGain: number | null; why: string;
  state: 'open' | 'started' | 'done' | 'expired' | 'removed' | 'replaced';
  pinned: boolean; doneAt: string | null;
}
interface ClassReadinessView {
  classId: string; className: string; subject: ReadinessView['subject']; blueprint: ReadinessView['blueprint'];
  paper: Pick<PaperReadiness, 'key' | 'title' | 'totalMarks' | 'examDate'>;
  learners: { total: number; predicted: number; notEnough: number; noEvidence: number };
  medianMid: number | null;
  topics: Array<{ key: string; label: string; group: string; marks: number; averageMastery: number | null;
    counts: { secure: number; building: number; weak: number; untested: number } }>;
  groups: Array<{ kind: 'topic' | 'misconception'; key: string; label: string; topicLabel: string;
    marksAtStake: number; learners: Array<{ studentId: string; name: string }> }>;  // ≤ 5
  updatedAt: string;
}
interface ClassLearnerRow {
  studentId: string; name: string; state: PaperReadiness['state'] | 'no_evidence';
  band: PaperReadiness['band']; change4w: number | null; answers: number;
  weakestTopic: { key: string; label: string; mastery: number } | null;
}
```

## 7. Costs

- **Readiness is non-AI.** Mastery, bands, levels, explanation lines, groups and path ranking are pure arithmetic and templates.
  - One indexed read per learner per subject per recompute.
  - The nightly run touches only Grade 12 learners in blueprint subjects.
  - A class page recomputes at most its stale learners, with concurrency 5.
- **The "why" line is a template.** No AI is used or planned for it, so E's diagnosis pool is untouched.
- **Practice launched from the path** is the existing practice generation, counted 1 `practice_set` in the learner pool (`subscription/learner-ai.ts:20-22`). Three items a week is about 13 a month against a cap of 60. School (non-standalone) learners stay unmetered and logged, as today.
- **Explainers (V) and mini-mocks (M)** carry their own costs in their own phases.

## 8. Privacy, tenancy and soft delete

- **`schoolId`** is on every readiness, snapshot and path document and in every query. Blueprints are global and hold no learner data.
- **Learners** read only their own readiness, and only through learner-safe fields (§6.1).
- **Teachers** read a learner only with E's `learnerAccess`.
- **No learner data leaves Campusly for R,** because R makes no AI calls.
- **Soft delete only.** R's collections join the school cascade. A soft-deleted Student's readiness is not returned, and rows are never hard-deleted.

## 9. Risks and rulings

| Ruling | Why | Cost if wrong |
|---|---|---|
| The blueprint is a hand-written JSON file, imported by script, verified value by value in the admin page | Exam numbers must be exact and reviewable. AI-parsing PDFs at runtime is unverifiable | About 1 hour per subject per year to write and check. Validation catches sums and codes; a wrong mark slips through only if the reviewer misses it on the page. |
| Learners see nothing of R until every value is verified | The Trig/Euclid conflict alone moves Paper 2 by up to 10 marks per topic | No learner-facing R until Shaun's 2026 guidelines arrive. The build and walkthrough use a test-only verified fixture. |
| Map by node code, topic or subtopic; the subtopic wins | Grade 10–11 function topics hold P2 trig graphs | A row tagged only at topic level on a split topic goes to that topic's default paper topic. This is small, and E's subtopic tags reduce it. |
| Recency: half-life 8 weeks, floor 0.2; source weights 1.0 / 0.7 / 0.6 / 0.6 / 0.5; AI tag × 0.8; override × 0.5 | Recent, exam-like work predicts best; old work still counts | Forgetting too fast or too slow. These are constants, to be tuned after the 2026 trials using the §11 calibration report. |
| The latest answer per question wins | It stops retries inflating a topic | Early struggle on retried questions is lost. Misconceptions still record it. |
| A topic is tested at ≥ 3 answers and ≥ 6 marks; untested and thin topics take the learner's average ± 25 points | It is simple to say, never 0 or 100, and makes the band honest | It is optimistic for a learner who is weakest exactly where nothing has been tested. The wide band and the check-in items counter this. |
| The level adjustment is per paper, shrunk, capped at ±10 points, and skipped under 10 known-level answers | Class tests are routine-heavy, and the exam is not | Level tags on AI-written questions are the generator's (E P7) and can be noisy. The cap bounds the damage. |
| The band is ±1σ (about 2 in 3) | A wider band is useless; a narrower one is false | If calibration shows too many misses, raise z. It is a constant. |
| Compute on read when stale, plus a debounced job and a nightly run | It stays correct with Redis down | A class page right after results are issued recomputes up to 60 learners (about 1–2 s). |
| One `emitEvidenceChanged` line in E's `write-rows.ts` | R hears about final evidence without polling | It touches E's file. If E has shipped, it is a one-line follow-up in R. |
| R reads rows, not E's `learnerTopics` sums | Decay, retries and weights need per-row data | Two readers of one collection. Both filter final, non-deleted rows, and a shared test fixture checks they agree on raw totals. |
| A Subject belongs to a family by node code, else by exact name | Hand-made Subjects often lack a node link | A school Subject named "Maths" with no node link gets no readiness until it is linked to CAPS. |
| **All learners are assumed to write the DBE NSC** | Nothing records an exam body | IEB schools would see DBE predictions. Fix before selling to IEB schools: a school exam-body setting plus IEB blueprints. |
| Only practice and check-in items; the explainer and mini-mock types are reserved | Placeholders promise what doesn't exist | The path is practice-only until V and M land. |
| 3 items per subject per week, no refill | Focus; P balances across subjects | Keen learners want more. Every marks-to-gain row can start practice. |
| Untested topics enter the path only once taught (`termNumber` by month) or in the final 12 weeks | Don't push calculus in February | `termNumber` comes from the ATP files (unverified), and some classes follow another order. The teacher can pin. |
| Snapshots are skipped on unchanged days, except Mondays; history is backfilled as of 12 past Mondays | The trend exists from day one and storage stays small | Backfilled points use today's evidence (later re-marks). They are labelled. |
| Nav items are gated by a server flag (`user.readiness`), not by permissions | No empty page and no permission-file churn | `/auth/me` gains one indexed exists-query. |
| **Found, flagged for E:** `NON_CONTENT_TITLE = /\b(revision\|examination\|exam\|test\|assessment)\b/i` (`Evidence/tagging.ts:17`) matches content titles such as "Measurement (Revision)" (`CAPS-MATHEMATICS-GR11-T4-MEAS`) and "Quadratic patterns (revision)" | E's finalise tagging drops them as candidates | Questions on those topics lose their topic tag, and R sees less Euclidean-geometry and patterns evidence. Fix: match whole titles, as in §2.3. |
| **Carried to M:** paper numbers on `AssessmentPaper`, past-paper provenance on `Question`, and the two generator defects (inputs §2.3, §3.5, §3.8) | R doesn't need them | — |

## 10. Testing

Test-first. The backend uses vitest against a throwaway Mongo, as in E. The frontend uses vitest for pure helpers.

**Engine (pure):**
- the §3.8 worked example to 0.1 marks
- decay at 0, 8, 16 and 30 weeks (the floor)
- source, tag and override weights
- latest answer wins per question key
- tested, thin and untested boundaries (2 answers or 5 marks is thin)
- μ across both papers
- untested topics take μ and a ±25-point spread
- the level adjustment: shrinkage, the ±10 cap, skipped under 10 known-level answers
- a level with no evidence widens σ
- band rounding and clamping
- the gate at 19 and 20 answers, and at 49% and 50% of marks tested
- both papers need both gates
- the default target (next boundary above the top, capped at 80)
- as-of computes ignore later rows

**Blueprint:**
- validation: each error and warning above; the Mathematics draft file passes with only the "unverified" warnings
- import is idempotent
- publish bumps the version, retires the old one and enqueues a recompute
- copy resets `verified` and dates
- `PATCH` refuses to change marks
- verified is derived from every value

**Resolution:**
- the family by node code and by exact name; "Mathematical Literacy" never matches
- the grade by node and by name
- a Timetable CurriculumNode subject maps to the school Subject
- separate per-grade Subjects are read together

**Path:**
- ranking and each boost (misconception needs ready, confidence ≥ 0.6, learner-visible and non-generic; the proximity curve)
- the due rule by month and in the final 12 weeks
- secure topics excluded
- at most 3, with carry and expiry
- done by 4 answers from a teacher test (not the practice); done by securing the topic
- a pin replaces the lowest system item
- remove
- the practice schema accepts the new fields and refuses someone else's item

**Staleness and jobs:**
- the evidence event marks stale and enqueues once within 120 s
- a read recomputes when stale or on a new day
- the nightly run writes a Monday snapshot and skips unchanged days
- history backfill writes 12 points, once

**APIs:**
- another school's teacher gets 404
- a learner can't read another learner, gets 404 on an unverified blueprint, and sees only learner fields
- second-group learners appear in the class view
- pagination and the limit cap
- blueprint routes are super-admin only
- aggregations cast ObjectIds

**Frontend:**
- the view mapping (API → `ExamTopic`, including `thin`)
- the Today priority
- the `bandSentence` target kinds
- nav gating and the allow-lists
- `LevelCountsBar` and `NeedGroups` helpers
- every component state
- no palette classes or tints in the new folders

## 11. Definition of done

**Machine gate** (red refuses hand-over):
- backend and frontend suites, type-check and `next build` green
- new files ≤ 300 lines; no touched file above 350
- zero palette classes, tints and resting shadows in new UI
- labels tied to controls, icon buttons named, focus ring visible
- no horizontal scroll at 320, 375, 768, 1024, 1280 and 1440 on the new routes and Today
- the request set of touched pages unchanged, except the new `/readiness/*` calls (Today gains exactly `GET /readiness/me`)

**Walkthrough** (`e2e/readiness-walkthrough.spec.ts`, 375 px, no console errors, no failed API calls). It uses E's fixture mode and a test-only **verified** Mathematics fixture blueprint with exam dates:
1. A standalone teacher's Grade 12 Mathematics class of three learners has seeded, AI-marked tests.
2. `migrate:evidence` runs.
3. A learner sees **Readiness** as a phone tab and opens it. They see the countdown, the band (or the gate's progress for the learner with little evidence), the exam map with a thin tile, marks to gain, "Why this range", and three path items.
4. They start the top item: practice with the node and misconception, fixture AI.
5. They answer 5 questions. The item shows Done, and Today's NextUp moves to the next item.
6. The teacher opens Readiness under Assess. They see the class map, the topic breakdown and a "who needs what" group, open a learner, see the answers behind a topic, and pin a topic.
7. The learner's path shows the pin first.
8. A super admin imports `nsc-mathematics-gr12-2026.json`. The report shows only unverified warnings, and learners see nothing from it.

**Measured:**
- compute time p95 on a 2,000-row learner
- rows read per class page
- `npm run readiness:calibrate`: for every learner and every marked test covering ≥ 80% of a paper's topics by marks (a trial paper, say), whether the mark fell inside the band predicted the day before. Reported after the September trials; no pass threshold until then.
- lane-hours on the tracker

**Review:** one fresh review, one fix pass, and the compromise protocol on push.

## 12. Decisions (decided 2026-09-26; Shaun delegated, the orchestrator ruled)

1. **Subjects first: Mathematics Paper 1 + Paper 2** (the draft in §2.6). Physical Sciences and Accounting follow when their documents arrive (inputs §4) and their cognitive schemes are mapped.
2. **Minimum evidence before a prediction: 20 answers on the paper AND at least half its marks tested** (a topic is tested at ≥ 3 answers and ≥ 6 marks).
3. **Learners see a percentage band plus the NSC achievement level** ("50–65% · level 4–5"), **never a single mark**. Teachers also see marks out of 150.
4. **Teachers may pin and remove path items** (§4.5), for one learner or a group. They **never edit mastery** or bands.

## Order of work

1. **Blueprint:** model, validator, importer, the Mathematics draft file, the admin API.
2. **Resolution,** the pure engine, `LearnerReadiness` and snapshots, the evidence event, jobs, and read-time recompute.
3. **Path:** ranking, items, completion, pins, and the practice schema fields.
4. **Learner and teacher APIs.**
5. **Frontend learner:** the readiness page, Today, and nav with gates and tests.
6. **Frontend teacher:** the class page, learner drill-down, and nav.
7. **Super-admin** blueprint pages.
8. **Walkthrough, gate, and measurement.**
