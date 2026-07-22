"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

import {
  VIEW_GLYPH_EVENT,
  type ViewGlyphViewerPayload,
} from "@/lib/viewGlyphViewer";

export default function ViewGlyphModalHostLoader() {
  const [ModalHost, setModalHost] = useState<ComponentType | null>(null);
  const loadingRef = useRef<Promise<void> | null>(null);
  const hostReadyRef = useRef(false);
  const pendingPayloadRef = useRef<ViewGlyphViewerPayload | null>(null);

  useEffect(() => {
    const onFirstOpen = (event: Event) => {
      if (hostReadyRef.current) {
        return;
      }

      pendingPayloadRef.current = (event as CustomEvent<ViewGlyphViewerPayload>).detail;
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = import("./ViewGlyphModalHost")
        .then(({ default: LoadedModalHost }) => {
          setModalHost(() => LoadedModalHost);
        })
        .catch(() => {
          loadingRef.current = null;
        });
    };

    window.addEventListener(VIEW_GLYPH_EVENT, onFirstOpen);
    return () => {
      window.removeEventListener(VIEW_GLYPH_EVENT, onFirstOpen);
    };
  }, []);

  useEffect(() => {
    if (!ModalHost) {
      return;
    }

    hostReadyRef.current = true;
    const timeoutId = window.setTimeout(() => {
      const payload = pendingPayloadRef.current;
      pendingPayloadRef.current = null;
      if (payload) {
        window.dispatchEvent(new CustomEvent(VIEW_GLYPH_EVENT, { detail: payload }));
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      hostReadyRef.current = false;
    };
  }, [ModalHost]);

  return ModalHost ? <ModalHost /> : null;
}