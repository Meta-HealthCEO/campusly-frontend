import katex from 'katex';

// Regex: explicit $$...$$ display math (must come before inline $ check)
const DISPLAY_MATH_REGEX = /\$\$([^$]+)\$\$/g;

// Regex: explicit $...$ inline math
const INLINE_MATH_REGEX = /\$([^$\n]+)\$/g;

// Regex: superscript — e.g. x^2, a^n, (x+1)^2
const SUPERSCRIPT_REGEX = /[a-zA-Z0-9)]\^[{(]?[a-zA-Z0-9+\-*/^]+[)}]?/g;

// Regex: subscript — e.g. x_1, a_n
const SUBSCRIPT_REGEX = /[a-zA-Z][_][a-zA-Z0-9{][a-zA-Z0-9}]*/g;

// Regex: sqrt(...) — plain text square root notation
const SQRT_REGEX = /\bsqrt\s*\(([^)]+)\)/g;

// Regex: frac(a,b) — plain text fraction notation
const FRAC_REGEX = /\bfrac\s*\(([^,)]+),([^)]+)\)/g;

// Regex: simple variable equations like "a + b = c" where at least one token is a single letter
const VARIABLE_EXPR_REGEX =
  /\b([a-zA-Z])\s*([+\-*/=<>])\s*([a-zA-Z0-9]+)\s*([+\-*/=<>]\s*[a-zA-Z0-9]+)*\b/g;

/**
 * Render a single LaTeX expression string using KaTeX.
 * Returns the original expression (unmodified) if KaTeX throws.
 */
export function renderSingleExpression(expression: string, displayMode = false): string {
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: true,
      strict: false,
    });
  } catch {
    return expression;
  }
}

/**
 * Check whether a string contains any recognisable mathematical notation.
 */
export function containsMath(text: string): boolean {
  if (DISPLAY_MATH_REGEX.test(text)) return true;
  DISPLAY_MATH_REGEX.lastIndex = 0;
  if (INLINE_MATH_REGEX.test(text)) return true;
  INLINE_MATH_REGEX.lastIndex = 0;
  if (SUPERSCRIPT_REGEX.test(text)) return true;
  SUPERSCRIPT_REGEX.lastIndex = 0;
  if (SUBSCRIPT_REGEX.test(text)) return true;
  SUBSCRIPT_REGEX.lastIndex = 0;
  if (SQRT_REGEX.test(text)) return true;
  SQRT_REGEX.lastIndex = 0;
  if (FRAC_REGEX.test(text)) return true;
  FRAC_REGEX.lastIndex = 0;
  if (VARIABLE_EXPR_REGEX.test(text)) return true;
  VARIABLE_EXPR_REGEX.lastIndex = 0;
  return false;
}

/**
 * Convert plain-text math shorthand to LaTeX before handing off to KaTeX.
 * Handles: sqrt(...), frac(a,b), bare x^2, x_n patterns.
 */
function normaliseToLatex(expr: string): string {
  return expr
    .replace(/\bsqrt\s*\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/\bfrac\s*\(([^,)]+),([^)]+)\)/g, '\\frac{$1}{$2}');
}

/**
 * Renders any math expressions found in the input text as KaTeX HTML spans.
 *
 * Processing order:
 *   1. Explicit $$...$$ → display math
 *   2. Explicit $...$ → inline math
 *   3. sqrt(...) → \\sqrt{...}
 *   4. frac(a,b) → \\frac{a}{b}
 *   5. Superscript: x^2
 *   6. Subscript: x_1
 *   7. Simple variable expressions: a + b = c
 *
 * Returns the original text if no math is detected, or if all renderings fail.
 */
export function renderEquations(text: string): string {
  if (!containsMath(text)) return text;

  let result = text;

  // 1. Display math: $$...$$
  result = result.replace(DISPLAY_MATH_REGEX, (_match, inner: string) => {
    const latex = normaliseToLatex(inner.trim());
    const rendered = renderSingleExpression(latex, true);
    return rendered === latex ? _match : rendered;
  });

  // 2. Inline math: $...$
  result = result.replace(INLINE_MATH_REGEX, (_match, inner: string) => {
    const latex = normaliseToLatex(inner.trim());
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? _match : rendered;
  });

  // 3. sqrt(...) — not already inside a KaTeX span
  result = result.replace(SQRT_REGEX, (_match, inner: string) => {
    const latex = `\\sqrt{${inner.trim()}}`;
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? _match : rendered;
  });

  // 4. frac(a,b)
  result = result.replace(FRAC_REGEX, (_match, num: string, den: string) => {
    const latex = `\\frac{${num.trim()}}{${den.trim()}}`;
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? _match : rendered;
  });

  // 5. Superscript: token^exponent (skip if already inside katex HTML)
  result = result.replace(SUPERSCRIPT_REGEX, (match) => {
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? match : rendered;
  });

  // 6. Subscript: token_sub
  result = result.replace(SUBSCRIPT_REGEX, (match) => {
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? match : rendered;
  });

  // 7. Simple variable expressions (low-confidence, only render if both sides resolved)
  result = result.replace(VARIABLE_EXPR_REGEX, (match) => {
    // Avoid double-rendering content already wrapped by KaTeX
    if (match.includes('katex')) return match;
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? match : rendered;
  });

  return result;
}
