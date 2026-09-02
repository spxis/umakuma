import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import SubjectBlock from "@/app/shared/subject-page/SubjectBlock";
import { SOURCE_KEYS } from "@/lib/sourceCredits";
import type { ExampleSentence } from "@/lib/tatoebaSentences";

/**
 * How something is actually used, in sentences somebody wrote.
 *
 * Readings and meanings say what a subject is; a sentence says what it does.
 * The site's own examples come from WaniKani and are shown to WaniKani members,
 * so the public pages - the ones a shared link opens, for a reader who may have
 * no account at all - had none.
 *
 * Easiest first, and only a few: three short sentences get read, twenty get
 * skipped. A subject with none renders nothing rather than an empty shelf.
 *
 * Shared by every public subject page. The credit is a licence condition of
 * CC BY, so having one copy of it is not only tidiness - it is the thing that
 * stops a new page shipping without it.
 */
export default function ExampleSentences({
  sentences,
  heading,
  credit,
}: {
  sentences: ExampleSentence[];
  heading: string;
  credit: string;
}) {
  if (sentences.length === 0) return null;

  return (
    <SubjectBlock heading={heading} credit={{ source: SOURCE_KEYS.tatoeba, label: credit }}>
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
    </SubjectBlock>
  );
}
