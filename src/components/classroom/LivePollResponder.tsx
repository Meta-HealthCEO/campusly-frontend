'use client';

import { useState } from 'react';
import { CheckCircleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LivePoll } from '@/types';

interface LivePollResponderProps {
  poll: LivePoll;
  onRespond: (answer: number) => Promise<void>;
  responded: boolean;
}

export function LivePollResponder({ poll, onRespond, responded }: LivePollResponderProps) {
  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const idx = parseInt(selected, 10);
    if (isNaN(idx)) return;
    setSubmitting(true);
    try {
      await onRespond(idx);
    } catch (err: unknown) {
      console.error('Failed to submit poll response:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{poll.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {responded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <CheckCircleIcon className="size-4 text-green-600" />
            Your response has been recorded.
          </div>
        ) : (
          <>
            <RadioGroup
              value={selected}
              onValueChange={(val: string) => setSelected(val)}
              className="space-y-2"
            >
              {poll.options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={String(idx)} id={`poll-opt-${poll._id}-${idx}`} />
                  <Label
                    htmlFor={`poll-opt-${poll._id}-${idx}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Submitting…' : 'Submit Answer'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
