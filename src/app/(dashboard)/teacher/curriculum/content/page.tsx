'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { BookOpen, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResourceCard } from '@/components/content/ResourceCard';
import { ResourceFormDialog } from '@/components/content/ResourceFormDialog';
import { NodePicker } from '@/components/curriculum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  ContentResourceItem,
  ResourceFilters,
  CreateResourcePayload,
  ContentBlockItem,
  ResourceType,
  ResourceStatus,
} from '@/types';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

// ─── Filter Constants ──────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'study_notes', label: 'Study Notes' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'worked_example', label: 'Worked Example' },
  { value: 'activity', label: 'Activity' },
];

const STATUS_OPTIONS: { value: ResourceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TeacherContentBrowserPage() {
  const { user } = useAuthStore();
  const { resources, total, loading, fetchResources, createResource } =
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeTitle, setSelectedNodeTitle] = useState<string | null>(null);

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
    fetchResources(buildFilters());
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
      fetchResources(buildFilters());
    }
  };

  const handleNodeChange = (nodeId: string | null, node: CurriculumNodeItem | null) => {
    setSelectedNodeId(nodeId);
    setSelectedNodeTitle(node?.title ?? null);
  };

  const handleCardClick = (resource: ContentResourceItem) => {
    toast.info(`Resource: ${resource.title}`);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Library"
        description="Browse, create, and manage teaching resources"
      >
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Create Resource
        </Button>
      </PageHeader>

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
      ) : resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No resources found"
          description="Try adjusting your filters or create a new resource."
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={handleCardClick}
              />
            ))}
          </div>

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
    </div>
  );
}
