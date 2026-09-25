// @ts-check
// Phase D machine gate (spec §7). Run before any human review; red refuses the hand-over.
// Needs the backend on :4500 (DEV_SIGN_IN=true) and :3500 FREE unless GATE_E2E=0: the gate runs its own frontend
// there (the backend only allows that origin) and stops it again. The launch walkthrough runs on the production
// build (no dev-server hot reload racing its redirects); the width/label/request-set sweep runs on `next dev`,
// the only server with the dev-only /design gallery.
import { execSync, spawn } from 'node:child_process';
import { openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileSizeViolations, parseNameStatus } from './design-gate-lib.mjs';

const failures = [];
const sh = (cmd) => execSync(cmd, { stdio: 'inherit' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs one gate step; true when it passed. */
async function step(label, fn) {
  console.log(`\n▶ ${label}`);
  try {
    await fn();
    console.log(`✔ ${label}`);
    return true;
  } catch (err) {
    failures.push(label);
    console.error(`✘ ${label}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    return false;
  }
}

async function status(url) {
  try {
    return (await fetch(url, { redirect: 'manual' })).status;
  } catch {
    return 0;
  }
}

/** Starts a frontend server; its log goes outside the checkout, so the dev watcher never sees it change. */
async function serve(args, readyUrl, logName) {
  const log = openSync(path.join(tmpdir(), `design-gate-${logName}.log`), 'w');
  const server = spawn('npx', args, { shell: true, stdio: ['ignore', log, log] });
  for (let i = 0; i < 180; i += 1) {
    await sleep(1000);
    if ((await status(readyUrl)) !== 0) return server;
  }
  stop(server);
  throw new Error(`${args.join(' ')} did not answer ${readyUrl}`);
}

function stop(server) {
  if (process.platform === 'win32' && server.pid) execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' });
  else server.kill();
}

async function portFreed(url) {
  for (let i = 0; i < 30 && (await status(url)) !== 0; i += 1) await sleep(1000);
}

await step('unit tests: tokens AA, palette scanner, helpers', () => sh('npx vitest run'));
await step('type-check', () => sh('npx tsc --noEmit'));
await step('file sizes: new ≤ 300, touched ≤ 350', () => {
  const base = execSync('git merge-base origin/master HEAD').toString().trim();
  const rows = parseNameStatus(execSync(`git diff --name-status ${base} HEAD`).toString())
    .map((row) => ({ ...row, lines: readFileSync(row.path, 'utf8').split(/\r?\n/).length }));
  const bad = fileSizeViolations(rows);
  if (bad.length > 0) throw new Error(bad.join('; '));
});
await step('production build', () => sh('npx next build'));
await step('/design is 404 in production', async () => {
  const server = await serve(['next', 'start', '-p', '3599'], 'http://localhost:3599/design', 'prod-3599');
  try {
    const code = await status('http://localhost:3599/design');
    if (code !== 404) throw new Error(`expected 404, got ${code}`);
  } finally {
    stop(server);
  }
});
if (process.env.GATE_E2E !== '0') {
  const ready = await step('backend dev sign-in up on :4500, :3500 free for the gate', async () => {
    if ((await status('http://localhost:4500/api/auth/dev-sign-in/accounts')) !== 200) throw new Error('backend dev sign-in not up');
    if ((await status('http://localhost:3500/login')) !== 0) throw new Error(':3500 is in use: stop your frontend, the gate runs its own');
  });
  if (ready) {
    await step('launch walkthrough on the production build (Playwright)', async () => {
      const server = await serve(['next', 'start', '-p', '3500'], 'http://localhost:3500/login', 'prod-3500');
      try {
        sh('npx playwright test e2e/standalone-launch.spec.ts');
      } finally {
        stop(server);
        await portFreed('http://localhost:3500/login');
      }
    });
    await step('widths, labels, focus, request sets on next dev, incl. /design (Playwright)', async () => {
      const server = await serve(['next', 'dev', '--webpack', '-p', '3500'], 'http://localhost:3500/login', 'dev-3500');
      try {
        sh('npx playwright test e2e/a11y-audit.spec.ts e2e/design-gate.spec.ts');
      } finally {
        stop(server);
        await portFreed('http://localhost:3500/login');
        // A dev server killed mid-write leaves half-written route types that break the next type-check.
        rmSync('.next/dev/types', { recursive: true, force: true });
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`\nGate RED: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nGate GREEN');
