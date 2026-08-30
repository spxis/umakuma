# UmaKuma conventions memory

- When fixing type-separation consistency, do a domain-level sweep (for example all `src/app/news/*.tsx` files), not one-off files.
- Move component/page `Props` and shared exported types into adjacent `*.types.ts` files and update all imports in the same pass.
- Browse the local dev server at `http://localhost:6400`, never `http://127.0.0.1:6400`: Next 16 blocks cross-origin dev resources for the second host, so the app hydrates no further than its loading state and looks like a data-loading bug.
- Verify game changes for real: `pnpm dev:local` plus `pnpm local:seed` gives a synthetic account (invite code `TEST01`) with trouble and favorite tags already on started items.
- User-facing copy uses Canadian spelling (favourite, colour, centre, catalogue); code identifiers, database columns and API values keep their existing spelling and are never renamed for it.
- Keep every user-facing string in its feature copy module rather than inline, so the eventual i18n layer can swap dictionaries; an `en-US` spelling variant for US members is a future nice-to-have that belongs there.
