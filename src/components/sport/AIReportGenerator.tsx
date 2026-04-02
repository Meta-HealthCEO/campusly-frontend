'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Target, Users, Loader2 } from 'lucide-react';
import type { AIPerformanceReport } from '@/types/ai-sports';

interface AIReportGeneratorProps {
  studentId: string;
  sportCode: string;
  generating: boolean;
  onGenerate: (type: string) => Promise<AIPerformanceReport | undefined>;
}

const REPORT_TYPES = [
  { type: 'analysis', label: 'Player Analysis', icon: Sparkles, description: 'AI-powered performance analysis' },
  { type: 'development', label: 'Development Plan', icon: Target, description: 'Personalised improvement plan' },
  { type: 'scouting', label: 'Scouting Report', icon: FileText, description: 'Talent evaluation report' },
  { type: 'parent', label: 'Parent Report', icon: Users, description: 'Parent-friendly progress summary' },
] as const;

export function AIReportGenerator({ studentId, sportCode, generating, onGenerate }: AIReportGeneratorProps) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const handleGenerate = async (type: string) => {
    setActiveType(type);
    try {
      await onGenerate(type);
    } finally {
      setActiveType(null);
    }
  };

  if (!studentId || !sportCode) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Select a player and sport to generate AI reports.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate AI Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {REPORT_TYPES.map(({ type, label, icon: Icon, description }) => {
            const isActive = activeType === type && generating;
            return (
              <Button
                key={type}
                variant="outline"
                className="h-auto flex-col items-start gap-1 p-4 text-left"
                disabled={generating}
                onClick={() => handleGenerate(type)}
              >
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {description}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
