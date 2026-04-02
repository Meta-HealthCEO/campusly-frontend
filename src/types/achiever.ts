// ============================================================
// House System & Achievement Types
// ============================================================

export interface House {
  id: string;
  name: string;
  color: string;
  points: number;
  motto?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'academic' | 'sports' | 'leadership' | 'service' | 'special';
  points: number;
}

export interface StudentAchievement {
  id: string;
  studentId: string;
  achievementId: string;
  achievement: Achievement;
  awardedDate: string;
  awardedBy: string;
}
