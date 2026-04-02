'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuizTimer } from './QuizTimer';
import { QuizQuestionCard } from './QuizQuestion';
import { QuizResults } from './QuizResults';
import type { Quiz, QuizAnswer, QuizAttempt, QuizLeaderboardEntry } from './types';

interface QuizAttemptUIProps {
  quiz: Quiz;
  onSubmit: (answers: QuizAnswer[], startedAt: string, timeSpent?: number) => Promise<QuizAttempt>;
  onRetry?: () => void;
  canRetry?: boolean;
  leaderboard?: QuizLeaderboardEntry[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export function QuizAttemptUI({ quiz, onSubmit, onRetry, canRetry = false, leaderboard = [] }: QuizAttemptUIProps) {
  const [started, setStarted] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const startTimeRef = useRef<number>(Date.now());
  const [answers, setAnswers] = useState<Map<number, QuizAnswer>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  // Track per-question feedback for instant mode
  const [feedbackMap, setFeedbackMap] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    const order = quiz.questions.map((_, i) => i);
    setQuestionOrder(quiz.shuffleQuestions ? shuffleArray(order) : order);
  }, [quiz.questions, quiz.shuffleQuestions]);

  const handleSubmit = useCallback(async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const answerList: QuizAnswer[] = [];
      for (let i = 0; i < quiz.questions.length; i++) {
        const a = answers.get(i);
        answerList.push(a ?? { questionIndex: i });
      }
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const attempt = await onSubmit(answerList, startedAt, timeSpent);
      setResult(attempt);
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }, [answers, onSubmit, quiz.questions.length, startedAt, submitted, submitting]);

  const setAnswer = (questionIndex: number, selectedOption?: number, textAnswer?: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, { questionIndex, selectedOption, textAnswer });
      return next;
    });

    // For instant feedback mode, check correctness immediately
    if (quiz.showInstantFeedback) {
      const q = quiz.questions[questionIndex];
      if (!q) return;
      let isCorrect = false;
      if (selectedOption !== undefined && q.options[selectedOption]) {
        isCorrect = q.options[selectedOption]!.isCorrect;
      } else if (textAnswer) {
        isCorrect = textAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
      }
      setFeedbackMap((prev) => new Map(prev).set(questionIndex, isCorrect));
    }
  };

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

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
            {quiz.showInstantFeedback && <p className="text-emerald-600">Instant feedback enabled</p>}
            {quiz.shuffleQuestions && <p className="text-muted-foreground">Questions will be shuffled</p>}
          </div>
          <Button onClick={() => { setStarted(true); startTimeRef.current = Date.now(); }} className="w-full">
            Start Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted && result) {
    return (
      <QuizResults
        quiz={quiz}
        result={result}
        leaderboard={leaderboard}
        onRetry={onRetry}
        canRetry={canRetry}
      />
    );
  }

  const answeredCount = answers.size;
  const totalQ = quiz.questions.length;
  const progress = (answeredCount / totalQ) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3">
        {quiz.timeLimit && quiz.timeLimit > 0 ? (
          <QuizTimer timeLimit={quiz.timeLimit} onTimeUp={handleTimeUp} started={started} />
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {answeredCount}/{totalQ} answered
        </div>
      </div>

      <Progress value={progress} />

      {questionOrder.map((originalIdx, displayIdx) => {
        const q = quiz.questions[originalIdx];
        if (!q) return null;
        const current = answers.get(originalIdx);
        return (
          <QuizQuestionCard
            key={originalIdx}
            question={q}
            index={originalIdx}
            displayIndex={displayIdx}
            selectedOption={current?.selectedOption}
            textAnswer={current?.textAnswer}
            onAnswer={setAnswer}
            showFeedback={quiz.showInstantFeedback}
            isCorrect={feedbackMap.get(originalIdx)}
          />
        );
      })}

      <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </Button>
    </div>
  );
}
