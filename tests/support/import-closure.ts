import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './source';

const SRC = path.join(ROOT, 'src');
/** Not followed: the src/types barrel `export *`s admin-only style maps (ruling R3). */
const NOT_FOLLOWED = [path.join(SRC, 'types')];
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.(ts|tsx)$/.test(candidate)) return candidate;
  }
  return null;
}

/** Every .ts/.tsx file under src/ reachable by imports from the entry files, as repo-relative posix paths. */
export function importClosure(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const stack = entries.map((e: string) => path.join(ROOT, e));
  while (stack.length > 0) {
    const file = stack.pop() as string;
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const next = resolveImport(file, m[1] ?? m[2] ?? m[3]);
      if (next && next.startsWith(SRC) && !NOT_FOLLOWED.some((dir: string) => next.startsWith(dir))) stack.push(next);
    }
  }
  return [...seen].map((f: string) => path.relative(ROOT, f).split(path.sep).join('/')).sort();
}
