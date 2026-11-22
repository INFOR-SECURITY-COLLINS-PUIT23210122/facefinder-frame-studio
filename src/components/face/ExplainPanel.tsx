import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, Lock, MessageSquareText, Sparkles } from "lucide-react";
import { useState } from "react";

import { ExplanationView } from "@/components/face/ExplanationView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { renderForExplanation } from "@/lib/annotate";
import type { Explanation } from "@/lib/explain";
import { explainDetections } from "@/lib/explain.functions";
import { formatPercent, type Prediction } from "@/lib/predictions";

type Props = {
  src: string;
  natural: { width: number; height: number };
  predictions: Prediction[]; // the visible ones, numbered in order
  threshold: number;
  onExplained?: (explanation: Explanation, meta: { threshold: number; count: number }) => void;
};

export function ExplainPanel({ src, natural, predictions, threshold, onExplained }: Props) {
  const explainFn = useServerFn(explainDetections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: Explanation; basis: string } | null>(null);

  const basis = `${predictions.length} detection${predictions.length === 1 ? "" : "s"} at ${formatPercent(threshold)} threshold`;
  const stale = result !== null && result.basis !== basis;

  const run = async () => {
    setLoading(true);
    setError(null);
    const meta = { threshold, count: predictions.length };
    try {
      const imageDataUrl = await renderForExplanation(src, predictions);
      const res = await explainFn({
        data: {
          imageDataUrl,
          imageWidth: natural.width,
          imageHeight: natural.height,
          threshold,
          detections: predictions.map((p, i) => ({
            number: i + 1,
            label: p.name,
            confidence: p.confidence,
            box: p.box,
          })),
        },
      });
      if (res.ok) {
        setResult({ explanation: res.explanation, basis });
        onExplained?.(res.explanation, meta);
      } else setError(res.error);
    } catch (e) {
      console.error("[Face Insight Studio] explain failed", e);
      setError("The AI explanation couldn't be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ex = result?.explanation;

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">AI explanation</h3>
        </div>
        <Button
          size="sm"
          variant={ex && !stale ? "outline" : "default"}
          onClick={run}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {loading
            ? "Explaining…"
            : ex
              ? stale
                ? "Explain again"
                : "Regenerate"
              : "Explain these results"}
        </Button>
      </div>

      {!ex && !loading && !error && (
        <p className="text-sm text-muted-foreground">
          Get a plain-language explanation of each detection and how certain it is.
        </p>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !ex && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Looking at the photo and the
          detections…
        </div>
      )}

      {ex && (
        <div className={`space-y-4 text-sm ${loading ? "opacity-60" : ""}`}>
          {stale && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              The threshold changed since this explanation ({result.basis}). Press "Explain again"
              to update it.
            </p>
          )}
          <ExplanationView explanation={ex} />
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Explains the detections only — it never identifies anyone. The photo and results are sent to
        an AI model for this, which doesn't keep them.
      </p>
    </div>
  );
}
