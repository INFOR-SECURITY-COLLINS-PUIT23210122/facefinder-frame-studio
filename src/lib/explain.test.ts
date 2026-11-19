import { describe, expect, it } from "vitest";
import { EXPLAIN_INSTRUCTIONS, explainInputSchema } from "./explain";

const base = {
  imageDataUrl: "data:image/jpeg;base64,AAAA",
  imageWidth: 100,
  imageHeight: 100,
  threshold: 0.25,
  detections: [{ number: 1, label: "face", confidence: 0.9, box: { x1: 1, y1: 1, x2: 50, y2: 50 } }],
};

describe("explain input", () => {
  it("accepts a JPEG photo with detections", () => {
    expect(explainInputSchema.safeParse(base).success).toBe(true);
  });
  it("rejects anything that isn't a JPEG data URL", () => {
    expect(explainInputSchema.safeParse({ ...base, imageDataUrl: "https://example.com/a.jpg" }).success).toBe(false);
  });
});

describe("explain instructions", () => {
  it("forbid identifying people", () => {
    expect(EXPLAIN_INSTRUCTIONS).toContain("Never identify, name, or guess who any person is");
  });
});
