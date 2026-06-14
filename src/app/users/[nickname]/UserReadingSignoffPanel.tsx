"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";
import { getReadingDailyEarningsForecast } from "@/lib/readingEarnings";
import umaKumaLeft from "@/images/umakuma-1.png";
import { buildCalendarCells, computeReadingLeaderboard, getTodayDateInputValue, parseDateKeyAsUtc, type ReadingChallengeBookRecord, type ReadingSignoffEntryRecord, type ReadingSignoffRecord } from "@/lib/readingSignoff";
import UserReadingCampaignHeader from "./UserReadingCampaignHeader";
import UserReadingDashboardBooksSection from "./UserReadingDashboardBooksSection";
import UserReadingCalendar from "./UserReadingCalendar";
import UserReadingCheckinModal from "./UserReadingCheckinModal";
import UserReadingMemberHistoryModal from "./UserReadingMemberHistoryModal";
import UserReadingRewardsSummary from "./UserReadingRewardsSummary";
import { clampMonthKeyToBounds, resolveCampaignMonthBounds, resolveReadingCampaignOptions, resolveSelectedReadingCampaignId } from "./UserReadingSignoffPanel.campaigns";
import { applyReadingCheckinMode, getRememberedReadingCheckinMode, rememberReadingCheckinMode, type ReadingCheckinMode } from "./UserReadingSignoffPanel.mode";
import { addReadingBookByIsbn, deleteReadingBookById, getRememberedBook, rememberSelectedBook } from "./UserReadingSignoffPanel.books";
import { buildCheckinSavedMessage, type ReadingSignoffSubmitResponse } from "./UserReadingSignoffPanel.submit";
import { fetchReadingSignoffs } from "./UserReadingSignoffPanel.api";
import { buildTodayStatsByAccountId } from "./UserReadingSignoffPanel.stats";
import { createFormState, type FormState, type Member, type ReadingCampaignOption, type ReadingSignoffResponse, type UserReadingSignoffPanelProps } from "./UserReadingSignoffPanel.types";
import SegmentedControl from "@/app/shared/SegmentedControl";

