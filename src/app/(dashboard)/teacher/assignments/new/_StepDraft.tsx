'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/shared/RichTextEditor';
import { RichTextView } from '@/components/shared/RichTextView';
import type { RubricCriterionInput } from '@/types/assignments';

interface StepDraftProps {
  title: string;
  setTitle: (s: string) => void;
  brief: string;
  setBrief: (s: string) => void;
  rubric: RubricCriterionInput[];
  setRubric: React.Dispatch<React.SetStateAction<RubricCriterionInput[]>>;
  rubricSum: number;
  totalMarks: number;
  generating: boolean;
  onRegenerate: () => void;
}

export function StepDraft({
  title, setTitle, brief, setBrief, rubric, setRubric, rubricSum,
  totalMarks, generating, onRegenerate,
}: StepDraftProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Draft</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Edit anything you do not like, or regenerate for a fresh take.
                Tweak instructions on step 1 first if needed.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Regenerating…
                </>
              ) : (
                <>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Brief</Label>
            <Tabs defaultValue="edit">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-3">
                <RichTextEditor
                  initialHtml={brief}
                  onChange={setBrief}
                  minHeight="min-h-112"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="rounded-md border bg-muted/10 p-4 min-h-112 max-h-160 overflow-y-auto">
                  {brief.trim().length > 0 ? (
                    <RichTextView html={brief} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              Edit uses formatting controls; Preview shows exactly what students will see.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Rubric</CardTitle>
            <Badge
              variant={rubricSum === totalMarks ? 'default' : 'destructive'}
              className="text-xs"
            >
              {rubricSum} / {totalMarks} marks
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Per-criterion marks must sum to total marks ({totalMarks}).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {rubric.map((c, idx) => (
            <RubricRow
              key={idx}
              value={c}
              onChange={(next) =>
                setRubric((prev) => prev.map((p, i) => (i === idx ? next : p)))
              }
              onRemove={() =>
                setRubric((prev) => prev.filter((_, i) => i !== idx))
              }
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRubric((prev) => [
                ...prev,
                { name: 'New criterion', description: '', maxMarks: 0 },
              ])
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add criterion
          </Button>
          {rubricSum !== totalMarks && (
            <p className="text-xs text-destructive">
              Adjust criterion marks so they sum to {totalMarks}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface RubricRowProps {
  value: RubricCriterionInput;
  onChange: (next: RubricCriterionInput) => void;
  onRemove: () => void;
}

function RubricRow({ value, onChange, onRemove }: RubricRowProps) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Criterion name"
          className="font-medium"
        />
        <Input
          type="number"
          min={0}
          value={value.maxMarks}
          onChange={(e) => onChange({ ...value, maxMarks: Number(e.target.value) || 0 })}
          className="w-24 text-center"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove criterion"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={value.description ?? ''}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        placeholder="What you're looking for in this criterion (optional)"
        rows={2}
        className="text-sm"
      />
    </div>
  );
}
