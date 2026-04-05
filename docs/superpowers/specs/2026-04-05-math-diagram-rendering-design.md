# Math Diagram Rendering Engine — Design Spec

**Date:** 2026-04-05
**Status:** Draft
**Scope:** AI-generated mathematical diagram rendering for CAPS Grades 1-12

## Problem

When Claude generates mathematics questions, diagrams are described in text only — no visual output. A geometry question about "triangle ABC with right angle at B" has no actual triangle. This makes AI-generated papers significantly less useful than manually created ones with hand-drawn or imported diagrams.

## Solution

A TikZ-based rendering pipeline where Claude generates LaTeX/TikZ code alongside every diagram-worthy question. A Docker-based rendering service compiles TikZ to SVG. The frontend displays the SVG. A structured JSON sidecar is stored alongside for future interactive rendering (Phase 2).

## Approach: TikZ Primary + Structured Data Sidecar

- **Phase 1 (this spec):** Publication-quality static SVG diagrams via TikZ
- **Phase 2 (future):** Interactive renderers (Desmos-style graphs, draggable geometry) using the stored structured JSON data

## Diagram Taxonomy — CAPS Mathematics Grades 1-12

### Foundation Phase (Gr 1-3)
- Number lines (whole numbers, counting)
- Basic 2D shapes (squares, triangles, circles with labels)
- Pictographs and tally charts
- Pattern sequences (visual)
- Simple bar graphs

### Intermediate Phase (Gr 4-6)
- Number lines (fractions, decimals, negative numbers)
- 2D shapes with measurements (perimeter, area annotations)
- 3D shape nets and representations
- Bar graphs, pie charts
- Coordinate grids (first quadrant only)
- Symmetry/reflection diagrams

### Senior Phase (Gr 7-9)
- Full Cartesian plane with plotted functions (linear, basic quadratic)
- Geometric constructions (bisectors, perpendiculars, parallel lines)
- Transformation geometry (translation, reflection, rotation, enlargement)
- Circle properties (chords, arcs, angles)
- Data handling (histograms, frequency polygons, scatter plots)
- Venn diagrams (2-3 sets)
- Pythagorean theorem diagrams
- 3D objects with dimensions (surface area/volume)

### FET Phase (Gr 10-12)
- Function graphs: parabolas, hyperbolas, exponential, logarithmic, trig (sin/cos/tan)
- Graph analysis: intercepts, turning points, asymptotes, domain/range annotations
- Circle geometry theorems (tangent-chord, angles in same segment, cyclic quads)
- Trigonometric diagrams (unit circle, triangles with angle/side labels)
- Probability: Venn diagrams (with shading), tree diagrams
- Calculus: curve sketching with derivatives, area under curve (shaded regions)
- Box-and-whisker plots, ogives, cumulative frequency
- Analytical geometry (distance, midpoint, gradient on coordinate plane)
- 3D trigonometry diagrams

## System Architecture

### End-to-End Pipeline

```
Teacher requests question generation (frontend)
        |
        v
Express backend builds AI prompt (includes diagram templates)
        |
        v
Claude generates JSON response:
  {
    stem: "Calculate the area of triangle ABC...",
    diagram: {
      tikz: "\\begin{tikzpicture}...",
      data: { type: "triangle", ... },
      alt: "Right triangle ABC with..."
    },
    options: [...], answer: "...", ...
  }
        |
        v
Backend detects diagram.tikz exists
        |
        v
Backend sends TikZ to rendering service (Docker)
        |
        v
TeX Live compiles TikZ → SVG (+ PDF for print)
        |
        v
SVG stored in file system, URL saved to question.diagram.svgUrl
        |
        v
Frontend renders: <DiagramRenderer diagram={question.diagram} />
```

### Components

1. **AI Prompt Layer** — Enhanced prompts with battle-tested TikZ templates per diagram type. Templates are context-aware: only relevant templates injected based on grade/topic.

2. **TikZ Rendering Service** — Stateless Docker container (TeX Live + Express HTTP API). Receives TikZ, returns SVG. Horizontally scalable.

3. **Diagram Storage** — SVGs stored as files with URLs on the question document. TikZ source and structured JSON stored on the document itself for re-rendering and future interactivity.

4. **Frontend DiagramRenderer** — React component displaying SVG with responsive sizing, loading/error states, dark mode support, and print mode.

5. **Caching Layer** — TikZ source hashed (SHA256). Identical diagrams serve cached SVG.

## Data Model Changes

### Backend — Question Model

New `diagram` field on `IQuestion` (alongside existing `media[]` which stays for uploaded images):

```typescript
diagram: {
  tikz: string;                    // TikZ source code
  data: DiagramData;               // Structured JSON sidecar
  alt: string;                     // Accessibility text
  svgUrl: string | null;           // Populated after rendering
  pdfUrl: string | null;           // For print/export
  hash: string;                    // SHA256 of tikz source
  renderStatus: 'pending' | 'rendered' | 'failed';
  renderError: string | null;
} | null;
```

### DiagramData (Structured Sidecar)

Discriminated union typed by diagram category:

