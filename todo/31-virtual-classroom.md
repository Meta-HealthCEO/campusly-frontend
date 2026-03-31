# 31 — Virtual Classroom — NEW MODULE

## The Gap

The current Learning module is 100% asynchronous — upload content, take quizzes, submit assignments. There is no way for a teacher to teach live, share their screen, interact with students in real time, or record a lesson for later viewing. Every modern school platform needs this — not as a "nice to have" but as core infrastructure.

Use cases this solves:
- Snow days, strikes, load shedding — school continues
- A student is sick for a week — watches recorded lessons to catch up
- A teacher explains a difficult concept — records it once, students rewatch forever
- Parent evening presentations — join from home
- Extra lessons / tutoring sessions after hours
- Guest speakers without travel costs
- Rural schools accessing specialist teachers at other schools

---

## Core Features

### 1. Live Virtual Classroom

A teacher starts a live session that students join from their dashboard.

**Session Creation**
- Teacher creates a session: title, subject, class, date/time, duration
- Can be scheduled in advance or started immediately ("Start Live Now" button)
- Scheduled sessions appear on the class timetable and student dashboard
- Automatic reminders: 1 hour, 15 minutes, and "starting now" notification
- Join link generated — works in browser, no app install required

**During the Session**
- **Video/Audio:** Teacher webcam + microphone, students can be muted by default
- **Screen Sharing:** Teacher shares their screen (slides, documents, browser, whiteboard)
- **Interactive Whiteboard:** Draw, annotate, type — shared in real time with all participants
- **Chat:** Text chat alongside the video for questions without interrupting
- **Hand Raise:** Students tap a button to raise their hand, teacher sees a queue
- **Polls/Quick Questions:** Teacher pops a multiple-choice question, students answer live, results shown instantly
- **Breakout Rooms:** Split class into small groups for discussion, teacher can visit each
- **Attendance:** Auto-tracked — system records who joined, when, and for how long

**Controls (Teacher)**
- Mute/unmute individual students or mute all
- Enable/disable student video
- Remove disruptive students
- Pin a student's video (e.g., when a student is presenting)
- Lock the room (no new joins after a certain point)

**Student View**
- Teacher video/screen share takes up most of the screen
- Chat panel on the side
- Hand raise button
- Minimal, distraction-free UI
- Works on desktop, tablet, and mobile

---

### 2. Lesson Recording & Video Library

Every live session can be recorded and made available for later viewing.

**Recording**
- Teacher toggles "Record this session" before or during the session
- Records: teacher video + screen share + whiteboard + audio
- Recording is auto-saved when session ends
- Processing happens async (encoding to standard format)

**Video Library** (`/student/classroom/library` and `/admin/classroom/library`)
- All recorded lessons organized by subject, class, date
- Search by title, subject, teacher
- Thumbnail preview generated from recording
- Duration shown
- Student can watch at own pace: play, pause, seek, speed control (0.5x–2x)
- Resume from where you left off (progress tracking)

**Teacher-Uploaded Videos**
- Teachers can also upload pre-recorded videos (not just live session recordings)
- Same library, same organization
- Useful for: explainer videos, walkthroughs, flipped classroom content
- Upload video file OR paste a YouTube/Vimeo link (embedded player)

**Watch Tracking**
- System records: who watched, how much they watched (%), when
- Teacher can see: "25 of 30 students watched the Photosynthesis lesson, average watch: 85%"
- Students who haven't watched get a gentle reminder notification

---

### 3. Scheduled Classes & Timetable Integration

Virtual sessions integrate with the existing timetable.

- When creating a session, teacher can link it to a timetable period
- Session shows on the student's timetable view alongside physical classes
- Color-coded: blue = in-person, green = virtual
- Recurring sessions: "Every Wednesday Period 5 is a virtual lesson" — auto-creates weekly
- Calendar view showing all upcoming virtual sessions

---

### 4. Interactive Tools Within Sessions

