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

// ─── Gamification Types ─────────────────────────────────────────────────────

export interface BadgeEarned {
  badgeId: string;
  name: string;
  icon: string;
  earnedAt: string;
  category: string;
}

export interface StudentLevel {
  id: string;
  schoolId: string;
  studentId: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  badges: BadgeEarned[];
  student?: {
    _id: string;
    classId?: string;
    gradeId?: string;
  };
  studentUser?: {
    firstName: string;
    lastName: string;
  };
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'academic' | 'attendance' | 'sport' | 'behaviour' | 'social' | 'special';
  criteria: string;
  xpReward: number;
}

/** XP thresholds per level (index 0 = level 1) */
export const LEVEL_THRESHOLDS = [0, 50, 120, 200, 300, 420, 560, 720, 900, 1100, 1320];

export function getLevelForXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(currentXP: number): number | null {
  const level = getLevelForXP(currentXP);
  if (level >= LEVEL_THRESHOLDS.length) return null;
  return LEVEL_THRESHOLDS[level];
}
