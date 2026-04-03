// ─── Enums ───────────────────────────────────────────────────────────────────

export type CurriculumNodeType =
  | 'phase'
  | 'grade'
  | 'subject'
  | 'term'
  | 'topic'
  | 'subtopic'
  | 'outcome';

// ─── Cognitive Weighting ─────────────────────────────────────────────────────

export interface CognitiveWeighting {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

// ─── Node Metadata ───────────────────────────────────────────────────────────

export interface CurriculumNodeMetadata {
  weekNumbers: number[];
  capsReference: string;
  assessmentStandards: string[];
  notionalHours: number;
  cognitiveWeighting: CognitiveWeighting | null;
}

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface CurriculumFrameworkItem {
  id: string;
  name: string;
  description: string;
  schoolId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumNodeItem {
  id: string;
  frameworkId: string;
  type: CurriculumNodeType;
  parentId: string | null;
  title: string;
  code: string;
  description: string;
  metadata: CurriculumNodeMetadata;
  order: number;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumNodeWithChildren extends CurriculumNodeItem {
  children: CurriculumNodeItem[];
}

export interface CurriculumSubtree {
  root: CurriculumNodeItem;
  descendants: CurriculumNodeItem[];
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateNodePayload {
  frameworkId: string;
  type: CurriculumNodeType;
  parentId: string | null;
  title: string;
  code: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
}

export interface UpdateNodePayload {
  title?: string;
  code?: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
  parentId?: string | null;
}

export interface BulkImportNodeItem {
  type: CurriculumNodeType;
  parentCode: string | null;
  title: string;
  code: string;
  description?: string;
  metadata?: Partial<CurriculumNodeMetadata>;
  order?: number;
}

export interface BulkImportPayload {
  frameworkId: string;
  nodes: BulkImportNodeItem[];
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  skippedCodes: string[];
}

export interface CreateFrameworkPayload {
  name: string;
  description?: string;
}

// ─── Query Filters ───────────────────────────────────────────────────────────

export interface NodeFilters {
  frameworkId?: string;
  parentId?: string | null;
  type?: CurriculumNodeType;
  search?: string;
  page?: number;
  limit?: number;
}
