'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCourseBuilder } from '@/hooks/useCourseBuilder';
import { useClassUnit, useUnitGeneration, type ItemPreview } from '@/hooks/useClassUnit';
import { liveGeneration, unitStage, withPolledStatus } from '@/lib/course-unit';
import type { CourseLesson } from '@/types/courses';
import type { RewriteAction } from '@/lib/item-editing';
import type { ItemEdit } from '@/components/courses/unit/UnitItemEditor';

type Busy = 'draft' | 'approve' | 'release' | string | null;

/** Everything the unit page shows and does: the unit, its live progress, and the teacher's actions. */
export function useUnitView(courseId: string) {
  const builder = useCourseBuilder(courseId);
  const actions = useClassUnit();
  const { refresh, deleteLesson } = builder;
  const fetched = builder.course;
  // Poll while the fetched unit is being written; a poll that has finished is
  // ignored until the tree is refetched, so an old "done" can't mask a retry.
  const writing = fetched ? unitStage(fetched) === 'writing' : false;
  const poll = useUnitGeneration(courseId, writing, () => { void refresh(); });
  const pollActive = poll?.generation.status === 'queued' || poll?.generation.status === 'running';

  const course = useMemo(() => {
    if (!fetched) return null;
    const polled = writing && pollActive ? withPolledStatus(fetched, poll) : fetched;
    return { ...polled, generation: liveGeneration(polled) };
  }, [fetched, writing, pollActive, poll]);

  const [busy, setBusy] = useState<Busy>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ItemPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openItem, setOpenItem] = useState<CourseLesson | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const run = useCallback(async (key: Busy, task: () => Promise<unknown>): Promise<void> => {
    setBusy(key);
    try {
      await task();
      await refresh();
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const draft = useCallback(() => run('draft', async () => {
    setDraftError(await actions.draftOutline(courseId));
  }), [run, actions, courseId]);

  const approve = useCallback(() => run('approve', () => actions.approveOutline(courseId)), [run, actions, courseId]);
  const retry = useCallback((item: CourseLesson) => run(item.id, () => actions.retryItem(courseId, item.id)), [run, actions, courseId]);
  const remove = useCallback((item: CourseLesson) => run(item.id, () => deleteLesson(item.id)), [run, deleteLesson]);
  const release = useCallback(async (classIds: string[]): Promise<boolean> => {
    let ok = false;
    await run('release', async () => { ok = (await actions.releaseUnit(courseId, classIds)) !== null; });
    return ok;
  }, [run, actions, courseId]);

  const open = useCallback(async (item: CourseLesson): Promise<void> => {
    setPreview(null);
    setOpenItem(item);
    setEditError(null);
    setPreviewOpen(true);
    setPreview(await actions.previewItem(courseId, item.id));
  }, [actions, courseId]);

  /** Runs a save or rewrite on the open item, then shows the new version. */
  const change = useCallback(async (task: (lessonId: string) => Promise<string | null>): Promise<boolean> => {
    if (!openItem) return false;
    setEditBusy(true);
    setEditError(null);
    const failure = await task(openItem.id);
    if (!failure) {
      setPreview(await actions.previewItem(courseId, openItem.id));
      await refresh();
    }
    setEditError(failure);
    setEditBusy(false);
    return failure === null;
  }, [openItem, actions, courseId, refresh]);

  const saveItem = useCallback((edit: ItemEdit) => change((lessonId) => (edit.kind === 'questions'
    ? actions.saveQuestions(courseId, lessonId, edit.questions)
    : actions.saveContent(courseId, lessonId, edit.kind === 'steps' ? { steps: edit.steps } : { blocks: edit.blocks }))), [change, actions, courseId]);

  const rewriteItem = useCallback((action: RewriteAction, language?: string) => {
    void change((lessonId) => actions.rewriteItem(courseId, lessonId, action, language));
  }, [change, actions, courseId]);

  return {
    course,
    loading: builder.loading,
    stage: course ? unitStage(course) : null,
    busy,
    draftError,
    draft,
    approve,
    retry,
    remove,
    release,
    preview,
    previewOpen,
    setPreviewOpen,
    open,
    openItem,
    editBusy,
    editError,
    saveItem,
    rewriteItem,
  };
}
