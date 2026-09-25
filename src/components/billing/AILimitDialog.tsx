'use client';

import { useRouter } from 'next/navigation';
import { MailCheck, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAILimitStore } from '@/stores/useAILimitStore';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { aiLimitCopy } from '@/lib/ai-allowance';

/** Mounted only while open, so "We sent a new link" doesn't linger into the next time. */
function UnverifiedPrompt({ close }: { close: () => void }) {
  const { resend, resending, resent, error } = useEmailVerification();
  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open) close(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MailCheck className="size-5 text-primary" aria-hidden /> Verify your email to use AI
          </DialogTitle>
          <DialogDescription>
            Open the link we emailed you, then try again. Everything else works while you wait.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto text-sm" aria-live="polite">
          {resent ? <p className="text-muted-foreground">We sent a new link. Check your inbox.</p> : null}
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} className="min-h-11 sm:min-h-9">Not now</Button>
          <Button onClick={() => void resend()} disabled={resending || resent} className="min-h-11 sm:min-h-9">
            {resending ? 'Sending…' : 'Resend link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The one prompt every AI action opens when it is refused: out of AI actions, or email not verified. */
export function AILimitDialog() {
  const router = useRouter();
  const event = useAILimitStore((s) => s.event);
  const close = useAILimitStore((s) => s.close);

  if (!event) return null;
  if (event.kind === 'unverified') return <UnverifiedPrompt close={close} />;
  // The learner's own prompt (no upgrade) arrives with the learner AI limit (plan Task C9, after L-B).
  if (event.kind === 'learner-limit') return null;

  const copy = aiLimitCopy(event.usage, new Date());
  return (
    <Dialog open onOpenChange={(open: boolean) => { if (!open) close(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden /> {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={close} className="min-h-11 sm:min-h-9">Not now</Button>
          {event.usage.plan === 'free' ? (
            <Button
              onClick={() => {
                close();
                router.push('/my/billing');
              }}
              className="min-h-11 sm:min-h-9"
            >
              Upgrade to Pro
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
