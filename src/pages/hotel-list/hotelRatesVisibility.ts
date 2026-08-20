export type HotelRatesVisibilityStore = {
  getSnapshot: () => boolean;
  subscribe: (listener: () => void) => () => void;
  set: (visible: boolean) => void;
};

export function createHotelRatesVisibilityStore(initialValue: boolean): HotelRatesVisibilityStore {
  let visible = Boolean(initialValue);
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => visible,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (nextVisible) => {
      const next = Boolean(nextVisible);
      if (next === visible) return;
      visible = next;
      listeners.forEach((listener) => listener());
    },
  };
}
