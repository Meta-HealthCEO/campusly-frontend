'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { ParentOption } from './types';

interface ParentRecipientPickerProps {
  parents: ParentOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}

export function ParentRecipientPicker({
  parents, selectedIds, onChange, loading,
}: ParentRecipientPickerProps) {
  const addRecipient = (userId: string) => {
    if (!selectedIds.includes(userId)) {
      onChange([...selectedIds, userId]);
    }
  };

  const removeRecipient = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  return (
    <div className="space-y-2">
      <Label>Recipients</Label>
      <Select
        onValueChange={(val: unknown) => addRecipient(val as string)}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Loading parents...' : 'Add parent...'} />
        </SelectTrigger>
        <SelectContent>
          {parents.map((parent) => (
            <SelectItem key={parent.id} value={parent.userId || parent.id}>
              {parent.firstName} {parent.lastName}
              {parent.relationship ? ` (${parent.relationship})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const parent = parents.find(
              (p) => p.userId === id || p.id === id
            );
            if (!parent) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeRecipient(id)}
              >
                {parent.firstName} {parent.lastName} x
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
