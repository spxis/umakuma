import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { withXpToast, XP_TOAST_COPY, XP_TOAST_MAX, type XpToast } from "./xpToast";

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
