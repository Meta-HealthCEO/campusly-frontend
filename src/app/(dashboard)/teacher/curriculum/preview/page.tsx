'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Search, BookOpen, FileText, BarChart3, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResourceCard } from '@/components/content/ResourceCard';
import { NodePicker } from '@/components/curriculum';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useSubjects, useGrades } from '@/hooks/useAcademics';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type { ContentResourceItem, ResourceFilters } from '@/types';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

export default function TeacherStudentPreviewPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { resources, loading, fetchResources } = useContentLibrary();
  const { frameworks, selectedFramework, searchNodes, loadNode } = useCurriculumStructure();
  const { subjects } = useSubjects();
  const { grades } = useGrades();

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const doFetch = useCallback(() => {
    const filters: ResourceFilters = { status: 'approved' };
    if (search.trim()) filters.search = search.trim();
    if (subjectFilter !== 'all') filters.subjectId = subjectFilter;
    if (gradeFilter !== 'all') filters.gradeId = gradeFilter;
    if (selectedNodeId) filters.curriculumNodeId = selectedNodeId;
    fetchResources(filters);
  }, [fetchResources, search, subjectFilter, gradeFilter, selectedNodeId]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const handleNodeChange = useCallback(
    (nodeId: string | null, _node: CurriculumNodeItem | null) => {
      setSelectedNodeId(nodeId);
    },
    [],
  );

  const handlePreview = (resource: ContentResourceItem) => {
    router.push(`/teacher/curriculum/preview/${resource.id}`);
  };

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name })),
    [subjects],
  );

  const gradeOptions = useMemo(
    () => grades.map((g) => ({ id: g.id, name: g.name })),
    [grades],
  );

  if (!user?.schoolId) {
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
        title="Student Preview"
        description="Preview approved content as students will see it"
      >
        <Badge variant="outline" className="gap-1 text-sm">
          <Eye className="size-3.5" />
          Preview Mode
        </Badge>
      </PageHeader>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Eye className="size-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">You are viewing content as a student would see it.</p>
            <p className="text-muted-foreground mt-1">
              Only approved resources are shown. Click any resource to open the student learning view.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full pl-9"
          />
        </div>

        <Select value={subjectFilter} onValueChange={(v: unknown) => setSubjectFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={gradeFilter} onValueChange={(v: unknown) => setGradeFilter(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Node Picker */}
      {frameworks.length > 0 && (
        <div className="w-full sm:max-w-sm">
          <NodePicker
            frameworkId={selectedFramework}
            value={selectedNodeId}
            onChange={handleNodeChange}
            onSearch={searchNodes}
            onLoadNode={loadNode}
            placeholder="Filter by curriculum topic..."
            disabled={!selectedFramework}
          />
        </div>
      )}

      {/* Resource Grid */}
      {loading ? (
        <LoadingSpinner />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No approved resources"
          description="No approved content available yet. Create resources in the Content Library and submit them for review."
        />
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onClick={handlePreview}
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {resources.length} approved resource{resources.length !== 1 ? 's' : ''} available
          </p>
        </>
      )}
    </div>
  );
}
