'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Subject } from '@/types';

interface SubjectSelectorProps {
  subjects: Subject[];
  selected: string;
  onSelect: (subjectId: string, subjectName: string) => void;
}

export function SubjectSelector({ subjects, selected, onSelect }: SubjectSelectorProps) {
  const handleChange = (val: unknown) => {
    const id = val as string;
    const subject = subjects.find((s) => s.id === id);
    if (subject) {
      onSelect(subject.id, subject.name);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="subject-select">Subject</Label>
      <Select value={selected} onValueChange={handleChange}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Select a subject" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
