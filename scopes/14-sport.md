# 14 — Sport Module

## 1. Module Overview

The Sport module manages the full lifecycle of school sport: teams, fixtures, seasons, player availability, match results, season standings, and MVP voting. It is an admin-managed module with read access for all authenticated users.

The module is built around six core resources:

| Resource | Collection | Description |
|---|---|---|
| SportTeam | `SportTeam` | A school sport team with a roster of students |
| SportFixture | `SportFixture` | A scheduled match between a team and an opponent |
| Season | `Season` | A time-bounded competition period for a sport |
| PlayerAvailability | `PlayerAvailability` | A student's status (available / unavailable / injured) for a specific fixture |
| MatchResult | `MatchResult` | The score, scorers, and man-of-the-match for a completed fixture |
| MvpVote | `MvpVote` | A single user's vote for the MVP of a fixture |
| SeasonStanding | `SeasonStanding` | Computed league table row per team per season |

All collections use soft-delete (`isDeleted: boolean`). All write endpoints require `super_admin` or `school_admin` role, except player availability and MVP voting which are open to any authenticated user.

The admin nav entry is `{ label: 'Sport', href: '/admin/sport', icon: Trophy }` — defined in `src/lib/constants.ts`. No parent or student sport pages exist yet; the frontend work is confined to the admin portal.

---

## 2. Backend API Endpoints

All routes are mounted under `/api/sport` (assumed prefix). The base URL is `http://localhost:4000` in development.

Authentication is enforced by the `authenticate` middleware (JWT bearer token in `Authorization` header). Role restriction uses the `authorize` middleware.

---

### 2.1 Teams

#### POST /sport/teams
Create a new sport team.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "name": "string (required, min 1)",
  "schoolId": "string (required, ObjectId 24-hex)",
  "sport": "string (required, min 1)",
  "ageGroup": "string (optional)",
  "coachId": "string (optional, ObjectId)",
  "playerIds": ["string (optional, array of ObjectId)"],
  "isActive": "boolean (optional, default true)"
}
```

**Validation:** `createTeamSchema` (Zod)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "U15 Soccer",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "sport": "Soccer",
    "ageGroup": "U15",
    "coachId": { "_id": "...", "firstName": "John", "lastName": "Smith", "email": "j.smith@school.com" },
    "playerIds": [],
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Sport team created successfully"
}
```

---

#### GET /sport/teams
List all teams (paginated). Supports filtering by school and sport.

**Auth:** Required — any authenticated user

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page |
| `sort` | string | Sort field (default `-createdAt`) |
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId`) |
| `sport` | string | Filter by sport name |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "teams": [ /* array of team objects with populated coachId and playerIds */ ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Sport teams retrieved successfully"
}
```

**Populated fields:** `coachId` → `firstName lastName email`; `playerIds` → full Student documents.

---

#### GET /sport/teams/:id
Get a single team by ID.

**Auth:** Required — any authenticated user

**Response 200:** Single team object (same shape as create response), with `coachId` and `playerIds` populated.

**Error 404:** `{ "success": false, "message": "Sport team not found" }`

---

#### PUT /sport/teams/:id
Update a team.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:** All fields from `createTeamSchema` are optional, except `schoolId` cannot be changed (not present in `updateTeamSchema`):
```json
{
  "name": "string (optional)",
  "sport": "string (optional)",
  "ageGroup": "string (optional)",
  "coachId": "string (optional, ObjectId)",
  "playerIds": ["string (optional, array of ObjectId)"],
  "isActive": "boolean (optional)"
}
```

**Response 200:** Updated team object.

---

#### DELETE /sport/teams/:id
Soft-delete a team (sets `isDeleted: true`).

**Auth:** Required — `super_admin` or `school_admin`

**Response 200:**
```json
{
  "success": true,
  "data": null,
  "message": "Sport team deleted successfully"
}
```

---

### 2.2 Fixtures

