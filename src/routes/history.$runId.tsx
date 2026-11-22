import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, ImageUp, Loader2, MessageSquareText, ScanFace, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AnnotatedImage } from "@/components/face/AnnotatedImage";
import { AppHeader } from "@/components/face/AppHeader";
import { ExplanationView } from "@/components/face/ExplanationView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHistory } from "@/hooks/use-history";
import { deleteRun, type HistoryEntry } from "@/lib/history";
import { filterByConfidence, formatPercent } from "@/lib/predictions";

export const Route = createFileRoute("/history/$runId")({
  head: () => ({
    meta: [
      { title: "Past run — Face Insight Studio" },
      {
        name: "description",
        content: "A saved face detection run with its boxes, scores and AI explanation.",
      },
      { property: "og:title", content: "Past run — Face Insight Studio" },
      {
        property: "og:description",
        content: "A saved face detection run with its boxes, scores and AI explanation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunPage,
});

function RunPage() {
  const { runId } = Route.useParams();
  const { entries, ready } = useHistory();
  const entry = entries.find((e) => e.id === runId);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All runs
        </Link>
        {!ready ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading this run…
          </div>
        ) : entry ? (
          <RunDetail entry={entry} />
        ) : (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ScanFace className="size-8 text-muted-foreground" />
            <h1 className="font-display text-base font-semibold">Run not found</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              It may have been deleted, or it was saved in a different browser.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function RunDetail({ entry: e }: { entry: HistoryEntry }) {
  const navigate = useNavigate();
  const savedThreshold = e.explanation?.threshold ?? e.threshold;
  const [threshold, setThreshold] = useState(savedThreshold);
  const visible = useMemo(() => filterByConfidence(e.predictions, threshold), [e, threshold]);
  const natural = { width: e.width, height: e.height };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Run from{" "}
            {new Date(e.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {e.source === "camera" ? <Camera className="size-4" /> : <ImageUp className="size-4" />}
            {e.fileName} · <span className="font-mono text-xs">{e.width}×{e.height}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            deleteRun(e.id);
            void navigate({ to: "/history" });
          }}
        >
          <Trash2 /> Delete run
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel flex flex-col gap-3 p-5" aria-label="Photo">
          {e.thumbnail ? (
            <AnnotatedImage src={e.thumbnail} natural={natural} predictions={visible} numbered />
          ) : (
            <div className="dot-grid flex aspect-[4/3] items-center justify-center rounded-lg border border-border text-sm text-muted-foreground">
              No photo copy was saved for this run.
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A small copy kept in this browser. Face numbers match the AI explanation at{" "}
            {formatPercent(savedThreshold)}.
          </p>
        </section>

        <section className="panel flex flex-col gap-4 p-5" aria-label="Results">
          <div className="space-y-3 rounded-lg bg-sunken p-4">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="threshold" className="font-medium">
                Confidence threshold
              </label>
              <span className="font-mono text-sm">{formatPercent(threshold)}</span>
            </div>
            <Slider
              id="threshold"
              min={0}
              max={1}
              step={0.01}
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v ?? 0)}
              aria-label="Confidence threshold"
            />
            <p className="text-xs text-muted-foreground">
              Showing {visible.length} of {e.predictions.length} prediction
              {e.predictions.length === 1 ? "" : "s"}.
            </p>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
              No face detected at this threshold.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">x1, y1</TableHead>
                    <TableHead className="text-right">x2, y2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.name}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatPercent(p.confidence)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Math.round(p.box.x1)}, {Math.round(p.box.y1)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {Math.round(p.box.x2)}, {Math.round(p.box.y2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">AI explanation</h2>
            </div>
            {e.explanation ? (
              <div className="space-y-4 text-sm">
                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Made for {e.explanation.count} detection{e.explanation.count === 1 ? "" : "s"} at{" "}
                  {formatPercent(e.explanation.threshold)} threshold.
                </p>
                <ExplanationView explanation={e.explanation.explanation} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AI explanation was made for this run.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
