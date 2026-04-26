// Event dispatched when a user clicks a kanji run in a news article. A future
// listener will look the compound up via WaniKani and open the ViewGlyph modal.

export const NEWS_KANJI_CLICK_EVENT = "uk:news-kanji-click";

export type NewsKanjiClickPayload = {
  chars: string;
};

export function dispatchNewsKanjiClick(chars: string): void {
  if (typeof window === "undefined" || !chars) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<NewsKanjiClickPayload>(NEWS_KANJI_CLICK_EVENT, {
      detail: { chars },
    }),
  );
}