#### POST /sport/fixtures
Schedule a new fixture.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "teamId": "string (required, ObjectId)",
  "schoolId": "string (required, ObjectId)",
  "opponent": "string (required, min 1)",
  "date": "string (required, ISO 8601 datetime)",
  "time": "string (required, min 1, e.g. '14:30')",
  "venue": "string (required, min 1)",
  "isHome": "boolean (optional, default true)",
  "result": "string (optional, free-text summary)",
  "notes": "string (optional)"
}
```

**Validation:** `createFixtureSchema` (Zod) — `date` uses `z.string().datetime()`.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "teamId": { "_id": "...", "name": "U15 Soccer", "sport": "Soccer" },
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "opponent": "Greenfields High",
    "date": "2026-04-15T00:00:00.000Z",
    "time": "14:30",
    "venue": "Home Ground",
    "isHome": true,
    "result": null,
    "notes": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Sport fixture created successfully"
}
```

---

#### GET /sport/fixtures
List all fixtures (paginated). Sorted by `date` descending by default.

**Auth:** Required — any authenticated user

**Query params:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Results per page |
| `sort` | string | Sort field (default `-date`) |
| `schoolId` | string | Filter by school (falls back to `req.user.schoolId`) |
| `teamId` | string | Filter by team |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "fixtures": [ /* fixture objects with teamId populated (name, sport) */ ],
    "total": 24,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "message": "Sport fixtures retrieved successfully"
}
```

---

#### GET /sport/fixtures/:id
Get a single fixture.

**Auth:** Required — any authenticated user

**Response 200:** Single fixture with `teamId` populated (`name`, `sport`).

---

#### PUT /sport/fixtures/:id
Update a fixture. `teamId` and `schoolId` cannot be changed after creation.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "opponent": "string (optional)",
  "date": "string (optional, ISO 8601 datetime)",
  "time": "string (optional)",
  "venue": "string (optional)",
  "isHome": "boolean (optional)",
  "result": "string (optional)",
  "notes": "string (optional)"
}
```

**Response 200:** Updated fixture object.

---

#### DELETE /sport/fixtures/:id
Soft-delete a fixture.

**Auth:** Required — `super_admin` or `school_admin`

**Response 200:** `{ "success": true, "data": null, "message": "Sport fixture deleted successfully" }`

---

### 2.3 Seasons

#### POST /sport/seasons
Create a new season.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "name": "string (required, min 1, e.g. '2026 Winter League')",
  "schoolId": "string (required, ObjectId)",
  "sport": "string (required, min 1)",
  "startDate": "string (required, ISO 8601 datetime)",
  "endDate": "string (required, ISO 8601 datetime)",
  "isActive": "boolean (optional, default true)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
    "name": "2026 Winter League",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "sport": "Soccer",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2026-07-31T00:00:00.000Z",
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Season created successfully"
}
```

---

#### GET /sport/seasons
List seasons (paginated). Sorted by `startDate` descending.

**Auth:** Required — any authenticated user

**Query params:** `page`, `limit`, `sort`, `schoolId`, `sport`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "seasons": [ /* array of season objects */ ],
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "message": "Seasons retrieved successfully"
}
```

---

#### GET /sport/seasons/:id
Get a single season.

**Auth:** Required — any authenticated user

---

#### PUT /sport/seasons/:id
Update a season. `schoolId` cannot be changed.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "name": "string (optional)",
  "sport": "string (optional)",
  "startDate": "string (optional, ISO 8601 datetime)",
  "endDate": "string (optional, ISO 8601 datetime)",
  "isActive": "boolean (optional)"
}
```

---

#### DELETE /sport/seasons/:id
Soft-delete a season.

**Auth:** Required — `super_admin` or `school_admin`

---

### 2.4 Player Availability

#### POST /sport/fixtures/:fixtureId/availability
Record or update a player's availability for a fixture. If a record already exists for the `(fixtureId, studentId)` pair, it is updated in place (upsert behaviour).

**Auth:** Required — any authenticated user

**Route param:** `fixtureId` is injected from the URL; the body value is overridden by it in the controller.

**Request body:**
```json
{
  "studentId": "string (required, ObjectId)",
  "schoolId": "string (required, ObjectId)",
  "status": "string (required, enum: 'available' | 'unavailable' | 'injured')",
  "parentConfirmed": "boolean (optional, default false)",
  "notes": "string (optional)"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d4",
    "fixtureId": { /* populated SportFixture */ },
    "studentId": { /* populated Student */ },
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "status": "available",
    "parentConfirmed": false,
    "notes": null,
    "isDeleted": false,
    "createdAt": "2026-03-31T08:00:00.000Z",
    "updatedAt": "2026-03-31T08:00:00.000Z"
  },
  "message": "Player availability recorded successfully"
}
```

---

#### GET /sport/fixtures/:fixtureId/availability
Get all player availability records for a fixture.

**Auth:** Required — any authenticated user

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "fixtureId": { /* populated */ },
      "studentId": { /* populated Student */ },
      "status": "available",
      "parentConfirmed": true,
      "notes": null
    }
  ],
  "message": "Fixture availability retrieved successfully"
}
```

