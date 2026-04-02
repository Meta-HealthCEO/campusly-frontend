# AI Student Tutor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every student a 24/7 AI tutor that knows their curriculum (CAPS), their grades, and can explain concepts, help with homework, and generate practice questions — per subject.

**Architecture:** New `AITutor` backend module with conversation persistence. Frontend chat interface at `/student/ai-tutor`. Reuses existing `AIService` (Anthropic Claude) for LLM calls. Teacher report comment generator at `/teacher/ai-tools/report-comments`. Parent AI assistant at `/parent/ai-assistant`.

**Tech Stack:** Express + Mongoose (backend), Next.js + React (frontend), Anthropic Claude API, Zustand, Tailwind CSS, shadcn/ui

---

## Task 1: Backend — AITutor Model & Types

**Files:**
- Create: `campusly-backend/src/modules/AITutor/model.ts`

- [ ] **Step 1: Create the TutorConversation and TutorMessage models**

```typescript
import { Schema, model, Types } from 'mongoose';
import type { Document } from 'mongoose';

/* ── Types ─────────────────────────────────────────── */

export interface ITutorMessage {
  role: 'student' | 'assistant';
  content: string;
  timestamp: Date;
  tokensUsed?: { input: number; output: number };
}

export type TutorMode = 'chat' | 'homework_help' | 'practice' | 'exam_prep';

export interface ITutorConversation extends Document {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  subjectName: string;
  grade: number;
  mode: TutorMode;
  title: string;
  messages: ITutorMessage[];
  totalTokens: { input: number; output: number };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPracticeAttempt extends Document {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  subjectId: Types.ObjectId;
  topic: string;
  grade: number;
  questions: IPracticeQuestion[];
  score: number;
  totalMarks: number;
  completedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPracticeQuestion {
  questionText: string;
  questionType: 'mcq' | 'short_answer' | 'true_false';
  options?: string[];
  correctAnswer: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  explanation: string;
  marks: number;
}

/* ── Schemas ───────────────────────────────────────── */

const tutorMessageSchema = new Schema<ITutorMessage>(
  {
    role: { type: String, enum: ['student', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokensUsed: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const tutorConversationSchema = new Schema<ITutorConversation>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true, trim: true },
    grade: { type: Number, required: true },
    mode: { type: String, enum: ['chat', 'homework_help', 'practice', 'exam_prep'], default: 'chat' },
    title: { type: String, default: 'New conversation', trim: true },
    messages: [tutorMessageSchema],
    totalTokens: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tutorConversationSchema.index({ schoolId: 1, studentId: 1, subjectId: 1 });
tutorConversationSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

const practiceQuestionSchema = new Schema<IPracticeQuestion>(
  {
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['mcq', 'short_answer', 'true_false'], required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    studentAnswer: { type: String },
    isCorrect: { type: Boolean },
    explanation: { type: String, required: true },
    marks: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);

const practiceAttemptSchema = new Schema<IPracticeAttempt>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    topic: { type: String, required: true, trim: true },
    grade: { type: Number, required: true },
    questions: [practiceQuestionSchema],
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, required: true },
    completedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

practiceAttemptSchema.index({ schoolId: 1, studentId: 1, subjectId: 1 });

export const TutorConversation = model<ITutorConversation>('TutorConversation', tutorConversationSchema);
export const PracticeAttempt = model<IPracticeAttempt>('PracticeAttempt', practiceAttemptSchema);
```

- [ ] **Step 2: Verify file saved**

---

## Task 2: Backend — Validation Schemas

**Files:**
- Create: `campusly-backend/src/modules/AITutor/validation.ts`

- [ ] **Step 1: Create Zod validation schemas**

