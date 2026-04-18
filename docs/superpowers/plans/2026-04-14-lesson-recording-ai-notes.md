# Lesson Recording + AI Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add lesson recording via LiveKit Egress, AI-powered transcription + study notes via Claude, and a student revision page with searchable transcript, structured notes, and PDF export.

**Architecture:** Teacher clicks Record → backend starts LiveKit Room Composite Egress → MP4 saved to cloud → BullMQ job transcribes audio via Claude → second Claude call generates structured notes → stored as LessonNote → students access via revision page with video + notes + transcript.

**Tech Stack:** LiveKit Egress API (livekit-server-sdk), Claude API (Anthropic — audio transcription + notes generation), BullMQ (job queue), MongoDB (persistence), React 19 + Next.js 16 (frontend).

**Spec:** `docs/superpowers/specs/2026-04-14-lesson-recording-ai-notes-design.md`

---

## File Map

### Backend — New Files
- `src/modules/Classroom/model-lesson-note.ts` — LessonNote Mongoose model
- `src/modules/Classroom/service-recording.ts` — LiveKit Egress start/stop + webhook handler
- `src/modules/Classroom/controller-recording.ts` — Recording + lesson notes HTTP handlers
- `src/jobs/lesson-notes.job.ts` — BullMQ job: transcribe audio + generate notes

### Backend — Modified Files
- `src/services/ai.service.ts` — add `generateAudioCompletion()` method
- `src/modules/Classroom/model.ts` — add `egressId`, `isRecording`, `lessonNoteId` to VirtualSession
- `src/modules/Classroom/routes.ts` — add recording + notes + webhook routes
- `src/jobs/queues.ts` — add `lessonNotesQueue`
- `src/jobs/index.ts` — register lesson notes worker

### Frontend — New Files
- `src/hooks/useClassroomRecording.ts` — start/stop recording + state
- `src/hooks/useLessonNotes.ts` — fetch notes + class notes list
- `src/app/(dashboard)/classroom/[sessionId]/notes/page.tsx` — revision page
- `src/components/classroom/LessonNotesView.tsx` — notes tabs (summary, transcript, Q&A, etc.)
- `src/components/classroom/TranscriptView.tsx` — searchable transcript with timestamp links

### Frontend — Modified Files
- `src/components/classroom/TeacherControls.tsx` — add Record button
- `src/hooks/useClassroomSessions.ts` — expose recording state from session data

---

