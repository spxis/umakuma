"use client";

import { dispatchNewsKanjiClick } from "./newsKanjiEvents";
import { tokenizeJapanese } from "./newsTokenize";

type Props = {
  text: string;
  emphasizeKanji: boolean;
};

export default function NewsTokenizedText({ text, emphasizeKanji }: Props) {
  const segments = tokenizeJapanese(text);
  if (segments.length === 0) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind !== "kanji") {
          return <span key={index}>{segment.text}</span>;
        }
        const sizeClass = emphasizeKanji ? "text-[1.18em] leading-none" : "";
        return (
          <button
            key={index}
            type="button"
            onClick={() => dispatchNewsKanjiClick(segment.text)}
            className={`group relative inline align-baseline font-[var(--font-display-sans)] text-foreground transition hover:text-accent ${sizeClass}`.trim()}
            title={`Look up ${segment.text}`}
          >
            <span className="rounded-sm group-hover:bg-accent/10 group-focus-visible:bg-accent/10">
              {segment.text}
            </span>
          </button>
        );
      })}
    </>
  );
}
