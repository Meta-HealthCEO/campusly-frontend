'use client';

import Link from 'next/link';
import {
  BookOpen, BookMarked, HelpCircle, PenTool, BarChart3, ClipboardList,
  Eye, Sparkles, Camera, AlertTriangle, FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { UsageBanner } from '@/components/shared/UsageBanner';
import { useUsage } from '@/hooks/useUsage';
import { useAuthStore } from '@/stores/useAuthStore';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const CURRICULUM_CARDS: HubCard[] = [
  {
    title: 'AI Studio',
    description: 'Generate complete lessons, worksheets, and activities with one click using AI.',
    href: '/teacher/curriculum/ai-studio',
    icon: Sparkles,
    badge: 'AI',
  },
  {
    title: 'Textbooks',
    description: 'Create and manage digital textbooks with chapters and lessons for each subject.',
    href: '/teacher/curriculum/textbooks',
    icon: BookMarked,
  },
  {
    title: 'Content Library',
    description: 'Browse, create, and manage lessons, worksheets, and study materials.',
    href: '/teacher/curriculum/content',
    icon: BookOpen,
  },
  {
    title: 'Question Bank',
    description: 'Create and manage questions with CAPS cognitive level tagging.',
    href: '/teacher/curriculum/questions',
    icon: HelpCircle,
  },
  {
    title: 'Assessments',
    description: 'Build assessment papers with sections and questions. Export to PDF with memos.',
    href: '/teacher/curriculum/assessments',
    icon: PenTool,
  },
  {
    title: 'Homework',
    description: 'Assign content to students, track submissions, and grade work.',
    href: '/teacher/homework',
    icon: ClipboardList,
  },
  {
    title: 'Gradebook',
    description: 'Enter and manage student marks for finalised assessments.',
    href: '/teacher/grades',
    icon: BarChart3,
  },
  {
    title: 'Mark Papers',
    description: 'Upload photos of handwritten answers and let AI grade them.',
    href: '/teacher/curriculum/mark-papers',
    icon: Camera,
    badge: 'AI',
  },
  {
    title: 'Student Preview',
    description: 'Preview approved content exactly as students will see it.',
    href: '/teacher/curriculum/preview',
    icon: Eye,
  },
];

export default function TeacherCurriculumPage() {
  const { user } = useAuthStore();
  const { data: usageData } = useUsage();

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature. Contact your administrator or complete onboarding."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum"
        description="Create and manage teaching content aligned to the CAPS curriculum"
      />

      {usageData && <UsageBanner data={usageData} />}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {CURRICULUM_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{card.title}</h3>
                    {card.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
