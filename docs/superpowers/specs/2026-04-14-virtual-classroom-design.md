# Virtual Classroom with LiveKit — Design Spec

**Status:** Approved
**Date:** 2026-04-14
**Author:** Shaun + Claude

## 1. Goal

Replace the stubbed virtual classroom with a fully functional live classroom experience. Teachers can start a video class, share their screen, use a collaborative whiteboard, run live polls, and manage student participation via chat and hand raises. Students join via a link and participate in real time.

## 2. Architecture

Three independent communication layers:

### 2.1 LiveKit Cloud (Video/Audio/Screen Share)

LiveKit handles all WebRTC complexity. The browser connects directly to LiveKit's servers — the Express backend only generates authentication tokens. No video traffic touches the backend.

- Backend: `livekit-server-sdk` generates room tokens with participant identity + metadata
- Frontend: `@livekit/components-react` provides `<LiveKitRoom>`, `<VideoTrack>`, `<AudioTrack>`, `useParticipants()`, `useLocalParticipant()`
- Screen share: LiveKit's built-in screen share track — teacher publishes, all participants see

### 2.2 Socket.IO (Real-Time Events)

Socket.IO handles lightweight real-time events that don't need WebRTC:

- Chat messages (broadcast to all participants in a session room)
- Hand raises (student raises → teacher sees queue → teacher acknowledges)
- Poll lifecycle (teacher creates → students respond → results broadcast)
- Whiteboard sync (Yjs document updates via Socket.IO provider)

The Socket.IO server runs as part of the Express process, attached to the same HTTP server on a `/socket.io` path. Each session gets its own Socket.IO room (`session:${sessionId}`).

### 2.3 REST API (Session CRUD — already exists)

The existing endpoints handle session lifecycle (all mounted under `/api/classroom` with `authenticate` at mount level):
- `POST /classroom/sessions` — create/schedule
- `GET /classroom/sessions/upcoming` — list upcoming
- `POST /classroom/sessions/:id/start` — transition to live
- `POST /classroom/sessions/:id/end` — end session
- `GET /classroom/sessions/:id/join` — get join token (to be updated with real LiveKit token)
- `POST /classroom/sessions/:id/poll` — create poll (already exists, persists to MongoDB)
- `POST /classroom/sessions/:id/poll/:pollId/respond` — respond to poll (already exists)

Note: Poll CRUD already exists via REST. Socket.IO broadcasts poll events in real time but the REST endpoints handle persistence. This is the correct split — REST for state changes, Socket.IO for instant broadcast.

## 3. Backend Changes

### 3.1 New dependencies

```
livekit-server-sdk    — generate room tokens
socket.io             — real-time event server
```

### 3.2 Env vars

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

All optional — if not set, the classroom feature shows a "LiveKit not configured" message instead of crashing.

### 3.3 LiveKit token generation

Update the existing `GET /classroom/sessions/:id/join` endpoint:

```typescript
import { AccessToken } from 'livekit-server-sdk';

function generateLiveKitToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  isTeacher: boolean,
): string {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: participantIdentity, name: participantName },
  );
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isTeacher,        // only teacher publishes video/audio by default
    canSubscribe: true,
    canPublishData: true,          // all can send data messages
  });
  return token.toJwt();
}
```

The room name is the session ID. Teacher gets `canPublish: true`. Students get `canPublish: false` by default (teacher can promote individual students to speak via a UI control).

