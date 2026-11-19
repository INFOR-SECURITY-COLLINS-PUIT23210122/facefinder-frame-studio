import { createServerFn } from "@tanstack/react-start";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export type PredictResult = { ok: true; rawText: string } | { ok: false; error: string };

function friendlyStatusError(status: number): string {
  if (status === 401 || status === 403)
    return "The prediction service rejected the API key. Please check the saved key.";
  if (status === 404)
    return "The prediction endpoint was not found. Please check the saved endpoint URL.";
  if (status === 413) return "The image is too large for the prediction service.";
  if (status === 422 || status === 400)
    return "The prediction service could not read this image. Try another JPG or PNG.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status >= 500)
    return "The prediction service is having trouble. Please try again in a minute.";
  return `The prediction service returned an unexpected error (${status}).`;
}

/**
 * "predict" — forwards one image to the Ultralytics inference endpoint.
 * The image is streamed straight through and never stored.
 */
export const predict = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected multipart form data.");
    return data;
  })
  .handler(async ({ data }): Promise<PredictResult> => {
    const apiKey = process.env["ULTRALYTICS_API_KEY"];
    const endpoint = process.env["ULTRALYTICS_ENDPOINT"];
    if (!apiKey || !endpoint) {
      return { ok: false, error: "The prediction service is not configured yet." };
    }

    const image = data.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return { ok: false, error: "No image was received. Please choose a photo first." };
    }
    if (!ALLOWED_TYPES.includes(image.type)) {
      return { ok: false, error: "Only JPG and PNG images are supported." };
    }
    if (image.size > MAX_BYTES) {
      return { ok: false, error: "The image is larger than 10 MB." };
    }

    const base = endpoint.replace(/\/+$/, "");
    const url = base.endsWith("/predict") ? base : `${base}/predict`;

    const form = new FormData();
    form.append("image", image, image.name || "image.jpg");
    form.append("imgsz", "640");
    form.append("conf", "0.25");
    form.append("iou", "0.45");

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "x-api-key": apiKey, Authorization: `Bearer ${apiKey}` },
        body: form,
        redirect: "manual",
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      console.error("[predict] request failed", err);
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        error: timedOut
          ? "The prediction service took too long to answer. Please try again."
          : "Could not reach the prediction service. Please try again.",
      };
    }

    const rawText = await res.text();
    // Raw response logged so the structure can be checked in server logs.
    console.log(`[predict] status=${res.status} raw=${rawText.slice(0, 4000)}`);

    if (!res.ok) return { ok: false, error: friendlyStatusError(res.status) };

    try {
      JSON.parse(rawText);
    } catch {
      return { ok: false, error: "The prediction service sent back an invalid response." };
    }
    return { ok: true, rawText };
  });
