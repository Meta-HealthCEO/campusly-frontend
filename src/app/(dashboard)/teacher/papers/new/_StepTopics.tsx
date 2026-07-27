'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CurriculumTreeBrowser,
  type CurriculumTreeBrowserSelectContext,
} from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { displayNodeTitle } from '@/lib/curriculum-display';
import { ContextBadge } from './_indicators';
import type { useCurriculumPreparation } from '@/hooks/useCurriculumPreparation';
import type { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import type { CurriculumNodeItem } from '@/types';

interface StepTopicsProps {
  prep: ReturnType<typeof useCurriculumPreparation>;
  selectedFramework: string;
  frameworkName: string | null;
  selectedNodes: CurriculumNodeItem[];
  onTopicSelect: (node: CurriculumNodeItem, ctx?: CurriculumTreeBrowserSelectContext) => void;
  onRemoveNode: (nodeId: string) => void;
  searchNodes: ReturnType<typeof useCurriculumStructure>['searchNodes'];
  loadNode: ReturnType<typeof useCurriculumStructure>['loadNode'];
}

/** Step 1 of the paper wizard: curriculum tree left, topic cart right. */
export function StepTopics({
  prep, selectedFramework, frameworkName, selectedNodes,
  onTopicSelect, onRemoveNode, searchNodes, loadNode,
}: StepTopicsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Choose curriculum topics</h2>
          <p className="text-sm text-muted-foreground">
            Click topics in the tree to add them. A paper can cover many topics from the same subject, grade, and term. {frameworkName ?? 'CAPS'} framework is active.
          </p>
        </div>
        <ContextBadge status={prep.contextStatus} error={prep.contextError} />
      </div>

      {/* Fixed-width cart, flexible tree — at full screen width a 2:1
          grid would leave the cart hundreds of pixels wider than the
          ~10-item list needs. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Tree on the left */}
        <Card>
          <CardContent className="space-y-4">
            <Tabs defaultValue="browse">
              <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList>
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
                  onChange={(_nodeId, node) => { if (node) onTopicSelect(node); }}
                  onSearch={searchNodes}
                  onLoadNode={loadNode}
                  placeholder="Search for a topic, subtopic, or assessment standard..."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Cart on the right — sticky on desktop so it stays visible while scrolling tree */}
        <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Selected topics</h3>
              <Badge variant="secondary">{selectedNodes.length}</Badge>
            </div>

            {selectedNodes.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">No topics yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Click a topic in the tree to add it here.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedNodes.map((node) => (
                  <li key={node.id} className="flex items-start justify-between gap-2 rounded-md border bg-primary/5 px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm leading-snug">{displayNodeTitle(node)}</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
