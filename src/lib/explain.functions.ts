import { createServerFn } from "@tanstack/react-start";
import {
  GatewayError,
  PaymentRequiredError,
  PermissionDeniedError,
  RateLimitError,
  generateResponse,
} from "@lovable.dev/ai-gateway";

import {
  EXPLAIN_INSTRUCTIONS,
  explainInputSchema,
  explanationJsonSchema,
  type ExplainResult,
  type Explanation,
} from "./explain";

/** Explains detections and their uncertainty with an AI model. Nothing is stored. */
export const explainDetections = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => explainInputSchema.parse(data))
  .handler(async ({ data }): Promise<ExplainResult> => {
    const facts = {
      image_size: { width: data.imageWidth, height: data.imageHeight },
      confidence_threshold: data.threshold,
      detections: data.detections.map((d) => ({
        face: `#${d.number}`,
        model_label: d.label,
        confidence: Number(d.confidence.toFixed(3)),
        box_pixels: {
          x1: Math.round(d.box.x1),
          y1: Math.round(d.box.y1),
          x2: Math.round(d.box.x2),
          y2: Math.round(d.box.y2),
        },
      })),
    };

    try {
      const response = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions: EXPLAIN_INSTRUCTIONS,
        reasoning: { effort: "low" },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  data.detections.length === 0
                    ? `The model found no faces above the threshold. Explain possible reasons. Detection data:\n${JSON.stringify(facts)}`
                    : `Explain these detections and their uncertainty. Detection data:\n${JSON.stringify(facts)}`,
              },
              { type: "input_image", image_url: data.imageDataUrl, detail: "auto" },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "detection_explanation",
            strict: true,
            schema: explanationJsonSchema as unknown as Record<string, unknown>,
          },
        },
      });

      const text = (response.output ?? [])
        .flatMap((item) => (item.type === "message" ? item.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("");

      if (!text)
        return { ok: false, error: "The AI didn't return an explanation. Please try again." };
      const explanation = JSON.parse(text) as Explanation;
      return { ok: true, explanation };
    } catch (err) {
      if (err instanceof GatewayError) {
        console.error("[explain] gateway error", err.code, err.httpStatus, err.ids);
        if (err instanceof RateLimitError)
          return {
            ok: false,
            error: "The AI is busy right now. Please wait a moment and try again.",
          };
        if (err instanceof PaymentRequiredError)
          return {
            ok: false,
            error: "AI credits have run out for this app. Please add credits and try again.",
          };
        if (err instanceof PermissionDeniedError)
          return { ok: false, error: "The AI model isn't available for this app right now." };
        return { ok: false, error: "The AI explanation failed. Please try again." };
      }
      console.error("[explain] failed", err);
      return { ok: false, error: "The AI explanation failed. Please try again." };
    }
  });