**Shared Whiteboard**
- Infinite canvas, multi-page
- Drawing tools: pen, shapes, text, eraser, color picker
- Teacher can upload a PDF/image as background (e.g., a worksheet) and annotate over it
- Students can be given drawing permissions (for collaborative problem-solving)
- Whiteboard state saved with the recording

**Live Polls & Quizzes**
- Teacher launches a quick poll: "What is 7 × 8?" with options
- Students answer on their device
- Results appear in real time (bar chart)
- Can link to the Learning module quiz engine for more complex assessments
- "Exit ticket" — short quiz at the end of a session to check understanding

**File Sharing**
- Teacher drops a file into the session — students can download instantly
- Shared links visible in the chat
- Post-session: all shared files available in the session's recording page

---

### 5. Parent Access

- Parents can view recorded lessons (read-only, no joining live sessions)
- See their child's session attendance and watch history
- Useful for parent evenings and school presentations broadcast virtually
- Admin can create "parent-facing" sessions (e.g., parent info evening) that parents join live

---

## Technical Approach

### Video/Audio Infrastructure

**Option A: Build on WebRTC + open-source (lower cost, more control)**
- Use **LiveKit** (open-source WebRTC server) or **Janus Gateway**
- Self-hosted or use LiveKit Cloud
- Handles: video/audio streams, screen sharing, recording
- Frontend: LiveKit client SDK (React)
- Scalable to hundreds of participants per room
- Recording stored in S3/cloud storage

**Option B: Use a managed service (faster to ship, higher per-minute cost)**
- **Daily.co** — simple API, good React SDK, recording built in, pay per minute
- **Whereby** — embeddable rooms, very simple integration
- **Agora** — more complex but massive scale
- **Zoom SDK** — familiar to users but expensive and complex licensing

**Recommended: LiveKit Cloud for launch, self-hosted LiveKit for scale**
- LiveKit Cloud: free tier (100 participants, 50GB recording), then pay-as-you-go
- React SDK: `@livekit/components-react` — prebuilt UI components
- Recording: server-side composite recording, stored in cloud storage
- Whiteboard: Excalidraw (open-source) or tldraw embedded alongside video

### Whiteboard
- **tldraw** (open-source, React-native, collaborative via Yjs/WebSocket)
- OR **Excalidraw** (simpler, also open-source, collaborative)
- Real-time sync via WebSocket (same server as video signaling)
- State serialized to JSON, saved with session recording

### Video Storage & Streaming
- Recordings encoded to MP4 (H.264 + AAC)
- Stored in cloud storage (S3, GCS, or Backblaze B2 for cost)
- Streamed via HLS for adaptive bitrate playback
- Thumbnails generated server-side (ffmpeg screenshot at 30-second mark)
- **Mux** is worth considering — handles encoding, storage, and streaming in one API. Free tier: 10 hours of video, then $0.07/min. Avoids building an entire video pipeline.

### Estimated Costs (per school per month)
| Component | Estimate |
|-----------|----------|
| LiveKit Cloud (50 sessions/month, 30 students avg, 45 min avg) | ~$20-40 |
| Video storage (50 recordings × 500MB = 25GB) | ~$1-5 |
| Video streaming (500 views × 45 min) | ~$5-15 |
| **Total per school** | **~$25-60/month** |

This should be factored into subscription pricing — virtual classroom could be a premium tier feature.

---

## Data Models

