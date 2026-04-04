'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { ContentResourceItem } from '@/types';

interface RefinementHistoryEntry {
  instruction: string;
  timestamp: Date;
}

interface RefinementPanelProps {
  resourceId: string;
  onRefine: (id: string, instruction: string) => Promise<ContentResourceItem | null>;
  onResourceUpdated: (resource: ContentResourceItem) => void;
}

const QUICK_SUGGESTIONS = [
  'Make easier',
  'Add more examples',
  'Add diagram',
  'Add practice questions',
  'Simplify language',
  'Add hints',
] as const;

export function RefinementPanel({
  resourceId,
  onRefine,
  onResourceUpdated,
}: RefinementPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [history, setHistory] = useState<RefinementHistoryEntry[]>([]);

  const handleRefine = useCallback(
    async (text: string) => {
      if (!text.trim() || refining) return;

      setRefining(true);
      try {
        const updated = await onRefine(resourceId, text.trim());
        if (updated) {
          setHistory((prev: RefinementHistoryEntry[]) => [
            ...prev,
            { instruction: text.trim(), timestamp: new Date() },
          ]);
          setInstruction('');
          onResourceUpdated(updated);
          toast.success('Content updated based on your feedback');
        }
      } finally {
        setRefining(false);
      }
    },
    [resourceId, onRefine, onResourceUpdated, refining],
  );

  const handleSubmit = useCallback(() => {
    handleRefine(instruction);
  }, [handleRefine, instruction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleRefine(instruction);
      }
    },
    [handleRefine, instruction],
  );

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((prev: boolean) => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">Refine with AI</span>
          {history.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {history.length} refinement{history.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((suggestion: string) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                disabled={refining}
                onClick={() => handleRefine(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>

          {/* Custom instruction input */}
          <div className="flex gap-2">
            <Input
              placeholder="Describe how to refine this content..."
              value={instruction}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setInstruction(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={refining}
              className="flex-1"
              maxLength={1000}
            />
            <Button
              onClick={handleSubmit}
              disabled={refining || !instruction.trim()}
              size="default"
            >
              {refining ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              {refining ? 'Refining...' : 'Refine'}
            </Button>
          </div>

          {/* History log */}
          {history.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                Refinement history
              </p>
              {history.map((entry: RefinementHistoryEntry, idx: number) => (
                <div
                  key={`${entry.timestamp.getTime()}-${idx}`}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">
                    Refinement {idx + 1}: {entry.instruction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
