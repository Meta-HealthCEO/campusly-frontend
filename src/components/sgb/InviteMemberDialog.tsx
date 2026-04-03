'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InviteSgbMemberPayload, SgbPosition } from '@/types';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InviteSgbMemberPayload) => Promise<void>;
}

interface FormValues {
  email: string;
  firstName: string;
  lastName: string;
  position: SgbPosition;
  term: string;
}

export function InviteMemberDialog({ open, onOpenChange, onSubmit }: InviteMemberDialogProps) {
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await onSubmit({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        position: values.position,
        term: values.term || undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite SGB Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" {...register('email', { required: 'Email is required' })} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input id="firstName" {...register('firstName', { required: 'First name is required' })} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input id="lastName" {...register('lastName', { required: 'Last name is required' })} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div>
              <Label>Position <span className="text-destructive">*</span></Label>
              <Select onValueChange={(val: unknown) => setValue('position', val as SgbPosition)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chairperson">Chairperson</SelectItem>
                  <SelectItem value="deputy_chairperson">Deputy Chairperson</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="co_opted">Co-opted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="term">Term of Office</Label>
              <Input id="term" placeholder="e.g. 2026-2029" {...register('term')} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