```typescript
import { z } from 'zod/v4';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const oid = z.string().regex(objectIdRegex, 'Invalid ObjectId format');

export const sendMessageSchema = z.object({
  conversationId: oid.optional(),
  subjectId: oid,
  subjectName: z.string().min(1).trim(),
  grade: z.number().int().min(1).max(12),
  message: z.string().min(1, 'Message is required').max(4000),
  mode: z.enum(['chat', 'homework_help', 'practice', 'exam_prep']).default('chat'),
}).strict();

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const generatePracticeSchema = z.object({
  subjectId: oid,
  subjectName: z.string().min(1).trim(),
  grade: z.number().int().min(1).max(12),
  topic: z.string().min(1, 'Topic is required').trim(),
  questionCount: z.number().int().min(3).max(20).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  questionTypes: z.array(z.enum(['mcq', 'short_answer', 'true_false'])).min(1).default(['mcq', 'short_answer']),
}).strict();

export type GeneratePracticeInput = z.infer<typeof generatePracticeSchema>;

export const submitPracticeSchema = z.object({
  attemptId: oid,
  answers: z.array(z.object({
    questionIndex: z.number().int().min(0),
    answer: z.string().min(1),
  })).min(1),
}).strict();

export type SubmitPracticeInput = z.infer<typeof submitPracticeSchema>;

export const generateReportCommentsSchema = z.object({
  studentIds: z.array(oid).min(1).max(50),
  subjectId: oid,
  term: z.number().int().min(1).max(4),
  tone: z.enum(['encouraging', 'direct', 'formal']).default('encouraging'),
}).strict();

export type GenerateReportCommentsInput = z.infer<typeof generateReportCommentsSchema>;

export const parentChatSchema = z.object({
  studentId: oid,
  message: z.string().min(1).max(2000),
  conversationId: oid.optional(),
}).strict();

export type ParentChatInput = z.infer<typeof parentChatSchema>;
```

- [ ] **Step 2: Verify file saved**

---

## Task 3: Backend — AITutor Service

**Files:**
- Create: `campusly-backend/src/modules/AITutor/service.ts`

- [ ] **Step 1: Create the AITutorService with chat, practice, and report comment methods**

The service must:
- Use existing `AIService.generateCompletionWithUsage()` for LLM calls
- Build CAPS-aware system prompts with student context (grade, subject, recent marks)
- Store conversations with full message history
- Track token usage via `AIUsageLog`
- Generate practice questions as structured JSON
- Auto-grade practice attempts
- Generate teacher report comments using student data

Key methods:
- `sendMessage(userId, schoolId, input)` — Main chat endpoint. Creates or continues conversation. Builds context from student marks + curriculum.
- `listConversations(userId, schoolId, filters)` — List student's conversations with pagination.
- `getConversation(conversationId, schoolId)` — Get single conversation with all messages.
- `generatePractice(userId, schoolId, input)` — Generate practice questions using AI.
- `submitPractice(userId, schoolId, input)` — Grade a practice attempt.
- `getWeakAreas(userId, schoolId)` — Analyse marks to find weak topics.
- `generateReportComments(teacherId, schoolId, input)` — Generate report comments for teacher.
- `parentChat(userId, schoolId, input)` — Parent AI assistant for progress queries.

System prompt template for student chat:
```
You are a CAPS-aligned tutor for Grade {grade} {subject} in South Africa.
The student's recent marks: {marks summary}.
Rules:
- Use the Socratic method — guide, don't give direct answers
- Age-appropriate language for Grade {grade}
- Stay on-topic (academic only)
- If the student asks about active assessments, say you can't help with graded work
- Explain concepts step-by-step with examples
- Use South African context where possible
```

- [ ] **Step 2: Verify file saved and has no TypeScript errors**

---

## Task 4: Backend — AITutor Controller

**Files:**
- Create: `campusly-backend/src/modules/AITutor/controller.ts`

- [ ] **Step 1: Create static controller methods**

Methods map 1:1 to service methods:
- `sendMessage` — POST, returns conversation with new message
- `listConversations` — GET, returns paginated list
- `getConversation` — GET /:id, returns single conversation
- `generatePractice` — POST, returns practice attempt
- `submitPractice` — POST, returns graded attempt
- `getWeakAreas` — GET /weak-areas, returns analysis
- `generateReportComments` — POST /report-comments, returns comments array
- `parentChat` — POST /parent-chat, returns response

All follow the pattern: extract schoolId from `req.user!.schoolId!`, userId from `getUser(req).id`, call service, wrap in `apiResponse()`.

- [ ] **Step 2: Verify file saved**

---

## Task 5: Backend — AITutor Routes

**Files:**
- Create: `campusly-backend/src/modules/AITutor/routes.ts`

- [ ] **Step 1: Create route definitions**

