'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Search, Plus, AlertTriangle, FileText, ClipboardList, NotebookPen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResourceListTable } from '@/components/content/ResourceListTable';
import { ResourceFormDialog } from '@/components/content/ResourceFormDialog';
import { AssignHomeworkDialog } from '@/components/homework/AssignHomeworkDialog';
import { NodePicker } from '@/components/curriculum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useAssignHomework } from '@/hooks/useAssignHomework';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  ContentResourceItem,
  ResourceFilters,
  CreateResourcePayload,
  ContentBlockItem,
  ResourceType,
  ResourceStatus,
} from '@/types';
import type { AssignHomeworkFormValues } from '@/components/homework/AssignHomeworkDialog';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

// ─── Filter Constants ──────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'activity', label: 'Activity' },
  { value: 'study_notes', label: 'Study Notes' },
  { value: 'worked_example', label: 'Worked Example' },
  { value: 'reading', label: 'Reading' },
];

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TeacherContentBrowserPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { resources, total, loading, error, fetchResources, createResource } =
    useContentLibrary();
  const { subjects } = useSubjects();
  const { grades } = useGrades();
  const { frameworks, selectedFramework, searchNodes, loadNode } =
    useCurriculumStructure();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignResource, setAssignResource] = useState<ContentResourceItem | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const { classes, assignHomework } = useAssignHomework();

  const buildFilters = useCallback((): ResourceFilters => {
    const filters: ResourceFilters = {};
    if (search.trim()) filters.search = search.trim();
    if (typeFilter !== 'all') filters.type = typeFilter as ResourceType;
    if (statusFilter !== 'all') filters.status = statusFilter as ResourceStatus;
    if (mineOnly) filters.mine = true;
    if (selectedNodeId) filters.curriculumNodeId = selectedNodeId;
    return filters;
  }, [search, typeFilter, statusFilter, mineOnly, selectedNodeId]);

  useEffect(() => {
    void fetchResources(buildFilters()).then((ok) => {
      setFetchError(!ok);
    });
  }, [fetchResources, buildFilters]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );

  const gradeOptions = useMemo(
    () => grades.map((g) => ({ id: g.id, name: g.name })),
    [grades],
  );

  const handleCreate = async (
    data: CreateResourcePayload,
    _blocks: ContentBlockItem[],
  ) => {
    const result = await createResource(data);
    if (result) {
      setFormOpen(false);
      const ok = await fetchResources(buildFilters());
      setFetchError(!ok);
    }
  };

  const handleNodeChange = (nodeId: string | null, node: CurriculumNodeItem | null) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeTitle(node?.title ?? null);
  };

  const handleAssignClick = (resource: ContentResourceItem) => {
    setAssignResource(resource);
    setAssignOpen(true);
  };

  const handleAssignSubmit = async (formData: AssignHomeworkFormValues) => {
    if (!assignResource) return;
    const subId = typeof assignResource.subjectId === 'string'
      ? assignResource.subjectId
      : assignResource.subjectId.id;
    const success = await assignHomework({
      resourceId: assignResource.id,
      resourceTitle: assignResource.title,
      subjectId: subId,
      formData,
    });
    if (success) {
      setAssignOpen(false);
      setAssignResource(null);
    }
  };

  if (!user) return null;

  if (!user.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature. Contact your administrator or complete onboarding."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Printable and assignable lesson materials. Lesson plans, homework, test papers, and question bank items live in their own sections."
      >
        <Button onClick={() => setFormOpen(true)} variant="outline" className="gap-2">
          <Plus className="size-4" />
          Create Manually
        </Button>
      </PageHeader>

      <p className="text-sm text-muted-foreground">
        Resources are usually generated inside a Lesson.{' '}
        <Link href="/teacher/lessons" className="underline">Open a lesson</Link> to add AI-generated materials.
      </p>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex gap-3">
            <BookOpen className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Saved here</p>
              <p className="text-sm text-muted-foreground">
                Lessons, worksheets, activities, study notes, and worked examples.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/teacher/lesson-plans')}
            className="flex gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <NotebookPen className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Lesson plans</p>
              <p className="text-sm text-muted-foreground">Planning documents have their own workspace.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push('/teacher/homework')}
            className="flex gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <ClipboardList className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Homework</p>
              <p className="text-sm text-muted-foreground">Assigned work is managed separately from source resources.</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push('/teacher/papers')}
            className="flex gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <FileText className="mt-0.5 size-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Papers and questions</p>
              <p className="text-sm text-muted-foreground">Tests, exams, memos, and reusable questions are separate.</p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="w-full pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v: unknown) => setTypeFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v: unknown) => setStatusFilter(v as string)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={mineOnly ? 'default' : 'outline'}
          onClick={() => setMineOnly((prev) => !prev)}
          className="w-full sm:w-auto"
        >
          Mine
        </Button>
      </div>

      {/* ── Curriculum Node Filter ────────────────────────────────── */}
      {frameworks.length > 0 && (
        <div className="w-full sm:w-96">
          <NodePicker
            frameworkId={selectedFramework}
            value={selectedNodeId}
            onChange={handleNodeChange}
            onSearch={searchNodes}
            onLoadNode={loadNode}
            placeholder="Filter by curriculum node..."
          />
        </div>
      )}

      {/* ── Resource Grid ────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner />
      ) : fetchError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load resources"
          description={error ?? 'Something went wrong. Please try refreshing the page.'}
        />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No resources found"
          description="Try adjusting your filters, generate a resource in AI Studio, or create a resource manually."
        />
      ) : (
        <>
          <ResourceListTable resources={resources} onAssign={handleAssignClick} />
          <p className="text-sm text-muted-foreground text-center">
            Showing {resources.length} of {total} resource{total !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* ── Create Dialog ────────────────────────────────────────── */}
      <ResourceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        subjects={subjectOptions}
        grades={gradeOptions}
        selectedNodeId={selectedNodeId}
        selectedNodeTitle={selectedNodeTitle}
        onSubmit={handleCreate}
      />

      {/* ── Assign as Homework Dialog ───────────────────────────── */}
      {assignResource && (
        <AssignHomeworkDialog
          open={assignOpen}
          onOpenChange={(v) => {
            setAssignOpen(v);
            if (!v) setAssignResource(null);
          }}
          resourceTitle={assignResource.title}
          resourceType={assignResource.type}
          classes={classes}
          onSubmit={handleAssignSubmit}
        />
      )}
    </div>
  );
}
