import { getServerSession } from "next-auth";
import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  INVITE_SESSION_COOKIE_NAME,
  getCookieValue,
  verifyInviteSessionToken,
} from "@/lib/inviteSession";
import { isItemSpread } from "@/lib/itemSpread";
import { prisma } from "@/lib/prisma";
import {
  READING_CHALLENGE_BOOK_SEEDS_BY_NICKNAME,
  normalizeIsbn,
  toOpenLibraryCoverUrl,
  toOpenLibraryBookUrl,
  type ReadingChallengeBookRecord,
  type ReadingSignoffEntryRecord,
  type ReadingSignoffRecord,
} from "@/lib/readingSignoff";
export type ViewerAccountSummary = {
  id: string;
  nickname: string;
  /** Absent when the account has no WaniKani link. */
  wkUsername: string | null;
  wkLevel: number | null;
  learnedKanji: number;
  learnedRadicals: number;
  learnedVocabulary: number;
};
export type LatestSignoffSummary = {
  accountId: string;
  bookTitle: string;
  pagesRead: number;
  signoffDatePst: string;
};
export type ReadingSignoffDelegate = typeof prisma.readingSignoff;
export type ReadingChallengeBookDelegate = typeof prisma.readingChallengeBook;
export type ReadingChallengeMemberDelegate = typeof prisma.readingChallengeMember;

export function getReadingSignoffDelegate(): ReadingSignoffDelegate | null {
  return prisma.readingSignoff;
}

export function getReadingChallengeBookDelegate(): ReadingChallengeBookDelegate | null {
  return prisma.readingChallengeBook;
}

export function getReadingChallengeMemberDelegate(): ReadingChallengeMemberDelegate | null {
  return prisma.readingChallengeMember;
}

function learnedCountsFromItemSpread(input: unknown): {
  learnedKanji: number;
  learnedRadicals: number;
  learnedVocabulary: number;
} {
  if (!isItemSpread(input)) {
    return { learnedKanji: 0, learnedRadicals: 0, learnedVocabulary: 0 };
  }

  return {
    learnedKanji: input.guru.kanji + input.master.kanji + input.enlightened.kanji + input.burned.kanji,
    learnedRadicals: input.guru.radical + input.master.radical + input.enlightened.radical + input.burned.radical,
    learnedVocabulary: input.guru.vocabulary + input.master.vocabulary + input.enlightened.vocabulary + input.burned.vocabulary,
  };
}

