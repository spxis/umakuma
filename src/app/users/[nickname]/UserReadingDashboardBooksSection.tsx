import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import type { ReadingChallengeBookRecord } from "@/lib/readingSignoff";

import UserReadingBooksEditor from "./UserReadingBooksEditor";
import UserReadingBookCoverImage from "./UserReadingBookCoverImage";
import {
  getReadingBookCatalog,
  getRememberedBook,
  rememberSelectedBook,
  type ReadingBookCatalogOption,
} from "./UserReadingSignoffPanel.books";
import type { Member } from "./UserReadingSignoffPanel.types";

type UserReadingDashboardBooksSectionProps = {
  viewerCanChooseMember: boolean;
  members: Member[];
  selectedMemberId: string;
  memberBooks: ReadingChallengeBookRecord[];
  addIsbn: string;
  bookActionMessage: string;
  bookActionState: "idle" | "adding" | "deleting";
  onSelectedMemberChange: (nextMemberId: string) => void;
  onAddIsbnChange: (value: string) => void;
  onAddBook: () => Promise<void>;
  onAddBookByIsbn: (isbn: string) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
};

export default function UserReadingDashboardBooksSection({
  viewerCanChooseMember,
  members,
  selectedMemberId,
  memberBooks,
  addIsbn,
  bookActionMessage,
  bookActionState,
  onSelectedMemberChange,
  onAddIsbnChange,
  onAddBook,
  onAddBookByIsbn,
  onDeleteBook,
}: UserReadingDashboardBooksSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);
  const [selectedBookByMemberId, setSelectedBookByMemberId] = useState<Record<string, string>>({});
  const [selectedCatalogIsbnByMemberId, setSelectedCatalogIsbnByMemberId] = useState<Record<string, string>>({});
  const catalogMenuRef = useRef<HTMLDivElement | null>(null);
  const rememberedSelectedBook = useMemo(() => {
    const remembered = getRememberedBook(selectedMemberId);
    if (remembered && memberBooks.some((book) => book.title === remembered)) {
      return remembered;
    }

    return memberBooks[0]?.title ?? "";
  }, [memberBooks, selectedMemberId]);

  const selectedBookTitle = selectedBookByMemberId[selectedMemberId] ?? rememberedSelectedBook;
  const { data: catalogBooks = [], isLoading: catalogLoading } = useSWR<ReadingBookCatalogOption[]>(
    editorOpen ? `/api/reading-books/catalog?accountId=${encodeURIComponent(selectedMemberId)}` : null,
    () => getReadingBookCatalog(selectedMemberId),
    { revalidateOnFocus: false },
  );
  const selectedCatalogIsbn = selectedCatalogIsbnByMemberId[selectedMemberId] ?? "";
  const selectedCatalogBook = catalogBooks.find((book) => book.isbn === selectedCatalogIsbn) ?? null;

  useEffect(() => {
    if (!editorOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setEditorOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen || !catalogMenuOpen) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (catalogMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setCatalogMenuOpen(false);
    }

    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [catalogMenuOpen, editorOpen]);

  function handleSelectedBookChange(nextBookTitle: string) {
    setSelectedBookByMemberId((previous) => ({
      ...previous,
      [selectedMemberId]: nextBookTitle,
    }));

    if (nextBookTitle.trim().length > 0) {
      rememberSelectedBook(selectedMemberId, nextBookTitle);
    }
  }

  async function handleAddCatalogBook() {
    if (!selectedCatalogIsbn) {
      return;
    }

    await onAddBookByIsbn(selectedCatalogIsbn);
  }

  function handleCatalogBookSelect(nextIsbn: string) {
    setSelectedCatalogIsbnByMemberId((previous) => ({
      ...previous,
      [selectedMemberId]: nextIsbn,
    }));
    setCatalogMenuOpen(false);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-foreground">Books</h3>
          <p className="text-xs text-foreground/70">Add or remove challenge books from this page.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-line bg-surface-muted px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em]"
          onClick={() => setEditorOpen(true)}
          aria-expanded={editorOpen}
        >
          Edit books
        </button>
      </div>

      <p className="mt-2 text-xs text-foreground/70">Open the editor to add by ISBN or pick from existing titles.</p>

      {editorOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-2 sm:p-6"
          role="dialog"
          aria-label="Edit challenge books"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="flex max-h-[95dvh] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/60">Books editor</p>
                <h3 className="text-xl font-black text-foreground">Manage challenge books</h3>
                <p className="mt-1 text-sm text-foreground/70">Add by ISBN, choose a current title, or remove books.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-full border border-line px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]"
              >
                Close
              </button>
            </div>

            {viewerCanChooseMember ? (
              <label className="mt-4 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">User</span>
                <select
                  className="h-10 rounded-lg border border-line bg-surface-muted px-3 text-sm"
                  value={selectedMemberId}
                  onChange={(event) => onSelectedMemberChange(event.target.value)}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nickname}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Pick from local books</span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-60 flex-1" ref={catalogMenuRef}>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between rounded-lg border border-line bg-surface px-3 text-sm text-left"
                      onClick={() => {
                        if (catalogLoading || catalogBooks.length === 0) {
                          return;
                        }
                        setCatalogMenuOpen((previous) => !previous);
                      }}
                      disabled={catalogLoading || catalogBooks.length === 0}
                      aria-haspopup="listbox"
                      aria-expanded={catalogMenuOpen}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {selectedCatalogBook ? (
                          <UserReadingBookCoverImage
                            isbn={selectedCatalogBook.isbn}
                            title={selectedCatalogBook.title}
                            thumbnailUrl={selectedCatalogBook.thumbnailUrl}
                            width={20}
                            height={28}
                            size="small"
                            className="h-7 w-5 shrink-0 rounded object-cover"
                          />
                        ) : null}
                        <span className="truncate">{selectedCatalogBook?.title ?? "Select book"}</span>
                      </span>
                      <span className="text-xs text-foreground/65" aria-hidden="true">
                        ▾
                      </span>
                    </button>

                    {catalogMenuOpen ? (
                      <div
                        className="absolute left-0 right-0 top-[calc(100%+0.25rem)] z-20 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
                        role="listbox"
                        aria-label="Select book"
                      >
                        {catalogBooks.map((book) => {
                          const active = book.isbn === selectedCatalogIsbn;
                          return (
                            <button
                              key={`catalog-${book.isbn}`}
                              type="button"
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                                active ? "bg-brand/15" : "hover:bg-surface-muted"
                              }`}
                              onClick={() => {
                                handleCatalogBookSelect(book.isbn);
                              }}
                              role="option"
                              aria-selected={active}
                            >
                              <UserReadingBookCoverImage
                                isbn={book.isbn}
                                title={book.title}
                                thumbnailUrl={book.thumbnailUrl}
                                width={20}
                                height={28}
                                size="small"
                                className="h-7 w-5 shrink-0 rounded object-cover"
                              />
                              <span className="truncate">{book.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="h-10 rounded-full border border-line bg-surface px-4 text-xs font-bold uppercase tracking-[0.08em]"
                    disabled={catalogLoading || !selectedCatalogIsbn}
                    onClick={() => {
                      void handleAddCatalogBook();
                    }}
                  >
                    Add selected
                  </button>
                </div>
              </label>
              {catalogLoading ? <p className="mt-2 text-xs text-foreground/70">Loading local books...</p> : null}
              {!catalogLoading && catalogBooks.length === 0 ? (
                <p className="mt-2 text-xs text-foreground/70">No local books found yet. Add one by ISBN first.</p>
              ) : null}
            </div>

            <div className="mt-4">
              <UserReadingBooksEditor
                memberBooks={memberBooks}
                selectedBookTitle={selectedBookTitle}
                onBookChange={handleSelectedBookChange}
                addIsbn={addIsbn}
                bookActionMessage={bookActionMessage}
                bookActionState={bookActionState}
                onAddIsbnChange={onAddIsbnChange}
                onAddBook={onAddBook}
                onDeleteBook={onDeleteBook}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
