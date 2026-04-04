'use client';

import { BookOpen, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NodePicker } from '@/components/curriculum/NodePicker';
import type { CurriculumNodeItem, CurriculumFrameworkItem } from '@/types';

interface TopicStepProps {
  frameworks: CurriculumFrameworkItem[];
  selectedFramework: string;
  selectedNodeId: string | null;
  selectedNode: CurriculumNodeItem | null;
  onNodeChange: (nodeId: string | null, node: CurriculumNodeItem | null) => void;
  onSearch: (fwId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
  onNext: () => void;
}

export function TopicStep({
  frameworks,
  selectedFramework,
  selectedNodeId,
  selectedNode,
  onNodeChange,
  onSearch,
  onLoadNode,
  onNext,
}: TopicStepProps) {
  const framework = frameworks.find((f: CurriculumFrameworkItem) => f.id === selectedFramework);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Choose a Curriculum Topic</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Search or browse the {framework?.name ?? 'CAPS'} curriculum tree to find the
          topic you want to teach.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <label className="text-sm font-medium">
            Curriculum Node <span className="text-destructive">*</span>
          </label>
          <NodePicker
            frameworkId={selectedFramework}
            value={selectedNodeId}
            onChange={onNodeChange}
            onSearch={onSearch}
            onLoadNode={onLoadNode}
            placeholder="Search for a topic, subtopic, or outcome..."
          />

          {selectedNode && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 transition-all duration-300">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge>{selectedNode.type}</Badge>
                {selectedNode.code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {selectedNode.code}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold">{selectedNode.title}</h3>
              {selectedNode.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedNode.description}
                </p>
              )}
              {selectedNode.metadata?.capsReference && (
                <p className="text-xs text-muted-foreground">
                  CAPS Ref: {selectedNode.metadata.capsReference}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedNodeId} size="lg">
          Continue
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
