import type { Explanation } from "./explain";
import type { Prediction } from "./predictions";

/** History lives only in this browser's localStorage — never on a server. */
export const HISTORY_KEY = "face-prediction:history:v1";
export const MAX_RUNS = 30;

export type SavedExplanation = {
  explanation: Explanation;
  /** Threshold and number of visible detections the explanation was made for. */
  threshold: number;
  count: number;
  createdAt: string;
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  fileName: string;
  source: "upload" | "camera";
  /** Original photo size; boxes are in these pixel coordinates. */
  width: number;
  height: number;
  /** Small JPEG data URL of the photo (downscaled), or null if it couldn't be made. */
  thumbnail: string | null;
  threshold: number;
  predictions: Prediction[];
  explanation: SavedExplanation | null;
};

type NewRun = Omit<HistoryEntry, "id" | "createdAt" | "explanation"> & {
  id?: string;
  now?: Date;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Build a history entry from exactly the fields we keep — the full-size photo is never kept. */
export function createRunEntry(input: NewRun): HistoryEntry {
  const thumb =
    typeof input.thumbnail === "string" && input.thumbnail.startsWith("data:image/jpeg;base64,")
      ? input.thumbnail
      : null;
  return {
    id: input.id ?? newId(),
    createdAt: (input.now ?? new Date()).toISOString(),
    fileName: input.fileName,
    source: input.source,
    width: input.width,
    height: input.height,
    thumbnail: thumb,
    threshold: input.threshold,
    predictions: input.predictions.map((p) => ({
      id: p.id,
      name: p.name,
      classId: p.classId,
      confidence: p.confidence,
      box: { ...p.box },
    })),
    explanation: null,
  };
}

/** Newest first; replaces a run with the same id; keeps at most `max` runs. */
export function upsertRun(list: HistoryEntry[], entry: HistoryEntry, max = MAX_RUNS) {
  if (list.some((e) => e.id === entry.id)) return list.map((e) => (e.id === entry.id ? entry : e));
  return [entry, ...list].slice(0, max);
}

export function withExplanation(list: HistoryEntry[], id: string, saved: SavedExplanation) {
  return list.map((e) => (e.id === id ? { ...e, explanation: saved } : e));
}

export function removeRun(list: HistoryEntry[], id: string) {
  return list.filter((e) => e.id !== id);
}

const isEntry = (v: unknown): v is HistoryEntry => {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e["id"] === "string" &&
    typeof e["createdAt"] === "string" &&
    typeof e["width"] === "number" &&
    typeof e["height"] === "number" &&
    Array.isArray(e["predictions"])
  );
};

/** Read stored history safely; anything corrupt is ignored. */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isEntry) : [];
  } catch {
    return [];
  }
}

// ---- Browser store (localStorage + subscribers) ----

const listeners = new Set<() => void>();
let cache: HistoryEntry[] | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getHistory(): HistoryEntry[] {
  if (cache === null) cache = parseHistory(storage()?.getItem(HISTORY_KEY) ?? null);
  return cache;
}

function setHistory(next: HistoryEntry[]) {
  const store = storage();
  let list = next;
  // If the browser runs out of space, drop the oldest runs until it fits.
  for (;;) {
    try {
      store?.setItem(HISTORY_KEY, JSON.stringify(list));
      break;
    } catch {
      if (list.length <= 1) break;
      list = list.slice(0, -1);
    }
  }
  cache = list;
  listeners.forEach((l) => l());
}

export const saveRun = (entry: HistoryEntry) => setHistory(upsertRun(getHistory(), entry));
export const attachExplanation = (id: string, saved: SavedExplanation) =>
  setHistory(withExplanation(getHistory(), id, saved));
export const deleteRun = (id: string) => setHistory(removeRun(getHistory(), id));
export const clearHistory = () => setHistory([]);

export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== HISTORY_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
