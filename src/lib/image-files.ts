import type { Prediction } from "./predictions";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Most photos accepted in one batch. */
export const MAX_BATCH = 20;
const ACCEPTED = ["image/jpeg", "image/png"];

type FileLike = { name: string; type: string; size: number };

export function validateImage(file: FileLike): string | null {
  if (!ACCEPTED.includes(file.type)) return "Please choose a JPG or PNG image.";
  if (file.size > MAX_IMAGE_BYTES)
    return "That image is larger than 10 MB. Please choose a smaller one.";
  return null;
}

export type Rejected = { name: string; reason: string };

/** Split a multi-photo selection into photos we can send and ones we skip (with the reason). */
export function pickBatchFiles<F extends FileLike>(files: F[], max = MAX_BATCH) {
  const accepted: F[] = [];
  const rejected: Rejected[] = [];
  for (const f of files) {
    const err = validateImage(f);
    if (err) rejected.push({ name: f.name, reason: err.includes("10 MB") ? "Larger than 10 MB" : "Not a JPG or PNG" });
    else if (accepted.length >= max) rejected.push({ name: f.name, reason: `Over the ${max}-photo limit` });
    else accepted.push(f);
  }
  return { accepted, rejected };
}

export type BatchStatus = "waiting" | "loading" | "done" | "error";

/** Totals for the batch summary, counting only faces at or above the threshold. */
export function batchSummary(
  items: { status: BatchStatus; predictions: Prediction[] }[],
  threshold: number,
) {
  const done = items.filter((i) => i.status === "done");
  const counts = done.map((i) => i.predictions.filter((p) => p.confidence >= threshold).length);
  return {
    total: items.length,
    done: done.length,
    failed: items.filter((i) => i.status === "error").length,
    faces: counts.reduce((a, b) => a + b, 0),
    withoutFaces: counts.filter((c) => c === 0).length,
  };
}

/** Run `worker` over `items`, at most `limit` at a time. */
export async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
}
