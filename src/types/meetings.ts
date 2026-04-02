export interface MeetingDay {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  location: string;
  virtualMeetingEnabled: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface MeetingSlotBooking {
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
}

export interface MeetingSlot {
  id: string;
  meetingDayId: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'completed' | 'cancelled';
  bookedBy?: MeetingSlotBooking;
  notes?: string;
  meetingType: 'in_person' | 'virtual';
  meetingLink?: string;
}

export interface MeetingDayStats {
  total: number;
  booked: number;
  available: number;
  completed: number;
}

export interface CreateMeetingDayPayload {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  location?: string;
  virtualMeetingEnabled?: boolean;
}

export interface BookSlotPayload {
  studentId: string;
  studentName: string;
  parentName: string;
}
