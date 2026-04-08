'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  TextbookDetailHeader,
  ChapterList,
  ChapterFormDialog,
  ResourcePickerDialog,
  TextbookFormDialog,
} from '@/components/textbook';
import { useTextbooks } from '@/hooks/useTextbooks';
import type {
  TextbookItem,
  CreateTextbookPayload,
  UpdateTextbookPayload,
  AddChapterPayload,
  UpdateChapterPayload,
  ChapterItem,
  ContentResourceItem,
} from '@/types';

function resolveId(field: string | { id: string; name: string }): string {
  return typeof field === 'object' ? field.id : field;
}

interface TextbookDetailPanelProps {
  textbook: TextbookItem;
  onBack: () => void;
  onRefresh: () => void;
  frameworks: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  grades: { id: string; name: string }[];
}

export function TextbookDetailPanel({
  textbook,
  onBack,
  onRefresh,
  frameworks,
  subjects,
  grades,
}: TextbookDetailPanelProps) {
  const {
    getTextbook,
    updateTextbook,
    publishTextbook,
    addChapter,
    updateChapter,
    removeChapter,
    reorderChapters,
    addResourceToChapter,
    removeResourceFromChapter,
    fetchAvailableResources,
    createTextbook,
  } = useTextbooks();

  const [selected, setSelected] = useState<TextbookItem>(textbook);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<TextbookItem | null>(null);
  const [chapterFormOpen, setChapterFormOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterItem | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState('');

  const refresh = useCallback(async () => {
    const updated = await getTextbook(selected.id);
    if (updated) setSelected(updated);
    onRefresh();
  }, [selected.id, getTextbook, onRefresh]);

  const handlePublish = useCallback(async () => {
    const ok = await publishTextbook(selected.id);
    if (ok) await refresh();
  }, [selected.id, publishTextbook, refresh]);

  const handleChapterSubmit = useCallback(
    async (data: AddChapterPayload | UpdateChapterPayload) => {
      if (editingChapter) {
        await updateChapter(selected.id, editingChapter.id, data as UpdateChapterPayload);
      } else {
        await addChapter(selected.id, data as AddChapterPayload);
      }
      await refresh();
    },
    [selected.id, editingChapter, addChapter, updateChapter, refresh],
  );

  const handleReorder = useCallback(
    async (chapterIds: string[]) => {
      const ok = await reorderChapters(selected.id, { chapterIds });
      if (ok) await refresh();
    },
    [selected.id, reorderChapters, refresh],
  );

  const existingResourceIds = useMemo(() => {
    if (!targetChapterId) return new Set<string>();
    const ch = selected.chapters?.find((c: ChapterItem) => c.id === targetChapterId);
    if (!ch) return new Set<string>();
    return new Set(ch.resources.map((r) =>
      typeof r.resourceId === 'object' ? r.resourceId.id : r.resourceId,
    ));
  }, [selected, targetChapterId]);

  const handleSearchResources = useCallback(
    async (searchTerm?: string) => {
      return fetchAvailableResources(resolveId(selected.subjectId), resolveId(selected.gradeId), searchTerm);
    },
    [selected, fetchAvailableResources],
  );

  const handleAddResource = useCallback(
    async (resource: ContentResourceItem) => {
      if (!targetChapterId) return;
      const ch = selected.chapters?.find((c: ChapterItem) => c.id === targetChapterId);
      await addResourceToChapter(selected.id, targetChapterId, {
        resourceId: resource.id,
        order: ch ? ch.resources.length : 0,
      });
      await refresh();
    },
    [selected, targetChapterId, addResourceToChapter, refresh],
  );

  return (
    <div className="space-y-6">
      <TextbookDetailHeader
        textbook={selected}
        onBack={onBack}
        onEdit={() => { setEditingTextbook(selected); setFormOpen(true); }}
        onPublish={handlePublish}
        onArchive={async () => { await updateTextbook(selected.id, {}); await refresh(); }}
      />

      <ChapterList
        chapters={selected.chapters ?? []}
        onAddChapter={() => { setEditingChapter(null); setChapterFormOpen(true); }}
        onEditChapter={(ch: ChapterItem) => { setEditingChapter(ch); setChapterFormOpen(true); }}
        onRemoveChapter={async (id: string) => { await removeChapter(selected.id, id); await refresh(); }}
        onReorder={handleReorder}
        onAddResource={(chId: string) => { setTargetChapterId(chId); setResourcePickerOpen(true); }}
        onRemoveResource={async (chId: string, rId: string) => { await removeResourceFromChapter(selected.id, chId, rId); await refresh(); }}
      />

      <ChapterFormDialog
        open={chapterFormOpen}
        onOpenChange={setChapterFormOpen}
        onSubmit={handleChapterSubmit}
        editingChapter={editingChapter}
        nextOrder={selected.chapters?.length ?? 0}
      />

      <ResourcePickerDialog
        open={resourcePickerOpen}
        onOpenChange={setResourcePickerOpen}
        onSelect={handleAddResource}
        onSearch={handleSearchResources}
        existingIds={existingResourceIds}
      />

      <TextbookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitCreate={async (data: CreateTextbookPayload) => { await createTextbook(data); await refresh(); }}
        onSubmitUpdate={async (id: string, data: UpdateTextbookPayload) => { await updateTextbook(id, data); await refresh(); }}
        editingTextbook={editingTextbook}
        frameworks={frameworks}
        subjects={subjects}
        grades={grades}
      />
    </div>
  );
}
