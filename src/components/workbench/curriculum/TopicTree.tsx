'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TopicNode } from './TopicNode';
import type { CurriculumTopic, CurriculumCoverage, CurriculumFramework } from '@/types';

// Backend may return parentTopicId even though the shared type omits it
type TopicWithParent = CurriculumTopic & { parentTopicId?: string };

interface TopicTreeProps {
  topics: CurriculumTopic[];
  frameworks: CurriculumFramework[];
  coverageMap: Map<string, CurriculumCoverage>;
  classId: string;
  onUpdateCoverage: (
    topicId: string,
    data: {
      classId: string;
      status: string;
      dateCovered: string | null;
      notes: string;
      linkedLessonPlanId: string | null;
    },
  ) => Promise<void>;
  onDeleteTopic: (id: string) => void;
}

function buildTree(topics: CurriculumTopic[]): CurriculumTopic[] {
  const map = new Map<string, TopicWithParent>();
  const roots: TopicWithParent[] = [];

  for (const t of topics) {
    map.set(t.id, { ...t, children: [] });
  }

  for (const t of topics as TopicWithParent[]) {
    const node = map.get(t.id)!;
    if (t.parentTopicId && map.has(t.parentTopicId)) {
      map.get(t.parentTopicId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function renderNode(
  topic: CurriculumTopic,
  coverageMap: Map<string, CurriculumCoverage>,
  classId: string,
  onUpdateCoverage: TopicTreeProps['onUpdateCoverage'],
  onDeleteTopic: (id: string) => void,
  depth: number,
): React.ReactNode {
  return (
    <TopicNode
      key={topic.id}
      topic={topic}
      coverage={coverageMap.get(topic.id)}
      onUpdateCoverage={onUpdateCoverage}
      onDelete={onDeleteTopic}
      depth={depth}
      classId={classId}
    >
      {topic.children?.map((child) =>
        renderNode(child, coverageMap, classId, onUpdateCoverage, onDeleteTopic, depth + 1),
      )}
    </TopicNode>
  );
}

interface TermSectionProps {
  termLabel: string;
  topics: CurriculumTopic[];
  coverageMap: Map<string, CurriculumCoverage>;
  classId: string;
  onUpdateCoverage: TopicTreeProps['onUpdateCoverage'];
  onDeleteTopic: (id: string) => void;
}

function TermSection({
  termLabel,
  topics,
  coverageMap,
  classId,
  onUpdateCoverage,
  onDeleteTopic,
}: TermSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{termLabel}</CardTitle>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="px-2 pb-3">
          {topics.map((topic) =>
            renderNode(topic, coverageMap, classId, onUpdateCoverage, onDeleteTopic, 0),
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function TopicTree({
  topics,
  frameworks,
  coverageMap,
  classId,
  onUpdateCoverage,
  onDeleteTopic,
}: TopicTreeProps) {
  const tree = buildTree(topics);

  // Build a frameworkId -> term map
  const frameworkTermMap = new Map<string, number>(
    frameworks.map((f) => [f.id, f.term]),
  );

  // Group root topics by their framework's term
  const byTerm = new Map<number, CurriculumTopic[]>();
  for (const root of tree) {
    const term = frameworkTermMap.get(root.frameworkId) ?? 1;
    if (!byTerm.has(term)) byTerm.set(term, []);
    byTerm.get(term)!.push(root);
  }

  const terms = Array.from(byTerm.keys()).sort((a, b) => a - b);

  if (terms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No topics found. Add a topic to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {terms.map((term) => (
        <TermSection
          key={term}
          termLabel={`Term ${term}`}
          topics={byTerm.get(term)!}
          coverageMap={coverageMap}
          classId={classId}
          onUpdateCoverage={onUpdateCoverage}
          onDeleteTopic={onDeleteTopic}
        />
      ))}
    </div>
  );
}
