# Math Diagram Rendering Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable AI-generated math questions to include publication-quality diagrams rendered server-side via TikZ/LaTeX, displayed as SVG in the frontend.

**Architecture:** Claude generates TikZ code + structured JSON sidecar per diagram. A Docker-based TeX Live microservice compiles TikZ to SVG. SVGs are cached by content hash and stored as files. The frontend displays them via a `DiagramRenderer` component. A 5-layer reliability system ensures diagrams always render.

**Tech Stack:** Docker + TeX Live + dvisvgm (rendering service), Express.js (service API), Mongoose/MongoDB (data model), React/Next.js (frontend component), Anthropic Claude SDK (AI generation)

**Spec:** `docs/superpowers/specs/2026-04-05-math-diagram-rendering-design.md`

---

## File Structure

### TikZ Rendering Service (new standalone project)

```
campusly-tikz-renderer/
├── Dockerfile
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              — Express server entry point
│   ├── routes/render.ts      — POST /render, /render/pdf, /render/batch
│   ├── services/compiler.ts  — TikZ → SVG/PDF compilation logic
│   ├── services/validator.ts — Pre-render TikZ validation
│   └── lib/document.ts       — LaTeX document wrapper generation
├── templates/                — Verified TikZ templates (one per diagram type)
│   ├── number-line.tex
│   ├── cartesian-graph.tex
│   ├── triangle.tex
│   ├── circle-geometry.tex
│   ├── venn-diagram.tex
│   ├── trig-graph.tex
│   ├── box-whisker.tex
│   ├── bar-chart.tex
│   ├── transformation.tex
│   ├── geometric-construction.tex
│   ├── tree-diagram.tex
│   ├── scatter-plot.tex
│   ├── ogive.tex
│   ├── pie-chart.tex
│   ├── basic-shapes-2d.tex
│   ├── shapes-with-measurements.tex
│   ├── shape-nets-3d.tex
│   └── pictograph.tex
└── docker-compose.yml
```

### Backend Changes (campusly-backend)

```
src/modules/QuestionBank/
├── model.ts                      — Add IDiagram, IDiagramData interfaces + schema
├── service-generation.ts         — Update prompts, add diagram processing pipeline
├── service-paper-gen-helpers.ts  — Update missing question generation prompts
└── service-diagram.ts            — NEW: diagram rendering client + reliability system

src/modules/AITools/
├── model.ts                      — Add diagram field to IPaperQuestion + schema
├── service.ts                    — Update paper generation prompts + diagram processing

src/services/
└── ai.service.ts                 — No changes needed (already supports JSON output)

src/lib/
└── tikz-templates.ts             — NEW: TikZ template constants for AI prompt injection
```

### Frontend Changes (campusly-frontend)

```
src/types/
├── question-bank.ts              — Add DiagramData, QuestionDiagram types
└── diagram.ts                    — NEW: DiagramData discriminated union types

src/components/shared/
└── DiagramRenderer.tsx           — NEW: SVG display component with loading/error states

src/components/questions/
└── QuestionCard.tsx              — Update to show diagram via DiagramRenderer

src/components/ai-tools/
├── QuestionCard.tsx              — Update to show diagram via DiagramRenderer
├── PaperPreview.tsx              — No changes (delegates to SectionEditor)
└── SectionEditor.tsx             — No changes (delegates to QuestionCard)

src/lib/
└── paper-pdf.ts                  — Update to include diagram SVGs in print HTML
```

---

## Task 1: TikZ Rendering Service — Docker + Express Skeleton

**Files:**
- Create: `c:\Users\shaun\campusly-tikz-renderer\Dockerfile`
- Create: `c:\Users\shaun\campusly-tikz-renderer\package.json`
- Create: `c:\Users\shaun\campusly-tikz-renderer\tsconfig.json`
- Create: `c:\Users\shaun\campusly-tikz-renderer\src\index.ts`
- Create: `c:\Users\shaun\campusly-tikz-renderer\docker-compose.yml`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p c:/Users/shaun/campusly-tikz-renderer/src
```

```json
// package.json
{
  "name": "campusly-tikz-renderer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "express": "^5.2.1",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create Express server entry point**

```typescript
// src/index.ts
import express from 'express';
import { renderRouter } from './routes/render.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3600', 10);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'campusly-tikz-renderer' });
});

app.use('/render', renderRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TikZ renderer listening on port ${PORT}`);
});
```

- [ ] **Step 4: Create Dockerfile**

```dockerfile
FROM debian:bookworm-slim

# Install TeX Live and dvisvgm
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-full \
    dvisvgm \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Pre-compile LaTeX format for faster compilation
RUN fmtutil-sys --all 2>/dev/null || true

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev

COPY dist/ ./dist/
COPY templates/ ./templates/

EXPOSE 3600

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3600/health || exit 1

CMD ["node", "dist/index.js"]
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'
services:
  tikz-renderer:
    build: .
    ports:
      - "3600:3600"
    environment:
      - PORT=3600
      - NODE_ENV=production
    volumes:
      - tikz-cache:/app/cache
    restart: unless-stopped

volumes:
  tikz-cache:
```

- [ ] **Step 6: Install dependencies and verify build**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && npm install
```

Expected: dependencies installed successfully.

- [ ] **Step 7: Commit**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && git init && git add -A && git commit -m "feat: scaffold TikZ rendering service with Docker + Express"
```

---

## Task 2: TikZ Rendering Service — Compiler + Validator

**Files:**
- Create: `c:\Users\shaun\campusly-tikz-renderer\src\lib\document.ts`
- Create: `c:\Users\shaun\campusly-tikz-renderer\src\services\validator.ts`
- Create: `c:\Users\shaun\campusly-tikz-renderer\src\services\compiler.ts`

- [ ] **Step 1: Create LaTeX document wrapper**

```typescript
// src/lib/document.ts

const BASE_PACKAGES = [
  'pgfplots',
  'tkz-euclide',
  'amsmath',
  'amssymb',
];

const PACKAGE_MAP: Record<string, string> = {
  'pgfplots': '\\usepackage{pgfplots}\n\\pgfplotsset{compat=1.18}',
  'tkz-euclide': '\\usepackage{tkz-euclide}',
  'amsmath': '\\usepackage{amsmath}',
  'amssymb': '\\usepackage{amssymb}',
  'forest': '\\usepackage{forest}',
  'tikz-3dplot': '\\usepackage{tikz-3dplot}',
};

export function wrapTikzDocument(tikz: string, extraPackages?: string[]): string {
  const allPackages = [...new Set([...BASE_PACKAGES, ...(extraPackages ?? [])])];

  const packageLines = allPackages
    .map((pkg) => PACKAGE_MAP[pkg] ?? `\\usepackage{${pkg}}`)
    .join('\n');

  return [
    '\\documentclass[tikz,border=5pt]{standalone}',
    packageLines,
    '\\begin{document}',
    tikz,
    '\\end{document}',
  ].join('\n');
}
```

- [ ] **Step 2: Create TikZ validator**

```typescript
// src/services/validator.ts

interface ValidationResult {
  valid: boolean;
  errors: string[];
  detectedPackages: string[];
}

const FORBIDDEN_COMMANDS = [
  '\\input', '\\include', '\\write', '\\immediate',
  '\\openout', '\\closeout', '\\newwrite', '\\read',
  '\\catcode', '\\def\\', '\\csname', '\\endcsname',
  '\\system', '\\ShellEscape',
];

const PACKAGE_INDICATORS: Record<string, string[]> = {
  'pgfplots': ['\\begin{axis}', '\\addplot', '\\pgfplotsset'],
  'tkz-euclide': ['\\tkzDefPoint', '\\tkzDrawCircle', '\\tkzDrawSegment', '\\tkzMarkAngle'],
  'forest': ['\\begin{forest}'],
  'tikz-3dplot': ['\\tdplotsetmaincoords'],
};

export function validateTikz(tikz: string): ValidationResult {
  const errors: string[] = [];

  // Check for forbidden commands (security)
  for (const cmd of FORBIDDEN_COMMANDS) {
    if (tikz.includes(cmd)) {
      errors.push(`Forbidden command detected: ${cmd}`);
    }
  }

  // Check matching begin/end pairs
  const beginMatches = tikz.match(/\\begin\{([^}]+)\}/g) ?? [];
  const endMatches = tikz.match(/\\end\{([^}]+)\}/g) ?? [];

  const beginEnvs = beginMatches.map((m) => m.replace(/\\begin\{|\}/g, ''));
  const endEnvs = endMatches.map((m) => m.replace(/\\end\{|\}/g, ''));

  if (beginEnvs.length !== endEnvs.length) {
    errors.push(
      `Mismatched environments: ${beginEnvs.length} \\begin vs ${endEnvs.length} \\end`,
    );
  }

  // Check for tikzpicture environment
  if (!tikz.includes('\\begin{tikzpicture}') && !tikz.includes('\\begin{axis}')) {
    errors.push('Missing \\begin{tikzpicture} or \\begin{axis} environment');
  }

  // Detect required packages
  const detectedPackages: string[] = [];
  for (const [pkg, indicators] of Object.entries(PACKAGE_INDICATORS)) {
    if (indicators.some((ind) => tikz.includes(ind))) {
      detectedPackages.push(pkg);
    }
  }

  return { valid: errors.length === 0, errors, detectedPackages };
}
```

- [ ] **Step 3: Create TikZ compiler service**

```typescript
// src/services/compiler.ts
import { execFile } from 'node:child_process';
import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { wrapTikzDocument } from '../lib/document.js';
import { validateTikz } from './validator.js';

const COMPILE_TIMEOUT_MS = 10_000;
const CACHE_DIR = process.env.CACHE_DIR || '/app/cache';