## Task 1: Backend — LessonNote Model

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Classroom\model-lesson-note.ts`

- [ ] **Step 1: Create the model**

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface ITeacherQuestion {
  question: string;
  answer: string;
  timestamp: string;
}

export interface IStudentQuestion {
  student: string;
  question: string;
  response: string;
  source: 'chat' | 'verbal';
}

export interface IPollResult {
  question: string;
  options: string[];
  responseCounts: number[];
  totalResponses: number;
}

export interface IKeyTerm {
  term: string;
  definition: string;
}

export interface ILessonNotes {
  summary: string;
  keyConcepts: string[];
  teacherQuestions: ITeacherQuestion[];
  studentQuestions: IStudentQuestion[];
  pollResults: IPollResult[];
  actionItems: string[];
  keyTerms: IKeyTerm[];
}

export interface ILessonNote extends Document {
  sessionId: Types.ObjectId;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId;
  classId: Types.ObjectId;
  subjectId: Types.ObjectId;
  recordingUrl: string;
  transcript: ITranscriptSegment[];
  notes: ILessonNotes;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
  {
    speaker: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false },
);

const lessonNotesSchema = new Schema<ILessonNotes>(
  {
    summary: { type: String, default: '' },
    keyConcepts: [{ type: String }],
    teacherQuestions: [
      {
        question: { type: String },
        answer: { type: String },
        timestamp: { type: String },
        _id: false,
      },
    ],
    studentQuestions: [
      {
        student: { type: String },
        question: { type: String },
        response: { type: String },
        source: { type: String, enum: ['chat', 'verbal'] },
        _id: false,
      },
    ],
    pollResults: [
      {
        question: { type: String },
        options: [{ type: String }],
        responseCounts: [{ type: Number }],
        totalResponses: { type: Number },
        _id: false,
      },
    ],
    actionItems: [{ type: String }],
    keyTerms: [
      {
        term: { type: String },
        definition: { type: String },
        _id: false,
      },
    ],
  },
  { _id: false },
);

const lessonNoteSchema = new Schema<ILessonNote>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'VirtualSession', required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    recordingUrl: { type: String, required: true },
    transcript: [transcriptSegmentSchema],
    notes: { type: lessonNotesSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

lessonNoteSchema.index({ sessionId: 1 });
lessonNoteSchema.index({ classId: 1, schoolId: 1 });

export const LessonNote = mongoose.model<ILessonNote>('LessonNote', lessonNoteSchema);
```

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 2: Backend — Update VirtualSession Model

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Classroom\model.ts`

- [ ] **Step 1: Add recording + notes fields to IVirtualSession interface**

Read the file first. Add after the existing `recordingUrl?: string` field:

```typescript
egressId?: string;
isRecording: boolean;
lessonNoteId?: Types.ObjectId;
```

- [ ] **Step 2: Add fields to the Mongoose schema**

In the `virtualSessionSchema`, add:

```typescript
egressId: { type: String },
isRecording: { type: Boolean, default: false },
lessonNoteId: { type: Schema.Types.ObjectId, ref: 'LessonNote' },
```

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 3: Backend — AIService Audio Method

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\services\ai.service.ts`

- [ ] **Step 1: Add generateAudioCompletion method**

Read the file. Find `generateVisionCompletion`. Add a new method after it that follows the same pattern (semaphore, abort controller, client.messages.create) but uses audio content blocks:

```typescript
static async generateAudioCompletion(
  systemPrompt: string,
  userText: string,
  audioBase64: string,
  audioMediaType: 'audio/mp4' | 'audio/mpeg' | 'audio/wav' | 'audio/webm' = 'audio/mp4',
  options?: { maxTokens?: number; temperature?: number },
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  await AIService.acquireSemaphore();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600_000); // 10 min for audio

  try {
    const response = await AIService.client.messages.create(
      {
        model: AIService.model,
        max_tokens: options?.maxTokens ?? 8192,
        temperature: options?.temperature ?? 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'input_audio' as const,
                source: {
                  type: 'base64' as const,
                  media_type: audioMediaType,
                  data: audioBase64,
                },
              },
              { type: 'text' as const, text: userText },
            ],
          },
        ],
      },
      { signal: controller.signal },
    );

    clearTimeout(timeout);
    const text = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      text,
      usage: AIService.getTokenUsage(response),
    };
  } finally {
    clearTimeout(timeout);
    AIService.releaseSemaphore();
  }
}
```

Note: The `input_audio` content type may need to be typed as `any` or use a type assertion if the Anthropic SDK types don't include it yet. Check the installed SDK version and its type definitions. If needed:
```typescript
content: [
  {
    type: 'input_audio',
    source: { type: 'base64', media_type: audioMediaType, data: audioBase64 },
  } as unknown as Anthropic.ContentBlockParam,
  { type: 'text', text: userText },
],
```

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 4: Backend — Recording Service

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Classroom\service-recording.ts`

- [ ] **Step 1: Create the recording service**

```typescript
import { EgressClient, EncodedFileOutput, EncodedFileType, EgressInfo } from 'livekit-server-sdk';
import { VirtualSession } from './model.js';
import { LessonNote } from './model-lesson-note.js';
import { NotFoundError, BadRequestError } from '../../common/errors.js';

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? '';

function isEgressConfigured(): boolean {
  return !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET && process.env.LIVEKIT_EGRESS_ENABLED === 'true');
}