Return format:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "livekitUrl": "wss://your-project.livekit.cloud",
    "roomName": "session_abc123",
    "participantName": "Mrs Smith",
    "isTeacher": true
  }
}
```

### 3.4 Socket.IO server

Create `src/socket/index.ts` — attach to the Express HTTP server:

```typescript
import { Server } from 'socket.io';

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
    path: '/socket.io',
  });

  io.use(authenticateSocket); // validate JWT from handshake auth

  io.on('connection', (socket) => {
    // Join session room
    socket.on('session:join', (sessionId) => {
      socket.join(`session:${sessionId}`);
    });

    // Chat
    socket.on('chat:message', (data) => {
      io.to(`session:${data.sessionId}`).emit('chat:message', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      // Persist to MongoDB
    });

    // Hand raise
    socket.on('hand:raise', (data) => {
      io.to(`session:${data.sessionId}`).emit('hand:raise', data);
    });
    socket.on('hand:lower', (data) => {
      io.to(`session:${data.sessionId}`).emit('hand:lower', data);
    });

    // Polls
    socket.on('poll:create', (data) => {
      io.to(`session:${data.sessionId}`).emit('poll:create', data);
    });
    socket.on('poll:respond', (data) => {
      io.to(`session:${data.sessionId}`).emit('poll:respond', data);
    });
    socket.on('poll:end', (data) => {
      io.to(`session:${data.sessionId}`).emit('poll:end', data);
    });
  });

  return io;
}
```

### 3.5 Yjs WebSocket provider for whiteboard

The tldraw whiteboard syncs via Yjs. Yjs needs a WebSocket provider for real-time collaboration. We use `y-socket.io` which piggybacks on the same Socket.IO server — no additional server process.

Each session gets a Yjs document (`whiteboard:${sessionId}`). When the session ends, the document is serialized and stored in the session record for replay.

### 3.6 Chat message persistence

New model — `SessionChatMessage`:

```typescript
interface ISessionChatMessage {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  userRole: 'teacher' | 'student';
  message: string;
  timestamp: Date;
}
```

Saved on every `chat:message` event. Retrieved via `GET /classroom/sessions/:id/chat` for post-session review.

### 3.7 Poll result persistence

New model — `SessionPoll`:

```typescript
interface ISessionPoll {
  sessionId: Types.ObjectId;
  question: string;
  options: string[];
  responses: Array<{
    userId: Types.ObjectId;
    userName: string;
    optionIndex: number;
    respondedAt: Date;
  }>;
  status: 'active' | 'ended';
  createdAt: Date;
}
```

Created on `poll:create`, updated on `poll:respond`, finalized on `poll:end`.

### 3.8 Socket authentication

The Socket.IO handshake includes the JWT access token:

```typescript
// Client
const socket = io(SOCKET_URL, {
  auth: { token: accessToken },
});

// Server middleware
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
}
```

## 4. Frontend Changes

### 4.1 New dependencies

```
livekit-client                — LiveKit base SDK
@livekit/components-react     — React components for LiveKit
socket.io-client              — Socket.IO client
@tldraw/tldraw                — Collaborative whiteboard
yjs                           — CRDT for real-time sync
y-socket.io                   — Yjs Socket.IO provider
```

### 4.2 Component rewrites

#### VideoRoom.tsx — FULL REWRITE

Replace placeholder with LiveKit room:

```tsx
import { LiveKitRoom, VideoTrack, AudioTrack, useParticipants } from '@livekit/components-react';

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
}

export function VideoRoom({ token, serverUrl, onDisconnected }: VideoRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onDisconnected={onDisconnected}
    >
      <VideoLayout />
    </LiveKitRoom>
  );
}
```

The `<VideoLayout>` child renders the participant grid, screen share view, and local preview using LiveKit hooks.

#### ParticipantGrid.tsx — REWRITE

Use `useParticipants()` from LiveKit to get real participant list. Render video tracks for each participant. Teacher's video is prominent (large), students are in a smaller grid below.

#### ScreenShareView.tsx — REWRITE

Use `useScreenShare()` from LiveKit. When a screen share track is active, it takes the main stage and the speaker moves to a small overlay.

#### TeacherControls.tsx — WIRE TO REAL CONTROLS

- Mute/unmute: `useLocalParticipant().localParticipant.setMicrophoneEnabled()`
- Camera on/off: `useLocalParticipant().localParticipant.setCameraEnabled()`
- Screen share: `useLocalParticipant().localParticipant.setScreenShareEnabled()`
- End session: emit `session:end` via Socket.IO + call REST endpoint
- Mute all students: LiveKit admin API via backend

#### StudentControls.tsx — WIRE TO REAL CONTROLS

- Raise hand: emit `hand:raise` via Socket.IO
- Lower hand: emit `hand:lower` via Socket.IO
- Mute/unmute (when promoted): LiveKit local participant controls

#### SessionChat.tsx — WIRE TO SOCKET.IO

- On send: `socket.emit('chat:message', { sessionId, message, userName })`
- On receive: `socket.on('chat:message', (data) => addMessage(data))`
- Messages persisted on backend, loaded on join for late joiners

#### HandRaiseQueue.tsx — WIRE TO SOCKET.IO

- Listen: `socket.on('hand:raise', ...)` and `socket.on('hand:lower', ...)`
- Teacher can click "Acknowledge" which emits `hand:lower` for that student

#### LivePollCreator.tsx — WIRE TO SOCKET.IO

- On create: `socket.emit('poll:create', { sessionId, question, options })`
- Show live results as `poll:respond` events come in

#### LivePollResponder.tsx — WIRE TO SOCKET.IO

- Listen: `socket.on('poll:create', ...)` shows the poll
- On respond: `socket.emit('poll:respond', { sessionId, pollId, optionIndex })`

#### SharedWhiteboard.tsx — FULL REWRITE

Replace canvas with tldraw v4 + Yjs:

```tsx
import { Tldraw, useEditor } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useYjsCollaboration } from './useYjsCollaboration'; // custom hook for Yjs sync

