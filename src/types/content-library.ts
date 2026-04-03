// ============================================================
// Content Library — Types
// ============================================================

export type ResourceType =
  | 'lesson'
  | 'study_notes'
  | 'worksheet'
  | 'worked_example'
  | 'activity';

export type ResourceFormat = 'static' | 'interactive';

export type ResourceSource = 'oer' | 'ai_generated' | 'teacher' | 'system';

export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type ContentBlockType =
  | 'text'
  | 'image'
  | 'video'
  | 'quiz'
  | 'drag_drop'
  | 'fill_blank'
  | 'match_columns'
  | 'ordering'
  | 'hotspot'
  | 'step_reveal'
  | 'code';

export interface CognitiveLevelTag {
  caps: string;
  blooms: string;
}

export interface ContentBlockItem {
  blockId: string;
  type: ContentBlockType;
  order: number;
  content: string;
  curriculumNodeId: string | null;
  cognitiveLevel: CognitiveLevelTag | null;
  points: number;
  hints: string[];
  explanation: string;
  metadata: Record<string, unknown>;
}

export interface ContentResourceItem {
  id: string;
  curriculumNodeId: string | { id: string; title: string; code: string; type: string };
  schoolId: string;
  type: ResourceType;
  format: ResourceFormat;
  title: string;
  blocks: ContentBlockItem[];
  source: ResourceSource;
  sourceAttribution: string;
  gradeId: string | { id: string; name: string };
  subjectId: string | { id: string; name: string };
  term: number;
  tags: string[];
  status: ResourceStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdBy: string | { id: string; firstName: string; lastName: string };
  aiModel: string | null;
  downloads: number;
  rating: number;
  ratingCount: number;
  difficulty: number;
  estimatedMinutes: number;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourcePayload {
  curriculumNodeId?: string;
  type: ResourceType;
  format: ResourceFormat;
  title: string;
  blocks: Omit<ContentBlockItem, 'blockId'>[];
  source?: ResourceSource;
  sourceAttribution?: string;
  gradeId: string;
  subjectId: string;
  term?: number;
  tags?: string[];
  difficulty?: number;
  estimatedMinutes?: number;
  prerequisites?: string[];
}

export interface UpdateResourcePayload {
  curriculumNodeId?: string;
  type?: ResourceType;
  format?: ResourceFormat;
  title?: string;
  blocks?: Omit<ContentBlockItem, 'blockId'>[];
  source?: ResourceSource;
  sourceAttribution?: string;
  gradeId?: string;
  subjectId?: string;
  term?: number;
  tags?: string[];
  difficulty?: number;
  estimatedMinutes?: number;
  prerequisites?: string[];
}

export interface ReviewPayload {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface GenerateContentPayload {
  curriculumNodeId: string;
  type: ResourceType;
  format: ResourceFormat;
  gradeId: string;
  subjectId: string;
  term?: number;
  difficulty?: number;
  estimatedMinutes?: number;
  additionalInstructions?: string;
}

export interface ResourceFilters {
  curriculumNodeId?: string;
  type?: ResourceType;
  format?: ResourceFormat;
  status?: ResourceStatus;
  subjectId?: string;
  gradeId?: string;
  term?: number;
  search?: string;
  source?: ResourceSource;
  mine?: boolean;
  page?: number;
  limit?: number;
}