function getEgressClient(): EgressClient {
  return new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export class RecordingService {
  static async startRecording(sessionId: string, schoolId: string): Promise<void> {
    if (!isEgressConfigured()) {
      throw new BadRequestError('Recording is not configured');
    }

    const session = await VirtualSession.findOne({ _id: sessionId, schoolId, isDeleted: false });
    if (!session) throw new NotFoundError('Session not found');
    if (session.status !== 'live') throw new BadRequestError('Session must be live to record');
    if (session.isRecording) throw new BadRequestError('Already recording');

    const roomName = session.roomId ?? `session_${String(session._id)}`;
    const client = getEgressClient();

    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
    });

    const egress: EgressInfo = await client.startRoomCompositeEgress(roomName, { file: output });

    session.egressId = egress.egressId;
    session.isRecording = true;
    await session.save();
  }

  static async stopRecording(sessionId: string, schoolId: string): Promise<void> {
    const session = await VirtualSession.findOne({ _id: sessionId, schoolId, isDeleted: false });
    if (!session) throw new NotFoundError('Session not found');
    if (!session.isRecording || !session.egressId) throw new BadRequestError('Not recording');

    const client = getEgressClient();
    await client.stopEgress(session.egressId);

    session.isRecording = false;
    await session.save();
  }

  static async handleEgressWebhook(egressId: string, recordingUrl: string): Promise<void> {
    const session = await VirtualSession.findOne({ egressId });
    if (!session) return; // ignore unknown egress events

    session.recordingUrl = recordingUrl;
    session.isRecorded = true;
    session.isRecording = false;
    await session.save();

    // Queue AI processing job
    const { addLessonNotesJob } = await import('../../jobs/lesson-notes.job.js');
    await addLessonNotesJob({
      sessionId: String(session._id),
      schoolId: String(session.schoolId),
      teacherId: String(session.teacherId),
      classId: String(session.classId),
      subjectId: String(session.subjectId),
      recordingUrl,
    });
  }

  static async getLessonNote(sessionId: string, schoolId: string) {
    const note = await LessonNote.findOne({ sessionId, schoolId }).lean();
    if (!note) throw new NotFoundError('Lesson notes not found');
    return note;
  }

  static async getClassLessonNotes(classId: string, schoolId: string) {
    return LessonNote.find({ classId, schoolId, status: 'completed' })
      .sort({ createdAt: -1 })
      .select('-transcript') // transcript is large, exclude from list view
      .lean();
  }

  static async retryLessonNotes(sessionId: string, schoolId: string): Promise<void> {
    const session = await VirtualSession.findOne({ _id: sessionId, schoolId, isDeleted: false });
    if (!session || !session.recordingUrl) throw new BadRequestError('No recording to process');

    // Delete failed note if exists
    await LessonNote.deleteOne({ sessionId, status: 'failed' });

    const { addLessonNotesJob } = await import('../../jobs/lesson-notes.job.js');
    await addLessonNotesJob({
      sessionId: String(session._id),
      schoolId: String(session.schoolId),
      teacherId: String(session.teacherId),
      classId: String(session.classId),
      subjectId: String(session.subjectId),
      recordingUrl: session.recordingUrl,
    });
  }
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

Note: The `EncodedFileOutput` constructor and `startRoomCompositeEgress` signatures may differ from above. Read the actual types in `node_modules/livekit-server-sdk/dist/EgressClient.d.ts` and adjust. The key pattern is correct — create an output config and pass it with the room name.

---

