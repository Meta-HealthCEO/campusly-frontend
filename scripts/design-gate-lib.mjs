// @ts-check
/** Pure helpers for the Phase D machine gate (spec §7). */

/**
 * @param {string} text output of `git diff --name-status`
 * @returns {Array<{ status: string, path: string }>}
 */
export function parseNameStatus(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line) => {
    const parts = line.split('\t');
    return { status: parts[0].charAt(0), path: parts[parts.length - 1] };
  }).filter((row) => row.status !== 'D');
}

/**
 * @param {Array<{ path: string, status: string, lines: number }>} rows
 * @returns {string[]}
 */
export function fileSizeViolations(rows) {
  return rows
    .filter((row) => /\.(ts|tsx|mjs)$/.test(row.path))
    .filter((row) => row.lines > (row.status === 'A' ? 300 : 350))
    .map((row) => `${row.path}: ${row.lines} lines (${row.status === 'A' ? 'new, max 300' : 'touched, max 350'})`);
}
