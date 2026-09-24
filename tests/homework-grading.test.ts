import { describe, expect, it } from 'vitest';
import { markActionLabel, validateManualMark } from '../src/lib/homework-grading';

describe('markActionLabel', () => {
  it('offers Mark on anything without a mark, even if auto-marking never ran', () => {
    expect(markActionLabel({ mark: undefined })).toBe('Mark');
    expect(markActionLabel({ mark: null })).toBe('Mark');
  });
  it('offers to change a mark that exists, including zero', () => {
    expect(markActionLabel({ mark: 0 })).toBe('Change mark');
    expect(markActionLabel({ mark: 7 })).toBe('Change mark');
  });
});

describe('validateManualMark', () => {
  it('accepts whole and half marks within the total', () => {
    expect(validateManualMark('7', 10)).toEqual({ value: 7 });
    expect(validateManualMark(' 7.5 ', 10)).toEqual({ value: 7.5 });
    expect(validateManualMark('0', 10)).toEqual({ value: 0 });
  });
  it('explains what is wrong', () => {
    expect(validateManualMark('', 10)).toEqual({ error: 'Enter a mark.' });
    expect(validateManualMark('abc', 10)).toEqual({ error: 'Enter a number.' });
    expect(validateManualMark('-1', 10)).toEqual({ error: "A mark can't be negative." });
    expect(validateManualMark('11', 10)).toEqual({ error: "A mark can't be more than 10." });
  });
});