```typescript
type DiagramData =
  | { type: 'cartesian_graph'; functions: FunctionDef[]; domain: [number, number]; range: [number, number]; points?: LabeledPoint[]; asymptotes?: Line[]; }
  | { type: 'geometric_shape'; shapes: Shape[]; labels: Label[]; angles?: AngleMark[]; measurements?: Measurement[]; }
  | { type: 'number_line'; min: number; max: number; points: LabeledPoint[]; intervals?: Interval[]; }
  | { type: 'venn_diagram'; sets: VennSet[]; regions: ShadedRegion[]; }
  | { type: 'triangle'; vertices: [Point, Point, Point]; labels: TriangleLabels; rightAngle?: boolean; sides?: SideInfo[]; angles?: AngleInfo[]; }
  | { type: 'circle_geometry'; center: Point; radius: number; theoremType: string; points: LabeledPoint[]; chords?: Line[]; tangents?: Line[]; }
  | { type: 'trig_graph'; functions: TrigFunction[]; domain: [number, number]; period?: number; amplitude?: number; shift?: { vertical: number; horizontal: number; }; }
  | { type: 'bar_chart'; categories: string[]; values: number[]; title?: string; }
  | { type: 'histogram'; bins: HistogramBin[]; title?: string; }
  | { type: 'box_whisker'; min: number; q1: number; median: number; q3: number; max: number; outliers?: number[]; }
  | { type: 'tree_diagram'; root: TreeNode; }
  | { type: 'transformation'; original: Shape; transformed: Shape; transformType: 'translation' | 'reflection' | 'rotation' | 'enlargement'; }
  | { type: 'construction'; steps: ConstructionStep[]; result: Shape[]; }
  | { type: 'shape_3d'; shapeType: string; dimensions: Record<string, number>; viewAngle?: string; }
  | { type: 'ogive'; cumFrequencies: [number, number][]; }
  | { type: 'scatter_plot'; points: [number, number][]; lineOfBestFit?: Line; }
  | { type: 'generic'; description: string; elements: DiagramElement[]; };
```

### GeneratedPaper Model

Same `diagram` field added to `IPaperQuestion`.

## TikZ Rendering Service

### Docker Container

```
Container: campusly-tikz-renderer
├── Base: debian-slim + TeX Live (texlive-full)
├── Tools: dvisvgm (TikZ → SVG), pdflatex (TikZ → PDF)
├── API: Express.js HTTP wrapper
├── Port: 3600
└── Health check: GET /health
```

### API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/render` | TikZ → SVG |
| `POST` | `/render/pdf` | TikZ → PDF |
| `POST` | `/render/batch` | Array of TikZ → Array of SVGs |
| `GET` | `/health` | Health check |

### Request/Response

```typescript
// Request
POST /render
{
  tikz: string;        // Raw TikZ (without document preamble)
  packages?: string[]; // Additional LaTeX packages
}

// Success
{ svg: string; hash: string; renderTimeMs: number; }

// Failure
{ error: string; log: string; }
```

### LaTeX Document Wrapper

The service wraps TikZ in a minimal document automatically:

```latex
\documentclass[tikz,border=5pt]{standalone}
\usepackage{pgfplots}
\usepackage{tkz-euclide}
\usepackage{amsmath,amssymb}
\pgfplotsset{compat=1.18}
\begin{document}
  % TikZ code inserted here
\end{document}
```

Claude only generates the `\begin{tikzpicture}...\end{tikzpicture}` block.

### Performance

- Pre-compiled LaTeX format file (~40% faster compilation)
- Batch endpoint for paper generation (parallel rendering)
- SVG output: 5-30KB per diagram
- Timeout: 10 seconds per render
- Stateless — restart/scale freely

## Rendering Reliability System (Watertight)

Five layers ensure diagrams always render:

### Layer 1: Guided Generation

AI prompts include battle-tested TikZ templates per diagram type. Claude fills in parameters rather than writing freeform TikZ. Each of the ~18 diagram types has a verified template. Eliminates 80%+ of compilation failures.

### Layer 2: Pre-render Validation

Fast syntax check before sending to TeX Live:
- Matching `\begin{}`/`\end{}` pairs
- No forbidden commands (`\input`, `\write`, `\immediate` — security)
- Package requirements auto-detected and included
- Known bad patterns caught (division by zero in pgfplots, etc.)

### Layer 3: Retry with Error Feedback

If rendering fails, the error goes back to Claude for self-correction:

- **Attempt 1:** Claude generates TikZ → render fails
- **Attempt 2:** Claude receives `{ originalTikz, errorLog }` → generates corrected TikZ
- **Attempt 3:** Stricter prompt: "Use ONLY the base template, fill in these values"

Max 3 attempts, progressively more constrained.

### Layer 4: Fallback Chain (Last Resort)

If all 3 Claude attempts fail:

1. **Simplified re-attempt** — strip to most basic version of that diagram type
2. **Template-only render** — pre-baked static template with Claude's data values injected (no AI TikZ)
3. **Structured data render** — use JSON sidecar to generate basic SVG via Node.js (D3/sharp)
4. **Description placeholder** — styled box with `alt` text and diagram icon, teacher can trigger re-generation

