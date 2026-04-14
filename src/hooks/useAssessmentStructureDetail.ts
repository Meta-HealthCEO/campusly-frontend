import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  AssessmentStructure,
  AddCategoryPayload,
  UpdateCategoryPayload,
  AddLineItemPayload,
  UpdateLineItemPayload,
  ClonePayload,
  LockError,
} from '@/types';

interface LockErrorResponse {
  errors?: LockError[];
}

export function useAssessmentStructureDetail(id: string | null) {
  const [structure, setStructure] = useState<AssessmentStructure | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockErrors, setLockErrors] = useState<LockError[] | null>(null);

  const fetchStructure = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/assessment-structures/${id}`);
      setStructure(unwrapResponse<AssessmentStructure>(res));
    } catch (err: unknown) {
      console.error('Failed to load structure', err);
      toast.error(extractErrorMessage(err, 'Could not load structure'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchStructure();
  }, [fetchStructure]);

  const updateStructure = useCallback(async (data: Partial<AssessmentStructure>) => {
    if (!id) return;
    try {
      const res = await apiClient.put(`/assessment-structures/${id}`, data);
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Structure updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update structure'));
      throw err;
    }
  }, [id]);

  const addCategory = useCallback(async (payload: AddCategoryPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/categories`, payload);
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Category added');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add category'));
      throw err;
    }
  }, [id]);

  const updateCategory = useCallback(async (
    catId: string,
    payload: UpdateCategoryPayload,
  ) => {
    if (!id) return;
    try {
      const res = await apiClient.put(
        `/assessment-structures/${id}/categories/${catId}`,
        payload,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Category updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update category'));
      throw err;
    }
  }, [id]);

  const deleteCategory = useCallback(async (catId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(
        `/assessment-structures/${id}/categories/${catId}`,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Category deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete category'));
      throw err;
    }
  }, [id]);

  const addLineItem = useCallback(async (catId: string, payload: AddLineItemPayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(
        `/assessment-structures/${id}/categories/${catId}/line-items`,
        payload,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Line item added');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add line item'));
      throw err;
    }
  }, [id]);

  const updateLineItem = useCallback(async (
    catId: string,
    itemId: string,
    payload: UpdateLineItemPayload,
  ) => {
    if (!id) return;
    try {
      const res = await apiClient.put(
        `/assessment-structures/${id}/categories/${catId}/line-items/${itemId}`,
        payload,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Line item updated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to update line item'));
      throw err;
    }
  }, [id]);

  const deleteLineItem = useCallback(async (catId: string, itemId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(
        `/assessment-structures/${id}/categories/${catId}/line-items/${itemId}`,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Line item deleted');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to delete line item'));
      throw err;
    }
  }, [id]);

  const linkAssessment = useCallback(async (
    catId: string,
    itemId: string,
    assessmentId: string,
  ) => {
    if (!id) return;
    try {
      const res = await apiClient.post(
        `/assessment-structures/${id}/categories/${catId}/line-items/${itemId}/link`,
        { assessmentId },
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Assessment linked');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to link assessment'));
      throw err;
    }
  }, [id]);

  const activate = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/activate`);
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Structure activated');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to activate structure'));
      throw err;
    }
  }, [id]);

  const lock = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    try {
      setLockErrors(null);
      const res = await apiClient.post(`/assessment-structures/${id}/lock`);
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Structure locked');
      return true;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: LockErrorResponse & { error?: string; message?: string } };
      };
      const errors = axiosErr.response?.data?.errors;
      if (errors && errors.length > 0) {
        setLockErrors(errors);
        toast.error('Cannot lock: some marks are missing');
        return false;
      }
      toast.error(extractErrorMessage(err, 'Failed to lock structure'));
      throw err;
    }
  }, [id]);

  const unlock = useCallback(async (reason: string) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/unlock`, { reason });
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      setLockErrors(null);
      toast.success('Structure unlocked');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to unlock structure'));
      throw err;
    }
  }, [id]);

  const addStudents = useCallback(async (studentIds: string[]) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/students`, {
        studentIds,
      });
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Students added');
      return updated;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to add students'));
      throw err;
    }
  }, [id]);

  const removeStudent = useCallback(async (studentId: string) => {
    if (!id) return;
    try {
      const res = await apiClient.delete(
        `/assessment-structures/${id}/students/${studentId}`,
      );
      const updated = unwrapResponse<AssessmentStructure>(res);
      setStructure(updated);
      toast.success('Student removed');
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to remove student'));
      throw err;
    }
  }, [id]);

  const saveAsTemplate = useCallback(async (templateName: string) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/save-as-template`, {
        templateName,
      });
      const template = unwrapResponse<AssessmentStructure>(res);
      toast.success('Saved as template');
      return template;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save as template'));
      throw err;
    }
  }, [id]);

  const cloneStructure = useCallback(async (payload: ClonePayload) => {
    if (!id) return;
    try {
      const res = await apiClient.post(`/assessment-structures/${id}/clone`, payload);
      const cloned = unwrapResponse<AssessmentStructure>(res);
      toast.success('Structure cloned');
      return cloned;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to clone structure'));
      throw err;
    }
  }, [id]);

  return {
    structure,
    loading,
    lockErrors,
    fetchStructure,
    updateStructure,
    addCategory,
    updateCategory,
    deleteCategory,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    linkAssessment,
    activate,
    lock,
    unlock,
    addStudents,
    removeStudent,
    saveAsTemplate,
    cloneStructure,
  };
}