## Task 5: Backend — Lesson Notes BullMQ Job

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\jobs\lesson-notes.job.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\jobs\queues.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\jobs\index.ts`

- [ ] **Step 1: Add queue to queues.ts**

Read the file. Add alongside existing queues:

```typescript
export const lessonNotesQueue = new Queue('lesson-notes', {
  connection: redisConnection,
  defaultJobOptions,
});
```

- [ ] **Step 2: Create the job processor**

```typescript
// src/jobs/lesson-notes.job.ts
import { Worker, type Job } from 'bullmq';
import { redisConnection } from './queues.js';
import { lessonNotesQueue } from './queues.js';
import { LessonNote } from '../modules/Classroom/model-lesson-note.js';
import { SessionChatMessage } from '../modules/Classroom/model-chat.js';
import { VirtualSession } from '../modules/Classroom/model.js';
import { AIService } from '../services/ai.service.js';
import { logger } from '../common/logger.js';
import https from 'https';
import http from 'http';

interface LessonNotesJobData {
  sessionId: string;
  schoolId: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  recordingUrl: string;
}

const TRANSCRIPTION_PROMPT = `Transcribe this classroom lesson recording. Identify speakers:
- Label the main/dominant voice as "Teacher"
- Label other voices as "Student 1", "Student 2", etc.
- If you cannot distinguish individual students, use "Student"

Return a JSON array of segments:
[{ "speaker": "Teacher", "text": "...", "timestamp": "MM:SS" }, ...]

Include a timestamp marker every time the speaker changes or every 30 seconds.`;

const NOTES_PROMPT = `You are generating study notes from a classroom lesson for student revision. You have:

1. A transcript of the lesson
2. Chat messages from the session
3. Poll results

Generate structured notes in this exact JSON format:
{
  "summary": "3-5 paragraph overview of what was taught",
  "keyConcepts": ["concept 1", "concept 2"],
  "teacherQuestions": [{ "question": "...", "answer": "...", "timestamp": "MM:SS" }],
  "studentQuestions": [{ "student": "...", "question": "...", "response": "...", "source": "verbal" }],
  "pollResults": [{ "question": "...", "options": ["A", "B"], "responseCounts": [10, 5], "totalResponses": 15 }],
  "actionItems": ["task 1", "task 2"],
  "keyTerms": [{ "term": "...", "definition": "..." }]
}

Merge questions from the transcript (source: "verbal") and chat messages (source: "chat").
Be thorough — students will use these notes to revise for exams.`;

