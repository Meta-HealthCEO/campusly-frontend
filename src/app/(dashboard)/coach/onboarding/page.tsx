'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, Users, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { ROUTES } from '@/lib/constants';

export default function CoachOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName ?? 'Coach';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Welcome, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Your sport club is set up. Let&apos;s get your first team on the field.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <Step
            number={1}
            icon={Users}
            title="Create your first team"
            description="Name it, pick the sport and age group, and add your squad."
            cta="Create team"
            onClick={() => router.push(ROUTES.COACH_TEAMS)}
          />
          <Step
            number={2}
            icon={Calendar}
            title="Schedule your first fixture"
            description="Lock in the opponent, date, time, and venue so parents and players know."
            cta="Schedule fixture"
            onClick={() => router.push(ROUTES.COACH_FIXTURES)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={() => router.push(ROUTES.COACH_DASHBOARD)}>
          Skip and go to dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  icon: typeof Users;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}

function Step({ number, icon: Icon, title, description, cta, onClick }: StepProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {number}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <p className="font-medium">{title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button size="sm" onClick={onClick} className="self-end sm:self-auto">
        {cta}
      </Button>
    </div>
  );
}
