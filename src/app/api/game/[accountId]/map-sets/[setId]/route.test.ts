import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/accountAccess", () => ({ canAccessAccount: vi.fn(async () => true) }));
vi.mock("@/lib/admin", () => ({ isAuthorizedAdmin: vi.fn(async () => false) }));
vi.mock("@/lib/apiRouteTelemetry", () => ({
  withApiRouteTelemetry: async ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));
const updateMapSet = vi.fn();
const deleteMapSet = vi.fn();
vi.mock("@/lib/mapCustomSetsServer", () => ({
  updateMapSet: (...args: unknown[]) => updateMapSet(...args),
  deleteMapSet: (...args: unknown[]) => deleteMapSet(...args),
}));

const { PATCH, DELETE } = await import("./route");
const params = Promise.resolve({ accountId: "acct", setId: "s1" });

function patch(body: unknown): Promise<Response> {
  return PATCH(
    new Request("http://test/api/game/acct/map-sets/s1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params },
  );
}

beforeEach(() => {
  updateMapSet.mockReset();
  deleteMapSet.mockReset();
});

describe("PATCH /api/game/[accountId]/map-sets/[setId]", () => {
  it("changes the name, the regions, or both, for the owner", async () => {
    updateMapSet.mockResolvedValue({ ok: true, set: { id: "s1", country: "JP", name: "Kanto", regions: ["8", "9"], createdAt: "" } });
    expect((await patch({ name: "Kanto" })).status).toBe(200);
    expect(updateMapSet).toHaveBeenCalledWith("acct", "s1", { name: "Kanto" }, false);
  });

  it("says no such set for a stranger's id, and the problems for a bad edit", async () => {
    updateMapSet.mockResolvedValue({ ok: false, missing: true });
    expect((await patch({ regions: [1] })).status).toBe(404);
    updateMapSet.mockResolvedValue({ ok: false, problems: ["Choose at least 2 to play with."] });
    expect((await patch({ regions: [1] })).status).toBe(422);
  });

  it("passes a visibility change through with who is asking, so the rules can refuse site from a member", async () => {
    updateMapSet.mockResolvedValue({ ok: false, problems: ["Only an admin can share a set with the site."] });
    expect((await patch({ visibility: "site" })).status).toBe(422);
    expect(updateMapSet).toHaveBeenCalledWith("acct", "s1", { visibility: "site" }, false);
  });

  it("refuses an edit that changes nothing", async () => {
    expect((await patch({})).status).toBe(400);
    expect(updateMapSet).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/game/[accountId]/map-sets/[setId]", () => {
  it("removes the owner's set, and says no such set otherwise", async () => {
    deleteMapSet.mockResolvedValue(true);
    expect((await DELETE(new Request("http://test/x", { method: "DELETE" }), { params })).status).toBe(200);
    expect(deleteMapSet).toHaveBeenCalledWith("acct", "s1");
    deleteMapSet.mockResolvedValue(false);
    expect((await DELETE(new Request("http://test/x", { method: "DELETE" }), { params })).status).toBe(404);
  });
});
