# 12 — Achiever Module

## 1. Module Overview

The Achiever module covers the school's recognition and gamification system. It has two distinct subsystems:

**Achievements** — Staff award individual students named achievement records categorised as `academic`, `sport`, `cultural`, or `behaviour`. Each record carries a points value. Aggregating points powers the Wall of Fame.

**House Points** — The school maintains a small set of named houses (e.g. Eagles, Lions). Staff award points to a house on behalf of a student via a `HousePointLog`. The log atomically increments the house's `totalPoints`. A leaderboard ranks houses by total points for a given year/term.

**Marks-based top achievers** — A separate read-only endpoint cross-queries the Academic module's `Mark` and `Assessment` collections to derive a ranked list of students by average assessment percentage for a term, without creating any Achievement records.

There is no dedicated admin achiever management page in the current frontend; student-facing UI lives at `/student/achievements`. The admin side needs to be built.

---

## 2. Backend API Endpoints

All endpoints are mounted under `/api/achiever` (inferred from module convention). Every response follows the envelope:

```json
{
  "success": true,
  "data": <payload>,
  "message": "Human-readable string"
}
```

Error responses carry `"success": false` and an `"error"` string instead of `"data"`.

Authentication uses a Bearer token in `Authorization`. The token is taken from `localStorage.accessToken` by the API client. The backend reads `req.user.schoolId` as a fallback whenever `schoolId` is not explicitly passed as a query parameter — this means school-scoped queries work automatically for logged-in users without a query param.

---

### 2.1 Achievements

#### `POST /achievements`

