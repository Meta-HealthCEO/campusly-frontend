// Contract types for useTeacherPapers — split out for file-size budget.

import type {
  Paper,
  PaperMemo,
  GeneratePaperRequest,
  CreatePaperManualInput,
  AddQuestionInput,
} from '@/types/papers';

export interface PaperFilters {
  subjectId?: string;
  gradeId?: string;
  term?: number;
  year?: number;
  status?: string;
  paperType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaperListResponse {
  papers: Paper[];
  total: number;
  page: number;
  limit: number;
}

export interface UseTeacherPapersResult {
  papers: Paper[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  fetchPapers: (overrideFilters?: PaperFilters) => Promise<void>;
  filters: PaperFilters;
  setFilters: (f: PaperFilters) => void;
  getPaperById: (id: string) => Promise<Paper | null>;
  getMemoByPaperId: (id: string) => Promise<PaperMemo | null>;
  generatePaperWithAI: (
    input: GeneratePaperRequest,
  ) => Promise<{ paperId: string } | null>;
  createPaperManual: (input: CreatePaperManualInput) => Promise<Paper | null>;
  updatePaperMetadata: (id: string, patch: Partial<Paper>) => Promise<Paper | null>;
  addQuestion: (
    paperId: string,
    sectionIdx: number,
    input: AddQuestionInput,
  ) => Promise<Paper | null>;
  updateQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
    patch: Partial<AddQuestionInput>,
  ) => Promise<Paper | null>;
  regenerateQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
  ) => Promise<Paper | null>;
  deleteQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
  ) => Promise<boolean>;
  updateMemo: (
    paperId: string,
    sections: PaperMemo['sections'],
  ) => Promise<boolean>;
  finalisePaper: (id: string) => Promise<Paper | null>;
  downloadPaperPdf: (id: string) => Promise<void>;
  downloadMemoPdf: (id: string) => Promise<void>;
  deletePaper: (id: string) => Promise<boolean>;
}

