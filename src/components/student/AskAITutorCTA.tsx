import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AskAITutorCTA({ subjectId, context }: { subjectId?: string; context?: string }) {
  const params = new URLSearchParams();
  if (subjectId) params.set('subjectId', subjectId);
  if (context) params.set('context', context);
  const qs = params.toString();
  return (
    <Link href={`/student/ai-tutor${qs ? `?${qs}` : ''}`}>
      <Button variant="outline" className="inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Ask the AI Tutor about this lesson
      </Button>
    </Link>
  );
}