Create an achievement record for a student.

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`, `teacher`
- **Request body** (validated by Zod):

| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | string | yes | 24-char hex ObjectId |
| `schoolId` | string | yes | 24-char hex ObjectId |
| `type` | string | yes | `"academic" \| "sport" \| "cultural" \| "behaviour"` |
| `title` | string | yes | min length 1, trimmed |
| `description` | string | no | trimmed |
| `term` | number | yes | integer ≥ 1 |
| `year` | number | yes | integer ≥ 2000 |
| `category` | string | no | trimmed |
| `points` | number | no | ≥ 0 (default `0`) |
| `awardedBy` | string | yes | 24-char hex ObjectId |
| `awardedAt` | string | no | ISO 8601 datetime |
| `isPublic` | boolean | no | default `true` |

- **Response**: `201`

```json
{
  "success": true,
  "data": {
    "_id": "665f1a2b3c4d5e6f7a8b9c0d",
    "studentId": "665f000000000000000000a1",
    "schoolId": "665f000000000000000000b1",
    "type": "academic",
    "title": "Top of Class",
    "description": "Highest aggregate in Term 1",
    "term": 1,
    "year": 2026,
    "category": "mathematics",
    "points": 50,
    "awardedBy": "665f000000000000000000c1",
    "awardedAt": "2026-03-31T08:00:00.000Z",
    "isPublic": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Achievement created successfully"
}
```

---

#### `GET /achievements`

List achievements with optional filters and pagination.

- **Auth**: required
- **Roles**: all authenticated
- **Query parameters**:

| Param | Type | Default | Notes |
|---|---|---|---|
| `schoolId` | string | `req.user.schoolId` | Falls back to token's school |
| `studentId` | string | — | Filter to one student |
| `type` | string | — | `academic \| sport \| cultural \| behaviour` |
| `year` | number | — | Filter by year |
| `term` | number | — | Filter by term |
| `page` | number | 1 | Pagination |
| `limit` | number | PAGINATION_DEFAULTS.limit | Capped at PAGINATION_DEFAULTS.maxLimit |

- **Response**: `200`

```json
{
  "success": true,
  "data": {
    "data": [ /* Achievement objects, studentId and awardedBy populated */ ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Achievements retrieved successfully"
}
```

Populated `awardedBy` shape: `{ _id, firstName, lastName, email }`.
Populated `studentId`: full Student document.

---

#### `GET /achievements/wall-of-fame`

Top 10 students per achievement type for a school/year, ranked by sum of points.

- **Auth**: required
- **Roles**: all authenticated
- **Query parameters**:

| Param | Type | Required | Default |
|---|---|---|---|
| `schoolId` | string | yes (or from token) | `req.user.schoolId` |
| `year` | number | no | current calendar year |
| `term` | number | no | all terms |

- **Response**: `200`

```json
{
  "success": true,
  "data": {
    "academic": [
      {
        "_id": "665f000000000000000000a1",
        "totalPoints": 150,
        "achievementCount": 3,
        "student": { /* full Student document */ }
      }
    ],
    "sport": [ /* same shape, up to 10 */ ],
    "cultural": [ /* ... */ ],
    "behaviour": [ /* ... */ ]
  },
  "message": "Wall of fame retrieved successfully"
}
```

Returns `400` if `schoolId` cannot be resolved.

---

#### `GET /achievements/top-marks`

Top 10 students ranked by average mark percentage for a specific term and academic year. Reads from the Academic module's `Mark` / `Assessment` collections — does **not** create any Achievement records.

- **Auth**: required
- **Roles**: all authenticated
- **Query parameters**:

| Param | Type | Required |
|---|---|---|
| `schoolId` | string | yes (or from token) |
| `term` | number | yes |
| `academicYear` | number | yes |

Returns `400` if any of the three required params are missing.

- **Response**: `200`

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f000000000000000000a1",
      "averagePercentage": 94.5,
      "totalMarks": 8,
      "student": { /* full Student document */ }
    }
  ],
  "message": "Top achievers from marks retrieved successfully"
}
```

---

#### `GET /achievements/:id`

Fetch a single achievement by its MongoDB `_id`.

- **Auth**: required
- **Roles**: all authenticated
- **Path param**: `id` — ObjectId string
- **Response**: `200`

```json
{
  "success": true,
  "data": { /* Achievement with studentId and awardedBy populated */ },
  "message": "Achievement retrieved successfully"
}
```

Returns `404` via `NotFoundError` if not found or soft-deleted.

---

#### `PUT /achievements/:id`

Update any fields of an achievement. All fields are optional (partial of the create schema).

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`, `teacher`
- **Path param**: `id`
- **Request body**: any subset of create fields (all optional)
- **Response**: `200`

```json
{
  "success": true,
  "data": { /* Updated Achievement, populated */ },
  "message": "Achievement updated successfully"
}
```

---

#### `DELETE /achievements/:id`

Soft-delete an achievement (sets `isDeleted: true`).

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`
- **Path param**: `id`
- **Response**: `200`

```json
{
  "success": true,
  "data": null,
  "message": "Achievement deleted successfully"
}
```

---

### 2.2 Houses

#### `POST /houses`

Create a new house for a school/term/year.

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`
- **Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `schoolId` | string | yes | ObjectId |
| `houseName` | string | yes | min 1, trimmed |
| `houseColor` | string | yes | min 1, trimmed (CSS colour value) |
| `term` | number | yes | integer ≥ 1 |
| `year` | number | yes | integer ≥ 2000 |

- **Response**: `201`

```json
{
  "success": true,
  "data": {
    "_id": "665f2a3b4c5d6e7f8a9b0c1d",
    "schoolId": "665f000000000000000000b1",
    "houseName": "Eagles",
    "houseColor": "#2563EB",
    "totalPoints": 0,
    "term": 1,
    "year": 2026,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "House created successfully"
}
```

---

#### `GET /houses/leaderboard`

Houses sorted by `totalPoints` descending for a school/year, optionally filtered by term.

- **Auth**: required
- **Roles**: all authenticated
- **Query parameters**:

| Param | Type | Default |
|---|---|---|
| `schoolId` | string | `req.user.schoolId` |
| `year` | number | current calendar year |
| `term` | number | all terms |

- **Response**: `200`

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f2a3b4c5d6e7f8a9b0c1d",
      "schoolId": "665f000000000000000000b1",
      "houseName": "Dolphins",
      "houseColor": "#10B981",
      "totalPoints": 1320,
      "term": 1,
      "year": 2026
    }
  ],
  "message": "House leaderboard retrieved successfully"
}
```

Returns `400` if `schoolId` cannot be resolved.

---

#### `GET /houses`

List all houses for a school/year (sorted alphabetically by `houseName`). Optionally filter by term.

- **Auth**: required
- **Roles**: all authenticated
- **Query parameters**: same as leaderboard (`schoolId`, `year`, `term`)
- **Response**: `200`

```json
{
  "success": true,
  "data": [ /* HousePoints documents, sorted by houseName */ ],
  "message": "Houses retrieved successfully"
}
```

---

#### `PUT /houses/:id`

Update house metadata (name, colour, term, year, schoolId). Does **not** directly set `totalPoints` — points accumulate via `POST /houses/points`.

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`
- **Path param**: `id`
- **Request body**: any subset of create house fields (all optional)
- **Response**: `200`

```json
{
  "success": true,
  "data": { /* Updated HousePoints document */ },
  "message": "House updated successfully"
}
```

---

#### `POST /houses/points`

Award points to a house on behalf of a student. Creates a `HousePointLog` record and atomically increments `HousePoints.totalPoints`.

- **Auth**: required
- **Roles**: `super_admin`, `school_admin`, `teacher`
- **Request body**:

| Field | Type | Required | Validation |
|---|---|---|---|
| `studentId` | string | yes | ObjectId |
| `houseId` | string | yes | ObjectId |
| `points` | number | yes | any number (negative values allowed by schema — deductions) |
| `reason` | string | yes | min 1, trimmed |

Note: `awardedBy` is set from `req.user.id` — it is not accepted in the request body.

- **Response**: `201`

```json
{
  "success": true,
  "data": {
    "_id": "665f3a4b5c6d7e8f9a0b1c2d",
    "studentId": "665f000000000000000000a1",
    "houseId": "665f2a3b4c5d6e7f8a9b0c1d",
    "points": 10,
    "reason": "Excellent sportsmanship at athletics day",
    "awardedBy": "665f000000000000000000c1",
    "isDeleted": false,
    "createdAt": "2026-03-31T09:15:00.000Z"
  },
  "message": "House points awarded successfully"
}
```

Returns `404` if the `houseId` does not exist or is soft-deleted.

---

#### `GET /houses/:houseId/history`

Paginated log of all point awards for a specific house, newest first.

- **Auth**: required
- **Roles**: all authenticated
- **Path param**: `houseId`
- **Query parameters**: `page`, `limit`
- **Response**: `200`

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "665f3a4b5c6d7e8f9a0b1c2d",
        "studentId": { /* full Student document */ },
        "houseId": "665f2a3b4c5d6e7f8a9b0c1d",
        "points": 10,
        "reason": "Excellent sportsmanship at athletics day",
        "awardedBy": { "_id": "...", "firstName": "Jane", "lastName": "Smith", "email": "jane@school.edu" },
        "createdAt": "2026-03-31T09:15:00.000Z"
      }
    ],
    "total": 84,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "message": "House point history retrieved successfully"
}
```

---

## 3. Frontend Pages

### 3.1 Student — Achievements (`/student/achievements`)

**File**: `src/app/(dashboard)/student/achievements/page.tsx`

**Status**: Exists. Currently wired entirely to mock data (`mockAchievements`, `mockStudentAchievements`, `mockStudents`, `mockHouses`). Needs to be wired to the live API.

**Layout** (three visual sections):

1. **House Points Banner** — Shows the current student's house name, motto, house colour, and total house points. Below it renders a 4-column grid comparing all houses ranked by points; the current student's house is highlighted with a `ring-2 ring-primary` border.

2. **Earned Badges (left column)** — Grid of achievement cards for achievements the student has already received. Each card shows an emoji icon, achievement name, description, points badge, and awarded date. Below earned items, an "Available to Earn" section renders unearned achievements in a desaturated dashed style.

3. **Top Students Leaderboard (right column)** — Ranked list of top 5 students by cumulative achievement points. The current student's row is highlighted. Rank 1/2/3 get amber/silver/bronze colouring respectively.

**Missing for API wiring**:
- Fetch current student's achievements via `GET /achievements?studentId=<id>`
- Fetch house leaderboard via `GET /houses/leaderboard`
- Fetch all achievements catalog (the "Available to Earn" section requires a known universe of possible achievements — this concept does not currently exist in the backend; the Achievement model records awarded instances, not badge templates)
- Fetch top students leaderboard (use `GET /achievements/wall-of-fame` or `GET /achievements/top-marks`)

### 3.2 Admin — Achiever Management (not yet built)

No admin page exists under `src/app/(dashboard)/admin/` for achiever management. The following pages need to be created:

- `/admin/achiever` — Overview dashboard: wall of fame, house leaderboard, recent awards
- `/admin/achiever/houses` — Manage houses (create, rename, recolour); award house points
- `/admin/achiever/awards` — Browse and create achievement records; filter by student/type/term

---

## 4. User Flows

### 4.1 Admin Creates a House

1. Admin navigates to `/admin/achiever/houses`.
2. Clicks "Add House". A form dialog opens with fields: House Name, House Colour (colour picker), Term, Year.
3. On submit the frontend calls `POST /houses` with `schoolId` from the auth store, plus form values.
4. On `201` response the new house appears in the house list and leaderboard.

### 4.2 Staff Awards House Points to a Student

1. On `/admin/achiever/houses` the teacher clicks "Award Points" next to a house.
2. A drawer/dialog opens with fields: Student (searchable student picker), Points (number, can be negative for deduction), Reason (text).
3. On submit the frontend calls `POST /houses/points` with `studentId`, `houseId`, `points`, `reason`. `awardedBy` is set server-side from the JWT.
4. The backend creates a `HousePointLog` and increments `HousePoints.totalPoints`.
5. The UI re-fetches `GET /houses/leaderboard` and updates the leaderboard standings.

### 4.3 Staff Creates an Achievement Record for a Student

1. On `/admin/achiever/awards` the teacher clicks "Add Achievement".
2. A dialog opens with fields: Student (picker), Type (academic/sport/cultural/behaviour), Title, Description, Term, Year, Category, Points, Awarded At, Public toggle.
3. On submit the frontend calls `POST /achievements`.
4. The new record appears in the filtered list.

### 4.4 Student Views Their Achievements

1. Student navigates to `/student/achievements`.
2. Page fetches `GET /achievements?studentId=<currentStudentId>` and renders earned achievements.
3. Page fetches `GET /houses/leaderboard` to render the house comparison banner.
4. Page fetches `GET /achievements/wall-of-fame` or `GET /achievements/top-marks` to render the Top Students leaderboard.
5. Student sees their rank and their house's standing.

### 4.5 Admin Views the Wall of Fame

1. Admin navigates to `/admin/achiever`.
2. Page fetches `GET /achievements/wall-of-fame?year=2026&term=1`.
3. Four sections (Academic, Sport, Cultural, Behaviour) each show up to 10 students ranked by total points.
4. Admin can switch term via a select filter without a page reload.

### 4.6 Admin Views Top Students by Marks

1. On the achiever overview, admin selects the "Top by Marks" tab.
2. Page calls `GET /achievements/top-marks?term=1&academicYear=2026`.
3. Top 10 students ranked by average assessment percentage are displayed.
4. This is read-only — no Achievement records are created.

---

## 5. Data Models

### 5.1 Achievement (backend — MongoDB)

```
_id           ObjectId
studentId     ObjectId → ref: Student (populated on reads)
schoolId      ObjectId → ref: School
type          "academic" | "sport" | "cultural" | "behaviour"
title         string (required, trimmed)
description   string (optional)
term          number (int ≥ 1)
year          number (int ≥ 2000)
category      string (optional, trimmed) — sub-label e.g. "mathematics"
points        number (default 0, ≥ 0)
awardedBy     ObjectId → ref: User (populated: firstName, lastName, email)
awardedAt     Date (default: Date.now)
isPublic      boolean (default true)
isDeleted     boolean (default false) — soft-delete flag
createdAt     Date (auto)
updatedAt     Date (auto)
```

Indexes: `{ schoolId, type }`, `{ studentId, year }`

### 5.2 HousePoints (backend — MongoDB)

```
_id           ObjectId
schoolId      ObjectId → ref: School
houseName     string (required, trimmed)
houseColor    string (required, trimmed) — any CSS colour value
totalPoints   number (default 0) — running total, maintained by addHousePointLog
term          number (int ≥ 1)
year          number (int ≥ 2000)
isDeleted     boolean (default false)
createdAt     Date (auto)
updatedAt     Date (auto)
```

Index: `{ schoolId, year, term }`

### 5.3 HousePointLog (backend — MongoDB)

```
_id           ObjectId
studentId     ObjectId → ref: Student (populated on reads)
houseId       ObjectId → ref: HousePoints
points        number (required) — the delta awarded; negative = deduction
reason        string (required, trimmed)
awardedBy     ObjectId → ref: User (populated: firstName, lastName, email)
isDeleted     boolean (default false)
createdAt     Date (auto)
```

Index: `{ houseId, createdAt: -1 }`

### 5.4 Frontend TypeScript Types (existing, in `src/types/index.ts`)

The current types predate the backend integration and use a different shape. They must be updated or supplemented:

```ts
// Existing — matches mock data, NOT the backend model
interface Achievement {
  id: string;
  name: string;           // backend uses "title"
  description: string;
  icon: string;           // not present in backend model
  category: 'academic' | 'sports' | 'leadership' | 'service' | 'special';
  // backend: 'academic' | 'sport' | 'cultural' | 'behaviour'
  points: number;
}

interface StudentAchievement {
  id: string;
  studentId: string;
  achievementId: string;
  achievement: Achievement;
  awardedDate: string;    // backend uses "awardedAt"
  awardedBy: string;
}

interface House {
  id: string;
  name: string;           // backend uses "houseName"
  color: string;          // backend uses "houseColor"
  points: number;         // backend uses "totalPoints"
  motto?: string;         // not present in backend model
}
```

New types to add for API responses:

```ts
interface ApiAchievement {
  _id: string;
  studentId: string | PopulatedStudent;
  schoolId: string;
  type: 'academic' | 'sport' | 'cultural' | 'behaviour';
  title: string;
  description?: string;
  term: number;
  year: number;
  category?: string;
  points: number;
  awardedBy: string | { _id: string; firstName: string; lastName: string; email: string };
  awardedAt: string;
  isPublic: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiHousePoints {
  _id: string;
  schoolId: string;
  houseName: string;
  houseColor: string;
  totalPoints: number;
  term: number;
  year: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiHousePointLog {
  _id: string;
  studentId: string | PopulatedStudent;
  houseId: string;
  points: number;
  reason: string;
  awardedBy: string | { _id: string; firstName: string; lastName: string; email: string };
  isDeleted: boolean;
  createdAt: string;
}

interface WallOfFameEntry {
  _id: string;
  totalPoints: number;
  achievementCount: number;
  student: PopulatedStudent;
}

interface WallOfFame {
  academic: WallOfFameEntry[];
  sport: WallOfFameEntry[];
  cultural: WallOfFameEntry[];
  behaviour: WallOfFameEntry[];
}

interface TopMarkEntry {
  _id: string;
  averagePercentage: number;
  totalMarks: number;
  student: PopulatedStudent;
}
```

---

## 6. State Management

The project uses Zustand (see `src/stores/useAuthStore.ts` as the pattern). A new store file `src/stores/useAchieverStore.ts` should be created following this pattern.

### `useAchieverStore`

```ts
interface AchieverState {
  // Achievements
  achievements: ApiAchievement[];
  achievementsTotal: number;
  achievementsPage: number;
  achievementsLoading: boolean;
  achievementsError: string | null;

  // Wall of Fame
  wallOfFame: WallOfFame | null;
  wallOfFameLoading: boolean;

  // Top by Marks
  topMarks: TopMarkEntry[];
  topMarksLoading: boolean;

  // Houses
  houses: ApiHousePoints[];
  housesLoading: boolean;

  // House leaderboard (same data, sorted by totalPoints desc)
  leaderboard: ApiHousePoints[];
  leaderboardLoading: boolean;

  // House point history
  houseHistory: ApiHousePointLog[];
  houseHistoryTotal: number;
  houseHistoryLoading: boolean;

  // Actions
  fetchAchievements: (params: AchievementListParams) => Promise<void>;
  createAchievement: (data: CreateAchievementInput) => Promise<void>;
  updateAchievement: (id: string, data: UpdateAchievementInput) => Promise<void>;
  deleteAchievement: (id: string) => Promise<void>;

  fetchWallOfFame: (schoolId: string, year: number, term?: number) => Promise<void>;
  fetchTopMarks: (schoolId: string, term: number, academicYear: number) => Promise<void>;

  fetchHouses: (schoolId: string, year: number, term?: number) => Promise<void>;
  fetchLeaderboard: (schoolId: string, year: number, term?: number) => Promise<void>;
  createHouse: (data: CreateHousePointsInput) => Promise<void>;
  updateHouse: (id: string, data: UpdateHousePointsInput) => Promise<void>;

  awardHousePoints: (data: AddHousePointLogInput) => Promise<void>;
  fetchHouseHistory: (houseId: string, page?: number, limit?: number) => Promise<void>;
}
```

**Key behaviours**:
- `awardHousePoints` should optimistically update the matching house's `totalPoints` in `houses` and `leaderboard` before the API call resolves, then re-fetch the leaderboard on success to get the authoritative sort order.
- `deleteAchievement` uses soft-delete — remove the item from local `achievements` array on success without re-fetching the full list.
- Term and year filters should be held as local component state (not in the store) and passed into fetch actions; the store holds only the last-fetched result.

---

## 7. Components Needed

All components should live under `src/components/achiever/` unless they are generic enough to be shared.

### 7.1 `AchievementCard`

Props: `achievement: ApiAchievement`, `onEdit?: () => void`, `onDelete?: () => void`

Renders a single achievement record. Shows type badge (colour-coded), title, description, category pill, points, awarded date, and the awarding staff member's name. Edit/delete actions visible only to admin/teacher roles.

### 7.2 `AchievementForm`

Props: `initial?: Partial<CreateAchievementInput>`, `onSubmit: (data) => void`, `loading: boolean`

A controlled form (react-hook-form + Zod) covering all createAchievementSchema fields. Student picker is a searchable combobox (fetches from the Student module). Type selector maps to the four enum values. Points defaults to 0.

### 7.3 `BadgeGrid`

Props: `earned: ApiAchievement[]`, `available?: Achievement[]`

Renders earned achievements in a responsive grid with full opacity, and unearned items below in a muted/dashed state. Used on the student page.

### 7.4 `HouseLeaderboard`

Props: `houses: ApiHousePoints[]`, `highlightHouseId?: string`

Renders houses sorted by `totalPoints` descending. Each row shows rank, house name (coloured by `houseColor`), and point total. The `highlightHouseId` row gets a visual highlight (used on student page to highlight their own house).

### 7.5 `HouseCard`

Props: `house: ApiHousePoints`, `rank: number`, `onAwardPoints?: () => void`, `onEdit?: () => void`

Card-based representation of a house. Used on the admin houses management page. Shows house name with a swatch of `houseColor`, total points, term/year. Admin-only action buttons.

### 7.6 `AwardPointsForm`

Props: `houseId: string`, `onSubmit: (data: AddHousePointLogInput) => void`, `loading: boolean`

Compact form for awarding house points to a specific house. Contains a student picker (`studentId`), numeric points input, and reason textarea.

### 7.7 `HousePointHistory`

Props: `logs: ApiHousePointLog[]`, `total: number`, `page: number`, `onPageChange: (page: number) => void`, `loading: boolean`

Paginated table of `HousePointLog` records. Columns: Date, Student, Points (positive green / negative red), Reason, Awarded By. Used on the house detail/history view.

### 7.8 `WallOfFame`

Props: `data: WallOfFame`, `loading: boolean`

Four-tab or four-section layout (Academic / Sport / Cultural / Behaviour). Each section renders up to 10 students with rank medal, student name, achievement count, and total points. Rank 1–3 get gold/silver/bronze treatment.

### 7.9 `TopMarksList`

Props: `entries: TopMarkEntry[]`, `loading: boolean`

Ranked list of top students by average mark percentage. Columns: Rank, Student Name, Class, Average %, Assessments Counted.

### 7.10 `TermYearFilter`

Props: `term: number`, `year: number`, `onTermChange: (t: number) => void`, `onYearChange: (y: number) => void`

Reusable filter row used on admin achiever pages. Term is a select (1–4), year is a numeric input or select of recent years.

---

## 8. Integration Notes

### 8.1 Academic Module

`GET /achievements/top-marks` queries `Mark` and `Assessment` collections from the Academic module. It matches marks by `schoolId`, then joins assessments to filter by `term` and `academicYear`. The `assessment.academicYear` field must be set correctly in the Academic module for this cross-query to return results. The Achiever frontend should allow filtering by the same `term` and `academicYear` values that exist in the Academic module.

### 8.2 Student Module

The `Achievement` and `HousePointLog` models both reference `Student` documents via `studentId`. All populated reads return the full Student document. The student picker component in `AchievementForm` and `AwardPointsForm` should query the Student module (`GET /students`) with a search term. The student's `houseId` field (on the Student model) links the student to a `HousePoints` document — this is the source of truth used on the student achievements page to display "your house".

### 8.3 House Membership

The backend does not have a dedicated endpoint to look up which house a student belongs to. The student's `house` / `houseId` field on the Student document is the canonical source. The student achievements page currently reads `currentStudent.house` from mock data; in production this comes from the student profile fetched via the Student module or the auth/session context.

### 8.4 Badge Templates vs. Awarded Instances

The backend `Achievement` model records **awarded instances** — every row is a concrete award to a specific student. There is no separate "badge template" collection. The "Available to Earn" section shown on the student frontend page (`mockAchievements`) has no backend equivalent. Options to resolve this:

1. Drop the "Available to Earn" section from the UI (simplest).
2. Introduce a `BadgeTemplate` model in the backend (out of scope for this module, requires a schema change).
3. Hardcode a static list of badge templates on the frontend as a config file.

The preferred approach should be agreed before wiring the student page.

### 8.5 School Scoping

All list/query endpoints accept `schoolId` as an optional query param and fall back to `req.user.schoolId` from the JWT. Frontend calls do not need to pass `schoolId` explicitly as long as the user is authenticated with a school-scoped token. For `super_admin` users who are not tied to a single school, `schoolId` must always be passed explicitly.

### 8.6 Route Ordering (wall-of-fame, top-marks)

The routes `GET /achievements/wall-of-fame` and `GET /achievements/top-marks` are registered **before** `GET /achievements/:id` in `routes.ts`. Express matches routes in declaration order, so the static paths `wall-of-fame` and `top-marks` take priority over the `:id` wildcard. This is already correct in the backend and does not require any frontend consideration, but it is worth noting if new static sub-routes are added in future.

### 8.7 Points Can Be Negative

The `addHousePointLogSchema` specifies `points: z.number()` with no minimum — negative values are permitted. The UI should not artificially restrict this to positive numbers. The `HousePointHistory` component should render negative values in red to make deductions visually distinct.

---

## 9. Acceptance Criteria

### Achievements

- [ ] Admin/teacher can create an achievement for any student via the UI; the record appears immediately in the achievement list.
- [ ] The achievement list can be filtered by `type`, `year`, `term`, and `studentId`; filters update results without a full page reload.
- [ ] Admin can edit any achievement field; changes persist after a page refresh.
- [ ] Admin (not teacher) can soft-delete an achievement; deleted records do not appear in any list.
- [ ] Single achievement fetch (`GET /achievements/:id`) returns the full populated document.
- [ ] Student can view all their own earned achievements on `/student/achievements`.

### Wall of Fame

- [ ] Wall of Fame renders four sections (academic, sport, cultural, behaviour), each with up to 10 students ranked by cumulative points.
- [ ] Wall of Fame can be filtered by year and optionally term; the filter updates all four sections simultaneously.
- [ ] Students with zero points do not appear in the Wall of Fame sections.

### Top by Marks

- [ ] Top by Marks endpoint returns up to 10 students ranked by average mark percentage.
- [ ] The endpoint returns `400` if `term` or `academicYear` is missing.
- [ ] The admin UI shows "Top by Marks" ranked list with average percentage displayed to one decimal place.

### Houses

- [ ] Admin can create a new house with a name, colour, term, and year.
- [ ] Admin can update a house's name and colour.
- [ ] House leaderboard renders all houses for the current year sorted by `totalPoints` descending.
- [ ] Staff can award house points to a student with a mandatory reason; the house's `totalPoints` reflects the increment immediately in the UI.
- [ ] Negative points (deductions) are accepted and reduce `totalPoints` accordingly.
- [ ] House point history is paginated; navigating pages loads the correct slice without re-fetching the full history.
- [ ] The `awardedBy` field on a `HousePointLog` is always the authenticated user — it cannot be spoofed via the request body.

### Student Page

- [ ] Student sees their house name, colour, and total points in the banner.
- [ ] All four houses are shown in the banner comparison grid, ranked by points.
- [ ] The current student's house is highlighted in the grid.
- [ ] Student sees their rank in the Top Students leaderboard; their own row is visually distinct.
- [ ] Page is fully wired to live API data; no mock data is imported or used.

### General

- [ ] All API calls attach the `Authorization: Bearer <token>` header via the shared `apiClient`.
- [ ] Token expiry triggers a silent refresh; if refresh fails the user is redirected to `/login`.
- [ ] Loading skeletons are shown during data fetches; errors are surfaced as toast notifications or inline error states.
- [ ] All forms validate client-side using the same Zod schemas mirrored from the backend before submitting.
- [ ] `super_admin` users must always pass an explicit `schoolId` query param; all other roles rely on the token fallback.
