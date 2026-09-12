import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/accountAccess", () => ({ canAccessAccount: vi.fn(async () => true) }));
vi.mock("@/lib/apiRouteTelemetry", () => ({
  withApiRouteTelemetry: async ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));
const createMapSet = vi.fn();
const listMapSets = vi.fn(async (_accountId: string) => [] as never[]);
vi.mock("@/lib/mapCustomSetsServer", () => ({
  createMapSet: (...args: unknown[]) => createMapSet(...args),
  listMapSets: (accountId: string) => listMapSets(accountId),
}));

const { POST, GET } = await import("./route");
const params = Promise.resolve({ accountId: "acct" });

function post(body: unknown): Promise<Response> {
  return POST(
    new Request("http://test/api/game/acct/map-sets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params },
  );
}

beforeEach(() => {
  createMapSet.mockReset();
});

describe("POST /api/game/[accountId]/map-sets", () => {
  it("saves a set the rules allow, for the member asking", async () => {
    createMapSet.mockResolvedValue({ ok: true, set: { id: "s1", country: "JP", name: "Kanto", regions: ["8", "9"], createdAt: "" } });
    const response = await post({ country: "JP", name: "Kanto", regions: [8, 9] });
    expect(response.status).toBe(201);
    expect(createMapSet).toHaveBeenCalledWith("acct", { country: "JP", name: "Kanto", regions: [8, 9] });
  });

  it("answers 422 with the problems in words when the rules refuse", async () => {
    createMapSet.mockResolvedValue({ ok: false, problems: ["Choose at least 2 to play with."] });
    const response = await post({ country: "JP", name: "One", regions: [1] });
    expect(response.status).toBe(422);
    expect(((await response.json()) as { problems: string[] }).problems).toEqual(["Choose at least 2 to play with."]);
  });

  it("refuses a body that is not a draft at all", async () => {
    expect((await post({ name: "x" })).status).toBe(400);
    expect(createMapSet).not.toHaveBeenCalled();
  });

  it("lists the member's sets", async () => {
    const response = await GET(new Request("http://test/api/game/acct/map-sets"), { params });
    expect(response.status).toBe(200);
    expect(listMapSets).toHaveBeenCalledWith("acct");
  });
});
