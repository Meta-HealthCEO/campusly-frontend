import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import apiClient from '../src/lib/api-client';
import { aiActionsLeft, aiLimitCopy, aiLimitFromError, resetLabel, shouldWarn, usageLine } from '../src/lib/ai-allowance';
import { useAILimitStore } from '../src/stores/useAILimitStore';

const free = (used: number) => ({ used, limit: 20, resetsAt: '2026-09-30T22:00:00.000Z', plan: 'free' as const });

describe('usageLine', () => {
  it('says how many AI actions are left this month', () => {
    expect(usageLine({ used: 8, limit: 20 })).toBe('12 of 20 AI actions left this month');
  });

  it('says plainly when none are left', () => {
    expect(usageLine({ used: 20, limit: 20 })).toBe('No AI actions left this month');
    expect(usageLine({ used: 23, limit: 20 })).toBe('No AI actions left this month');
  });
});

describe('shouldWarn', () => {
  it('warns a free teacher with fewer than 5 left', () => {
    expect(shouldWarn(free(16))).toBe(true);
    expect(shouldWarn(free(15))).toBe(false);
  });

  it('never warns Pro or school users', () => {
    expect(shouldWarn({ ...free(499), limit: 500, plan: 'pro' })).toBe(false);
    expect(shouldWarn({ plan: 'school' })).toBe(false);
    expect(shouldWarn(null)).toBe(false);
  });
});

describe('aiActionsLeft', () => {
  it('counts what is left, or null when the school covers AI', () => {
    expect(aiActionsLeft(free(18))).toBe(2);
    expect(aiActionsLeft(free(25))).toBe(0);
    expect(aiActionsLeft({ plan: 'school' })).toBeNull();
    expect(aiActionsLeft(null)).toBeNull();
  });
});

describe('resetLabel', () => {
  it('names the SAST date the allowance resets', () => {
    expect(resetLabel('2026-09-30T22:00:00Z', new Date('2026-09-25T10:00:00Z'))).toBe('Resets on 1 October');
  });

  it('says tomorrow on the last day of the month', () => {
    expect(resetLabel('2026-09-30T22:00:00Z', new Date('2026-09-30T08:00:00Z'))).toBe('Resets tomorrow');
  });
});

describe('aiLimitCopy', () => {
  const now = new Date('2026-09-25T10:00:00Z');

  it('offers Pro to a free teacher who has used the month', () => {
    expect(aiLimitCopy(free(20), now)).toEqual({
      title: "You've used this month's free AI actions",
      body: 'No AI actions left this month. Resets on 1 October. Pro gives you up to 500 a month for R149.',
    });
  });

  it('only says when it resets for a Pro teacher at the fair-use cap', () => {
    expect(aiLimitCopy({ ...free(500), limit: 500, plan: 'pro' }, now)).toEqual({
      title: "You've used this month's AI actions",
      body: 'No AI actions left this month. Resets on 1 October.',
    });
  });
});

describe('aiLimitFromError', () => {
  it('reads the allowance refusal with its numbers', () => {
    const data = { success: false, error: "You've used this month's 20 free AI actions.", code: 'AI_ALLOWANCE', details: { used: 20, limit: 20, resetsAt: '2026-09-30T22:00:00.000Z', plan: 'free' } };
    expect(aiLimitFromError(402, data)).toEqual({ kind: 'limit', usage: { used: 20, limit: 20, resetsAt: '2026-09-30T22:00:00.000Z', plan: 'free' } });
  });

  it('reads the unverified-email refusal', () => {
    expect(aiLimitFromError(403, { code: 'EMAIL_UNVERIFIED', error: 'Verify your email to use AI.' })).toEqual({ kind: 'unverified' });
  });

  it('ignores every other error, including a plain AI outage', () => {
    expect(aiLimitFromError(503, { error: 'AI service is not configured' })).toBeNull();
    expect(aiLimitFromError(402, { error: 'Payment required', feature: 'advancedAnalytics' })).toBeNull();
    expect(aiLimitFromError(403, { error: 'Forbidden' })).toBeNull();
    expect(aiLimitFromError(402, { code: 'AI_ALLOWANCE' })).toBeNull();
    expect(aiLimitFromError(undefined, undefined)).toBeNull();
  });
});

describe('useAILimitStore', () => {
  beforeEach(() => useAILimitStore.getState().close());

  it('opens one prompt for a refusal and closes it', () => {
    useAILimitStore.getState().show({ kind: 'unverified' });
    expect(useAILimitStore.getState().event).toEqual({ kind: 'unverified' });
    useAILimitStore.getState().close();
    expect(useAILimitStore.getState().event).toBeNull();
  });
});

describe('the API client', () => {
  const original = apiClient.defaults.adapter;
  const refuse = (status: number, data: unknown): AxiosAdapter => async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError('Request failed', String(status), config, null, { status, statusText: '', data, headers: {}, config });
  };

  beforeEach(() => useAILimitStore.getState().close());
  afterEach(() => { apiClient.defaults.adapter = original; });

  it('opens the prompt on an AI allowance refusal and still rejects the call', async () => {
    apiClient.defaults.adapter = refuse(402, { code: 'AI_ALLOWANCE', details: { used: 20, limit: 20, resetsAt: '2026-09-30T22:00:00.000Z', plan: 'free' } });
    await expect(apiClient.post('/question-bank/papers/generate', {})).rejects.toBeInstanceOf(AxiosError);
    expect(useAILimitStore.getState().event).toMatchObject({ kind: 'limit', usage: { used: 20, limit: 20 } });
  });

  it('leaves other failures alone', async () => {
    apiClient.defaults.adapter = refuse(503, { error: 'AI service is not configured' });
    await expect(apiClient.post('/question-bank/papers/generate', {})).rejects.toBeInstanceOf(AxiosError);
    expect(useAILimitStore.getState().event).toBeNull();
  });
});
