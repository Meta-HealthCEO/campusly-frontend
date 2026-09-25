'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { messageSubjectFor, noParentMessage, parentLabel } from '@/lib/learner-profile';
import type { FullStudent360Parent } from '@/types/student-360';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firstName: string;
  parents: FullStudent360Parent[];
  sending: boolean;
  /** Why the last send failed; what was typed stays. */
  error: string | null;
  onSend: (message: { recipientId: string; subject: string; message: string }) => void;
}

/** Message one of the learner's parents through Campusly. */
export function MessageParentDialog({ open, onOpenChange, firstName, parents, sending, error, onSend }: Props) {
  const [recipientId, setRecipientId] = useState(parents[0]?.userId ?? '');
  const [subject, setSubject] = useState(messageSubjectFor(firstName));
  const [message, setMessage] = useState('');
  const canSend = parents.length > 0 && !!recipientId && message.trim().length > 0 && !sending;

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!sending) onOpenChange(next); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Message a parent</DialogTitle>
          <DialogDescription>They get it in Campusly, and you&apos;ll find the reply in Messages.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {parents.length === 0 ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{noParentMessage(firstName)}</p>
          ) : (
            <>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">To</legend>
                {parents.map((p) => (
                  <label key={p.userId} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm has-[:checked]:border-accent-foreground/40 has-[:checked]:bg-accent">
                    <input type="radio" name="parent" value={p.userId} checked={recipientId === p.userId} onChange={() => setRecipientId(p.userId)} className="h-4 w-4 accent-[var(--accent-foreground)]" />
                    {parentLabel(p)}
                  </label>
                ))}
              </fieldset>
              <div className="space-y-1.5">
                <Label htmlFor="parent-subject">Subject</Label>
                <Input id="parent-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parent-message">Message</Label>
                <Textarea id="parent-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} />
              </div>
            </>
          )}
          {error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={() => onSend({ recipientId, subject: subject.trim(), message: message.trim() })} disabled={!canSend} className="min-h-11 gap-1.5 sm:min-h-9">
            <Send className="h-4 w-4" aria-hidden /> {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
