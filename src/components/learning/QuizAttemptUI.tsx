'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { Quiz, QuizAnswer, QuizAttempt } from './types';

interface QuizAttemptUIProps {
  quiz: Quiz;
  onSubmit: (answers: QuizAnswer[], startedAt: string) => Promise<QuizAttempt>;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuizAttemptUI({ quiz, onSubmit }: QuizAttemptUIProps) {
  const [started, setStarted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [answers, setAnswers] = useState<Map<number, QuizAnswer>>(new Map());
  const [timeLeft, setTimeLeft] = useState((quiz.timeLimit ?? 0) * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const order = quiz.questions.map((_, i) => i);
    setQuestionOrder(quiz.shuffleQuestions ? shuffleArray(order) : order);
  }, [quiz.questions, quiz.shuffleQuestions]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const answerList: QuizAnswer[] = [];
      for (let i = 0; i < quiz.questions.length; i++) {
        const a = answers.get(i);
        answerList.push(a ?? { questionIndex: i });
      }
      const attempt = await onSubmit(answerList, startedAt);
      setResult(attempt);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }, [answers, onSubmit, quiz.questions.length, startedAt, submitted, submitting]);

  useEffect(() => {
    if (!started || !quiz.timeLimit || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, quiz.timeLimit, submitted, handleSubmit]);

  const setAnswer = (questionIndex: number, selectedOption?: number, textAnswer?: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, { questionIndex, selectedOption, textAnswer });
      return next;
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!started) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader><CardTitle>{quiz.title}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
          <div className="grid gap-2 text-sm">
            <p><strong>Questions:</strong> {quiz.questions.length}</p>
            <p><strong>Total Points:</strong> {quiz.totalPoints}</p>
            {quiz.timeLimit && <p><strong>Time Limit:</strong> {quiz.timeLimit} minutes</p>}
            <p><strong>Allowed Attempts:</strong> {quiz.attempts}</p>
          </div>
          <Button onClick={() => setStarted(true)} className="w-full">Start Quiz</Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader><CardTitle>Quiz Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-4xl font-bold">{result.percentage}%</p>
              <p className="text-lg text-muted-foreground">Score: {result.totalScore}/{quiz.totalPoints}</p>
              <Badge variant="secondary" className={result.percentage >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                {result.percentage >= 50 ? 'Passed' : 'Failed'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {result.answers.map((a, i) => {
          const q = quiz.questions[a.questionIndex];
          if (!q) return null;
          return (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-2">
                  {a.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{q.questionText}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.pointsEarned ?? 0}/{q.points} points
                    </p>
                  </div>
                </div>
                {q.explanation && (
                  <p className="text-sm text-muted-foreground ml-7">
                    <strong>Explanation:</strong> {q.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  const answeredCount = answers.size;
  const totalQ = quiz.questions.length;
  const progress = (answeredCount / totalQ) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {quiz.timeLimit && quiz.timeLimit > 0 && (
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-600' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {answeredCount}/{totalQ} answered
          </div>
        </div>
      )}

      <Progress value={progress} />

      {questionOrder.map((originalIdx, displayIdx) => {
        const q = quiz.questions[originalIdx];
        const current = answers.get(originalIdx);
        return (
          <Card key={originalIdx}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">
                  Q{displayIdx + 1}. {q.questionText}
                </p>
                <Badge variant="outline" className="shrink-0 ml-2">{q.points} pts</Badge>
              </div>

              {q.questionType === 'short_answer' ? (
                <Input
                  value={current?.textAnswer ?? ''}
                  onChange={(e) => setAnswer(originalIdx, undefined, e.target.value)}
                  placeholder="Type your answer..."
                />
              ) : (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        current?.selectedOption === oi ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${originalIdx}`}
                        checked={current?.selectedOption === oi}
                        onChange={() => setAnswer(originalIdx, oi)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </Button>
    </div>
  );
}
