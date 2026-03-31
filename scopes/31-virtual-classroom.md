# 31 — Virtual Classroom Module

## 1. Module Overview

The Virtual Classroom module adds real-time and recorded video learning to Campusly. It covers three capabilities:

1. **Live Sessions** — teachers schedule and run video classes. Students join from their dashboard. Features: video/audio, screen sharing, interactive whiteboard, text chat, hand raise, live polls, attendance auto-tracking.
2. **Video Library** — recorded live sessions and teacher-uploaded video lessons organized by subject and grade. Students watch with progress tracking (resume, speed control). Teachers see who watched what.
3. **Session Scheduling** — virtual sessions integrate with the existing timetable, support recurring schedules, and send automated reminders.

### Role-based access summary

| Capability | student | parent | teacher | school_admin | super_admin |
|---|---|---|---|---|---|
| Join live session | Yes (own class) | No (view recording only) | Yes (own + any) | Yes (any) | Yes (any) |
| Start/end session | — | — | Yes | Yes | Yes |
| View video library | read (own class) | read (child's class) | read (own) + CRUD | read (any) + CRUD | read (any) + CRUD |
| Upload video | — | — | Yes | Yes | Yes |
| View session attendance | — | — | read (own) | read (any) | read (any) |
| View watch progress | read (own) | read (child) | read (class) | read (any) | read (any) |
| Schedule sessions | — | — | CRUD (own) | CRUD (any) | CRUD (any) |
| Session settings (mute, etc.) | — | — | Yes (host) | Yes | Yes |

---

## 2. Backend API Endpoints

All routes are mounted under `/classroom`. Every request requires a valid JWT.

---

### 2.1 Sessions

#### POST /classroom/sessions

Create/schedule a virtual session.

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId": "string (ObjectId, required — injected from auth if not provided)",
  "title": "string (required, min 1)",
  "description": "string (optional)",
  "subjectId": "string (ObjectId, required)",
  "classId": "string (ObjectId, required)",
  "gradeId": "string (ObjectId, optional)",
  "scheduledStart": "string (ISO datetime, required)",
  "scheduledEnd": "string (ISO datetime, required)",
  "isRecorded": "boolean (default true)",
  "settings": {
    "studentVideoEnabled": "boolean (default false)",
    "studentAudioEnabled": "boolean (default false)",
    "chatEnabled": "boolean (default true)",
    "maxParticipants": "number (default 50)",
    "allowLateJoin": "boolean (default true)"
  },
  "recurringRule": "string (optional — e.g., 'weekly' or null for one-off)",
  "timetablePeriodId": "string (ObjectId, optional — link to existing timetable entry)"
}
```

`teacherId` is set from `req.user.id`.

A video provider room is created on session creation (via LiveKit/provider API). The `roomId` and initial `joinToken` are stored.

**Response 201:**

```json
{
  "success": true,
  "message": "Session scheduled successfully",
  "data": {
    "_id": "...",
    "title": "Photosynthesis — Chapter 5",
    "subjectId": "...",
    "classId": "...",
    "teacherId": "...",
    "scheduledStart": "2026-04-02T09:00:00.000Z",
    "scheduledEnd": "2026-04-02T09:45:00.000Z",
    "status": "scheduled",
    "isRecorded": true,
    "roomId": "room_abc123",
    "settings": { "studentVideoEnabled": false, "studentAudioEnabled": false, "chatEnabled": true, "maxParticipants": 50, "allowLateJoin": true },
    "createdAt": "2026-03-31T14:00:00.000Z"
  }
}
```

---

#### GET /classroom/sessions/upcoming

Upcoming sessions for the authenticated user. For students: sessions for their class. For teachers: their own sessions. For admin: all school sessions.

**Auth:** Required. Any authenticated user.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `from` | `string` | ISO date, default: now |
| `to` | `string` | ISO date, default: 7 days from now |
| `classId` | `string` | Filter by class |
| `subjectId` | `string` | Filter by subject |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "title": "Photosynthesis — Chapter 5",
        "subject": { "_id": "...", "name": "Life Sciences", "code": "LIFE" },
        "class": { "_id": "...", "name": "10A" },
        "teacher": { "_id": "...", "firstName": "Mrs", "lastName": "Naidoo" },
        "scheduledStart": "2026-04-02T09:00:00.000Z",
        "scheduledEnd": "2026-04-02T09:45:00.000Z",
        "status": "scheduled",
        "isRecorded": true
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

Sessions sorted by `scheduledStart` ascending. Excludes `cancelled` and `ended` sessions.

---

#### GET /classroom/sessions/:id

Single session with full details.

**Auth:** Required. Any authenticated user (scoped to school).

**Response 200:** Full session document with populated `teacherId`, `subjectId`, `classId`. If session is `live`, includes `joinUrl` for the video provider.

---

#### PATCH /classroom/sessions/:id

Update a session (before it starts).

**Auth:** Required. Session owner (teacher) or admin.

**Request body:** Partial — any fields from the create body. Cannot update once status is `live` or `ended`.

---

#### DELETE /classroom/sessions/:id

Cancel a session. Sets `status: 'cancelled'`. Does not hard-delete.

**Auth:** Required. Session owner or admin.

---

#### POST /classroom/sessions/:id/start

Teacher starts the session. Sets `status: 'live'`, `actualStart: now()`. Triggers notification to all students in the class.

**Auth:** Required. Session owner or admin.

**Response 200:**

```json
{
  "success": true,
  "message": "Session started",
  "data": {
    "status": "live",
    "actualStart": "2026-04-02T09:00:30.000Z",
    "joinUrl": "https://meet.livekit.io/room_abc123?token=..."
  }
}
```

---

#### POST /classroom/sessions/:id/end

Teacher ends the session. Sets `status: 'ended'`, `actualEnd: now()`. If recording was enabled, triggers async processing.

**Auth:** Required. Session owner or admin.

**Response 200:**

```json
{
  "success": true,
  "message": "Session ended",
  "data": {
    "status": "ended",
    "actualEnd": "2026-04-02T09:44:00.000Z",
    "recordingProcessing": true
  }
}
```

---

#### GET /classroom/sessions/:id/join

Get a join token for a session. Generates a short-lived video provider token for the authenticated user.

**Auth:** Required. Students in the session's class, the session teacher, or admin.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "joinToken": "eyJ...",
    "roomId": "room_abc123",
    "participantName": "Thabo Mokoena",
    "role": "student"
  }
}
```