export default function UserReadingSignoffPanel({ accountId, initialMonthKey, initialData }: UserReadingSignoffPanelProps) {
  const today = getTodayDateInputValue();
  const todayMonthKey = today.slice(0, 7);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(initialData?.selectedChallengeId ?? ACTIVE_READING_CHALLENGE.id);
  const resolvedInitialMonthKey = initialMonthKey ?? todayMonthKey;
  const [monthKey, setMonthKey] = useState(resolvedInitialMonthKey);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateKey, setModalDateKey] = useState(today);
  const [form, setForm] = useState<FormState | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(accountId);
  const [addIsbn, setAddIsbn] = useState("");
  const [bookActionMessage, setBookActionMessage] = useState("");
  const [bookActionState, setBookActionState] = useState<"idle" | "adding" | "deleting">("idle");
  const [modalDirty, setModalDirty] = useState(false);
  const [historyMember, setHistoryMember] = useState<Member | null>(null);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState<string>("");
  const [activeReadTab, setActiveReadTab] = useState<"challenge" | "checkins">("challenge");
  const summarySwrKey = `/api/reading-signoffs?month=${encodeURIComponent(todayMonthKey)}&challengeId=${encodeURIComponent(selectedCampaignId)}`;
  const calendarSwrKey = `/api/reading-signoffs?month=${encodeURIComponent(monthKey)}&challengeId=${encodeURIComponent(selectedCampaignId)}`;
  const { data: summaryData, mutate: mutateSummary, isLoading: isSummaryLoading } = useSWR<ReadingSignoffResponse>(
    summarySwrKey,
    fetchReadingSignoffs,
    {
      fallbackData: todayMonthKey === resolvedInitialMonthKey ? (initialData ?? undefined) : undefined,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnMount: true,
    },
  );
  const { data: calendarData, mutate: mutateCalendar, isLoading: isCalendarLoading } = useSWR<ReadingSignoffResponse>(
    calendarSwrKey,
    fetchReadingSignoffs,
    {
      fallbackData: monthKey === resolvedInitialMonthKey ? (initialData ?? undefined) : undefined,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnMount: true,
    },
  );
  const baseData = summaryData ?? calendarData;
  const members = useMemo(() => baseData?.members ?? [], [baseData?.members]);
  const viewerCanChooseMember = baseData?.viewerCanChooseMember ?? false;
  const trackedMemberAccountIds = useMemo(() => baseData?.trackedMemberAccountIds ?? [], [baseData?.trackedMemberAccountIds]);
  const signoffs = useMemo(() => calendarData?.signoffs ?? [], [calendarData?.signoffs]);
  const signoffEntries = useMemo(() => calendarData?.signoffEntries ?? [], [calendarData?.signoffEntries]);
  const reviewQueues = useMemo(() => baseData?.reviewQueues ?? [], [baseData?.reviewQueues]);
  const challengeBooks = useMemo(() => summaryData?.challengeBooks ?? calendarData?.challengeBooks ?? [], [calendarData?.challengeBooks, summaryData?.challengeBooks]);
  const latestSignoffs = useMemo(() => summaryData?.latestSignoffs ?? calendarData?.latestSignoffs ?? [], [calendarData?.latestSignoffs, summaryData?.latestSignoffs]);
  const campaigns = useMemo<ReadingCampaignOption[]>(
    () => resolveReadingCampaignOptions(baseData?.campaigns, initialData?.selectedChallengeId ?? selectedCampaignId),
    [baseData?.campaigns, initialData?.selectedChallengeId, selectedCampaignId],
  );
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0] ?? null,
    [campaigns, selectedCampaignId],
  );
  const selectedCampaignName = selectedCampaign?.name ?? ACTIVE_READING_CHALLENGE.name;
  const selectedCampaignStartDatePst = selectedCampaign?.startDatePst ?? ACTIVE_READING_CHALLENGE.startDatePst;
  const selectedCampaignGoalDatePst = selectedCampaign?.goalDatePst ?? ACTIVE_READING_CHALLENGE.goalDatePst;
  const selectedCampaignTripDatePst = selectedCampaign?.tripDatePst ?? ACTIVE_READING_CHALLENGE.tripDatePst;
  const selectedCampaignTargetBaseYen = selectedCampaign?.targetBaseYen ?? ACTIVE_READING_CHALLENGE.targetBaseYen;
  const campaignMonthBounds = useMemo(() => resolveCampaignMonthBounds({ campaigns, selectedCampaignId }), [campaigns, selectedCampaignId]);
  async function mutateAllReadingData() {
    if (summarySwrKey === calendarSwrKey) {
      await mutateSummary();
      return;
    }
    await Promise.all([mutateSummary(), mutateCalendar()]);
  }
  const daysRemaining = useMemo(() => {
    const todayDate = parseDateKeyAsUtc(today);
    const tripDate = parseDateKeyAsUtc(selectedCampaignTripDatePst);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.floor((tripDate.getTime() - todayDate.getTime()) / msPerDay) + 1;
    return Math.max(0, diff);
  }, [selectedCampaignTripDatePst, today]);
  const trackedMemberIds = useMemo(
    () => (trackedMemberAccountIds.length === 0 ? members.map((member) => member.id) : trackedMemberAccountIds),
    [members, trackedMemberAccountIds],
  );
  useEffect(() => {
    const clampedCurrentMonth = clampMonthKeyToBounds(todayMonthKey, campaignMonthBounds);
    setMonthKey((previousMonthKey) => (previousMonthKey === clampedCurrentMonth ? previousMonthKey : clampedCurrentMonth));
  }, [campaignMonthBounds, todayMonthKey]);
  useEffect(() => {
    const nextSelectedCampaignId = resolveSelectedReadingCampaignId({
      currentCampaignId: selectedCampaignId,
      serverCampaignId: baseData?.selectedChallengeId,
      campaigns,
    });
    if (nextSelectedCampaignId !== selectedCampaignId) {
      setSelectedCampaignId(nextSelectedCampaignId);
    }
  }, [baseData?.selectedChallengeId, campaigns, selectedCampaignId]);
  const trackedMemberSet = useMemo(() => new Set(trackedMemberIds), [trackedMemberIds]);
  const trackedMembers = useMemo(() => members.filter((member) => trackedMemberSet.has(member.id)), [members, trackedMemberSet]);
  const memberByAccountId = useMemo(() => new Map(trackedMembers.map((member) => [member.id, member])), [trackedMembers]);
  const latestSignoffByAccountId = useMemo(() => new Map(latestSignoffs.map((row) => [row.accountId, row])), [latestSignoffs]);
  const booksByAccountId = useMemo(() => {
    const map = new Map<string, ReadingChallengeBookRecord[]>();
    for (const book of challengeBooks) {
      const list = map.get(book.accountId) ?? [];
      list.push(book);
      map.set(book.accountId, list);
    }
    return map;
  }, [challengeBooks]);
  const signoffByDayAndMember = useMemo(() => {
    const byDayAndMember = new Map<string, Map<string, ReadingSignoffRecord>>();
    for (const signoff of signoffs) {
      const dayMap = byDayAndMember.get(signoff.signoffDatePst) ?? new Map<string, ReadingSignoffRecord>();
      dayMap.set(signoff.accountId, signoff);
      byDayAndMember.set(signoff.signoffDatePst, dayMap);
    }
    return byDayAndMember;
  }, [signoffs]);
  const signoffEntriesByDayAndMember = useMemo(() => {
    const byDayAndMember = new Map<string, Map<string, ReadingSignoffEntryRecord[]>>();
    for (const entry of signoffEntries) {
      const dayMap = byDayAndMember.get(entry.signoffDatePst) ?? new Map<string, ReadingSignoffEntryRecord[]>();
      const list = dayMap.get(entry.accountId) ?? [];
      list.push(entry);
      dayMap.set(entry.accountId, list);
      byDayAndMember.set(entry.signoffDatePst, dayMap);
    }
    return byDayAndMember;
  }, [signoffEntries]);
  const dailyForecastByAccountId = useMemo(
    () =>
      new Map(
        trackedMembers.map((member) => [
          member.id,
          getReadingDailyEarningsForecast({
            accountId: member.id,
            signoffs,
            todayDateKey: today,
          }),
        ]),
      ),
    [signoffs, today, trackedMembers],
  );
  const reviewQueueByAccountId = useMemo(
    () => new Map(reviewQueues.map((row) => [row.accountId, row])),
    [reviewQueues],
  );
  const todayStatsByAccountId = useMemo(
    () =>
      buildTodayStatsByAccountId({
        trackedMembers,
        signoffByDayAndMember,
        signoffEntriesByDayAndMember,
        today,
      }),
    [signoffByDayAndMember, signoffEntriesByDayAndMember, today, trackedMembers],
  );

  const leaderboard = useMemo(() => {
    const rows = computeReadingLeaderboard(trackedMembers, signoffs, today).map((row) => {
      const member = memberByAccountId.get(row.accountId);
      const latestSignoff = latestSignoffByAccountId.get(row.accountId);
      const forecast = dailyForecastByAccountId.get(row.accountId);
      const todayStats = todayStatsByAccountId.get(row.accountId);
      const currentBook = (booksByAccountId.get(row.accountId) ?? []).find((book) => book.title === (latestSignoff?.bookTitle ?? ""));
      const currentBookThumbnailUrl = currentBook?.thumbnailUrl ?? null;
      return {
        ...row,
        nickname: member?.nickname ?? row.accountId,
        wkLevel: member?.wkLevel ?? 0,
        learnedKanji: member?.learnedKanji ?? 0,
        learnedRadicals: member?.learnedRadicals ?? 0,
        learnedVocabulary: member?.learnedVocabulary ?? 0,
        currentBookTitle: latestSignoff?.bookTitle ?? "-",
        currentBookIsbn: currentBook?.isbn ?? null,
        currentBookThumbnailUrl,
        currentBookPage: latestSignoff?.pagesRead ?? null,
        pagesRemainingForReadingPass: Math.max(0, 15 - (todayStats?.pagesRead ?? 0)),
        minutesRemainingForReadingPass: Math.max(0, 15 - (todayStats?.minutesRead ?? 0)),
        minutesRemainingForThirtyBonus: Math.max(0, 31 - (todayStats?.minutesRead ?? 0)),
        weekCapYen: forecast?.weekCapYen ?? 0,
        todayMaxNormalYen: forecast?.todayMaxNormalYen ?? 0,
        todayMinimumNormalYen: forecast?.todayMinimumNormalYen ?? 0,
        nextDayMaxNormalYenIfPerfectToday: forecast?.nextDayMaxNormalYenIfPerfectToday ?? 0,
        nextDayMaxNormalYenIfMissToday: forecast?.nextDayMaxNormalYenIfMissToday ?? 0,
        reviewKanjiToday: todayStats?.reviewKanji ?? 0,
        reviewVocabularyToday: todayStats?.reviewVocabulary ?? 0,
        reviewRadicalToday: todayStats?.reviewRadical ?? 0,
        reviewTotalToday: todayStats?.reviewTotal ?? 0,
        zeroReviewsBonusToday: todayStats?.zeroReviewsBonus ?? false,
      };
    });

    return rows.sort((a, b) => b.totalYen - a.totalYen);
  }, [booksByAccountId, dailyForecastByAccountId, latestSignoffByAccountId, memberByAccountId, signoffs, today, todayStatsByAccountId, trackedMembers]);
  const calendarCells = useMemo(() => buildCalendarCells(monthKey), [monthKey]);
  function findEntry(memberId: string, dateKey: string): ReadingSignoffRecord | null {
    return signoffByDayAndMember.get(dateKey)?.get(memberId) ?? null;
  }
  function booksForMember(memberId: string): ReadingChallengeBookRecord[] {
    return booksByAccountId.get(memberId) ?? [];
  }
  const modalMember = members.find((member) => member.id === selectedMemberId) ?? null;
  const accountMember = members.find((member) => member.id === accountId) ?? null;
  const selectedReviewQueue = reviewQueueByAccountId.get(selectedMemberId) ?? { accountId: selectedMemberId, radical: 0, kanji: 0, vocabulary: 0, total: 0 };
  const modalDate = form?.signoffDatePst ?? modalDateKey;
  const modalExistingEntry = findEntry(selectedMemberId, modalDate);
  function setModalMember(memberId: string, dateKey: string) {
    const existingEntry = findEntry(memberId, dateKey);
    const memberBooks = booksForMember(memberId);
    const rememberedBook = getRememberedBook(memberId);
    const rememberedMode = getRememberedReadingCheckinMode(memberId);
    const resolvedBookTitle = existingEntry?.bookTitle
      ?? (rememberedBook && memberBooks.some((book) => book.title === rememberedBook)
        ? rememberedBook
        : memberBooks[0]?.title ?? "");
    const baseForm = {
      ...createFormState(dateKey, existingEntry),
      bookTitle: resolvedBookTitle,
    };
    const nextForm = rememberedMode ? applyReadingCheckinMode(baseForm, rememberedMode) : baseForm;
    setSelectedMemberId(memberId);
    setForm(nextForm);
    if (nextForm.bookTitle) {
      rememberSelectedBook(memberId, nextForm.bookTitle);
    }
    setBookActionMessage("");
  }
  function openCheckinModal(dateKey: string) {
    const defaultMemberId = members.some((member) => member.id === accountId)
      ? accountId
      : members[0]?.id ?? accountId;
    setModalDateKey(dateKey);
    setModalMember(defaultMemberId, dateKey);
    setSubmitState("idle");
    setSubmitMessage("");
    setAddIsbn("");
    setModalDirty(false);
    setModalOpen(true);
  }
  function requestCloseModal() {
    setModalOpen(false);
    setModalDirty(false);
  }
  function updateForm(mutator: (input: FormState) => FormState) {
    setForm((prev) => (prev ? mutator(prev) : prev));
  }
  async function addBookByIsbn(rawIsbn: string = addIsbn) {
    setBookActionMessage("");
    try {
      setBookActionState("adding");
      const message = await addReadingBookByIsbn({
        accountId: selectedMemberId,
        rawIsbn,
      });
      setBookActionMessage(message);
      setAddIsbn("");
      await mutateAllReadingData();
    } catch (error) {
      setBookActionMessage(error instanceof Error ? error.message : "Could not add that book yet.");
    } finally {
      setBookActionState("idle");
    }
  }
  async function deleteBook(bookId: string) {
    setBookActionMessage("");
    try {
      setBookActionState("deleting");
      const message = await deleteReadingBookById({ accountId: selectedMemberId, bookId });
      setBookActionMessage(message);
      await mutateAllReadingData();
    } catch (error) {
      setBookActionMessage(error instanceof Error ? error.message : "Could not delete that book.");
    } finally {
      setBookActionState("idle");
    }
  }
  async function submitSignoff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) {
      return;
    }
    const hasReadingActivity = form.pagesRead > 0 || form.minutesRead > 0;
    const hasWaniKaniActivity = form.didWanikaniReviews;
    const isWaniKaniOnlyCheckin = !hasReadingActivity && hasWaniKaniActivity;
    setSubmitState("saving");
    setSubmitMessage("");
    try {
      if (!hasReadingActivity && !hasWaniKaniActivity) {
        throw new Error("Choose reading activity, WaniKani activity, or both before saving.");
      }
      if (hasReadingActivity && booksForMember(selectedMemberId).length < 3) {
        throw new Error("Add at least 3 books before saving check-in.");
      }
      if (hasReadingActivity && !form.bookTitle.trim()) {
        throw new Error("Pick a book from the collection before saving.");
      }
      const fallbackBookTitle = modalExistingEntry?.bookTitle ?? booksForMember(selectedMemberId)[0]?.title ?? "Reviews only";
      const submittedBookTitle = isWaniKaniOnlyCheckin
        ? "WaniKani only"
        : form.bookTitle.trim() || fallbackBookTitle;
      if (!isWaniKaniOnlyCheckin && submittedBookTitle.trim().length > 0) {
        rememberSelectedBook(selectedMemberId, submittedBookTitle);
      }
      const response = await fetch("/api/reading-signoffs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedMemberId,
          challengeId: selectedCampaignId,
          signoffDatePst: form.signoffDatePst,
          bookTitle: submittedBookTitle,
          pagesRead: form.pagesRead,
          minutesRead: form.minutesRead,
          didWanikaniReviews: form.didWanikaniReviews,
        }),
      });
      const payload = (await response.json()) as ReadingSignoffSubmitResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save check-in.");
      }
      setMonthKey(form.signoffDatePst.slice(0, 7));
      setSubmitState("saved");
      setSubmitMessage(buildCheckinSavedMessage(payload));
      setModalDirty(false);
      await mutateAllReadingData();
      window.setTimeout(() => {
        setModalOpen(false);
      }, 250);
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "Could not save check-in.");
    }
  }
  function updateCheckinMode(mode: ReadingCheckinMode) {
    rememberReadingCheckinMode(selectedMemberId, mode);
    setModalDirty(true);
    updateForm((prev) => applyReadingCheckinMode(prev, mode));
  }
  function updateFormField(mutator: (input: FormState) => FormState) {
    setModalDirty(true);
    updateForm(mutator);
  }
  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <SegmentedControl
          ariaLabel="Read sections"
          value={activeReadTab}
          onChange={(value) => setActiveReadTab(value as "challenge" | "checkins")}
          size="sm"
          options={[{ value: "challenge", label: "Challenge" }, { value: "checkins", label: "Check-ins" }]}
        />
      </div>
      <section className="space-y-4 rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="overflow-hidden rounded-xl border border-line/70 bg-surface">
            <Image src={umaKumaLeft} alt="Uma and Kuma" width={96} height={60} className="h-13 w-24 object-contain p-1.5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Read</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Track challenge rewards and daily check-ins.</p>
          </div>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-line bg-surface/90 p-4 sm:p-6">
        {activeReadTab === "challenge" ? (
          <div className="space-y-4">
            <UserReadingRewardsSummary
              campaignName={selectedCampaignName}
              campaignStartDatePst={selectedCampaignStartDatePst}
              campaignGoalDatePst={selectedCampaignGoalDatePst}
              campaignTripDatePst={selectedCampaignTripDatePst}
              campaignTargetBaseYen={selectedCampaignTargetBaseYen}
              daysRemaining={daysRemaining}
              isLoading={isSummaryLoading}
              leaderboard={leaderboard}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <UserReadingCampaignHeader
              campaigns={campaigns}
              selectedCampaignId={selectedCampaignId}
              onCampaignChange={setSelectedCampaignId}
            />
            <UserReadingDashboardBooksSection
              viewerCanChooseMember={viewerCanChooseMember}
              members={members}
              selectedMemberId={selectedMemberId}
              memberBooks={booksForMember(selectedMemberId)}
              addIsbn={addIsbn}
              bookActionMessage={bookActionMessage}
              bookActionState={bookActionState}
              onSelectedMemberChange={setSelectedMemberId}
              onAddIsbnChange={setAddIsbn}
              onAddBook={addBookByIsbn}
              onAddBookByIsbn={addBookByIsbn}
              onDeleteBook={deleteBook}
            />
            <UserReadingCalendar
              monthKey={monthKey}
              today={today}
              todayMonthKey={todayMonthKey}
              isLoading={isCalendarLoading}
              trackedMembers={trackedMembers}
              challengeBooks={challengeBooks}
              calendarCells={calendarCells}
              signoffByDayAndMember={signoffByDayAndMember}
              signoffEntriesByDayAndMember={signoffEntriesByDayAndMember}
              viewerCanChooseMember={viewerCanChooseMember}
              onMonthChange={setMonthKey}
              onOpenCheckinModal={openCheckinModal}
              onOpenMemberHistory={setHistoryMember}
            />
          </div>
        )}
      </section>
      <UserReadingMemberHistoryModal open={historyMember !== null} member={historyMember}
        signoffs={historyMember ? signoffs.filter((r) => r.accountId === historyMember.id) : []}
        entries={historyMember ? signoffEntries.filter((r) => r.accountId === historyMember.id) : []}
        memberBooks={historyMember ? challengeBooks.filter((r) => r.accountId === historyMember.id) : []}
        isAdmin={viewerCanChooseMember} onClose={() => setHistoryMember(null)} onMutate={mutateAllReadingData} />
      <UserReadingCheckinModal
        open={modalOpen}
        form={form}
        members={members}
        selectedMemberId={selectedMemberId}
        selectedMemberName={modalMember?.nickname ?? accountMember?.nickname ?? members[0]?.nickname ?? "Player"}
        viewerCanChooseMember={viewerCanChooseMember}
        allowSignoffDateEdit={viewerCanChooseMember}
        maxSignoffDatePst={today}
        memberBooks={booksForMember(selectedMemberId)}
        addIsbn={addIsbn}
        bookActionMessage={bookActionMessage}
        bookActionState={bookActionState}
        submitState={submitState}
        submitMessage={submitMessage}
        isDirty={modalDirty || addIsbn.trim().length > 0}
        selectedReviewQueue={selectedReviewQueue}
        modalExistingEntry={modalExistingEntry}
        onRequestClose={requestCloseModal}
        onSubmit={submitSignoff}
        onMemberChange={(nextMemberId) => {
          setModalDirty(true);
          setModalMember(nextMemberId, modalDate);
        }}
        onSignoffDateChange={(nextDateKey) => updateFormField((prev) => ({ ...prev, signoffDatePst: nextDateKey }))}
        onAddIsbnChange={(value) => {
          setAddIsbn(value);
          setModalDirty(true);
        }}
        onAddBook={addBookByIsbn}
        onDeleteBook={deleteBook}
        onQuickReading={() => updateCheckinMode("reading")}
        onQuickWaniKani={() => updateCheckinMode("wanikani")}
        onQuickBoth={() => updateCheckinMode("both")}
        onBookChange={(nextBook) => {
          rememberSelectedBook(selectedMemberId, nextBook);
          updateFormField((prev) => ({ ...prev, bookTitle: nextBook }));
        }}
        onPagesChange={(nextPages) => updateFormField((prev) => ({ ...prev, pagesRead: nextPages }))}
        onMinutesChange={(nextMinutes) => updateFormField((prev) => ({ ...prev, minutesRead: nextMinutes }))}
      />
    </section>
  );
}
