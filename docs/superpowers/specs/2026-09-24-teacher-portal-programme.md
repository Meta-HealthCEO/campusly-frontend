# Teacher portal programme — plan

**Date:** 2026-09-24 · **Status:** draft for Shaun's review
**Tracker:** https://claude.ai/artifact/8vTAWvNGe6oTAXefBhmP6Z
**Related:** [visual design spec](2026-09-24-teacher-portal-look-design.md). It becomes phase 1 of this programme and is updated to use the navigation structure in §3.

## 1. North star

"Get the night back." Every teacher job is done in fewer steps, AI drafts and the teacher decides, and the portal reads as one deliberate product. We judge each module by one question: **does it get a teacher from intent to done without a detour?**

## 2. What the research found

We had five inputs:
- screenshots of all 60 static teacher routes, as a school teacher and as a standalone teacher, plus the student side
- a code map of the lessons, courses, textbooks and learning modules
- three module audits
- web research on course builders

### 2.1 The portal is wider than it is deep

There are 82 teacher routes. About a third are dead, orphaned or duplicated:

- **13 routes are dead:**
  - Redirect stubs (10): `lesson-plans` (and `[id]`), `quick-make`, `ai-tools/grading`, `ai-tools/papers` (and `[id]`), `curriculum/assessments` (and `[paperId]`), `curriculum/papers` (and `[id]`).
  - `workbench/papers/builder`: a redirect.
  - `workbench/question-bank`: hardcoded empty filters.
  - `workbench/papers/[id]/memo`: duplicates the Memo tab in the paper page.
- **Built but unreachable:**
  - **Student 360**, the full learner profile. It works; nothing links to it.
  - Merits, Referral, Substitutes, the Attendance report, Paper moderation, the Learning inbox and Policies. Policies' acknowledge action isn't wired.
- **Duplicates:**
  - two question banks
  - two memo editors
  - two AI-marking entry points
  - four behaviour loggers (Discipline, Merits, Incidents, Referral)
  - Meetings vs Conferences
  - Notice board vs Announcements
  - Students vs Roster vs Student 360
  - Lessons vs Courses vs Content library vs Textbooks
  - three quiz systems
- **Module gating leaks:**
  - 12 pages render or 403 for a school that hasn't switched their module on.
  - Today shows fake zeros because of it.
- **Phone navigation:** the bottom nav can't open nested items. Notice board, Announcements, Meetings, Conferences, Incidents, Pastoral and Report comments are unreachable on a phone.

### 2.2 What's already strong (protect it)

- **Attendance** (5/5), and **Today → Take register**, which deep-links with class and period pre-filled.
- **The Lesson workspace:**
  - five phases
  - AI scaffolding grounded in textbooks
  - materials, an AI assistant, and slide and PDF export
- **The Assignments wizard**, with an AI rubric; the **paper wizard**; and **AI script marking**.
- **The backend is further along than the UI.** Courses already have a Coursera-shaped model: modules, items, enrolment, progress, quizzes, certificates, analytics and admin review. Student 360 aggregates everything about a learner. Issuing an AI mark already creates the gradebook assessment.

## 3. New information architecture

There are six sections. Everything a teacher does lives in exactly one place.

| Section | Contains | Absorbs (current routes) |
|---|---|---|
| **Today** | Today home, notifications, end-of-day wrap-up | `/teacher`, notifications |
| **Teach** | **Courses** (the AI course builder, §5), **Lessons**, **Library** (textbooks, notes, worksheets, videos), **Live classes** | `courses*`, `lessons*`, `curriculum/content`, `curriculum/preview*`, `curriculum/textbooks*`, `classroom*`, `workbench/curriculum` (as coverage on a course) |
| **Assess** | **Papers**, **Homework & assignments**, **Marking**, **Gradebook** | `papers*`, `curriculum/import*` (as "Convert a paper"), `workbench/papers/moderation` (as a status), `curriculum/questions` (Question bank), `homework*`, `assignments*`, `workbench/marking-hub`, `curriculum/mark-papers` (as the marking screen), `learning` (inbox folded into Marking), `grades`, `curriculum/assessment-structure*` (as a Weightings tab), `reports` and `ai-tools/report-comments` (as Reports), `workbench/planner` (as the assessment plan) |
| **Class** | **Classes**, **Learner profile**, **Attendance**, **Timetable**, **Behaviour** | `classes*`, `students*` (search opens the profile), `workbench/student-360/[id]` (becomes the Learner profile), `attendance*` (report as a tab), `timetable`, `discipline`, `merits`, `incidents*`, `referral` (merged Behaviour); `pastoral*` (counsellors only) |
| **Talk** | **Messages**, **Announcements** (with the notice board as a channel), **Parent meetings** | `messages`, `communication`, `notice-board`, `meetings` + `conferences` (merged) |
| **Me** | Settings, leave, substitutes, policies, billing (standalone), and role items: **HOD oversight** and **Pastoral caseload** | `settings*`, `leave`, `substitutes`, `policies`, `hod`, `/my/billing` |

