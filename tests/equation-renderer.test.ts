import { describe, it, expect } from 'vitest';
import {
  containsMath,
  renderEquations,
  renderSingleExpression,
} from '../src/lib/equation-renderer';

describe('containsMath', () => {
  it('detects inline dollar math', () => {
    expect(containsMath('Solve $x^2 + 1 = 0$ for x')).toBe(true);
  });

  it('detects display dollar math', () => {
    expect(containsMath('$$\\frac{a}{b}$$')).toBe(true);
  });

  it('detects bare superscript notation', () => {
    expect(containsMath('What is x^2?')).toBe(true);
  });

  it('detects sqrt() shorthand', () => {
    expect(containsMath('Simplify sqrt(16)')).toBe(true);
  });

  it('detects frac() shorthand', () => {
    expect(containsMath('Write frac(1,2) as a decimal')).toBe(true);
  });

  it('returns false for plain prose', () => {
    expect(containsMath('Name the capital city of France.')).toBe(false);
  });

  it('is stable across repeated calls (global regex state reset)', () => {
    expect(containsMath('$x$')).toBe(true);
    expect(containsMath('$x$')).toBe(true);
    expect(containsMath('$x$')).toBe(true);
  });
});

describe('renderSingleExpression', () => {
  it('renders valid LaTeX to KaTeX HTML', () => {
    const html = renderSingleExpression('x^2');
    expect(html).toContain('katex');
  });

  it('returns the raw expression when KaTeX cannot parse it', () => {
    const bad = '\\undefinedmacro{';
    expect(renderSingleExpression(bad)).toBe(bad);
  });
});

describe('renderEquations', () => {
  it('renders inline dollar math as KaTeX spans', () => {
    const html = renderEquations('Solve $x^2 = 4$ now');
    expect(html).toContain('katex');
    expect(html).toContain('Solve ');
  });

  it('renders display math in display mode', () => {
    const html = renderEquations('$$\\frac{1}{2}$$');
    expect(html).toContain('katex-display');
  });

  it('escapes HTML in plain text segments (XSS)', () => {
    const html = renderEquations('<script>alert(1)</script> $x^2$');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML when there is no math at all', () => {
    const html = renderEquations('<img src=x onerror=alert(1)>');
    expect(html).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('normalises sqrt() shorthand into a rendered root', () => {
    const html = renderEquations('sqrt(25)');
    expect(html).toContain('katex');
  });

  it('normalises frac(a,b) shorthand into a rendered fraction', () => {
    const html = renderEquations('frac(3,4)');
    expect(html).toContain('katex');
  });

  it('leaves unparseable dollar-math as escaped plain text', () => {
    const input = '$\\notarealcommand{$';
    const html = renderEquations(input);
    expect(html).not.toContain('<script');
    // Must not throw and must return a string
    expect(typeof html).toBe('string');
  });
});
