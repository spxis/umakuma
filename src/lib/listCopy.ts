import { listSlug } from "./studyListRules";

/**
 * What a copy of somebody's list is called on the shelf it lands on.
 *
 * The name it had, when nothing of yours answers to that address; otherwise
 * the same name with a mark, counted up until it is free - "Week 1 (copy)",
 * "Week 1 (copy 2)". Compared by address rather than by name, since that is
 * the rule the save route enforces.
 */
export const COPY_MARK = "copy";

export function copyName(name: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames.map(listSlug));
  if (!taken.has(listSlug(name))) return name;
  for (let attempt = 1; ; attempt += 1) {
    const candidate = attempt === 1 ? `${name} (${COPY_MARK})` : `${name} (${COPY_MARK} ${attempt})`;
    if (!taken.has(listSlug(candidate))) return candidate;
  }
}
