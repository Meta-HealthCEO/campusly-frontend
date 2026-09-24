import type { WhatsAppOptInStatus } from '@/types/whatsapp';

interface OptInRecord {
  optedIn?: boolean;
  phoneNumber?: string;
  preferredLanguage?: string;
}

/**
 * The API answers the status route with `{ optedIn, record }` and the opt-in
 * route with the record itself; both become the status the card shows.
 */
export function toOptInStatus(raw: OptInRecord & { record?: OptInRecord | null }): WhatsAppOptInStatus {
  const source = raw.record ?? raw;
  const status: WhatsAppOptInStatus = { optedIn: Boolean(raw.optedIn) };
  if (source.phoneNumber) status.phoneNumber = source.phoneNumber;
  if (source.preferredLanguage) status.preferredLanguage = source.preferredLanguage;
  return status;
}

/** The API wants E.164 (+27821234567): drop separators and turn a local 0 into +27. */
export function toE164(input: string): string {
  const compact = input.replace(/[\s\-()]/g, '');
  return compact.startsWith('0') ? `+27${compact.slice(1)}` : compact;
}
