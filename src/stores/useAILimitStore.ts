import { create } from 'zustand';
import type { AILimitEvent } from '@/lib/ai-allowance';

interface AILimitState {
  /** The AI refusal to explain, or null when the prompt is closed. */
  event: AILimitEvent | null;
  show: (event: AILimitEvent) => void;
  close: () => void;
}

/** One upgrade / verify-email prompt for every AI action, opened by the API client. */
export const useAILimitStore = create<AILimitState>((set) => ({
  event: null,
  show: (event) => set({ event }),
  close: () => set({ event: null }),
}));
