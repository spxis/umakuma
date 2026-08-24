# Local test accounts

Store dedicated WaniKani test-account API tokens here. Never store a WaniKani password.

1. Duplicate `account.template.json` as `<name>.local.json`.
2. Paste a personal access token belonging only to the dedicated test account.
3. Set `expectedWkUsername` exactly. Automation refuses to run if the token resolves to another user.
4. Keep `*.local.json` local; Git ignores these files.

Automation is dry-run by default. It can register the account in UmaKuma, start every currently available lesson, and submit every currently due review. It cannot bypass WaniKani SRS timing or level gates. Watch mode polls as new lessons and reviews become available.

WaniKani writes stop when the account reaches level 3. WaniKani API v2 exposes resets as read-only, so resetting the account to a lower level must be done manually on WaniKani.

Use a dedicated account only. Automated correct reviews intentionally alter that account's WaniKani progression and statistics.

## Commands

Preview one cycle without writing to UmaKuma or WaniKani:

```bash
/opt/homebrew/bin/pnpm --dir '/Users/john/Projects/umakuma' test-account:run -- --config '/Users/john/Projects/umakuma/test-accounts/agent.local.json'
```

Register or update the account in UmaKuma without starting lessons or submitting reviews:

```bash
/opt/homebrew/bin/pnpm --dir '/Users/john/Projects/umakuma' test-account:run -- --config '/Users/john/Projects/umakuma/test-accounts/agent.local.json' --register-only
```

Register the account in the UmaKuma family, start available lessons, and submit due reviews once:

```bash
/opt/homebrew/bin/pnpm --dir '/Users/john/Projects/umakuma' test-account:run -- --config '/Users/john/Projects/umakuma/test-accounts/agent.local.json' --apply
```

Keep polling using `pollIntervalMinutes` from the local config:

```bash
/opt/homebrew/bin/pnpm --dir '/Users/john/Projects/umakuma' test-account:run -- --config '/Users/john/Projects/umakuma/test-accounts/agent.local.json' --apply --watch
```

Stop watch mode with `Ctrl+C`. Run it again later to resume progression.