```typescript
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { AITutorController } from './controller.js';
import {
  sendMessageSchema,
  generatePracticeSchema,
  submitPracticeSchema,
  generateReportCommentsSchema,
  parentChatSchema,
} from './validation.js';

const router = express.Router();

// Student tutor chat
router.post(
  '/chat',
  authenticate,
  authorize('student'),
  validate(sendMessageSchema),
  AITutorController.sendMessage,
);

router.get(
  '/conversations',
  authenticate,
  authorize('student'),
  AITutorController.listConversations,
);

router.get(
  '/conversations/:id',
  authenticate,
  authorize('student'),
  AITutorController.getConversation,
);

// Practice questions
router.post(
  '/practice',
  authenticate,
  authorize('student'),
  validate(generatePracticeSchema),
  AITutorController.generatePractice,
);

router.post(
  '/practice/submit',
  authenticate,
  authorize('student'),
  validate(submitPracticeSchema),
  AITutorController.submitPractice,
);

// Weak area analysis
router.get(
  '/weak-areas',
  authenticate,
  authorize('student'),
  AITutorController.getWeakAreas,
);

// Teacher report comments
router.post(
  '/report-comments',
  authenticate,
  authorize('teacher', 'school_admin', 'super_admin'),
  validate(generateReportCommentsSchema),
  AITutorController.generateReportComments,
);

// Parent AI assistant
router.post(
  '/parent-chat',
  authenticate,
  authorize('parent'),
  validate(parentChatSchema),
  AITutorController.parentChat,
);

router.get(
  '/parent-conversations',
  authenticate,
  authorize('parent'),
  AITutorController.listParentConversations,
);

export default router;
```

- [ ] **Step 2: Mount in app.ts**

Add to `campusly-backend/src/app.ts`:
```typescript
import aiTutorRoutes from './modules/AITutor/routes.js';
// In the guarded section:
app.use('/api/ai-tutor', authenticate, requireModule('ai_tools'), aiTutorRoutes);
```

- [ ] **Step 3: Verify compilation**

Run: `cd /c/Users/shaun/campusly-backend && npx tsc --noEmit`

---

## Task 6: Frontend — AI Tutor Types

**Files:**
- Create: `campusly-frontend/src/types/ai-tutor.ts`

- [ ] **Step 1: Create TypeScript types**

```typescript
export type TutorMode = 'chat' | 'homework_help' | 'practice' | 'exam_prep';

export interface TutorMessage {
  role: 'student' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TutorConversation {
  id: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  mode: TutorMode;
  title: string;
  messages: TutorMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TutorConversationSummary {
  id: string;
  subjectName: string;
  mode: TutorMode;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface PracticeQuestion {
  questionText: string;
  questionType: 'mcq' | 'short_answer' | 'true_false';
  options?: string[];
  correctAnswer: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  explanation: string;
  marks: number;
}

export interface PracticeAttempt {
  id: string;
  subjectId: string;
  topic: string;
  grade: number;
  questions: PracticeQuestion[];
  score: number;
  totalMarks: number;
  completedAt?: string;
  createdAt: string;
}

export interface WeakArea {
  subject: string;
  subjectId: string;
  topic: string;
  averageMark: number;
  assessmentCount: number;
  recommendation: string;
}

export interface SendMessagePayload {
  conversationId?: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  message: string;
  mode?: TutorMode;
}

export interface GeneratePracticePayload {
  subjectId: string;
  subjectName: string;
  grade: number;
  topic: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes?: ('mcq' | 'short_answer' | 'true_false')[];
}

export interface SubmitPracticePayload {
  attemptId: string;
  answers: { questionIndex: number; answer: string }[];
}

export interface ReportComment {
  studentId: string;
  studentName: string;
  comment: string;
}
```

- [ ] **Step 2: Add to barrel export in `src/types/index.ts`**

Add: `export * from './ai-tutor';`

---

## Task 7: Frontend — useAITutor Hook

**Files:**
- Create: `campusly-frontend/src/hooks/useAITutor.ts`

- [ ] **Step 1: Create the hook**

Hook provides:
- `sendMessage(payload)` — Send message, get AI response
- `conversations` / `loadConversations()` — List past conversations
- `currentConversation` / `loadConversation(id)` — Active conversation
- `generatePractice(payload)` — Generate practice quiz
- `submitPractice(payload)` — Submit answers, get graded result
- `weakAreas` / `loadWeakAreas()` — Get weak area analysis
- `loading`, `sending` — Loading states

Pattern: Same as `useAITools.ts` — useState at top, useCallback for each method, toast for feedback, returns object.

- [ ] **Step 2: Verify no TypeScript errors**

---

## Task 8: Frontend — Chat Components

**Files:**
- Create: `campusly-frontend/src/components/ai-tutor/SubjectSelector.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/MessageBubble.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/ChatInput.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/ChatInterface.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/ConversationList.tsx`

Components:
1. **SubjectSelector** — Dropdown of student's enrolled subjects. Uses `useAcademics` to get subjects.
2. **MessageBubble** — Single message with role-based styling (student right-aligned blue, AI left-aligned gray). Renders markdown.
3. **ChatInput** — Text area with send button. Disabled while AI is responding. Shift+Enter for newline.
4. **ChatInterface** — Main chat view. Scrollable message area + ChatInput. Auto-scrolls on new messages.
5. **ConversationList** — Sidebar/panel listing past conversations with subject badges and timestamps.

