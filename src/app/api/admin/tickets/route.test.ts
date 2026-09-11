import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Ticket } from "@/lib/tickets";

vi.mock("@/lib/admin", () => ({
  isAuthorizedAdmin: vi.fn(async () => true),
  adminEmail: vi.fn(async () => "john@example.com"),
}));
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { email: "john@example.com" } })) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/apiRouteTelemetry", () => ({
  withApiRouteTelemetry: async ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

const moveTicket = vi.fn();
const gradeTicket = vi.fn();
const createTicket = vi.fn();
vi.mock("@/lib/ticketsServer", () => ({
  moveTicket: (...args: unknown[]) => moveTicket(...args),
  gradeTicket: (...args: unknown[]) => gradeTicket(...args),
  createTicket: (...args: unknown[]) => createTicket(...args),
  listTickets: vi.fn(async () => []),
}));

const { PATCH } = await import("./[ticketId]/route");
const { POST } = await import("./route");

const ticket = { id: "t1", status: "open", priority: null, effort: null } as unknown as Ticket;
const params = Promise.resolve({ ticketId: "t1" });

function patch(body: unknown, ip = "10.0.0.1"): Promise<Response> {
  return PATCH(
    new Request("http://test/api/admin/tickets/t1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
    { params },
  );
}

function post(body: unknown, ip = "10.0.0.2"): Promise<Response> {
  return POST(
    new Request("http://test/api/admin/tickets", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  moveTicket.mockReset();
  gradeTicket.mockReset();
  createTicket.mockReset();
  moveTicket.mockResolvedValue({ ok: true, ticket });
  gradeTicket.mockResolvedValue({ ...ticket, priority: "high" });
  createTicket.mockImplementation(async (draft: Partial<Ticket>) => ({ ...ticket, ...draft }));
});

describe("PATCH /api/admin/tickets/[ticketId]", () => {
  it("grades a row without moving it", async () => {
    const response = await patch({ priority: "high" });
    expect(response.status).toBe(200);
    expect(moveTicket).not.toHaveBeenCalled();
    expect(gradeTicket).toHaveBeenCalledWith("t1", { priority: "high" });
  });

  it("moves a row without grading it", async () => {
    const response = await patch({ status: "in_progress" });
    expect(response.status).toBe(200);
    expect(moveTicket).toHaveBeenCalledWith("t1", "in_progress", "john@example.com");
    expect(gradeTicket).not.toHaveBeenCalled();
  });

  it("writes no grade when the move in the same body is refused", async () => {
    moveTicket.mockResolvedValue({ ok: false, reason: "illegal", from: "shipped" });
    const response = await patch({ status: "open", effort: "small" });
    expect(response.status).toBe(409);
    expect(gradeTicket).not.toHaveBeenCalled();
  });

  it("takes null as ungrade and refuses an empty body", async () => {
    await patch({ effort: null });
    expect(gradeTicket).toHaveBeenCalledWith("t1", { effort: null });
    expect((await patch({})).status).toBe(400);
    expect((await patch({ status: "shipped" })).status).toBe(400);
  });

  it("says why a held or missing row did not move", async () => {
    moveTicket.mockResolvedValue({ ok: false, reason: "held", heldBy: "umakuma-4d" });
    const held = await patch({ status: "in_progress" });
    expect(held.status).toBe(409);
    expect(((await held.json()) as { error: string }).error).toContain("umakuma-4d");
    gradeTicket.mockResolvedValue(null);
    expect((await patch({ priority: "low" })).status).toBe(404);
  });
});

describe("POST /api/admin/tickets", () => {
  it("refuses a title too short to be a request, and says so in words", async () => {
    const response = await post({ title: "short" });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: string; problems: string[] };
    expect(body.problems).toHaveLength(1);
    expect(body.error).toMatch(/at least 8/);
    expect(createTicket).not.toHaveBeenCalled();
  });

  it("creates a ticket the rules allow, asked for by the signed-in admin", async () => {
    const response = await post({ title: "A ticket long enough", detail: "why" });
    expect(response.status).toBe(201);
    expect(createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ title: "A ticket long enough", detail: "why", requestedBy: "john@example.com" }),
    );
  });
});
