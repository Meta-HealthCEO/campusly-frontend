'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { AssessmentStructureList } from '@/components/assessment-structure/AssessmentStructureList';
import { CreateStructureDialog } from '@/components/assessment-structure/CreateStructureDialog';
import { useAssessmentStructures } from '@/hooks/useAssessmentStructures';
import type { CreateStructurePayload } from '@/types';

export default function AssessmentStructurePage() {
  const router = useRouter();
  const { structures, loading, createStructure } = useAssessmentStructures();
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = async (payload: CreateStructurePayload) => {
    const created = await createStructure(payload);
    setCreateOpen(false);
    if (created?.id) {
      router.push(`/teacher/curriculum/assessment-structure/${created.id}`);
    }
    return created;
  };

  const handleSelect = (id: string) => {
    router.push(`/teacher/curriculum/assessment-structure/${id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Structures"
        description="Manage term assessment structures and mark capturing for your classes"
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create New
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingSpinner />
      ) : structures.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No assessment structures"
          description="Create your first assessment structure to start capturing marks for your students."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create New
            </Button>
          }
        />
      ) : (
        <AssessmentStructureList
          structures={structures}
          onSelect={handleSelect}
        />
      )}

      <CreateStructureDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
