export type AIReportType =
  | 'player_analysis'
  | 'development_plan'
  | 'scouting_report'
  | 'parent_report'
  | 'match_report'
  | 'team_analysis';

export type InsightCategory =
  | 'strength'
  | 'weakness'
  | 'trend'
  | 'risk'
  | 'recommendation'
  | 'talent_flag';

export type TalentLevel = 'school' | 'district' | 'provincial' | 'national';
export type TalentFlagStatus = 'flagged' | 'confirmed' | 'dismissed';

export interface AIInsight {
  category: InsightCategory;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AIPerformanceReport {
  id: string;
  studentId: string;
  sportCode: string;
  reportType: AIReportType;
  content: string;
  insights: AIInsight[];
  createdAt: string;
}

export interface TalentFlag {
  id: string;
  studentId: string;
  studentName?: string;
  sportCode: string;
  level: TalentLevel;
  reasoning: string;
  status: TalentFlagStatus;
  flaggedAt: string;
}
