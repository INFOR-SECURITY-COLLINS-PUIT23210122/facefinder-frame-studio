import { useSyncExternalStore } from "react";

import { getHistory, subscribeHistory, type HistoryEntry } from "@/lib/history";

const EMPTY: HistoryEntry[] = [];
const noopSubscribe = () => () => undefined;

/** Saved runs from this browser. `ready` is false during server render / hydration. */
export function useHistory() {
  const entries = useSyncExternalStore(subscribeHistory, getHistory, () => EMPTY);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { entries, ready };
}
