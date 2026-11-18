import { formatPercent, type Prediction } from "./predictions";

function cssColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Render the image with its boxes at full resolution and download it as PNG. */
export async function downloadAnnotated(src: string, predictions: Prediction[], filename = "face-prediction.png") {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = img.naturalWidth;
  const h = img.naturalHeight;
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

  for (const p of predictions) {
    const { x1, y1, x2, y2 } = p.box;
    ctx.lineWidth = line;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    const text = `${p.name} ${formatPercent(p.confidence)}`;
    const pad = Math.round(fontSize * 0.35);
    const tw = ctx.measureText(text).width + pad * 2;
    const th = fontSize + pad * 2;
    const ty = y1 - th >= 0 ? y1 - th : y1;
    ctx.fillStyle = stroke;
    ctx.fillRect(x1 - line / 2, ty, tw, th);
    ctx.fillStyle = ink;
    ctx.fillText(text, x1 - line / 2 + pad, ty + pad);
  }

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not create image");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
