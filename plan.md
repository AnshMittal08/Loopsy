# Next Steps Plan

## Current State

Completed recently:

- Stable SQLite-backed backend builds
- Consistent progress API responses
- Searchable discovery page with richer template metadata
- Create and tracker flows upgraded with materials, notes, tags, and AI/fallback context

## Current Issues

1. There is still no automated test suite. Regressions are currently caught only through `npm run lint` and production builds.
2. AI generation quality is variable because it depends on a local Ollama model and heuristic metadata enrichment after generation.
3. The product still has no account system, so patterns and progress are device-local rather than user-scoped.
4. Discovery is improved, but it is still based on a small static template seed set rather than a richer pattern catalog.
5. There is no image pipeline yet. Pattern cards use generated visual treatments instead of true uploaded or generated project imagery.

## Recommended Next Milestones

### 1. Accounts and Persistence

- Add authentication and a `userId` relationship for patterns and progress.
- Support saved libraries, favorites, and recently viewed projects.

### 2. AI Workflow Improvements

- Add structured prompt inputs: project type, recipient, size, yarn weight, color palette, and style.
- Add regenerate-with-edits instead of one-shot generation only.
- Store AI diagnostics so fallback patterns and failed generations are visible in admin/debug flows.

### 3. Discovery Expansion

- Add more curated templates and categories.
- Add sort options such as newest, quickest, and beginner-friendly.
- Add dedicated detail pages for templates and saved patterns.

### 4. Quality and Reliability

- Add backend route tests for patterns, progress, and AI endpoints.
- Add frontend tests for home filtering, create flow, and tracker interactions.
- Add validation around malformed or partial AI responses before persistence.

### 5. Media and UX

- Add project cover images or AI-generated previews.
- Add print/share/export support for finished patterns.
- Improve mobile navigation and small-screen tracker ergonomics.

## Suggested Execution Order

1. Add automated tests.
2. Add authentication and user-scoped data.
3. Improve AI generation and edit/regenerate flows.
4. Expand discovery catalog and detail pages.
5. Add project imagery, sharing, and polish features.
