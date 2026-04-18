# Lesson Recording + AI Notes — Design Spec

**Status:** Approved
**Date:** 2026-04-14
**Author:** Shaun + Claude

## 1. Goal

Enable teachers to record live classroom sessions, then automatically generate AI-powered lesson notes for students. Students get a revision page with the recording, a searchable transcript, structured study notes (summary, key concepts, questions, action items), chat history, and poll results — all exportable as PDF.

## 2. Architecture

### 2.1 Recording — LiveKit Egress API

LiveKit's Egress API records a room as a single MP4 (Room Composite). The backend starts/stops recording via the LiveKit server SDK. When the recording finishes, LiveKit delivers the file to cloud storage (S3 or LiveKit's built-in storage) and sends a webhook with the download URL.

Flow:
```
Teacher clicks "Record"
  → Backend calls LiveKit Egress: startRoomCompositeEgress(roomName)
  → LiveKit records all audio/video in the room
  → Teacher clicks "Stop Recording" or ends session
  → Backend calls LiveKit Egress: stopEgress(egressId)
  → LiveKit webhook fires with recording URL
  → Backend stores URL on VirtualSession record
  → Backend queues AI processing job
```

### 2.2 AI Processing Pipeline

A BullMQ job processes the recording asynchronously:

1. **Transcribe** — Send the audio to Claude (Anthropic API) with a prompt requesting speaker-labeled transcription with timestamps. Claude identifies "Teacher" vs "Student" speakers from voice patterns.
2. **Fetch context** — Pull chat messages and poll results from MongoDB for this session.
3. **Generate notes** — Send transcript + chat + polls to Claude with a structured prompt:
   - Lesson Summary (3-5 paragraphs)
   - Key Concepts (bullet points)
   - Questions Asked by Teacher (with answers if given)
   - Student Questions from Chat (with teacher responses)
   - Poll Results (each question + class responses)
   - Action Items / Homework mentioned
   - Key Terms & Definitions introduced
4. **Save** — Store the transcript and notes in a `LessonNote` document linked to the session.

### 2.3 Student Revision Page

A page at `/classroom/[sessionId]/notes` showing:
- Video player (MP4 from recording URL)
- AI lesson notes (rendered as structured sections)
- Searchable transcript (timestamps clickable → video jumps to that point)
- Chat history from the session
- Poll results with class statistics
- "Export as PDF" button

## 3. Data Model

### 3.1 New: `LessonNote` collection

