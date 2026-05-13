'use client';

import { useEffect, useState } from 'react';
import { Pencil, Save, X, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import type { Assignment, RubricCriterionInput } from '@/types/assignments';

interface Props {
  assignment: Assignment;
  onChanged: () => Promise<void>;
}

export function AssignmentRubricTab({ assignment, onChanged }: Props) {
  const { update } = useTeacherAssignments();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RubricCriterionInput[]>(
    assignment.rubric.map((c) => ({
      name: c.name,
      description: c.description,
      maxMarks: c.maxMarks,
    })),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setDraft(assignment.rubric.map((c) => ({
        name: c.name,
        description: c.description,
        maxMarks: c.maxMarks,
      })));
    }
  }, [editing, assignment.rubric]);

  const sum = draft.reduce((s, c) => s + c.maxMarks, 0);
  const validSum = sum === assignment.totalMarks;

  const handleSave = async () => {
    if (!validSum) return;
    setSaving(true);
    const ok = await update(assignment._id, { rubric: draft });
    setSaving(false);
    if (ok) {
      setEditing(false);
      await onChanged();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Rubric</CardTitle>
          <div className="flex items-center gap-2">
            {editing && (
              <Badge
                variant={validSum ? 'default' : 'destructive'}
                className="text-xs"
              >
                {sum} / {assignment.totalMarks} marks
              </Badge>
            )}
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={saving || !validSum}
                >
                  <Save className="mr-1 h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <ul className="divide-y">
            {assignment.rubric.map((c) => (
              <li key={c._id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {c.maxMarks} marks
                  </Badge>
                </div>
              </li>
            ))}
            {assignment.rubric.length === 0 && (
              <li className="py-6 text-sm text-muted-foreground">
                No rubric criteria yet. Edit to add some.
              </li>
            )}
          </ul>
        ) : (
          <div className="space-y-3">
            {draft.map((c, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => setDraft((prev) => prev.map((p, i) =>
                      i === idx ? { ...p, name: e.target.value } : p))}
                    placeholder="Criterion name"
                    className="font-medium"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={c.maxMarks}
                    onChange={(e) => setDraft((prev) => prev.map((p, i) =>
                      i === idx ? { ...p, maxMarks: Number(e.target.value) || 0 } : p))}
                    className="w-24 text-center"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="Remove criterion"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  value={c.description ?? ''}
                  onChange={(e) => setDraft((prev) => prev.map((p, i) =>
                    i === idx ? { ...p, description: e.target.value } : p))}
                  placeholder="What you're looking for in this criterion (optional)"
                  rows={2}
                  className="text-sm"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDraft((prev) => [
                ...prev,
                { name: 'New criterion', description: '', maxMarks: 0 },
              ])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Add criterion
            </Button>
            {!validSum && draft.length > 0 && (
              <p className="text-xs text-destructive">
                Adjust criterion marks so they sum to {assignment.totalMarks}.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
