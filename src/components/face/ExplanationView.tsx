import { Badge } from "@/components/ui/badge";
import type { Explanation, Uncertainty } from "@/lib/explain";

const uncertaintyVariant: Record<Uncertainty, "secondary" | "outline" | "destructive"> = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
};

export function UncertaintyBadge({ level }: { level: Uncertainty }) {
  return <Badge variant={uncertaintyVariant[level]}>{level} uncertainty</Badge>;
}

/** Read-only rendering of an AI explanation (used live and in history). */
export function ExplanationView({ explanation: ex }: { explanation: Explanation }) {
  return (
    <>
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
    </>
  );
}
