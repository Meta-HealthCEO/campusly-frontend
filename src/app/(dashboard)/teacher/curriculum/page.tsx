'use client';

import Link from 'next/link';
import { BookOpen, HelpCircle, PenTool, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { useContentLibrary } from '@/hooks/useContentLibrary';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';

interface HubCard {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  stat?: string;
}

export default function TeacherCurriculumPage() {
  const { user } = useAuthStore();
  const { resources, fetchResources } = useContentLibrary();
  const { questions, fetchQuestions } = useQuestionBank();

  useEffect(() => {
    fetchResources({});
    fetchQuestions({});
  }, [fetchResources, fetchQuestions]);

  if (!user?.schoolId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="School not configured"
        description="You need to be part of a school to use this feature. Contact your administrator or complete onboarding."
      />
    );
  }

  const cards: HubCard[] = [
    {
      title: 'Content Library',
      description: 'Browse, create, and manage lessons, worksheets, and study materials aligned to the CAPS curriculum.',
      href: '/teacher/curriculum/content',
      icon: BookOpen,
      stat: resources.length > 0 ? `${resources.length} resources` : undefined,
    },
    {
      title: 'Question Bank',
      description: 'Create and manage assessment questions with cognitive level tagging and CAPS alignment.',
      href: '/teacher/curriculum/questions',
      icon: HelpCircle,
      stat: questions.length > 0 ? `${questions.length} questions` : undefined,
    },
    {
      title: 'Assessments',
      description: 'Build assessment papers manually or with AI assistance. Export to PDF with memorandums.',
      href: '/teacher/curriculum/assessments',
      icon: PenTool,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum"
        description="Create and manage teaching content aligned to the CAPS curriculum"
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{card.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {card.description}
                  </p>
                  {card.stat && (
                    <p className="text-xs font-medium text-primary">{card.stat}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
