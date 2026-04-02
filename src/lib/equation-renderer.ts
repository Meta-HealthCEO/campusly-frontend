import katex from 'katex';

/**
 * Escape HTML special characters in a plain-text string to prevent XSS.
 * Applied to all non-math text segments before concatenation with KaTeX output.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  if (!containsMath(text)) return escapeHtml(text);

  // Split on math delimiters so we can escape plain-text segments separately.
  // Strategy: accumulate parts; replace math matches with KaTeX HTML;
  // escape everything that is not already KaTeX output.
  // We process by splitting on $$...$$ first, then $...$ within plain segments,
  // then fallback patterns. After all substitutions the non-math remainder is
  // escaped via a sentinel approach: temporarily mark KaTeX output so it is
  // skipped by escapeHtml at the end.

  // Use a unique sentinel that cannot appear in teacher input.
  const KATEX_SENTINEL = '\x00KATEX\x00';

  // Collect rendered parts: [{ isKatex: bool, text: string }]
  type Part = { isKatex: boolean; text: string };
  const parts: Part[] = [{ isKatex: false, text: text }];

  function processParts(
    regex: RegExp,
    replacer: (match: string, ...groups: string[]) => string | null,
  ): void {
    const next: Part[] = [];
    for (const part of parts) {
      if (part.isKatex) {
        next.push(part);
        continue;
      }
      // Reset regex state
      regex.lastIndex = 0;
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(part.text)) !== null) {
        if (m.index > lastIndex) {
          next.push({ isKatex: false, text: part.text.slice(lastIndex, m.index) });
        }
        const rendered = replacer(m[0], ...m.slice(1));
        if (rendered !== null && rendered !== m[0]) {
          next.push({ isKatex: true, text: rendered });
        } else {
          next.push({ isKatex: false, text: m[0] });
        }
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < part.text.length) {
        next.push({ isKatex: false, text: part.text.slice(lastIndex) });
      }
    }
    // Replace parts in-place
    parts.splice(0, parts.length, ...next);
    // Reset regexes that are global
    regex.lastIndex = 0;
  }

  // 1. Display math: $$...$$
  processParts(DISPLAY_MATH_REGEX, (_match, inner: string) => {
    const latex = normaliseToLatex(inner.trim());
    const rendered = renderSingleExpression(latex, true);
    return rendered === latex ? null : rendered;
  });

  // 2. Inline math: $...$
  processParts(INLINE_MATH_REGEX, (_match, inner: string) => {
    const latex = normaliseToLatex(inner.trim());
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  // 3. sqrt(...)
  processParts(SQRT_REGEX, (_match, inner: string) => {
    const latex = `\\sqrt{${inner.trim()}}`;
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  // 4. frac(a,b)
  processParts(FRAC_REGEX, (_match, num: string, den: string) => {
    const latex = `\\frac{${num.trim()}}{${den.trim()}}`;
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  // 5. Superscript: token^exponent
  processParts(SUPERSCRIPT_REGEX, (match) => {
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  // 6. Subscript: token_sub
  processParts(SUBSCRIPT_REGEX, (match) => {
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  // 7. Simple variable expressions
  processParts(VARIABLE_EXPR_REGEX, (match) => {
    if (match.includes('katex')) return match; // already rendered
    const latex = normaliseToLatex(match);
    const rendered = renderSingleExpression(latex, false);
    return rendered === latex ? null : rendered;
  });

  void KATEX_SENTINEL;

  // Combine: escape plain-text parts, pass KaTeX HTML through as-is
  return parts
    .map((p) => (p.isKatex ? p.text : escapeHtml(p.text)))
    .join('');
}