Token encodes the user's display name and role (affects permissions — teachers can share screen, mute others; students have limited controls).

---

#### GET /classroom/sessions/:id/attendance

Attendance report for a completed session.

**Auth:** Required. Session owner, admin.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "title": "Photosynthesis — Chapter 5",
    "duration": 2610,
    "totalStudents": 30,
    "attended": 27,
    "attendanceRate": 90,
    "attendees": [
      {
        "studentId": "...",
        "studentName": "Thabo Mokoena",
        "joinedAt": "2026-04-02T09:01:00.000Z",
        "leftAt": "2026-04-02T09:44:00.000Z",
        "duration": 2580,
        "attendancePercent": 99,
        "rejoins": 0
      }
    ],
    "absent": [
      { "studentId": "...", "studentName": "Lerato Dlamini" }
    ]
  }
}
```

---

#### POST /classroom/sessions/:id/poll

Create a live poll during a session.

**Auth:** Required. Session owner (teacher).

**Request body:**

```json
{
  "question": "What is the primary pigment in photosynthesis?",
  "options": ["Chlorophyll", "Carotene", "Xanthophyll", "Melanin"],
  "correctOption": 0,
  "durationSeconds": 30
}
```

`correctOption` is optional — if omitted, it's a survey (no right answer). `durationSeconds` sets auto-close timer.

Poll is broadcast to all participants in the session via the video provider's data channel.

---

#### POST /classroom/sessions/:id/poll/:pollId/respond

Student responds to a poll.

**Auth:** Required. Students in the session.

**Request body:**

```json
{
  "selectedOption": 0
}
```

---

### 2.2 Video Library

#### GET /classroom/videos

List video lessons. Filterable, paginated.

**Auth:** Required. Any authenticated user (scoped to school).

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `subjectId` | `string` | Filter by subject |
| `gradeId` | `string` | Filter by grade |
| `teacherId` | `string` | Filter by teacher |
| `type` | `string` | `upload`, `recording`, or `all` (default) |
| `search` | `string` | Search by title |
| `page` | `number` | Default 1 |
| `limit` | `number` | Default 20 |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "title": "Photosynthesis — Chapter 5 (Recorded)",
        "description": "Recorded live session from 2 April",
        "subject": { "_id": "...", "name": "Life Sciences" },
        "grade": { "_id": "...", "name": "Grade 10" },
        "teacher": { "_id": "...", "firstName": "Mrs", "lastName": "Naidoo" },
        "videoType": "recording",
        "duration": 2610,
        "thumbnailUrl": "https://...",
        "viewCount": 18,
        "isPublished": true,
        "createdAt": "2026-04-02T10:00:00.000Z"
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

Videos sorted by `createdAt` descending. Only `isPublished: true` shown to students/parents. Teachers and admins see unpublished (draft) videos too.

---

#### POST /classroom/videos

Upload a video lesson (non-live content).

**Auth:** Required. Roles: `teacher`, `school_admin`, `super_admin`.

**Request body:**

```json
{
  "schoolId": "string (ObjectId)",
  "title": "string (required, min 1)",
  "description": "string (optional)",
  "subjectId": "string (ObjectId, required)",
  "gradeId": "string (ObjectId, required)",
  "videoUrl": "string (required — file URL or YouTube/Vimeo link)",
  "videoType": "'upload' | 'youtube' | 'vimeo' (required)",
  "duration": "number (seconds, optional — auto-detected for uploads)",
  "tags": ["string"],
  "isPublished": "boolean (default false)"
}
```

For uploaded files: frontend uploads to cloud storage first (presigned URL), then passes the resulting URL here.

---

#### GET /classroom/videos/:id

Single video with full metadata.

---

#### PUT /classroom/videos/:id

Update video metadata.

**Auth:** Required. Video owner or admin.

---

#### DELETE /classroom/videos/:id

Soft-delete a video.

**Auth:** Required. Video owner or admin.

---

#### PATCH /classroom/videos/:id/progress

Update a student's watch progress for a video.

**Auth:** Required. Student.

**Request body:**

```json
{
  "watchedSeconds": 1200,
  "totalSeconds": 2610
}
```

Server calculates `progressPercent` and sets `completed: true` when `progressPercent >= 90`. Upsert semantics — creates or updates the `VideoProgress` record.

---

#### GET /classroom/videos/student/:studentId/history

Watch history for a student across all videos. Shows which videos they've watched, progress, and completion status.

**Auth:** Required. Student (own), parent (child), teacher (class), admin (any).

**Query parameters:** `subjectId`, `completed` (`true`/`false`), `page`, `limit`.

---

### 2.3 Analytics

#### GET /classroom/analytics/teacher/:teacherId

Teacher's virtual classroom stats.

**Auth:** Required. Teacher (own) or admin.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalSessions": 24,
    "totalRecordings": 20,
    "totalWatchTime": 186000,
    "averageAttendanceRate": 87,
    "averageSessionDuration": 2400,
    "mostWatchedVideo": { "title": "Photosynthesis", "viewCount": 45 },
    "sessionsByMonth": [
      { "month": "2026-03", "count": 8 },
      { "month": "2026-04", "count": 6 }
    ]
  }
}
```

