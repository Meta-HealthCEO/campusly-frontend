import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toOptInStatus, toE164 } from '../src/lib/whatsapp';

vi.mock('react', () => ({
  useState: (init: unknown) => [init, () => undefined],
  useCallback: (fn: unknown) => fn,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const get = vi.fn();
const post = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api-client', () => ({ default: { get, post, delete: del } }));

const { useWhatsAppOptIn } = await import('../src/hooks/useWhatsAppOptIn');

describe('toOptInStatus', () => {
  it("reads the parent's number and language from the stored opt-in", () => {
    expect(toOptInStatus({ optedIn: true, record: { phoneNumber: '+27821234567', preferredLanguage: 'af' } }))
      .toEqual({ optedIn: true, phoneNumber: '+27821234567', preferredLanguage: 'af' });
  });

  it('says not opted in when there is no record', () => {
    expect(toOptInStatus({ optedIn: false, record: null })).toEqual({ optedIn: false });
  });

  it('reads the opt-in record the API returns after opting in', () => {
    expect(toOptInStatus({ optedIn: true, phoneNumber: '+27821234567', preferredLanguage: 'en' }))
      .toEqual({ optedIn: true, phoneNumber: '+27821234567', preferredLanguage: 'en' });
  });
});

describe('toE164', () => {
  it('drops the spaces, dashes and brackets people type', () => {
    expect(toE164('+27 82 123-4567')).toBe('+27821234567');
    expect(toE164('(+27) 82 123 4567')).toBe('+27821234567');
  });

  it('turns a local South African number into +27', () => {
    expect(toE164('082 123 4567')).toBe('+27821234567');
  });
});

describe('useWhatsAppOptIn', () => {
  beforeEach(() => {
    for (const fn of [get, post, del]) fn.mockReset().mockResolvedValue({ data: { data: { optedIn: false, record: null } } });
  });

  it('loads the status from the opt-in-status route', async () => {
    await useWhatsAppOptIn().loadOptInStatus();
    expect(get).toHaveBeenCalledWith('/whatsapp/opt-in-status');
  });

  it('opts out through the opt-out route', async () => {
    await useWhatsAppOptIn().optOut();
    expect(post).toHaveBeenCalledWith('/whatsapp/opt-out', {});
    expect(del).not.toHaveBeenCalled();
  });

  it('sends the number in E.164 form', async () => {
    await useWhatsAppOptIn().optIn('082 123 4567', 'en');
    expect(post).toHaveBeenCalledWith('/whatsapp/opt-in', { phoneNumber: '+27821234567', preferredLanguage: 'en' });
  });
});
