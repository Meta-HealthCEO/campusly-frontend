'use client';

import { Button } from '@/components/ui/button';

const AVAILABLE_VARIABLES = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'parentName', label: 'Parent Name' },
  { key: 'schoolName', label: 'School Name' },
  { key: 'date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'className', label: 'Class Name' },
  { key: 'teacherName', label: 'Teacher Name' },
  { key: 'eventName', label: 'Event Name' },
  { key: 'time', label: 'Time' },
  { key: 'dueDate', label: 'Due Date' },
];

interface VariableChipsProps {
  onInsert: (variable: string) => void;
  selectedVariables?: string[];
}

export function VariableChips({ onInsert, selectedVariables }: VariableChipsProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Click to insert variable at cursor position:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {AVAILABLE_VARIABLES.map((v) => {
          const isUsed = selectedVariables?.includes(v.key);
          return (
            <Button
              key={v.key}
              type="button"
              variant="outline"
              size="sm"
              className={isUsed ? 'border-primary text-primary' : ''}
              onClick={() => onInsert(`{{${v.key}}}`)}
            >
              {`{{${v.key}}}`}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export { AVAILABLE_VARIABLES };