---

### 2.5 Match Results

#### POST /sport/fixtures/:fixtureId/result
Record the result for a completed fixture. Only one result per fixture is allowed; attempting to create a second returns a 400 error.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "schoolId": "string (required, ObjectId)",
  "homeScore": "number (required, integer >= 0)",
  "awayScore": "number (required, integer >= 0)",
  "scorers": [
    { "studentId": "string (ObjectId)", "goals": "number (integer >= 0)" }
  ],
  "manOfTheMatch": "string (optional, ObjectId)",
  "notes": "string (optional)"
}
```

Note: `fixtureId` is injected from the route parameter in the controller, overriding any body value.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d5",
    "fixtureId": { /* populated SportFixture */ },
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "homeScore": 3,
    "awayScore": 1,
    "scorers": [
      { "studentId": { /* populated Student */ }, "goals": 2 },
      { "studentId": { /* populated Student */ }, "goals": 1 }
    ],
    "manOfTheMatch": { /* populated Student */ },
    "notes": "Strong first half performance.",
    "isDeleted": false,
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  },
  "message": "Match result created successfully"
}
```

**Error 400 (duplicate):** `{ "success": false, "message": "Match result already exists for this fixture" }`

---

#### PUT /sport/fixtures/:fixtureId/result
Update an existing match result.

**Auth:** Required — `super_admin` or `school_admin`

**Request body:**
```json
{
  "homeScore": "number (optional, integer >= 0)",
  "awayScore": "number (optional, integer >= 0)",
  "scorers": [ { "studentId": "ObjectId", "goals": "number" } ],
  "manOfTheMatch": "string (optional, ObjectId)",
  "notes": "string (optional)"
}
```

**Response 200:** Updated result object with `scorers.studentId`, `manOfTheMatch`, and `fixtureId` populated.

---

#### GET /sport/fixtures/:fixtureId/result
Get the result for a fixture.

**Auth:** Required — any authenticated user

**Response 200:** Result object with `scorers.studentId`, `manOfTheMatch`, and `fixtureId` populated.

**Error 404:** `{ "success": false, "message": "Match result not found" }`

---

### 2.6 Season Standings

#### GET /sport/seasons/:seasonId/standings
Get the league table for a season. Optionally trigger a full recalculation.

**Auth:** Required — any authenticated user

**Query params:**
| Param | Type | Description |
|---|---|---|
| `recalculate` | `'true'` | If present, recomputes standings from all fixture results within the season date range before returning |

**Recalculation logic:**
1. Find all `SportFixture` records for the season's `schoolId` where `date` is between `startDate` and `endDate`.
2. Find all `MatchResult` records for those fixture IDs.
3. For each result, determine the team's score based on `fixture.isHome` (home team score = `homeScore`, away = `awayScore`).
4. Award 3 points for win, 1 for draw, 0 for loss.
5. Upsert `SeasonStanding` records and return them sorted by `points DESC, goalsFor DESC`.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "seasonId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "teamId": { "_id": "...", "name": "U15 Soccer", "sport": "Soccer" },
      "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
      "played": 8,
      "won": 5,
      "drawn": 2,
      "lost": 1,
      "goalsFor": 14,
      "goalsAgainst": 7,
      "points": 17,
      "isDeleted": false
    }
  ],
  "message": "Season standings retrieved successfully"
}
```

---

### 2.7 MVP Voting

#### POST /sport/fixtures/:fixtureId/mvp
Cast a single MVP vote for a player in a fixture. One vote per `(fixtureId, voterId)` — a second attempt returns 400.

**Auth:** Required — any authenticated user. The `voterId` is set from `req.user.id` in the controller; any `voterId` in the request body is overridden.

**Request body:**
```json
{
  "studentId": "string (required, ObjectId — the student being voted for)",
  "schoolId": "string (required, ObjectId)"
}
```

Note: `fixtureId` comes from the route param; `voterId` comes from the authenticated user.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d6",
    "fixtureId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "voterId": "64f1a2b3c4d5e6f7a8b9c000",
    "studentId": "64f1a2b3c4d5e6f7a8b9c0e1",
    "schoolId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "isDeleted": false,
    "createdAt": "2026-03-31T11:00:00.000Z",
    "updatedAt": "2026-03-31T11:00:00.000Z"
  },
  "message": "MVP vote cast successfully"
}
```

