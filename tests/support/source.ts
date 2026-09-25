import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');

export function readSource(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Every .ts/.tsx file under a repo-relative directory, as repo-relative posix paths. */
export function listSourceFiles(relDir: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
    }
  };
  walk(path.join(ROOT, relDir));
  return out.sort();
}
