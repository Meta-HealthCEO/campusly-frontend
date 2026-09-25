import { describe, expect, it } from 'vitest';
import { StreamError, streamErrorFrom, streamFailureMessage } from '../src/lib/sse-client';

describe('streamErrorFrom', () => {
  it('shows the server message, not raw JSON, when a stream is refused', () => {
    const body = JSON.stringify({
      success: false,
      error: "You've used your 60 tutor messages this month.",
      code: 'LEARNER_AI_LIMIT',
      details: { used: 60, limit: 60 },
    });
    const err = streamErrorFrom(402, body);
    expect(err).toBeInstanceOf(StreamError);
    expect(err.message).toBe("You've used your 60 tutor messages this month.");
    expect(err.status).toBe(402);
    expect(err.code).toBe('LEARNER_AI_LIMIT');
    expect(err.details).toEqual({ used: 60, limit: 60 });
  });

  it('reads a `message` field too', () => {
    expect(streamErrorFrom(503, JSON.stringify({ message: 'The AI is busy right now.' })).message)
      .toBe('The AI is busy right now.');
  });

  it('never shows HTML or raw text to the user', () => {
    const err = streamErrorFrom(500, '<html><body>Internal Server Error</body></html>');
    expect(err.message).toBe('The tutor could not answer just now. Try again in a moment.');
    expect(err.status).toBe(500);
    expect(err.code).toBeUndefined();
  });

  it('handles an empty body', () => {
    expect(streamErrorFrom(502, '').message).toBe('The tutor could not answer just now. Try again in a moment.');
  });
});

describe('streamFailureMessage', () => {
  it('shows a refused stream its own plain message', () => {
    expect(streamFailureMessage(streamErrorFrom(402, JSON.stringify({ error: 'Your class has used this month’s tutor messages.' }))))
      .toBe('Your class has used this month’s tutor messages.');
  });

  it('falls back for anything else', () => {
    expect(streamFailureMessage(new TypeError('Failed to fetch'))).toBe('Streaming failed');
    expect(streamFailureMessage('boom')).toBe('Streaming failed');
  });
});
