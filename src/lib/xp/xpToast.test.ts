/**
 * @vitest-environment jsdom
 *
 * The raising half of this module talks to `window`; the stacking half does
 * not, and is tested alongside it rather than in a second file.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { showXpEarned, withXpToast, XP_TOAST_COPY, XP_TOAST_EVENT, XP_TOAST_MAX, type XpToast } from "./xpToast";

const toast = (id: string, xp = 1): XpToast => ({ id, xp });

describe("the XP cue stacks", () => {
  /* John: "if there are 2+ messages, we should probably be able to see both
     toasts." A single review can pay twice - for answering and for being
     right - and a burn or a level-up lands on top of that. */
  it("keeps more than one at a time", () => {
    const held = withXpToast(withXpToast([], toast("a")), toast("b"));
    expect(held.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  /* The one a member has not read yet is the one that just landed, so the
     oldest falls off rather than the newest being refused. */
  it("drops the oldest once the stack is full", () => {
    let held: XpToast[] = [];
    for (const id of ["a", "b", "c", "d", "e"]) held = withXpToast(held, toast(id));
    expect(held).toHaveLength(XP_TOAST_MAX);
    expect(held.map((entry) => entry.id)).toEqual(["c", "d", "e"]);
  });

  it("reads as a gain, always", () => {
    expect(XP_TOAST_COPY.amount(1)).toBe("+1 XP");
    expect(XP_TOAST_COPY.amount(40)).toBe("+40 XP");
  });
});

describe("raising one", () => {
  const source = readFileSync("src/lib/xp/xpToast.ts", "utf8");

  /* A caller paying XP should not have to know whether anything is listening,
     so it is silent on the server and says nothing for a zero award. */
  it("is silent where there is no window, and for nothing earned", () => {
    expect(source).toContain('typeof window === "undefined"');
    expect(source).toContain("request.xp <= 0");
  });

  it("goes away on its own rather than waiting to be dismissed", () => {
    const host = readFileSync("src/app/shared/XpToastHost.tsx", "utf8");
    expect(host).toContain("XP_TOAST_MS");
    expect(host).toContain("setToasts((held) => held.filter");
  });

  /* It is a courtesy, not the record: the XP page is the ledger. So it never
     takes a click meant for what is underneath it, and it does not interrupt
     a screen reader mid-review. */
  it("takes no clicks and does not interrupt", () => {
    const host = readFileSync("src/app/shared/XpToastHost.tsx", "utf8");
    expect(host).toContain("pointer-events-none");
    expect(host).toContain('aria-live="polite"');
  });

  /* Stacking order lives only in MODAL_LAYERS - the repo's rule. */
  it("takes its layer from the registry rather than inventing one", () => {
    const host = readFileSync("src/app/shared/XpToastHost.tsx", "utf8");
    expect(host).toContain("MODAL_LAYERS.xpToast");
    expect(readFileSync("src/app/shared/modalLayers.ts", "utf8")).toContain("xpToast:");
  });

  it("is mounted once, where every surface can reach it", () => {
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain("<XpToastHost />");
  });
});

describe("one toast per thing earned", () => {
  /* A request can pay for several things at once - finishing a game, the
     day's sign-in, a streak milestone - and a member told "+65 XP" learns
     less than one told what each part was for. */
  it("raises nothing for an empty or missing list", () => {
    const raised: number[] = [];
    const listener = (event: Event) => raised.push((event as CustomEvent<{ xp: number }>).detail.xp);
    window.addEventListener(XP_TOAST_EVENT, listener);
    showXpEarned(undefined);
    showXpEarned([]);
    window.removeEventListener(XP_TOAST_EVENT, listener);
    expect(raised).toEqual([]);
  });

  it("raises one per award, in the order the route listed them", () => {
    const raised: { xp: number; reason?: string }[] = [];
    const listener = (event: Event) => raised.push((event as CustomEvent<{ xp: number; reason?: string }>).detail);
    window.addEventListener(XP_TOAST_EVENT, listener);
    showXpEarned([
      { xp: 5, reason: "Game finished" },
      { xp: 10, reason: "Today's bonus" },
    ]);
    window.removeEventListener(XP_TOAST_EVENT, listener);
    expect(raised).toEqual([
      { xp: 5, reason: "Game finished" },
      { xp: 10, reason: "Today's bonus" },
    ]);
  });
});

describe("the surfaces that pay XP say so", () => {
  /* Every route that pays hands back what it paid, and every client that
     calls one raises it. A route that pays silently is a member earning
     something they never see. */
  it.each([
    ["src/app/api/game/[accountId]/runs/[runId]/answer/route.ts", "xpEarned: earned"],
    ["src/app/api/game/[accountId]/runs/[runId]/complete/route.ts", "xpEarned: earned"],
    ["src/app/api/uk-study/[accountId]/lesson/start/route.ts", "xpEarned: earned"],
  ])("%s hands back what it paid", (file, marker) => {
    expect(readFileSync(file, "utf8")).toContain(marker);
  });

  it.each([
    ["src/app/game/useGameSession.ts"],
    ["src/app/users/[nickname]/study-explorer/lib/useStudyReviewSubmission.ts"],
  ])("%s raises it", (file) => {
    expect(readFileSync(file, "utf8")).toContain("showXpEarned(");
  });
});
