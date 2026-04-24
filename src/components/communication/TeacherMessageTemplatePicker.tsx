'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookMarked, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import type { MessageTemplate, ChannelType } from './types';

const saveSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
});

type SaveFormValues = z.infer<typeof saveSchema>;

interface TeacherMessageTemplatePickerProps {
  templates: MessageTemplate[];
  currentSubject: string;
  currentBody: string;
  currentChannel: ChannelType;
  onTemplateSelect: (tpl: MessageTemplate) => void;
  onSaveTemplate: (data: {
    name: string;
    subject: string;
    body: string;
    channel: ChannelType;
  }) => Promise<void>;
}

export function TeacherMessageTemplatePicker({
  templates,
  currentSubject,
  currentBody,
  currentChannel,
  onTemplateSelect,
  onSaveTemplate,
}: TeacherMessageTemplatePickerProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SaveFormValues>({
    resolver: zodResolver(saveSchema),
  });

  const handleSelectChange = (val: unknown) => {
    const id = val as string;
    if (id === '__none__') return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) onTemplateSelect(tpl);
  };

  const handleSave = async (data: SaveFormValues) => {
    setSaving(true);
    try {
      await onSaveTemplate({
        name: data.name,
        subject: currentSubject,
        body: currentBody,
        channel: currentChannel,
      });
      setSaveOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const canSave = currentSubject.trim().length >= 3 && currentBody.trim().length >= 10;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label>Load template (optional)</Label>
        <Select onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a template…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No template —</SelectItem>
            {templates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                <span className="flex items-center gap-2">
                  <BookMarked className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {tpl.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canSave}
        onClick={() => setSaveOpen(true)}
        title={canSave ? 'Save current message as a template' : 'Fill in subject and body first'}
      >
        <Save className="mr-2 h-4 w-4" />
        Save as template
      </Button>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2">
            <form id="save-tpl-form" onSubmit={handleSubmit(handleSave)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tpl-save-name">
                  Template name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tpl-save-name"
                  placeholder="e.g. Weekly homework reminder"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="rounded-md border p-3 text-sm space-y-1">
                <p className="font-medium text-muted-foreground">Preview</p>
                <p><span className="font-medium">Subject:</span> {currentSubject || '—'}</p>
                <p className="line-clamp-3 text-muted-foreground">{currentBody || '—'}</p>
              </div>
            </form>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="save-tpl-form" disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
