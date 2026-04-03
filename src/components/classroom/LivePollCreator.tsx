'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface LivePollCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (question: string, options: string[]) => Promise<void>;
}

export function LivePollCreator({ open, onOpenChange, onSubmit }: LivePollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setQuestion('');
      setOptions(['', '']);
      setError('');
    }
  }, [open]);

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? value : opt)));
  }

  async function handleSubmit() {
    setError('');
    if (!question.trim()) { setError('Question is required.'); return; }
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) { setError('At least 2 options are required.'); return; }

    setSubmitting(true);
    try {
      await onSubmit(question.trim(), filled);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create poll.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Live Poll</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="poll-question">Question <span className="text-destructive">*</span></Label>
            <Input
              id="poll-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
            />
          </div>

          <div className="space-y-2">
            <Label>Options <span className="text-destructive">*</span></Label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}.</span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeOption(idx)}
                    aria-label={`Remove option ${idx + 1}`}
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={addOption}
              className="w-full mt-1"
            >
              <PlusIcon className="size-4 mr-1.5" />
              Add Option
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Launching…' : 'Launch Poll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
