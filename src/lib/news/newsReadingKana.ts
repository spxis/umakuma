import path from "node:path";

import kuromoji from "kuromoji";
import { toHiragana } from "wanakana";

type KuromojiTokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

const KANJI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

export async function readingKanaForRun(run: string): Promise<string | null> {
  const value = run.trim();
  if (!value) {
    return null;
  }

  const tokenizer = await getKuromojiTokenizer();
  const tokens = tokenizer.tokenize(value);
  if (tokens.length === 0) {
    return null;
  }

  const kanaParts: string[] = [];
  for (const token of tokens) {
    const surface = token.surface_form ?? "";
    const reading = token.reading ?? "";

    if (KANJI_REGEX.test(surface) && (!reading || reading === "*")) {
      return null;
    }

    const source = reading && reading !== "*" ? reading : surface;
    const kana = toHiragana(source);
    kanaParts.push(kana);
  }

  const result = kanaParts.join("").trim();
  return result.length > 0 ? result : null;
}

async function getKuromojiTokenizer(): Promise<KuromojiTokenizer> {
  if (tokenizerPromise) {
    return tokenizerPromise;
  }

  tokenizerPromise = new Promise<KuromojiTokenizer>((resolve, reject) => {
    kuromoji
      .builder({
        dicPath: path.join(process.cwd(), "node_modules/kuromoji/dict"),
      })
      .build((error, tokenizer) => {
        if (error || !tokenizer) {
          reject(error ?? new Error("Failed to initialize kuromoji tokenizer."));
          return;
        }
        resolve(tokenizer);
      });
  });

  return tokenizerPromise;
}
