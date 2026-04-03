'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { CommunicationChannel, ChannelConfig } from '@/types';

const schema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().optional(),
  apiUsername: z.string().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  replyToEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  senderId: z.string().max(11, 'Max 11 chars').optional(),
  phoneNumber: z.string().optional(),
  dailyLimit: z.number().min(0, 'Must be >= 0').optional(),
});

type FormValues = z.infer<typeof schema>;

interface ChannelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: CommunicationChannel | null;
  config: ChannelConfig | null;
  onSave: (channel: CommunicationChannel, data: Record<string, unknown>) => Promise<void>;
  saving?: boolean;
}

const channelLabels: Record<CommunicationChannel, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'Push Notifications',
};

export function ChannelConfigDialog({
  open, onOpenChange, channel, config, onSave, saving,
}: ChannelConfigDialogProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const enabled = watch('enabled');

  useEffect(() => {
    if (open && config) {
      reset({
        enabled: config.enabled,
        dailyLimit: config.dailyLimit,
        fromName: config.fromName ?? '',
        fromEmail: config.fromEmail ?? '',
        replyToEmail: config.replyToEmail ?? '',
        senderId: config.senderId ?? '',
        phoneNumber: config.phoneNumber ?? '',
        apiKey: '',
        apiUsername: '',
      });
    }
  }, [open, config, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!channel) return;
    await onSave(channel, { ...data });
    onOpenChange(false);
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {channelLabels[channel]}</DialogTitle>
          <DialogDescription>Update channel settings and credentials.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ch-enabled">Enabled</Label>
              <Switch
                id="ch-enabled"
                checked={enabled ?? false}
                onCheckedChange={(v: boolean) => setValue('enabled', v)}
              />
            </div>

            {channel === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ch-fromName">From Name</Label>
                  <Input id="ch-fromName" {...register('fromName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-fromEmail">From Email</Label>
                  <Input id="ch-fromEmail" type="email" {...register('fromEmail')} />
                  {errors.fromEmail && <p className="text-xs text-destructive">{errors.fromEmail.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-replyTo">Reply-To Email</Label>
                  <Input id="ch-replyTo" type="email" {...register('replyToEmail')} />
                </div>
              </>
            )}

            {channel === 'sms' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ch-senderId">Sender ID (max 11 chars)</Label>
                  <Input id="ch-senderId" {...register('senderId')} maxLength={11} />
                  {errors.senderId && <p className="text-xs text-destructive">{errors.senderId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ch-apiUser">API Username</Label>
                  <Input id="ch-apiUser" {...register('apiUsername')} />
                </div>
              </>
            )}

            {channel === 'whatsapp' && (
              <div className="space-y-2">
                <Label htmlFor="ch-phone">Phone Number</Label>
                <Input id="ch-phone" {...register('phoneNumber')} placeholder="+27..." />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ch-apiKey">API Key</Label>
              <Input
                id="ch-apiKey"
                type="password"
                {...register('apiKey')}
                placeholder={config?.apiKeyConfigured ? '***configured*** (leave blank to keep)' : 'Enter API key'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ch-limit">Daily Limit</Label>
              <Input id="ch-limit" type="number" {...register('dailyLimit')} />
              {errors.dailyLimit && <p className="text-xs text-destructive">{errors.dailyLimit.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