```typescript
interface ILessonNote extends Document {
  sessionId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  recordingUrl: string;
  transcript: Array<{
    speaker: string;       // "Teacher", "Student 1", etc.
    text: string;
    timestamp: string;     // "00:03:45"
  }>;
  notes: {
    summary: string;
    keyConcepts: string[];
    teacherQuestions: Array<{
      question: string;
      answer: string;
      timestamp: string;
    }>;
    studentQuestions: Array<{
      student: string;
      question: string;
      response: string;
      source: 'chat' | 'verbal';
    }>;
    pollResults: Array<{
      question: string;
      options: string[];
      responseCounts: number[];
      totalResponses: number;
    }>;
    actionItems: string[];
    keyTerms: Array<{
      term: string;
      definition: string;
    }>;
  };
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes: `{ sessionId: 1 }`, `{ classId: 1, schoolId: 1 }`

### 3.2 Modify: `VirtualSession`

The model already has `recordingUrl?: string` and `isRecorded: boolean`. Add these new fields:
```typescript
egressId?: string;          // LiveKit egress job ID for stop/status
isRecording: boolean;       // live state flag (true while actively recording, vs isRecorded which is set after)
lessonNoteId?: Types.ObjectId;
```

## 4. Backend Changes

### 4.1 New dependencies

None for backend packages — `livekit-server-sdk` (already installed) includes the Egress API and `WebhookReceiver` for webhook verification. BullMQ is already in the project for job queues.

A new `generateAudioCompletion()` method is needed on `AIService` (`src/services/ai.service.ts`). The existing service has text, image, document, and vision methods but no audio method. Claude's Messages API accepts audio via base64-encoded content blocks with `type: 'input_audio'` and `source: { type: 'base64', media_type: 'audio/mp4', data: '...' }`. The new method follows the same pattern as `generateVisionCompletion()` but with audio content blocks.

### 4.2 Env vars

```
LIVEKIT_EGRESS_ENABLED=true          # enable/disable recording
```

S3 storage for recordings is configured in LiveKit Cloud dashboard, not in the backend. The webhook delivers the URL after upload.

### 4.3 Recording service

Create `src/modules/Classroom/service-recording.ts`:

- `startRecording(sessionId, schoolId)` — validates session is live, calls `egressClient.startRoomCompositeEgress()` with the room name, stores `egressId` on the session.
- `stopRecording(sessionId, schoolId)` — calls `egressClient.stopEgress(egressId)`.
- `handleRecordingWebhook(egressId, recordingUrl)` — updates session with recording URL, queues AI processing job.

### 4.4 Recording endpoints

```
POST /classroom/sessions/:id/recording/start  — teacher only
POST /classroom/sessions/:id/recording/stop   — teacher only
POST /classroom/webhook/egress                — LiveKit webhook (verified via `WebhookReceiver` from livekit-server-sdk using LIVEKIT_API_KEY + LIVEKIT_API_SECRET)
```

### 4.5 AI processing job

Create `src/jobs/lesson-notes.job.ts`:

Uses BullMQ (already in project). Job processor:
1. Fetch session + recording URL
2. Download audio from recording URL
3. Call `AIService.generateAudioCompletion()` (new method) with the audio for transcription — sends base64 audio as an `input_audio` content block to Claude
4. Fetch `SessionChatMessage` and `SessionPoll` for context
5. Call `AIService.generateJSON()` with transcript + context for structured notes
6. Create `LessonNote` document
7. Update session with `lessonNoteId`

### 4.6 Lesson notes endpoints

```
GET /classroom/sessions/:id/notes          — get lesson notes for a session
GET /classroom/notes/class/:classId        — list all lesson notes for a class (student revision list)
```

### 4.7 Transcription prompt

```
Transcribe this classroom lesson recording. Identify speakers:
- Label the main/dominant voice as "Teacher"
- Label other voices as "Student 1", "Student 2", etc. (number them if you can distinguish)
- If you cannot distinguish individual students, use "Student"

Format each segment as:
[MM:SS] Speaker: text

Include a timestamp marker every time the speaker changes or every 30 seconds within a continuous segment.
```

### 4.8 Notes generation prompt

```
You are generating study notes from a classroom lesson for student revision. You have:

1. A transcript of the lesson (with speaker labels and timestamps)
2. Chat messages from the session
3. Poll questions and results

Generate structured notes in this exact JSON format:
{
  "summary": "3-5 paragraph overview of what was taught",
  "keyConcepts": ["concept 1", "concept 2", ...],
  "teacherQuestions": [
    { "question": "...", "answer": "...", "timestamp": "MM:SS" }
  ],
  "studentQuestions": [
    { "student": "Student 1", "question": "...", "response": "...", "source": "verbal|chat" }
  ],
  "pollResults": [
    { "question": "...", "options": ["A", "B", "C"], "responseCounts": [12, 5, 3], "totalResponses": 20 }
  ],
  "actionItems": ["homework task 1", "read chapter 5", ...],
  "keyTerms": [
    { "term": "Photosynthesis", "definition": "The process by which plants convert sunlight into energy" }
  ]
}

