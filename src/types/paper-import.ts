export type PaperImportJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type PaperImportJobStage = 'uploading' | 'segmenting' | 'transcribing' | 'enhancing' | 'finalising';

export interface PaperImportJobProgress {
  stage: PaperImportJobStage;
  pagesTotal: number;
  pagesDone: number;
  message: string;
}

export interface PaperImportJobCurriculum {
  subjectId: string;
  gradeId: string;
  term: number;
  curriculumNodeId: string;
}

export interface PaperImportJobOptions {
  generateAnswers: boolean;
  addHints: boolean;
  addWorkedExample: boolean;
  addExplanations: boolean;
  instructions?: string;
}

export interface PaperImportJobSource {
  filename: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  pageCount: number;
  storagePath: string;
}

export interface PaperImportJob {
  id: string;
  schoolId: string;
  teacherId: string;
  status: PaperImportJobStatus;
  progress: PaperImportJobProgress;
  curriculum: PaperImportJobCurriculum;
  options: PaperImportJobOptions;
  source: PaperImportJobSource;
  resultResourceIds: string[];
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreatePaperImportPayload {
  subjectId: string;
  gradeId: string;
  term: number;
  curriculumNodeId: string;
  generateAnswers: boolean;
  addHints: boolean;
  addWorkedExample: boolean;
  addExplanations: boolean;
  instructions?: string;
  file: File;
}
