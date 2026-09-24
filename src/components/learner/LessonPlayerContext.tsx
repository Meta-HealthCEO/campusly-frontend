'use client';

import { createContext, useContext } from 'react';
import type { useLessonPlayer } from '@/hooks/useLessonPlayer';

type Player = ReturnType<typeof useLessonPlayer>;

/** What an item page needs from the player that the learn layout keeps alive between items. */
export interface LessonPlayerActions {
  fetchLesson: Player['fetchLesson'];
  writeProgress: Player['writeProgress'];
  submitQuiz: Player['submitQuiz'];
}

const LessonPlayerContext = createContext<LessonPlayerActions | null>(null);

export const LessonPlayerProvider = LessonPlayerContext.Provider;

export function useLessonPlayerActions(): LessonPlayerActions {
  const actions = useContext(LessonPlayerContext);
  if (!actions) throw new Error('useLessonPlayerActions must be used inside the learn layout');
  return actions;
}
