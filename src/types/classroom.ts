export type SessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type VideoType = 'upload' | 'youtube' | 'vimeo' | 'recording';

export interface SessionSettings {
  studentVideoEnabled: boolean;
  studentAudioEnabled: boolean;
  chatEnabled: boolean;
  maxParticipants: number;
  allowLateJoin: boolean;
}

export interface LivePoll {
  _id: string;
  question: string;
  options: string[];
  responses: { userId: string; answer: number; answeredAt: string }[];
}

export interface SharedFile {
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface VirtualSession {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  subjectId: { id: string; name: string };
  classId: { id: string; name: string };
  gradeId?: { id: string; name: string };
  teacherId: { id: string; firstName: string; lastName: string };
  scheduledStart: string;
  scheduledEnd: string;
  status: SessionStatus;
  isRecorded: boolean;
  roomId?: string;
  recordingUrl?: string;
  settings: SessionSettings;
  recurringRule?: string;
  polls: LivePoll[];
  sharedFiles: SharedFile[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassroomSessionPayload {
  title: string;
  description?: string;
  subjectId: string;
  classId: string;
  gradeId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  isRecorded?: boolean;
  settings?: Partial<SessionSettings>;
  recurringRule?: string;
  timetablePeriodId?: string;
}

export interface SessionAttendanceRecord {
  id: string;
  sessionId: string;
  studentId: { id: string; firstName: string; lastName: string };
  joinedAt: string;
  leftAt?: string;
  duration?: number;
  rejoinCount: number;
}

export interface VideoLesson {
  id: string;
  schoolId: string;
  title: string;
  description?: string;
  subjectId?: { id: string; name: string };
  gradeId?: { id: string; name: string };
  classId?: { id: string; name: string };
  teacherId: { id: string; firstName: string; lastName: string };
  videoUrl: string;
  videoType: VideoType;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isPublished: boolean;
  viewCount: number;
  tags: string[];
  sessionId?: string;
  createdAt: string;
}

export interface CreateVideoPayload {
  title: string;
  description?: string;
  subjectId?: string;
  gradeId?: string;
  classId?: string;
  videoUrl: string;
  videoType: VideoType;
  thumbnailUrl?: string;
  durationSeconds?: number;
  isPublished?: boolean;
  tags?: string[];
}

export interface VideoProgress {
  id: string;
  videoId: string;
  studentId: string;
  watchedSeconds: number;
  totalSeconds: number;
  progressPercent: number;
  isCompleted: boolean;
  lastWatchedAt: string;
}

export interface TeacherClassroomStats {
  totalSessions: number;
  totalDuration: number;
  avgAttendance: number;
  recordingCount: number;
}

export interface ClassEngagementStats {
  sessionsHeld: number;
  avgParticipationRate: number;
  videoWatchRate: number;
}

export interface SessionFilters {
  classId?: string;
  subjectId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface VideoFilters {
  subjectId?: string;
  gradeId?: string;
  isPublished?: boolean;
  videoType?: string;
  search?: string;
  page?: number;
  limit?: number;
}
