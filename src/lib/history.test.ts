import { describe, expect, it } from "vitest";

import { createRunEntry, parseHistory, upsertRun, withExplanation, type HistoryEntry } from "./history";

const pred = { id: 0, name: "face", classId: 0, confidence: 0.9, box: { x1: 1, y1: 2, x2: 30, y2: 40 } };
const base = {
  fileName: "a.jpg",
  source: "upload" as const,
  width: 640,
  height: 480,
  thumbnail: "data:image/jpeg;base64,AAAA",
  threshold: 0.25,
  predictions: [pred],
};
const run = (id: string): HistoryEntry => createRunEntry({ ...base, id });

describe("history", () => {
  it("keeps only the small JPEG copy, never the full photo link", () => {
    const entry = createRunEntry({ ...base, preview: "blob:http://x/full" } as typeof base);
    expect(entry.thumbnail).toBe("data:image/jpeg;base64,AAAA");
    expect(JSON.stringify(entry)).not.toContain("blob:");
  });

  it("drops a photo copy that isn't a small JPEG", () => {
    expect(createRunEntry({ ...base, thumbnail: "data:image/png;base64,AAAA" }).thumbnail).toBeNull();
  });

  it("lists the newest run first", () => {
    const list = upsertRun(upsertRun([], run("old")), run("new"));
    expect(list.map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("saves the explanation on the matching run only", () => {
    const ex = { summary: "s", overall_uncertainty: "low" as const, detections: [], possible_misses: "", tips: [] };
    const list = withExplanation([run("a"), run("b")], "b", { explanation: ex, threshold: 0.3, count: 1, createdAt: "t" });
    expect(list[0]?.explanation).toBeNull();
    expect(list[1]?.explanation?.threshold).toBe(0.3);
  });

  it("ignores corrupt saved history", () => {
    expect(parseHistory("not json")).toEqual([]);
    expect(parseHistory(JSON.stringify([{ id: 1 }]))).toEqual([]);
  });
});
