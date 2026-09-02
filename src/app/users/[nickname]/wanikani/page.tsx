import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { formatDateTimeShort } from "@/lib/timeFormat";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { loadUserPageShell } from "../lib/userPageShell";
import ConnectWanikaniForm from "./ConnectWanikaniForm";
import { CONNECT_COPY, WANIKANI_TOKENS_URL } from "./connectCopy";

const CARD_CLASS = "rounded-2xl border border-line bg-surface p-5";
const SECTION_HEADING = "text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60";

/**
 * Where a member connects WaniKani, or comes back to replace the token.
 *
 * The welcome wizard offers the same field once and tells anyone who skips it
 * that they can connect later from their profile. Until now that sentence was
 * a promise with nowhere to land: the profile said "Not connected" and stopped
 * there. This is the page it meant.
 *
 * It leads with what connecting adds rather than with the field, because the
 * question a member without WaniKani actually has is whether it is worth
 * getting one - and with what they keep either way, because the honest answer
 * is that most of UmaKuma never asks.
 */
export default async function UserWanikaniPage({
  params,
}: {
  params: Promise<{ nickname: string }>;
}) {
  const { nickname } = await params;
  const shell = await loadUserPageShell(nickname);
  const { account } = shell;

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={shell.viewerMenuInfo}
        primaryWkUsername={shell.userKey}
        accountId={account.id}
        showAdminActions={shell.viewerIsAdmin}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />

      {/* A page of prose and one field reads in a column; the nav spans the page. */}
      <div className={PAGE_WIDTH.reading}>
        {/*
          * Titled with the one word the nav uses, not with the page's own
          * sentence. Every member page header truncates its title, and at
          * 393px "Connect your WaniKani account" became "Connect your WaniK".
          * The sentence is a section heading below, where it has the width.
          */}
        <MemberPageHeader
          icon={MEMBER_PAGE_HEADERS.wanikani.icon}
          title={CONNECT_COPY.title}
          subtitle={account.hasWanikani ? CONNECT_COPY.connectedLead : CONNECT_COPY.lead}
          className="mb-4"
        />

        {account.hasWanikani ? (
          <section className={`mb-4 ${CARD_CLASS}`}>
            <h2 className={`mb-3 ${SECTION_HEADING}`}>{CONNECT_COPY.connectedHeading}</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <Fact label={CONNECT_COPY.connectedAs} value={account.wkUsername ?? CONNECT_COPY.notConnected} />
              <Fact label={CONNECT_COPY.connectedLevel} value={String(account.wkLevel)} />
              <Fact
                label={CONNECT_COPY.connectedSynced}
                value={formatDateTimeShort(account.lastSyncedAt.toISOString(), CONNECT_COPY.connectedNever)}
              />
            </div>
            <p className="mt-3 text-sm text-foreground/70">{CONNECT_COPY.connectedBody}</p>
            <div className="mt-4">
              <ConnectWanikaniForm accountId={account.id} connected />
            </div>
          </section>
        ) : (
          <>
            <section className={`mb-4 ${CARD_CLASS}`}>
              <h2 className={SECTION_HEADING}>{CONNECT_COPY.unlockHeading}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {CONNECT_COPY.unlocked.map((item) => (
                  <li key={item.title} className="rounded-xl border border-line bg-surface-muted p-3">
                    <p className="text-sm font-black text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-sm text-foreground/70">{item.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`mb-4 ${CARD_CLASS}`}>
              <h2 className={SECTION_HEADING}>{CONNECT_COPY.stepsHeading}</h2>
              <ol className="mt-3 space-y-3">
                {CONNECT_COPY.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-black text-accent">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-black text-foreground">{step.title}</p>
                      <p className="mt-0.5 text-sm text-foreground/70">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <a
                href={WANIKANI_TOKENS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-4 inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 text-sm font-bold text-foreground transition hover:bg-surface-muted"
              >
                {CONNECT_COPY.stepsAction}
              </a>
            </section>

            <section className={`mb-4 ${CARD_CLASS}`}>
              <h2 className={`mb-3 ${SECTION_HEADING}`}>{CONNECT_COPY.heading}</h2>
              <ConnectWanikaniForm accountId={account.id} connected={false} />
            </section>
          </>
        )}

        <section className={CARD_CLASS}>
          <h2 className={SECTION_HEADING}>{CONNECT_COPY.keepsHeading}</h2>
          <p className="mt-2 text-sm text-foreground/70">{CONNECT_COPY.keeps}</p>
        </section>
      </div>
    </div>
  );
}

/** One labelled value, the same shape the profile page states its facts in. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
