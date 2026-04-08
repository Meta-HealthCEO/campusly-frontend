'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
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
  TextbookFormDialog,
  TextbookDetailPanel,
  TextbookShelfView,
  TextbookListView,
  ViewToggle,
} from '@/components/textbook';
import type { ViewMode } from '@/components/textbook';
import { useTextbooks } from '@/hooks/useTextbooks';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useGrades, useSubjects } from '@/hooks/useAcademics';
import type {
  TextbookItem,
  TextbookFilters,
  CreateTextbookPayload,
  UpdateTextbookPayload,
} from '@/types';

export default function TeacherTextbooksPage() {
  const { textbooks, loading, fetchTextbooks, getTextbook, createTextbook, updateTextbook } = useTextbooks();
  const { frameworks } = useCurriculumStructure();
  const { grades } = useGrades();
  const { subjects } = useSubjects();

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('textbook-view-mode') as ViewMode) || 'shelf';
    }
    return 'shelf';
  });
  const [search, setSearch] = useState('');
  const [filterFramework, setFilterFramework] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<TextbookItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<TextbookItem | null>(null);

  const applyFilters = useCallback(() => {
    const filters: TextbookFilters = {};
    if (filterFramework && filterFramework !== 'all') filters.frameworkId = filterFramework;
    if (filterSubject && filterSubject !== 'all') filters.subjectId = filterSubject;
    if (filterGrade && filterGrade !== 'all') filters.gradeId = filterGrade;
    if (filterStatus && filterStatus !== 'all') filters.status = filterStatus as TextbookFilters['status'];
    if (search) filters.search = search;
    fetchTextbooks(filters);
  }, [fetchTextbooks, filterFramework, filterSubject, filterGrade, filterStatus, search]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const handleViewChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('textbook-view-mode', mode);
    }
  }, []);

  const handleSelectTextbook = useCallback(async (id: string) => {
    const full = await getTextbook(id);
    if (full) setSelected(full);
  }, [getTextbook]);

  const frameworkOptions = useMemo(() => frameworks.map((f) => ({ id: f.id, name: f.name })), [frameworks]);
  const subjectOptions = useMemo(() => subjects.map((s) => ({ id: s.id, name: s.name })), [subjects]);
  const gradeOptions = useMemo(() => {
    const gn = (name: string) => { const m = name.match(/\d+/); return m ? parseInt(m[0], 10) : -1; };
    return [...grades].sort((a, b) => gn(b.name) - gn(a.name)).map((g) => ({ id: g.id, name: g.name }));
  }, [grades]);

  if (loading && textbooks.length === 0) return <LoadingSpinner />;

  if (selected) {
    return (
      <TextbookDetailPanel
        textbook={selected}
        onBack={() => setSelected(null)}
        onRefresh={applyFilters}
        frameworks={frameworkOptions}
        subjects={subjectOptions}
        grades={gradeOptions}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Textbooks" description="Create and manage digital textbooks">
        <Button onClick={() => { setEditingTextbook(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Create Textbook
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-64 sm:flex-none">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search textbooks..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select value={filterFramework} onValueChange={(v: unknown) => setFilterFramework(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Framework">
              {filterFramework === 'all' ? 'All Frameworks' : frameworkOptions.find((f) => f.id === filterFramework)?.name ?? 'Framework'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworkOptions.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={(v: unknown) => setFilterSubject(v as string)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Subject">
              {filterSubject === 'all' ? 'All Subjects' : subjectOptions.find((s) => s.id === filterSubject)?.name ?? 'Subject'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {viewMode === 'list' && (
          <Select value={filterGrade} onValueChange={(v: unknown) => setFilterGrade(v as string)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Grade">
                {filterGrade === 'all' ? 'All Grades' : gradeOptions.find((g) => g.id === filterGrade)?.name ?? 'Grade'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {gradeOptions.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status">
              {filterStatus === 'all' ? 'All Statuses' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <ViewToggle mode={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      {viewMode === 'shelf' ? (
        <TextbookShelfView textbooks={textbooks} />
      ) : (
        <TextbookListView textbooks={textbooks} />
      )}

      <TextbookFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitCreate={async (data: CreateTextbookPayload) => { await createTextbook(data); applyFilters(); }}
        onSubmitUpdate={async (id: string, data: UpdateTextbookPayload) => { await updateTextbook(id, data); applyFilters(); }}
        editingTextbook={editingTextbook}
        frameworks={frameworkOptions}
        subjects={subjectOptions}
        grades={gradeOptions}
      />
    </div>
  );
}
