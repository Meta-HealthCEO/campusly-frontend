# Campusly readiness programme — plan

**Date:** 2026-09-25 · **Status:** direction set by Shaun, 2026-09-25; replaces the remaining standalone projects 2–4 as separate projects
**Tracker:** https://claude.ai/artifact/8vTAWvNGe6oTAXefBhmP6Z
**Supersedes:** the "night-back look" as the product's look ([2026-09-24-teacher-portal-look-design.md](2026-09-24-teacher-portal-look-design.md)); the standalone Projects 3 (syllabus) and 4 (lessons). **Keeps:** [the learner portal spec](2026-09-25-standalone-learner-portal-design.md) as Phase L, built in the new look.

## 1. North star

**Ace the final exam.** Campusly is an improvement and progress tool: every answered question is evidence, AI turns the evidence into a diagnosis of *why* marks were lost, the learner gets a clear path, mock exams aim at their weaknesses, and progress is visible week to week until the Grade 12 finals. The AI is **proactive**: it tells the learner what to do next and tells the teacher what to reteach, without being asked.

Every feature is judged by one question: **does it feed or use the loop?**

```
evidence (every answered question) → diagnosis (why marks were lost, per topic & skill)
   → readiness (against the final-exam blueprint) → path (what to do next)
   → practice / explainer / targeted mock exam → new evidence
```

**Decided (Shaun, 2026-09-25):**
- **Teacher-led first.** A teacher's tests, AI-marked scripts and homework feed each learner's readiness; the teacher sees the class's weaknesses and gets proactive reteach suggestions; paid by the teacher's plan. A learner-led (direct, B2C) product comes later on the same engine.
- **The look is redone for the whole product:** premium, crisp, "Coursera but better" — clarity, easy navigation, not a generic AI-generated front end. It comes first, so nothing is built twice.
- Explainer videos are **Remotion**, as for Blueticked, **one per misconception, reused** across learners (never rendered per learner).

## 2. Phases

Each phase runs the same loop as before: short design (with Shaun only where a decision is his) → spec, fact-checked against the code → plan → build test-first → one fresh review → one fix pass → full suites → ship (compromise protocol) → tracker. I carry the phases out in order; the **gates** are the only points where work waits for Shaun.

| # | Phase | What ships | Gate (Shaun) |
|---|---|---|---|
| **D** | **Premium design system** | Look direction chosen from real-content mockups; tokens (colour, type, space, radius, elevation, motion) for light and dark; the app shell and navigation for learner and teacher; core components (page header, cards, lists/tables, progress and readiness visuals, charts, empty/loading/error states, dialogs, forms); a dev-only gallery page. Applied to the shared layout so every portal changes at once. | **Pick the direction** (D1) |
| **L** | **Learner portal** | The Project 2 spec as written (flag, nav, joining, groups, rosters, enrol-on-join, learner AI pool, notifications, walkthrough), every learner screen in the new look. | — |
| **E** | **Evidence and diagnosis** | One `AnswerEvidence` record per answered question from every source (online test, AI-marked script, homework, unit quick check, practice): learner, question, CAPS topic, cognitive level, marks, source, date. AI diagnosis of lost marks into a per-subject misconception list. Backfill from existing marked work. | — |
| **R** | **Readiness and the path** | Exam blueprints per subject and grade (topic weights, cognitive-level weights, paper structure — from CAPS exam guidelines, stored as data); a readiness model per learner and subject (topic mastery with recency and confidence → readiness and a predicted mark band); the learner's **path** (ordered weaknesses, each with the next action); the teacher's class readiness view. | Blueprint source documents (see §4) |
| **M** | **Targeted mock exams and progress** | Mock papers true to the exam blueprint but weighted to the learner's (or group's) weaknesses — question bank first, AI fills the gaps; timed exam mode; AI marking feeds evidence; progress over time (readiness trend, topics improved, predicted band). | — |
| **P** | **Proactive AI** | Learner: a weekly plan and nudges. Teacher: a weekly briefing — groups of learners who lose marks for the same reason, each with a one-click reteach pack (short lesson + quiz); a pre-exam readiness report. Scheduled jobs, in-app notifications, cost-bounded (batch requests where latency doesn't matter). | Proactive AI budget per teacher (see §4) |
| **V** | **Lessons and explainers** | A lesson player that is better than Coursera's (clear structure, progress, interactive blocks that work — drag-and-drop and hotspot built or removed); Remotion explainers generated per misconception (AI script → render → stored video) and attached to the path. | Narration choice (see §4) |
| **T** | **Teacher portal in the new look** | The remaining teacher screens not already touched by L–V restyled to the design system; the night-back scope removed. | — |

**Order rationale.** D before everything (one look, built once). L before E because learners must be in the system and writing tests before there is evidence. E → R → M is the loop's spine. P needs R's diagnosis to be proactive about. V's explainers attach to misconceptions from E. T sweeps what's left.

## 3. What already exists (from the 2026-09-25 audits)

- Tests are taken online and AI-marked per question; teachers AI-mark handwritten scripts from photos. Both give per-question marks.
- Questions carry a CAPS `curriculumNodeId`; `CurriculumNode.metadata` holds `cognitiveWeighting`, `notionalHours`, `weekNumbers` — a start on blueprints.
- `StudentMastery` / `StudentAttempt` exist keyed by `curriculumNodeId`, but only the content library feeds them; the AI tutor's mastery uses free-text topics. Phase E replaces both with one evidence stream.
- Past-paper import (`PaperImport`) exists; what it holds for Grade 12 is to be checked in Phase R.
- `campusly-remotion` exists (used for the teacher ad campaign).

## 4. Decisions Shaun owns, and when they are needed

| Needed by | Decision |
|---|---|
| D1 (now) | The look: pick one of three directions shown as real screens. |
| R | Where the CAPS exam guidelines / blueprints come from (documents to import), and which Grade 12 subjects go first (proposal: Mathematics, Physical Sciences, Accounting). Past papers with memos, if available, to calibrate. |
| P | Monthly AI budget for proactive features per teacher plan (proposal in the phase P spec, with measured costs from Phases E–M). |
| V | Narration for explainers: AI voice (text-to-speech) or none (captions only); where the Blueticked Remotion pipeline lives, to reuse it. |

Everything else I decide, record as a ruling in the phase's ledger, and report.

## 5. Guardrails (unchanged)

Compromise protocol on every push; test-first; no hardcoded secrets; AI never unmetered for standalone schools; every phase's walkthrough passes at 375 px with no console errors and no failed API calls; at most three working lanes; every phase measured on the tracker with stage history.
