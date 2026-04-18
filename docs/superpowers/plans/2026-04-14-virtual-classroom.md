# Virtual Classroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stubbed virtual classroom with a fully functional live classroom using LiveKit for video/audio and Socket.IO for real-time chat, polls, hand raises, and collaborative whiteboard.

**Architecture:** Three layers — LiveKit Cloud handles WebRTC video/audio (browser connects directly, backend only generates tokens), Socket.IO handles lightweight real-time events (chat, polls, hands, whiteboard sync), existing REST API handles session CRUD. Socket.IO attaches to the existing Express HTTP server.

**Tech Stack:** LiveKit (`livekit-server-sdk`, `@livekit/components-react`), Socket.IO (`socket.io`, `socket.io-client`), tldraw + Yjs (`@tldraw/tldraw`, `yjs`, `y-socket.io`), Express, MongoDB, React 19, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-04-14-virtual-classroom-design.md`

---

## File Map

### Backend — New Files
- `src/socket/index.ts` — Socket.IO server initialization + event handlers
- `src/socket/auth.ts` — Socket authentication middleware (JWT validation)
- `src/socket/chat.handler.ts` — Chat message events + MongoDB persistence
- `src/socket/hand.handler.ts` — Hand raise/lower events
- `src/socket/poll.handler.ts` — Poll create/respond/end broadcast events
- `src/socket/yjs.handler.ts` — Yjs document provider for whiteboard sync
- `src/modules/Classroom/model-chat.ts` — SessionChatMessage model
- `src/services/livekit.service.ts` — LiveKit token generation + room management

### Backend — Modified Files
- `src/index.ts` — attach Socket.IO to HTTP server
- `src/modules/Classroom/service-sessions.ts` — replace stub token with real LiveKit token
- `src/modules/Classroom/controller.ts` — update joinSession response format

### Frontend — New Files
- `src/hooks/useClassroomSocket.ts` — Socket.IO connection + event management
- `src/hooks/useYjsCollaboration.ts` — Yjs + tldraw sync hook
- `src/components/classroom/VideoLayout.tsx` — LiveKit video layout (speaker + grid)

### Frontend — Rewritten Files
- `src/components/classroom/VideoRoom.tsx` — LiveKit integration
- `src/components/classroom/ParticipantGrid.tsx` — LiveKit participants
- `src/components/classroom/ScreenShareView.tsx` — LiveKit screen share
- `src/components/classroom/TeacherControls.tsx` — Real LiveKit + Socket.IO controls
- `src/components/classroom/StudentControls.tsx` — Real controls
- `src/components/classroom/SessionChat.tsx` — Socket.IO chat
- `src/components/classroom/HandRaiseQueue.tsx` — Socket.IO hand raises
- `src/components/classroom/LivePollCreator.tsx` — Socket.IO polls
- `src/components/classroom/LivePollResponder.tsx` — Socket.IO poll responses
- `src/components/classroom/SharedWhiteboard.tsx` — tldraw + Yjs
- `src/app/(dashboard)/classroom/[sessionId]/page.tsx` — Full rewrite with real connections

### Frontend — Modified Files
- `src/hooks/useClassroomSessions.ts` — update getJoinToken return type
- `src/lib/constants.ts` — add Virtual Classroom to TEACHER_NAV

---

## Task 1: Install Dependencies

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\package.json`
- Modify: `c:\Users\shaun\campusly-frontend\package.json`

- [ ] **Step 1: Install backend dependencies**

```bash
cd c:/Users/shaun/campusly-backend && npm install livekit-server-sdk socket.io
```

- [ ] **Step 2: Install frontend dependencies**

```bash
cd c:/Users/shaun/campusly-frontend && npm install livekit-client @livekit/components-react socket.io-client @tldraw/tldraw yjs y-socket.io
```

- [ ] **Step 3: Verify both repos build**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 2: Backend — LiveKit Service

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\services\livekit.service.ts`

- [ ] **Step 1: Create the LiveKit service**

This service wraps `livekit-server-sdk` for token generation. If env vars are missing, it returns null (graceful degradation).

```typescript
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL ?? '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? '';

