import { useEffect, useRef, useState } from "react";

import {
  STUDY_MODE_BEHAVIOR_OPTIONS,
  STUDY_MODE_OFF_OPTION,
} from "./explorerStudyMode";
import type { StudyModeBehavior } from "./study-explorer/lib/studyExplorerTypes";

type Props = {
  studyMode: boolean;
  studyModeBehavior: StudyModeBehavior;
  onSelectMode: (mode: StudyModeBehavior) => void;
  /**
   * Turning it off, which the menu had no entry for.
   *
   * The button beside it has always drawn an off state - plain rather than
   * hot - and there was no way to reach it: the four entries choose between
   * behaviours and every one of them turns study mode on.
   */
  onTurnOff: () => void;
};

const HOVER_CLOSE_DELAY_MS = 220;

export default function ExplorerStudyModeMenu({
  studyMode,
  studyModeBehavior,
  onSelectMode,
  onTurnOff,
}: Props) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hoverCloseTimerRef = useRef<number | null>(null);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const isMenuOpen = isHoverOpen || isPinnedOpen;

  const cancelHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current === null) {
      return;
    }
    window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
  };

  const openHoverMenu = () => {
    cancelHoverCloseTimer();
    setIsHoverOpen(true);
  };

  const closeHoverMenuSoon = () => {
    cancelHoverCloseTimer();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setIsHoverOpen(false);
      hoverCloseTimerRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      cancelHoverCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!isPinnedOpen || typeof window === "undefined") {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!menuRef.current || !target) {
        return;
      }

      if (!menuRef.current.contains(target)) {
        setIsPinnedOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinnedOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isPinnedOpen]);

  const handleSelectMode = (mode: StudyModeBehavior) => {
    onSelectMode(mode);
  };

  return (
    <div
      ref={menuRef}
      className="relative inline-flex min-w-0 flex-[1_1_0%] md:flex-none"
      onMouseEnter={openHoverMenu}
      onMouseLeave={closeHoverMenuSoon}
    >
      <button
        type="button"
        onClick={() => {
          setIsPinnedOpen((prev) => !prev);
          setIsHoverOpen(true);
        }}
        className={`inline-flex h-9 min-w-0 w-full items-center justify-center whitespace-nowrap rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition sm:h-10 sm:px-4 sm:text-xs sm:tracking-widest ${
          studyMode
            ? "border-hot bg-hot text-white"
            : "border-line bg-surface text-foreground hover:bg-surface-muted"
        }`}
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
      >
        <span>MODE</span>
      </button>
      {isMenuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-[0_18px_42px_rgba(8,16,36,0.16)]"
          onMouseEnter={openHoverMenu}
          onMouseLeave={closeHoverMenuSoon}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!studyMode}
            onClick={() => {
              onTurnOff();
              setIsPinnedOpen(false);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left transition ${
              studyMode ? "text-foreground hover:bg-surface-muted" : "bg-accent/12 text-accent"
            }`}
          >
            <p className="text-xs font-black uppercase tracking-[0.08em]">{STUDY_MODE_OFF_OPTION.label}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">
              {STUDY_MODE_OFF_OPTION.description}
            </p>
          </button>

          {STUDY_MODE_BEHAVIOR_OPTIONS.map((mode) => {
            /* A behaviour is only the chosen one while study mode is on. */
            const active = studyMode && mode.value === studyModeBehavior;
            return (
              <button
                key={mode.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  handleSelectMode(mode.value);
                  setIsPinnedOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left transition ${
                  active ? "bg-accent/12 text-accent" : "text-foreground hover:bg-surface-muted"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.08em]">{mode.label}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">{mode.description}</p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}