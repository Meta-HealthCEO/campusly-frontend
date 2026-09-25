import { describe, expect, it } from 'vitest';
import { isDesignGalleryEnabled } from '../src/lib/design/gallery';
import { listSourceFiles, readSource } from './support/source';

describe('isDesignGalleryEnabled (spec §5: 404 when NODE_ENV === "production")', () => {
  it.each([['development', true], ['test', true], [undefined, true], ['production', false]] as const)('NODE_ENV=%s → %s', (env, on) => {
    expect(isDesignGalleryEnabled(env)).toBe(on);
  });
});

describe('the /design page', () => {
  const page = readSource('src/app/design/page.tsx');

  it('calls notFound() before rendering anything when the gallery is off', () => {
    expect(page).toMatch(/if \(!isDesignGalleryEnabled\(process\.env\.NODE_ENV\)\) notFound\(\);/);
    expect(page).toMatch(/import \{ notFound \} from 'next\/navigation'/);
  });

  it('is kept out of search engines', () => {
    expect(page).toMatch(/robots: \{ index: false, follow: false \}/);
  });

  it('shows contrast ratios from the same pair table the tests use', () => {
    expect(readSource('src/components/design-gallery/TokenTable.tsx')).toMatch(/TOKEN_PAIRS/);
  });

  it('keeps every gallery file under 300 lines', () => {
    for (const f of listSourceFiles('src/components/design-gallery')) {
      expect(readSource(f).split(/\r?\n/).length, f).toBeLessThanOrEqual(300);
    }
  });
});
