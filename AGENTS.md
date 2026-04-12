<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Workspace Gates (Single Source)

This file is the single source of truth for agent behavior in this repo.
`CLAUDE.md` must continue to delegate to this file only.

### File Size Gate

- Code files under `src/` must stay at or below 500 lines.
- Gate command: `pnpm loc:check`
- CI must run this gate on pull requests and pushes to `main`.

### Refactor Rule

- If a file approaches the limit, split by feature responsibility (`components/`, `lib/`, domain modules) rather than adding flags or deeply nested conditionals.

### Types And Props Pattern

- Keep component-local logic in component files, but move exported/shared `type` and `Props` declarations into adjacent helper files (for example `*.types.ts` or `lib/*Types.ts`).
- Prefer importing types from those helper files instead of defining large type blocks inline in UI components.
- When refactoring for LOC compliance, extract types/props first, then extract pure helpers/selectors, then split JSX sections into focused subcomponents.
