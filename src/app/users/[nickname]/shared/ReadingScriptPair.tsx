import {
  pronunciationForReading,
  ReadingListWithPronunciation,
} from "../level-explorer/lib/levelExplorerDisplay";

type Props = {
  hiragana: string;
  katakana: string;
  showPronunciation: boolean;
};

export default function ReadingScriptPair({ hiragana, katakana, showPronunciation }: Props) {
  const scripts = [hiragana, katakana].filter(
    (reading, index, values) => reading && reading !== "-" && values.indexOf(reading) === index,
  );
  const pronunciation = showPronunciation
    ? scripts.map((reading) => pronunciationForReading(reading)).find(Boolean) ?? null
    : null;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <ReadingListWithPronunciation readings={scripts} mode="plain" />
      {pronunciation ? (
        <span className="text-base font-semibold text-foreground/70">/ {pronunciation}</span>
      ) : null}
    </span>
  );
}