export function toReadingSignoffRecord(row: {
  id: string;
  challengeId?: string | null;
  accountId: string;
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewsLeft: number;
  apprenticeCount: number;
  currentWkLevel: number;
  createdAt: Date;
  updatedAt: Date;
}): ReadingSignoffRecord {
  return {
    id: row.id,
    challengeId: row.challengeId ?? null,
    accountId: row.accountId,
    signoffDatePst: row.signoffDatePst,
    bookTitle: row.bookTitle,
    pagesRead: row.pagesRead,
    minutesRead: row.minutesRead,
    didWanikaniReviews: row.didWanikaniReviews,
    reviewsLeft: row.reviewsLeft,
    apprenticeCount: row.apprenticeCount,
    currentWkLevel: row.currentWkLevel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toReadingSignoffEntryRecord(row: {
  id: string;
  challengeId?: string | null;
  accountId: string;
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewWorkDone: number;
  reviewCorrect: number;
  reviewIncorrect: number;
  reviewSuccessPercent: number | null;
  createdAt: Date;
}): ReadingSignoffEntryRecord {
  return {
    id: row.id,
    challengeId: row.challengeId ?? null,
    accountId: row.accountId,
    signoffDatePst: row.signoffDatePst,
    bookTitle: row.bookTitle,
    pagesRead: row.pagesRead,
    minutesRead: row.minutesRead,
    didWanikaniReviews: row.didWanikaniReviews,
    reviewWorkDone: row.reviewWorkDone,
    reviewCorrect: row.reviewCorrect,
    reviewIncorrect: row.reviewIncorrect,
    reviewSuccessPercent: row.reviewSuccessPercent,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toChallengeBookRecord(row: {
  id: string;
  challengeId?: string | null;
  accountId: string;
  isbn: string;
  title: string;
  thumbnailUrl: string | null;
  manualCoverUrl: string | null;
  infoUrl: string | null;
}): ReadingChallengeBookRecord {
  return {
    id: row.id,
    challengeId: row.challengeId ?? null,
    accountId: row.accountId,
    isbn: row.isbn,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    manualCoverUrl: row.manualCoverUrl,
    infoUrl: row.infoUrl,
  };
}

export async function resolveViewerAccounts(request: Request): Promise<ViewerAccountSummary[]> {
  if (await isAuthorizedAdmin(request)) {
    const rows = await prisma.account.findMany({
      orderBy: [{ nickname: "asc" }],
      select: { id: true, nickname: true, wkUsername: true, wkLevel: true, itemSpread: true },
    });

    return rows.map((row) => {
      const learned = learnedCountsFromItemSpread(row.itemSpread);
      return {
        id: row.id,
        nickname: row.nickname,
        wkUsername: row.wkUsername,
        wkLevel: row.wkLevel,
        ...learned,
      };
    });
  }

  const inviteToken = getCookieValue(request.headers.get("cookie"), INVITE_SESSION_COOKIE_NAME);
  const invitePayload = inviteToken ? verifyInviteSessionToken(inviteToken) : null;
  if (invitePayload?.accountId) {
    const inviteAccount = await prisma.account.findUnique({
      where: { id: invitePayload.accountId },
      select: {
        id: true,
        nickname: true,
        wkUsername: true,
        wkLevel: true,
        itemSpread: true,
        inviteCodeHash: true,
      },
    });

    if (inviteAccount?.inviteCodeHash) {
      return [{
        id: inviteAccount.id,
        nickname: inviteAccount.nickname,
        wkUsername: inviteAccount.wkUsername,
        wkLevel: inviteAccount.wkLevel,
        ...learnedCountsFromItemSpread(inviteAccount.itemSpread),
      }];
    }
  }

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  if (!viewerEmail) {
    return [];
  }

  const rows = await prisma.account.findMany({
    where: { joinedByEmail: viewerEmail },
    orderBy: [{ nickname: "asc" }],
    select: { id: true, nickname: true, wkUsername: true, wkLevel: true, itemSpread: true },
  });

  return rows.map((row) => {
    const learned = learnedCountsFromItemSpread(row.itemSpread);
    return {
      id: row.id,
      nickname: row.nickname,
      wkUsername: row.wkUsername,
      wkLevel: row.wkLevel,
      ...learned,
    };
  });
}

export async function ensureSeedBooks(
  accounts: ViewerAccountSummary[],
  challengeBooks: ReadingChallengeBookRecord[],
  readingChallengeBook: ReadingChallengeBookDelegate,
  challengeId: string | null,
): Promise<void> {
  const accountIdsWithBooks = new Set(challengeBooks.map((book) => book.accountId));
  const seedsToInsert: Array<{
    challengeId?: string | null;
    accountId: string;
    isbn: string;
    title: string;
    thumbnailUrl: string | null;
    infoUrl: string | null;
  }> = [];

  for (const account of accounts) {
    if (accountIdsWithBooks.has(account.id)) {
      continue;
    }

    const seedBooks = READING_CHALLENGE_BOOK_SEEDS_BY_NICKNAME[account.nickname.trim().toLowerCase()];
    if (!seedBooks) {
      continue;
    }

    for (const seedBook of seedBooks) {
      const normalizedIsbn = normalizeIsbn(seedBook.isbn);
      if (!normalizedIsbn) {
        continue;
      }

      seedsToInsert.push({
        challengeId,
        accountId: account.id,
        isbn: normalizedIsbn,
        title: seedBook.title,
        thumbnailUrl: toOpenLibraryCoverUrl(normalizedIsbn),
        infoUrl: toOpenLibraryBookUrl(normalizedIsbn),
      });
    }
  }

  if (seedsToInsert.length > 0) {
    await readingChallengeBook.createMany({
      data: seedsToInsert,
      skipDuplicates: true,
    });
  }
}

function toHttpsUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^http:\/\//, "https://");
}

function isLikelyJapaneseIsbn(isbn: string): boolean {
  const normalized = isbn.replace(/[^\dXx]/g, "").toUpperCase();
  return normalized.startsWith("4") || normalized.startsWith("9784");
}

async function fetchOpenBdCoverByIsbn(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Array<{
      summary?: {
        cover?: string;
      };
    } | null>;
    return toHttpsUrl(payload[0]?.summary?.cover);
  } catch {
    return null;
  }
}

async function fetchGoogleBooksCoverByIsbn(isbn: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      items?: Array<{
        volumeInfo?: {
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
          };
        };
      }>;
    };

    return toHttpsUrl(payload.items?.[0]?.volumeInfo?.imageLinks?.thumbnail ?? payload.items?.[0]?.volumeInfo?.imageLinks?.smallThumbnail);
  } catch {
    return null;
  }
}