async function downloadAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function processLessonNotes(job: Job<LessonNotesJobData>): Promise<void> {
  const { sessionId, schoolId, teacherId, classId, subjectId, recordingUrl } = job.data;

  // Create the lesson note record in processing state
  const lessonNote = await LessonNote.create({
    sessionId,
    schoolId,
    teacherId,
    classId,
    subjectId,
    recordingUrl,
    status: 'processing',
    transcript: [],
    notes: {
      summary: '',
      keyConcepts: [],
      teacherQuestions: [],
      studentQuestions: [],
      pollResults: [],
      actionItems: [],
      keyTerms: [],
    },
  });

  // Link to session
  await VirtualSession.findByIdAndUpdate(sessionId, { lessonNoteId: lessonNote._id });

  try {
    // Step 1: Download recording audio
    logger.info({ sessionId }, 'Downloading recording for transcription');
    const audioBase64 = await downloadAsBase64(recordingUrl);

    // Step 2: Transcribe with Claude
    logger.info({ sessionId }, 'Transcribing audio with Claude');
    const transcriptionResult = await AIService.generateAudioCompletion(
      TRANSCRIPTION_PROMPT,
      'Please transcribe the lesson recording.',
      audioBase64,
      'audio/mp4',
      { maxTokens: 16384, temperature: 0.1 },
    );

    let transcript: Array<{ speaker: string; text: string; timestamp: string }> = [];
    try {
      transcript = JSON.parse(transcriptionResult.text);
    } catch {
      // If JSON parse fails, treat the whole response as a single segment
      transcript = [{ speaker: 'Teacher', text: transcriptionResult.text, timestamp: '00:00' }];
    }

    // Step 3: Fetch chat messages + poll data
    const chatMessages = await SessionChatMessage.find({ sessionId }).sort({ timestamp: 1 }).lean();
    const session = await VirtualSession.findById(sessionId).lean();
    const polls = session?.polls ?? [];

    // Step 4: Generate structured notes
    const contextText = [
      'TRANSCRIPT:',
      transcript.map((s) => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n'),
      '',
      'CHAT MESSAGES:',
      chatMessages.map((m) => `[${m.userName} (${m.userRole})]: ${m.message}`).join('\n'),
      '',
      'POLLS:',
      polls.map((p) => `Q: ${p.question} | Options: ${p.options.join(', ')} | Responses: ${p.responses.length}`).join('\n'),
    ].join('\n');

    logger.info({ sessionId }, 'Generating lesson notes with Claude');
    const notesResult = await AIService.generateJSON<Record<string, unknown>>(
      NOTES_PROMPT,
      contextText,
      { maxTokens: 8192, temperature: 0.3 },
    );

    // Step 5: Save results
    lessonNote.transcript = transcript;
    lessonNote.notes = notesResult as unknown as typeof lessonNote.notes;
    lessonNote.status = 'completed';
    await lessonNote.save();

    logger.info({ sessionId, lessonNoteId: lessonNote._id }, 'Lesson notes generated successfully');
  } catch (err: unknown) {
    logger.error({ sessionId, err }, 'Failed to generate lesson notes');
    lessonNote.status = 'failed';
    lessonNote.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await lessonNote.save();
  }
}

export function createLessonNotesWorker(): Worker {
  const worker = new Worker('lesson-notes', processLessonNotes, {
    connection: redisConnection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Lesson notes job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Lesson notes job failed');
  });

  return worker;
}

export async function addLessonNotesJob(data: LessonNotesJobData): Promise<void> {
  await lessonNotesQueue.add('generate-notes', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
  });
}
```

- [ ] **Step 3: Register worker in index.ts**

Read `src/jobs/index.ts`. Add the lesson notes worker alongside existing workers:

```typescript
import { createLessonNotesWorker } from './lesson-notes.job.js';

// Inside setupWorkers():
createLessonNotesWorker();
```

- [ ] **Step 4: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 6: Backend — Recording + Notes Controller + Routes

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Classroom\controller-recording.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Classroom\routes.ts`

- [ ] **Step 1: Create the recording controller**

```typescript
import type { Request } from 'express';
import { Response } from 'express';
import { getUser } from '../../types/authenticated-request.js';
import { RecordingService } from './service-recording.js';
import { apiResponse } from '../../common/utils.js';
import { WebhookReceiver } from 'livekit-server-sdk';

export class RecordingController {
  static async startRecording(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    await RecordingService.startRecording(req.params.id as string, user.schoolId!);
    res.json(apiResponse(true, undefined, 'Recording started'));
  }

  static async stopRecording(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    await RecordingService.stopRecording(req.params.id as string, user.schoolId!);
    res.json(apiResponse(true, undefined, 'Recording stopped'));
  }

  static async handleEgressWebhook(req: Request, res: Response): Promise<void> {
    try {
      const receiver = new WebhookReceiver(
        process.env.LIVEKIT_API_KEY ?? '',
        process.env.LIVEKIT_API_SECRET ?? '',
      );
      const event = await receiver.receive(req.body, req.get('Authorization'));

      if (event.event === 'egress_ended' && event.egressInfo) {
        const egressId = event.egressInfo.egressId;
        // Extract the file URL from the egress results
        const fileResult = event.egressInfo.fileResults?.[0];
        const recordingUrl = fileResult?.location ?? '';

        if (egressId && recordingUrl) {
          await RecordingService.handleEgressWebhook(egressId, recordingUrl);
        }
      }

      res.json({ success: true });
    } catch (err: unknown) {
      console.error('Webhook verification failed', err);
      res.status(400).json({ success: false, error: 'Invalid webhook' });
    }
  }

  static async getLessonNotes(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const note = await RecordingService.getLessonNote(req.params.id as string, user.schoolId!);
    res.json(apiResponse(true, note, 'Lesson notes retrieved'));
  }

  static async getClassLessonNotes(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    const notes = await RecordingService.getClassLessonNotes(req.params.classId as string, user.schoolId!);
    res.json(apiResponse(true, notes, 'Class lesson notes retrieved'));
  }

  static async retryLessonNotes(req: Request, res: Response): Promise<void> {
    const user = getUser(req);
    await RecordingService.retryLessonNotes(req.params.id as string, user.schoolId!);
    res.json(apiResponse(true, undefined, 'Lesson notes generation restarted'));
  }
}
```

