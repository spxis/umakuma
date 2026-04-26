// Tokenize Japanese text into runs of kanji vs other characters so the UI can
// style or interact with kanji compounds independently. Adjacent kanji form a
// single run (compound), letting the lookup target multi-char words like 勉強.

const KANJI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

export type NewsTextSegment = {
  kind: "kanji" | "other";
  text: string;
};

export function tokenizeJapanese(text: string): NewsTextSegment[] {
  if (!text) {
    return [];
  }

  const segments: NewsTextSegment[] = [];
  let buffer = "";
  let bufferKind: "kanji" | "other" | null = null;

  for (const char of text) {
    const isKanji = KANJI_REGEX.test(char);
    const kind: "kanji" | "other" = isKanji ? "kanji" : "other";
    if (bufferKind === null) {
      bufferKind = kind;
      buffer = char;
      continue;
    }
    if (kind === bufferKind) {
      buffer += char;
      continue;
    }
    segments.push({ kind: bufferKind, text: buffer });
    bufferKind = kind;
    buffer = char;
  }

  if (buffer && bufferKind) {
    segments.push({ kind: bufferKind, text: buffer });
  }

  return segments;
}
