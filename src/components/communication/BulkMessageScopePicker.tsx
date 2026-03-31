'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { useGradesAndClasses } from '@/hooks/useCommunication';
import type { RecipientScopeType } from './types';

interface ScopeValue {
  type: RecipientScopeType;
  targetIds: string[];
}

interface BulkMessageScopePickerProps {
  value: ScopeValue;
  onChange: (value: ScopeValue) => void;
}

const scopeOptions: { value: RecipientScopeType; label: string }[] = [
  { value: 'school', label: 'Entire School' },
  { value: 'grade', label: 'Specific Grade' },
  { value: 'class', label: 'Specific Class' },
  { value: 'custom', label: 'Custom User IDs' },
];

export function BulkMessageScopePicker({ value, onChange }: BulkMessageScopePickerProps) {
  const { grades, classes } = useGradesAndClasses();
  const [selectedTargets, setSelectedTargets] = useState<string[]>(value.targetIds);

  useEffect(() => {
    setSelectedTargets(value.targetIds);
  }, [value.targetIds]);

  const handleScopeChange = (scopeType: RecipientScopeType) => {
    setSelectedTargets([]);
    onChange({ type: scopeType, targetIds: [] });
  };

  const toggleTarget = (id: string) => {
    const next = selectedTargets.includes(id)
      ? selectedTargets.filter((t) => t !== id)
      : [...selectedTargets, id];
    setSelectedTargets(next);
    onChange({ type: value.type, targetIds: next });
  };

  const targetOptions = value.type === 'grade' ? grades : value.type === 'class' ? classes : [];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Recipient Scope</Label>
        <Select
          value={value.type}
          onValueChange={(val: unknown) => handleScopeChange(val as RecipientScopeType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select scope" />
          </SelectTrigger>
          <SelectContent>
            {scopeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(value.type === 'grade' || value.type === 'class') && (
        <div className="space-y-2">
          <Label>
            Select {value.type === 'grade' ? 'Grade(s)' : 'Class(es)'}
          </Label>
          <Select onValueChange={(val: unknown) => toggleTarget(val as string)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Add ${value.type}...`} />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTargets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedTargets.map((id) => {
                const target = targetOptions.find((t) => t.id === id);
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleTarget(id)}
                  >
                    {target?.name ?? id} x
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {value.type === 'school' && (
        <p className="text-sm text-muted-foreground">
          Message will be sent to all active parents in the school.
        </p>
      )}
    </div>
  );
}
