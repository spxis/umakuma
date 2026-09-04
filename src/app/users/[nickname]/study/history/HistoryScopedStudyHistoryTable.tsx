"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import StudyHistoryTable from "@/app/shared/StudyHistoryTable";

type StudyHistorySource = "wanikani" | "custom";

type Props = {
  accountId: string;
};

function normalizeSource(raw: string | null): StudyHistorySource {
  return raw === "custom" ? "custom" : "wanikani";
}

function normalizeLibraryId(raw: string | null): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export default function HistoryScopedStudyHistoryTable({ accountId }: Props) {
  const searchParams = useSearchParams();
  const source = useMemo<StudyHistorySource>(() => {
    const sourceFromUrl = searchParams.get("source");
    if (sourceFromUrl !== null) {
      return normalizeSource(sourceFromUrl);
    }

    if (typeof window === "undefined") {
      return "wanikani";
    }

    return normalizeSource(window.localStorage.getItem(`wr:study-source:${accountId}`));
  }, [accountId, searchParams]);

  const libraryId = useMemo<string | null>(() => {
    const libraryFromUrl = normalizeLibraryId(searchParams.get("libraryId"));
    if (libraryFromUrl) {
      return libraryFromUrl;
    }

    if (typeof window === "undefined") {
      return null;
    }

    return normalizeLibraryId(window.localStorage.getItem(`wr:study-custom-library:${accountId}`));
  }, [accountId, searchParams]);

  const endpoint = useMemo(() => {
    const query = new URLSearchParams({ source });
    if (source === "custom" && libraryId) {
      query.set("libraryId", libraryId);
    }

    return `/api/study/${accountId}/history?${query.toString()}`;
  }, [accountId, libraryId, source]);

  return (
    <StudyHistoryTable
      endpoint={endpoint}
      showUserColumn={false}
      heading="Study attempts"
      collapsible={false}
    />
  );
}