Be thorough — students will use these notes to revise for exams. Include every question asked, every key concept explained, and every task assigned.
```

## 5. Frontend Changes

### 5.1 Recording controls in TeacherControls

Add a "Record" toggle button to the existing TeacherControls component. When recording:
- Button turns red with a pulsing dot
- Shows recording duration timer
- Click again to stop

The button calls the recording endpoints via a new `useClassroomRecording` hook.

### 5.2 Recording hook

Create `src/hooks/useClassroomRecording.ts`:
- `startRecording(sessionId)` — POST to start endpoint
- `stopRecording(sessionId)` — POST to stop endpoint
- `isRecording` state
- `duration` state (local timer while recording)

### 5.3 Lesson Notes page

Create `src/app/(dashboard)/classroom/[sessionId]/notes/page.tsx`:

Layout:
```
┌──────────────────────────────────────────┐
│  Video Player (MP4)                       │
│  ┌─────────────────────────────────────┐ │
│  │  ▶ Recording playback               │ │
│  └─────────────────────────────────────┘ │
├──────────────────────────────────────────┤
│  Tabs: [Summary] [Transcript] [Q&A]     │
│        [Polls] [Key Terms] [Export]      │
│                                          │
│  [Tab content - rendered markdown/cards] │
└──────────────────────────────────────────┘
```

**Summary tab:** Lesson summary + key concepts + action items
**Transcript tab:** Searchable transcript with clickable timestamps (clicking jumps the video player)
**Q&A tab:** Teacher questions + student questions from chat + verbal
**Polls tab:** Each poll with bar chart of results
**Key Terms tab:** Glossary-style term/definition cards
**Export tab:** "Download as PDF" button that generates a formatted PDF

### 5.4 Student revision list

Add to the student dashboard or accessible from the class view:
- `GET /classroom/notes/class/:classId` returns all lesson notes
- Display as a list of cards: date, subject, title, with "View Notes" link

### 5.5 Lesson notes hook

Create `src/hooks/useLessonNotes.ts`:
- `getNotes(sessionId)` — GET /classroom/sessions/:id/notes
- `getClassNotes(classId)` — GET /classroom/notes/class/:classId
- `notes`, `loading` state

## 6. PDF Export

Generate a printable PDF from the lesson notes. Use the browser's `window.print()` with a print-optimized layout (same approach as existing paper PDF — see `src/lib/print-utils.ts`).

The print layout includes:
- Lesson title, date, subject, teacher name
- Summary
- Key Concepts (bullet list)
- Questions & Answers
- Key Terms (two-column glossary)
- Action Items (checklist)

No server-side PDF generation needed — browser print-to-PDF is sufficient.

## 7. Error Handling

- **LiveKit Egress not available** (no cloud storage configured): "Record" button shows tooltip "Recording not available — configure storage in LiveKit dashboard". Button is disabled.
- **Recording fails mid-session**: catch egress error, show toast "Recording failed", reset recording state. Session continues without recording.
- **AI processing fails**: set `LessonNote.status = 'failed'` with error message. Student sees "Notes are being generated..." or "Notes generation failed — the teacher has been notified" with a retry button (teacher only).
- **Large recording** (> 2 hours): process in chunks — split audio into 30-minute segments, transcribe each, concatenate. Claude's context window handles this.

## 8. Permissions

| Action | Teacher | Student |
|--------|---------|---------|
| Start/stop recording | Yes | No |
| View recording + notes | Yes | Yes (own class only) |
| Retry failed notes generation | Yes | No |
| Export as PDF | Yes | Yes |
| Delete recording | Yes | No |

## 9. What's NOT in Scope

- Video editing (trim, cut, splice)
- Student-generated notes or annotations
- Auto-generated flashcards from key terms (Phase 2)
- Integration with external note-taking apps
- Recording consent UI (assumed school policy covers this)
- Multi-language transcription (English only for Phase 1)

## 10. Processing Costs

Per 45-minute lesson:
- Claude audio transcription: ~$0.10-0.30 (depends on audio quality)
- Claude notes generation: ~$0.05 (text input from transcript + chat)
- Total: ~$0.15-0.35 per lesson

For a teacher running 5 lessons/day, 20 days/month: ~$15-35/month in AI processing costs.
