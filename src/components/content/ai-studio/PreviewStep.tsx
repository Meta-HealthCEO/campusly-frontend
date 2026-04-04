'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Clock,
  BarChart3,
  Layers,
  Pencil,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { VisualBlockEditor } from '@/components/content/VisualBlockEditor';
import { RefinementPanel } from './RefinementPanel';
import { toast } from 'sonner';
import type {
  ContentResourceItem,
  ContentBlockItem,
  BlockInteractionState,
  AttemptResult,
  Grade,
  Subject,
  UpdateResourcePayload,
} from '@/types';

interface PreviewStepProps {
  resource: ContentResourceItem;
  grades: Grade[];
  subjects: Subject[];
  onPublish: (id: string) => Promise<boolean>;
  onReview: (id: string, data: { action: 'approve'; notes?: string }) => Promise<boolean>;
  onRefine: (id: string, instruction: string) => Promise<ContentResourceItem | null>;
  onRegenerate: () => void;
  onReset: () => void;
  onResourceUpdated: (resource: ContentResourceItem) => void;
  onUpdateResource?: (id: string, data: UpdateResourcePayload) => Promise<ContentResourceItem | null>;
}

export function PreviewStep({
  resource,
  grades,
  subjects,
  onPublish,
  onReview,
  onRefine,
  onRegenerate,
  onReset,
  onResourceUpdated,
  onUpdateResource,
}: PreviewStepProps) {
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBlocks, setEditedBlocks] = useState<ContentBlockItem[]>([]);

  const gradeName = useMemo(() => {
    if (typeof resource.gradeId === 'object') return resource.gradeId.name;
    return grades.find((g: Grade) => g.id === resource.gradeId)?.name ?? '';
  }, [resource.gradeId, grades]);

  const subjectName = useMemo(() => {
    if (typeof resource.subjectId === 'object') return resource.subjectId.name;
    return subjects.find((s: Subject) => s.id === resource.subjectId)?.name ?? '';
  }, [resource.subjectId, subjects]);

  const displayBlocks = editMode ? editedBlocks : resource.blocks;
  const blockCount = displayBlocks.length;
  const interactiveCount = useMemo(
    () =>
      displayBlocks.filter(
        (b: ContentBlockItem) => b.type !== 'text' && b.type !== 'image',
      ).length,
    [displayBlocks],
  );

  const [interactions] = useState<Record<string, BlockInteractionState>>({});

  const getInteraction = useCallback(
    (blockId: string): BlockInteractionState =>
      interactions[blockId] ?? {
        blockId,
        answered: false,
        correct: null,
        score: 0,
        maxScore: 0,
        showExplanation: false,
        hintsRevealed: 0,
        attemptResult: null,
      },
    [interactions],
  );

  const handleAttempt = useCallback(
    async (_blockId: string, _response: string): Promise<AttemptResult> => ({
      id: 'preview',
      correct: false,
      score: 0,
      maxScore: 1,
      attemptNumber: 1,
    }),
    [],
  );

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const submitted = await onPublish(resource.id);
      if (submitted) {
        const approved = await onReview(resource.id, { action: 'approve' });
        if (approved) toast.success('Resource published successfully!');
      }
    } catch (err: unknown) {
      console.error('Publish failed:', err);
    } finally {
      setPublishing(false);
    }
  }, [resource.id, onPublish, onReview]);

  const handleSaveDraft = useCallback(() => {
    setSaving(true);
    toast.success('Saved as draft in your Content Library');
    setTimeout(() => setSaving(false), 500);
  }, []);

  const handleEnterEdit = useCallback(() => {
    setEditedBlocks([...resource.blocks]);
    setEditMode(true);
  }, [resource.blocks]);

  const handleCancelEdit = useCallback(() => {
    setEditedBlocks([]);
    setEditMode(false);
  }, []);

  const handleSaveEdits = useCallback(async () => {
    if (!onUpdateResource) return;
    setSaving(true);
    try {
      const payload: UpdateResourcePayload = {
        blocks: editedBlocks.map(({ blockId: _bid, ...rest }) => rest),
      };
      const updated = await onUpdateResource(resource.id, payload);
      if (updated) {
        onResourceUpdated(updated);
        setEditMode(false);
        setEditedBlocks([]);
      }
    } catch (err: unknown) {
      console.error('Save blocks failed:', err);
    } finally {
      setSaving(false);
    }
  }, [onUpdateResource, resource.id, editedBlocks, onResourceUpdated]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary">{resource.type}</Badge>
                {gradeName && <Badge variant="outline">{gradeName}</Badge>}
                {subjectName && <Badge variant="outline">{subjectName}</Badge>}
                {resource.term > 0 && (
                  <Badge variant="outline">Term {resource.term}</Badge>
                )}
              </div>
              <CardTitle className="text-xl">{resource.title}</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1 shrink-0">
              <Sparkles className="h-3 w-3" />
              AI Generated
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                {blockCount} blocks
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                {interactiveCount} interactive
              </span>
              {resource.estimatedMinutes > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{resource.estimatedMinutes} min
                </span>
              )}
            </div>
            {onUpdateResource && !editMode && (
              <Button variant="outline" size="sm" onClick={handleEnterEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit Blocks
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Blocks */}
      {editMode ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Editing {editedBlocks.length} block
              {editedBlocks.length !== 1 ? 's' : ''}. Click the pencil icon on any block to
              edit its content inline.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdits} disabled={saving}>
                <Save className="mr-1 h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
          <VisualBlockEditor blocks={editedBlocks} onChange={setEditedBlocks} />
        </div>
      ) : (
        <div className="space-y-4">
          {resource.blocks.map((block: ContentBlockItem) => (
            <Card key={block.blockId}>
              <CardContent className="pt-4">
                <BlockRenderer
                  block={block}
                  onAttempt={handleAttempt}
                  interaction={getInteraction(block.blockId)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Refinement Panel */}
      <RefinementPanel
        resourceId={resource.id}
        onRefine={onRefine}
        onResourceUpdated={onResourceUpdated}
      />

      <Separator />

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onReset} className="text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Start Over
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRegenerate}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Regenerate
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            Save as Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('/teacher/curriculum/content', '_blank')}
          >
            <ExternalLink className="mr-1 h-4 w-4" />
            Content Library
          </Button>
          <Button onClick={handlePublish} disabled={publishing}>
            <CheckCircle className="mr-1 h-4 w-4" />
            {publishing ? 'Publishing...' : 'Approve & Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
