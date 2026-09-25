import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource } from './support/source';

const shared = (file: string) => readSource(`src/components/shared/${file}`);

describe('one look, no portal variant (ruling R9)', () => {
  it('no source file uses the removed teacher: variant', () => {
    const offenders = listSourceFiles('src').filter((f: string) => /(?<![\w-])teacher:[a-z[]/.test(readSource(f)));
    expect(offenders).toEqual([]);
  });
});

describe('PageHeader (spec §4: eyebrow, title, one-line context, one action slot)', () => {
  it('renders the h1 on the type scale with the eyebrow style', () => {
    const src = shared('PageHeader.tsx');
    expect(src).toMatch(/<h1 className="[^"]*text-h1[^"]*md:text-h1-desktop/);
    expect(src).toMatch(/text-eyebrow/);
  });
});

describe('ErrorState (spec §4: message + Retry)', () => {
  it('announces itself and offers Retry', () => {
    const src = shared('ErrorState.tsx');
    expect(src).toMatch(/role="alert"/);
    expect(src).toMatch(/Retry/);
    expect(shared('index.ts')).toMatch(/export \{ ErrorState \} from '\.\/ErrorState'/);
  });
});

describe('DataTable (spec §4: sticky head, horizontal scroll in its own box)', () => {
  it('scrolls sideways in its own container and keeps the head in view from md up (ruling R24)', () => {
    const src = shared('DataTable.tsx');
    expect(src).toMatch(/data-scroll-x/);
    expect(src).toMatch(/overflow-x-auto/);
    expect(src).toMatch(/md:max-h-\[70vh\]/);
    expect(src).toMatch(/sticky top-0/);
  });
});

describe('StatCard (spec §2.3: numbers in Hanken Grotesk with tabular figures)', () => {
  it('sets the figure in the heading face with tabular numbers', () => {
    expect(shared('StatCard.tsx')).toMatch(/font-heading[^"]*tabular-nums/);
  });
});
