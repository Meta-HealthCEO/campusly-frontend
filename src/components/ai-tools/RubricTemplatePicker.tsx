'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRubricTemplates } from '@/hooks/useRubricTemplates';
import type { RubricTemplate } from '@/hooks/useRubricTemplates';
import type { RubricCriterion } from './types';

interface RubricTemplatePickerProps {
  currentCriteria: RubricCriterion[];
  onLoad: (criteria: RubricCriterion[]) => void;
}

export function RubricTemplatePicker({ currentCriteria, onLoad }: RubricTemplatePickerProps) {
  const { listRubricTemplates, createRubricTemplate, deleteRubricTemplate } = useRubricTemplates();
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listRubricTemplates().then(setTemplates);
  }, [listRubricTemplates]);

  const handleSelect = (templateId: string) => {
    if (templateId === '__none__') return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) onLoad(tpl.criteria);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const tpl = await createRubricTemplate({
      name: name.trim(),
      description: desc.trim() || undefined,
      criteria: currentCriteria,
      isShared,
    });
    setSaving(false);
    if (tpl) {
      setTemplates((prev) => [...prev, tpl].sort((a, b) => a.name.localeCompare(b.name)));
      setSaveOpen(false);
      setName('');
      setDesc('');
      setIsShared(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteRubricTemplate(id);
    if (ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select onValueChange={(v: unknown) => handleSelect(v as string)}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Load template..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— select a template —</SelectItem>
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center justify-between px-1">
              <SelectItem value={tpl.id} className="flex-1">
                {tpl.name}
                {tpl.isShared && (
                  <span className="ml-1 text-xs text-muted-foreground">(shared)</span>
                )}
              </SelectItem>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-destructive hover:text-destructive"
                onClick={(e) => handleDelete(tpl.id, e)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete template</span>
              </Button>
            </div>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)} className="shrink-0">
        Save as template
      </Button>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Save rubric as template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Essay Grade 10 Standard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description (optional)</Label>
              <Textarea
                id="tpl-desc"
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief description of when to use this rubric"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
              />
              Share with other teachers in the school
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
