/**
 * Proactive access-token refresh.
 *
 * Schedules a single timer that fires shortly before the access token expires,
 * hits /auth/refresh, swaps tokens in localStorage, and reschedules itself.
 * The 401-retry interceptor in api-client.ts remains as a backstop for cases
 * where the timer is delayed (tab backgrounded, clock skew).
 */
import axios from 'axios';

interface JwtPayload {
  exp?: number; // seconds since epoch
}

const REFRESH_LEAD_MS = 60_000; // refresh 60s before expiry
const MIN_DELAY_MS = 1_000;     // never schedule shorter than 1s
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4500/api';

let timerId: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<string> | null = null;

function decodeJwtExp(token: string): number | null {
  try {
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    // base64url -> base64 -> JSON
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as JwtPayload;
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

async function refreshNow(): Promise<string> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, undefined, {
      withCredentials: true,
    });
    const payload = data?.data ?? data;
    const newAccess = (payload?.accessToken ?? payload?.access_token) as string | undefined;
    const newRefresh = (payload?.refreshToken ?? payload?.refresh_token) as string | undefined;
    if (!newAccess) throw new Error('Refresh did not return an access token');
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', newAccess);
      if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
    }
    return newAccess;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Read the current access token, decode its expiry, and schedule a refresh
 * `REFRESH_LEAD_MS` before it expires. Cancels any previous schedule.
 * No-op on the server.
 */
export function scheduleTokenRefresh(): void {
  if (typeof window === 'undefined') return;
  cancelTokenRefresh();

  const token = localStorage.getItem('accessToken');
  if (!token) return;

  const exp = decodeJwtExp(token);
  if (!exp) return;

  const expiryMs = exp * 1000;
  const fireAt = expiryMs - REFRESH_LEAD_MS;
  const delay = Math.max(MIN_DELAY_MS, fireAt - Date.now());

  timerId = setTimeout(() => {
    refreshNow()
      .then(() => scheduleTokenRefresh())
      .catch(() => {
        // Refresh failed — let the 401 interceptor handle the next request.
        // It will redirect to /login if the refresh keeps failing.
      });
  }, delay);
}

/** Clears any pending refresh timer. Safe to call repeatedly. */
export function cancelTokenRefresh(): void {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}
