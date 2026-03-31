'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';

interface CreateConsentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  userId: string;
  onSuccess: () => void;
}

const CONSENT_TYPES = [
  { value: 'trip', label: 'Trip' },
  { value: 'medical', label: 'Medical' },
  { value: 'general', label: 'General' },
  { value: 'photo', label: 'Photo' },
  { value: 'data', label: 'Data' },
] as const;

export function CreateConsentFormDialog({
  open, onOpenChange, schoolId, userId, onSuccess,
}: CreateConsentFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [requiresBothParents, setRequiresBothParents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setType('');
      setExpiryDate('');
      setAttachmentUrl('');
      setRequiresBothParents(false);
      setErrors({});
    }
  }, [open]);

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
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        schoolId,
        title: title.trim(),
        type,
        createdBy: userId,
      };
      if (description.trim()) payload.description = description.trim();
      if (expiryDate) payload.expiryDate = new Date(expiryDate).toISOString();
      if (attachmentUrl.trim()) payload.attachmentUrl = attachmentUrl.trim();
      if (requiresBothParents) payload.requiresBothParents = true;

      await apiClient.post('/consent/forms', payload);
      toast.success('Consent form created successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to create consent form';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Consent Form
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Consent Form</DialogTitle>
          <DialogDescription>
            Create a new consent form for parents to sign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-title">Title</Label>
            <Input
              id="cf-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 8 Science Museum Trip"
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
            <Label htmlFor="cf-desc">Description</Label>
            <Textarea
              id="cf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what the consent is for..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-expiry">Expiry Date</Label>
            <Input
              id="cf-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cf-attachment">Attachment URL</Label>
            <Input
              id="cf-attachment"
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
              {submitting ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
