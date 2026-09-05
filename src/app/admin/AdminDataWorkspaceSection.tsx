"use client";

import AdminCatalogPanel from "./AdminCatalogPanel";
import AdminContentSourcesPanel from "./AdminContentSourcesPanel";
import type { AdminControlRoomProps } from "./AdminControlRoom.types";
import AdminJlptCatalogPanel from "./AdminJlptCatalogPanel";
import AdminJlptCatalogOperationsPanel from "./AdminJlptCatalogOperationsPanel";
import AdminLadderBrowser from "./AdminLadderBrowser";
import AdminLadderOps from "./AdminLadderOps";
import AdminSrsRulesPanel from "./AdminSrsRulesPanel";
import AdminXpTypesPanel from "./AdminXpTypesPanel";
import AdminBalanceSimulatorPanel from "./AdminBalanceSimulatorPanel";
import AdminThemesPanel from "./AdminThemesPanel";
import AdminSourcesPanel from "./AdminSourcesPanel";
import { usePersistedTab } from "@/lib/usePersistedTab";

type DataWorkspaceMode = "catalog" | "operations";

type AdminDataWorkspaceSectionProps = {
  dataCatalogView: DataView;
  onChangeDataCatalogView: (nextView: DataView) => void;
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

/**
 * `hasModes` is whether browsing and managing are different screens.
 *
 * WaniKani and JLPT sync from somewhere, so browsing the catalogue and running
 * its operations are genuinely two views. Grades and maps do not: both are
 * files in the repo, and their panel is one report on whether what shipped is
 * what is loaded. Showing a Browse/Manage toggle that changes nothing is worse
 * than showing none - it invites a click and then ignores it.
 */
const DATASETS = [
  { id: "wk", label: "WaniKani", hasModes: true },
  { id: "jlpt", label: "JLPT", hasModes: true },
  { id: "grades", label: "Grades", hasModes: false },
  { id: "maps", label: "Maps", hasModes: false },
  { id: "sources", label: "Sources", hasModes: false },
  { id: "ladder", label: "Ladder", hasModes: false },
  { id: "xp", label: "XP", hasModes: false },
  { id: "srs", label: "Scoring", hasModes: false },
  { id: "balance", label: "Balance", hasModes: false },
  { id: "themes", label: "Themes", hasModes: false },
] as const;

export type DataView = (typeof DATASETS)[number]["id"];

/** The ids, for the persisted-tab guard that has to validate a stored value. */
export const DATA_VIEWS = DATASETS.map((dataset) => dataset.id) as readonly DataView[];

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

const GROUP_LABEL = "text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60";

export default function AdminDataWorkspaceSection({
  dataCatalogView,
  onChangeDataCatalogView,
  sessionAuthorized,
  checkingSession,
  controlRoomProps,
}: AdminDataWorkspaceSectionProps) {
  const showModes = DATASETS.find((dataset) => dataset.id === dataCatalogView)?.hasModes ?? true;

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

        <div className={`items-center gap-2 ${showModes ? "flex" : "hidden"}`}>
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

      {dataCatalogView === "grades" || dataCatalogView === "maps" ? (
        <AdminContentSourcesPanel
          dataset={dataCatalogView}
          sessionAuthorized={sessionAuthorized}
          checkingSession={checkingSession}
        />
      ) : null}

      {dataCatalogView === "themes" ? <AdminThemesPanel /> : null}

      {/* Pricing the economy, which is why the kinds are rows. */}
      {dataCatalogView === "xp" && sessionAuthorized ? <AdminXpTypesPanel /> : null}

      {/* The switchboard for docs/SRS_MECHANISMS.md. */}
      {dataCatalogView === "srs" && sessionAuthorized ? <AdminSrsRulesPanel /> : null}

      {/* And judging the price, which is why the simulator sits beside it. */}
      {dataCatalogView === "balance" && sessionAuthorized ? <AdminBalanceSimulatorPanel /> : null}

      {dataCatalogView === "ladder" ? (
        <div className="space-y-3">
          <AdminLadderBrowser sessionAuthorized={sessionAuthorized} checkingSession={checkingSession} />
          {/* Editing sits under the table that shows what there is to edit. */}
          {sessionAuthorized ? <AdminLadderOps /> : null}
        </div>
      ) : null}

      {dataCatalogView === "sources" ? (
        <AdminSourcesPanel sessionAuthorized={sessionAuthorized} checkingSession={checkingSession} />
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
