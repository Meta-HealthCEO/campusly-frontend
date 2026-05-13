'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTeacherResources } from '@/hooks/useTeacherResources';
import { useComprehensionGenerator } from '@/hooks/useComprehensionGenerator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen, Sparkles } from 'lucide-react';

interface Props {
  subjectId: string;
  gradeId: string;
  curriculumNodeId: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onComprehensionReady: (questionIds: string[]) => void;
}

export function ResourcePicker({
  subjectId,
  gradeId,
  curriculumNodeId,
  selectedId,
  onSelect,
  onComprehensionReady,
}: Props) {
  const { resources, loading } = useTeacherResources({ subjectId, gradeId, curriculumNodeId });
  const { generate, generating } = useComprehensionGenerator();
  const [generatedCount, setGeneratedCount] = useState(0);

  const handleGenerate = async (resourceId: string): Promise<void> => {
    if (!subjectId || !gradeId) {
      toast.error('Pick a subject + class first');
      return;
    }
    const questionIds = await generate(resourceId, subjectId, gradeId, curriculumNodeId, 4);
    if (questionIds) {
      onComprehensionReady(questionIds);
      setGeneratedCount(questionIds.length);
      toast.success(`Generated ${questionIds.length} comprehension questions`);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No resources"
        description="Add a resource to the Content Library first."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {resources.map((r) => (
          <button
            key={r._id}
            type="button"
            onClick={() => onSelect(r._id)}
            className={`text-left transition-colors hover:opacity-80 ${
              selectedId === r._id ? 'ring-2 ring-primary rounded-lg' : ''
            }`}
          >
            <Card>
              <CardContent className="p-3">
                <div className="font-medium text-sm truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{r.type}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
      {selectedId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={() => void handleGenerate(selectedId)}
            disabled={generating}
            className="w-full sm:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? 'Generating questions...' : 'Generate comprehension questions'}
          </Button>
          {generatedCount > 0 && !generating && (
            <span className="text-sm text-muted-foreground">
              {generatedCount} questions generated
            </span>
          )}
        </div>
      )}
    </div>
  );
}
