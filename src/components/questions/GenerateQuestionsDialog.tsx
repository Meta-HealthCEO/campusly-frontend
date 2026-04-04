'use client';

import { useState, useMemo, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodePicker } from '@/components/curriculum';
import { cn } from '@/lib/utils';
import { DIFFICULTY_LEVELS_SIMPLE } from '@/lib/design-system';
import { CAPS_LEVELS } from './question-constants';
import { toast } from 'sonner';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { QuestionType, CapsLevel, GenerateQuestionsPayload, QuestionItem } from '@/types/question-bank';
import type { CurriculumNodeItem } from '@/types/curriculum-structure';

// ─── Constants ──────────────────────────────────────────────────────────────

interface SelectOption { id: string; name: string }

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'structured', label: 'Structured' },
  { value: 'fill_blank', label: 'Fill in Blank' },
];

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SUBJECT_MAP: Record<string, string[]> = {
  MATHEMATICS: ['Mathematics', 'Maths'],
  MATHLIT: ['Mathematical Literacy', 'Maths Lit'],
  LIFESCI: ['Life Sciences', 'Life Science'],
  PHYSSCI: ['Physical Sciences', 'Physical Science'],
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface GenerateQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: SelectOption[];
  grades: SelectOption[];
  frameworkId: string;
  onSearch: (fwId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
  onGenerate: (payload: GenerateQuestionsPayload) => Promise<QuestionItem[]>;
  onComplete: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectSubjectId(code: string | undefined, subjects: SelectOption[]): string {
  if (!code) return '';
  const part = code.split('-')[1];
  if (!part) return '';
  const keywords = SUBJECT_MAP[part] ?? [part];
  return subjects.find((s) => keywords.some((kw) => s.name.toLowerCase().includes(kw.toLowerCase())))?.id ?? '';
}

function detectGradeId(code: string | undefined, grades: SelectOption[]): string {
  if (!code) return '';
  const match = code.match(/GR(\d+)/);
  return match ? (grades.find((g) => g.name.includes(match[1]))?.id ?? '') : '';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function GenerateQuestionsDialog({
  open, onOpenChange, subjects, grades, frameworkId,
  onSearch, onLoadNode, onGenerate, onComplete,
}: GenerateQuestionsDialogProps) {
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [nodeCode, setNodeCode] = useState<string | null>(null);
  const [count, setCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<Set<QuestionType>>(new Set(['mcq']));
  const [capsLevel, setCapsLevel] = useState<CapsLevel | 'mixed'>('mixed');
  const [difficulty, setDifficulty] = useState(3);
  const [generating, setGenerating] = useState(false);

  const autoSubjectId = useMemo(() => detectSubjectId(nodeCode ?? undefined, subjects), [nodeCode, subjects]);
  const autoGradeId = useMemo(() => detectGradeId(nodeCode ?? undefined, grades), [nodeCode, grades]);
  const autoSubjectName = useMemo(() => subjects.find((s) => s.id === autoSubjectId)?.name ?? '', [autoSubjectId, subjects]);
  const autoGradeName = useMemo(() => grades.find((g) => g.id === autoGradeId)?.name ?? '', [autoGradeId, grades]);

  const canGenerate = nodeId && autoSubjectId && autoGradeId && selectedTypes.size > 0;

  const handleNodeChange = useCallback((_nodeId: string | null, node: CurriculumNodeItem | null) => {
    setNodeId(_nodeId);
    setNodeCode(node?.code ?? null);
  }, []);

  const toggleType = useCallback((type: QuestionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate || !nodeId) return;
    setGenerating(true);
    try {
      const types = Array.from(selectedTypes);
      const perType = Math.max(1, Math.floor(count / types.length));
      let totalGenerated = 0;

      for (const type of types) {
        const thisBatch = type === types[types.length - 1] ? count - totalGenerated : perType;
        const effectiveCaps: CapsLevel = capsLevel === 'mixed' ? 'knowledge' : capsLevel;
        await onGenerate({
          curriculumNodeId: nodeId,
          subjectId: autoSubjectId,
          gradeId: autoGradeId,
          type,
          count: thisBatch,
          difficulty,
          cognitiveLevel: { caps: effectiveCaps, blooms: 'remember' },
        });
        totalGenerated += thisBatch;
      }

      toast.success(`Generated ${count} question${count !== 1 ? 's' : ''} successfully`);
      onComplete();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'AI generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5" />
            Generate Questions with AI
          </DialogTitle>
          <DialogDescription>
            Select a curriculum topic and configure generation options.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-4">
          {/* Curriculum Node */}
          <div className="space-y-2">
            <Label className="font-semibold">
              Curriculum Topic <span className="text-destructive">*</span>
            </Label>
            <NodePicker
              frameworkId={frameworkId}
              value={nodeId}
              onChange={handleNodeChange}
              onSearch={onSearch}
              onLoadNode={onLoadNode}
              placeholder="Search for a topic..."
              disabled={!frameworkId}
            />
            {autoSubjectName && autoGradeName && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Auto-detected:</span>
                <Badge variant="secondary" className="text-xs">{autoSubjectName}</Badge>
                <Badge variant="secondary" className="text-xs">{autoGradeName}</Badge>
              </div>
            )}
          </div>

          {/* Count */}
          <div className="space-y-2">
            <Label className="font-semibold">Number of Questions</Label>
            <Select value={String(count)} onValueChange={(v: unknown) => setCount(Number(v))}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question Types */}
          <div className="space-y-2">
            <Label className="font-semibold">Question Types</Label>
            <div className="flex flex-wrap gap-3">
              {QUESTION_TYPE_OPTIONS.map((qt) => (
                <label key={qt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedTypes.has(qt.value)}
                    onCheckedChange={() => toggleType(qt.value)}
                  />
                  <span className="text-sm">{qt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CAPS Level */}
          <div className="space-y-2">
            <Label className="font-semibold">CAPS Cognitive Level</Label>
            <Select value={capsLevel} onValueChange={(v: unknown) => setCapsLevel(v as CapsLevel | 'mixed')}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mixed">Mixed (recommended)</SelectItem>
                {CAPS_LEVELS.map((cl) => (
                  <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className="font-semibold">Difficulty</Label>
            <div className="flex gap-2">
              {DIFFICULTY_LEVELS_SIMPLE.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={cn(
                    'flex-1 rounded-lg border-2 py-2 text-xs font-medium transition-all',
                    difficulty === d.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent bg-muted/40 hover:bg-muted/60',
                  )}
                >
                  <span className={cn('inline-block size-2 rounded-full mr-1.5', d.dot)} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-4" />
                Generate {count} Question{count !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