**Error 400 (duplicate):** `{ "success": false, "message": "You have already voted for this fixture" }`

---

#### GET /sport/fixtures/:fixtureId/mvp
Get the aggregated MVP vote tally for a fixture, sorted by vote count descending.

**Auth:** Required — any authenticated user

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "studentId": "64f1a2b3c4d5e6f7a8b9c0e1", "votes": 7 },
    { "studentId": "64f1a2b3c4d5e6f7a8b9c0e2", "votes": 3 }
  ],
  "message": "MVP results retrieved successfully"
}
```

Note: `studentId` values in this response are raw ObjectId strings (not populated), as the aggregation pipeline projects them directly.

---

## 3. Frontend Pages

### 3.1 Admin Sport Page
**Route:** `/admin/sport`
**File:** `src/app/(dashboard)/admin/sport/page.tsx` (to be created — directory exists, empty)

This is the sole dedicated frontend page for the sport module. The admin nav entry is already wired in `constants.ts` with `{ label: 'Sport', href: ROUTES.ADMIN_SPORT, icon: Trophy }`.

The page must cover all entities admin users need to manage:

| Tab | Content |
|---|---|
| Teams | List of all teams; create/edit/delete team; add/remove players; assign coach |
| Fixtures | Fixture calendar and list; schedule new fixture; edit/delete fixture |
| Seasons | Seasons list; create/edit season; view standings table per season |
| Results | Record or edit match results against completed fixtures |

No parent, student, or teacher sport pages are currently defined in the codebase. The scope below covers the admin page only.

---

## 4. User Flows

### 4.1 Create a Team
1. Admin opens `/admin/sport`, navigates to the **Teams** tab.
2. Clicks **New Team** — a dialog or drawer opens.
3. Fills in: Name, Sport (free text), Age Group (optional), Coach (user search/select), Player list (student multi-select).
4. Submits → `POST /sport/teams`.
5. On success: toast "Sport team created successfully", team appears in list.
6. On error: inline field validation errors shown beneath each field.

### 4.2 Edit a Team / Manage Roster
1. Admin clicks a team row or an **Edit** button.
2. Team detail drawer/dialog opens pre-populated.
3. Admin can add/remove players from `playerIds` array or reassign the coach.
4. Submits → `PUT /sport/teams/:id`.
5. On success: toast "Sport team updated successfully", list refreshes.

### 4.3 Schedule a Fixture
1. Admin navigates to the **Fixtures** tab.
2. Clicks **New Fixture**.
3. Selects Team from dropdown (pre-filtered to the school), enters Opponent, Date, Time, Venue, Home/Away toggle.
4. Submits → `POST /sport/fixtures`.
5. On success: fixture appears in calendar/list view.

### 4.4 Record a Match Result
1. Fixture must exist and its date must have passed.
2. Admin selects a fixture from the list, clicks **Record Result**.
3. Enters Home Score, Away Score, selects goal scorers with goal counts from team's player list, optionally selects Man of the Match, adds notes.
4. Submits → `POST /sport/fixtures/:fixtureId/result`.
5. On success: fixture row updates to show score; result stored.
6. If result already exists, admin is presented an **Edit Result** option that uses `PUT /sport/fixtures/:fixtureId/result`.

### 4.5 Manage Player Availability
1. Admin (or team coach in a future coach portal) opens a fixture's detail view.
2. For each player in the team, their current availability status is shown (fetched from `GET /sport/fixtures/:fixtureId/availability`).
3. Admin can set a player's status to `available`, `unavailable`, or `injured`, mark `parentConfirmed`, and add a note.
4. Submit → `POST /sport/fixtures/:fixtureId/availability` (upserts).

### 4.6 Create a Season and View Standings
1. Admin navigates to the **Seasons** tab.
2. Clicks **New Season**, enters Name, Sport, Start Date, End Date.
3. Submits → `POST /sport/seasons`.
4. To view standings, admin clicks a season row → season standings page/panel loads via `GET /sport/seasons/:seasonId/standings`.
5. Admin can click **Recalculate** to recompute from fixture results: `GET /sport/seasons/:seasonId/standings?recalculate=true`.

### 4.7 MVP Voting
1. After a result is recorded, any authenticated user (parent, student, teacher) can open the fixture detail and vote for the MVP.
2. UI shows the team's player list as a vote option grid.
3. User clicks a player → `POST /sport/fixtures/:fixtureId/mvp` with `studentId` and `schoolId`.
4. Vote tally updates in real-time from `GET /sport/fixtures/:fixtureId/mvp`.
5. A user who has already voted sees their vote highlighted; a second vote attempt shows an error toast ("You have already voted for this fixture").

---

## 5. Data Models

### 5.1 SportTeam
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | string | yes | Trimmed |
| `schoolId` | ObjectId → School | yes | |
| `sport` | string | yes | Free text (e.g. "Soccer", "Cricket") |
| `ageGroup` | string | no | e.g. "U15", "Open" |
| `coachId` | ObjectId → User | no | Populated as `firstName lastName email` |
| `playerIds` | ObjectId[] → Student | no | Defaults to `[]`; fully populated in responses |
| `isActive` | boolean | no | Defaults `true` |
| `isDeleted` | boolean | no | Defaults `false`; soft-delete |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, sport }`, `{ schoolId, isActive }`

