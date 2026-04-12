'use client';

import { Badge } from '@/components/ui/badge';
import { FileText, BookOpen, ClipboardList, HelpCircle } from 'lucide-react';
import type { LessonType } from '@/types';
import type { LucideIcon } from 'lucide-react';

interface LessonTypeBadgeProps {
  type: LessonType;
  size?: 'sm' | 'md';
}

const CONFIG: Record<LessonType, { label: string; icon: LucideIcon }> = {
  content: { label: 'Content', icon: FileText },
  chapter: { label: 'Chapter', icon: BookOpen },
  homework: { label: 'Homework', icon: ClipboardList },
  quiz: { label: 'Quiz', icon: HelpCircle },
};

export function LessonTypeBadge({ type, size = 'sm' }: LessonTypeBadgeProps) {
  const { label, icon: Icon } = CONFIG[type];
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <Badge variant="outline" className="gap-1 text-xs">
      <Icon className={iconSize} />
      {label}
    </Badge>
  );
}
