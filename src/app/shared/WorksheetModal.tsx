"use client";

import { useRef, useState } from "react";

import ModalShell from "./ModalShell";
import { MODAL_LAYERS } from "./modalLayers";
import { WORKSHEET_MODAL_COPY as copy } from "./WorksheetModal.constants";
import { sheetEmbedHref } from "@/app/users/[nickname]/practice/sheetLink";

/**
 * The worksheet, on the page that asked for it.
 *
 * Pressing Worksheet used to navigate to the sheet's own address, which
 * answered "let me print this" by taking the reader somewhere else - the
 * header even changed section, from Lists to Learn. John asked for this twice.
 *
 * The sheet is framed rather than rebuilt. Everything a printed sheet needs -
 * the tracing grid, the ink rules, the page breaks, the credit line - already
 * exists on that route and is already correct on paper, so a second
 * implementation here would be a second thing to keep true. The frame asks for
 * the same address with `embed=1`, which drops the site's own navigation
 * inside it.
 *
 * Print prints the frame, not this page. `contentWindow.print()` on a
 * same-origin frame gives the printer that document alone, which is why this
 * needs no print stylesheet of its own: the sheet's own rules are the ones
 * that run.
 */
export default function WorksheetModal({
  href,
  name,
  onClose,
}: {
  /** The sheet's ordinary address, exactly as the Worksheet link used to point at. */
  href: string;
  name: string;
  onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);

  return (
    <ModalShell
      onClose={onClose}
      layer={MODAL_LAYERS.page}
      label={copy.title(name)}
      height="list"
      closeOnBackdrop
      panelClassName="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-xl"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="min-w-0 truncate text-sm font-black text-foreground">{copy.title(name)}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={href}
            title={copy.fullHint}
            className="rounded-full border border-line px-3 py-1 text-xs font-bold text-foreground/70 hover:bg-surface-muted"
          >
            {copy.full}
          </a>
          <button
            type="button"
            title={copy.printHint}
            disabled={!ready}
            onClick={() => {
              /* The frame's own window, so the printer is handed the sheet and
                 not the page it is sitting on. */
              const view = frame.current?.contentWindow;
              view?.focus();
              view?.print();
            }}
            className="rounded-full bg-accent px-3 py-1 text-xs font-black text-white disabled:opacity-50"
          >
            {copy.print}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-3 py-1 text-xs font-bold text-foreground/70 hover:bg-surface-muted"
          >
            {copy.close}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 bg-white">
        {ready ? null : (
          <p className="absolute inset-0 grid place-items-center text-sm font-semibold text-foreground/60">
            {copy.loading}
          </p>
        )}
        <iframe
          ref={frame}
          src={sheetEmbedHref(href)}
          title={copy.title(name)}
          onLoad={() => setReady(true)}
          className="h-full w-full border-0"
        />
      </div>
    </ModalShell>
  );
}
