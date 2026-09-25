/** The walkthrough writes test data: it only ever runs against this machine. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

/** True when every host in the URL (a Mongo URI may list several) is localhost or 127.0.0.1. */
export function isLocalUrl(url: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i.exec(url);
  if (!match || match[1].toLowerCase() === 'mongodb+srv') return false;
  const authority = match[2].slice(match[2].lastIndexOf('@') + 1);
  const hosts = authority.split(',').map((h: string) => h.replace(/:\d+$/, '').toLowerCase());
  return hosts.length > 0 && hosts.every((h: string) => LOCAL_HOSTS.has(h));
}

export function assertLocalUrl(url: string, what: string): void {
  if (!isLocalUrl(url)) throw new Error(`${what} must be on localhost or 127.0.0.1, got ${url}`);
}