---

### 5.2 SportFixture
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `teamId` | ObjectId → SportTeam | yes | Populated as `name sport` |
| `schoolId` | ObjectId → School | yes | |
| `opponent` | string | yes | Name of the opposing team/school |
| `date` | Date | yes | Match date |
| `time` | string | yes | Display time string, e.g. "14:30" |
| `venue` | string | yes | Location |
| `isHome` | boolean | no | Defaults `true` |
| `result` | string | no | Free-text summary (separate from MatchResult document) |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ teamId, date DESC }`, `{ schoolId, date DESC }`

---

### 5.3 Season
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | string | yes | e.g. "2026 Winter League" |
| `schoolId` | ObjectId → School | yes | |
| `sport` | string | yes | Must match the sport field on fixtures/teams for standings |
| `startDate` | Date | yes | Season start boundary for standings recalculation |
| `endDate` | Date | yes | Season end boundary |
| `isActive` | boolean | no | Defaults `true` |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ schoolId, sport }`, `{ schoolId, isActive }`

---

### 5.4 PlayerAvailability
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `fixtureId` | ObjectId → SportFixture | yes | |
| `studentId` | ObjectId → Student | yes | |
| `schoolId` | ObjectId → School | yes | |
| `status` | enum | yes | `'available'` \| `'unavailable'` \| `'injured'` |
| `parentConfirmed` | boolean | no | Defaults `false` |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ fixtureId, studentId }`, `{ schoolId, fixtureId }`

**Upsert behaviour:** If a record exists for `(fixtureId, studentId)`, the POST endpoint updates it rather than creating a duplicate.

---

### 5.5 MatchResult
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `fixtureId` | ObjectId → SportFixture | yes | Unique — one result per fixture |
| `schoolId` | ObjectId → School | yes | |
| `homeScore` | number | yes | Integer >= 0 |
| `awayScore` | number | yes | Integer >= 0 |
| `scorers` | `{ studentId: ObjectId, goals: number }[]` | no | Defaults `[]`; studentId populated in responses |
| `manOfTheMatch` | ObjectId → Student | no | Populated in responses |
| `notes` | string | no | |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Index:** `{ schoolId }`

**Constraint:** `fixtureId` is unique — enforced at schema level and checked in service with a `BadRequestError`.

---

### 5.6 SeasonStanding
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `seasonId` | ObjectId → Season | yes | |
| `teamId` | ObjectId → SportTeam | yes | Populated as `name sport` in responses |
| `schoolId` | ObjectId → School | yes | |
| `played` | number | no | Defaults `0` |
| `won` | number | no | Defaults `0` |
| `drawn` | number | no | Defaults `0` |
| `lost` | number | no | Defaults `0` |
| `goalsFor` | number | no | Defaults `0` |
| `goalsAgainst` | number | no | Defaults `0` |
| `points` | number | no | Defaults `0`; 3 per win, 1 per draw |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ seasonId, teamId }`, `{ seasonId, points DESC }`