---

#### GET /classroom/analytics/class/:classId

Class engagement stats with virtual classroom.

**Auth:** Required. Teacher (own class) or admin.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "classId": "...",
    "className": "10A",
    "totalStudents": 30,
    "sessionAttendanceRate": 87,
    "videoCompletionRate": 72,
    "studentsNeverWatched": 3,
    "topWatchers": [
      { "studentName": "Thabo Mokoena", "videosCompleted": 18, "totalWatchTime": 28800 }
    ],
    "lowEngagement": [
      { "studentName": "Lerato Dlamini", "videosCompleted": 2, "sessionsAttended": 5, "totalWatchTime": 3600 }
    ]
  }
}
```

---

## 3. Frontend Pages

### 3.1 Live Classroom — `/classroom/:sessionId`

**File:** `src/app/(dashboard)/classroom/[sessionId]/page.tsx`

The live video session page. Layout:
- Main area: teacher video / screen share / whiteboard (switches based on what's active).
- Sidebar (collapsible): participant list, chat, hand raise queue.
- Bottom bar: controls (mute, video, screen share, hand raise, leave).
- Teacher has additional controls: mute all, start/stop recording, launch poll, share whiteboard, end session.
- Poll overlay appears when teacher launches a poll.

This page integrates the video provider SDK (LiveKit `@livekit/components-react`).

### 3.2 Student Upcoming Sessions — `/student/classroom`

**File:** `src/app/(dashboard)/student/classroom/page.tsx`

Card list of upcoming sessions with: title, subject, teacher, date/time, countdown timer. "Join" button active when session is live. Tabs: Upcoming | Past Sessions.

### 3.3 Student Video Library — `/student/classroom/library`

**File:** `src/app/(dashboard)/student/classroom/library/page.tsx`

Grid/list of available video lessons. Filter by subject. Each card: thumbnail, title, teacher, duration, progress bar (if partially watched), "Completed" badge if finished. Click to watch.

### 3.4 Video Player — `/student/classroom/video/:id`

**File:** `src/app/(dashboard)/student/classroom/video/[id]/page.tsx`

Full video player with: play/pause, seek bar, speed control (0.5x, 1x, 1.25x, 1.5x, 2x), fullscreen. Auto-resumes from last position. Progress auto-saved every 30 seconds via `PATCH /classroom/videos/:id/progress`. Related videos sidebar (same subject).

### 3.5 Teacher Session Manager — `/teacher/classroom`

**File:** `src/app/(dashboard)/teacher/classroom/page.tsx`

Dashboard for teachers. Upcoming sessions with "Start Now" button. Quick schedule button. Past sessions with attendance rate and recording link. Video upload section.

### 3.6 Schedule Session — `/teacher/classroom/new`

**File:** `src/app/(dashboard)/teacher/classroom/new/page.tsx`

Form: title, subject (from teacher's subjects), class, date/time picker, duration, recording toggle, settings (student video/audio/chat). Recurring option: one-off, weekly, custom. Link to timetable period (optional).

### 3.7 Session Analytics — `/teacher/classroom/:id/analytics`

**File:** `src/app/(dashboard)/teacher/classroom/[id]/analytics/page.tsx`

Per-session: attendance list (who joined, how long, when), recording stats (views, average watch time), poll results. Absent students highlighted.

### 3.8 Parent Video Access — `/parent/classroom`

**File:** `src/app/(dashboard)/parent/classroom/page.tsx`

Per-child: list of available recorded lessons. Watch history showing completion status. Cannot join live sessions.

### 3.9 Admin Classroom Overview — `/admin/classroom`

**File:** `src/app/(dashboard)/admin/classroom/page.tsx`

School-wide stats: total sessions this month, average attendance, recording count, storage used. Per-teacher breakdown. Low-engagement alerts.

---

## 4. User Flows

### 4.1 Teacher Schedules a Session

1. Teacher navigates to `/teacher/classroom`.
2. Clicks "Schedule Session."
3. Fills in: title, subject, class, date/time, duration.
4. Enables recording. Leaves student video off, audio off, chat on.
5. Submits → session appears in upcoming list.
6. Students in that class receive a notification: "Live lesson scheduled for Wednesday 9:00."

### 4.2 Teacher Starts a Live Session

1. Teacher navigates to `/teacher/classroom`.
2. Clicks "Start Now" on a scheduled session (or the session auto-activates at scheduled time).
3. Browser requests camera/microphone permission.
4. Teacher enters the video room. Sees participant count as students join.
5. Students receive "Session is live — join now" push notification.
6. Teacher shares screen to show slides.
7. Teacher launches a poll: "What is chlorophyll?" — students answer on their devices.
8. Poll results show 80% correct.
9. Teacher ends session after 40 minutes.
10. Recording begins processing in the background.

### 4.3 Student Joins a Live Session

1. Student sees "Live Now" badge on `/student/classroom`.
2. Clicks "Join."
3. Browser requests microphone permission (if audio enabled by teacher).
4. Student sees teacher's screen share / video.
5. Chat panel open — student types a question.
6. Student raises hand — teacher calls on them, unmutes them temporarily.
7. Poll appears — student selects answer.
8. Session ends — student is returned to classroom page.

### 4.4 Student Watches a Recorded Lesson

1. Student navigates to `/student/classroom/library`.
2. Filters by "Life Sciences."
3. Sees "Photosynthesis — Chapter 5" with 85% progress bar.
4. Clicks to watch. Video resumes from where they left off (minute 34).
5. Watches at 1.5x speed.
6. Finishes. Progress bar shows 100%, "Completed" badge appears.

### 4.5 Teacher Uploads a Pre-Recorded Video

1. Teacher navigates to `/teacher/classroom`.
2. Clicks "Upload Video."
3. Selects subject, grade, enters title and description.
4. Either uploads a video file or pastes a YouTube link.
5. Sets `isPublished: true` to make it immediately available.
6. Video appears in student library.

### 4.6 Teacher Reviews Session Engagement

1. Teacher navigates to `/teacher/classroom/:id/analytics` for yesterday's session.
2. Sees: 27 of 30 students attended (90%).
3. Average time in session: 38 minutes (of 40).
4. 3 absent students listed — teacher can cross-reference with attendance module.
5. Recording has been watched by 5 students who missed the session.
6. Poll results: 80% got the answer right.

### 4.7 Parent Watches Child's Missed Lesson

1. Parent navigates to `/parent/classroom`.
2. Selects child.
3. Sees this week's recorded lessons with child's watch status.
4. "Photosynthesis" shows "Not watched" for their child.
5. Parent can watch the recording themselves to help with homework.

---

## 5. Data Models

### 5.1 VirtualSession

Mongoose model name: `VirtualSession`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `schoolId` | `ObjectId` | Yes | — | ref: `School` |
| `teacherId` | `ObjectId` | Yes | — | ref: `User` |
| `title` | `string` | Yes | — | trimmed |
| `description` | `string` | No | — | — |
| `subjectId` | `ObjectId` | Yes | — | ref: `Subject` |
| `classId` | `ObjectId` | Yes | — | ref: `Class` |
| `gradeId` | `ObjectId` | No | — | ref: `Grade` |
| `scheduledStart` | `Date` | Yes | — | — |
| `scheduledEnd` | `Date` | Yes | — | — |
| `actualStart` | `Date` | No | — | Set when session starts |
| `actualEnd` | `Date` | No | — | Set when session ends |
| `status` | `string` | Yes | `scheduled` | enum: `scheduled`, `live`, `ended`, `cancelled` |
| `isRecorded` | `boolean` | No | `true` | — |
| `recordingUrl` | `string` | No | — | Set after processing |
| `recordingDuration` | `number` | No | — | Seconds |
| `thumbnailUrl` | `string` | No | — | Auto-generated |
| `roomId` | `string` | No | — | Video provider room ID |
| `settings` | `object` | No | See defaults | `{ studentVideoEnabled, studentAudioEnabled, chatEnabled, maxParticipants, allowLateJoin }` |
| `recurringRule` | `string` | No | `null` | `weekly`, `biweekly`, or `null` |
| `parentSessionId` | `ObjectId` | No | — | If recurring, ref to the original session |
| `timetablePeriodId` | `ObjectId` | No | — | ref: timetable entry |
| `sharedFiles` | `SharedFile[]` | No | `[]` | — |
| `pollResults` | `PollResult[]` | No | `[]` | — |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

**SharedFile subdoc:**

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | — |
| `url` | `string` | — |
| `sharedAt` | `Date` | — |

**PollResult subdoc:**

| Field | Type | Notes |
|---|---|---|
| `pollId` | `string` | Generated UUID |
| `question` | `string` | — |
| `options` | `string[]` | — |
| `correctOption` | `number` | -1 if survey |
| `responses` | `PollResponse[]` | — |

**PollResponse subdoc:**

| Field | Type | Notes |
|---|---|---|
| `studentId` | `ObjectId` | — |
| `selectedOption` | `number` | — |
| `respondedAt` | `Date` | — |

Indexes: `{ schoolId, status, scheduledStart }`, `{ teacherId, scheduledStart }`, `{ classId, scheduledStart }`.

---

### 5.2 SessionAttendance

Mongoose model name: `SessionAttendance`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | auto | — |
| `sessionId` | `ObjectId` | Yes | ref: `VirtualSession` |
| `studentId` | `ObjectId` | Yes | ref: `Student` |
| `joinedAt` | `Date` | Yes | — |
| `leftAt` | `Date` | No | Set when student leaves |
| `duration` | `number` | No | Seconds actually present |
| `rejoins` | `number` | No | Disconnect/reconnect count |

Indexes: `{ sessionId, studentId }` (unique).

---

### 5.3 VideoLesson

Mongoose model name: `VideoLesson`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | auto | — | — |
| `schoolId` | `ObjectId` | Yes | — | ref: `School` |
| `teacherId` | `ObjectId` | Yes | — | ref: `User` |
| `title` | `string` | Yes | — | trimmed |
| `description` | `string` | No | — | — |
| `subjectId` | `ObjectId` | Yes | — | ref: `Subject` |
| `gradeId` | `ObjectId` | Yes | — | ref: `Grade` |
| `videoUrl` | `string` | Yes | — | File URL or YouTube/Vimeo link |
| `videoType` | `string` | Yes | — | enum: `upload`, `youtube`, `vimeo`, `recording` |
| `sourceSessionId` | `ObjectId` | No | — | If converted from live recording |
| `duration` | `number` | No | — | Seconds |
| `thumbnailUrl` | `string` | No | — | — |
| `tags` | `string[]` | No | `[]` | — |
| `isPublished` | `boolean` | No | `false` | Only published videos visible to students |
| `viewCount` | `number` | No | `0` | Incremented on first watch per student |
| `isDeleted` | `boolean` | No | `false` | Soft delete |
| `createdAt` | `Date` | auto | — | — |
| `updatedAt` | `Date` | auto | — | — |

Indexes: `{ schoolId, subjectId }`, `{ schoolId, gradeId }`, `{ teacherId }`.

---

### 5.4 VideoProgress

Mongoose model name: `VideoProgress`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | `ObjectId` | auto | — |
| `videoLessonId` | `ObjectId` | Yes | ref: `VideoLesson` |
| `studentId` | `ObjectId` | Yes | ref: `Student` |
| `watchedSeconds` | `number` | Yes | — |
| `totalSeconds` | `number` | Yes | — |
| `progressPercent` | `number` | Yes | Computed: `(watchedSeconds / totalSeconds) * 100` |
| `lastWatchedAt` | `Date` | Yes | — |
| `completed` | `boolean` | No | `true` when `progressPercent >= 90` |

Indexes: `{ videoLessonId, studentId }` (unique).

---

### 5.5 Frontend Types (`src/types/index.ts`)

```ts
interface VirtualSession {
  id: string;
  schoolId: string;
  teacherId: string;
  teacher?: { firstName: string; lastName: string };
  title: string;
  description?: string;
  subjectId: string;
  subject?: { name: string; code: string };
  classId: string;
  class?: { name: string };
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  isRecorded: boolean;
  recordingUrl?: string;
  recordingDuration?: number;
  thumbnailUrl?: string;
  settings: SessionSettings;
}

