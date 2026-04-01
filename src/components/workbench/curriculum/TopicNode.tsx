'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CoveragePopover } from './CoveragePopover';
import type { CurriculumTopic, CurriculumCoverage } from '@/types';

interface TopicNodeProps {
  topic: CurriculumTopic;
  coverage?: CurriculumCoverage;
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
  onDelete: (id: string) => void;
  depth: number;
  classId: string;
  children?: React.ReactNode;
}

const COGNITIVE_COLORS: Record<string, string> = {
  knowledge: 'bg-slate-100 text-slate-700',
  comprehension: 'bg-blue-100 text-blue-700',
  application: 'bg-green-100 text-green-700',
  analysis: 'bg-purple-100 text-purple-700',
  synthesis: 'bg-orange-100 text-orange-700',
  evaluation: 'bg-pink-100 text-pink-700',
};

export function TopicNode({
  topic,
  coverage,
  onUpdateCoverage,
  onDelete,
  depth,
  classId,
  children,
}: TopicNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = topic.children && topic.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 group"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          type="button"
          className="flex-none text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Title */}
        <span className="flex-1 font-medium text-sm truncate">{topic.title}</span>

        {/* Cognitive level badge */}
        <span
          className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
            COGNITIVE_COLORS[topic.cognitiveLevel] ?? 'bg-muted text-muted-foreground'
          }`}
        >
          {topic.cognitiveLevel}
        </span>

        {/* Estimated periods */}
        {topic.estimatedHours > 0 && (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
            {topic.estimatedHours}h
          </span>
        )}

        {/* Coverage chip */}
        {classId && (
          <CoveragePopover
            topicId={topic.id}
            currentCoverage={coverage}
            classId={classId}
            onSave={onUpdateCoverage}
          />
        )}

        {/* Delete */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0"
          onClick={() => onDelete(topic.id)}
          aria-label="Delete topic"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Children */}
      {hasChildren && expanded && <div>{children}</div>}
    </div>
  );
}