- [ ] **Step 2: Add routes**

Read `src/modules/Classroom/routes.ts`. Add these routes. Import `RecordingController`. The webhook route should NOT have authentication (it's called by LiveKit):

```typescript
import { RecordingController } from './controller-recording.js';

// ─── Recording ──────────────────────────────────────────────────────────────

router.post(
  '/sessions/:id/recording/start',
  authorize(...TEACHER_ROLES),
  RecordingController.startRecording,
);

router.post(
  '/sessions/:id/recording/stop',
  authorize(...TEACHER_ROLES),
  RecordingController.stopRecording,
);

// ─── Lesson Notes ───────────────────────────────────────────────────────────

router.get(
  '/sessions/:id/notes',
  authorize(...ALL_ROLES),
  RecordingController.getLessonNotes,
);

router.get(
  '/notes/class/:classId',
  authorize(...ALL_ROLES),
  RecordingController.getClassLessonNotes,
);

router.post(
  '/sessions/:id/notes/retry',
  authorize(...TEACHER_ROLES),
  RecordingController.retryLessonNotes,
);
```

For the webhook, it needs to be mounted WITHOUT authentication. Add it in `app.ts` directly (not in the classroom routes which have `authenticate` at mount level):

In `src/app.ts`, add:
```typescript
import { RecordingController } from './modules/Classroom/controller-recording.js';
app.post('/api/classroom/webhook/egress', express.raw({ type: '*/*' }), RecordingController.handleEgressWebhook);
```

This must be BEFORE the `app.use('/api/classroom', authenticate, classroomRoutes)` line so it takes priority.

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 7: Frontend — Recording Hook + TeacherControls Update

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useClassroomRecording.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\classroom\TeacherControls.tsx`

- [ ] **Step 1: Create recording hook**

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

export function useClassroomRecording(sessionId: string | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      setDuration(0);
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/classroom/sessions/${sessionId}/recording/start`);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (err: unknown) {
      console.error('Failed to start recording', err);
      toast.error('Failed to start recording');
    }
  }, [sessionId]);

  const stopRecording = useCallback(async () => {
    if (!sessionId) return;
    try {
      await apiClient.post(`/classroom/sessions/${sessionId}/recording/stop`);
      setIsRecording(false);
      toast.success('Recording stopped. AI notes will be generated shortly.');
    } catch (err: unknown) {
      console.error('Failed to stop recording', err);
      toast.error('Failed to stop recording');
    }
  }, [sessionId]);

  const formatDuration = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return {
    isRecording,
    duration,
    formattedDuration: formatDuration(duration),
    startRecording,
    stopRecording,
  };
}
```

- [ ] **Step 2: Add Record button to TeacherControls**

Read `src/components/classroom/TeacherControls.tsx`. Add a Record button between Screen Share and Poll. Props need `onStartRecording`, `onStopRecording`, `isRecording`, `recordingDuration`:

Add to props:
```typescript
interface TeacherControlsProps {
  onEnd: () => void;
  onCreatePoll?: () => void;
  isRecording?: boolean;
  recordingDuration?: string;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}
