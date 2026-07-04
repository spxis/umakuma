type ScrollLockState = {
  count: number;
  restore: () => void;
};

type ScrollLockWindow = Window & {
  __umakumaScrollLockState?: ScrollLockState;
};

export function lockBodyScroll(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const lockWindow = window as ScrollLockWindow;
  const existingState = lockWindow.__umakumaScrollLockState;
  if (existingState) {
    existingState.count += 1;
    let unlocked = false;
    return () => {
      if (unlocked) {
        return;
      }
      unlocked = true;
      existingState.count = Math.max(0, existingState.count - 1);
      if (existingState.count === 0) {
        existingState.restore();
        delete lockWindow.__umakumaScrollLockState;
      }
    };
  }

  const htmlElement = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY;
  const previousHtmlOverflow = htmlElement.style.overflow;
  const previousHtmlOverscroll = htmlElement.style.overscrollBehavior;
  const previousBodyOverflow = body.style.overflow;
  const previousBodyOverscroll = body.style.overscrollBehavior;
  const previousBodyPosition = body.style.position;
  const previousBodyTop = body.style.top;
  const previousBodyWidth = body.style.width;

  htmlElement.style.overflow = "hidden";
  htmlElement.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.width = "100%";

  const state: ScrollLockState = {
    count: 1,
    restore: () => {
      htmlElement.style.overflow = previousHtmlOverflow;
      htmlElement.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    },
  };

  lockWindow.__umakumaScrollLockState = state;

  let unlocked = false;
  return () => {
    if (unlocked) {
      return;
    }
    unlocked = true;
    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      state.restore();
      delete lockWindow.__umakumaScrollLockState;
    }
  };
}