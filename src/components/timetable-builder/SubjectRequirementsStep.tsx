'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import type { TbSubjectRequirement, Grade, Subject, Teacher } from '@/types';

function teacherName(t: Teacher): string {
  return `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || 'Unknown';
}

interface SubjectRequirementsStepProps {
  requirements: TbSubjectRequirement[];
  grades: Grade[];
  subjects: Subject[];
  teachers: Teacher[];
  selectedGradeId: string;
  onGradeChange: (gradeId: string) => void;
  onSave: (data: Partial<TbSubjectRequirement> & { id?: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}

interface DraftRow {
  subjectId: string;
  periodsPerWeek: number;
  requiresDoublePeriod: boolean;
  preferredTeacherId: string;
}

const EMPTY_DRAFT: DraftRow = {
  subjectId: '',
  periodsPerWeek: 5,
  requiresDoublePeriod: false,
  preferredTeacherId: '',
};

export function SubjectRequirementsStep({
  requirements,
  grades,
  subjects,
  teachers,
  selectedGradeId,
  onGradeChange,
  onSave,
  onDelete,
}: SubjectRequirementsStepProps) {
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);

  const gradeRequirements = requirements.filter((r) => r.gradeId === selectedGradeId);
  const usedSubjectIds = new Set(gradeRequirements.map((r) => r.subjectId));
  const availableSubjects = subjects.filter((s) => !usedSubjectIds.has(s.id));

  async function handleAdd() {
    if (!draft.subjectId || !selectedGradeId) return;
    setAdding(true);
    try {
      await onSave({
        subjectId: draft.subjectId,
        gradeId: selectedGradeId,
        periodsPerWeek: draft.periodsPerWeek,
        requiresDoublePeriod: draft.requiresDoublePeriod,
        preferredTeacherId: draft.preferredTeacherId || undefined,
      });
      setDraft(EMPTY_DRAFT);
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdateField(
    req: TbSubjectRequirement,
    field: keyof TbSubjectRequirement,
    value: unknown,
  ) {
    await onSave({ ...req, [field]: value });
  }

  return (
    <div className="space-y-4">
      {/* Grade selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Grade:</span>
        <Select value={selectedGradeId} onValueChange={(v: unknown) => onGradeChange(v as string)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedGradeId ? (
        <EmptyState
          icon={BookOpen}
          title="Select a grade"
          description="Choose a grade to configure subject requirements."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Subject Requirements ({gradeRequirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Subject</th>
                  <th className="p-2 text-left font-medium">Periods/Week</th>
                  <th className="p-2 text-left font-medium">Double?</th>
                  <th className="p-2 text-left font-medium">Preferred Teacher</th>
                  <th className="p-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {gradeRequirements.map((req) => (
                  <tr key={req.id} className="border-b last:border-0">
                    <td className="p-2 font-medium truncate max-w-40">
                      {req.subjectName ?? subjects.find((s) => s.id === req.subjectId)?.name ?? 'Unknown'}
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        value={req.periodsPerWeek}
                        onChange={(e) => handleUpdateField(req, 'periodsPerWeek', Number(e.target.value))}
                        className="w-full sm:w-20"
                      />
                    </td>
                    <td className="p-2">
                      <Checkbox
                        checked={req.requiresDoublePeriod}
                        onCheckedChange={(v: unknown) =>
                          handleUpdateField(req, 'requiresDoublePeriod', Boolean(v))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={req.preferredTeacherId ?? 'none'}
                        onValueChange={(v: unknown) =>
                          handleUpdateField(
                            req,
                            'preferredTeacherId',
                            (v as string) === 'none' ? '' : v,
                          )
                        }
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Any teacher</SelectItem>
                          {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {teacherName(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="icon" onClick={() => onDelete(req.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Add row */}
                <tr className="bg-muted/30">
                  <td className="p-2">
                    <Select
                      value={draft.subjectId || 'placeholder'}
                      onValueChange={(v: unknown) =>
                        setDraft((d) => ({
                          ...d,
                          subjectId: (v as string) === 'placeholder' ? '' : (v as string),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Add subject..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="placeholder" disabled>Add subject...</SelectItem>
                        {availableSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={draft.periodsPerWeek}
                      onChange={(e) => setDraft((d) => ({ ...d, periodsPerWeek: Number(e.target.value) }))}
                      className="w-full sm:w-20"
                    />
                  </td>
                  <td className="p-2">
                    <Checkbox
                      checked={draft.requiresDoublePeriod}
                      onCheckedChange={(v: unknown) =>
                        setDraft((d) => ({ ...d, requiresDoublePeriod: Boolean(v) }))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={draft.preferredTeacherId || 'none'}
                      onValueChange={(v: unknown) =>
                        setDraft((d) => ({
                          ...d,
                          preferredTeacherId: (v as string) === 'none' ? '' : (v as string),
                        }))
                      }
                    >
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any teacher</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {teacherName(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAdd}
                      disabled={!draft.subjectId || adding}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