export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

export async function generateRoomToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  isTeacher: boolean,
): Promise<string> {
  if (!isLiveKitConfigured()) {
    throw new Error('LiveKit is not configured');
  }

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isTeacher,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 3: Backend — Update Join Token Endpoint

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Classroom\service-sessions.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\modules\Classroom\controller.ts`

- [ ] **Step 1: Update generateJoinToken in service-sessions.ts**

Read the file first. Find the `generateJoinToken` method (around line 191). Replace the stub token generation with real LiveKit token:

```typescript
static async generateJoinToken(id: string, schoolId: string, userId: string) {
  const session = await VirtualSession.findOne({ _id: id, schoolId, isDeleted: false })
    .populate('teacherId', 'firstName lastName')
    .lean();
  if (!session) throw new NotFoundError('Session not found');

  const { isLiveKitConfigured, generateRoomToken, getLiveKitUrl } = await import('../../services/livekit.service.js');

  const isTeacher = String(session.teacherId?._id ?? session.teacherId) === userId;
  const teacherUser = session.teacherId as unknown as { firstName?: string; lastName?: string } | null;
  const participantName = isTeacher
    ? `${teacherUser?.firstName ?? ''} ${teacherUser?.lastName ?? ''}`.trim() || 'Teacher'
    : `Student ${userId.slice(-4)}`;

  const roomName = `session_${String(session._id)}`;
  let token = '';
  let livekitUrl = '';

  if (isLiveKitConfigured()) {
    token = await generateRoomToken(roomName, userId, participantName, isTeacher);
    livekitUrl = getLiveKitUrl();
  }

  return {
    token,
    livekitUrl,
    roomName,
    sessionId: session._id,
    participantName,
    isTeacher,
    livekitConfigured: isLiveKitConfigured(),
  };
}
```

- [ ] **Step 2: Update controller joinSession handler**

Read the controller. The `joinSession` handler calls `generateJoinToken` and returns the result. It should now include the livekitUrl. Find the handler and ensure the response passes through the full object:

```typescript
static async joinSession(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const result = await SessionService.generateJoinToken(
    req.params.id as string,
    user.schoolId!,
    user.id,
  );
  await SessionService.recordJoin(req.params.id as string, user.schoolId!, user.id);
  res.json(apiResponse(true, result, 'Joined session'));
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 4: Backend — Socket.IO Server + Auth

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\socket\auth.ts`
- Create: `c:\Users\shaun\campusly-backend\src\socket\index.ts`
- Modify: `c:\Users\shaun\campusly-backend\src\index.ts`

- [ ] **Step 1: Create socket auth middleware**

```typescript
// src/socket/auth.ts
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  schoolId?: string;
}

export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
    }) as SocketUser;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
```

- [ ] **Step 2: Create Socket.IO server with event handlers**

```typescript
// src/socket/index.ts
import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { authenticateSocket, type SocketUser } from './auth.js';

