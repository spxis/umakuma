"use client";

import { useEffect } from "react";

import { lockBodyScroll } from "@/lib/bodyScrollLock";
import {
  resolveParentFrameRect,
  resolveViewGlyphFrameSize,
  type ViewGlyphFrameSize,
} from "@/app/shared/viewGlyphModalHostHelpers";

type Options = {
  /** Bindings only apply while an item is on screen. */
  active: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFrameSize: (size: ViewGlyphFrameSize | null) => void;
};

/**
 * The window-level bindings the glyph viewer needs while it is open.
 *
 * The key handler runs in the capture phase and stops propagation on purpose:
 * the viewer can be opened from the Trouble/Favourites panel, and without this
 * a single Escape would close both. That is also why the viewer opts out of the
 * shared shell's Escape handling rather than using it.
 */
export function useViewGlyphWindowBindings({
  active,
  onClose,
  onPrevious,
  onNext,
  onFrameSize,
}: Options): void {
  useEffect(() => {
    if (!active) return;

    const onResize = () => {
      onFrameSize(resolveViewGlyphFrameSize(resolveParentFrameRect()));
    };

    const onKeyDownCapture = (event: KeyboardEvent) => {
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    };

    const unlockBodyScroll = lockBodyScroll();

    window.addEventListener("keydown", onKeyDownCapture, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("keydown", onKeyDownCapture, true);
      window.removeEventListener("resize", onResize);
      unlockBodyScroll();
    };
  }, [active, onClose, onFrameSize, onNext, onPrevious]);
}
