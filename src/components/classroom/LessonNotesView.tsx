'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TranscriptView } from './TranscriptView';
import type { LessonNote } from '@/hooks/useLessonNotes';

interface LessonNotesViewProps {
  note: LessonNote;
  onTimestampClick?: (seconds: number) => void;
}

export function LessonNotesView({ note, onTimestampClick }: LessonNotesViewProps) {
  const { notes, transcript } = note;

  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="w-full flex-wrap h-auto">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="qa">Q&A</TabsTrigger>
        <TabsTrigger value="polls">Polls</TabsTrigger>
        <TabsTrigger value="terms">Key Terms</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4 pt-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold">Summary</h3>
            <p className="text-sm whitespace-pre-line">
              {notes.summary || 'No summary available.'}
            </p>
          </CardContent>
        </Card>

        {notes.keyConcepts.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">Key Concepts</h3>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {notes.keyConcepts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {notes.actionItems.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold">Action Items</h3>
              <ul className="text-sm space-y-1">
                {notes.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="transcript" className="pt-4">
        <TranscriptView transcript={transcript} onTimestampClick={onTimestampClick} />
      </TabsContent>

      <TabsContent value="qa" className="space-y-3 pt-4">
        {notes.teacherQuestions.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Teacher Questions</h3>
              {notes.teacherQuestions.map((q, i) => (
                <div key={i} className="border-l-2 border-primary pl-3 space-y-1">
                  <p className="text-sm font-medium">Q: {q.question}</p>
                  {q.answer && (
                    <p className="text-sm text-muted-foreground">A: {q.answer}</p>
                  )}
                  {q.timestamp && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {q.timestamp}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {notes.studentQuestions.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Student Questions</h3>
              {notes.studentQuestions.map((q, i) => (
                <div key={i} className="border-l-2 border-muted pl-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{q.student}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {q.source}
                    </Badge>
                  </div>
                  <p className="text-sm">{q.question}</p>
                  {q.response && (
                    <p className="text-sm text-muted-foreground">Response: {q.response}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {notes.teacherQuestions.length === 0 && notes.studentQuestions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No questions captured.
          </p>
        )}
      </TabsContent>

      <TabsContent value="polls" className="space-y-3 pt-4">
        {notes.pollResults.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No polls in this session.
          </p>
        ) : (
          notes.pollResults.map((poll, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium">{poll.question}</p>
                <div className="space-y-2">
                  {poll.options.map((opt, j) => {
                    const count = poll.responseCounts[j] ?? 0;
                    const pct =
                      poll.totalResponses > 0
                        ? Math.round((count / poll.totalResponses) * 100)
                        : 0;
                    return (
                      <div key={j} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{opt}</span>
                          <span className="text-muted-foreground">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {poll.totalResponses} responses
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="terms" className="pt-4">
        {notes.keyTerms.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No key terms captured.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.keyTerms.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-1">
                  <h4 className="font-semibold text-sm">{t.term}</h4>
                  <p className="text-sm text-muted-foreground">{t.definition}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
