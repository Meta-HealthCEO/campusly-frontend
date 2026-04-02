'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useConsentMutations } from '@/hooks/useConsent';
import type { ApiConsentForm } from './types';

interface EditConsentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ApiConsentForm | null;
  onSuccess: () => void;
}

const CONSENT_TYPES = [
  { value: 'trip', label: 'Trip' },
  { value: 'medical', label: 'Medical' },
  { value: 'general', label: 'General' },
  { value: 'photo', label: 'Photo' },
  { value: 'data', label: 'Data' },
] as const;

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toISOString().split('T')[0] ?? '';
}

export function EditConsentFormDialog({
  open, onOpenChange, form, onSuccess,
}: EditConsentFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [requiresBothParents, setRequiresBothParents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { updateForm } = useConsentMutations();

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setDescription(form.description ?? '');
      setType(form.type);
      setExpiryDate(toDateInputValue(form.expiryDate));
      setAttachmentUrl(form.attachmentUrl ?? '');
      setRequiresBothParents(form.requiresBothParents);
      setErrors({});
    }
  }, [form]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!type) errs.type = 'Type is required';
    if (attachmentUrl && !/^https?:\/\/.+/.test(attachmentUrl)) {
      errs.attachmentUrl = 'Must be a valid URL';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !validate()) return;
    setSubmitting(true);
    try {
      await updateForm(form.id, {
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        requiresBothParents,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        attachmentUrl: attachmentUrl.trim() || undefined,
      });
      toast.success('Consent form updated successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to update consent form';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Consent Form</DialogTitle>
          <DialogDescription>
            Update the details of this consent form.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ecf-title">Title</Label>
            <Input
              id="ecf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(val: unknown) => setType(val as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CONSENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-xs text-destructive">{errors.type}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ecf-desc">Description</Label>
            <Textarea
              id="ecf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ecf-expiry">Expiry Date</Label>
            <Input
              id="ecf-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ecf-attachment">Attachment URL</Label>
            <Input
              id="ecf-attachment"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://..."
            />
            {errors.attachmentUrl && (
              <p className="text-xs text-destructive">{errors.attachmentUrl}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={requiresBothParents}
              onCheckedChange={(val: boolean) => setRequiresBothParents(val)}
            />
            <Label>Require both parents to respond</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
