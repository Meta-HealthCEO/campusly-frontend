'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import type { GeneratedPaper, PaperSection } from './types';

interface PaperPreviewProps {
  paper: GeneratedPaper;
  regeneratingKey: string | null;
  saving?: boolean;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
  onSave: (sections: PaperSection[]) => void;
}

export function PaperPreview({
  paper,
  regeneratingKey,
  saving = false,
  onEditQuestion,
  onRegenerateQuestion,
  onSave,
}: PaperPreviewProps) {
  const [showMemo, setShowMemo] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">{paper.subject} -- Grade {paper.grade}</h2>
            <p className="text-sm text-muted-foreground">
              Term {paper.term} Examination -- {paper.topic}
            </p>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>Duration: {paper.duration} minutes</span>
              <span>Total Marks: {paper.totalMarks}</span>
              <Badge variant="secondary" className="capitalize">{paper.difficulty}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {paper.sections.map((section, sIdx) => (
        <SectionEditor
          key={sIdx}
          section={section}
          sectionIndex={sIdx}
          regeneratingKey={regeneratingKey}
          showModelAnswers={showMemo}
          onEditQuestion={onEditQuestion}
          onRegenerateQuestion={onRegenerateQuestion}
        />
      ))}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <Button variant="outline" onClick={() => setShowMemo(!showMemo)}>
            {showMemo ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showMemo ? 'Hide Memo' : 'Show Memo'}
          </Button>
          <Button onClick={() => onSave(paper.sections)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Paper'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