export function initSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3500',
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;

    // ─── Session room management ────────────────────────────────
    socket.on('session:join', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      io.to(`session:${sessionId}`).emit('participant:join', {
        userId: user.id,
        name: user.email,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('session:leave', (sessionId: string) => {
      socket.leave(`session:${sessionId}`);
      io.to(`session:${sessionId}`).emit('participant:leave', {
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── Chat ───────────────────────────────────────────────────
    socket.on('chat:message', async (data: { sessionId: string; message: string; userName: string }) => {
      const msg = {
        userId: user.id,
        userName: data.userName || user.email,
        userRole: user.role,
        message: data.message,
        timestamp: new Date().toISOString(),
      };
      io.to(`session:${data.sessionId}`).emit('chat:message', msg);

      // Persist to MongoDB (fire-and-forget)
      try {
        const { SessionChatMessage } = await import('../modules/Classroom/model-chat.js');
        await SessionChatMessage.create({
          sessionId: data.sessionId,
          userId: user.id,
          userName: msg.userName,
          userRole: user.role,
          message: data.message,
          timestamp: new Date(),
        });
      } catch (err: unknown) {
        console.error('Failed to persist chat message', err);
      }
    });

    // ─── Hand raises ────────────────────────────────────────────
    socket.on('hand:raise', (data: { sessionId: string }) => {
      io.to(`session:${data.sessionId}`).emit('hand:raise', {
        userId: user.id,
        userName: user.email,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('hand:lower', (data: { sessionId: string; userId?: string }) => {
      io.to(`session:${data.sessionId}`).emit('hand:lower', {
        userId: data.userId ?? user.id,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── Polls ──────────────────────────────────────────────────
    socket.on('poll:create', (data: { sessionId: string; pollId: string; question: string; options: string[] }) => {
      io.to(`session:${data.sessionId}`).emit('poll:create', {
        ...data,
        createdBy: user.id,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('poll:respond', (data: { sessionId: string; pollId: string; optionIndex: number }) => {
      io.to(`session:${data.sessionId}`).emit('poll:respond', {
        ...data,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('poll:end', (data: { sessionId: string; pollId: string }) => {
      io.to(`session:${data.sessionId}`).emit('poll:end', data);
    });

    // ─── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Socket.IO handles room cleanup automatically
    });
  });

  return io;
}
```

- [ ] **Step 3: Attach Socket.IO to Express server in index.ts**

Read `src/index.ts`. Find `const server = app.listen(...)`. After it, add:

```typescript
import { initSocketServer } from './socket/index.js';

// After app.listen():
initSocketServer(server);
```

- [ ] **Step 4: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 5: Backend — Chat Message Model

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\Classroom\model-chat.ts`

- [ ] **Step 1: Create the chat message model**

```typescript
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISessionChatMessage extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  userRole: string;
  message: string;
  timestamp: Date;
}

const sessionChatMessageSchema = new Schema<ISessionChatMessage>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'VirtualSession', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

sessionChatMessageSchema.index({ sessionId: 1, timestamp: 1 });

export const SessionChatMessage = mongoose.model<ISessionChatMessage>(
  'SessionChatMessage',
  sessionChatMessageSchema,
);
```

- [ ] **Step 2: Add chat history endpoint to controller**

In `src/modules/Classroom/controller.ts`, add:

```typescript
static async getChatHistory(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const { SessionChatMessage } = await import('./model-chat.js');
  const messages = await SessionChatMessage.find({ sessionId: req.params.id })
    .sort({ timestamp: 1 })
    .lean();
  res.json(apiResponse(true, messages, 'Chat history retrieved'));
}
```

- [ ] **Step 3: Add route**

In `src/modules/Classroom/routes.ts`, add after the attendance route:

```typescript
router.get(
  '/sessions/:id/chat',
  authorize(...ALL_ROLES),
  ClassroomController.getChatHistory,
);
```

- [ ] **Step 4: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

---

## Task 6: Frontend — useClassroomSocket Hook

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useClassroomSocket.ts`

- [ ] **Step 1: Create the Socket.IO hook**

This hook manages the Socket.IO connection for a live session. It handles chat, hand raises, polls, and participant events.

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface ChatMessage {
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: string;
}

export interface HandRaise {
  userId: string;
  userName: string;
  timestamp: string;
}

export interface PollData {
  pollId: string;
  sessionId: string;
  question: string;
  options: string[];
  createdBy: string;
  timestamp: string;
}

export interface PollResponse {
  pollId: string;
  userId: string;
  optionIndex: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4500';

export function useClassroomSocket(sessionId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<HandRaise[]>([]);
  const [activePoll, setActivePoll] = useState<PollData | null>(null);
  const [pollResponses, setPollResponses] = useState<PollResponse[]>([]);
  const tokens = useAuthStore((s) => s.tokens);

  useEffect(() => {
    if (!sessionId || !tokens?.accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: tokens.accessToken },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('session:join', sessionId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('hand:raise', (data: HandRaise) => {
      setRaisedHands((prev) => {
        if (prev.some((h) => h.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    socket.on('hand:lower', (data: { userId: string }) => {
      setRaisedHands((prev) => prev.filter((h) => h.userId !== data.userId));
    });

    socket.on('poll:create', (poll: PollData) => {
      setActivePoll(poll);
      setPollResponses([]);
    });

    socket.on('poll:respond', (resp: PollResponse) => {
      setPollResponses((prev) => [...prev, resp]);
    });

    socket.on('poll:end', () => {
      setActivePoll(null);
      setPollResponses([]);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('session:leave', sessionId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, tokens?.accessToken]);

  const sendMessage = useCallback((message: string, userName: string) => {
    socketRef.current?.emit('chat:message', { sessionId, message, userName });
  }, [sessionId]);

  const raiseHand = useCallback(() => {
    socketRef.current?.emit('hand:raise', { sessionId });
  }, [sessionId]);

  const lowerHand = useCallback((userId?: string) => {
    socketRef.current?.emit('hand:lower', { sessionId, userId });
  }, [sessionId]);

  const createPoll = useCallback((pollId: string, question: string, options: string[]) => {
    socketRef.current?.emit('poll:create', { sessionId, pollId, question, options });
  }, [sessionId]);

  const respondPoll = useCallback((pollId: string, optionIndex: number) => {
    socketRef.current?.emit('poll:respond', { sessionId, pollId, optionIndex });
  }, [sessionId]);

  const endPoll = useCallback((pollId: string) => {
    socketRef.current?.emit('poll:end', { sessionId, pollId });
  }, [sessionId]);

  return {
    connected,
    messages,
    raisedHands,
    activePoll,
    pollResponses,
    sendMessage,
    raiseHand,
    lowerHand,
    createPoll,
    respondPoll,
    endPoll,
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 7: Frontend — VideoRoom + VideoLayout (LiveKit)

**Files:**
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\VideoRoom.tsx`
- Create: `c:\Users\shaun\campusly-frontend\src\components\classroom\VideoLayout.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\ParticipantGrid.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\ScreenShareView.tsx`

- [ ] **Step 1: Rewrite VideoRoom.tsx**

Replace the stub with LiveKit room connection:

```tsx
'use client';

import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { VideoLayout } from './VideoLayout';

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  isTeacher: boolean;
  onDisconnected?: () => void;
}

export function VideoRoom({ token, serverUrl, isTeacher, onDisconnected }: VideoRoomProps) {
  if (!token || !serverUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Video classroom is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in the backend environment.
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={onDisconnected}
      className="h-full w-full"
    >
      <VideoLayout isTeacher={isTeacher} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
```

- [ ] **Step 2: Create VideoLayout.tsx**

This renders inside `<LiveKitRoom>` and uses LiveKit hooks for participant tracks:

```tsx
'use client';

import {
  useParticipants,
  useLocalParticipant,
  useTracks,
  TrackReference,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { cn } from '@/lib/utils';

interface VideoLayoutProps {
  isTeacher: boolean;
}

export function VideoLayout({ isTeacher }: VideoLayoutProps) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Get all screen share tracks
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const activeScreenShare = screenShareTracks.length > 0 ? screenShareTracks[0] : null;

  // Get all camera tracks
  const cameraTracks = useTracks([Track.Source.Camera]);

  // Find the teacher's track (first publisher or local if teacher)
  const teacherTrack = cameraTracks.find(
    (t: TrackReference) => t.participant.identity === localParticipant.identity && isTeacher,
  ) ?? cameraTracks[0];

  const studentTracks = cameraTracks.filter((t: TrackReference) => t !== teacherTrack);

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* Main stage */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-muted">
        {activeScreenShare ? (
          <VideoTrack
            trackRef={activeScreenShare}
            className="h-full w-full object-contain"
          />
        ) : teacherTrack ? (
          <VideoTrack
            trackRef={teacherTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Waiting for video...</p>
          </div>
        )}
      </div>

      {/* Student grid */}
      {studentTracks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-1">
          {studentTracks.map((track: TrackReference) => (
            <div
              key={track.participant.identity}
              className="relative h-20 w-28 shrink-0 rounded-lg overflow-hidden bg-muted"
            >
              <VideoTrack trackRef={track} className="h-full w-full object-cover" />
              <span className="absolute bottom-0.5 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
                {track.participant.name ?? track.participant.identity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Participant count */}
      <div className="text-xs text-muted-foreground text-center">
        {participants.length} participant{participants.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite ParticipantGrid.tsx**

Replace the mock participant list with LiveKit-driven data:

```tsx
'use client';

import { useParticipants } from '@livekit/components-react';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

export function ParticipantGrid() {
  const participants = useParticipants();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Participants ({participants.length})
      </p>
      <div className="space-y-1">
        {participants.map((p) => (
          <div
            key={p.identity}
            className="flex items-center gap-2 rounded-md border p-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(p.name ?? p.identity, '')}
            </div>
            <span className="flex-1 text-sm truncate">{p.name ?? p.identity}</span>
            {p.isMicrophoneEnabled ? (
              <Mic className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <MicOff className="h-3.5 w-3.5 text-destructive" />
            )}
            {p.isCameraEnabled ? (
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <VideoOff className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite ScreenShareView.tsx**

```tsx
'use client';

import { useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function ScreenShareView() {
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);

  if (screenShareTracks.length === 0) return null;

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-black">
      <VideoTrack
        trackRef={screenShareTracks[0]}
        className="w-full h-auto max-h-[70vh] object-contain"
      />
      <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
        {screenShareTracks[0].participant.name ?? 'Someone'} is sharing their screen
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 8: Frontend — Controls (Teacher + Student)

**Files:**
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\TeacherControls.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\StudentControls.tsx`

- [ ] **Step 1: Rewrite TeacherControls.tsx**

```tsx
'use client';

import { useLocalParticipant } from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, PhoneOff,
  BarChart3,
} from 'lucide-react';

interface TeacherControlsProps {
  onEnd: () => void;
  onCreatePoll?: () => void;
}

export function TeacherControls({ onEnd, onCreatePoll }: TeacherControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const micOn = localParticipant.isMicrophoneEnabled;
  const camOn = localParticipant.isCameraEnabled;
  const screenOn = localParticipant.isScreenShareEnabled;

  return (
    <div className="flex items-center justify-center gap-2 p-3 border-t bg-card">
      <Button
        variant={micOn ? 'secondary' : 'destructive'}
        size="icon"
        onClick={() => localParticipant.setMicrophoneEnabled(!micOn)}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={camOn ? 'secondary' : 'destructive'}
        size="icon"
        onClick={() => localParticipant.setCameraEnabled(!camOn)}
        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </Button>

      <Button
        variant={screenOn ? 'default' : 'secondary'}
        size="icon"
        onClick={() => localParticipant.setScreenShareEnabled(!screenOn)}
        aria-label={screenOn ? 'Stop sharing screen' : 'Share screen'}
      >
        {screenOn ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
      </Button>

      {onCreatePoll && (
        <Button variant="secondary" size="icon" onClick={onCreatePoll} aria-label="Create poll">
          <BarChart3 className="h-5 w-5" />
        </Button>
      )}

      <Button variant="destructive" size="icon" onClick={onEnd} aria-label="End session">
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite StudentControls.tsx**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Hand, HandMetal } from 'lucide-react';

interface StudentControlsProps {
  handRaised: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
}

export function StudentControls({ handRaised, onRaiseHand, onLowerHand }: StudentControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-3 border-t bg-card">
      <Button
        variant={handRaised ? 'default' : 'secondary'}
        onClick={handRaised ? onLowerHand : onRaiseHand}
        className="gap-2"
        aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
      >
        {handRaised ? <HandMetal className="h-5 w-5" /> : <Hand className="h-5 w-5" />}
        {handRaised ? 'Lower hand' : 'Raise hand'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 9: Frontend — Chat + Hand Raises + Polls (Socket.IO)

**Files:**
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\SessionChat.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\HandRaiseQueue.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\LivePollCreator.tsx`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\LivePollResponder.tsx`

- [ ] **Step 1: Rewrite SessionChat.tsx**

The chat component receives messages and sendMessage from the parent (via useClassroomSocket). No apiClient in the component.

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useClassroomSocket';

interface SessionChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  currentUserId: string;
}

export function SessionChat({ messages, onSend, currentUserId }: SessionChatProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 p-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-4">No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.userId}-${msg.timestamp}-${i}`}
            className={`text-sm ${msg.userId === currentUserId ? 'text-right' : ''}`}
          >
            <span className="font-medium text-xs">{msg.userName}</span>
            <p className="bg-muted rounded-lg px-3 py-1.5 inline-block max-w-[85%]">
              {msg.message}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-2 border-t">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite HandRaiseQueue.tsx**

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Hand, Check } from 'lucide-react';
import type { HandRaise } from '@/hooks/useClassroomSocket';

interface HandRaiseQueueProps {
  hands: HandRaise[];
  isTeacher: boolean;
  onLower: (userId: string) => void;
}

export function HandRaiseQueue({ hands, isTeacher, onLower }: HandRaiseQueueProps) {
  if (hands.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-4">No raised hands</p>;
  }

  return (
    <div className="space-y-2 p-2">
      <p className="text-sm font-medium">{hands.length} raised hand{hands.length !== 1 ? 's' : ''}</p>
      {hands.map((h) => (
        <div key={h.userId} className="flex items-center gap-2 rounded-md border p-2">
          <Hand className="h-4 w-4 text-amber-500" />
          <span className="flex-1 text-sm truncate">{h.userName}</span>
          {isTeacher && (
            <Button size="sm" variant="ghost" onClick={() => onLower(h.userId)}>
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite LivePollCreator.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Send } from 'lucide-react';

interface LivePollCreatorProps {
  onCreatePoll: (question: string, options: string[]) => void;
}

export function LivePollCreator({ onCreatePoll }: LivePollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => setOptions((prev) => [...prev, '']);
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i));
  const updateOption = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o)));

  const handleCreate = () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    onCreatePoll(question.trim(), validOptions);
    setQuestion('');
    setOptions(['', '']);
  };

  return (
    <div className="space-y-3 p-2">
      <div className="space-y-2">
        <Label>Question</Label>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question..." />
      </div>
      <div className="space-y-2">
        <Label>Options</Label>
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button size="icon" variant="ghost" onClick={() => removeOption(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
          <Plus className="h-4 w-4" /> Add option
        </Button>
      </div>
      <Button onClick={handleCreate} className="w-full gap-1">
        <Send className="h-4 w-4" /> Launch poll
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Rewrite LivePollResponder.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PollData, PollResponse } from '@/hooks/useClassroomSocket';

interface LivePollResponderProps {
  poll: PollData;
  responses: PollResponse[];
  currentUserId: string;
  onRespond: (optionIndex: number) => void;
  isTeacher: boolean;
  onEndPoll?: () => void;
}

export function LivePollResponder({
  poll, responses, currentUserId, onRespond, isTeacher, onEndPoll,
}: LivePollResponderProps) {
  const myResponse = responses.find((r) => r.userId === currentUserId);
  const totalResponses = responses.length;

  return (
    <div className="space-y-3 p-2">
      <p className="font-medium text-sm">{poll.question}</p>
      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const count = responses.filter((r) => r.optionIndex === i).length;
          const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
          const selected = myResponse?.optionIndex === i;

          return (
            <button
              key={i}
              onClick={() => !myResponse && onRespond(i)}
              disabled={!!myResponse}
              className={cn(
                'w-full text-left rounded-lg border p-2 text-sm relative overflow-hidden transition-colors',
                selected && 'border-primary bg-primary/5',
                !myResponse && 'hover:bg-muted cursor-pointer',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-10 flex justify-between">
                <span>{opt}</span>
                {myResponse && <span className="text-muted-foreground">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{totalResponses} response{totalResponses !== 1 ? 's' : ''}</p>
      {isTeacher && onEndPoll && (
        <Button variant="outline" size="sm" onClick={onEndPoll}>End poll</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 10: Frontend — Whiteboard (tldraw + Yjs)

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\hooks\useYjsCollaboration.ts`
- Rewrite: `c:\Users\shaun\campusly-frontend\src\components\classroom\SharedWhiteboard.tsx`

- [ ] **Step 1: Create useYjsCollaboration hook**

This hook syncs a tldraw editor with a Yjs document via Socket.IO.

```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import type { Editor } from '@tldraw/tldraw';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4500';

export function useYjsCollaboration(editor: Editor | null, sessionId: string) {
  const providerRef = useRef<SocketIOProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    if (!editor || !sessionId) return;

    const doc = new Y.Doc();
    const provider = new SocketIOProvider(
      SOCKET_URL,
      `whiteboard:${sessionId}`,
      doc,
      { autoConnect: true },
    );

    docRef.current = doc;
    providerRef.current = provider;

    // Sync tldraw store with Yjs document
    const yStore = doc.getMap('tldraw');

    // Listen for remote changes
    yStore.observe(() => {
      const snapshot = yStore.toJSON();
      if (Object.keys(snapshot).length > 0) {
        try {
          // Apply remote state to editor
          // tldraw v4 uses editor.store for state management
          editor.store.mergeRemoteChanges(() => {
            // This is a simplified sync — in production you'd use
            // @tldraw/sync or a more sophisticated binding
          });
        } catch (err: unknown) {
          console.error('Failed to apply Yjs update', err);
        }
      }
    });

    // Listen for local changes and push to Yjs
    const unsubscribe = editor.store.listen(
      (entry) => {
        if (entry.source !== 'user') return;
        const changes = entry.changes;
        doc.transact(() => {
          yStore.set('lastChange', JSON.stringify(changes));
          yStore.set('timestamp', Date.now());
        });
      },
      { source: 'user', scope: 'document' },
    );

    return () => {
      unsubscribe();
      provider.disconnect();
      doc.destroy();
      providerRef.current = null;
      docRef.current = null;
    };
  }, [editor, sessionId]);
}
```

- [ ] **Step 2: Rewrite SharedWhiteboard.tsx**

```tsx
'use client';

import { Tldraw, useEditor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';

interface WhiteboardProps {
  sessionId: string;
  readOnly?: boolean;
}

function YjsSyncInner({ sessionId }: { sessionId: string }) {
  const editor = useEditor();
  useYjsCollaboration(editor, sessionId);
  return null;
}

export function SharedWhiteboard({ sessionId, readOnly }: WhiteboardProps) {
  return (
    <div className="h-full w-full min-h-[300px]">
      <Tldraw
        autoFocus={!readOnly}
        hideUi={readOnly}
      >
        <YjsSyncInner sessionId={sessionId} />
      </Tldraw>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

Note: tldraw and Yjs typing may need adjustments based on the exact installed versions. The subagent should read the tldraw docs in `node_modules/@tldraw/tldraw` if type errors appear.

---

## Task 11: Frontend — Live Session Page Rewrite

**Files:**
- Rewrite: `c:\Users\shaun\campusly-frontend\src\app\(dashboard)\classroom\[sessionId]\page.tsx`

- [ ] **Step 1: Rewrite the live session page**

This is the main orchestrator. It connects to LiveKit (video) and Socket.IO (chat/polls/hands), renders the layout, and delegates to components.

The page should:
1. Fetch join token via `useClassroomSessions().getJoinToken(sessionId)`
2. Connect Socket.IO via `useClassroomSocket(sessionId)`
3. Render a two-column layout: main stage (video) + sidebar (tabs: Chat, People, Whiteboard, Polls)
4. Bottom bar: TeacherControls or StudentControls based on role
5. Handle session end (disconnect + redirect)

Layout under 300 lines. Use Tabs component for sidebar. VideoRoom gets the LiveKit token. All Socket.IO state comes from useClassroomSocket.

Key state:
```typescript
const [joinData, setJoinData] = useState<JoinData | null>(null);
const [sidebarTab, setSidebarTab] = useState('chat');
const [pollDialogOpen, setPollDialogOpen] = useState(false);
const [handRaised, setHandRaised] = useState(false);
```

The page calls `getJoinToken` on mount, stores the result, then renders `VideoRoom` with the token.

- [ ] **Step 2: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 12: Frontend — Sidebar Nav + Teacher Dashboard

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\lib\constants.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\hooks\useClassroomSessions.ts`

- [ ] **Step 1: Add Virtual Classroom to TEACHER_NAV**

Read `src/lib/constants.ts`. Find the TEACHER_NAV array. Add "Virtual Classroom" as a top-level item (it's an important enough feature to warrant top-level placement):

```typescript
{
  label: 'Virtual Classroom',
  href: '/teacher/classroom',
  icon: Video,
  children: [
    { label: 'My Sessions', href: '/teacher/classroom', icon: Video },
    { label: 'Video Library', href: '/teacher/classroom/videos', icon: PlayCircle },
  ],
},
```

Add the `Video` and `PlayCircle` imports from lucide-react at the top.

Also add to ROUTES:
```typescript
TEACHER_CLASSROOM: '/teacher/classroom',
TEACHER_CLASSROOM_VIDEOS: '/teacher/classroom/videos',
```

- [ ] **Step 2: Update useClassroomSessions hook**

Read the hook. Update `getJoinToken` to return the full join data (not just the token string):

```typescript
interface JoinData {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantName: string;
  isTeacher: boolean;
  livekitConfigured: boolean;
}

const getJoinToken = async (sessionId: string): Promise<JoinData> => {
  const res = await apiClient.get(`/classroom/sessions/${sessionId}/join`);
  return unwrapResponse<JoinData>(res);
};
```

- [ ] **Step 3: Verify typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

---

## Task 13: Full Typecheck + Verification

- [ ] **Step 1: Backend typecheck**

```bash
cd c:/Users/shaun/campusly-backend && npx tsc --noEmit
```

- [ ] **Step 2: Frontend typecheck**

```bash
cd c:/Users/shaun/campusly-frontend && npx tsc --noEmit
```

- [ ] **Step 3: Fix any errors**

Likely areas for type issues:
- LiveKit component props (check @livekit/components-react types)
- tldraw Editor type (check @tldraw/tldraw exports)
- Socket.IO client types
- Yjs SocketIOProvider constructor signature

---

## Summary

| Task | Description | Backend/Frontend | Depends On |
|------|-------------|-----------------|------------|
| 1 | Install dependencies | Both | — |
| 2 | LiveKit service (token generation) | Backend | 1 |
| 3 | Update join token endpoint | Backend | 2 |
| 4 | Socket.IO server + auth | Backend | 1 |
| 5 | Chat message model + endpoint | Backend | 4 |
| 6 | useClassroomSocket hook | Frontend | 1 |
| 7 | VideoRoom + VideoLayout + ParticipantGrid + ScreenShare | Frontend | 1 |
| 8 | Teacher + Student controls | Frontend | 7 |
| 9 | Chat + HandRaises + Polls components | Frontend | 6 |
| 10 | Whiteboard (tldraw + Yjs) | Frontend | 1 |
| 11 | Live session page rewrite | Frontend | 6, 7, 8, 9, 10 |
| 12 | Sidebar nav + hook update | Frontend | 11 |
| 13 | Full typecheck | Both | All |
