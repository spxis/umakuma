import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions, isAdminEmail } from "@/lib/auth";
import AdminPageNav from "../AdminPageNav";

import { FEATURE_FLAGS_COPY } from "./FeatureFlags.constants";
import FeatureFlagsPanel from "./FeatureFlagsPanel";

export const dynamic = "force-dynamic";

export default async function AdminFeatureFlagsPage() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email ?? null)) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <AdminPageNav activeTab="featureFlags" />

      <h1 className="text-2xl font-black text-foreground sm:text-3xl">
        {FEATURE_FLAGS_COPY.title}
      </h1>
      <p className="mt-2 text-sm text-foreground/70">{FEATURE_FLAGS_COPY.subtitle}</p>

      <div className="mt-8">
        <FeatureFlagsPanel />
      </div>
    </main>
  );
}
