import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { withWanikaniRadicalNames } from "./ukExplorerFeed";
import type { StudyQueueItem } from "@/lib/studyQueueTypes";

const item = (subjectId: number, over: Partial<StudyQueueItem> = {}): StudyQueueItem =>
  ({
    subjectId,
    assignmentId: subjectId,
    queueType: "review",
    subjectType: "radical",
    characters: "卜",
    meanings: ["divining"],
    ...over,
  }) as StudyQueueItem;

describe("WaniKani's name on our items", () => {
  it("puts their word on the radicals they teach", () => {
    const [row] = withWanikaniRadicalNames([item(3)], new Map([[3, "Toe"]]));
    expect(row.wanikaniName).toBe("Toe");
  });

  it("leaves an item they do not teach untouched", () => {
    const [row] = withWanikaniRadicalNames([item(9)], new Map([[3, "Toe"]]));
    expect(row.wanikaniName).toBeUndefined();
  });

  /* An empty map is the shape a member with no WaniKani connection gets, and
     it must be indistinguishable from having no paired radicals at all. */
  it("adds nothing at all when there are no names to add", () => {
    const rows = withWanikaniRadicalNames([item(3), item(4)], new Map());
    for (const row of rows) expect(row.wanikaniName).toBeUndefined();
  });

  it("does not disturb the item it decorates", () => {
    const [row] = withWanikaniRadicalNames([item(3)], new Map([[3, "Toe"]]));
    expect(row.meanings).toEqual(["divining"]);
    expect(row.characters).toBe("卜");
  });
});

describe("who may read their names", () => {
  const server = readFileSync("src/lib/uk/ukRadicalNamesServer.ts", "utf8");

  /* Their radical names are their invented content. The gate is the module's
     whole purpose, so it is pinned rather than trusted. */
  it("checks the connection before it reads a single name", () => {
    expect(server).toContain("hasWanikaniConnection");
    const gate = server.indexOf("hasWanikaniConnection");
    const read = server.indexOf("ukRadicalLink.findMany");
    expect(gate).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(gate);
  });

  it("reads their names from the link table, never from the curriculum", () => {
    expect(server).toContain("ukRadicalLink");
    expect(server).not.toContain("ukSubject.findMany");
  });

  it("asks the queue route for the page on screen, not the whole feed", () => {
    const route = readFileSync("src/app/api/uk-study/[accountId]/queue/route.ts", "utf8");
    expect(route).toContain("loadWanikaniRadicalNames");
    expect(route).toContain("pagedItems.filter");
  });
});
