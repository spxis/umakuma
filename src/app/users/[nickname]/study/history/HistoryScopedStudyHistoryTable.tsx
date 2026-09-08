"use client";
import type { StudySource } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import StudyHistoryTable from "@/app/shared/StudyHistoryTable";
import { normalizeStudyHistorySource } from "@/lib/studyHistorySource";

import { HISTORY_PAGE_COPY } from "./historyCopy";

type StudyHistorySource = StudySource;

type Props = {
  accountId: string;
};

/*
 * Where Study starts, History starts: our ladder is the source everybody
 * has. The page read "anything but custom" as WaniKani, so a member who had
 * never switched sources opened History on a record they had never written.
 */
const DEFAULT_SOURCE: StudyHistorySource = "umakuma";

function normalizeSource(raw: string | null): StudyHistorySource {
  return normalizeStudyHistorySource(raw, DEFAULT_SOURCE);
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
      return DEFAULT_SOURCE;
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
      heading={HISTORY_PAGE_COPY.attempts[source]}
      collapsible={false}
    />
  );
}