export type Box = { x1: number; y1: number; x2: number; y2: number };

export type Prediction = {
  id: number;
  name: string;
  classId: number | null;
  confidence: number; // 0..1
  box: Box;
};

type Size = { width: number; height: number };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

/** Find the list of detections in the known Ultralytics response shapes. */
function findDetections(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isObj(raw)) return [];
  // Ultralytics Platform: { images: [{ results: [...] }] }
  if (Array.isArray(raw.images)) {
    return raw.images.flatMap((img) => (isObj(img) && Array.isArray(img.results) ? img.results : []));
  }
  // Legacy HUB API: { data: [...] } or { data: { results: [...] } }
  if (Array.isArray(raw.data)) return raw.data;
  if (isObj(raw.data)) return findDetections(raw.data);
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.predictions)) return raw.predictions;
  return [];
}

function readBox(d: Record<string, unknown>): Box | null {
  const b = d.box ?? d.bbox ?? d.xyxy;
  if (Array.isArray(b) && b.length >= 4) {
    const [x1, y1, x2, y2] = b.map(num);
    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) return { x1, y1, x2, y2 };
    return null;
  }
  const src = isObj(b) ? b : d;
  const x1 = num(src.x1 ?? src.xmin ?? src.left);
  const y1 = num(src.y1 ?? src.ymin ?? src.top);
  const x2 = num(src.x2 ?? src.xmax ?? src.right);
  const y2 = num(src.y2 ?? src.ymax ?? src.bottom);
  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) return { x1, y1, x2, y2 };
  return null;
}

/**
 * Map a raw inference response into predictions in image pixel coordinates.
 * Normalized (0–1) boxes are scaled to `imageSize` when it is given.
 */
export function parsePredictions(raw: unknown, imageSize?: Size): Prediction[] {
  const out: Prediction[] = [];
  findDetections(raw).forEach((d) => {
    if (!isObj(d)) return;
    const box = readBox(d);
    if (!box) return;
    let confidence = num(d.confidence ?? d.conf ?? d.score) ?? 0;
    if (confidence > 1) confidence = confidence / 100;
    confidence = Math.min(1, Math.max(0, confidence));
    const classId = num(d.class ?? d.class_id ?? d.classId);
    const name =
      typeof d.name === "string" ? d.name : typeof d.label === "string" ? d.label : classId !== null ? `class ${classId}` : "object";
    out.push({ id: out.length, name, classId, confidence, box });
  });

  const normalized = out.length > 0 && out.every((p) => Math.max(p.box.x1, p.box.y1, p.box.x2, p.box.y2) <= 1);
  if (normalized && imageSize) {
    for (const p of out) {
      p.box = {
        x1: p.box.x1 * imageSize.width,
        y1: p.box.y1 * imageSize.height,
        x2: p.box.x2 * imageSize.width,
        y2: p.box.y2 * imageSize.height,
      };
    }
  }
  return out;
}

/** Keep predictions at or above the threshold (0..1). */
export function filterByConfidence(predictions: Prediction[], threshold: number): Prediction[] {
  return predictions.filter((p) => p.confidence >= threshold);
}

export const formatPercent = (v: number) => `${Math.round(v * 100)}%`;
