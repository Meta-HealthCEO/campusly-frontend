# Mermaid Diagram Rendering — Design

**Status:** Design approved, ready for implementation
**Author:** Brainstormed with Shaun, 2026-05-15
**Related files:** [`src/components/content/renderers/MermaidBlock.tsx`](src/components/content/renderers/MermaidBlock.tsx)

---

## Goal

Fix the four rendering issues with AI-generated Mermaid diagrams in lesson content so they're legible on every screen and in both light and dark themes.

## Diagnosis (corrected from prior analysis)

The flowchart in the bug screenshot is **already Mermaid**, rendering client-side via [`MermaidBlock`](src/components/content/renderers/MermaidBlock.tsx). The previous suspicion of TikZ was wrong — TikZ in this codebase is only used for the paper/question Docker rendering pipeline and never touches lesson content. All four problems are in one frontend component.

## Problems

1. **Truncation.** Mermaid's `useMaxWidth: true` (default) shrinks the SVG to fit the parent container. When the parent is narrower than the diagram's natural width, Mermaid internally truncates node labels with `...` rather than enlarging the SVG. Visible in the screenshot as `Use Cheaper Imported Wo...`, `Risk: Damaged relationshi...`, etc.
2. **Theme.** Hardcoded `theme: 'neutral'` produces washed-out grey-on-grey nodes that look academic, not student-friendly.
3. **No dark-mode handling.** Same theme always. Black ink on dark background — diagram becomes nearly invisible when the app theme is dark.
4. **No zoom.** Even when sized correctly, complex diagrams need an enlarge affordance for tablets/mobile.

## Scope

**In scope:** changes to [`src/components/content/renderers/MermaidBlock.tsx`](src/components/content/renderers/MermaidBlock.tsx) only.

**Out of scope:**
- AI prompt changes (the prompt already emits good Mermaid; the rendering layer is at fault).
- Schema or backend changes.
- TikZ pipeline changes.
- GeoGebra renderer (separate component, not affected).
- Standard image renderer (`<img>` blocks unaffected).

## Design

### 1. Disable Mermaid's auto-shrink

When initialising Mermaid, pass `useMaxWidth: false` for the diagram types lesson content uses:

```ts
mermaid.initialize({
  startOnLoad: false,
  theme: /* dynamic per app theme */,
  securityLevel: 'loose',
  fontFamily: 'inherit',
  flowchart: { useMaxWidth: false },
  sequence: { useMaxWidth: false },
  class: { useMaxWidth: false },
  state: { useMaxWidth: false },
  er: { useMaxWidth: false },
  gantt: { useMaxWidth: false },
  pie: { useMaxWidth: false },
});
```

The SVG renders at its intrinsic, label-friendly width. The existing `overflow-x-auto` wrapper handles wider-than-viewport diagrams via horizontal scroll. No more truncation.

### 2. Theme by app theme

Read the active app theme via `next-themes` `useTheme()` hook (already used elsewhere in the codebase — confirmed by the existing dark-mode toggle in the top bar). Map to Mermaid's themes:

| App theme | Mermaid theme |
|---|---|
| `light` | `'default'` |
| `dark` | `'dark'` |
| `system` | resolve via `resolvedTheme` |

Add the resolved theme to the effect's dependency array so the diagram re-renders when the user toggles light/dark. Mermaid's `initialize` is global state, so calling it again before each `render` is safe (the existing code already calls it inside the effect).

### 3. Click-to-enlarge

Wrap the rendered SVG in a `<button>` (so it's keyboard-focusable) with `cursor-zoom-in`. Clicking opens a `Dialog` (base-ui, from `@/components/ui/dialog`) showing the same SVG at viewport size on a white background regardless of app theme (TikZ-style dark mode safety — light bg for the modal contents only). Close on backdrop click, Escape, or explicit Close button. Caption (if any) shown below the enlarged diagram.

### 4. Preserve existing states

- Loading state (`Rendering diagram...`) unchanged.
- Error state (red bordered box with message) unchanged.
- Caption rendering below the diagram unchanged.

## Architecture

Still one file, still ~70-100 lines after the changes (within the 350-line cap with room to spare). No new components extracted — the modal is a small inline `Dialog`. If the file grows past 200 lines we can extract a `<EnlargedDiagramModal>` later, but not preemptively.

## Verification

No automated tests (the project has no FE component test infrastructure per CLAUDE.md). Manual smoke:

1. **Truncation gone.** Reload the lesson page containing the Ethics Scenario Discussion activity. Every node label renders in full (no `...`). Wide diagrams trigger horizontal scroll inside the existing wrapper.
2. **Theme tracks app theme.** Toggle dark mode via the top-bar theme switch. Diagram re-renders with `'dark'` Mermaid theme — visible nodes on dark bg.
3. **Zoom works.** Click the diagram. Modal opens. SVG renders at viewport size. Close via backdrop / Escape / Close button. No focus traps or layout shifts.

## Success criteria

- Zero text truncation in any rendered Mermaid diagram across the student portal.
- Diagrams legible in both light and dark theme.
- Click-to-enlarge available on every Mermaid diagram with no additional teacher action required.
- No regressions to the loading state, error state, or caption rendering.
- File remains under 350 lines.
- No `any` types, no `apiClient` import (component is purely presentational), design tokens only.

## Non-goals (deferred)

- Per-diagram zoom/pan controls inside the modal (single full-screen size is enough for Phase 1).
- Touch pinch-to-zoom (relies on browser default for now).
- Export-to-image button.
- Mermaid live-edit for teachers.
