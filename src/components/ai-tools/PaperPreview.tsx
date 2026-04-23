'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Eye, EyeOff, Download } from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import type { GeneratedPaper, PaperSection, PaperQuestion } from './types';

interface PaperPreviewProps {
  paper: GeneratedPaper;
  regeneratingKey: string | null;
  saving?: boolean;
  editedKeys: Set<string>;
  onEditQuestion: (sectionIndex: number, questionIndex: number, text: string) => void;
  onRegenerateQuestion: (sectionIndex: number, questionIndex: number) => void;
  onSave: (sections: PaperSection[]) => void;
  onDownloadPaper: () => void;
  onDownloadMemo: () => void;
}

function countPendingDiagrams(paper: GeneratedPaper): number {
  let count = 0;
  for (const section of paper.sections) {
    for (const q of section.questions as PaperQuestion[]) {
      if (q.diagram && q.diagram.renderStatus === 'pending') count++;
    }
  }
  return count;
}

export function PaperPreview({
  paper, regeneratingKey, saving = false, editedKeys,
  onEditQuestion, onRegenerateQuestion, onSave, onDownloadPaper, onDownloadMemo,
}: PaperPreviewProps) {
  const [showMemo, setShowMemo] = useState(false);
  const pendingCount = useMemo(() => countPendingDiagrams(paper), [paper]);
  const downloadBlocked = pendingCount > 0;
  const downloadTooltip = downloadBlocked
    ? `${pendingCount} diagram${pendingCount === 1 ? ' is' : 's are'} still rendering — please wait before downloading.`
    : undefined;

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
          editedKeys={editedKeys}
          showModelAnswers={showMemo}
          onEditQuestion={onEditQuestion}
          onRegenerateQuestion={onRegenerateQuestion}
        />
      ))}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => setShowMemo(!showMemo)}>
            {showMemo ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showMemo ? 'Hide Memo' : 'Show Memo'}
          </Button>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={onDownloadPaper}
              disabled={downloadBlocked}
              title={downloadTooltip}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Paper
            </Button>
            <Button
              variant="outline"
              onClick={onDownloadMemo}
              disabled={downloadBlocked}
              title={downloadTooltip}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Memo
            </Button>
            <Button onClick={() => onSave(paper.sections)} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Paper'}
            </Button>
          </div>

          {downloadBlocked && (
            <p className="w-full text-xs text-muted-foreground">
              Waiting for {pendingCount} diagram{pendingCount === 1 ? '' : 's'} to finish rendering…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