---

### 5.7 MvpVote
| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `fixtureId` | ObjectId → SportFixture | yes | |
| `voterId` | ObjectId → User | yes | Set from authenticated user in controller |
| `studentId` | ObjectId → Student | yes | The player being voted for |
| `schoolId` | ObjectId → School | yes | |
| `isDeleted` | boolean | no | Defaults `false` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

**Indexes:** `{ fixtureId, voterId }` (unique — one vote per user per fixture), `{ fixtureId, studentId }`

---

## 6. State Management

The Sport module currently has no Zustand store or React Query setup in the codebase. Based on the existing patterns (see `src/lib/api-client.ts`, page-level `useState` hooks, and `mock-data.ts`), state should be managed as follows until a dedicated store is introduced.

### 6.1 Recommended Store: `useSportStore`

A Zustand store at `src/stores/sport.ts` should hold:

```ts
interface SportStore {
  // Teams
  teams: SportTeam[];
  teamsLoading: boolean;
  teamsError: string | null;

  // Fixtures
  fixtures: SportFixture[];
  fixturesLoading: boolean;
  fixturesError: string | null;

  // Active fixture (for result/availability panels)
  activeFixture: SportFixture | null;

  // Seasons
  seasons: Season[];
  seasonsLoading: boolean;

  // Active season (for standings)
  activeSeason: Season | null;
  standings: SeasonStanding[];
  standingsLoading: boolean;

  // Match results (keyed by fixtureId)
  results: Record<string, MatchResult>;

  // Player availability (keyed by fixtureId)
  availability: Record<string, PlayerAvailability[]>;

  // MVP (keyed by fixtureId)
  mvpResults: Record<string, { studentId: string; votes: number }[]>;

  // Actions
  fetchTeams: (schoolId: string) => Promise<void>;
  createTeam: (data: CreateTeamInput) => Promise<void>;
  updateTeam: (id: string, data: UpdateTeamInput) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;

  fetchFixtures: (schoolId: string, teamId?: string) => Promise<void>;
  createFixture: (data: CreateFixtureInput) => Promise<void>;
  updateFixture: (id: string, data: UpdateFixtureInput) => Promise<void>;
  deleteFixture: (id: string) => Promise<void>;

  fetchSeasons: (schoolId: string) => Promise<void>;
  createSeason: (data: CreateSeasonInput) => Promise<void>;
  updateSeason: (id: string, data: UpdateSeasonInput) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;

  fetchStandings: (seasonId: string, recalculate?: boolean) => Promise<void>;

  fetchAvailability: (fixtureId: string) => Promise<void>;
  setAvailability: (fixtureId: string, data: CreatePlayerAvailabilityInput) => Promise<void>;

  fetchResult: (fixtureId: string) => Promise<void>;
  createResult: (fixtureId: string, data: CreateMatchResultInput) => Promise<void>;
  updateResult: (fixtureId: string, data: UpdateMatchResultInput) => Promise<void>;

  fetchMvp: (fixtureId: string) => Promise<void>;
  castMvpVote: (fixtureId: string, studentId: string, schoolId: string) => Promise<void>;
}
```

### 6.2 Short-term (Page-level) Approach
Until the store is built, each tab section uses local `useState` + `useEffect` calling `apiClient` directly, following the same pattern as the admin `page.tsx` files for lost-found, events, and transport.

Key state per tab:
- **Teams tab:** `teams`, `loadingTeams`, `teamDialogOpen`, `editingTeam`
- **Fixtures tab:** `fixtures`, `loadingFixtures`, `fixtureDialogOpen`, `editingFixture`, `activeFixtureId`
- **Seasons tab:** `seasons`, `loadingSeasons`, `activeSeason`, `standings`, `loadingStandings`
- **Results tab:** `resultsByFixtureId` (map), `resultDialogOpen`, `editingResult`

---

## 7. Components Needed

### 7.1 Page-level (to create in `src/app/(dashboard)/admin/sport/page.tsx`)

