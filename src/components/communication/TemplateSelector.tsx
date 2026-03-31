'use client';

import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { MessageTemplate } from './types';

interface TemplateSelectorProps {
  templates: MessageTemplate[];
  onSelect: (template: MessageTemplate | null) => void;
}

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  const handleChange = (val: unknown) => {
    const id = val as string;
    if (id === '__none__') {
      onSelect(null);
      return;
    }
    const tpl = templates.find((t) => t.id === id) ?? null;
    onSelect(tpl);
  };

  return (
    <div className="space-y-2">
      <Label>Use Template (optional)</Label>
      <Select onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a template..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No template</SelectItem>
          {templates.map((tpl) => (
            <SelectItem key={tpl.id} value={tpl.id}>
              {tpl.name} ({tpl.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
