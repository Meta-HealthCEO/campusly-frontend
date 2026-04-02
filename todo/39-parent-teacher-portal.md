# TODO 39 — Parent-Teacher Engagement Features (Integrated into Existing Portals)

> **Priority:** HIGH — The relationship between parent and teacher is the foundation of a child's success. Currently these two portals barely talk to each other.

## Context
Campusly has separate parent and teacher dashboard portals but the communication between them is limited to broadcast announcements. There's no direct messaging, no meeting scheduler, no shared view of the child's progress. These features are added WITHIN the existing `/parent/` and `/teacher/` dashboards — NOT as a separate portal.

---

## 1. Direct Messaging (Teacher <-> Parent)

### 1a. Message Thread System
- Parent can initiate conversation with any of their child's teachers
- Teacher can initiate conversation with any student's parent
- Threaded conversations (like WhatsApp)
- Message types: text, attachment (photo of homework, document)
- Read receipts
- Typing indicators (optional)
- Conversations organised by child (for multi-child parents)

### 1b. Teacher Availability Status
- Teachers set availability: available, busy, in class, after hours
- Auto-set based on timetable (during class → busy)
- Expected response time indicator: "Typically responds within 4 hours"
- After-hours boundary: messages sent after 17:00 queued until next morning (configurable)

### 1c. Quick Actions from Messages
- From a parent message about fees → link to invoice
- From a teacher message about homework → link to assignment
- From either party about behaviour → link to discipline record
- Context-aware message suggestions

---

## 2. Parent-Teacher Meeting Scheduler

### 2a. Meeting Slot Management
- School admin sets meeting day(s) and time range
- Teachers create available time slots (e.g., 15-min intervals from 14:00-17:00)
- Slots visible to parents per teacher

### 2b. Parent Booking Flow
- Parent sees available slots for their child's teachers
- Books one or multiple teacher slots
- Confirmation sent via WhatsApp/email/in-app
- Reminder 24h and 2h before meeting
- Cancel/reschedule with reason

### 2c. Meeting Day Dashboard
- Teacher sees their schedule for the day
- Parent sees their bookings with room/location
- Walk-in queue for unbooked parents
- Notes field for post-meeting follow-up
- Mark as completed with action items

### 2d. Virtual Meeting Option
- Option for video call instead of in-person
- Generate meeting link (integrate with Virtual Classroom #31 or simple Google Meet link)
- Useful for working parents who can't attend physically

---

## 3. Shared Progress View

### 3a. Teacher-Parent Student Dashboard
- Shared view of child's data accessible to both parties
- Academic performance with trend arrows
- Attendance summary with pattern highlights
- Behaviour record (merits, demerits, incidents)
- Homework completion rate
- Teacher notes visible to parent (opt-in by teacher)
- Parent notes visible to teacher (home context: "child is struggling with anxiety")

### 3b. Goal Setting (Collaborative)
- Teacher and parent set academic goals for the child
- Track progress toward goals
- Mid-term check-in reminders
- End-of-term review

---

## 4. Daily/Weekly Digest for Parents

### 4a. Automated Daily Summary (per child)
**Morning brief (sent 07:00):**
- Today's timetable
- Homework due today
- Upcoming assessments this week
- Events/reminders
- Wallet balance

**Evening brief (sent 16:00):**
- Attendance today (present/absent/late)
- Homework assigned today
- Any incidents/merits today
- Tuckshop spending today

### 4b. Weekly Summary (sent Sunday evening)
- This week: attendance score, homework completion rate, marks received
- Next week: upcoming assessments, events, deadlines
- Progress toward term goals
- Teacher spotlight messages (optional teacher note to parents)

### 4c. Delivery
- WhatsApp (primary — via #36)
- Email (secondary)
- In-app notification (always)
- Configurable per parent: daily/weekly/off

---

## 5. Notice Board (Per Class/Grade)

### 5a. Class Notice Board
- Digital pin board per class
- Teachers pin: reminders, photos, updates, homework tips
- Parents can see (read-only by default)
- Optional: parent can post (moderated by teacher)
- Pinned items vs chronological feed

### 5b. Grade Notice Board
- Grade head posts grade-level announcements
- Visible to all parents and teachers in that grade
- Event reminders, exam timetables, grade-specific news

### 5c. School Notice Board
- School-wide announcements (from #25 Announcement module)
- Aggregated feed visible on parent and teacher dashboards
- Priority announcements pinned at top

---

## Data Models

```typescript
interface DirectMessage {
  threadId: string;
  schoolId: string;
  participants: { userId: string; role: 'teacher' | 'parent'; name: string }[];
  studentId: string; // which child this conversation is about
  messages: ThreadMessage[];
  lastMessageAt: Date;
  unreadCount: Record<string, number>; // userId → unread count
}

interface ThreadMessage {
  senderId: string;
  senderRole: 'teacher' | 'parent';
  content: string;
  attachments?: { url: string; name: string; type: string }[];
  readBy: { userId: string; readAt: Date }[];
  sentAt: Date;
}

interface MeetingSlot {
  teacherId: string;
  schoolId: string;
  meetingDayId: string;
  date: Date;
  startTime: string; // "14:00"
  endTime: string; // "14:15"
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  bookedBy?: { parentId: string; studentId: string };
  notes?: string;
  meetingType: 'in_person' | 'virtual';
  meetingLink?: string;
}

interface MeetingDay {
  schoolId: string;
  name: string;
  date: Date;
  slotDuration: number; // minutes
  startTime: string;
  endTime: string;
  location: string;
}

interface NoticeBoardPost {
  schoolId: string;
  scope: 'class' | 'grade' | 'school';
  scopeId: string; // classId, gradeId, or schoolId
  authorId: string;
  authorRole: string;
  title: string;
  content: string;
  pinned: boolean;
  attachments?: string[];
  createdAt: Date;
}

interface DigestPreference {
  parentId: string;
  schoolId: string;
  dailyDigest: boolean;
  weeklyDigest: boolean;
  digestChannel: 'whatsapp' | 'email' | 'both';
  morningBriefTime: string; // "07:00"
  eveningBriefTime: string; // "16:00"
}
```

## API Endpoints
- `POST /api/messages/threads` — Start new conversation
- `GET /api/messages/threads` — List conversations
- `POST /api/messages/threads/:id/messages` — Send message
- `GET /api/messages/threads/:id` — Get thread with messages
- `PATCH /api/messages/threads/:id/read` — Mark as read
- `POST /api/meetings/days` — Create meeting day
- `POST /api/meetings/slots` — Create time slots
- `GET /api/meetings/slots` — Get available slots
- `POST /api/meetings/book` — Book a slot
- `PATCH /api/meetings/slots/:id/cancel` — Cancel booking
- `POST /api/notice-board` — Create post
- `GET /api/notice-board` — Get posts by scope
- `GET /api/digest/preferences` — Get digest settings
- `PUT /api/digest/preferences` — Update digest settings

## Frontend Pages
- `/teacher/messages` — Teacher message inbox
- `/parent/messages` — Parent message inbox (enhanced from current)
- `/teacher/meetings` — Teacher meeting schedule
- `/parent/meetings` — Parent meeting booking
- `/admin/meetings` — Admin meeting day setup
- `/teacher/notice-board` — Class notice board
- `/parent/notice-board` — View notice boards
- Enhanced dashboards with digest preview

## Revenue Model
- Direct messaging: included in base platform
- Meeting scheduler: included in base platform
- Daily digest via WhatsApp: requires WhatsApp bolt-on (#36)
- Notice board: included in base platform
