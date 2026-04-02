// ============================================================
// Student 360 Full View Types (parent-facing, cross-module)
// ============================================================

export interface FullStudent360Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gradeName: string;
  className: string;
  photo?: string;
}

export interface FullStudent360Subject {
  name: string;
  mark: number;
  total: number;
  percentage: number;
}

export interface FullStudent360Academic {
  subjects: FullStudent360Subject[];
  termAverage: number;
  rank?: number;
}

export interface FullStudent360Attendance {
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface FullStudent360Homework {
  pending: number;
  completed: number;
  averageMark: number;
}

export interface FullStudent360Achievement {
  title: string;
  type: string;
  date: string;
  points: number;
}

export interface FullStudent360Achievements {
  recent: FullStudent360Achievement[];
  totalMerits: number;
  totalDemerits: number;
}

export interface FullStudent360Fees {
  outstanding: number;
  lastPaymentDate?: string;
}

export interface FullStudent360Wallet {
  balance: number;
}

export interface FullStudent360Library {
  borrowed: number;
  overdue: number;
}

export interface FullStudent360SportCard {
  sportCode: string;
  overallRating: number;
  tier: string;
}

export interface FullStudent360Sports {
  cards: FullStudent360SportCard[];
}

export interface FullStudent360Incident {
  type: string;
  description: string;
  date: string;
  severity: string;
}

export interface FullStudent360Behaviour {
  recentIncidents: FullStudent360Incident[];
}

export interface FullStudent360Data {
  student: FullStudent360Student;
  academic: FullStudent360Academic;
  attendance: FullStudent360Attendance;
  homework: FullStudent360Homework;
  achievements: FullStudent360Achievements;
  fees: FullStudent360Fees;
  wallet: FullStudent360Wallet;
  library: FullStudent360Library;
  sports: FullStudent360Sports;
  behaviour: FullStudent360Behaviour;
}