```

Add the button (after screen share, before poll):
```tsx
{onStartRecording && onStopRecording && (
  <Button
    variant={isRecording ? 'destructive' : 'secondary'}
    size="icon"
    onClick={isRecording ? onStopRecording : onStartRecording}
    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    className="relative"
  >
    <Circle className={cn('h-5 w-5', isRecording && 'animate-pulse fill-current')} />
    {isRecording && recordingDuration && (
      <span className="absolute -top-5 text-[10px] text-destructive font-mono">
        {recordingDuration}
      </span>
    )}
  </Button>
)}
```

Import `Circle` from lucide-react and `cn` from `@/lib/utils`.

- [ ] **Step 3: Wire recording into the session page**

In `src/app/(dashboard)/classroom/[sessionId]/page.tsx`, add:
```typescript
const { isRecording, formattedDuration, startRecording, stopRecording } = useClassroomRecording(sessionId);
```

Pass to TeacherControls:
```tsx
<TeacherControls
  onEnd={handleEndSession}
  onCreatePoll={() => setPollDialogOpen(true)}
  isRecording={isRecording}
  recordingDuration={formattedDuration}
  onStartRecording={startRecording}
  onStopRecording={stopRecording}
/>
```

- [ ] **Step 4: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 8: Frontend — Lesson Notes Hook + Revision Page

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useLessonNotes.ts`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classroom\TranscriptView.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classroom\LessonNotesView.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\classroom\[sessionId]\notes\page.tsx`

- [ ] **Step 1: Create useLessonNotes hook**

Standard data-fetching hook. Calls `GET /classroom/sessions/:id/notes` and `GET /classroom/notes/class/:classId`. Under 60 lines.

- [ ] **Step 2: Create TranscriptView component**

Searchable transcript with clickable timestamps. Props: `{ transcript, onTimestampClick }`. Search input filters segments. Clicking a timestamp calls `onTimestampClick(timestamp)` which the parent uses to seek the video player. Under 80 lines.

- [ ] **Step 3: Create LessonNotesView component**

Tabbed view of the notes sections. Props: `{ notes, transcript, onTimestampClick }`. Tabs: Summary, Transcript, Q&A, Key Terms, Actions. Under 200 lines.

- [ ] **Step 4: Create the revision page**

The page at `/classroom/[sessionId]/notes`:
1. Fetch lesson notes via `useLessonNotes`
2. Show video player (HTML5 `<video>` element with the recording URL)
3. Show `LessonNotesView` below
4. Wire timestamp clicks to video seek: `videoRef.current.currentTime = parseTimestamp(ts)`
5. "Export as PDF" button using `printContent()` from `@/lib/print-utils`
6. Loading state: "Notes are being generated..." with spinner when status is 'processing'
7. Error state: "Notes generation failed" with retry button (teacher only)

Under 150 lines. Most content is in the child components.

- [ ] **Step 5: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 9: Full Typecheck + Verification

- [ ] **Step 1: Backend typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 2: Frontend typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

- [ ] **Step 3: Fix any errors**

Common issues to watch for:
- LiveKit SDK type mismatches (EgressClient constructor, EncodedFileOutput)
- Claude audio content block type (`input_audio` may not be in SDK types yet)
- BullMQ queue/worker connection types
- tldraw/Yjs type conflicts

---

## Summary

| Task | Description | Backend/Frontend | Depends On |
|------|-------------|-----------------|------------|
| 1 | LessonNote model | Backend | — |
| 2 | VirtualSession model update | Backend | — |
| 3 | AIService audio method | Backend | — |
| 4 | Recording service (Egress) | Backend | 1, 2 |
| 5 | Lesson notes BullMQ job | Backend | 1, 3 |
| 6 | Recording controller + routes | Backend | 4, 5 |
| 7 | Recording hook + TeacherControls | Frontend | 6 |
| 8 | Lesson notes hook + revision page | Frontend | 6 |
| 9 | Full typecheck | Both | All |
