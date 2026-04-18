'use client';

import { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LivePollCreatorProps {
  onCreatePoll: (question: string, options: string[]) => void;
}

export function LivePollCreator({ onCreatePoll }: LivePollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    setOptions((prev) => prev.map((opt, i) => (i === idx ? value : opt)));
  }

  function handleSubmit() {
    setError('');
    if (!question.trim()) { setError('Question is required.'); return; }
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) { setError('At least 2 options are required.'); return; }
    onCreatePoll(question.trim(), filled);
    setQuestion('');
    setOptions(['', '']);
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <p className="text-sm font-medium">Create Live Poll</p>

      <div className="space-y-1">
        <Label htmlFor="poll-question">Question <span className="text-destructive">*</span></Label>
        <Input
          id="poll-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
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
        <Button type="button" variant="outline" size="default" onClick={addOption} className="w-full">
          <PlusIcon className="size-4 mr-1.5" />
          Add Option
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={handleSubmit} className="w-full sm:w-auto">Launch Poll</Button>
    </div>
  );
}
