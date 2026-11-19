import { formatPercent, type Prediction } from "./predictions";

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

type RenderOptions = {
  /** Longest side in pixels; the image is downscaled if larger. */
  maxSize?: number;
  label?: (p: Prediction, index: number) => string;
};

/** Draw the image with its boxes onto a canvas (optionally downscaled). */
export async function renderAnnotated(
  src: string,
  predictions: Prediction[],
  opts: RenderOptions = {},
) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const scale = opts.maxSize
    ? Math.min(1, opts.maxSize / Math.max(img.naturalWidth, img.naturalHeight))
    : 1;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);

  const stroke = cssColor("--detect", "#a3e635");
  const ink = cssColor("--detect-foreground", "#1a2e05");
  const line = Math.max(2, Math.round(Math.min(w, h) / 220));
  const fontSize = Math.max(12, Math.round(Math.min(w, h) / 38));
  ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";
  const label = opts.label ?? ((p: Prediction) => `${p.name} ${formatPercent(p.confidence)}`);

  predictions.forEach((p, i) => {
    const x1 = p.box.x1 * scale;
    const y1 = p.box.y1 * scale;
    const x2 = p.box.x2 * scale;
    const y2 = p.box.y2 * scale;
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    const text = label(p, i);
    const pad = Math.round(fontSize * 0.35);
    const tw = ctx.measureText(text).width + pad * 2;
    const th = fontSize + pad * 2;
    const ty = y1 - th >= 0 ? y1 - th : y1;
    ctx.fillStyle = stroke;
    ctx.fillRect(x1 - line / 2, ty, tw, th);
    ctx.fillStyle = ink;
    ctx.fillText(text, x1 - line / 2 + pad, ty + pad);
  });
  return canvas;
}

/** Download the full-resolution annotated image as PNG. */
export async function downloadAnnotated(
  src: string,
  predictions: Prediction[],
  filename = "face-prediction.png",
) {
  const canvas = await renderAnnotated(src, predictions);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not create image");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Small JPEG with numbered boxes (#1, #2 …) for the AI explanation — no class names drawn. */
export async function renderForExplanation(src: string, predictions: Prediction[]) {
  const canvas = await renderAnnotated(src, predictions, {
    maxSize: 1024,
    label: (_p, i) => `#${i + 1}`,
  });
  return canvas.toDataURL("image/jpeg", 0.85);
}
