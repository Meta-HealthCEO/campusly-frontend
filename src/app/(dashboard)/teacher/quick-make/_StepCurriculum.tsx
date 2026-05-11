'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurriculumTreeBrowser } from '@/components/curriculum/CurriculumTreeBrowser';
import { NodePicker } from '@/components/curriculum/NodePicker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContextStatusBadge } from './_ui';
import type { CurriculumContextStatus } from '@/hooks/useCurriculumPreparation';
import type { CurriculumNodeItem } from '@/types';

interface Props {
  outputTitle: string | undefined;
  allowMultipleTopics: boolean;
  frameworkName: string;
  selectedFramework: string;
  selectedNodes: CurriculumNodeItem[];
  selectedNodeId: string | null;
  contextStatus: CurriculumContextStatus;
  contextError: string | null;
  canContinue: boolean;
  onTopicSelect: (node: CurriculumNodeItem) => void;
  onRemoveNode: (nodeId: string) => void;
  onSearch: (frameworkId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
  onBack: () => void;
  onNext: () => void;
}

export function StepCurriculum({
  outputTitle,
  allowMultipleTopics,
  frameworkName,
  selectedFramework,
  selectedNodes,
  selectedNodeId,
  contextStatus,
  contextError,
  canContinue,
  onTopicSelect,
  onRemoveNode,
  onSearch,
  onLoadNode,
  onBack,
  onNext,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge variant="outline">{outputTitle}</Badge>
          <h2 className="mt-2 text-xl font-semibold">Choose curriculum {allowMultipleTopics ? 'topics' : 'topic'}</h2>
          <p className="text-sm text-muted-foreground">
            {allowMultipleTopics
              ? 'A paper can cover multiple topics, as long as they are in the same subject, grade, and term.'
              : `Search or browse ${frameworkName} and choose the topic this should be based on.`}
          </p>
        </div>
        <ContextStatusBadge status={contextStatus} error={contextError} />
      </div>

      {selectedNodes.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Selected curriculum coverage</p>
              <Badge variant="secondary">{selectedNodes.length} topic{selectedNodes.length === 1 ? '' : 's'}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedNodes.map((node) => (
                <span key={node.id} className="inline-flex max-w-full items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs">
                  <span className="truncate">{node.title}</span>
                  <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onRemoveNode(node.id)}>Remove</button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4">
          <Tabs defaultValue="browse">
            <TabsList><TabsTrigger value="browse">Browse</TabsTrigger><TabsTrigger value="search">Search</TabsTrigger></TabsList>
            <TabsContent value="browse" className="mt-3">
              <div className="max-h-[64vh] min-h-128 overflow-y-auto rounded-md border p-1">
                <CurriculumTreeBrowser frameworkId={selectedFramework} selectedNodeId={selectedNodeId} selectedNodeIds={selectedNodes.map((n) => n.id)} onSelect={onTopicSelect} />
              </div>
            </TabsContent>
            <TabsContent value="search" className="mt-3">
              <NodePicker frameworkId={selectedFramework} value={selectedNodeId} onChange={(_nodeId, node) => { if (node) onTopicSelect(node); }} onSearch={onSearch} onLoadNode={onLoadNode} placeholder="Search for a topic, subtopic, or assessment standard..." />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}><ChevronLeft className="mr-1 h-4 w-4" />Back</Button>
        <Button onClick={onNext} disabled={!canContinue}>Details<ChevronRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
