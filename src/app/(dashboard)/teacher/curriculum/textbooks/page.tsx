'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TextbookCard,
  TextbookFormDialog,
  ChapterList,
  ChapterFormDialog,
  ResourcePickerDialog,
  TextbookDetailHeader,
} from '@/components/textbook';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import type {
  TextbookItem,
  TextbookFilters,
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

export default function TeacherTextbooksPage() {
  const {
    textbooks,
    loading,
    fetchTextbooks,
    getTextbook,
    createTextbook,
    updateTextbook,
    publishTextbook,
    addChapter,
    updateChapter,
    removeChapter,
    reorderChapters,
    addResourceToChapter,
    removeResourceFromChapter,
    fetchAvailableResources,
  } = useTextbooks();

  const { frameworks } = useCurriculumStructure();
  const { grades } = useGrades();
  const { subjects } = useSubjects();

  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<TextbookItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<TextbookItem | null>(null);
  const [chapterFormOpen, setChapterFormOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterItem | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState('');

  const applyFilters = useCallback(() => {
    const filters: TextbookFilters = {};
    if (filterFramework) filters.frameworkId = filterFramework;
    if (filterSubject) filters.subjectId = filterSubject;
    if (filterGrade) filters.gradeId = filterGrade;
    if (filterStatus) filters.status = filterStatus as TextbookFilters['status'];
    if (search) filters.search = search;
    fetchTextbooks(filters);
  }, [fetchTextbooks, filterFramework, filterSubject, filterGrade, filterStatus, search]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const refreshSelected = useCallback(async (id: string) => {
    const updated = await getTextbook(id);
    if (updated) setSelected(updated);
  }, [getTextbook]);

  const handleCreate = useCallback(
    async (data: CreateTextbookPayload) => {
      const result = await createTextbook(data);
      if (result) { applyFilters(); setSelected(result); }
    },
    [createTextbook, applyFilters],
  );

  const handleUpdate = useCallback(
    async (id: string, data: UpdateTextbookPayload) => {
      const result = await updateTextbook(id, data);
      if (result) { applyFilters(); setSelected(result); }
    },
    [updateTextbook, applyFilters],
  );

  const handlePublish = useCallback(async () => {
    if (!selected) return;
    const ok = await publishTextbook(selected.id);
    if (ok) { applyFilters(); await refreshSelected(selected.id); }
  }, [selected, publishTextbook, applyFilters, refreshSelected]);

  const handleArchive = useCallback(async () => {
    if (!selected) return;
    const result = await updateTextbook(selected.id, {});
    if (result) { applyFilters(); await refreshSelected(selected.id); }
  }, [selected, updateTextbook, applyFilters, refreshSelected]);

  const handleChapterSubmit = useCallback(
    async (data: AddChapterPayload | UpdateChapterPayload) => {
      if (!selected) return;
      if (editingChapter) {
        await updateChapter(selected.id, editingChapter.id, data as UpdateChapterPayload);
      } else {
        await addChapter(selected.id, data as AddChapterPayload);
      }
      await refreshSelected(selected.id);
    },
    [selected, editingChapter, addChapter, updateChapter, refreshSelected],
  );

  const handleRemoveChapter = useCallback(
    async (chapterId: string) => {
      if (!selected) return;
      const ok = await removeChapter(selected.id, chapterId);
      if (ok) await refreshSelected(selected.id);
    },
    [selected, removeChapter, refreshSelected],
  );

  const handleReorder = useCallback(
    async (chapterIds: string[]) => {
      if (!selected) return;
      const ok = await reorderChapters(selected.id, { chapterIds });
      if (ok) await refreshSelected(selected.id);
    },
    [selected, reorderChapters, refreshSelected],
  );

  const existingResourceIds = useMemo(() => {
    if (!selected || !targetChapterId) return new Set<string>();
    const ch = selected.chapters?.find((c: ChapterItem) => c.id === targetChapterId);
    if (!ch) return new Set<string>();
    return new Set(ch.resources.map((r) => {
      return typeof r.resourceId === 'object' ? r.resourceId.id : r.resourceId;
    }));
  }, [selected, targetChapterId]);

  const handleSearchResources = useCallback(
    async (searchTerm?: string) => {
      if (!selected) return [];
      return fetchAvailableResources(
        resolveId(selected.subjectId),
        resolveId(selected.gradeId),
        searchTerm,
      );
    },
    [selected, fetchAvailableResources],
  );

  const handleAddResource = useCallback(
    async (resource: ContentResourceItem) => {
      if (!selected || !targetChapterId) return;
      const ch = selected.chapters?.find((c: ChapterItem) => c.id === targetChapterId);
      const nextOrder = ch ? ch.resources.length : 0;
      await addResourceToChapter(selected.id, targetChapterId, {
        resourceId: resource.id,
        order: nextOrder,
      });
      await refreshSelected(selected.id);
    },
    [selected, targetChapterId, addResourceToChapter, refreshSelected],
  );

  const handleRemoveResource = useCallback(
    async (chapterId: string, resourceId: string) => {
      if (!selected) return;
      const ok = await removeResourceFromChapter(selected.id, chapterId, resourceId);
      if (ok) await refreshSelected(selected.id);
    },
    [selected, removeResourceFromChapter, refreshSelected],
  );

  const frameworkOptions = useMemo(() => frameworks.map((f) => ({ id: f.id, name: f.name })), [frameworks]);
  const subjectOptions = useMemo(() => subjects.map((s) => ({ id: s.id, name: s.name })), [subjects]);
  const gradeOptions = useMemo(() => grades.map((g) => ({ id: g.id, name: g.name })), [grades]);

  if (loading && textbooks.length === 0) return <LoadingSpinner />;

  if (selected) {
    return (
      <div className="space-y-6">
        <TextbookDetailHeader
          textbook={selected}
          onBack={() => setSelected(null)}
          onEdit={() => { setEditingTextbook(selected); setFormOpen(true); }}
          onPublish={handlePublish}
          onArchive={handleArchive}
        />

        <ChapterList
          chapters={selected.chapters ?? []}
          onAddChapter={() => { setEditingChapter(null); setChapterFormOpen(true); }}
          onEditChapter={(ch: ChapterItem) => { setEditingChapter(ch); setChapterFormOpen(true); }}
          onRemoveChapter={handleRemoveChapter}
          onReorder={handleReorder}
          onAddResource={(chId: string) => { setTargetChapterId(chId); setResourcePickerOpen(true); }}
          onRemoveResource={handleRemoveResource}
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
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
          editingTextbook={editingTextbook}
          frameworks={frameworkOptions}
          subjects={subjectOptions}
          grades={gradeOptions}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Textbooks" description="Create and manage digital textbooks">
        <Button onClick={() => { setEditingTextbook(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Create Textbook
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search textbooks..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select
          value={filterFramework || undefined}
          onValueChange={(v: unknown) => setFilterFramework((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Framework" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworkOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filterSubject || undefined}
          onValueChange={(v: unknown) => setFilterSubject((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filterGrade || undefined}
          onValueChange={(v: unknown) => setFilterGrade((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeOptions.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus || undefined}
          onValueChange={(v: unknown) => setFilterStatus((v as string) === 'all' ? '' : (v as string))}
        >
          <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {textbooks.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No textbooks found"
          description="Create your first textbook or adjust filters."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {textbooks.map((tb: TextbookItem) => (
            <TextbookCard key={tb.id} textbook={tb} onClick={setSelected} />
          ))}
        </div>
      )}

      <TextbookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitCreate={handleCreate}
        onSubmitUpdate={handleUpdate}
        editingTextbook={editingTextbook}
        frameworks={frameworkOptions}
        subjects={subjectOptions}
        grades={gradeOptions}
      />
    </div>
  );
}
