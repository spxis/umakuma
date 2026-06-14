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

function dataCatalogViewClassName(isActive: boolean): string {
  return `inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-bold uppercase tracking-[0.08em] transition ${
    isActive
      ? "border-accent bg-accent text-white"
      : "border-line bg-surface text-slate-700 hover:bg-surface-muted"
  }`;
}

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

  const isWkData = dataCatalogView === "wk" && workspaceMode === "catalog";
  const isJlptData = dataCatalogView === "jlpt" && workspaceMode === "catalog";
  const isWkManage = dataCatalogView === "wk" && workspaceMode === "operations";
  const isJlptManage = dataCatalogView === "jlpt" && workspaceMode === "operations";

  return (
    <section id="admin-data" className="space-y-3">
      <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">Data</p>
        <p className="mt-1 text-sm text-foreground/70">Split catalog browsing from sync/update operations for cleaner workflows.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onChangeDataCatalogView("wk");
            setWorkspaceMode("catalog");
          }}
          className={dataCatalogViewClassName(isWkData)}
        >
          WK data
        </button>
        <button
          type="button"
          onClick={() => {
            onChangeDataCatalogView("jlpt");
            setWorkspaceMode("catalog");
          }}
          className={dataCatalogViewClassName(isJlptData)}
        >
          JLPT data
        </button>
        <button
          type="button"
          onClick={() => {
            onChangeDataCatalogView("wk");
            setWorkspaceMode("operations");
          }}
          className={dataCatalogViewClassName(isWkManage)}
        >
          WK manage
        </button>
        <button
          type="button"
          onClick={() => {
            onChangeDataCatalogView("jlpt");
            setWorkspaceMode("operations");
          }}
          className={dataCatalogViewClassName(isJlptManage)}
        >
          JLPT manage
        </button>
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
