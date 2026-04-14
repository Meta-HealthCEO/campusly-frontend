'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { AssessmentStructureBuilder } from '@/components/assessment-structure/AssessmentStructureBuilder';
import { useAssessmentStructureDetail } from '@/hooks/useAssessmentStructureDetail';
import { useTermMarks } from '@/hooks/useTermMarks';
import { useIsStandalone } from '@/hooks/useIsStandalone';
import type { AddCategoryPayload, UpdateCategoryPayload, AddLineItemPayload, UpdateLineItemPayload } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AssessmentStructureDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const isStandalone = useIsStandalone();

  const {
    structure,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    activate,
    lock,
    unlock,
    saveAsTemplate,
    cloneStructure,
  } = useAssessmentStructureDetail(id);

  const { termMarks } = useTermMarks(id);

  if (loading) return <LoadingSpinner />;

  if (!structure) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Structure not found"
        description="This assessment structure could not be loaded."
        action={
          <Button onClick={() => router.back()}>Go Back</Button>
        }
      />
    );
  }

  const handleAddCategory = async (payload: AddCategoryPayload) => {
    await addCategory(payload);
  };

  const handleUpdateCategory = async (catId: string, payload: UpdateCategoryPayload) => {
    await updateCategory(catId, payload);
  };

  const handleDeleteCategory = async (catId: string) => {
    await deleteCategory(catId);
  };

  const handleAddLineItem = async (catId: string, payload: AddLineItemPayload) => {
    await addLineItem(catId, payload);
  };

  const handleUpdateLineItem = async (catId: string, itemId: string, payload: UpdateLineItemPayload) => {
    await updateLineItem(catId, itemId, payload);
  };

  const handleDeleteLineItem = async (catId: string, itemId: string) => {
    await deleteLineItem(catId, itemId);
  };

  const handleActivate = async () => {
    await activate();
  };

  const handleLock = async () => {
    return await lock();
  };

  const handleUnlock = async (reason: string) => {
    await unlock(reason);
  };

  const handleSaveAsTemplate = async (name: string) => {
    await saveAsTemplate(name);
  };

  const handleClone = () => {
    void cloneStructure({ term: structure.term, academicYear: structure.academicYear });
  };

  const termMarksPlaceholder = (
    <p className="text-sm text-muted-foreground">
      Term marks view — coming in next task
      {termMarks && ` (${termMarks.students.length} students)`}
    </p>
  );

  const studentsPlaceholder = isStandalone ? (
    <p className="text-sm text-muted-foreground">
      Student management — coming in next task
    </p>
  ) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Structure"
        description="Manage categories, assessments, and mark capturing"
      >
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Back
        </Button>
      </PageHeader>

      <AssessmentStructureBuilder
        structure={structure}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddLineItem={handleAddLineItem}
        onUpdateLineItem={handleUpdateLineItem}
        onDeleteLineItem={handleDeleteLineItem}
        onActivate={handleActivate}
        onLock={handleLock}
        onUnlock={handleUnlock}
        onSaveAsTemplate={handleSaveAsTemplate}
        onClone={handleClone}
        termMarksTab={termMarksPlaceholder}
        studentsTab={studentsPlaceholder}
      />
    </div>
  );
}