interface SessionSettings {
  studentVideoEnabled: boolean;
  studentAudioEnabled: boolean;
  chatEnabled: boolean;
  maxParticipants: number;
  allowLateJoin: boolean;
}

interface SessionAttendanceRecord {
  studentId: string;
  studentName: string;
  joinedAt: string;
  leftAt?: string;
  duration: number;
  attendancePercent: number;
  rejoins: number;
}

interface VideoLesson {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  subject?: { name: string };
  gradeId: string;
  grade?: { name: string };
  teacherId: string;
  teacher?: { firstName: string; lastName: string };
  videoUrl: string;
  videoType: 'upload' | 'youtube' | 'vimeo' | 'recording';
  duration?: number;
  thumbnailUrl?: string;
  tags: string[];
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
}

interface VideoProgress {
  videoLessonId: string;
  watchedSeconds: number;
  totalSeconds: number;
  progressPercent: number;
  lastWatchedAt: string;
  completed: boolean;
}

interface LivePoll {
  pollId: string;
  question: string;
  options: string[];
  correctOption?: number;
  durationSeconds: number;
}

interface PollResponse {
  studentId: string;
  selectedOption: number;
  respondedAt: string;
}
```

---

## 6. State Management

### 6.1 Recommended Hooks

- **`useClassroomSessions(filters)`** — fetch upcoming/past sessions, CRUD operations
- **`useVideoLibrary(filters)`** — fetch video list, manage uploads
- **`useVideoPlayer(videoId)`** — manage playback state, auto-save progress
- **`useSessionRoom(sessionId)`** — LiveKit room connection, participant state, chat, polls

### 6.2 LiveKit State

The LiveKit React SDK (`@livekit/components-react`) provides its own hooks (`useRoom`, `useParticipants`, `useTrack`, etc.) that manage video/audio state internally. Do not duplicate this in Zustand — let the SDK manage real-time state.

### 6.3 Page-level State

Session scheduling and video upload forms use the standard `useState` + React Hook Form pattern from scope 00. The video library page uses `useState` + `useEffect` + `apiClient` for listing and filtering.

---

## 7. Components Needed

### 7.1 Live Session Components (`src/components/classroom/`)

| Component | File | Purpose |
|---|---|---|
| `VideoRoom` | `VideoRoom.tsx` | Main live session container — wraps LiveKit `<LiveKitRoom>` with custom layout |
| `ParticipantGrid` | `ParticipantGrid.tsx` | Gallery view of video feeds (teacher + students if enabled) |
| `ScreenShareView` | `ScreenShareView.tsx` | Full-width screen share with teacher video pip overlay |
| `TeacherControls` | `TeacherControls.tsx` | Control bar: mute all, share screen, record, launch poll, whiteboard, end session |
| `StudentControls` | `StudentControls.tsx` | Control bar: mute self, toggle video, raise hand, leave |
| `SessionChat` | `SessionChat.tsx` | Text chat panel alongside video |
| `HandRaiseQueue` | `HandRaiseQueue.tsx` | Ordered list of students with raised hands, dismiss/call-on actions |
| `LivePollCreator` | `LivePollCreator.tsx` | Teacher form to create and launch a poll |
| `LivePollResponder` | `LivePollResponder.tsx` | Student poll answer UI with countdown |
| `LivePollResults` | `LivePollResults.tsx` | Bar chart of poll results shown to all |
| `SharedWhiteboard` | `SharedWhiteboard.tsx` | Embedded tldraw canvas with real-time collaboration |

### 7.2 Scheduling & Library Components

| Component | File | Purpose |
|---|---|---|
| `SessionScheduler` | `SessionScheduler.tsx` | Form: title, subject, class, date/time, settings, recurring |
| `UpcomingSessionCard` | `UpcomingSessionCard.tsx` | Session card with countdown, join button, status badge |
| `SessionStatusBadge` | `SessionStatusBadge.tsx` | Color-coded: scheduled (blue), live (green), ended (grey), cancelled (red) |
| `VideoUploadForm` | `VideoUploadForm.tsx` | Upload video file or paste link, set metadata |
| `VideoCard` | `VideoCard.tsx` | Thumbnail, title, duration, teacher, progress bar |
| `VideoPlayer` | `VideoPlayer.tsx` | HLS/MP4 player with seek, speed, resume, fullscreen |
| `WatchProgressBar` | `WatchProgressBar.tsx` | Thin progress bar overlay on video card |
| `VideoFilter` | `VideoFilter.tsx` | Filter bar: subject, grade, teacher, type |

### 7.3 Analytics Components

| Component | File | Purpose |
|---|---|---|
| `SessionAttendanceTable` | `SessionAttendanceTable.tsx` | DataTable: student name, join time, duration, status |
| `ClassEngagementStats` | `ClassEngagementStats.tsx` | StatCards: attendance rate, video completion, low engagement count |
| `WatchHistoryTable` | `WatchHistoryTable.tsx` | Student's video watch history with progress |

### 7.4 Existing shared components to reuse

| Component | From | Usage |
|---|---|---|
| `PageHeader` | `src/components/shared/PageHeader` | All classroom pages |
| `StatCard` | `src/components/shared/StatCard` | Analytics dashboards |
| `DataTable` | `src/components/shared/DataTable` | Attendance reports, video lists |
| `EmptyState` | `src/components/shared/EmptyState` | No sessions, no videos |
| `LoadingSpinner` | `src/components/shared/LoadingSpinner` | Loading states |
| `Badge` | `src/components/ui/badge` | Status badges |
| `Dialog` | `src/components/ui/dialog` | Schedule session, upload video |
| `BarChartComponent` | `src/components/charts` | Poll results, analytics |

---

## 8. Integration Notes

### 8.1 Video Provider (LiveKit)

**Recommended:** LiveKit Cloud for initial deployment, self-hosted LiveKit for scale.

- **Server SDK:** `livekit-server-sdk` (Node.js) — used to create rooms and generate join tokens.
- **Client SDK:** `@livekit/components-react` — pre-built React components for video rooms.
- Room creation happens on `POST /classroom/sessions` — the backend calls the LiveKit API to create a room.
- Join tokens are generated per user on `GET /classroom/sessions/:id/join` — tokens are short-lived (1 hour) and encode the user's name and permissions.
- Recording: LiveKit supports server-side composite recording. Triggered on session start if `isRecorded: true`. Output written to cloud storage.

### 8.2 Timetable Integration

Virtual sessions can optionally link to a `timetablePeriodId` from the Academic module (scope 08). When linked, the session appears in the student's timetable view alongside physical classes. Color-coded: blue = in-person, green = virtual.

### 8.3 Attendance Integration

Virtual session attendance can be cross-referenced with the Attendance module (scope 11). An admin setting controls whether virtual attendance auto-fills the attendance record for the corresponding period. If enabled: students who joined for > 80% of the session duration are marked `present`, others are marked `absent`.

### 8.4 Learning Module Integration

When a live session recording is processed, a `VideoLesson` record is auto-created with `videoType: 'recording'` and `sourceSessionId` linking back to the session. This video appears in the Learning module's study materials for the relevant subject/grade.

### 8.5 Notification Module Integration

Session lifecycle triggers notifications:
- Session scheduled → notification to all students in the class (1 hour before, 15 min before).
- Session started → "Join now" push notification.
- Session ended with recording → "New recorded lesson available."
- Student hasn't watched a recording after 3 days → gentle reminder.

### 8.6 Video Storage

Uploaded videos and session recordings are stored in cloud storage (S3, GCS, or Backblaze B2). The backend provides presigned upload URLs for direct browser-to-storage upload. Storage costs should be monitored per school and factored into subscription pricing.

### 8.7 Whiteboard

The shared whiteboard uses **tldraw** (open-source, React-native collaborative canvas). Real-time sync via Yjs over the LiveKit data channel (no additional WebSocket needed). Whiteboard state is serialized to JSON and saved with the session for playback in recordings.

### 8.8 YouTube/Vimeo Embeds

For `videoType: 'youtube'` or `'vimeo'`, the frontend renders an embedded player rather than the custom video player. Progress tracking for embedded videos is approximate (YouTube/Vimeo iframe APIs provide limited progress events).

---

## 9. Acceptance Criteria

### Session Scheduling

- [ ] Teacher can schedule a session with title, subject, class, date/time, and settings.
- [ ] Scheduled session appears in the teacher's and students' upcoming sessions list.
- [ ] Recurring sessions (weekly) auto-create future occurrences.
- [ ] Session can be cancelled before it starts.
- [ ] Session details can be edited before it starts.
- [ ] Students in the session's class receive a notification when a session is scheduled.

### Live Sessions

- [ ] Teacher can start a scheduled session; status changes to `live`.
- [ ] Students can join a live session and see the teacher's video/audio.
- [ ] Teacher can share their screen; students see the screen share.
- [ ] Text chat works for all participants during the session.
- [ ] Students can raise their hand; teacher sees a queue and can dismiss/call-on.
- [ ] Teacher can mute/unmute individual students and mute all.
- [ ] Teacher can launch a poll; students see the poll and can respond; results are shown live.
- [ ] Teacher can end the session; all participants are disconnected.
- [ ] Attendance is auto-tracked: who joined, when, for how long.

### Recording

- [ ] When recording is enabled, the session is recorded server-side.
- [ ] After session ends, recording is processed and a `VideoLesson` is created.
- [ ] Recorded lesson appears in the video library for the relevant class.
- [ ] Recording includes teacher video, screen share, and audio.

### Video Library

- [ ] Teacher can upload video lessons (file upload or YouTube/Vimeo link).
- [ ] Video library is filterable by subject, grade, teacher.
- [ ] Students see only published videos for their class/grade.
- [ ] Unpublished videos are visible to the teacher and admin only.

### Video Playback

- [ ] Video player supports play, pause, seek, speed control (0.5x–2x), and fullscreen.
- [ ] Video resumes from the last watched position.
- [ ] Progress is auto-saved every 30 seconds.
- [ ] Video is marked as completed when >= 90% is watched.

### Analytics

- [ ] Teacher can view per-session attendance report.
- [ ] Teacher can view class-level engagement stats (attendance rate, video completion rate).
- [ ] Low-engagement students are flagged.
- [ ] Admin can view school-wide virtual classroom usage stats.

### Parent Access

- [ ] Parent can view recorded lessons for their child's class.
- [ ] Parent can see their child's watch history and completion status.
- [ ] Parent cannot join live sessions.

### General

- [ ] All list endpoints return correct pagination metadata.
- [ ] Soft-deleted records never appear in responses.
- [ ] Role-based access is enforced on all endpoints.
- [ ] Sessions are scoped to school via `schoolId`.
- [ ] Video provider credentials are environment-configured, not hardcoded.