export interface RenderResult {
  svg: string;
  hash: string;
  renderTimeMs: number;
}

export interface RenderError {
  error: string;
  log: string;
}

export function hashTikz(tikz: string): string {
  return createHash('sha256').update(tikz).digest('hex');
}

async function getCached(hash: string): Promise<string | null> {
  try {
    const cached = await readFile(join(CACHE_DIR, `${hash}.svg`), 'utf-8');
    return cached;
  } catch {
    return null;
  }
}

async function setCache(hash: string, svg: string): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(join(CACHE_DIR, `${hash}.svg`), svg, 'utf-8');
}

function execPromise(
  cmd: string,
  args: string[],
  options: { cwd: string; timeout: number },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function renderTikz(
  tikz: string,
  packages?: string[],
): Promise<RenderResult | RenderError> {
  const start = Date.now();

  // Validate
  const validation = validateTikz(tikz);
  if (!validation.valid) {
    return { error: 'Validation failed', log: validation.errors.join('\n') };
  }

  // Check cache
  const hash = hashTikz(tikz);
  const cached = await getCached(hash);
  if (cached) {
    return { svg: cached, hash, renderTimeMs: Date.now() - start };
  }

  // Prepare temp directory
  const workDir = join('/tmp', `tikz-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const allPackages = [...(packages ?? []), ...validation.detectedPackages];
  const texContent = wrapTikzDocument(tikz, allPackages);
  const texFile = join(workDir, 'diagram.tex');

  try {
    await writeFile(texFile, texContent, 'utf-8');

    // Compile TeX → DVI
    await execPromise('latex', [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-output-directory=' + workDir,
      texFile,
    ], { cwd: workDir, timeout: COMPILE_TIMEOUT_MS });

    // Convert DVI → SVG
    const dviFile = join(workDir, 'diagram.dvi');
    const svgFile = join(workDir, 'diagram.svg');

    await execPromise('dvisvgm', [
      '--no-fonts',
      '--exact-bbox',
      '-o', svgFile,
      dviFile,
    ], { cwd: workDir, timeout: COMPILE_TIMEOUT_MS });

    const svg = await readFile(svgFile, 'utf-8');

    // Cache result
    await setCache(hash, svg);

    return { svg, hash, renderTimeMs: Date.now() - start };
  } catch (err: unknown) {
    const errObj = err as { stderr?: string; stdout?: string; error?: Error };
    const log = [
      errObj.stderr ?? '',
      errObj.stdout ?? '',
      errObj.error?.message ?? '',
    ].filter(Boolean).join('\n');

    return { error: 'Compilation failed', log };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderTikzPdf(
  tikz: string,
  packages?: string[],
): Promise<{ pdf: Buffer; hash: string } | RenderError> {
  const validation = validateTikz(tikz);
  if (!validation.valid) {
    return { error: 'Validation failed', log: validation.errors.join('\n') };
  }

  const hash = hashTikz(tikz);
  const workDir = join('/tmp', `tikz-pdf-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const allPackages = [...(packages ?? []), ...validation.detectedPackages];
  const texContent = wrapTikzDocument(tikz, allPackages);
  const texFile = join(workDir, 'diagram.tex');

  try {
    await writeFile(texFile, texContent, 'utf-8');

    await execPromise('pdflatex', [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-output-directory=' + workDir,
      texFile,
    ], { cwd: workDir, timeout: COMPILE_TIMEOUT_MS });

    const pdfFile = join(workDir, 'diagram.pdf');
    const pdf = await readFile(pdfFile);

    return { pdf, hash };
  } catch (err: unknown) {
    const errObj = err as { stderr?: string; stdout?: string; error?: Error };
    const log = [errObj.stderr ?? '', errObj.stdout ?? ''].filter(Boolean).join('\n');
    return { error: 'PDF compilation failed', log };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && git add -A && git commit -m "feat: add TikZ compiler, validator, and LaTeX document wrapper"
```

---

## Task 3: TikZ Rendering Service — HTTP Routes

**Files:**
- Create: `c:\Users\shaun\campusly-tikz-renderer\src\routes\render.ts`

- [ ] **Step 1: Create render routes**

```typescript
// src/routes/render.ts
import { Router } from 'express';
import type { Request, Response } from 'express';
import { renderTikz, renderTikzPdf } from '../services/compiler.js';

export const renderRouter = Router();

interface RenderBody {
  tikz: string;
  packages?: string[];
}

renderRouter.post('/', async (req: Request, res: Response) => {
  const { tikz, packages } = req.body as RenderBody;

  if (!tikz || typeof tikz !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "tikz" field' });
    return;
  }

  const result = await renderTikz(tikz, packages);

  if ('error' in result) {
    res.status(422).json(result);
    return;
  }

  res.json(result);
});

renderRouter.post('/pdf', async (req: Request, res: Response) => {
  const { tikz, packages } = req.body as RenderBody;

  if (!tikz || typeof tikz !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "tikz" field' });
    return;
  }

  const result = await renderTikzPdf(tikz, packages);

  if ('error' in result) {
    res.status(422).json(result);
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.send(result.pdf);
});

interface BatchBody {
  items: RenderBody[];
}

renderRouter.post('/batch', async (req: Request, res: Response) => {
  const { items } = req.body as BatchBody;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Missing or empty "items" array' });
    return;
  }

  if (items.length > 50) {
    res.status(400).json({ error: 'Max 50 items per batch' });
    return;
  }

  const results = await Promise.all(
    items.map((item) => renderTikz(item.tikz, item.packages)),
  );

  res.json({ results });
});
```

- [ ] **Step 2: Build and verify TypeScript compiles**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && git add -A && git commit -m "feat: add render routes (single, PDF, batch)"
```

---

## Task 4: TikZ Templates — Core Math Diagram Types

**Files:**
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\number-line.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\cartesian-graph.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\triangle.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\circle-geometry.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\venn-diagram.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\trig-graph.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\box-whisker.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\bar-chart.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\transformation.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\geometric-construction.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\tree-diagram.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\scatter-plot.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\ogive.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\pie-chart.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\basic-shapes-2d.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\shapes-with-measurements.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\shape-nets-3d.tex`
- Create: `c:\Users\shaun\campusly-tikz-renderer\templates\pictograph.tex`

Each template is a standalone, compilable TikZ example that Claude will use as a reference when generating diagrams. The templates use placeholder comments to show where values should be customised.

- [ ] **Step 1: Create number-line template**

```latex
% templates/number-line.tex
% Number line with labeled points, tick marks, and optional intervals
% Adapt: change min/max, tick spacing, point positions, labels
\begin{tikzpicture}
  \draw[thick, -stealth] (-0.5,0) -- (6.5,0);
  % Major ticks
  \foreach \x in {0,1,...,6} {
    \draw (\x,0.15) -- (\x,-0.15) node[below] {$\x$};
  }
  % Minor ticks (quarters)
  \foreach \x in {0.25,0.5,...,5.75} {
    \draw (\x,0.08) -- (\x,-0.08);
  }
  % Labeled point
  \fill[red] (2.75,0) circle (3pt);
  \node[above, red, font=\bfseries] at (2.75,0.2) {$P$};
\end{tikzpicture}
```

- [ ] **Step 2: Create cartesian-graph template**

```latex
% templates/cartesian-graph.tex
% Cartesian plane with function plot, labeled points, asymptotes
% Adapt: change domain, function expression, point labels
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    xlabel={$x$}, ylabel={$y$},
    xmin=-4, xmax=8, ymin=-6, ymax=6,
    grid=major,
    grid style={gray!30},
    width=12cm, height=9cm,
    samples=200,
    legend pos=north west,
  ]
    % Function plot
    \addplot[domain=-2:7, thick, blue] {-(x-3)^2 + 4};
    \addlegendentry{$f(x)=-(x-3)^2+4$}

    % Labeled points
    \addplot[only marks, mark=*, mark size=2.5pt, blue] coordinates {(1,0)(5,0)(3,4)};
    \node[above right, blue] at (axis cs:3,4) {$T(3;\,4)$};
    \node[below left, blue] at (axis cs:1,0) {$(1;\,0)$};
    \node[below right, blue] at (axis cs:5,0) {$(5;\,0)$};
  \end{axis}
\end{tikzpicture}
```

- [ ] **Step 3: Create triangle template**

```latex
% templates/triangle.tex
% Triangle with labeled vertices, sides, and angles
% Adapt: change coordinates, labels, angle marks, measurements
\begin{tikzpicture}[scale=1.2]
  % Vertices
  \coordinate[label=above:$A$] (A) at (2,3);
  \coordinate[label=below left:$B$] (B) at (0,0);
  \coordinate[label=below right:$C$] (C) at (5,0);

  % Draw triangle
  \draw[thick] (A) -- (B) -- (C) -- cycle;

  % Right angle mark at B
  \draw (B) ++(0,0.4) -- ++(0.4,0) -- ++(0,-0.4);

  % Side labels
  \node[midway, left] at ($(A)!0.5!(B)$) {$5\,\text{cm}$};
  \node[midway, below] at ($(B)!0.5!(C)$) {$12\,\text{cm}$};
  \node[midway, right] at ($(A)!0.5!(C)$) {$13\,\text{cm}$};

  % Angle mark at A
  \pic[draw, angle radius=0.6cm, "$\theta$", angle eccentricity=1.4] {angle=C--A--B};
\end{tikzpicture}
```

- [ ] **Step 4: Create circle-geometry template**

```latex
% templates/circle-geometry.tex
% Circle with centre, chords, tangents, angle theorems
% Adapt: change points, theorem type, angle labels
\begin{tikzpicture}[scale=1.5]
  % Circle
  \coordinate (O) at (0,0);
  \draw[thick] (O) circle (2);

  % Points on circle
  \coordinate[label=above right:$A$] (A) at (60:2);
  \coordinate[label=below right:$B$] (B) at (-20:2);
  \coordinate[label=below left:$C$] (C) at (200:2);
  \coordinate[label=above left:$D$] (D) at (140:2);

  % Chord and lines
  \draw[thick] (A) -- (B) -- (C) -- (D) -- cycle;

  % Centre point
  \fill (O) circle (1.5pt) node[below right] {$O$};

  % Angle arc
  \pic[draw, angle radius=0.5cm, "$x$"] {angle=B--A--D};
  \pic[draw, angle radius=0.5cm, "$x$"] {angle=B--C--D};

  % Theorem annotation
  \node[below, font=\small\itshape] at (0,-2.5) {Angles in the same segment are equal};
\end{tikzpicture}
```

- [ ] **Step 5: Create venn-diagram template**

```latex
% templates/venn-diagram.tex
% Venn diagram with 2-3 sets, labels, shaded regions
% Adapt: change set labels, values, shading
\begin{tikzpicture}
  % Universal set
  \draw[thick, rounded corners] (-3.5,-2.5) rectangle (3.5,2.5);
  \node[anchor=north west] at (-3.4,2.4) {$\mathcal{U}$};

  % Sets
  \draw[thick, fill=blue!10] (-0.8,0) circle (1.8) node[above left, xshift=-0.5cm, yshift=0.8cm] {$A$};
  \draw[thick, fill=red!10] (0.8,0) circle (1.8) node[above right, xshift=0.5cm, yshift=0.8cm] {$B$};

  % Values
  \node at (-1.6,0) {\large $30$};
  \node at (0,0) {\large $15$};
  \node at (1.6,0) {\large $15$};
  \node at (2.8,-1.8) {\large $20$};
\end{tikzpicture}
```

- [ ] **Step 6: Create trig-graph template**

```latex
% templates/trig-graph.tex
% Trigonometric function graphs with period, amplitude, shift
% Adapt: change function, domain, amplitude, labels
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    xlabel={$x$}, ylabel={$y$},
    xmin=-200, xmax=380,
    ymin=-2.5, ymax=2.5,
    xtick={-180,-90,0,90,180,270,360},
    xticklabels={$-180°$,$-90°$,$0°$,$90°$,$180°$,$270°$,$360°$},
    ytick={-2,-1,0,1,2},
    grid=major,
    grid style={gray!30},
    width=14cm, height=7cm,
    samples=300,
    legend pos=north east,
  ]
    \addplot[domain=-180:360, thick, blue] {2*sin(x)};
    \addlegendentry{$f(x)=2\sin x$}

    \addplot[domain=-180:360, thick, red, dashed] {cos(x-30)};
    \addlegendentry{$g(x)=\cos(x-30°)$}
  \end{axis}
\end{tikzpicture}
```

- [ ] **Step 7: Create box-whisker template**

```latex
% templates/box-whisker.tex
% Box-and-whisker plot with five-number summary
% Adapt: change data values, labels
\begin{tikzpicture}
  \begin{axis}[
    width=14cm, height=4cm,
    xmin=5, xmax=55,
    ytick=\empty,
    axis y line=none,
    axis x line=bottom,
    xlabel={Marks},
    xtick={10,20,30,40,50},
  ]
    \addplot+[
      boxplot prepared={
        lower whisker=12,
        lower quartile=22,
        median=32,
        upper quartile=38,
        upper whisker=47,
      },
      boxplot/draw direction=x,
      black, thick, fill=blue!15,
    ] coordinates {};

    % Labels
    \node[above] at (axis cs:12,0.6) {\small $12$};
    \node[above] at (axis cs:22,0.6) {\small $Q_1=22$};
    \node[above, red] at (axis cs:32,0.6) {\small $M=32$};
    \node[above] at (axis cs:38,0.6) {\small $Q_3=38$};
    \node[above] at (axis cs:47,0.6) {\small $47$};
  \end{axis}
\end{tikzpicture}
```

- [ ] **Step 8: Create remaining templates (bar-chart, transformation, geometric-construction, tree-diagram, scatter-plot, ogive, pie-chart, basic-shapes-2d, shapes-with-measurements, shape-nets-3d, pictograph)**

Create each of the remaining 11 template files following the same pattern. Each must be a complete, compilable TikZ snippet with comment-documented adaptation points. Key templates:

```latex
% templates/bar-chart.tex
\begin{tikzpicture}
  \begin{axis}[
    ybar, bar width=0.8cm,
    xlabel={Category}, ylabel={Frequency},
    symbolic x coords={Mon,Tue,Wed,Thu,Fri},
    xtick=data,
    ymin=0, ymax=30,
    width=12cm, height=7cm,
    nodes near coords,
  ]
    \addplot[fill=blue!40] coordinates {(Mon,15)(Tue,22)(Wed,18)(Thu,25)(Fri,12)};
  \end{axis}
\end{tikzpicture}
```

```latex
% templates/transformation.tex
\begin{tikzpicture}[scale=0.8]
  \draw[help lines, gray!30] (-5,-4) grid (5,4);
  \draw[thick, -stealth] (-5,0) -- (5,0) node[right] {$x$};
  \draw[thick, -stealth] (0,-4) -- (0,4) node[above] {$y$};

  % Original triangle
  \draw[thick, blue, fill=blue!10] (1,1) -- (3,1) -- (2,3) -- cycle;
  \node[blue, right] at (3,1) {$A$};
  \node[blue, right] at (2,3) {$B$};
  \node[blue, left] at (1,1) {$C$};

  % Reflected triangle (in y-axis)
  \draw[thick, red, dashed, fill=red!10] (-1,1) -- (-3,1) -- (-2,3) -- cycle;
  \node[red, left] at (-3,1) {$A'$};
  \node[red, left] at (-2,3) {$B'$};
  \node[red, right] at (-1,1) {$C'$};

  % Reflection arrows
  \draw[dotted, gray] (1,1) -- (-1,1);
  \draw[dotted, gray] (3,1) -- (-3,1);
  \draw[dotted, gray] (2,3) -- (-2,3);
\end{tikzpicture}
```

```latex
% templates/scatter-plot.tex
\begin{tikzpicture}
  \begin{axis}[
    xlabel={Height (cm)}, ylabel={Mass (kg)},
    xmin=140, xmax=200, ymin=40, ymax=100,
    grid=major, grid style={gray!30},
    width=12cm, height=8cm,
    only marks, mark=*, mark size=2pt,
  ]
    \addplot[blue] coordinates {(150,52)(155,58)(160,60)(165,65)(170,68)(175,72)(180,78)(185,80)(190,85)};
    % Line of best fit
    \addplot[red, thick, no markers, domain=145:195] {0.7*x - 53};
  \end{axis}
\end{tikzpicture}
```

```latex
% templates/ogive.tex
\begin{tikzpicture}
  \begin{axis}[
    xlabel={Marks}, ylabel={Cumulative Frequency},
    xmin=0, xmax=100, ymin=0, ymax=50,
    grid=major, grid style={gray!30},
    width=12cm, height=8cm,
    mark=*, thick,
  ]
    \addplot[blue, mark=*] coordinates {(10,2)(20,5)(30,12)(40,22)(50,33)(60,40)(70,44)(80,47)(90,49)(100,50)};
  \end{axis}
\end{tikzpicture}
```

```latex
% templates/pie-chart.tex
\begin{tikzpicture}
  \pie[text=legend, radius=2.5, color={blue!40, red!40, green!40, orange!40, purple!40}]{
    35/Soccer,
    25/Cricket,
    20/Netball,
    12/Swimming,
    8/Athletics
  }
\end{tikzpicture}
```

```latex
% templates/geometric-construction.tex
\begin{tikzpicture}[scale=1.2]
  \tkzDefPoint(0,0){A}
  \tkzDefPoint(5,0){B}
  \tkzDefMidPoint(A,B) \tkzGetPoint{M}

  % Perpendicular bisector construction arcs
  \tkzDrawCircle[dashed, gray](A,B)
  \tkzDrawCircle[dashed, gray](B,A)

  % Intersection points
  \tkzInterCC(A,B)(B,A) \tkzGetPoints{C}{D}

  % Perpendicular bisector line
  \tkzDrawLine[thick, red, add=0.2 and 0.2](C,D)

  % Original segment
  \tkzDrawSegment[thick](A,B)

  % Points and labels
  \tkzDrawPoints(A,B,M,C,D)
  \tkzLabelPoints[below](A,B)
  \tkzLabelPoint[below](M){$M$}

  % Right angle mark
  \tkzMarkRightAngle[size=0.3](A,M,C)
\end{tikzpicture}
```

```latex
% templates/tree-diagram.tex
\begin{tikzpicture}[
  grow=right,
  level 1/.style={sibling distance=2.5cm, level distance=3cm},
  level 2/.style={sibling distance=1.2cm, level distance=3cm},
  edge from parent/.style={draw, -latex},
  every node/.style={font=\small},
]
  \node {Start}
    child { node {Heads}
      child { node {HH} edge from parent node[above] {$\frac{1}{2}$} }
      child { node {HT} edge from parent node[below] {$\frac{1}{2}$} }
      edge from parent node[above] {$\frac{1}{2}$}
    }
    child { node {Tails}
      child { node {TH} edge from parent node[above] {$\frac{1}{2}$} }
      child { node {TT} edge from parent node[below] {$\frac{1}{2}$} }
      edge from parent node[below] {$\frac{1}{2}$}
    };
\end{tikzpicture}
```

```latex
% templates/basic-shapes-2d.tex
\begin{tikzpicture}[scale=1]
  % Square
  \draw[thick, fill=blue!10] (0,0) rectangle (3,3);
  \node at (1.5,1.5) {Square};
  \node[below] at (1.5,0) {$3\,\text{cm}$};

  % Circle
  \draw[thick, fill=red!10] (6,1.5) circle (1.5);
  \node at (6,1.5) {Circle};
  \draw[dashed] (6,1.5) -- (7.5,1.5) node[midway, above] {$r$};
\end{tikzpicture}
```

```latex
% templates/shapes-with-measurements.tex
\begin{tikzpicture}[scale=0.8]
  % Rectangle with dimensions
  \draw[thick, fill=green!10] (0,0) rectangle (6,4);

  % Dimension arrows
  \draw[|<->|] (0,-0.5) -- (6,-0.5) node[midway, below] {$12\,\text{cm}$};
  \draw[|<->|] (-0.5,0) -- (-0.5,4) node[midway, left] {$8\,\text{cm}$};

  % Area label
  \node at (3,2) {$A = l \times b$};
\end{tikzpicture}
```

```latex
% templates/shape-nets-3d.tex
\begin{tikzpicture}[scale=0.8]
  % Cube net (cross shape)
  \draw[thick, fill=blue!10] (0,0) rectangle (2,2); % bottom
  \draw[thick, fill=blue!10] (0,2) rectangle (2,4); % front
  \draw[thick, fill=blue!10] (0,4) rectangle (2,6); % top
  \draw[thick, fill=blue!10] (-2,2) rectangle (0,4); % left
  \draw[thick, fill=blue!10] (2,2) rectangle (4,4); % right
  \draw[thick, fill=blue!10] (0,6) rectangle (2,8); % back

  % Fold lines
  \draw[dashed, gray] (0,2) -- (2,2);
  \draw[dashed, gray] (0,4) -- (2,4);
  \draw[dashed, gray] (0,6) -- (2,6);
  \draw[dashed, gray] (0,2) -- (0,4);
  \draw[dashed, gray] (2,2) -- (2,4);

  \node[below] at (1,0) {Net of a cube};
\end{tikzpicture}
```

```latex
% templates/pictograph.tex
\begin{tikzpicture}
  % Title
  \node[font=\bfseries] at (3,4.5) {Favourite Fruits};

  % Key: each symbol = 2 learners
  \node[font=\small] at (3,-0.5) {Key: \faApple\ = 2 learners};

  % Categories and symbols (using text as stand-in for actual pictograph)
  \foreach \y/\label/\count in {3/Apples/5, 2/Bananas/3, 1/Oranges/4} {
    \node[left] at (0,\y) {\label};
    \foreach \x in {1,...,\count} {
      \node at (\x*0.8, \y) {$\bullet$};
    }
  }
\end{tikzpicture}
```

- [ ] **Step 9: Commit**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && git add -A && git commit -m "feat: add all 18 verified TikZ templates for CAPS math diagram types"
```

---

## Task 5: Backend — Data Model Changes

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\model.ts:47-87` (add IDiagram interface, diagram schema, update IQuestion)
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\model.ts:7-48` (add diagram to IPaperQuestion + schema)

- [ ] **Step 1: Add diagram interfaces and schema to QuestionBank model**

In `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\model.ts`, add after the `IQuestionMedia` interface (after line 50) and before `IQuestionOption`:

```typescript
// Add after line 50 (after IQuestionMedia interface)

export const DIAGRAM_RENDER_STATUSES = ['pending', 'rendered', 'failed'] as const;
export type DiagramRenderStatus = (typeof DIAGRAM_RENDER_STATUSES)[number];

export interface IDiagram {
  tikz: string;
  data: Record<string, unknown>;   // DiagramData — typed on frontend, loose on backend
  alt: string;
  svgUrl: string | null;
  pdfUrl: string | null;
  hash: string;
  renderStatus: DiagramRenderStatus;
  renderError: string | null;
}
```

Then update `IQuestion` (line 63-87) to add the `diagram` field after `media`:

```typescript
// Add after line 70 (after media: IQuestionMedia[];)
  diagram: IDiagram | null;
```

Then add the diagram Mongoose schema after the `questionMediaSchema` (after line 162) and before `questionOptionSchema`:

```typescript
// Add after line 162 (after questionMediaSchema)

const diagramSchema = new Schema<IDiagram>(
  {
    tikz: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    alt: { type: String, required: true },
    svgUrl: { type: String, default: null },
    pdfUrl: { type: String, default: null },
    hash: { type: String, required: true },
    renderStatus: { type: String, enum: DIAGRAM_RENDER_STATUSES, default: 'pending' },
    renderError: { type: String, default: null },
  },
  { _id: false },
);
```

Then update the `questionSchema` (line 181-210) to include the diagram field after `media`:

```typescript
// Add after line 193 (after media: { type: [questionMediaSchema], default: [] },)
    diagram: { type: diagramSchema, default: null },
```

- [ ] **Step 2: Add diagram to AITools GeneratedPaper model**

In `c:\Users\shaun\campusly-backend\src\modules\AITools\model.ts`, update `IPaperQuestion` (line 7-13):

```typescript
export interface IPaperQuestion {
  questionNumber: number;
  questionText: string;
  marks: number;
  modelAnswer: string;
  markingGuideline: string;
  diagram: {
    tikz: string;
    data: Record<string, unknown>;
    alt: string;
    svgUrl: string | null;
    hash: string;
    renderStatus: 'pending' | 'rendered' | 'failed';
    renderError: string | null;
  } | null;
}
```

Then update `paperQuestionSchema` (line 39-48):

```typescript
const paperQuestionSchema = new Schema<IPaperQuestion>(
  {
    questionNumber: { type: Number, required: true },
    questionText: { type: String, required: true },
    marks: { type: Number, required: true },
    modelAnswer: { type: String, required: true },
    markingGuideline: { type: String, required: true },
    diagram: {
      type: new Schema(
        {
          tikz: { type: String, required: true },
          data: { type: Schema.Types.Mixed, default: {} },
          alt: { type: String, required: true },
          svgUrl: { type: String, default: null },
          hash: { type: String, required: true },
          renderStatus: { type: String, enum: ['pending', 'rendered', 'failed'], default: 'pending' },
          renderError: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { _id: false },
);
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/QuestionBank/model.ts src/modules/AITools/model.ts && git commit -m "feat: add diagram field to Question and GeneratedPaper models"
```

---

## Task 6: Backend — TikZ Template Constants for AI Prompts

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\lib\tikz-templates.ts`

- [ ] **Step 1: Create template constants file**

This file holds the TikZ templates as strings, grouped by diagram type, for injection into AI prompts. The templates are the same as the `.tex` files in the renderer but stored as TypeScript constants so the AI prompt builder can access them.

```typescript
// src/lib/tikz-templates.ts

export interface TikzTemplate {
  name: string;
  diagramType: string;
  grades: [number, number]; // [min, max] grade range
  packages: string[];
  template: string;
  description: string;
}

export const TIKZ_TEMPLATES: TikzTemplate[] = [
  {
    name: 'number_line',
    diagramType: 'number_line',
    grades: [1, 9],
    packages: [],
    description: 'Number line with labeled points and tick marks',
    template: `\\begin{tikzpicture}
  \\draw[thick, -stealth] ({MIN-0.5},0) -- ({MAX+0.5},0);
  \\foreach \\x in {{MIN},...,{MAX}} {
    \\draw (\\x,0.15) -- (\\x,-0.15) node[below] {$\\x$};
  }
  % Add points: \\fill[red] (VALUE,0) circle (3pt); \\node[above, red] at (VALUE,0.2) {LABEL};
\\end{tikzpicture}`,
  },
  {
    name: 'cartesian_graph',
    diagramType: 'cartesian_graph',
    grades: [7, 12],
    packages: ['pgfplots'],
    description: 'Cartesian plane with function plots, labeled points, asymptotes',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    axis lines=middle, xlabel={$x$}, ylabel={$y$},
    xmin={XMIN}, xmax={XMAX}, ymin={YMIN}, ymax={YMAX},
    grid=major, grid style={gray!30},
    width=12cm, height=9cm, samples=200,
  ]
    \\addplot[domain={DOMAIN}, thick, blue] {{FUNCTION}};
    % Points: \\addplot[only marks, mark=*, mark size=2.5pt] coordinates {(X,Y)};
    % Labels: \\node[above right] at (axis cs:X,Y) {LABEL};
    % Asymptotes: \\draw[dashed, red] (axis cs:X,{YMIN}) -- (axis cs:X,{YMAX});
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'triangle',
    diagramType: 'triangle',
    grades: [4, 12],
    packages: [],
    description: 'Triangle with labeled vertices, sides, angles, and measurements',
    template: `\\begin{tikzpicture}[scale=1.2]
  \\coordinate[label=above:$A$] (A) at ({AX},{AY});
  \\coordinate[label=below left:$B$] (B) at ({BX},{BY});
  \\coordinate[label=below right:$C$] (C) at ({CX},{CY});
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  % Right angle: \\draw (B) ++(0,0.4) -- ++(0.4,0) -- ++(0,-0.4);
  % Side labels: \\node[midway, left] at ($(A)!0.5!(B)$) {LENGTH};
  % Angle: \\pic[draw, angle radius=0.6cm, "LABEL", angle eccentricity=1.4] {angle=C--A--B};
\\end{tikzpicture}`,
  },
  {
    name: 'circle_geometry',
    diagramType: 'circle_geometry',
    grades: [9, 12],
    packages: [],
    description: 'Circle with centre, points, chords, tangents, theorem labels',
    template: `\\begin{tikzpicture}[scale=1.5]
  \\coordinate (O) at (0,0);
  \\draw[thick] (O) circle ({RADIUS});
  \\fill (O) circle (1.5pt) node[below right] {$O$};
  % Points on circle: \\coordinate[label=POSITION:LABEL] (P) at (ANGLE:{RADIUS});
  % Chords: \\draw[thick] (A) -- (B);
  % Tangent: \\draw[thick] (P) -- (EXTERNAL);
  % Angle: \\pic[draw, angle radius=0.5cm, "LABEL"] {angle=B--A--D};
\\end{tikzpicture}`,
  },
  {
    name: 'venn_diagram',
    diagramType: 'venn_diagram',
    grades: [7, 12],
    packages: [],
    description: 'Venn diagram with 2-3 sets, labeled regions, shading',
    template: `\\begin{tikzpicture}
  \\draw[thick, rounded corners] (-3.5,-2.5) rectangle (3.5,2.5);
  \\node[anchor=north west] at (-3.4,2.4) {$\\mathcal{U}$};
  \\draw[thick, fill=blue!10] (-0.8,0) circle (1.8) node[above left, xshift=-0.5cm, yshift=0.8cm] {{SET_A_LABEL}};
  \\draw[thick, fill=red!10] (0.8,0) circle (1.8) node[above right, xshift=0.5cm, yshift=0.8cm] {{SET_B_LABEL}};
  % Values: \\node at (X,Y) {VALUE};
  % Shading intersection: use clip paths
\\end{tikzpicture}`,
  },
  {
    name: 'trig_graph',
    diagramType: 'trig_graph',
    grades: [10, 12],
    packages: ['pgfplots'],
    description: 'Trigonometric function graphs with period, amplitude, shift',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    axis lines=middle, xlabel={$x$}, ylabel={$y$},
    xmin=-200, xmax=380, ymin={YMIN}, ymax={YMAX},
    xtick={-180,-90,0,90,180,270,360},
    xticklabels={$-180°$,$-90°$,$0°$,$90°$,$180°$,$270°$,$360°$},
    grid=major, grid style={gray!30},
    width=14cm, height=7cm, samples=300,
    legend pos=north east,
  ]
    \\addplot[domain=-180:360, thick, blue] {{FUNCTION_1}};
    \\addlegendentry{$LABEL_1$}
    % Second function: \\addplot[domain=-180:360, thick, red, dashed] {{FUNCTION_2}};
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'box_whisker',
    diagramType: 'box_whisker',
    grades: [10, 12],
    packages: ['pgfplots'],
    description: 'Box-and-whisker plot with five-number summary',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    width=14cm, height=4cm,
    xmin={XMIN}, xmax={XMAX},
    ytick=\\empty, axis y line=none, axis x line=bottom,
    xlabel={{XLABEL}},
  ]
    \\addplot+[
      boxplot prepared={
        lower whisker={MIN},
        lower quartile={Q1},
        median={MEDIAN},
        upper quartile={Q3},
        upper whisker={MAX},
      },
      boxplot/draw direction=x,
      black, thick, fill=blue!15,
    ] coordinates {};
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'bar_chart',
    diagramType: 'bar_chart',
    grades: [3, 9],
    packages: ['pgfplots'],
    description: 'Bar chart with categories and values',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    ybar, bar width=0.8cm,
    xlabel={{XLABEL}}, ylabel={{YLABEL}},
    symbolic x coords={{CATEGORIES}},
    xtick=data, ymin=0, ymax={YMAX},
    width=12cm, height=7cm,
    nodes near coords,
  ]
    \\addplot[fill=blue!40] coordinates {{DATA}};
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'transformation',
    diagramType: 'transformation',
    grades: [7, 9],
    packages: [],
    description: 'Transformation geometry on Cartesian plane',
    template: `\\begin{tikzpicture}[scale=0.8]
  \\draw[help lines, gray!30] (-5,-4) grid (5,4);
  \\draw[thick, -stealth] (-5,0) -- (5,0) node[right] {$x$};
  \\draw[thick, -stealth] (0,-4) -- (0,4) node[above] {$y$};
  % Original shape: \\draw[thick, blue, fill=blue!10] (X1,Y1) -- (X2,Y2) -- ... -- cycle;
  % Transformed shape: \\draw[thick, red, dashed, fill=red!10] (X1',Y1') -- ... -- cycle;
  % Labels and reflection arrows as needed
\\end{tikzpicture}`,
  },
  {
    name: 'geometric_construction',
    diagramType: 'construction',
    grades: [7, 9],
    packages: ['tkz-euclide'],
    description: 'Geometric construction with compass arcs and straightedge',
    template: `\\begin{tikzpicture}[scale=1.2]
  \\tkzDefPoint(0,0){A}
  \\tkzDefPoint(5,0){B}
  % Construction steps using tkz-euclide commands
  % \\tkzDrawCircle, \\tkzInterCC, \\tkzDrawLine, \\tkzMarkRightAngle
  \\tkzDrawSegment[thick](A,B)
  \\tkzDrawPoints(A,B)
  \\tkzLabelPoints[below](A,B)
\\end{tikzpicture}`,
  },
  {
    name: 'tree_diagram',
    diagramType: 'tree_diagram',
    grades: [10, 12],
    packages: [],
    description: 'Probability tree diagram with branch labels',
    template: `\\begin{tikzpicture}[
  grow=right,
  level 1/.style={sibling distance=2.5cm, level distance=3cm},
  level 2/.style={sibling distance=1.2cm, level distance=3cm},
  edge from parent/.style={draw, -latex},
  every node/.style={font=\\small},
]
  \\node {Start}
    child { node {{OUTCOME_1}}
      child { node {{OUTCOME_1_1}} edge from parent node[above] {{PROB}} }
      child { node {{OUTCOME_1_2}} edge from parent node[below] {{PROB}} }
      edge from parent node[above] {{PROB}}
    }
    child { node {{OUTCOME_2}}
      child { node {{OUTCOME_2_1}} edge from parent node[above] {{PROB}} }
      child { node {{OUTCOME_2_2}} edge from parent node[below] {{PROB}} }
      edge from parent node[below] {{PROB}}
    };
\\end{tikzpicture}`,
  },
  {
    name: 'scatter_plot',
    diagramType: 'scatter_plot',
    grades: [10, 12],
    packages: ['pgfplots'],
    description: 'Scatter plot with optional line of best fit',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    xlabel={{XLABEL}}, ylabel={{YLABEL}},
    xmin={XMIN}, xmax={XMAX}, ymin={YMIN}, ymax={YMAX},
    grid=major, grid style={gray!30},
    width=12cm, height=8cm,
    only marks, mark=*, mark size=2pt,
  ]
    \\addplot[blue] coordinates {{DATA}};
    % Line of best fit: \\addplot[red, thick, no markers, domain=XMIN:XMAX] {EQUATION};
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'ogive',
    diagramType: 'ogive',
    grades: [11, 12],
    packages: ['pgfplots'],
    description: 'Ogive (cumulative frequency curve)',
    template: `\\begin{tikzpicture}
  \\begin{axis}[
    xlabel={{XLABEL}}, ylabel={Cumulative Frequency},
    xmin={XMIN}, xmax={XMAX}, ymin=0, ymax={YMAX},
    grid=major, grid style={gray!30},
    width=12cm, height=8cm,
    mark=*, thick,
  ]
    \\addplot[blue, mark=*] coordinates {{DATA}};
  \\end{axis}
\\end{tikzpicture}`,
  },
  {
    name: 'pie_chart',
    diagramType: 'pie_chart',
    grades: [4, 7],
    packages: [],
    description: 'Pie chart with labeled sectors',
    template: `\\begin{tikzpicture}
  % Manual pie chart using \\fill and arc
  % Each sector: \\fill[color] (0,0) -- (START_ANGLE:RADIUS) arc (START_ANGLE:END_ANGLE:RADIUS) -- cycle;
  % Labels: \\node at (MID_ANGLE:RADIUS*0.6) {LABEL};
\\end{tikzpicture}`,
  },
  {
    name: 'basic_shapes_2d',
    diagramType: 'geometric_shape',
    grades: [1, 6],
    packages: [],
    description: 'Basic 2D shapes with labels',
    template: `\\begin{tikzpicture}[scale=1]
  % Square: \\draw[thick, fill=blue!10] (0,0) rectangle (W,H);
  % Circle: \\draw[thick] (CX,CY) circle (R);
  % Triangle: \\draw[thick] (X1,Y1) -- (X2,Y2) -- (X3,Y3) -- cycle;
  % Labels: \\node at (X,Y) {TEXT};
\\end{tikzpicture}`,
  },
  {
    name: 'shapes_with_measurements',
    diagramType: 'geometric_shape',
    grades: [4, 9],
    packages: [],
    description: '2D shapes with dimension arrows and measurements',
    template: `\\begin{tikzpicture}[scale=0.8]
  \\draw[thick, fill=green!10] (0,0) rectangle ({WIDTH},{HEIGHT});
  \\draw[|<->|] (0,-0.5) -- ({WIDTH},-0.5) node[midway, below] {{WIDTH_LABEL}};
  \\draw[|<->|] (-0.5,0) -- (-0.5,{HEIGHT}) node[midway, left] {{HEIGHT_LABEL}};
\\end{tikzpicture}`,
  },
  {
    name: 'shape_nets_3d',
    diagramType: 'shape_3d',
    grades: [4, 6],
    packages: [],
    description: '3D shape nets (unfolded)',
    template: `\\begin{tikzpicture}[scale=0.8]
  % Draw connected faces as rectangles/triangles
  % Use dashed lines for fold edges
  % Label: \\node[below] at (X,Y) {Net of SHAPE};
\\end{tikzpicture}`,
  },
  {
    name: 'pictograph',
    diagramType: 'pictograph',
    grades: [1, 4],
    packages: [],
    description: 'Pictograph with symbols representing quantities',
    template: `\\begin{tikzpicture}
  \\node[font=\\bfseries] at (3,{TITLE_Y}) {{TITLE}};
  \\node[font=\\small] at (3,-0.5) {Key: $\\bullet$ = {KEY_VALUE}};
  % Rows: \\node[left] at (0,ROW_Y) {CATEGORY};
  % Symbols: \\foreach \\x in {1,...,COUNT} { \\node at (\\x*0.8, ROW_Y) {$\\bullet$}; }
\\end{tikzpicture}`,
  },
];