**`VirtualSession`**
```
VirtualSession {
  _id, schoolId, teacherId,
  title, description,
  subjectId, classId, gradeId,
  scheduledStart,              // ISO datetime
  scheduledEnd,
  actualStart, actualEnd,      // set when session starts/ends
  status: 'scheduled' | 'live' | 'ended' | 'cancelled',
  isRecorded: boolean,
  recordingUrl,                // set after processing
  recordingDuration,           // seconds
  thumbnailUrl,
  roomId,                      // LiveKit/provider room ID
  joinToken,                   // short-lived join token
  settings: {
    studentVideoEnabled: boolean,
    studentAudioEnabled: boolean,
    chatEnabled: boolean,
    maxParticipants: number,
    allowLateJoin: boolean,
  },
  recurringRule,               // null or cron-like rule for recurring sessions
  parentSessionId,             // if this is an occurrence of a recurring session
  timetablePeriodId,           // link to existing timetable entry
  sharedFiles: [{ name, url, sharedAt }],
  pollResults: [{ question, options, responses }],
  isDeleted: boolean,
  createdAt, updatedAt
}
```

**`SessionAttendance`**
```
SessionAttendance {
  _id, sessionId, studentId,
  joinedAt, leftAt,
  duration,                    // seconds actually present
  rejoins: number,             // how many times they disconnected and came back
  watchedRecording: boolean,
  recordingWatchProgress: number,  // 0-100%
}
```

**`VideoLesson`** (for uploaded, non-live content)
```
VideoLesson {
  _id, schoolId, teacherId,
  title, description,
  subjectId, gradeId,
  videoUrl,                    // uploaded file or YouTube/Vimeo link
  videoType: 'upload' | 'youtube' | 'vimeo' | 'recording',
  sourceSessionId,             // if converted from a live session recording
  duration,                    // seconds
  thumbnailUrl,
  tags: string[],
  isPublished: boolean,
  viewCount: number,
  isDeleted: boolean,
  createdAt, updatedAt
}
```

**`VideoProgress`**
```
VideoProgress {
  _id, videoLessonId, studentId,
  watchedSeconds,
  totalSeconds,
  progressPercent,
  lastWatchedAt,
  completed: boolean,           // true when progressPercent >= 90
}
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/classroom/sessions` | Teacher creates/schedules a session |
| `GET` | `/classroom/sessions/upcoming` | Upcoming sessions for current user |
| `GET` | `/classroom/sessions/:id` | Session details + join info |
| `PATCH` | `/classroom/sessions/:id` | Update session (before it starts) |
| `DELETE` | `/classroom/sessions/:id` | Cancel session |
| `POST` | `/classroom/sessions/:id/start` | Teacher starts the session (sets status to live) |
| `POST` | `/classroom/sessions/:id/end` | Teacher ends the session |
| `GET` | `/classroom/sessions/:id/join` | Get join token for a session |
| `GET` | `/classroom/sessions/:id/attendance` | Attendance report for a session |
| `POST` | `/classroom/sessions/:id/poll` | Teacher creates a live poll |
| `POST` | `/classroom/sessions/:id/poll/:pollId/respond` | Student responds to poll |
| `GET` | `/classroom/videos` | Video library (filterable by subject, grade, teacher) |
| `POST` | `/classroom/videos` | Teacher uploads a video lesson |
| `GET` | `/classroom/videos/:id` | Single video with metadata |
| `PATCH` | `/classroom/videos/:id/progress` | Update watch progress for a student |
| `GET` | `/classroom/videos/student/:id/history` | Watch history for a student |
| `GET` | `/classroom/analytics/teacher/:id` | Teacher's session stats |
| `GET` | `/classroom/analytics/class/:id` | Class engagement stats |

---

## Frontend Pages

| Page | Path | Role |
|------|------|------|
| Virtual Classroom (live) | `/classroom/:sessionId` | Teacher + Students |
| Upcoming Sessions | `/student/classroom` | Student |
| Video Library | `/student/classroom/library` | Student |
| Video Player | `/student/classroom/video/:id` | Student |
| Teacher Session Manager | `/teacher/classroom` | Teacher |
| Create/Schedule Session | `/teacher/classroom/new` | Teacher |
| Session Analytics | `/teacher/classroom/:id/analytics` | Teacher |
| Parent Video Library | `/parent/classroom` | Parent |
| Admin Classroom Overview | `/admin/classroom` | Admin |

