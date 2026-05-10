'use client';

import { useMemo } from 'react';
import type { CurriculumNodeItem } from '@/types';

interface Props {
  topics: CurriculumNodeItem[];
  subtopics: CurriculumNodeItem[];
  search: string;
  loading: boolean;
  ready: boolean;
  selectedId: string;
  onSelect: (node: CurriculumNodeItem) => void;
}

interface Branch {
  topic: CurriculumNodeItem;
  children: CurriculumNodeItem[];
}

/**
 * Flat scrollable topic list (max 2 levels). Replaces the old curriculum
 * tree browser inside the new-lesson flow — teachers know roughly which
 * topic they want, so they get a searchable list, not a navigable tree.
 */
export function TopicListPanel({
  topics,
  subtopics,
  search,
  loading,
  ready,
  selectedId,
  onSelect,
}: Props) {
  const filteredTree = useMemo<Branch[]>(() => {
    const q = search.trim().toLowerCase();
    const subtopicsByParent = new Map<string, CurriculumNodeItem[]>();
    for (const st of subtopics) {
      if (!st.parentId) continue;
      const arr = subtopicsByParent.get(st.parentId) ?? [];
      arr.push(st);
      subtopicsByParent.set(st.parentId, arr);
    }

    const branches: Branch[] = topics.map((t) => ({
      topic: t,
      children: subtopicsByParent.get(t.id) ?? [],
    }));

    if (!q) return branches;

    return branches
      .map((b) => {
        const topicMatches = b.topic.title.toLowerCase().includes(q);
        const matchingChildren = b.children.filter((c) =>
          c.title.toLowerCase().includes(q),
        );
        if (topicMatches) return b;
        if (matchingChildren.length > 0) return { ...b, children: matchingChildren };
        return null;
      })
      .filter((b): b is Branch => b !== null);
  }, [topics, subtopics, search]);

  return (
    <div className="max-h-[40vh] min-h-50 overflow-y-auto rounded-md border">
      {!ready ? (
        <p className="p-4 text-sm text-muted-foreground">Pick a class to see its topics.</p>
      ) : loading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading topics...</p>
      ) : filteredTree.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          {search
            ? 'No topics match your search.'
            : 'No topics found for this term — try another term.'}
        </p>
      ) : (
        <ul className="divide-y">
          {filteredTree.map((b) => (
            <li key={b.topic.id} className="py-1">
              <TopicRow
                node={b.topic}
                selected={selectedId === b.topic.id}
                onSelect={onSelect}
              />
              {b.children.map((c) => (
                <TopicRow
                  key={c.id}
                  node={c}
                  selected={selectedId === c.id}
                  onSelect={onSelect}
                  indented
                />
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface RowProps {
  node: CurriculumNodeItem;
  selected: boolean;
  onSelect: (node: CurriculumNodeItem) => void;
  indented?: boolean;
}

function TopicRow({ node, selected, onSelect, indented }: RowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={[
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        indented ? 'pl-8' : '',
        selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3 w-3 shrink-0 rounded-full border',
          selected ? 'border-primary bg-primary' : 'border-input',
        ].join(' ')}
        aria-hidden
      />
      <span className="truncate">{node.title}</span>
    </button>
  );
}