interface WhiteboardProps {
  sessionId: string;
  readOnly?: boolean; // students view only, teacher draws
}

export function SharedWhiteboard({ sessionId, readOnly }: WhiteboardProps) {
  return (
    <div className="h-full w-full">
      <Tldraw
        autoFocus={!readOnly}
        components={readOnly ? { Toolbar: null, StylePanel: null } : undefined}
      >
        <YjsSyncInner sessionId={sessionId} />
      </Tldraw>
    </div>
  );
}

// Inner component that has access to the tldraw editor via useEditor()
function YjsSyncInner({ sessionId }: { sessionId: string }) {
  const editor = useEditor();
  useYjsCollaboration(editor, sessionId);
  return null;
}
```

The `useYjsCollaboration` hook creates a Yjs document, connects via `y-socket.io` to the backend, and syncs editor state via tldraw's store bindings. Teacher has full drawing tools. Students see changes in real time (toolbar hidden via `components` override). Note: tldraw v4 uses `@tldraw/tldraw` (single package) — no separate `@tldraw/editor` needed.

### 4.3 New hook: useClassroomSocket

```typescript
export function useClassroomSocket(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<HandRaise[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token: accessToken } });
    s.emit('session:join', sessionId);

    s.on('chat:message', (msg) => setMessages(prev => [...prev, msg]));
    s.on('hand:raise', (data) => setRaisedHands(prev => [...prev, data]));
    s.on('hand:lower', (data) => setRaisedHands(prev => prev.filter(h => h.userId !== data.userId)));
    s.on('poll:create', (poll) => setActivePoll(poll));
    s.on('poll:respond', (data) => { /* update poll results */ });
    s.on('poll:end', () => setActivePoll(null));

    setSocket(s);
    return () => { s.disconnect(); };
  }, [sessionId]);

  const sendMessage = (message: string) => socket?.emit('chat:message', { sessionId, message });
  const raiseHand = () => socket?.emit('hand:raise', { sessionId });
  const lowerHand = (userId: string) => socket?.emit('hand:lower', { sessionId, userId });
  const createPoll = (question: string, options: string[]) => socket?.emit('poll:create', { sessionId, question, options });
  const respondPoll = (pollId: string, optionIndex: number) => socket?.emit('poll:respond', { sessionId, pollId, optionIndex });
  const endPoll = (pollId: string) => socket?.emit('poll:end', { sessionId, pollId });

  return { messages, raisedHands, activePoll, sendMessage, raiseHand, lowerHand, createPoll, respondPoll, endPoll };
}
```

### 4.4 Session page rewrite

The `/classroom/[sessionId]` page becomes:

1. Fetch session data + join token via REST
2. Connect to LiveKit with the token (video/audio)
3. Connect to Socket.IO for the session (chat/polls/hands)
4. Render layout: main video stage, sidebar with tabs (Chat, Participants, Whiteboard, Polls)
5. Role-based controls: teacher gets TeacherControls, students get StudentControls
6. On session end: disconnect both, show "Session ended" screen with summary

### 4.5 Teacher classroom page

The existing `/teacher/classroom` page gets:
- A sidebar nav entry under Communication group
- "Start Class" button that calls the start endpoint then navigates to `/classroom/[id]`
- Session list with status badges (Scheduled, Live, Ended)
- Video library tab (already working)

### 4.6 Sidebar navigation

Add to `TEACHER_NAV` in constants.ts, inside the Communication group:

```typescript
{ label: 'Virtual Classroom', href: '/teacher/classroom', icon: Video },
```

Or as a top-level item with children:
```typescript
{
  label: 'Virtual Classroom',
  href: '/teacher/classroom',
  icon: Video,
  children: [
    { label: 'My Sessions', href: '/teacher/classroom', icon: Video },
    { label: 'Video Library', href: '/teacher/classroom/videos', icon: PlayCircle },
  ],
}
```

## 5. Live Session Layout

```
+--------------------------------------------------+
|  [Teacher Video - Large]        | Sidebar Tabs:   |
|                                 | [Chat] [People] |
|                                 | [Board] [Polls] |
|  [Screen Share replaces         |                 |
|   teacher video when active]    | [Tab content    |
|                                 |  scrollable]    |
+---------------------------------+                 |
| [Student Grid - Small tiles]    |                 |
| [S1] [S2] [S3] [S4] [S5]       |                 |
+---------------------------------+-----------------+
| [Controls: Mic | Cam | Screen | End | Hand]       |
+--------------------------------------------------+
```

Mobile: sidebar tabs become a bottom sheet. Video takes full width. Controls are a fixed bottom bar.

## 6. Permissions Model

| Action | Teacher | Student |
|--------|---------|---------|
| Publish video/audio | Yes (always) | No (until promoted) |
| Screen share | Yes | No |
| Send chat message | Yes | Yes |
| Raise hand | No (unnecessary) | Yes |
| Lower someone's hand | Yes | No (own hand only) |
| Create poll | Yes | No |
| Respond to poll | No | Yes |
| Draw on whiteboard | Yes | No (view only) |
| End session | Yes | No |
| Mute all students | Yes | No |

## 7. Error Handling

- **LiveKit not configured** (no env vars): show "Video classroom is not configured yet. Contact your administrator." on the session page. Session scheduling still works.
- **LiveKit connection failure**: show reconnecting spinner with "Reconnecting..." for 30s, then "Connection lost. Try rejoining." with a rejoin button.
- **Socket.IO disconnect**: auto-reconnect (built-in). Chat messages sent while disconnected are queued and delivered on reconnect.
- **Late joiner**: on join, fetch chat history via REST (`GET /classroom/sessions/:id/chat`) so they see previous messages. Whiteboard state syncs automatically via Yjs.

## 8. Data Persistence

| Data | When Persisted | Where |
|------|---------------|-------|
| Session metadata | On create/start/end | VirtualSession collection |
| Chat messages | On each message | SessionChatMessage collection |
| Poll questions + responses | On create/respond/end | SessionPoll collection |
| Whiteboard state | On session end | Serialized Yjs doc in VirtualSession |
| Attendance (join/leave) | On join/leave events | SessionAttendance collection (exists) |
| Video recordings | If LiveKit recording enabled | LiveKit Egress → S3 (Phase 2) |

## 9. What's NOT in Scope

- Video recording (requires LiveKit Egress + storage — Phase 2)
- Breakout rooms (LiveKit supports them, but complex UX — Phase 2)
- Student video publishing (promote-to-speak UI — Phase 2, students are view-only for now)
- File sharing during session (Phase 2)
- Session scheduling recurrence (weekly classes — Phase 2)
- Whiteboard templates/backgrounds

## 10. Dependencies to Install

### Backend
```bash
npm install livekit-server-sdk socket.io
```

### Frontend
```bash
npm install livekit-client @livekit/components-react socket.io-client @tldraw/tldraw yjs y-socket.io
```
