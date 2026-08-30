# UmaKuma conventions memory

- When fixing type-separation consistency, do a domain-level sweep (for example all `src/app/news/*.tsx` files), not one-off files.
- Move component/page `Props` and shared exported types into adjacent `*.types.ts` files and update all imports in the same pass.
- Browse the local dev server at `http://localhost:6400`, never `http://127.0.0.1:6400`: Next 16 blocks cross-origin dev resources for the second host, so the app hydrates no further than its loading state and looks like a data-loading bug.
- Verify game changes for real: `pnpm dev:local` plus `pnpm local:seed` gives a synthetic account (invite code `TEST01`) with trouble and favorite tags already on started items.
- User-facing copy uses Canadian spelling (favourite, colour, centre, catalogue); code identifiers, database columns and API values keep their existing spelling and are never renamed for it.
- Keep every user-facing string in its feature copy module rather than inline, so the eventual i18n layer can swap dictionaries; an `en-US` spelling variant for US members is a future nice-to-have that belongs there.
- Schema changes are not deployed by the pipeline. `prisma/schema.prisma` is applied by hand with `pnpm db:push`; `postinstall` only runs `prisma generate`, which never contacts the database. After any schema edit, push it to production explicitly and confirm with `pnpm db:drift:check` (read-only, exit 2 with the missing SQL). Local verification proves nothing here: a `dev:local` Postgres gets the push while Neon does not, so the feature passes every local test and fails for real users.
