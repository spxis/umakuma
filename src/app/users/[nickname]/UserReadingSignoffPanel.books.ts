import { getLocalStorageItem, setLocalStorageItem } from "@/lib/clientStorage";
import { normalizeIsbn } from "@/lib/readingSignoff";

type AddBookPayload = {
  error?: string;
  existed?: boolean;
  refreshed?: boolean;
  book?: { title?: string | null };
};

export type ReadingBookCatalogOption = {
  isbn: string;
  title: string;
};

export async function getReadingBookCatalog(accountId: string): Promise<ReadingBookCatalogOption[]> {
  const query = new URLSearchParams({ accountId });
  const response = await fetch(`/api/reading-books/catalog?${query.toString()}`, {
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: string;
    books?: ReadingBookCatalogOption[];
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Could not load books yet.");
  }

  return payload.books ?? [];
}

function isFallbackBookTitle(title: string, isbn: string): boolean {
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedIsbn = isbn.trim().toLowerCase();
  return normalizedTitle === `isbn ${normalizedIsbn}` || normalizedTitle === `isbn:${normalizedIsbn}`;
}

function addBookMessage(payload: AddBookPayload, normalizedIsbn: string): string {
  const bookTitle = payload.book?.title?.trim() ?? "";
  const titleIsFallback = isFallbackBookTitle(bookTitle, normalizedIsbn);

  if (payload.existed) {
    if (payload.refreshed && !titleIsFallback && bookTitle) {
      return `Book already in your collection. Metadata refreshed: ${bookTitle}.`;
    }

    if (payload.refreshed) {
      return "Book already in your collection. Metadata refreshed, but title is still missing from OpenBD/OpenLibrary/Google.";
    }

    return "Book already in your collection.";
  }

  if (!titleIsFallback && bookTitle) {
    return `Book added: ${bookTitle}.`;
  }

  return "Book added with ISBN fallback title. OpenBD/OpenLibrary/Google had no title right now.";
}

export async function addReadingBookByIsbn(input: {
  accountId: string;
  rawIsbn: string;
}): Promise<string> {
  const normalizedIsbn = normalizeIsbn(input.rawIsbn);
  if (!normalizedIsbn) {
    throw new Error("Enter a valid ISBN-10 or ISBN-13.");
  }

  const response = await fetch("/api/reading-books", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accountId: input.accountId,
      isbn: normalizedIsbn,
    }),
  });

  const payload = (await response.json()) as AddBookPayload;
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not add that book yet.");
  }

  return addBookMessage(payload, normalizedIsbn);
}

export async function deleteReadingBookById(input: {
  accountId: string;
  bookId: string;
}): Promise<string> {
  const response = await fetch("/api/reading-books", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accountId: input.accountId,
      bookId: input.bookId,
    }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Could not delete that book.");
  }

  return "Book removed.";
}

function lastBookStorageKey(memberId: string): string {
  return `wr:reading:last-book:${memberId}`;
}

export function rememberSelectedBook(memberId: string, title: string): void {
  const trimmed = title.trim();
  if (!trimmed || trimmed === "WaniKani only") {
    return;
  }

  setLocalStorageItem(lastBookStorageKey(memberId), trimmed);
}

export function getRememberedBook(memberId: string): string | null {
  const value = getLocalStorageItem(lastBookStorageKey(memberId));
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}
