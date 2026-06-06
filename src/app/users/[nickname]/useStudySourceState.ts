"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import type { StudySource } from "./study-explorer/lib/studyExplorerTypes";

type StudySourceCounts = {
  reviews: number;
  reviewsTotal: number;
  lessons: number;
  currentLevel: number | null;
  maxLevel: number | null;
};

type Args = {
  accountId: string;
  countsStorageKey: string;
  isHydrated: boolean;
};

type Result = {
  studySource: StudySource;
  setStudySource: React.Dispatch<React.SetStateAction<StudySource>>;
  customLibraryId: string | null;
  setCustomLibraryId: React.Dispatch<React.SetStateAction<string | null>>;
  studyCounts: StudySourceCounts | null;
  applySourceFromSearchParams: (params: URLSearchParams) => void;
};

export function useStudySourceState({ accountId, countsStorageKey, isHydrated }: Args): Result {
  const studySourceStorageKey = `wr:study-source:${accountId}`;
  const customLibraryStorageKey = `wr:study-custom-library:${accountId}`;

  const [studySource, setStudySource] = useState<StudySource>(() => {
    if (typeof window === "undefined") {
      return "wanikani";
    }

    const params = new URLSearchParams(window.location.search);
    const sourceFromUrl = params.get("source");
    if (sourceFromUrl === "custom" || sourceFromUrl === "wanikani") {
      return sourceFromUrl;
    }

    const storedSource = window.localStorage.getItem(studySourceStorageKey);
    return storedSource === "custom" || storedSource === "wanikani" ? storedSource : "wanikani";
  });
  const [customLibraryId, setCustomLibraryId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const libraryFromUrl = params.get("libraryId")?.trim();
    if (libraryFromUrl) {
      return libraryFromUrl;
    }

    const storedLibrary = window.localStorage.getItem(customLibraryStorageKey)?.trim();
    return storedLibrary ? storedLibrary : null;
  });
  const [studyCounts, setStudyCounts] = useState<StudySourceCounts | null>(null);

  const applySourceFromSearchParams = useCallback((params: URLSearchParams) => {
    const sourceFromUrl = params.get("source");
    if (sourceFromUrl === "custom" || sourceFromUrl === "wanikani") {
      setStudySource(sourceFromUrl);
    } else if (typeof window !== "undefined") {
      const storedSource = window.localStorage.getItem(studySourceStorageKey);
      setStudySource(storedSource === "custom" ? "custom" : "wanikani");
    } else {
      setStudySource("wanikani");
    }

    const libraryFromUrl = params.get("libraryId")?.trim();
    if (libraryFromUrl) {
      setCustomLibraryId(libraryFromUrl);
    } else if (typeof window !== "undefined") {
      const storedLibrary = window.localStorage.getItem(customLibraryStorageKey)?.trim();
      setCustomLibraryId(storedLibrary ? storedLibrary : null);
    } else {
      setCustomLibraryId(null);
    }
  }, [customLibraryStorageKey, studySourceStorageKey]);

  const countsApiPath = useMemo(
    () =>
      studySource === "custom"
        ? customLibraryId
          ? `/api/custom-study/${accountId}/counts?libraryId=${encodeURIComponent(customLibraryId)}`
          : null
        : `/api/study/${accountId}/counts`,
    [accountId, customLibraryId, studySource],
  );

  useSWR<StudySourceCounts>(
    countsApiPath,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as {
        reviews?: number;
        reviewsTotal?: number;
        lessons?: number;
        currentLevel?: number;
        maxLevel?: number;
        error?: string;
      };
      if (!response.ok || typeof payload.reviews !== "number" || typeof payload.lessons !== "number") {
        throw new Error(payload.error ?? "Could not load study counts.");
      }

      return {
        reviews: payload.reviews,
        reviewsTotal: typeof payload.reviewsTotal === "number" ? payload.reviewsTotal : payload.reviews,
        lessons: payload.lessons,
        currentLevel: typeof payload.currentLevel === "number" ? payload.currentLevel : null,
        maxLevel: typeof payload.maxLevel === "number" ? payload.maxLevel : null,
      };
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 30_000,
      onSuccess: (nextCounts) => {
        setStudyCounts((prev) => {
          if (
            prev &&
            prev.reviews === nextCounts.reviews &&
            prev.reviewsTotal === nextCounts.reviewsTotal &&
            prev.lessons === nextCounts.lessons &&
            prev.currentLevel === nextCounts.currentLevel &&
            prev.maxLevel === nextCounts.maxLevel
          ) {
            return prev;
          }
          return nextCounts;
        });

        try {
          window.localStorage.setItem(
            countsStorageKey,
            JSON.stringify({
              reviews: nextCounts.reviews,
              reviewsTotal: nextCounts.reviewsTotal,
              lessons: nextCounts.lessons,
              all: nextCounts.reviews + nextCounts.lessons,
              currentLevel: nextCounts.currentLevel,
              maxLevel: nextCounts.maxLevel,
            }),
          );
        } catch {
          // Ignore storage errors in restricted browsing modes.
        }
      },
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const readCounts = () => {
      const raw = window.localStorage.getItem(countsStorageKey);
      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as {
          reviews?: number;
          reviewsTotal?: number;
          lessons?: number;
          currentLevel?: number;
          maxLevel?: number;
        };
        if (typeof parsed.reviews === "number" && typeof parsed.lessons === "number") {
          const nextReviews = parsed.reviews;
          const nextReviewsTotal = typeof parsed.reviewsTotal === "number" ? parsed.reviewsTotal : parsed.reviews;
          const nextLessons = parsed.lessons;
          const nextCurrentLevel = typeof parsed.currentLevel === "number" ? parsed.currentLevel : null;
          const nextMaxLevel = typeof parsed.maxLevel === "number" ? parsed.maxLevel : null;
          setStudyCounts((prev) => {
            if (
              prev &&
              prev.reviews === nextReviews &&
              prev.reviewsTotal === nextReviewsTotal &&
              prev.lessons === nextLessons &&
              prev.currentLevel === nextCurrentLevel &&
              prev.maxLevel === nextMaxLevel
            ) {
              return prev;
            }
            return {
              reviews: nextReviews,
              reviewsTotal: nextReviewsTotal,
              lessons: nextLessons,
              currentLevel: nextCurrentLevel,
              maxLevel: nextMaxLevel,
            };
          });
        }
      } catch {
        // Ignore malformed cache values.
      }
    };

    readCounts();
    window.addEventListener("focus", readCounts);
    return () => {
      window.removeEventListener("focus", readCounts);
    };
  }, [countsStorageKey]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(studySourceStorageKey, studySource);
      if (customLibraryId) {
        window.localStorage.setItem(customLibraryStorageKey, customLibraryId);
      } else {
        window.localStorage.removeItem(customLibraryStorageKey);
      }
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }

    const params = new URLSearchParams(window.location.search);
    if (studySource === "custom") {
      params.set("source", "custom");
      if (customLibraryId) {
        params.set("libraryId", customLibraryId);
      } else {
        params.delete("libraryId");
      }
    } else {
      params.delete("source");
      params.delete("libraryId");
    }

    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [
    customLibraryId,
    customLibraryStorageKey,
    isHydrated,
    studySource,
    studySourceStorageKey,
  ]);

  return {
    studySource,
    setStudySource,
    customLibraryId,
    setCustomLibraryId,
    studyCounts,
    applySourceFromSearchParams,
  };
}
