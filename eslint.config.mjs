import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Parallel-session git worktrees; their files are their branch's problem.
    ".claude/**",
  ]),
  {
    rules: {
      /*
       * An error rather than a warning, because as a warning it did nothing.
       * Sixteen of these had accumulated and `quality:check` passed with all
       * of them, so nobody had a reason to look - and one was not lint at all:
       * `releasesHrefForViewer(isAdmin)` had stopped reading its argument,
       * which left a `getServerSession` call in the root layout computing a
       * flag nothing could use. Dead imports are cheap to spot and expensive
       * to leave, since each one is a real module in the bundle.
       *
       * The underscore prefix is the way to say a binding is deliberately
       * unused - a positional argument you have to name to reach the next one,
       * a destructured element you are skipping. Without these patterns that
       * convention still warned, which is what taught everyone to ignore the
       * warnings in the first place.
       */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
