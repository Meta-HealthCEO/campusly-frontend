'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Circle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface GettingStartedCardProps {
  scopeSet: boolean;
  hasClass: boolean;
  hasFirstContent: boolean;
  hasStudent: boolean;
  classCode: string | null;
}

interface Step {
  done: boolean;
  title: string;
  helper: string;
  action: React.ReactNode;
}

export function GettingStartedCard({
  scopeSet,
  hasClass,
  hasFirstContent,
  hasStudent,
  classCode,
}: GettingStartedCardProps) {
  const allDone = scopeSet && hasClass && hasFirstContent && hasStudent;
  if (allDone) return null;

  const steps: Step[] = [
    {
      done: scopeSet,
      title: 'Set your teaching scope',
      helper: 'Grades & subjects you teach',
      action: (
        <Link href="/teacher/settings" className="text-sm text-primary hover:underline">
          Open settings
        </Link>
      ),
    },
    {
      done: hasClass,
      title: 'Create your first class',
      helper: 'Group your students together',
      action: (
        <Link href="/teacher/classes" className="text-sm text-primary hover:underline">
          New class
        </Link>
      ),
    },
    {
      done: hasFirstContent,
      title: 'Make your first lesson, paper, or homework',
      helper: 'Use the tiles above to generate content with AI',
      action: null,
    },
    {
      done: hasStudent,
      title: 'Invite a student',
      helper: hasClass
        ? 'Share your class code'
        : 'Create a class first, then invite students',
      action: hasClass && classCode ? <CopyCodeButton code={classCode} /> : null,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Getting started
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {doneCount}/{steps.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.title}
            className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card p-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-start gap-3">
              {step.done ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={
                    step.done
                      ? 'text-sm font-medium text-muted-foreground'
                      : 'text-sm font-medium'
                  }
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.helper}</p>
              </div>
            </div>
            {!step.done && step.action ? <div className="shrink-0">{step.action}</div> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Class code copied');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copied!' : code}
    </button>
  );
}
