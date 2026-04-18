# Substitutes Module — Full Enrichment Spec

**Date:** 2026-04-14
**Status:** Approved (approach A)
**Scope:** Transform substitutes from basic CRUD to integrated substitute management workflow

---

## Problem

The substitutes module has working CRUD but feels underpowered. Missing:
- Admin sidebar link (page unreachable)
- Approval workflow (field exists but unused)
- Edit UI (backend PUT exists, no UI)
- Conflict detection (can double-book)
- Notifications (sub teacher isn't told)
- Smart suggestions (no "who's free?")
- Leave integration (leave & subs don't talk)
- Hardcoded periods 1-6
- Reason free-text only
- No full-day toggle
- Past-date creation allowed
- No history view

## Goal

Turn it into a complete substitute management feature: admin can create/edit/approve substitutions with smart suggestions, system detects conflicts, notifies assigned teachers, and integrates with the leave module.

---

## 1. Backend Changes

### 1.1 Model updates (`Attendance/model.ts`)

Add fields to `ISubstituteTeacher`:
- `status: 'pending' | 'approved' | 'declined' | 'cancelled'` (default: `'pending'`)
- `approvedAt?: Date`
- `declinedAt?: Date`
- `declineReason?: string`
- `reasonCategory: 'sick' | 'training' | 'personal' | 'family' | 'emergency' | 'other'` (required)
- `leaveRequestId?: ObjectId` (ref: LeaveRequest) — links to leave if created from one
- `isFullDay: boolean` (default: false)

Keep existing: `reason` (free text, now optional detail), `periods`, `classIds`, `approvedBy`.

### 1.2 Conflict detection service

New file: `src/modules/Attendance/service-substitute-conflicts.ts`

Exports:
- `detectConflicts(schoolId, substituteTeacherId, originalTeacherId, date, periods, excludeId?)` — returns `{ teacherConflicts, timetableConflicts, leaveConflicts }`
- `findAvailableTeachers(schoolId, date, periods, excludeTeacherIds)` — returns teachers with no timetable slot, no other sub assignment, no approved leave on that date+periods. Also returns `preferred: boolean` flag (same subject/grade as original teacher).

### 1.3 Service updates (`service-substitute.ts`)

- `createSubstitute` — runs conflict detection, throws `BadRequestError` with structured details if conflicts found
- `approveSubstitute(id, schoolId, approverId)` — sets `status=approved`, `approvedAt`, `approvedBy`, triggers notification
- `declineSubstitute(id, schoolId, reason)` — sets `status=declined`, `declinedAt`, `declineReason`
- `listSubstitutes` — add `status` filter param
- `listTeacherHistory(teacherId, schoolId, filter)` — returns all subs where teacher is original or substitute, grouped with counts
- `suggestAvailableTeachers(schoolId, date, periods, originalTeacherId)` — wrapper around conflict service

### 1.4 Controller updates (`controller.ts`)

- `approveSubstitute` — POST `/substitutes/:id/approve`
- `declineSubstitute` — POST `/substitutes/:id/decline` (body: `{ reason }`)
- `getTeacherHistory` — GET `/substitutes/teacher/:teacherId/history`
- `getSuggestions` — GET `/substitutes/suggestions?date=...&periods=1,2,3&originalTeacherId=...`
- `createSubstitute` — auto-derives periods from timetable config if `isFullDay=true`
- All creates send in-app notification to substitute teacher on approve

### 1.5 Routes (`routes.ts`)

Add:
```
POST /substitutes/:id/approve          (admin only)
POST /substitutes/:id/decline          (admin only)
GET  /substitutes/suggestions          (admin/teacher)
GET  /substitutes/teacher/:teacherId/history  (admin/teacher — teacher can only see own)
```

### 1.6 Validation (`validation.ts`)

- `createSubstituteSchema` — add `reasonCategory`, `isFullDay`, optional `leaveRequestId`
- Cross-field: if `isFullDay=true`, `periods` can be empty (backend fills)
- Past-date rejection: `date` must be >= today (unless admin override via flag — future feature, skip for now)
- `declineSubstituteSchema` — `{ reason: string min 1 }`

### 1.7 Leave integration

In `Leave/service.ts` (or wherever approveLeave is), after approval:
- If leave request doesn't have a linked substitute yet, emit a system event or set a flag
- Frontend leave admin will see a "Create Substitute" button for approved leaves without coverage

Minimal change: add helper `findPendingSubstituteCoverage(schoolId)` that returns approved leaves without a substitute record. Exposed via `GET /leave/pending-coverage` (admin only).

### 1.8 Notifications

In `service-substitute.ts`, after create and approve:
```ts
await NotificationService.create({
  recipientId: substituteTeacherId,
  schoolId,
  type: 'in_app',
  title: 'Substitute Assignment',
  message: `You've been assigned to cover ${originalTeacherName}'s classes on ${date}`,
  data: { entityId: substituteId, entityType: 'substitute', url: '/teacher/substitutes' },
});
```

Also notify original teacher when sub is approved.

---

## 2. Frontend Changes

### 2.1 Admin nav link

`src/lib/constants.ts`:
- Add `ADMIN_SUBSTITUTES: '/admin/substitutes'` to ROUTES
- Add to `ADMIN_NAV` after "Attendance": `{ label: 'Substitutes', href: ROUTES.ADMIN_SUBSTITUTES, icon: UserCheck }`

### 2.2 Enhanced SubstituteForm

`src/components/attendance/SubstituteForm.tsx`:
- **Reason category dropdown** (sick/training/personal/family/emergency/other) — required
- **Reason text** — becomes optional "Additional details"
- **Full-day toggle** — checkbox "Full day" that auto-selects all periods and disables the period checkboxes
- **Dynamic periods** — fetch period count from timetable config, render N checkboxes (fallback to 1-6 if no config)
- **Smart suggestions** — after date + periods are selected, call `/substitutes/suggestions?...` and show available teachers with a "Recommended" badge for same-subject teachers
- **Conflict warning inline** — if selected substitute has a conflict, show error under the Select

### 2.3 Edit UI

Admin page adds an "Edit" button per row that opens the same SubstituteForm in edit mode. Form submits to `updateSubstitute` hook.

### 2.4 Approval UI

Admin substitutes page becomes 3 tabs: **Pending | Approved | All**.
- Pending tab: rows have Approve/Decline buttons
- Decline opens a small dialog for reason
- Approved tab: rows show approver + approval date

Status badge on every row.

### 2.5 Reason category badges + colors

Each row shows a colored badge for category (sick=red, training=blue, personal=amber, family=purple, emergency=destructive, other=gray).

### 2.6 Teacher history view

New admin feature: click a teacher row from a sub → navigate to `/admin/substitutes?teacherId=X` filtered, or add a "History" button that opens a dialog showing that teacher's sub history with counts (X times as original, Y times as substitute).

### 2.7 Leave module deep link

Frontend: in the teacher leave page and admin leave page, when viewing an approved leave without a linked substitute, show a "Arrange Substitute" button that deep-links to the substitutes page with form prefilled (date range, teacherId via query params).

Admin substitutes page reads query params on mount and opens the create form with prefilled values.

### 2.8 Hook updates

`src/hooks/useSubstitutes.ts`:
- Add `updateSubstitute`, `approveSubstitute`, `declineSubstitute`
- Add `fetchSuggestions(date, periods, originalTeacherId)`
- Add `status` filter param to `fetchSubstitutes`

`src/hooks/useTeacherSubstitutes.ts`:
- Filter out cancelled/declined by default
- Show status badge in teacher view

---

## 3. Files Changed / Created

### Backend
| File | Action |
|---|---|
| `src/modules/Attendance/model.ts` | Modify — add status/category fields |
| `src/modules/Attendance/validation.ts` | Modify — new fields, past-date check, decline schema |
| `src/modules/Attendance/service-substitute.ts` | Modify — approve/decline/suggestions/history, notifications |
| `src/modules/Attendance/service-substitute-conflicts.ts` | **New** — conflict + suggestion logic |
| `src/modules/Attendance/controller.ts` | Modify — new endpoints |
| `src/modules/Attendance/routes.ts` | Modify — new routes |
| `src/modules/Leave/service.ts` | Modify — add `findPendingSubstituteCoverage` |
| `src/modules/Leave/controller.ts` | Modify — add pending-coverage endpoint |
| `src/modules/Leave/routes.ts` | Modify — add pending-coverage route |

### Frontend
| File | Action |
|---|---|
| `src/lib/constants.ts` | Modify — add route + nav item |
| `src/components/attendance/SubstituteForm.tsx` | Modify — category, full-day, dynamic periods, suggestions |
| `src/components/attendance/SubstituteDeclineDialog.tsx` | **New** — decline reason dialog |
| `src/app/(dashboard)/admin/substitutes/page.tsx` | Modify — tabs, edit, approve/decline, deep link |
| `src/app/(dashboard)/teacher/substitutes/page.tsx` | Modify — status badges, filter cancelled |
| `src/hooks/useSubstitutes.ts` | Modify — new mutations + suggestions |
| `src/hooks/useTeacherSubstitutes.ts` | Modify — status filter |
| `src/types/attendance.ts` (or wherever Substitute type lives) | Modify — new fields |

---

## 4. Out of Scope

- Email notifications (in-app only for now)
- SMS notifications
- Recurring substitutes
- Bulk assignment UI
- Substitute teacher qualification matching
- Performance analytics on substitute usage
- Past-date admin override (creates now hard-rejects past dates)
