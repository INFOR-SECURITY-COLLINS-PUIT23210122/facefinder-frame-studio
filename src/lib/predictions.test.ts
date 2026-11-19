import { describe, expect, it } from "vitest";
import { filterByConfidence, parsePredictions } from "./predictions";

describe("parsePredictions", () => {
  it("reads the Ultralytics Platform images[].results[] shape", () => {
    const raw = {
      images: [
        {
          shape: [480, 640],
          results: [
            { class: 0, name: "face", confidence: 0.91, box: { x1: 10, y1: 20, x2: 110, y2: 140 } },
          ],
        },
      ],
    };
    const p = parsePredictions(raw)[0]!;
    expect(p.name).toBe("face");
    expect(p.confidence).toBe(0.91);
    expect(p.box).toEqual({ x1: 10, y1: 20, x2: 110, y2: 140 });
  });

  it("returns no predictions for an empty response", () => {
    expect(parsePredictions({ images: [{ results: [] }] })).toEqual([]);
  });

  it("scales normalized boxes to the image size", () => {
    const raw = {
      images: [
        { results: [{ name: "face", confidence: 0.5, box: { x1: 0.1, y1: 0.2, x2: 0.5, y2: 1 } }] },
      ],
    };
    const p = parsePredictions(raw, { width: 1000, height: 500 })[0]!;
    expect(p.box).toEqual({ x1: 100, y1: 100, x2: 500, y2: 500 });
  });
});

describe("filterByConfidence", () => {
  it("hides predictions below the threshold", () => {
    const raw = {
      images: [
        {
          results: [
            { name: "a", confidence: 0.3, box: { x1: 1, y1: 1, x2: 2, y2: 2 } },
            { name: "b", confidence: 0.8, box: { x1: 1, y1: 1, x2: 2, y2: 2 } },
          ],
        },
      ],
    };
    const kept = filterByConfidence(parsePredictions(raw), 0.5);
    expect(kept.map((p) => p.name)).toEqual(["b"]);
  });
});
