'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Trash2, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';
import type { SubjectLine, Subject } from '@/types';

interface SubjectLinesStepProps {
  lines: SubjectLine[];
  subjects: Subject[];
  gradeId: string;
  isFET: boolean;
  onSave: (data: Partial<SubjectLine>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onSuggest: (gradeId: string) => Promise<unknown>;
}

export function SubjectLinesStep({
  lines,
  subjects,
  gradeId,
  isFET,
  onSave,
  onDelete,
  onSuggest,
}: SubjectLinesStepProps) {
  const [newLineName, setNewLineName] = useState('');
  const [newSubjects, setNewSubjects] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  if (!isFET) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Not applicable"
        description="Subject lines only apply to FET grades (10-12). Skip this step for the selected grade."
      />
    );
  }

  // Detect conflicts: a subject appearing in multiple lines
  const subjectLineCounts = new Map<string, number>();
  lines.forEach((line) => {
    line.subjectIds.forEach((sid) => {
      subjectLineCounts.set(sid, (subjectLineCounts.get(sid) ?? 0) + 1);
    });
  });
  const conflicts = new Set(
    [...subjectLineCounts.entries()].filter(([, count]) => count > 1).map(([sid]) => sid),
  );

  function toggleSubject(subjectId: string) {
    setNewSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((s) => s !== subjectId) : [...prev, subjectId],
    );
  }

  async function handleAddLine() {
    if (!newLineName.trim() || newSubjects.length === 0) return;
    await onSave({ gradeId, lineName: newLineName.trim(), subjectIds: newSubjects });
    setNewLineName('');
    setNewSubjects([]);
  }

  async function handleSuggest() {
    setSuggesting(true);
    try {
      await onSuggest(gradeId);
    } finally {
      setSuggesting(false);
    }
  }

  async function removeSubjectFromLine(line: SubjectLine, subjectId: string) {
    const updated = line.subjectIds.filter((s) => s !== subjectId);
    await onSave({ ...line, subjectIds: updated });
  }

  async function addSubjectToLine(line: SubjectLine, subjectId: string) {
    if (line.subjectIds.includes(subjectId)) return;
    await onSave({ ...line, subjectIds: [...line.subjectIds, subjectId] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggesting}>
          <Sparkles className="mr-1 h-4 w-4" />
          {suggesting ? 'Suggesting...' : 'Suggest Optimal Lines'}
        </Button>
      </div>

      {conflicts.size > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            Some subjects appear in multiple lines. Students choosing those subjects will have
            schedule conflicts.
          </p>
        </div>
      )}

      {/* Existing lines */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {lines.map((line) => (
          <Card key={line.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{line.lineName}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => onDelete(line.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-2">
                {line.subjectIds.map((sid) => {
                  const subj = subjects.find((s) => s.id === sid);
                  return (
                    <Badge
                      key={sid}
                      variant={conflicts.has(sid) ? 'destructive' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => removeSubjectFromLine(line, sid)}
                    >
                      {subj?.name ?? sid} x
                    </Badge>
                  );
                })}
              </div>
              <Select
                value="placeholder"
                onValueChange={(v: unknown) => {
                  if ((v as string) !== 'placeholder') addSubjectToLine(line, v as string);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Add subject...</SelectItem>
                  {subjects
                    .filter((s) => !line.subjectIds.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>

      {lines.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No subject lines"
          description="Create lines manually or use the AI suggestion."
        />
      )}

      {/* Add new line */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Line Name</Label>
            <Input
              value={newLineName}
              onChange={(e) => setNewLineName(e.target.value)}
              placeholder="e.g. Line A"
              className="w-full sm:w-48"
            />
          </div>
          <div>
            <Label>Subjects</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {subjects.map((s) => (
                <Badge
                  key={s.id}
                  variant={newSubjects.includes(s.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSubject(s.id)}
                >
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAddLine}
            disabled={!newLineName.trim() || newSubjects.length === 0}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Line
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
