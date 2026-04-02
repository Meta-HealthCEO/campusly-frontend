'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface QuizTimerProps {
  timeLimit: number; // minutes
  onTimeUp: () => void;
  started: boolean;
}

export function QuizTimer({ timeLimit, onTimeUp, started }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isWarning = timeLeft < 60;

  return (
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span
        className={`font-mono font-bold text-lg ${
          isWarning ? 'text-destructive animate-pulse' : ''
        }`}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
