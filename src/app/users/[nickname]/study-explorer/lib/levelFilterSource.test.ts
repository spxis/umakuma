import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { queueItemLevel } from "@/lib/studyQueueSummary";

const FILE = "src/app/users/[nickname]/study-explorer/lib/useStudyExplorerDerivedData.ts";

describe("the level filter asks the item's own ladder", () => {
  const source = readFileSync(FILE, "utf8");

  /* John: "All level filters don't show up and don't work in UK mode. In WK
     they worked appropriately." A UmaKuma item carries unLevel and no wkLevel,
     so every count came out zero - the row drew "ALL (0)" and no chips - and
     the three places that filtered by level matched nothing either. */
  it("counts and filters by queueItemLevel, never by wkLevel", () => {
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("/*") && !line.includes("//"))
      .join("\n");
    expect(code).not.toMatch(/\bitem\.wkLevel\b/);
    expect(code).toContain("queueItemLevel(item)");
  });

  it("uses the same function the server counts with", () => {
    const server = readFileSync("src/lib/studyQueueSummary.ts", "utf8");
    expect(server).toContain("export function queueItemLevel");
    expect(source).toContain('from "@/lib/studyQueueSummary"');
  });
});

describe("queueItemLevel", () => {
  it("takes ours where we have one, and WaniKani's otherwise", () => {
    expect(queueItemLevel({ unLevel: 11, wkLevel: 3 })).toBe(11);
    expect(queueItemLevel({ unLevel: null, wkLevel: 3 })).toBe(3);
    expect(queueItemLevel({ unLevel: 11, wkLevel: undefined })).toBe(11);
  });

  it("is null for an item on no ladder, so it is skipped rather than counted at zero", () => {
    expect(queueItemLevel({ unLevel: null, wkLevel: undefined })).toBeNull();
    expect(queueItemLevel({ unLevel: 0, wkLevel: 0 })).toBeNull();
  });
});