| Component | Description |
|---|---|
| `AdminSportPage` | Root page component with tabs: Teams, Fixtures, Seasons, Results |

### 7.2 Shared sub-components (can be colocated in the page file or extracted to `src/components/sport/`)

| Component | Props / Responsibilities |
|---|---|
| `TeamList` | Renders a `DataTable` of `SportTeam[]`. Columns: Name, Sport, Age Group, Coach, Player Count, Active, Actions (Edit, Delete). |
| `TeamFormDialog` | Dialog with form to create/edit a team. Fields: Name, Sport, Age Group, Coach (user select), Players (student multi-select), Is Active. Uses `react-hook-form` + Zod (`createTeamSchema` / `updateTeamSchema`). |
| `TeamCard` | Card variant showing team summary (name, sport, badge for age group, player count, coach name) for a grid layout alternative. |
| `FixtureList` | `DataTable` of `SportFixture[]`. Columns: Team, Opponent, Date, Time, Venue, Home/Away badge, Result, Actions. |
| `FixtureFormDialog` | Dialog to create/edit a fixture. Fields: Team (select), Opponent, Date, Time, Venue, Home/Away toggle, Notes. |
| `FixtureCalendar` | Month/week calendar view of fixtures. Each fixture shown as an event chip with team name and opponent. Clicking opens the fixture detail panel. |
| `FixtureDetailPanel` | Side panel / sheet showing a single fixture's details, availability list, result entry, and MVP voting. |
| `PlayerAvailabilityList` | Table within `FixtureDetailPanel`. Rows per player in the team, showing current status (`available` / `unavailable` / `injured`), parent confirmation, and an inline status selector. |
| `ResultEntryForm` | Form inside `FixtureDetailPanel` for recording / editing a match result. Fields: Home Score, Away Score, Scorers (repeating rows: player select + goals), Man of the Match (player select), Notes. |
| `ScoreDisplay` | Read-only badge/pill showing `homeScore – awayScore` for a fixture in the list view. |
| `SeasonList` | `DataTable` of `Season[]`. Columns: Name, Sport, Start Date, End Date, Active badge, Actions. |
| `SeasonFormDialog` | Dialog to create/edit a season. Fields: Name, Sport, Start Date, End Date, Is Active. |
| `StandingsTable` | League table component for a season. Columns: Pos, Team, P, W, D, L, GF, GA, GD, Pts. Sorted by points. Includes a **Recalculate** button. |
| `MvpVotePanel` | Within `FixtureDetailPanel`. Shows the team's player roster as a grid of vote cards. Each card shows the player name and current vote count. Authenticated users click to vote; voted state is persisted. |

### 7.3 Existing shared components to reuse

| Component | Path | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | Page title + description + action buttons |
| `StatCard` | `src/components/shared/StatCard` | Summary stats (total teams, upcoming fixtures, etc.) |
| `DataTable` | `src/components/shared/DataTable` | All list views |
| `Button` | `src/components/ui/button` | All CTAs |
| `Badge` | `src/components/ui/badge` | Status pills, Home/Away indicator |
| `Dialog` / `DialogContent` | `src/components/ui/dialog` | All create/edit forms |
| `Tabs` / `TabsList` | `src/components/ui/tabs` | Page-level tab navigation |
| `Select` / `SelectItem` | `src/components/ui/select` | Dropdowns (team select, player select, status select) |
| `Input` / `Label` / `Textarea` | `src/components/ui/` | Form fields |
| `Card` / `CardContent` | `src/components/ui/card` | Fixture detail panel, standings card |

---

## 8. Integration Notes

### 8.1 Students → Players
`SportTeam.playerIds` references the `Student` collection. When building the TeamFormDialog player multi-select, the component must fetch students from the Student API (`GET /students?schoolId=...`) and display `firstName + lastName`. Populated `playerIds` in `GET /sport/teams/:id` responses return full Student documents.

### 8.2 Users → Coach
`SportTeam.coachId` references the `User` collection (not `Student`). The coach selector in TeamFormDialog should query staff/users, not students. Populated `coachId` returns `{ firstName, lastName, email }`.