All components < 150 lines each. No apiClient imports — all data via props or hooks.

- [ ] **Step 3: Verify all components render without errors**

---

## Task 9: Frontend — Practice Components

**Files:**
- Create: `campusly-frontend/src/components/ai-tutor/PracticeSetup.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/PracticeQuestion.tsx`
- Create: `campusly-frontend/src/components/ai-tutor/PracticeResults.tsx`

Components:
1. **PracticeSetup** — Form: select subject, enter topic, choose difficulty, question count, question types. Submit generates quiz.
2. **PracticeQuestion** — Single question display: MCQ with radio buttons, short answer with input, true/false with toggle. Shows explanation after answering.
3. **PracticeResults** — Score summary, per-question breakdown with correct/incorrect indicators, explanations, weak area recommendations.

- [ ] **Step 2: Verify all components render without errors**

---

## Task 10: Frontend — AI Tutor Pages

**Files:**
- Create: `campusly-frontend/src/app/(dashboard)/student/ai-tutor/page.tsx`
- Create: `campusly-frontend/src/app/(dashboard)/student/ai-tutor/practice/page.tsx`

- [ ] **Step 1: Create the main tutor chat page**

Layout: Left panel (conversation list, new chat button), Main area (ChatInterface with SubjectSelector at top). Mobile: conversation list as sheet/drawer.

Page structure follows student dashboard pattern: `'use client'`, hook imports, loading state, responsive grid.

- [ ] **Step 2: Create the practice page**

Layout: PracticeSetup → (on generate) → PracticeQuestion flow → PracticeResults.

- [ ] **Step 3: Add navigation items to student sidebar**

In `src/lib/constants.ts`, add to student nav items:
```typescript
{ href: '/student/ai-tutor', label: 'AI Tutor', icon: Sparkles, module: 'ai_tools' },
```

- [ ] **Step 4: Verify pages render and navigation works**

---

## Task 11: Frontend — Teacher Report Comment Generator

**Files:**
- Create: `campusly-frontend/src/hooks/useReportComments.ts`
- Create: `campusly-frontend/src/components/ai-tutor/ReportCommentGenerator.tsx`
- Create: `campusly-frontend/src/app/(dashboard)/teacher/ai-tools/report-comments/page.tsx`

- [ ] **Step 1: Create hook for report comments**

Simple hook: `generateComments(payload)` → returns `ReportComment[]`. Uses `/ai-tutor/report-comments` endpoint.

- [ ] **Step 2: Create ReportCommentGenerator component**

Form: Select class → auto-populates students. Select subject, term, tone. Generate button. Results show editable text areas per student. Copy button per comment.

- [ ] **Step 3: Create the page**

Standard teacher AI tools sub-page. Add to teacher AI tools navigation.

- [ ] **Step 4: Verify page renders**

---

## Task 12: Frontend — Parent AI Assistant

**Files:**
- Create: `campusly-frontend/src/hooks/useParentAI.ts`
- Create: `campusly-frontend/src/app/(dashboard)/parent/ai-assistant/page.tsx`

- [ ] **Step 1: Create hook for parent AI chat**

Uses `/ai-tutor/parent-chat` and `/ai-tutor/parent-conversations` endpoints. Similar pattern to useAITutor but scoped to parent role.

- [ ] **Step 2: Create the parent AI assistant page**

Chat interface where parent can ask about their child's progress. Child selector at top (for multi-child parents). Suggested questions: "How is my child doing in Maths?", "What should we focus on at home?", "Explain the latest report card".

- [ ] **Step 3: Add to parent sidebar navigation**

- [ ] **Step 4: Verify page renders**

---

## Task 13: Integration Testing & Polish

- [ ] **Step 1: Verify backend compiles** — `cd campusly-backend && npx tsc --noEmit`
- [ ] **Step 2: Verify frontend compiles** — `cd campusly-frontend && npx next build` (or `npx tsc --noEmit`)
- [ ] **Step 3: Test chat flow** — Student sends message → AI responds → conversation persists
- [ ] **Step 4: Test practice flow** — Generate questions → answer → get graded results
- [ ] **Step 5: Test report comments** — Teacher selects class → generates comments → edits → copies
- [ ] **Step 6: Test parent AI** — Parent asks about child → gets contextual response
- [ ] **Step 7: Commit all changes**
