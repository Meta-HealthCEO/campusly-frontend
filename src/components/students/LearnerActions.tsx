'use client';

import { HeartHandshake, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onMessageParent: () => void;
  onRefer: () => void;
}

/** What a teacher can do about a learner, from their profile. */
export function LearnerActions({ onMessageParent, onRefer }: Props) {
  return (
    <>
      <Button variant="outline" onClick={onMessageParent} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
        <MessageSquare className="h-4 w-4" aria-hidden /> Message a parent
      </Button>
      <Button variant="outline" onClick={onRefer} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
        <HeartHandshake className="h-4 w-4" aria-hidden /> Refer to counsellor
      </Button>
    </>
  );
}