Never a broken image. Never a blank space.

### Layer 5: Monitoring

- Every render attempt logged: `{ questionId, attempt, success, renderTimeMs, errorLog? }`
- Target: 99%+ render success rate
- Failed renders queued for manual review
- Failure patterns feed back into template improvements

## AI Prompt Engineering

### Diagram Decision Logic

Included in system prompt:

```
DIAGRAM RULES:
- ALWAYS generate: geometry, graph/function, transformation, circle theorem,
  data representation, trigonometry with triangles, analytical geometry, 3D shapes
- NEVER generate: pure algebra, simple arithmetic, purely textual word problems,
  probability calculations without Venn/tree
- USE JUDGEMENT: number lines, pattern questions, measurement questions
```

### Context-Aware Template Injection

The backend selects relevant templates based on curriculum node, grade, and topic:

- Grade 10 Functions → injects: `cartesian_graph`, `trig_graph` templates
- Grade 9 Geometry → injects: `triangle`, `geometric_shape`, `circle_geometry`, `transformation`
- Grade 4 Data Handling → injects: `bar_chart`, `pictograph` templates

### AI Output Structure

Claude returns a `diagram` field on questions that need visuals:

```json
{
  "stem": "The graph of f(x) = -(x-3)^2 + 4 is shown...",
  "diagram": {
    "tikz": "\\begin{tikzpicture}\\begin{axis}[...]...",
    "data": { "type": "cartesian_graph", "functions": [...], ... },
    "alt": "Downward-opening parabola with turning point at (3,4)..."
  }
}
```

## Frontend DiagramRenderer Component

```tsx
<DiagramRenderer
  diagram={question.diagram}
  size="md"           // sm | md | lg | full
  theme="light"       // auto-detected from app theme
  printMode={false}   // true for PDF export
/>
```

Behaviour:
- Renders SVG via `<img>` tag (SVG URL from backend)
- Responsive: scales proportionally, never overflows
- Loading state: skeleton placeholder while SVG loads
- Error state: shows `alt` text in styled fallback box
- Print mode: swaps to PDF-rendered version
- Dark mode: CSS filter inversion (or dark-variant SVG later)

Used in: `QuestionCard`, `PaperPreview`, `SectionEditor`, paper PDF export, AI Tutor practice questions.

## TikZ Template Library

Each template is a verified, compilable TikZ snippet that Claude adapts by filling in values. Templates stored in the backend as constants, injected into AI prompts contextually.

Templates needed (18 types):

| # | Template | CAPS Grades | Key Packages |
|---|----------|-------------|--------------|
| 1 | `number_line` | 1-9 | tikz |
| 2 | `basic_shapes_2d` | 1-6 | tikz |
| 3 | `shapes_with_measurements` | 4-9 | tikz |
| 4 | `shape_nets_3d` | 4-6 | tikz, tikz-3dplot |
| 5 | `bar_chart` | 3-9 | pgfplots |
| 6 | `pie_chart` | 4-7 | tikz |
| 7 | `pictograph` | 1-4 | tikz |
| 8 | `cartesian_graph` | 7-12 | pgfplots |
| 9 | `trig_graph` | 10-12 | pgfplots |
| 10 | `geometric_construction` | 7-9 | tkz-euclide |
| 11 | `transformation` | 7-9 | tikz |
| 12 | `circle_geometry` | 9-12 | tkz-euclide |
| 13 | `triangle` | 4-12 | tikz, tkz-euclide |
| 14 | `venn_diagram` | 7-12 | tikz |
| 15 | `tree_diagram` | 10-12 | tikz, forest |
| 16 | `box_whisker` | 10-12 | pgfplots |
| 17 | `ogive_cumfreq` | 11-12 | pgfplots |
| 18 | `scatter_plot` | 10-12 | pgfplots |

## Scope Boundaries

### In Scope (Phase 1)
- TikZ rendering Docker service
- All 18 diagram templates for CAPS Mathematics
- AI prompt integration for question generation
- Backend diagram processing pipeline (render, cache, store)
- Frontend DiagramRenderer component
- Data model changes (Question + GeneratedPaper)
- Reliability system (5 layers)
- Batch rendering for paper generation

### Out of Scope (Phase 2+)
- Interactive diagrams (draggable points, sliders, animations)
- Client-side rendering using structured JSON data
- Other subjects (Physical Sciences, Life Sciences, Geography, EGD)
- Student diagram drawing/input tools
- Real-time collaborative diagram editing

## Success Criteria

1. AI-generated math questions for all CAPS grades include rendered diagrams where appropriate
2. Diagrams are publication-quality SVG (comparable to CAPS textbook figures)
3. Render success rate > 99% with the reliability system
4. Diagrams display correctly in question bank, paper preview, paper PDF export
5. No visible broken images or blank spaces — always a fallback
6. Rendering latency < 5 seconds per diagram (including retries)
7. Batch paper generation renders all diagrams before returning to frontend