### 8.3 Events Module
Fixtures are similar in shape to `SchoolEvent` (date, time, venue, title/opponent). The admin Events page (`/admin/events`) already handles `type: 'sports'` events. These are separate entities — `SportFixture` is the source of truth for sport scheduling; `SchoolEvent` is for the general school calendar. There is no automatic sync between them; a future integration could mirror fixture creation into the events calendar.

### 8.4 Season Standings Recalculation
The recalculation is driven entirely by `SportFixture.date` being within `Season.startDate – Season.endDate` and by `SportFixture.schoolId` matching the season's school. It does **not** filter by `sport` field at the fixture level (fixtures carry sport through their `teamId`). Admins should ensure seasons are scoped to a single sport and that fixture dates fall within season boundaries for accurate standings.

### 8.5 Auth and schoolId
All list endpoints fall back to `req.user.schoolId` when `schoolId` is not provided as a query parameter. The frontend does not need to pass `schoolId` in query params if the user's JWT already carries it; however, passing it explicitly is safer and avoids relying on the server-side fallback.

For create operations, `schoolId` must be sent in the request body — it is a required field in all create schemas.

### 8.6 MVP Vote — voterId Source
The `voterId` on an MVP vote is always set from `req.user.id` in the controller, overriding any body value. The frontend validation schema (`createMvpVoteSchema`) includes `voterId` as a required field, but for the frontend call only `studentId` and `schoolId` need to be sent; `fixtureId` is provided by the URL path.

### 8.7 API Client
All HTTP calls use the shared `apiClient` at `src/lib/api-client.ts`, which handles JWT attachment and automatic token refresh on 401 responses. No sport-specific client wrapper exists yet.

---

## 9. Acceptance Criteria

### Teams
- [ ] Admin can create a team with name, sport, optional age group, optional coach, and optional player list.
- [ ] Team list displays all non-deleted teams for the school, paginated, with search/filter by sport.
- [ ] Admin can edit any team field including adding/removing players from the roster.
- [ ] Admin can soft-delete a team; deleted teams do not appear in the list.
- [ ] Populated coach name and player count are visible in the team list.

### Fixtures
- [ ] Admin can schedule a fixture by selecting a team, entering opponent, date, time, venue, and home/away status.
- [ ] Fixture list shows all upcoming and past fixtures, sortable by date, filterable by team.
- [ ] Admin can edit fixture details (opponent, date, time, venue, home/away, notes).
- [ ] Admin can soft-delete a fixture.
- [ ] A calendar view shows fixtures plotted on their match date.

### Seasons
- [ ] Admin can create a season with name, sport, start date, end date.
- [ ] Season list shows all seasons for the school.
- [ ] Admin can mark a season active or inactive.
- [ ] Admin can soft-delete a season.

### Standings
- [ ] The standings table for a season displays P, W, D, L, GF, GA, GD, Pts per team, sorted by points.
- [ ] The **Recalculate** button triggers `?recalculate=true` and the table refreshes.
- [ ] Goal difference (GD = GF − GA) is calculated in the frontend display (not stored on the document).

### Player Availability
- [ ] For any fixture, admin can record each player's status as available, unavailable, or injured.
- [ ] Submitting a second availability record for the same (fixture, student) pair updates the existing record (no duplicate).
- [ ] Parent confirmation status is visible and editable.

### Match Results
- [ ] Admin can record a result after a fixture is created, entering home score, away score, individual scorers with goal counts, and man of the match.
- [ ] Only one result per fixture is allowed; attempting a second create shows an error.
- [ ] Admin can edit an existing result via `PUT /sport/fixtures/:fixtureId/result`.
- [ ] Scored result is visible in the fixture list as a score badge.

### MVP Voting
- [ ] Any authenticated user can cast one MVP vote per fixture.
- [ ] A second vote attempt for the same fixture shows an error toast ("You have already voted for this fixture").
- [ ] The MVP vote tally is visible on the fixture detail view, showing each candidate and their vote count.
- [ ] The leading vote-getter is highlighted.

### General
- [ ] All forms use `react-hook-form` with Zod validation matching the backend schemas.
- [ ] All API errors surface as toast notifications using `sonner`.
- [ ] Loading states are shown on all async operations.
- [ ] The Sport nav item (`/admin/sport`) is accessible from the admin sidebar.
- [ ] No sport data is fetched until the sport page is visited (no eager loading on unrelated pages).