async function resolveStableCoverUrl(isbn: string): Promise<string> {
  if (isLikelyJapaneseIsbn(isbn)) {
    const openBdCover = await fetchOpenBdCoverByIsbn(isbn);
    if (openBdCover) {
      return openBdCover;
    }
  }

  const googleCover = await fetchGoogleBooksCoverByIsbn(isbn);
  if (googleCover) {
    return googleCover;
  }

  return toOpenLibraryCoverUrl(isbn);
}

/**
 * Heal rows with broken openBD deterministic URLs and enrich JP ISBN rows with
 * a stable cover source when possible.
 */
export async function backfillStaleCoverUrls(
  challengeBooks: ReadingChallengeBookRecord[],
): Promise<void> {
  const updates: Array<{ id: string; thumbnailUrl: string }> = [];

  for (const book of challengeBooks) {
    const isBrokenOpenBd = book.thumbnailUrl?.includes("cover.openbd.jp") ?? false;
    const shouldEnrichJapaneseCover =
      isLikelyJapaneseIsbn(book.isbn) &&
      (!book.thumbnailUrl || book.thumbnailUrl.includes("covers.openlibrary.org") || isBrokenOpenBd);

    if (!isBrokenOpenBd && !shouldEnrichJapaneseCover) {
      continue;
    }

    const stableCover = await resolveStableCoverUrl(book.isbn);
    if (stableCover === book.thumbnailUrl) {
      continue;
    }

    updates.push({ id: book.id, thumbnailUrl: stableCover });
  }

  if (updates.length === 0) {
    return;
  }

  await Promise.all(
    updates.map((update) =>
      prisma.readingChallengeBook.update({
        where: { id: update.id },
        data: { thumbnailUrl: update.thumbnailUrl },
      }),
    ),
  );
}

/*
 * The reading challenge is one family's arrangement about pocket money, so
 * the route agrees with the page about who it is for. Access to an account is
 * not enough: the account has to be an internal one. Admins are always let
 * through, since they settle the challenge.
 */
export async function viewerMayReadChallenge(request: Request, accounts: ViewerAccountSummary[]): Promise<boolean> {
  if (await isAuthorizedAdmin(request)) return true;
  const internal = await prisma.account.count({
    where: { id: { in: accounts.map((account) => account.id) }, internal: true },
  });
  return internal > 0;
}

/** May this request write a check-in for that account? It must own it, and it must be internal. */
export async function canPostReadingSignoff(request: Request, accountId: string): Promise<boolean> {
  if (!(await canAccessAccount(request, accountId))) return false;
  const row = await prisma.account.findUnique({ where: { id: accountId }, select: { internal: true } });
  return row?.internal === true;
}