---

## Frontend Components

| Component | Purpose |
|-----------|---------|
| `VideoRoom` | Main live session view — video grid, screen share, controls |
| `TeacherControls` | Mute all, end session, start recording, launch poll, share screen |
| `StudentControls` | Mute self, raise hand, toggle video, chat |
| `ParticipantGrid` | Gallery view of video feeds |
| `ScreenShareView` | Full-width screen share with small teacher video overlay |
| `SessionChat` | Text chat panel alongside video |
| `HandRaiseQueue` | Ordered list of students with raised hands |
| `LivePoll` | Poll creation (teacher) and response (student) with live results |
| `SharedWhiteboard` | Collaborative drawing canvas (tldraw/excalidraw) |
| `SessionScheduler` | Form: title, subject, class, date/time, recurring options |
| `UpcomingSessions` | Card list of scheduled sessions with countdown timers |
| `VideoPlayer` | HLS player with speed control, seek, resume-from-position |
| `VideoLibraryGrid` | Filterable grid of recorded/uploaded video lessons |
| `VideoUploadForm` | Upload video file or paste link, add metadata |
| `WatchProgress` | Progress bar showing how much of a video the student has watched |
| `SessionAttendanceReport` | Who joined, how long, who didn't show |
| `ClassEngagementChart` | Session attendance rate, average watch time, trending |

---

## Integration with Existing Modules

**Timetable (Academic)**
- Virtual sessions can be linked to timetable periods
- Show on the same timetable view, color-coded

**Attendance**
- Virtual session attendance can optionally count as period attendance
- Auto-mark students present if they joined the virtual session for >80% of the duration
- Absent students auto-flagged

**Learning Module**
- Recorded sessions become study materials (auto-linked to subject/grade)
- Live polls can use the quiz engine for question bank
- Video lessons appear alongside study materials in the student's learning view

**Homework**
- Teacher can reference a recorded lesson in a homework assignment: "Watch this lesson, then complete the worksheet"
- Video watch completion can be a submission requirement

**Notification**
- Session reminders via push/in-app
- "Your teacher just posted a new recorded lesson" notification
- "You haven't watched the Photosynthesis lesson yet" reminder after 3 days

---

## Implementation Priority

1. **Video Library + Upload** — lowest complexity, immediate value. Teachers upload recorded lessons, students watch. No real-time infrastructure needed. Can use YouTube/Vimeo embeds to start.

2. **Video Player with Progress Tracking** — resume, speed control, watch tracking. Teachers see who watched what.

3. **Session Scheduling + Timetable Integration** — the calendar/scheduling layer, no live video yet.

4. **Live Virtual Classroom** — the big one. LiveKit integration, video/audio, screen share, chat, hand raise. Ship as a beta.

5. **Recording** — auto-record live sessions, process and add to video library.

6. **Interactive Tools** — whiteboard, live polls, breakout rooms. Polish features.

7. **Analytics** — engagement dashboards for teachers and admins.

---

## Pricing Consideration

Video infrastructure has real per-minute costs. Options for Campusly subscription tiers:

| Tier | Virtual Classroom Access |
|------|-------------------------|
| Basic | Video library only (uploaded videos, no live sessions) |
| Standard | 20 live sessions/month, 10GB recording storage |
| Premium | Unlimited live sessions, unlimited recording storage |

This ensures the cost scales with usage and gives schools a reason to upgrade.

---

## Why This Matters

Every school in SA experienced the chaos of COVID remote learning — WhatsApp voice notes, emailed PDFs, YouTube links in a group chat. Parents remember that pain.

A school that can say "We have a proper virtual classroom built into our platform — if your child is sick, they watch the lesson from home; if there's load shedding, the teacher goes live from their phone; every lesson is recorded and available forever" — that school wins enrollment.

This feature, combined with the AI Tutor and the Career Guidance module, positions Campusly as a **complete education platform**, not just school admin software.
