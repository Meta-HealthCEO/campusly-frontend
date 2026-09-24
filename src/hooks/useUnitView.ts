'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useCourseBuilder } from '@/hooks/useCourseBuilder';
import { useClassUnit, useUnitGeneration, type ItemPreview } from '@/hooks/useClassUnit';
import { liveGeneration, unitStage, withPolledStatus } from '@/lib/course-unit';
import type { CourseLesson } from '@/types/courses';
import type { RewriteAction } from '@/lib/item-editing';
import type { RevisionTarget } from '@/lib/unit-insight';
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [openItem, setOpenItem] = useState<CourseLesson | null>(null);
  // A save or rewrite can outlive the sheet it started in: its result applies only to that item.
  const openIdRef = useRef<string | null>(null);
  const [editBusyId, setEditBusyId] = useState<string | null>(null);
  const [editError, setEditError] = useState<{ lessonId: string; message: string } | null>(null);
  const [revisionError, setRevisionError] = useState<{ itemId: string; message: string } | null>(null);

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
    openIdRef.current = item.id;
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    setOpenItem(item);
    setPreviewOpen(true);
    const next = await actions.previewItem(courseId, item.id);
    if (openIdRef.current === item.id) {
      setPreview(next);
      setPreviewError(next ? null : "Couldn't load this item. Try again.");
      setPreviewLoading(false);
    }
  }, [actions, courseId]);

  /** Retries the currently-open item's preview after a load failure. */
  const retryPreview = useCallback((): void => {
    if (openItem) void open(openItem);
  }, [open, openItem]);

  /** Runs a save or rewrite on the open item, then shows the new version. */
  const change = useCallback(async (task: (lessonId: string) => Promise<string | null>): Promise<boolean> => {
    if (!openItem) return false;
    const lessonId = openItem.id;
    setEditBusyId(lessonId);
    setEditError(null);
    const failure = await task(lessonId);
    if (!failure) {
      const next = await actions.previewItem(courseId, lessonId);
      if (openIdRef.current === lessonId) setPreview(next);
      await refresh();
    }
    setEditError(failure ? { lessonId, message: failure } : null);
    setEditBusyId(null);
    return failure === null;
  }, [openItem, actions, courseId, refresh]);

  const saveItem = useCallback((edit: ItemEdit) => change((lessonId) => (edit.kind === 'questions'
    ? actions.saveQuestions(courseId, lessonId, edit.questions)
    : actions.saveContent(courseId, lessonId, edit.kind === 'steps' ? { steps: edit.steps } : { blocks: edit.blocks }))), [change, actions, courseId]);

  const rewriteItem = useCallback((action: RewriteAction, language?: string) => {
    void change((lessonId) => actions.rewriteItem(courseId, lessonId, action, language));
  }, [change, actions, courseId]);

  const setSequential = useCallback((sequential: boolean) => run('settings', () => actions.updateSettings(courseId, sequential)), [run, actions, courseId]);

  /** Adds a revision item after a check, on the questions the class got wrong there. Resolves true once it's added. */
  const addRevision = useCallback(async (target: RevisionTarget): Promise<boolean> => {
    let ok = false;
    await run(`revision-${target.itemId}`, async () => {
      setRevisionError(null);
      const failure = await actions.addRevision(courseId, target.itemId, target.questionIds);
      if (failure) setRevisionError({ itemId: target.itemId, message: failure });
      else ok = true;
    });
    return ok;
  }, [run, actions, courseId]);

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
    previewLoading,
    previewError,
    retryPreview,
    previewOpen,
    setPreviewOpen,
    open,
    openItem,
    /** This item is being saved or rewritten. */
    editBusy: editBusyId !== null && editBusyId === openItem?.id,
    /** Another item is being saved or rewritten: one change at a time. */
    otherBusy: editBusyId !== null && editBusyId !== openItem?.id,
    editError: editError && editError.lessonId === openItem?.id ? editError.message : null,
    saveItem,
    rewriteItem,
    setSequential,
    addRevision,
    revisionError,
  };
}
