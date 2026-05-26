"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getStoredEnum } from "@/lib/clientStorage";
import {
  ADMIN_WORKSPACE_STORAGE_KEY,
  ADMIN_WORKSPACE_TABS,
  type AdminWorkspaceTab,
  routeForAdminWorkspaceTab,
} from "./AdminWorkspaceTabs";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    const rememberedTab = getStoredEnum<AdminWorkspaceTab>(
      ADMIN_WORKSPACE_STORAGE_KEY,
      ADMIN_WORKSPACE_TABS,
      "operations",
    );
    router.replace(routeForAdminWorkspaceTab(rememberedTab));
  }, [router]);

  return (
    <div className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="noise-overlay pointer-events-none absolute inset-0" />
      <main className="relative mx-auto w-full max-w-6xl space-y-5">
        <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-foreground/75">Loading admin workspace...</p>
        </section>
      </main>
    </div>
  );
}
