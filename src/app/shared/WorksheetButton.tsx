"use client";

import { useState } from "react";

import WorksheetModal from "./WorksheetModal";
import { WORKSHEET_MODAL_COPY as copy } from "./WorksheetModal.constants";

/**
 * The Worksheet control, on every surface that has something printable.
 *
 * One component rather than a link written out per surface: the list card, the
 * list's own page and the followed-lists shelf each drew their own anchor to
 * the same address, so the word, the title text and the behaviour had three
 * places to drift between. The address is still built by the caller, because
 * only the caller knows what it is a sheet of.
 */
export default function WorksheetButton({
  href,
  name,
  className = "",
}: {
  href: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" title={copy.openHint} onClick={() => setOpen(true)} className={className}>
        {copy.open}
      </button>
      {open ? <WorksheetModal href={href} name={name} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
