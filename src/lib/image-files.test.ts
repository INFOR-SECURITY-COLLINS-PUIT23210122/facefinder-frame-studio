import { describe, expect, it } from "vitest";

import { batchSummary, pickBatchFiles, runPool } from "./image-files";

const jpg = (name: string, size = 1000) => ({ name, type: "image/jpeg", size });
const face = (confidence: number) => ({
  id: 0,
  name: "face",
  classId: 0,
  confidence,
  box: { x1: 0, y1: 0, x2: 1, y2: 1 },
});

describe("batch photo selection", () => {
  it("accepts at most 20 photos and skips the rest", () => {
    const files = Array.from({ length: 23 }, (_, i) => jpg(`p${i}.jpg`));
    const { accepted, rejected } = pickBatchFiles(files);
    expect(accepted).toHaveLength(20);
    expect(rejected).toHaveLength(3);
    expect(rejected[0]?.reason).toBe("Over the 20-photo limit");
  });

  it("skips photos that aren't JPG or PNG", () => {
    const { accepted, rejected } = pickBatchFiles([jpg("a.jpg"), { name: "b.gif", type: "image/gif", size: 10 }]);
    expect(accepted.map((f) => f.name)).toEqual(["a.jpg"]);
    expect(rejected).toEqual([{ name: "b.gif", reason: "Not a JPG or PNG" }]);
  });

  it("skips photos larger than 10 MB", () => {
    const { rejected } = pickBatchFiles([jpg("big.jpg", 10 * 1024 * 1024 + 1)]);
    expect(rejected).toEqual([{ name: "big.jpg", reason: "Larger than 10 MB" }]);
  });
});

describe("batch summary", () => {
  it("counts only faces at or above the threshold", () => {
    const s = batchSummary(
      [
        { status: "done", predictions: [face(0.9), face(0.3)] },
        { status: "done", predictions: [face(0.2)] },
        { status: "error", predictions: [] },
        { status: "waiting", predictions: [] },
      ],
      0.5,
    );
    expect(s).toEqual({ total: 4, done: 2, failed: 1, faces: 1, withoutFaces: 1 });
  });
});

describe("runPool", () => {
  it("never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    const seen: number[] = [];
    await runPool([1, 2, 3, 4, 5], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      seen.push(n);
      active--;
    });
    expect(peak).toBe(2);
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
