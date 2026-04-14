'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CategoryCard } from './CategoryCard';
import { AddCategoryForm } from './AddCategoryForm';
import { WeightIndicator } from './WeightIndicator';
import type {
  AssessmentStructure,
  StructureStatus,
  AddCategoryPayload,
  UpdateCategoryPayload,
  AddLineItemPayload,
  UpdateLineItemPayload,
} from '@/types';

type BadgeVariant = 'secondary' | 'default' | 'destructive';

const STATUS_BADGE: Record<StructureStatus, BadgeVariant> = {
  draft: 'secondary',
  active: 'default',
  locked: 'destructive',
};

const STATUS_LABEL: Record<StructureStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  locked: 'Locked',
};

interface Props {
  structure: AssessmentStructure;
  onAddCategory: (payload: AddCategoryPayload) => Promise<void>;
  onUpdateCategory: (catId: string, payload: UpdateCategoryPayload) => Promise<void>;
  onDeleteCategory: (catId: string) => Promise<void>;
  onAddLineItem: (catId: string, payload: AddLineItemPayload) => Promise<void>;
  onUpdateLineItem: (catId: string, itemId: string, payload: UpdateLineItemPayload) => Promise<void>;
  onDeleteLineItem: (catId: string, itemId: string) => Promise<void>;
  onActivate: () => Promise<void>;
  onLock: () => Promise<boolean>;
  onUnlock: (reason: string) => Promise<void>;
  onSaveAsTemplate: (name: string) => Promise<void>;
  onClone: () => void;
  termMarksTab: ReactNode;
  studentsTab?: ReactNode;
}

export function AssessmentStructureBuilder({
  structure,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddLineItem,
  onUpdateLineItem,
  onDeleteLineItem,
  onActivate,
  onLock,
  onUnlock,
  onSaveAsTemplate,
  onClone,
  termMarksTab,
  studentsTab,
}: Props) {
  const totalWeight = structure.categories.reduce((sum, c) => sum + c.weight, 0);
  const weightsValid = Math.round(totalWeight) === 100;
  const isDraft = structure.status === 'draft';
  const isActive = structure.status === 'active';
  const isLocked = structure.status === 'locked';

  const isStandalone = structure.schoolId === null;

  return (
    <div className="flex flex-col gap-6">
      {/* Structure header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold truncate">{structure.name}</h2>
            <Badge variant={STATUS_BADGE[structure.status]}>
              {STATUS_LABEL[structure.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {structure.subjectName} &middot; Term {structure.term} &middot; {structure.academicYear}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <Button
              size="sm"
              onClick={() => void onActivate()}
              disabled={!weightsValid || structure.categories.length === 0}
              title={!weightsValid ? 'Category weights must sum to 100%' : undefined}
            >
              Activate
            </Button>
          )}
          {isActive && (
            <>
              <Button size="sm" variant="outline" onClick={() => void onLock()}>Lock</Button>
              <Button size="sm" variant="outline" onClick={onClone}>Clone</Button>
              <Button size="sm" variant="outline" onClick={() => void onSaveAsTemplate(structure.name)}>
                Save Template
              </Button>
            </>
          )}
          {isLocked && (
            <>
              <Button size="sm" variant="outline" onClick={() => void onUnlock('Manual unlock')}>
                Unlock
              </Button>
              <Button size="sm" variant="outline">Export</Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="structure">
        <TabsList className="flex-wrap">
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="term-marks" disabled={isDraft}>
            Term Marks
          </TabsTrigger>
          {isStandalone && studentsTab && (
            <TabsTrigger value="students">Students</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="structure" className="flex flex-col gap-4 mt-4">
          {structure.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Add a category to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {structure.categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  structureStatus={structure.status}
                  onUpdateCategory={onUpdateCategory}
                  onDeleteCategory={onDeleteCategory}
                  onAddLineItem={onAddLineItem}
                  onUpdateLineItem={onUpdateLineItem}
                  onDeleteLineItem={onDeleteLineItem}
                />
              ))}
            </div>
          )}

          {!isLocked && (
            <AddCategoryForm onAdd={onAddCategory} disabled={isLocked} />
          )}

          <WeightIndicator total={totalWeight} label="Category weights" />
        </TabsContent>

        <TabsContent value="term-marks" className="mt-4">
          {termMarksTab}
        </TabsContent>

        {isStandalone && studentsTab && (
          <TabsContent value="students" className="mt-4">
            {studentsTab}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
