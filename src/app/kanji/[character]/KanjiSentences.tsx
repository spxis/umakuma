import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { TATOEBA_ATTRIBUTION, type ExampleSentence } from "@/lib/tatoebaSentences";

import { KANJI_PAGE_COPY } from "./KanjiPage.constants";

/**
 * How the character is actually used, in sentences somebody wrote.
 *
 * Readings and meanings say what a kanji is; a sentence says what it does. The
 * site's own examples come from WaniKani and are shown to WaniKani members, so
 * this page - the one a shared link opens, for a reader who may have no account
 * at all - had none.
 *
 * Easiest first, and only a few: three short sentences get read, twenty get
 * skipped. A character with none renders nothing rather than an empty shelf,
 * which is most of the dictionary - Tatoeba reaches 2,916 of its 10,384
 * characters.
 */
export default function KanjiSentences({ sentences }: { sentences: ExampleSentence[] }) {
  if (sentences.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-5">
      <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {KANJI_PAGE_COPY.examples}
      </h2>

      <ul className="space-y-3">
        {sentences.map((sentence) => (
          <li key={sentence.id} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
            <a href={sentence.href} className="group block">
              <p
                lang="ja"
                translate="no"
                className={`text-base font-bold text-foreground group-hover:text-accent sm:text-lg ${JP_TEXT_CLASS}`}
              >
                {sentence.japanese}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground/60">{sentence.english}</p>
            </a>
          </li>
        ))}
      </ul>

      {/* Share-alike's cousin: CC BY asks for the credit, so it is not optional. */}
      <p className="text-[11px] font-semibold text-foreground/60">
        {KANJI_PAGE_COPY.sentenceCredit}{" "}
        <a
          href={TATOEBA_ATTRIBUTION.url}
          className="underline decoration-dotted underline-offset-2 hover:text-foreground/70"
        >
          {TATOEBA_ATTRIBUTION.source}
        </a>{" "}
        <a
          href={TATOEBA_ATTRIBUTION.licenceUrl}
          className="underline decoration-dotted underline-offset-2 hover:text-foreground/70"
        >
          ({TATOEBA_ATTRIBUTION.licence})
        </a>
      </p>
    </section>
  );
}