/**
 * Get templates relevant to a specific grade level.
 */
export function getTemplatesForGrade(grade: number): TikzTemplate[] {
  return TIKZ_TEMPLATES.filter((t) => grade >= t.grades[0] && grade <= t.grades[1]);
}

/**
 * Get a specific template by diagram type.
 */
export function getTemplateByType(diagramType: string): TikzTemplate | undefined {
  return TIKZ_TEMPLATES.find((t) => t.diagramType === diagramType);
}

/**
 * Format templates for AI prompt injection.
 */
export function formatTemplatesForPrompt(templates: TikzTemplate[]): string {
  return templates
    .map((t) => [
      `### ${t.name} (${t.description})`,
      `Packages: ${t.packages.length > 0 ? t.packages.join(', ') : 'none'}`,
      '```latex',
      t.template,
      '```',
    ].join('\n'))
    .join('\n\n');
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/lib/tikz-templates.ts && git commit -m "feat: add TikZ template constants for AI prompt injection"
```

---

## Task 7: Backend — Diagram Rendering Service Client + Reliability System

**Files:**
- Create: `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-diagram.ts`

- [ ] **Step 1: Create diagram service with 5-layer reliability**

```typescript
// src/modules/QuestionBank/service-diagram.ts
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { logger } from '../../common/logger.js';
import { AIService } from '../../services/ai.service.js';

const TIKZ_RENDERER_URL = process.env.TIKZ_RENDERER_URL || 'http://localhost:3600';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const DIAGRAM_DIR = 'diagrams';
const MAX_RETRY_ATTEMPTS = 3;

export interface DiagramInput {
  tikz: string;
  data: Record<string, unknown>;
  alt: string;
}

export interface DiagramResult {
  tikz: string;
  data: Record<string, unknown>;
  alt: string;
  svgUrl: string;
  pdfUrl: string | null;
  hash: string;
  renderStatus: 'rendered';
  renderError: null;
}

export interface DiagramFailure {
  tikz: string;
  data: Record<string, unknown>;
  alt: string;
  svgUrl: null;
  pdfUrl: null;
  hash: string;
  renderStatus: 'failed';
  renderError: string;
}

function hashTikz(tikz: string): string {
  return createHash('sha256').update(tikz).digest('hex');
}

/**
 * Layer 1 check: basic TikZ structural validation before sending to renderer.
 */
function quickValidate(tikz: string): string[] {
  const errors: string[] = [];
  if (!tikz.includes('\\begin{tikzpicture}') && !tikz.includes('\\begin{axis}')) {
    errors.push('Missing tikzpicture or axis environment');
  }
  const forbidden = ['\\input', '\\include', '\\write', '\\immediate', '\\ShellEscape'];
  for (const cmd of forbidden) {
    if (tikz.includes(cmd)) errors.push(`Forbidden command: ${cmd}`);
  }
  return errors;
}

/**
 * Call the TikZ renderer service HTTP API.
 */
async function callRenderer(tikz: string, packages?: string[]): Promise<{
  success: boolean;
  svg?: string;
  hash?: string;
  error?: string;
  log?: string;
}> {
  try {
    const response = await fetch(`${TIKZ_RENDERER_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tikz, packages }),
      signal: AbortSignal.timeout(15_000),
    });

    const body = await response.json() as Record<string, unknown>;

    if (response.ok && typeof body.svg === 'string') {
      return { success: true, svg: body.svg as string, hash: body.hash as string };
    }

    return {
      success: false,
      error: (body.error as string) ?? 'Unknown render error',
      log: (body.log as string) ?? '',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Renderer unreachable';
    return { success: false, error: message, log: '' };
  }
}

/**
 * Layer 3: Ask Claude to fix broken TikZ using the error log.
 */
async function askClaudeToFix(
  originalTikz: string,
  errorLog: string,
  attempt: number,
): Promise<string> {
  const strictness = attempt >= 3
    ? 'Use ONLY the most basic TikZ commands. No custom macros. No complex nesting. Keep it as simple as possible.'
    : 'Fix the compilation error while preserving the diagram intent.';

  const systemPrompt = [
    'You are a LaTeX/TikZ expert. The following TikZ code failed to compile.',
    'Fix the error and return ONLY the corrected TikZ code.',
    'Do not include \\documentclass, \\usepackage, or \\begin{document} — only the \\begin{tikzpicture}...\\end{tikzpicture} block.',
    strictness,
  ].join(' ');

  const userPrompt = [
    'Original TikZ code:',
    '```',
    originalTikz,
    '```',
    '',
    'Compilation error:',
    '```',
    errorLog.slice(0, 2000),
    '```',
    '',
    'Return ONLY the fixed TikZ code, nothing else.',
  ].join('\n');

  const response = await AIService.generateCompletion(systemPrompt, userPrompt, {
    maxTokens: 4096,
    temperature: 0.2,
  });

  // Extract TikZ block from response
  const tikzMatch = response.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
  if (tikzMatch) return tikzMatch[0];

  const axisMatch = response.match(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/);
  if (axisMatch) return axisMatch[0];

  // If no block found, return the cleaned response hoping it's TikZ
  return response.replace(/```(?:latex)?/g, '').replace(/```/g, '').trim();
}

/**
 * Save SVG to disk and return the URL path.
 */
async function saveSvg(svg: string, hash: string): Promise<string> {
  const dir = join(UPLOAD_DIR, DIAGRAM_DIR);
  await mkdir(dir, { recursive: true });
  const filename = `${hash}.svg`;
  await writeFile(join(dir, filename), svg, 'utf-8');
  return `/uploads/${DIAGRAM_DIR}/${filename}`;
}

/**
 * Main entry point: render a diagram with the full 5-layer reliability system.
 */
export async function renderDiagram(
  input: DiagramInput,
): Promise<DiagramResult | DiagramFailure> {
  const hash = hashTikz(input.tikz);
  let currentTikz = input.tikz;
  let lastError = '';
  let lastLog = '';

  // Layer 2: Quick validation
  const validationErrors = quickValidate(currentTikz);
  if (validationErrors.length > 0) {
    logger.warn(`[DiagramService] Validation errors: ${validationErrors.join(', ')}`);
    // Don't fail — let the renderer try, it has its own validation
  }

  // Attempts 1-3: render → fix → render → fix → render
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    logger.info(`[DiagramService] Render attempt ${attempt} for hash ${hash.slice(0, 8)}`);

    const result = await callRenderer(currentTikz);

    if (result.success && result.svg) {
      const svgUrl = await saveSvg(result.svg, hash);
      logger.info(`[DiagramService] Rendered successfully on attempt ${attempt}`);
      return {
        tikz: input.tikz, // Store original, not fixed version
        data: input.data,
        alt: input.alt,
        svgUrl,
        pdfUrl: null,
        hash,
        renderStatus: 'rendered',
        renderError: null,
      };
    }

    lastError = result.error ?? 'Unknown error';
    lastLog = result.log ?? '';

    // Layer 3: Ask Claude to fix (except on last attempt)
    if (attempt < MAX_RETRY_ATTEMPTS) {
      try {
        currentTikz = await askClaudeToFix(currentTikz, lastLog || lastError, attempt);
        logger.info(`[DiagramService] Claude provided fix for attempt ${attempt + 1}`);
      } catch (fixErr: unknown) {
        logger.error(`[DiagramService] Claude fix failed: ${fixErr instanceof Error ? fixErr.message : 'unknown'}`);
      }
    }
  }

  // Layer 4: All attempts failed — return failure (frontend shows alt text fallback)
  logger.error(`[DiagramService] All ${MAX_RETRY_ATTEMPTS} attempts failed for hash ${hash.slice(0, 8)}: ${lastError}`);

  return {
    tikz: input.tikz,
    data: input.data,
    alt: input.alt,
    svgUrl: null,
    pdfUrl: null,
    hash,
    renderStatus: 'failed',
    renderError: `${lastError}\n${lastLog}`.trim(),
  };
}

/**
 * Batch render multiple diagrams (for paper generation).
 */
export async function renderDiagrams(
  inputs: DiagramInput[],
): Promise<(DiagramResult | DiagramFailure)[]> {
  return Promise.all(inputs.map(renderDiagram));
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/QuestionBank/service-diagram.ts && git commit -m "feat: add diagram rendering service client with 5-layer reliability"
```

---

## Task 8: Backend — Update AI Question Generation Prompts

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-generation.ts:43-101`

- [ ] **Step 1: Update generateQuestions to include diagram prompts and post-process diagrams**

Replace the prompt building and document creation section in `service-generation.ts`. The key changes are:
1. Import tikz templates and diagram service
2. Inject relevant templates into the AI prompt
3. Parse diagram data from AI response
4. Render diagrams before saving questions

In `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\service-generation.ts`:

Add imports at the top (after line 6):

```typescript
import { getTemplatesForGrade, formatTemplatesForPrompt } from '../../lib/tikz-templates.js';
import { renderDiagram } from './service-diagram.js';
import type { DiagramInput } from './service-diagram.js';
```

Replace the system prompt (lines 43-52) with:

```typescript
    // ── Build prompt ──
    const gradeLevel = typeof data.gradeId === 'string' ? 0 : 0; // Grade number resolved below
    const templates = getTemplatesForGrade(data.gradeLevel ?? 7);
    const templateSection = templates.length > 0
      ? [
          '',
          'DIAGRAM INSTRUCTIONS:',
          'When a question benefits from a visual diagram (geometry, graphs, data, shapes, constructions, transformations, circle theorems), include a "diagram" field.',
          'The diagram field must have:',
          '  tikz (string) — TikZ code using \\begin{tikzpicture}...\\end{tikzpicture}. Use ONLY the templates below as your guide.',
          '  data (object) — JSON with "type" field matching the template name, plus relevant properties (coordinates, labels, values).',
          '  alt (string) — Complete accessibility text describing all visual elements.',
          '',
          'DIAGRAM RULES:',
          '- ALWAYS generate a diagram for: geometry, graph/function, transformation, circle theorem, data representation, trigonometry with triangles, analytical geometry, 3D shapes',
          '- NEVER generate a diagram for: pure algebra, simple arithmetic, purely textual word problems, probability calculations without Venn/tree',
          '- USE JUDGEMENT for: number lines, pattern questions, measurement questions',
          '',
          'If a question does NOT need a diagram, omit the "diagram" field entirely.',
          '',
          'AVAILABLE TIKZ TEMPLATES:',
          formatTemplatesForPrompt(templates),
        ].join('\n')
      : '';

    const systemPrompt = [
      'You are an expert assessment question creator for South African schools.',
      'You create questions aligned with the CAPS curriculum.',
      'Respond ONLY with a valid JSON array of question objects.',
      'Each object must have: stem (string), options (array of {label, text, isCorrect} for MCQ, empty array otherwise),',
      'answer (string with model answer), markingRubric (string), marks (number).',
      'Each object MAY have: diagram (object with tikz, data, alt) — include ONLY when the question needs a visual.',
      'For MCQ: provide 4 options with labels A-D, exactly one isCorrect: true.',
      'For true_false: provide 2 options with labels "True" and "False".',
      'For other types: leave options as empty array and provide detailed answer and markingRubric.',
      templateSection,
    ].join(' ');
```

Update the `parseAIQuestions` function and document creation to handle diagrams. Replace the `ParsedQuestion` interface (lines 147-153) and update `parseAIQuestions`:

```typescript
interface ParsedDiagram {
  tikz: string;
  data: Record<string, unknown>;
  alt: string;
}

interface ParsedQuestion {
  stem: string;
  options: IQuestionOption[];
  answer: string;
  markingRubric: string;
  marks: number;
  diagram: ParsedDiagram | null;
}
```

In the `parseAIQuestions` mapping (line 180-186), add diagram parsing:

```typescript
      const rawDiagram = q.diagram as Record<string, unknown> | undefined;
      const diagram: ParsedDiagram | null =
        rawDiagram && typeof rawDiagram.tikz === 'string'
          ? {
              tikz: rawDiagram.tikz,
              data: (rawDiagram.data as Record<string, unknown>) ?? {},
              alt: typeof rawDiagram.alt === 'string' ? rawDiagram.alt : '',
            }
          : null;

      return {
        stem: typeof q.stem === 'string' ? q.stem : 'Generated question',
        options,
        answer: typeof q.answer === 'string' ? q.answer : '',
        markingRubric: typeof q.markingRubric === 'string' ? q.markingRubric : '',
        marks: typeof q.marks === 'number' && q.marks >= 1 ? q.marks : data.difficulty,
        diagram,
      };
```

Update the document creation block (lines 80-98) to render diagrams before saving:

```typescript
    // ── Render diagrams ──
    const diagramInputs = parsed
      .map((q, i) => (q.diagram ? { index: i, input: q.diagram as DiagramInput } : null))
      .filter((d): d is { index: number; input: DiagramInput } => d !== null);

    const diagramResults = await Promise.all(
      diagramInputs.map((d) => renderDiagram(d.input)),
    );

    // Map results back to parsed questions
    const diagramMap = new Map<number, typeof diagramResults[number]>();
    diagramInputs.forEach((d, i) => diagramMap.set(d.index, diagramResults[i]));

    const docs = parsed.map((q, i) => {
      const diagramResult = diagramMap.get(i) ?? null;
      return {
        curriculumNodeId: cnoid,
        schoolId: soid,
        subjectId: suboid,
        gradeId: groid,
        type: data.type,
        stem: q.stem,
        media: [],
        diagram: diagramResult,
        options: q.options,
        answer: q.answer,
        markingRubric: q.markingRubric,
        marks: q.marks,
        cognitiveLevel: data.cognitiveLevel,
        difficulty: data.difficulty,
        tags: [],
        source: 'ai_generated' as const,
        status: 'draft' as const,
        createdBy: uoid,
      };
    });
```

- [ ] **Step 2: Add gradeLevel to GenerateQuestionsInput validation**

Check `c:\Users\shaun\campusly-backend\src\modules\QuestionBank\validation.ts` and add `gradeLevel` as an optional number field to the generate questions validation schema, so the prompt builder knows which grade's templates to inject.

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/QuestionBank/service-generation.ts src/modules/QuestionBank/validation.ts && git commit -m "feat: integrate diagram generation into question AI pipeline"
```

---

## Task 9: Backend — Update AI Paper Generation Prompts

**Files:**
- Modify: `c:\Users\shaun\campusly-backend\src\modules\AITools\service.ts:78-124`

- [ ] **Step 1: Update AITools paper generation to include diagram instructions**

In `c:\Users\shaun\campusly-backend\src\modules\AITools\service.ts`, add imports at the top:

```typescript
import { getTemplatesForGrade, formatTemplatesForPrompt } from '../../lib/tikz-templates.js';
import { renderDiagram } from '../QuestionBank/service-diagram.js';
import type { DiagramInput } from '../QuestionBank/service-diagram.js';
```

Update the `generatePaper` method's system prompt (lines 94-114) to include diagram instructions. Add after the existing JSON structure instructions:

```typescript
    const templates = getTemplatesForGrade(params.grade);
    const templateSection = templates.length > 0
      ? [
          '',
          'DIAGRAM INSTRUCTIONS:',
          'For questions that need a visual (geometry, graphs, data, shapes), add a "diagram" field to the question object:',
          '  { "tikz": "\\\\begin{tikzpicture}...\\\\end{tikzpicture}", "data": { "type": "...", ... }, "alt": "accessibility description" }',
          '',
          'AVAILABLE TEMPLATES:',
          formatTemplatesForPrompt(templates),
        ].join('\n')
      : '';
```

Append `templateSection` to the system prompt string.

After the AI response is parsed into sections, render all diagrams before saving:

```typescript
    // After parsing sections from AI response, render diagrams
    for (const section of parsedSections) {
      for (const question of section.questions) {
        if (question.diagram && typeof question.diagram.tikz === 'string') {
          const diagramInput: DiagramInput = {
            tikz: question.diagram.tikz,
            data: question.diagram.data ?? {},
            alt: question.diagram.alt ?? '',
          };
          const result = await renderDiagram(diagramInput);
          question.diagram = result;
        }
      }
    }
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-backend && git add src/modules/AITools/service.ts && git commit -m "feat: integrate diagram rendering into AI paper generation"
```

---

## Task 10: Frontend — Diagram Types

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\types\diagram.ts`
- Modify: `c:\Users\shaun\campusly-frontend\src\types\question-bank.ts:25-28,43-67`

- [ ] **Step 1: Create diagram type definitions**

```typescript
// src/types/diagram.ts

export type DiagramRenderStatus = 'pending' | 'rendered' | 'failed';

export interface QuestionDiagram {
  tikz: string;
  data: DiagramData;
  alt: string;
  svgUrl: string | null;
  pdfUrl: string | null;
  hash: string;
  renderStatus: DiagramRenderStatus;
  renderError: string | null;
}

// Discriminated union for structured diagram data (Phase 2 interactivity)
export type DiagramData =
  | CartesianGraphData
  | NumberLineData
  | TriangleData
  | CircleGeometryData
  | VennDiagramData
  | TrigGraphData
  | BoxWhiskerData
  | BarChartData
  | TransformationData
  | TreeDiagramData
  | ScatterPlotData
  | OgiveData
  | GeometricShapeData
  | Shape3dData
  | GenericDiagramData;

export interface Point {
  x: number;
  y: number;
}

export interface LabeledPoint extends Point {
  label: string;
}

export interface CartesianGraphData {
  type: 'cartesian_graph';
  functions: { expression: string; color?: string; label?: string }[];
  domain: [number, number];
  range: [number, number];
  points?: LabeledPoint[];
}

export interface NumberLineData {
  type: 'number_line';
  min: number;
  max: number;
  points: LabeledPoint[];
}

export interface TriangleData {
  type: 'triangle';
  vertices: [Point, Point, Point];
  labels: { a: string; b: string; c: string };
  rightAngle?: boolean;
  sides?: { label: string; length: string }[];
  angles?: { label: string; degrees?: number }[];
}

export interface CircleGeometryData {
  type: 'circle_geometry';
  center: Point;
  radius: number;
  theoremType: string;
  points: LabeledPoint[];
}

export interface VennDiagramData {
  type: 'venn_diagram';
  sets: { label: string; value: number }[];
  intersection: number;
  outside?: number;
}

export interface TrigGraphData {
  type: 'trig_graph';
  functions: { expression: string; color?: string; label?: string }[];
  domain: [number, number];
  amplitude?: number;
  period?: number;
}

export interface BoxWhiskerData {
  type: 'box_whisker';
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export interface BarChartData {
  type: 'bar_chart';
  categories: string[];
  values: number[];
  title?: string;
}

export interface TransformationData {
  type: 'transformation';
  original: Point[];
  transformed: Point[];
  transformType: 'translation' | 'reflection' | 'rotation' | 'enlargement';
}

export interface TreeDiagramData {
  type: 'tree_diagram';
  description: string;
}

export interface ScatterPlotData {
  type: 'scatter_plot';
  points: [number, number][];
}

export interface OgiveData {
  type: 'ogive';
  cumFrequencies: [number, number][];
}

export interface GeometricShapeData {
  type: 'geometric_shape';
  description: string;
}

export interface Shape3dData {
  type: 'shape_3d';
  shapeType: string;
  dimensions: Record<string, number>;
}

export interface GenericDiagramData {
  type: 'generic';
  description: string;
}
```

- [ ] **Step 2: Update QuestionItem to include diagram field**

In `c:\Users\shaun\campusly-frontend\src\types\question-bank.ts`, add import at top:

```typescript
import type { QuestionDiagram } from './diagram';
```

Add to `QuestionItem` interface (after line 51, after `media: QuestionMedia[];`):

```typescript
  diagram: QuestionDiagram | null;
```

- [ ] **Step 3: Update types barrel export**

Check `src/types/index.ts` and add:

```typescript
export * from './diagram';
```

- [ ] **Step 4: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/types/diagram.ts src/types/question-bank.ts src/types/index.ts && git commit -m "feat: add diagram types to frontend"
```

---

## Task 11: Frontend — DiagramRenderer Component

**Files:**
- Create: `c:\Users\shaun\campusly-frontend\src\components\shared\DiagramRenderer.tsx`

- [ ] **Step 1: Create the DiagramRenderer component**

```tsx
// src/components/shared/DiagramRenderer.tsx
'use client';

import { useState } from 'react';
import type { QuestionDiagram } from '@/types/diagram';

type DiagramSize = 'sm' | 'md' | 'lg' | 'full';

interface DiagramRendererProps {
  diagram: QuestionDiagram | null;
  size?: DiagramSize;
  printMode?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<DiagramSize, string> = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'w-full',
};

export function DiagramRenderer({
  diagram,
  size = 'md',
  printMode = false,
  className = '',
}: DiagramRendererProps) {
  const [imgError, setImgError] = useState(false);

  if (!diagram) return null;

  // Failed render — show alt text fallback
  if (diagram.renderStatus === 'failed' || !diagram.svgUrl || imgError) {
    return (
      <div
        className={`rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 ${SIZE_CLASSES[size]} ${className}`}
        role="img"
        aria-label={diagram.alt}
      >
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="line-clamp-3">{diagram.alt || 'Diagram could not be rendered'}</p>
        </div>
      </div>
    );
  }

  // Pending render — skeleton
  if (diagram.renderStatus === 'pending') {
    return (
      <div
        className={`animate-pulse rounded-lg bg-muted ${SIZE_CLASSES[size]} ${className}`}
        style={{ aspectRatio: '4/3' }}
        role="img"
        aria-label="Diagram loading..."
      />
    );
  }

  // Rendered — show SVG
  const url = printMode && diagram.pdfUrl ? diagram.pdfUrl : diagram.svgUrl;

  return (
    <div className={`overflow-hidden rounded-lg bg-white p-2 ${SIZE_CLASSES[size]} ${className}`}>
      <img
        src={url}
        alt={diagram.alt}
        className="h-auto w-full"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/shared/DiagramRenderer.tsx && git commit -m "feat: add DiagramRenderer component with loading, error, and render states"
```

---

## Task 12: Frontend — Integrate DiagramRenderer into Question Cards

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\components\questions\QuestionCard.tsx`
- Modify: `c:\Users\shaun\campusly-frontend\src\components\ai-tools\QuestionCard.tsx`

- [ ] **Step 1: Update question bank QuestionCard**

In `c:\Users\shaun\campusly-frontend\src\components\questions\QuestionCard.tsx`, add the DiagramRenderer import and render the diagram below the question stem. Add:

```tsx
import { DiagramRenderer } from '@/components/shared/DiagramRenderer';
```

Then after the stem text rendering (around line 58-59), add:

```tsx
{question.diagram && (
  <DiagramRenderer diagram={question.diagram} size="sm" className="mt-2" />
)}
```

- [ ] **Step 2: Update AI tools QuestionCard**

In `c:\Users\shaun\campusly-frontend\src\components\ai-tools\QuestionCard.tsx`, the questions use `questionText` not `stem`, and `diagram` comes from the `IPaperQuestion` shape. Add the import:

```tsx
import { DiagramRenderer } from '@/components/shared/DiagramRenderer';
```

After the question text display (around line 65), add:

```tsx
{question.diagram && (
  <DiagramRenderer diagram={question.diagram} size="md" className="mt-3" />
)}
```

- [ ] **Step 3: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/components/questions/QuestionCard.tsx src/components/ai-tools/QuestionCard.tsx && git commit -m "feat: integrate DiagramRenderer into question cards"
```

---

## Task 13: Frontend — Update Paper PDF Export

**Files:**
- Modify: `c:\Users\shaun\campusly-frontend\src\lib\paper-pdf.ts`

- [ ] **Step 1: Update generatePaperHtml to include diagram images**

In `c:\Users\shaun\campusly-frontend\src\lib\paper-pdf.ts`, update the question rendering to include diagram SVGs. In the section that maps questions to HTML, add diagram handling:

After each question text in the HTML generation, check for a diagram and insert an `<img>` tag:

```typescript
// Inside the question HTML generation loop, after the question text:
const diagramHtml = question.diagram?.svgUrl
  ? `<div style="text-align:center;margin:12px 0;"><img src="${question.diagram.svgUrl}" alt="${question.diagram.alt ?? ''}" style="max-width:400px;height:auto;" /></div>`
  : '';
```

Include `diagramHtml` in the question HTML output.

- [ ] **Step 2: Commit**

```bash
cd c:/Users/shaun/campusly-frontend && git add src/lib/paper-pdf.ts && git commit -m "feat: include diagram SVGs in paper PDF export"
```

---

## Task 14: Docker Build and End-to-End Test

- [ ] **Step 1: Build and start the TikZ renderer Docker container**

```bash
cd c:/Users/shaun/campusly-tikz-renderer && npm run build && docker compose up -d --build
```

Expected: Container starts, health check passes.

- [ ] **Step 2: Verify health endpoint**

```bash
curl http://localhost:3600/health
```

Expected: `{"status":"ok","service":"campusly-tikz-renderer"}`

- [ ] **Step 3: Test rendering a simple TikZ diagram**

```bash
curl -X POST http://localhost:3600/render \
  -H "Content-Type: application/json" \
  -d '{"tikz": "\\begin{tikzpicture}\\draw[thick] (0,0) -- (3,0) -- (1.5,2.6) -- cycle;\\node[below] at (1.5,0) {Triangle};\\end{tikzpicture}"}'
```

Expected: `{"svg":"<svg ...>...</svg>","hash":"...","renderTimeMs":...}`

- [ ] **Step 4: Test rendering a Cartesian graph**

```bash
curl -X POST http://localhost:3600/render \
  -H "Content-Type: application/json" \
  -d '{"tikz": "\\begin{tikzpicture}\\begin{axis}[axis lines=middle,xlabel=$x$,ylabel=$y$,xmin=-3,xmax=3,ymin=-1,ymax=5,grid=major,width=10cm,height=7cm,samples=100]\\addplot[domain=-3:3,thick,blue] {x^2};\\end{axis}\\end{tikzpicture}", "packages": ["pgfplots"]}'
```

Expected: SVG output with a parabola.

- [ ] **Step 5: Test batch rendering**

```bash
curl -X POST http://localhost:3600/render/batch \
  -H "Content-Type: application/json" \
  -d '{"items": [{"tikz": "\\begin{tikzpicture}\\draw (0,0) circle (1);\\end{tikzpicture}"}, {"tikz": "\\begin{tikzpicture}\\draw (0,0) rectangle (2,1);\\end{tikzpicture}"}]}'
```

Expected: `{"results":[{"svg":"...","hash":"..."},{"svg":"...","hash":"..."}]}`

- [ ] **Step 6: Add TIKZ_RENDERER_URL to backend .env**

In `c:\Users\shaun\campusly-backend\.env`, add:

```
TIKZ_RENDERER_URL=http://localhost:3600
```

- [ ] **Step 7: Commit all environment changes**

```bash
cd c:/Users/shaun/campusly-backend && git add .env.example && git commit -m "feat: add TIKZ_RENDERER_URL to environment config"
```

---

## Task 15: Full Integration Test — Generate Questions with Diagrams

- [ ] **Step 1: Verify Docker renderer is running**

```bash
curl http://localhost:3600/health
```

- [ ] **Step 2: Start backend and frontend dev servers**

```bash
cd c:/Users/shaun/campusly-backend && npm run dev
# In separate terminal:
cd c:/Users/shaun/campusly-frontend && npm run dev
```

- [ ] **Step 3: Test AI question generation through the UI**

1. Navigate to the Teacher Workbench → Question Bank
2. Click "Generate Questions"
3. Select a Mathematics subject, Grade 10, topic: Functions
4. Generate 3 MCQ questions
5. Verify: questions appear with rendered diagram SVGs inline
6. Check browser dev tools: diagram images load from `/uploads/diagrams/` URLs
7. Check that non-diagram questions (pure algebra) don't have diagrams

- [ ] **Step 4: Test AI paper generation through the UI**

1. Navigate to AI Tools → Generate Paper
2. Select Mathematics, Grade 11, topic that requires diagrams (e.g., Functions & Graphs)
3. Generate a paper
4. Verify: paper preview shows diagrams inline in question cards
5. Test print/export: diagrams appear in the print view

- [ ] **Step 5: Document any issues found and fix**

If any diagrams fail to render, check:
- Backend logs for render attempts and errors
- TikZ renderer logs: `docker compose logs tikz-renderer`
- Question documents in MongoDB for `diagram.renderStatus` and `diagram.renderError`
