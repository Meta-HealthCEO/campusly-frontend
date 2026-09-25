import { describe, it, expect } from 'vitest';
import { isLocalUrl } from '../e2e/support/local';

describe('the e2e walkthrough only runs against this machine', () => {
  it('accepts localhost and 127.0.0.1 databases and sites', () => {
    expect(isLocalUrl('mongodb://127.0.0.1:27047/campusly-dev?directConnection=true')).toBe(true);
    expect(isLocalUrl('mongodb://user:pw@localhost:27017/x')).toBe(true);
    expect(isLocalUrl('http://localhost:3500')).toBe(true);
  });

  it('refuses any other host, even one that mentions localhost', () => {
    expect(isLocalUrl('mongodb+srv://prod.example.net/campusly?note=localhost')).toBe(false);
    expect(isLocalUrl('mongodb://localhost.evil.example:27017/x')).toBe(false);
    expect(isLocalUrl('mongodb://db.example.com:27017/x?h=127.0.0.1')).toBe(false);
    expect(isLocalUrl('mongodb://127.0.0.1:27017,prod.example.com:27017/x')).toBe(false);
    expect(isLocalUrl('https://campusly.app')).toBe(false);
    expect(isLocalUrl('not a url')).toBe(false);
  });
});
