import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { type GameChoiceCount } from "@/lib/gameBoard";

import { type PlacementProbeResult } from "./placementStaircase";

/**
 * The placement test's memory, carried by the client and signed by us.
 *
 * There is no placement table, and there should not be: a test that takes two
 * minutes and happens once does not need a row per probe, a sweeper for the
 * ones nobody finished, or a schema change to ship. What it does need is for
 * the answers to be worth something, and that is what the signature buys.
 *
 * Two things are in the ticket that the client never sees in the clear:
 * **which tile is the right one**, and **the history so far**. So a member
 * cannot mark their own probe correct — they would have to guess the target
 * out of the options, which is the test — and cannot rewind to a rung they
 * already failed. The ticket is bound to the account it was issued to, so one
 * cannot be carried to another.
 *
 * Modelled on `inviteSession.ts`, down to the secret it reads: an HMAC over a
 * base64url body, verified in constant time.
 */

const TICKET_MAX_AGE_SECONDS = 60 * 60 * 2;

export type PlacementTicket = {
  accountId: string;
  /** Every probe already answered, which is what the staircase reads. */
  history: PlacementProbeResult[];
  rung: number;
  choiceCount: GameChoiceCount;
  /** The right answer for each question, in the order they are shown. */
  targetSubjectIds: number[];
  /** Everything missed so far, so the seeding can put it at the bottom. */
  missedSubjectIds: number[];
};

function ticketSecret(): string {
  const secret = process.env.INVITE_SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("INVITE_SESSION_SECRET or AUTH_SECRET is required.");
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", ticketSecret()).update(value).digest("hex");
}

export function createPlacementTicket(ticket: PlacementTicket, now: Date = new Date()): string {
  const issuedAtSeconds = Math.floor(now.getTime() / 1000);
  const body = `${issuedAtSeconds}.${Buffer.from(JSON.stringify(ticket), "utf8").toString("base64url")}`;
  return `${body}.${sign(body)}`;
}

/**
 * Reads a ticket back, or refuses it.
 *
 * Null covers every refusal on purpose — a wrong signature, a stale ticket,
 * one issued to somebody else — because telling a caller which of those it was
 * only helps somebody probing it, and the answer to all three is the same:
 * start the test again.
 */
export function readPlacementTicket(
  token: string,
  accountId: string,
  now: Date = new Date(),
): PlacementTicket | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [issuedAtRaw, payloadEncoded, signature] = parts;
  if (!issuedAtRaw || !payloadEncoded || !signature) return null;

  const issuedAtSeconds = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAtSeconds)) return null;

  const currentSeconds = Math.floor(now.getTime() / 1000);
  if (currentSeconds - issuedAtSeconds > TICKET_MAX_AGE_SECONDS) return null;
  if (issuedAtSeconds > currentSeconds + 60) return null;

  const expected = Buffer.from(sign(`${issuedAtRaw}.${payloadEncoded}`));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as PlacementTicket;
    return parsed.accountId === accountId ? parsed : null;
  } catch {
    return null;
  }
}
