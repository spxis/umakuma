"use client";

import ModalShell from "@/app/shared/ModalShell";
import { MODAL_LAYERS, type ModalLayer } from "@/app/shared/modalLayers";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  layer?: ModalLayer;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  layer = MODAL_LAYERS.menu,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {

  if (!open) {
    return null;
  }

  const confirmClass =
    tone === "danger"
      ? "border-red-300 bg-red-600 text-white hover:bg-red-700"
      : "border-accent bg-accent text-white hover:bg-accent-2";

  return (
    <ModalShell
      onClose={onCancel}
      layer={layer}
      label={title}
      scrim="light"
      gutter="md"
      /* A confirmation must not be dismissible by a stray click beside it, and
       * not at all while the action it guards is already running. */
      closeOnBackdrop={false}
      closeOnEscape={!busy}
      panelClassName="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-[0_20px_55px_rgba(8,16,36,0.25)]"
    >
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/60">Confirm action</p>
        <h3 className="mt-1 text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{description}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-55"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${confirmClass}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
    </ModalShell>
  );
}
