import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  QuestionItem,
  AssessmentPaperItem,
  CapsComplianceReport,
  QBQuestionFilters,
  PaperFilters,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  ReviewQuestionPayload,
  GenerateQuestionsPayload,
  ExtractFromPaperPayload,
  ExtractedQuestionItem,
  CreatePaperPayload,
  UpdatePaperPayload,
  AddQuestionToPaperPayload,
  GeneratePaperPayload,
} from '@/types/question-bank';

const BASE = '/question-bank';

interface QuestionsListResponse {
  questions: QuestionItem[];
  total: number;
  page: number;
  limit: number;
}

interface PapersListResponse {
  papers: AssessmentPaperItem[];
  total: number;
  page: number;
  limit: number;
}

export function useQuestionBank() {
  // ─── Questions state ────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // ─── Papers state ───────────────────────────────────────────────────────
  const [papers, setPapers] = useState<AssessmentPaperItem[]>([]);
  const [papersTotal, setPapersTotal] = useState(0);
  const [papersLoading, setPapersLoading] = useState(false);

  // ─── Questions CRUD ─────────────────────────────────────────────────────

  const fetchQuestions = useCallback(async (filters?: QBQuestionFilters) => {
    setQuestionsLoading(true);
    try {
      const res = await apiClient.get(`${BASE}/questions`, { params: filters });
      const data = unwrapResponse<QuestionsListResponse>(res);
      setQuestions(data.questions ?? []);
      setQuestionsTotal(data.total ?? 0);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load questions'));
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  const getQuestion = useCallback(async (id: string): Promise<QuestionItem | null> => {
    try {
      const res = await apiClient.get(`${BASE}/questions/${id}`);
      return unwrapResponse<QuestionItem>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load question'));
      return null;
    }
  }, []);

  const createQuestion = useCallback(async (data: CreateQuestionPayload) => {
    const res = await apiClient.post(`${BASE}/questions`, data);
    const question = unwrapResponse<QuestionItem>(res);
    toast.success('Question created');
    return question;
  }, []);

  const updateQuestion = useCallback(async (id: string, data: UpdateQuestionPayload) => {
    const res = await apiClient.put(`${BASE}/questions/${id}`, data);
    const question = unwrapResponse<QuestionItem>(res);
    toast.success('Question updated');
    return question;
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    await apiClient.delete(`${BASE}/questions/${id}`);
    toast.success('Question deleted');
  }, []);

  const submitQuestionForReview = useCallback(async (id: string) => {
    const res = await apiClient.patch(`${BASE}/questions/${id}/submit`);
    const question = unwrapResponse<QuestionItem>(res);
    toast.success('Question submitted for review');
    return question;
  }, []);

  const reviewQuestion = useCallback(async (id: string, data: ReviewQuestionPayload) => {
    const res = await apiClient.patch(`${BASE}/questions/${id}/review`, data);
    const question = unwrapResponse<QuestionItem>(res);
    toast.success(`Question ${data.action === 'approve' ? 'approved' : 'rejected'}`);
    return question;
  }, []);

  const generateQuestions = useCallback(async (data: GenerateQuestionsPayload) => {
    const res = await apiClient.post(`${BASE}/questions/generate`, data);
    const generated = unwrapResponse<QuestionItem[]>(res);
    const count = Array.isArray(generated) ? generated.length : 0;
    toast.success(`Generated ${count} question${count !== 1 ? 's' : ''}`);
    return generated;
  }, []);

  const extractFromPaper = useCallback(async (data: ExtractFromPaperPayload) => {
    const res = await apiClient.post(`${BASE}/questions/extract-from-paper`, data);
    const extracted = unwrapResponse<ExtractedQuestionItem[]>(res);
    return Array.isArray(extracted) ? extracted : [];
  }, []);

  // ─── Papers CRUD ────────────────────────────────────────────────────────

  const fetchPapers = useCallback(async (filters?: PaperFilters) => {
    setPapersLoading(true);
    try {
      const res = await apiClient.get(`${BASE}/papers`, { params: filters });
      const data = unwrapResponse<PapersListResponse>(res);
      setPapers(data.papers ?? []);
      setPapersTotal(data.total ?? 0);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load papers'));
    } finally {
      setPapersLoading(false);
    }
  }, []);

  const getPaper = useCallback(async (id: string): Promise<AssessmentPaperItem | null> => {
    try {
      const res = await apiClient.get(`${BASE}/papers/${id}`);
      return unwrapResponse<AssessmentPaperItem>(res);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to load paper'));
      return null;
    }
  }, []);

  const createPaper = useCallback(async (data: CreatePaperPayload) => {
    const res = await apiClient.post(`${BASE}/papers`, data);
    const paper = unwrapResponse<AssessmentPaperItem>(res);
    toast.success('Paper created');
    return paper;
  }, []);

  const updatePaper = useCallback(async (id: string, data: UpdatePaperPayload) => {
    const res = await apiClient.put(`${BASE}/papers/${id}`, data);
    const paper = unwrapResponse<AssessmentPaperItem>(res);
    toast.success('Paper updated');
    return paper;
  }, []);

  const addQuestionToPaper = useCallback(
    async (paperId: string, data: AddQuestionToPaperPayload) => {
      const res = await apiClient.post(`${BASE}/papers/${paperId}/questions`, data);
      const paper = unwrapResponse<AssessmentPaperItem>(res);
      toast.success('Question added to paper');
      return paper;
    },
    [],
  );

  const removeQuestionFromPaper = useCallback(
    async (paperId: string, sectionIndex: number, questionIndex: number) => {
      const res = await apiClient.delete(
        `${BASE}/papers/${paperId}/questions/${sectionIndex}/${questionIndex}`,
      );
      const paper = unwrapResponse<AssessmentPaperItem>(res);
      toast.success('Question removed from paper');
      return paper;
    },
    [],
  );

  const finalisePaper = useCallback(async (id: string) => {
    const res = await apiClient.post(`${BASE}/papers/${id}/finalise`, {});
    const paper = unwrapResponse<AssessmentPaperItem>(res);
    toast.success('Paper finalised');
    return paper;
  }, []);

  const getCompliance = useCallback(
    async (id: string): Promise<CapsComplianceReport | null> => {
      try {
        const res = await apiClient.get(`${BASE}/papers/${id}/compliance`);
        return unwrapResponse<CapsComplianceReport>(res);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to check compliance'));
        return null;
      }
    },
    [],
  );

  const clonePaper = useCallback(async (id: string) => {
    const res = await apiClient.post(`${BASE}/papers/${id}/clone`, {});
    const paper = unwrapResponse<AssessmentPaperItem>(res);
    toast.success('Paper cloned');
    return paper;
  }, []);

  const generatePaper = useCallback(async (data: GeneratePaperPayload) => {
    const res = await apiClient.post(`${BASE}/papers/generate`, data);
    const paper = unwrapResponse<AssessmentPaperItem>(res);
    toast.success('Paper generated');
    return paper;
  }, []);

  const downloadPaperPdf = useCallback(async (paperId: string) => {
    const res = await apiClient.get(`${BASE}/papers/${paperId}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `paper-${paperId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Paper PDF downloaded');
  }, []);

  const downloadMemoPdf = useCallback(async (paperId: string) => {
    const res = await apiClient.get(`${BASE}/papers/${paperId}/memo-pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `memo-${paperId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success('Memo PDF downloaded');
  }, []);

  return {
    // Questions state
    questions,
    questionsTotal,
    questionsLoading,
    // Questions actions
    fetchQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    submitQuestionForReview,
    reviewQuestion,
    generateQuestions,
    extractFromPaper,
    // Papers state
    papers,
    papersTotal,
    papersLoading,
    // Papers actions
    fetchPapers,
    getPaper,
    createPaper,
    updatePaper,
    addQuestionToPaper,
    removeQuestionFromPaper,
    finalisePaper,
    getCompliance,
    clonePaper,
    generatePaper,
    downloadPaperPdf,
    downloadMemoPdf,
  };
}
