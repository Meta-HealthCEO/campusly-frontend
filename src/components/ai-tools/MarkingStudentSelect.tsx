'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ArrowLeft, Users, PenTool } from 'lucide-react';
import { getStudentDisplayName } from '@/lib/student-helpers';
import type { Student } from '@/types';

interface MarkingStudentSelectProps {
  students: Student[];
  onSelect: (data: { studentId?: string; studentName: string }) => void;
  onBack: () => void;
}

type Mode = 'select' | 'type';

export function MarkingStudentSelect({ students, onSelect, onBack }: MarkingStudentSelectProps) {
  const [mode, setMode] = useState<Mode>(students.length > 0 ? 'select' : 'type');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualName, setManualName] = useState('');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleContinue = () => {
    if (mode === 'select' && selectedStudent) {
      const { full } = getStudentDisplayName(selectedStudent);
      onSelect({ studentId: selectedStudent.id, studentName: full });
    } else if (mode === 'type' && manualName.trim()) {
      onSelect({ studentName: manualName.trim() });
    }
  };

  const canContinue =
    (mode === 'select' && !!selectedStudentId) ||
    (mode === 'type' && manualName.trim().length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Select Student</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('select')}
            disabled={students.length === 0}
          >
            <Users className="mr-2 h-4 w-4" />
            Select from class
          </Button>
          <Button
            variant={mode === 'type' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('type')}
          >
            <PenTool className="mr-2 h-4 w-4" />
            Type name
          </Button>
        </div>

        {mode === 'select' && (
          <div className="space-y-2">
            <Label>Student <span className="text-destructive">*</span></Label>
            <Select
              value={selectedStudentId || 'placeholder'}
              onValueChange={(v: unknown) => {
                const val = v as string;
                if (val !== 'placeholder') setSelectedStudentId(val);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => {
                  const { full } = getStudentDisplayName(s);
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      {full}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'type' && (
          <div className="space-y-2">
            <Label>Student Name <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. John Smith"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full sm:w-80"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
