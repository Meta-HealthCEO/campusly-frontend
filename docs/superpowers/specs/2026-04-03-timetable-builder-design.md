# Timetable Builder — Design Specification

## Overview

Automatic school timetable generation with a 6-step wizard. Supports two modes:
- **Fixed-class (Grade 1-9):** Assign teachers to class periods. All students in a class share the same timetable.
- **Subject-choice (Grade 10-12 FET):** Students choose subjects, system groups into subject lines, schedules lines to avoid student clashes.

Admin configures constraints via a step-by-step wizard, then the algorithm generates a complete clash-free timetable. Admin reviews, tweaks, and commits to the live timetable.

## Constraints

### Hard Constraints (must satisfy)
| Constraint | Description |
|---|---|
| No teacher double-booking | Teacher can't teach two classes in the same slot |
| No class double-booking | A class can't have two subjects in one slot |
| No student clash (FET) | Student can't be in two subject-line classes at once |
| Teacher availability | Respect unavailable days/periods |
| Subject hours per week | Each subject gets its required period count |

### Soft Constraints (optimise for)
| Constraint | Description |
|---|---|
| Room conflicts | Same room shouldn't be assigned twice per slot |
| Teacher workload balance | Spread load evenly, no marathon days |
| Double periods | Consecutive slots for subjects that need them (practicals, art) |
| No back-to-back repeats | Don't schedule same subject two periods in a row (unless double) |
| Subject spread | Distribute across the week, not clustered on one day |

## Data Models

### TimetableConfig
Per-school timetable settings.
- `schoolId` (ObjectId, unique)
- `periodsPerDay`: `{ monday: number, tuesday: number, ... friday: number }`
- `periodTimes`: `[{ period: number, startTime: string, endTime: string }]`
- `breakSlots`: `[{ afterPeriod: number, duration: number, label: string }]`
- `academicYear`: number
- `term`: number

### TeacherAvailability
- `schoolId`, `teacherId`
- `unavailable`: `[{ day: string, periods: number[], reason?: string }]`
- Unique on (schoolId, teacherId)

### SubjectRequirement
Per grade, per subject: how many periods needed.
- `schoolId`, `subjectId`, `gradeId`
- `periodsPerWeek`: number
- `requiresDoublePeriod`: boolean
- `preferredTeacherId`: ObjectId (optional)

### SubjectLine (FET only)
- `schoolId`, `gradeId`
- `lineName`: string
- `subjectIds`: ObjectId[]

### TimetableGeneration
Tracks a generation run — staged result before commit.
- `schoolId`, `gradeId`
- `status`: 'configuring' | 'generating' | 'completed' | 'failed'
- `lockedSlots`: `[{ classId, day, period, subjectId, teacherId }]`
- `result`: `[{ classId, day, period, subjectId, teacherId, room? }]`
- `score`: `{ total: number, details: { constraint: string, score: number }[] }`
- `warnings`: `[{ type: string, message: string }]`
- `generatedAt`: Date

## Algorithm: Constraint-Satisfaction with Greedy + Backtracking

```
1. SETUP
   - Load inputs: classes, subjects, teachers, requirements, availability, locked slots, subject lines
   - Place locked slots first (immovable)

2. SORT (hardest first)
   - FET subject lines > locked-teacher subjects > double-period subjects > few-available-teacher subjects > rest

3. PLACE (greedy)
   For each unplaced requirement:
     a. Find all valid slots (no hard constraint violated)
     b. Score each on soft constraints
     c. Pick highest-scoring slot
     d. No valid slot → backtrack

4. BACKTRACK
   - Undo last N placements (not locked)
   - Try next-best slot
   - Max 1000 backtracks → fail with partial result + reasons

5. FET SUBJECT LINES
   - Lines placed as a unit — all subjects in a line share time slots
   - Students pre-assigned to groups by their subject choices
```

**Performance:** Under 30 seconds for typical school (500 students, 40 teachers, 30 classes). Async via BullMQ if >30 classes.

## User Experience — 6-Step Wizard

### Step 1: Configure School Periods
- Periods per day (Mon-Fri, variable)
- Period times (start/end)
- Break/lunch slots
- Saved once per school

### Step 2: Subject Requirements
- Per grade: subject, periods/week, double period toggle, preferred teacher
- Pre-filled from existing subjects
- Table-based input

### Step 3: Teacher Availability
- Grid: teachers × day+period
- Click to toggle unavailable
- Bulk: "All Wednesday P5-7 = sport"

### Step 4: Subject Lines (FET only)
- Skipped for Grade 1-9
- Manual line creation OR "Suggest Lines" AI optimizer
- Drag-and-drop subjects into lines
- Live conflict validation

### Step 5: Lock Slots (Optional)
- Visual empty timetable grid
- Pin specific entries (assembly, chapel, teacher preferences)
- Immovable during generation

### Step 6: Generate & Review
- Generate button → progress indicator
- Results: per-class timetable grids
- Quality score + warnings panel
- Accept / Regenerate / Manual tweak

## API Endpoints

```
# Config
GET/PUT  /api/timetable-builder/config

# Requirements
GET/POST /api/timetable-builder/requirements
PUT/DEL  /api/timetable-builder/requirements/:id

# Teacher Availability
GET      /api/timetable-builder/availability
GET/PUT  /api/timetable-builder/availability/:teacherId

# Subject Lines (FET)
GET/POST /api/timetable-builder/lines
PUT/DEL  /api/timetable-builder/lines/:id
POST     /api/timetable-builder/lines/suggest

# Generate
POST     /api/timetable-builder/generate
GET      /api/timetable-builder/generation/:id
POST     /api/timetable-builder/generation/:id/commit
```

## File Structure

### Backend
```
src/modules/TimetableBuilder/
  model.ts
  validation.ts
  controller.ts
  routes.ts
  services/
    config.service.ts
    requirements.service.ts
    generator.service.ts
    line-optimizer.service.ts
    commit.service.ts
```

### Frontend
```
src/types/timetable-builder.ts
src/hooks/useTimetableBuilder.ts
src/components/timetable-builder/
  PeriodConfigStep.tsx
  SubjectRequirementsStep.tsx
  TeacherAvailabilityStep.tsx
  SubjectLinesStep.tsx
  LockSlotsStep.tsx
  GenerateReviewStep.tsx
  TimetableGrid.tsx
  WizardNavigation.tsx
src/app/(dashboard)/admin/timetable-builder/page.tsx
```

## Key Decisions
- Generator is deterministic (not AI) — guaranteed to satisfy hard constraints
- AI used only for subject line optimization and post-generation review
- Generated timetable staged before commit — admin reviews first
- Existing manual timetable CRUD unaffected
- Variable periods per day supported (Wednesday sport afternoons, etc.)
