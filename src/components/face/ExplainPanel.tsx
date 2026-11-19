import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Loader2, Lock, MessageSquareText, Sparkles } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renderForExplanation } from "@/lib/annotate";
import type { Explanation, Uncertainty } from "@/lib/explain";
import { explainDetections } from "@/lib/explain.functions";
import { formatPercent, type Prediction } from "@/lib/predictions";

type Props = {
  src: string;
  natural: { width: number; height: number };
  predictions: Prediction[]; // the visible ones, numbered in order
  threshold: number;
};

const uncertaintyVariant: Record<Uncertainty, "secondary" | "outline" | "destructive"> = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
};

function UncertaintyBadge({ level }: { level: Uncertainty }) {
  return <Badge variant={uncertaintyVariant[level]}>{level} uncertainty</Badge>;
}

export function ExplainPanel({ src, natural, predictions, threshold }: Props) {
  const explainFn = useServerFn(explainDetections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: Explanation; basis: string } | null>(null);

  const basis = `${predictions.length} detection${predictions.length === 1 ? "" : "s"} at ${formatPercent(threshold)} threshold`;
  const stale = result !== null && result.basis !== basis;

  const run = async () => {
    setLoading(true);
    setError(null);
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
      if (res.ok) setResult({ explanation: res.explanation, basis });
      else setError(res.error);
    } catch (e) {
      console.error("[Face Prediction] explain failed", e);
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
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Overall</span>
              <UncertaintyBadge level={ex.overall_uncertainty} />
            </div>
            <p className="text-muted-foreground">{ex.summary}</p>
          </div>

          {ex.detections.length > 0 && (
            <ul className="space-y-3">
              {ex.detections.map((d) => (
                <li key={d.number} className="rounded-md bg-sunken p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold">Face #{d.number}</span>
                    <UncertaintyBadge level={d.uncertainty} />
                  </div>
                  <p className="text-muted-foreground">{d.explanation}</p>
                  {d.factors.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {d.factors.map((f) => (
                        <li key={f}>
                          <Badge variant="outline" className="font-normal">
                            {f}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1">
            <p className="font-medium">Possible misses</p>
            <p className="text-muted-foreground">{ex.possible_misses}</p>
          </div>

          {ex.tips.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium">Tips for better results</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {ex.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        Explains the detections only — it never identifies anyone. The photo and results are sent to
        an AI model for this and are not stored by this app.
      </p>
    </div>
  );
}
