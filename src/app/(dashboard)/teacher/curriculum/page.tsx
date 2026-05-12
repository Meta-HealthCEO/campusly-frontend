'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BookOpen, FileText, Library } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

export default function TeacherCurriculumPage() {
  const user = useAuthStore((state) => state.user);
  const {
    frameworks,
    loading,
    selectedFramework,
    setSelectedFramework,
  } = useCurriculumStructure();
  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);

  const selectedFrameworkName = useMemo(
    () => frameworks.find((framework) => framework.id === selectedFramework)?.name ?? 'CAPS',
    [frameworks, selectedFramework],
  );

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="Complete onboarding before browsing the curriculum."
      />
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (frameworks.length === 0 || !selectedFramework) {
    return (
      <EmptyState
        icon={Library}
        title="No curriculum framework found"
        description="The global CAPS curriculum needs to be loaded before this page can be used."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CAPS Browser"
        description="Browse the curriculum map by phase, grade, subject, term, topic, and subtopic. Use a topic from here when planning a lesson or generating a paper."
      />


      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">Curriculum Map</CardTitle>
              <p className="text-sm text-muted-foreground">
                Expand the tree to inspect CAPS coverage before generating work.
              </p>
            </div>
            <Select
              value={selectedFramework}
              onValueChange={(value) => {
                if (value) setSelectedFramework(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                {frameworks.map((framework) => (
                  <SelectItem key={framework.id} value={framework.id}>
                    {framework.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-2">
              <CurriculumTreeBrowser
                frameworkId={selectedFramework}
                selectedNodeId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Item</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use this as reference, then generate lessons, resources, homework, or papers in AI Studio.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNode ? (
              <>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedNode.type}</Badge>
                    {selectedNode.code && (
                      <Badge variant="outline" className="font-mono">
                        {selectedNode.code}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold">{selectedNode.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedNode.description || 'No description has been added for this item yet.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={ROUTES.TEACHER_LESSONS}
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 gap-2')}
                  >
                    <BookOpen className="size-4" />
                    Plan a lesson
                  </Link>
                  <Link
                    href="/teacher/papers/new"
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 gap-2')}
                  >
                    <FileText className="size-4" />
                    Create a paper
                  </Link>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Select a topic or subtopic in the {selectedFrameworkName} tree to inspect its description.
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <p className="font-medium">What belongs here?</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This page is only for browsing CAPS. Resources, textbooks, lesson plans,
                homework, papers, and questions each have their own left-menu item.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
