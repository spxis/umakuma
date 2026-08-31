"use client";

import AdminCatalogPanel from "./AdminCatalogPanel";
import type { AdminControlRoomProps } from "./AdminControlRoom.types";
import AdminJlptCatalogPanel from "./AdminJlptCatalogPanel";
import AdminJlptCatalogOperationsPanel from "./AdminJlptCatalogOperationsPanel";
import { usePersistedTab } from "@/lib/usePersistedTab";

type DataWorkspaceMode = "catalog" | "operations";

type AdminDataWorkspaceSectionProps = {
  dataCatalogView: "wk" | "jlpt";
  onChangeDataCatalogView: (nextView: "wk" | "jlpt") => void;
  sessionAuthorized: boolean;
  checkingSession: boolean;
  controlRoomProps: Omit<AdminControlRoomProps, "viewMode">;
};

/**
 * Which dataset, and whether you are reading it or changing it.
 *
 * These were four buttons - WK data, JLPT data, WK manage, JLPT manage - which
 * is the cross-product written out. Two problems with that. It wrapped: four
 * pills of that length do not fit a phone, so "JLPT manage" sat alone on a
 * second row. And it does not scale: a third dataset makes six buttons, a
 * fourth makes eight, and the row grows by two every time.
 *
 * Two controls instead, because it was always two questions. The dataset names
 * stay short enough to sit in one row, and adding one costs a chip rather than
 * a pair.
 */

const DATASETS = [
  { id: "wk", label: "WaniKani" },
  { id: "jlpt", label: "JLPT" },
] as const;

const MODES = [
  { id: "catalog", label: "Browse" },
  { id: "operations", label: "Manage" },
] as const;

function chipClassName(isActive: boolean): string {
  return `inline-flex h-9 items-center justify-center rounded-full border px-4 text-xs font-bold uppercase tracking-[0.08em] transition ${
    isActive
      ? "border-accent bg-accent text-white"
      : "border-line bg-surface text-slate-700 hover:bg-surface-muted"
  }`;
}

const GROUP_LABEL = "text-[10px] font-black uppercase tracking-[0.08em] text-foreground/45";

export default function AdminDataWorkspaceSection({
  dataCatalogView,
  onChangeDataCatalogView,
  sessionAuthorized,
  checkingSession,
  controlRoomProps,
}: AdminDataWorkspaceSectionProps) {
  const modeOptions = ["catalog", "operations"] as const;
  const [workspaceMode, setWorkspaceMode] = usePersistedTab<DataWorkspaceMode>(
    "wr:admin:data-workspace-mode",
    modeOptions,
    "catalog",
  );

  return (
    <section id="admin-data" className="space-y-3">
      <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Data</p>
        <p className="mt-1 text-sm text-foreground/70">
          Choose a dataset, then browse it or run its sync and update operations.
        </p>
      </div>

      {/* Each label stays with its own chips when the row wraps. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className={GROUP_LABEL}>Dataset</span>
          {DATASETS.map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => onChangeDataCatalogView(dataset.id)}
              className={chipClassName(dataCatalogView === dataset.id)}
            >
              {dataset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className={GROUP_LABEL}>View</span>
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setWorkspaceMode(mode.id)}
              className={chipClassName(workspaceMode === mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {dataCatalogView === "wk" ? (
        <AdminCatalogPanel
          viewMode={workspaceMode}
          sessionAuthorized={sessionAuthorized}
          checkingSession={checkingSession}
        />
      ) : null}

      {dataCatalogView === "jlpt" ? (
        <>
          {workspaceMode === "operations" ? (
            <AdminJlptCatalogOperationsPanel
              sessionAuthorized={sessionAuthorized}
              checkingSession={checkingSession}
              controlRoomProps={controlRoomProps}
            />
          ) : (
            <AdminJlptCatalogPanel
              sessionAuthorized={sessionAuthorized}
              checkingSession={checkingSession}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
