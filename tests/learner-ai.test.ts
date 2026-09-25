import { describe, expect, it } from 'vitest';
import { aiLimitFromError, learnerLimitCopy, learnerPoolLine, tutorMessagesLeft, tutorMessagesLine } from '../src/lib/ai-allowance';
import { StreamError, streamErrorFrom } from '../src/lib/sse-client';

const now = new Date('2026-09-25T10:00:00Z');
const resetsAt = '2026-09-30T22:00:00.000Z';

describe('the learner tutor limit', () => {
  it('is recognised from a 402 LEARNER_AI_LIMIT', () => {
    expect(aiLimitFromError(402, { code: 'LEARNER_AI_LIMIT', details: { used: 60, limit: 60, resetsAt, scope: 'learner' } }))
      .toEqual({ kind: 'learner-limit', limit: { used: 60, limit: 60, resetsAt, scope: 'learner' } });
    expect(aiLimitFromError(402, { code: 'LEARNER_AI_LIMIT', details: { used: 60 } })).toBeNull();
  });

  it("speaks to the learner, with the reset date and no upgrade", () => {
    expect(learnerLimitCopy({ used: 60, limit: 60, resetsAt, scope: 'learner' }, now))
      .toEqual({ title: "You've used your 60 tutor messages this month", body: 'Resets on 1 October. Your teacher can still help you in class.' });
    expect(learnerLimitCopy({ used: 100, limit: 100, resetsAt, scope: 'class' }, now).title).toBe("Your class has used this month's tutor messages");
  });

  it('counts what is left from the smaller of the cap and the class pool', () => {
    const u = { used: 10, limit: 60, pool: { used: 95, limit: 100 }, resetsAt, plan: 'free' as const };
    expect(tutorMessagesLeft(u)).toBe(5);
    expect(tutorMessagesLine(u)).toBe('5 tutor messages left this month');
    expect(tutorMessagesLine({ ...u, used: 60 })).toBe('No tutor messages left this month');
    expect(tutorMessagesLine({ ...u, pool: { used: 99, limit: 100 } })).toBe('1 tutor message left this month');
  });

  it("gives the teacher the class pool line", () => {
    expect(learnerPoolLine({ used: 212, limit: 600 })).toBe("Learners' tutor messages: 212 of 600 used");
  });

  it('lets the stream client carry the status, code and details of a refusal', () => {
    const details = { used: 60, limit: 60, resetsAt, scope: 'learner' };
    const err = streamErrorFrom(402, JSON.stringify({ error: "You've used your 60 tutor messages this month", code: 'LEARNER_AI_LIMIT', details }));
    expect(err).toBeInstanceOf(StreamError);
    expect([err.status, err.code, err.details]).toEqual([402, 'LEARNER_AI_LIMIT', details]);
  });
});