**Removed:** the 13 dead routes in §2.1 (redirects are kept only where old links may exist).

**Nav rules:**
- A module that's off for the school is hidden, and its pages show a "not switched on" state instead of erroring.
- Role items (HOD, counsellor) appear only for those roles.
- Standalone teachers see Today, Teach, Assess, Class (Classes, Learner profile) and Me. Talk appears once they have parents linked.

**Phone:**
- The bottom nav shows Today, Teach, Assess, Class and More.
- Each opens a sheet listing that section's items, so nested items are always reachable.
- Take register and Mark are one tap from Today.

## 4. Module goals and verdicts

Scores are how well the module serves its goal today (1–5).

| Module | Goal (the teacher's job) | Now | Verdict | Top changes |
|---|---|:-:|---|---|
| Today | See my day and what needs me | 4 | Keep | Real counts only (module-aware); end-of-day wrap-up; log behaviour from a period |
| Lessons | Plan and run a CAPS lesson with AI | 4 | Keep; becomes a course item | "Add to course"; lessons of a course grouped |
| Courses | Build a unit my learners work through | 2 | **Rebuild as the AI course builder** (§5) | Outline-first AI, learner player, progress |
| Library (content + textbooks) | Keep the sources AI grounds on, and reusable materials | 3 | Merge | One library; textbook chapters pickable as sources |
| Live classes | Run or record a live lesson | 3 | Keep | Recordings usable as course items (lite) |
| Papers | Make a test without a blank page | 4 | Keep, absorb | Convert a PDF, moderation status on the list, one memo editor |
| Question bank | Reuse good questions | 3 | Keep one | Cut the workbench copy |
| Homework & assignments | Set practice or a project | 3–4 | Keep, one area | AI drafting for homework, matching assignments |
| Marking | Everything I owe marking, marked fast | 3 | Redesign the loop | Deep-link to the script; one marking screen; "mark landed in gradebook" confirmation |
| Gradebook | See and capture marks | 4 | Keep, absorb | Weightings tab (fixes the dead "Set weightings" warning); reports and AI comments inside |
| Classes and roster | Get into a class; manage who's in it | 4 | Keep | Every learner row opens the Learner profile |
| Learner profile | Everything about one learner | 1 | **Wire up** (built, unreachable) | Linked from roster, register, marking and behaviour; message the parent from it |
| Attendance | Register in under a minute | 5 | Keep | Report as a tab; labelled status buttons on phones |
| Timetable | My week | 4 | Keep | Now line (visual spec) |
| Behaviour | Note behaviour; escalate | 1–3 | **Merge four into one** | One log (demerit, merit, incident), a learner timeline, "Refer to counsellor", log from roster or register |
| Pastoral | Run my counselling caseload | 4 | Keep, counsellors only | Referrals arrive here |
| Messages | Talk privately to a parent | 3 | Keep | Open a thread from the Learner profile |
| Announcements | Tell a class's parents something | 2 | **Redesign** | Pick a whole class or group, not one parent at a time; the notice board becomes a channel |
| Parent meetings | Offer and keep meeting slots | 3 | Merge Meetings and Conferences | One "my availability and bookings" |
| Policies | Read and acknowledge policies | 1 | **Fix** | A teacher-facing page with Acknowledge (the backend is ready) |
| HOD oversight | Oversee my department | 3 | Fix | Wire Approve / Request changes to moderation |
| Leave, substitutes, settings | Admin about me | 4 | Keep, under Me | Link substitutes (currently orphaned) |

## 5. The AI course builder

The concept follows the research (outline-first, grounded, per-item AI, short items, low-data) and reuses the existing Course backend.

**What a course is.** A unit of work for a class: for example *Statistics · Grade 10 Mathematics · Term 3*.
- It's made of **modules**, one per Annual Teaching Plan week or topic.
- Each module holds 3–6 **items**, each 5–10 minutes:
  - a teacher-led **Lesson** (the existing lesson workspace)
  - **Notes** (library content)
  - a **Worked example**
  - a **Quick check** (3–5 auto-marked questions with worked solutions)
  - an optional **Video** (lite)
  - **Homework**
  - a **Module quiz**
- Every item shows its minutes, a CAPS reference and its data size.

**Teacher flow:**
1. **Scope:** pick grade, subject and term. CAPS topics and ATP weeks are pre-filled.
2. **Sources** (optional): a textbook chapter, own notes or a past paper.
3. **The AI drafts the outline:** modules, items, minutes, objectives and CAPS references.
4. **The teacher approves the outline.** Nothing else is generated before this.
5. **The AI generates items as drafts** in a background job, with progress shown.
6. **Per-item review:** edit inline, or use AI actions: regenerate, easier, harder, shorter, reading level, translate. Teacher edits are never overwritten.
7. **Completion rules:** content counts as viewed; a check counts at ≥ 50%. Sequential unlock is optional.
8. **Data check:** size per module, with video flagged.
9. **Publish** to one or more classes, week by week. It's also saved to the school library.
10. **Monitor:** who's stuck and the most-missed questions. One click drafts a revision item.

**Learner flow (phone first, low data):**
1. A resume card: "Continue: Mean and median · item 3 of 5 · 6 min".
2. A module page with a progress bar and, for each item, its minutes, size and a done tick.
3. An item, followed by a quick check with instant marking.
4. The next item unlocks.
5. A module quiz. Below the threshold, a revision item follows. Above it, a module badge, which parents can see.
6. Text first, compressed images, no autoplay, no YouTube embeds.
7. Downloading a module for offline use comes later.

**What gets built:**
- a background generation queue (BullMQ; today all AI calls block)
- a `lesson` item type linking the existing Lesson
- one quiz system (the question bank plus course quiz attempts; the Learning quiz retires)
- student course pages (the backend exists; the page doesn't)
- teacher insight on top of the existing course analytics
- copy a course to other classes or next year

## 6. Roadmap

Each phase ships as small PRs. The tracker lists every task.

| Phase | What | Why this order |
|---|---|---|
| **0: Fix what's broken** | Wire Learner profile links; Policies acknowledge; module guards and the Today 403; nested items on the phone nav; Marking hub deep link; Gradebook weightings link; "mark landed" confirmation; HOD actions; label/h1 fixes; delete the 13 dead routes; demo seed data | Cheap, low-risk, and every later phase stands on it |
| **1: Foundation** | The visual spec (tokens, fonts, frame, shared components), with the nav rebuilt to the six sections in §3 | Everything new is built once, in the new look |
| **2: The assess loop** | Papers (convert, moderation, one memo), one Marking screen, Gradebook weightings and reports, AI homework | The ad's promise: make, give, mark, done |
| **3: The course builder** | 3a outline-first builder and generation queue; 3b per-item AI and completion rules; 3c student course player; 3d teacher insight; 3e copy and reuse; 3f one quiz system | The headline feature, built on the new foundation |
| **4: Class** | Learner profile as the hub; merged Behaviour with in-context logging | The daily loop's biggest break |
| **5: Talk and Me** | Announcements to a class, Parent meetings merged, notice board as a channel | Lower frequency, and it depends on module switches |

The phase 3 backend (queue, data model, quiz unification) can start alongside phases 1 and 2, because it's independent of the UI.

## 7. Decisions needed from Shaun

1. **Navigation:** approve the six sections and the cuts and merges in §3–4.
2. **Course builder audience:** class-paced units that a teacher runs for their own class (recommended first), or self-paced courses any learner can enrol in, or both.
3. **Course availability:** core for every teacher (recommended; it's the headline), or a per-school paid module as today.
4. **Order:** the roadmap in §6, or pull the course builder forward.

## 8. Out of scope

Other portals, the student and parent portals beyond the course player, pricing changes, and mobile apps.
