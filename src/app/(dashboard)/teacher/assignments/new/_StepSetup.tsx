'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CurriculumTreeBrowser,
  type CurriculumTreeBrowserSelectContext,
} from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { displayNodeTitle } from '@/lib/curriculum-display';
import { ContextBadge } from '../../papers/new/_indicators';
import type { useCurriculumPreparation } from '@/hooks/useCurriculumPreparation';
import type { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { ASSIGNMENT_LENGTHS, type AssignmentLengthHint } from '@/types/assignments';
import type { CurriculumNodeItem } from '@/types';

const LENGTH_LABELS: Record<AssignmentLengthHint, string> = {
  short:   'Short — worksheet scale',
  medium:  'Medium — essay or report (500-1000 words)',
  long:    'Long — essay or case study (1500-3000 words)',
  project: 'Project — multi-week deliverable',
};

interface StepSetupProps {
  prep: ReturnType<typeof useCurriculumPreparation>;
  selectedFramework: string;
  frameworkName: string | null;
  selectedNodes: CurriculumNodeItem[];
  onTopicSelect: (node: CurriculumNodeItem, ctx?: CurriculumTreeBrowserSelectContext) => void;
  onRemoveNode: (nodeId: string) => void;
  searchNodes: ReturnType<typeof useCurriculumStructure>['searchNodes'];
  loadNode: ReturnType<typeof useCurriculumStructure>['loadNode'];
  totalMarks: number;
  setTotalMarks: (n: number) => void;
  lengthHint: AssignmentLengthHint;
  setLengthHint: (l: AssignmentLengthHint) => void;
  criterionCount: number;
  setCriterionCount: (n: number) => void;
  instructions: string;
  setInstructions: (s: string) => void;
  blocker: string | null;
}

export function StepSetup({
  prep, selectedFramework, frameworkName, selectedNodes, onTopicSelect,
  onRemoveNode, searchNodes, loadNode, totalMarks, setTotalMarks, lengthHint,
  setLengthHint, criterionCount, setCriterionCount, instructions,
  setInstructions, blocker,
}: StepSetupProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Choose a CAPS topic</h2>
          <p className="text-sm text-muted-foreground">
            The AI uses this topic to anchor the brief and rubric. Subject,
            grade, and term are derived automatically.
            {frameworkName && ` ${frameworkName} framework is active.`}
          </p>
        </div>
        <ContextBadge status={prep.contextStatus} error={prep.contextError} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Curriculum tree on the left */}
        <Card>
          <CardContent className="space-y-3">
            <Tabs defaultValue="browse">
              <TabsList>
                <TabsTrigger value="browse">Browse</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>
              <TabsContent value="browse" className="mt-3">
                <div className="max-h-[64vh] min-h-96 overflow-y-auto rounded-md border p-1">
                  <CurriculumTreeBrowser
                    frameworkId={selectedFramework}
                    selectedNodeId={prep.selectedNode?.id ?? null}
                    selectedNodeIds={selectedNodes.map((n) => n.id)}
                    onSelect={(node, ctx) => onTopicSelect(node, ctx)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="search" className="mt-3">
                <NodePicker
                  frameworkId={selectedFramework}
                  value={prep.selectedNode?.id ?? null}
                  onChange={(_id, node) => { if (node) onTopicSelect(node); }}
                  onSearch={searchNodes}
                  onLoadNode={loadNode}
                  placeholder="Search for a topic, subtopic, or assessment standard…"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Settings on the right (sticky so they stay visible) */}
        <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Assignment settings</CardTitle>
              <Badge variant="secondary">
                {selectedNodes.length} topic{selectedNodes.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNodes.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                Pick one or more topics from the tree. They must all share the
                same subject, grade, and term.
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedNodes.map((node) => (
                  <li
                    key={node.id}
                    className="flex items-start justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 text-sm leading-snug">
                      {displayNodeTitle(node)}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveNode(node.id)}
                      aria-label="Remove topic"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {prep.curriculumContext && selectedNodes.length > 0 && (
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                <p className="text-muted-foreground">Context</p>
                <p className="mt-1 font-medium">
                  {prep.curriculumContext.subjectName} · {prep.curriculumContext.gradeName} · Term {prep.term}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Total marks <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Length hint</Label>
              <Select
                value={lengthHint}
                onValueChange={(v: string | null) =>
                  setLengthHint((v ?? 'medium') as AssignmentLengthHint)
                }
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_LENGTHS.map((l) => (
                    <SelectItem key={l} value={l}>{LENGTH_LABELS[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Rubric criteria</Label>
              <Input
                type="number"
                min={2}
                max={10}
                value={criterionCount}
                onChange={(e) =>
                  setCriterionCount(Math.min(10, Math.max(2, Number(e.target.value) || 4)))
                }
              />
              <p className="text-xs text-muted-foreground">
                The AI produces this many criteria. Marks split evenly across them.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>
                Instructions for the AI <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                placeholder={`Examples:\n• "1500-word essay on causes of WWI, focused on the Eastern Front. Accept video as alternative format."\n• "Group project: design a small bridge from spaghetti and tape. Include diagrams, materials list, and reflection."\n• "Research task on photosynthesis with at least 3 cited sources, due in 2 weeks."`}
                className="min-h-37.5 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Min 10 chars. The AI weaves your wording into the brief verbatim.
                {' '}{instructions.length}/4000
              </p>
            </div>

            {blocker && (
              <div className="rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Before generating
                </p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">{blocker}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
