import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Images,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnnotatedImage } from "@/components/face/AnnotatedImage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { downloadAnnotated, makeThumbnail } from "@/lib/annotate";
import { createRunEntry, saveRun } from "@/lib/history";
import { batchSummary, runPool, type BatchStatus, type Rejected } from "@/lib/image-files";
import { predict } from "@/lib/predict.functions";
import { filterByConfidence, formatPercent, parsePredictions, type Prediction } from "@/lib/predictions";

type Item = {
  id: string;
  file: File;
  url: string;
  status: BatchStatus;
  natural: { width: number; height: number } | null;
  predictions: Prediction[];
  error: string | null;
  runId: string | null;
};

/** Photos sent at the same time; keeps the prediction service from being flooded. */
const PARALLEL = 2;

async function imageSize(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return { width: img.naturalWidth, height: img.naturalHeight };
}

type Props = { files: File[]; rejected: Rejected[]; onClose: () => void };

export function BatchView({ files, rejected, onClose }: Props) {
  const predictFn = useServerFn(predict);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [threshold, setThreshold] = useState(0.25);
  const [downloading, setDownloading] = useState<string | null>(null);
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  useEffect(() => {
    const next: Item[] = files.map((file, i) => ({
      id: `${i}-${file.name}-${file.size}`,
      file,
      url: URL.createObjectURL(file),
      status: "waiting",
      natural: null,
      predictions: [],
      error: null,
      runId: null,
    }));
    setItems(next);
    return () => next.forEach((it) => URL.revokeObjectURL(it.url));
  }, [files]);

  const update = (id: string, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const processItem = async (item: Item) => {
    update(item.id, { status: "loading", error: null });
    try {
      const natural = await imageSize(item.url);
      const fd = new FormData();
      fd.append("image", item.file, item.file.name);
      const res = await predictFn({ data: fd });
      if (!res.ok) {
        update(item.id, { status: "error", error: res.error, natural });
        return;
      }
      const parsed = parsePredictions(JSON.parse(res.rawText), natural);
      // Saved only in this browser: results plus a small photo copy.
      const thumbnail = await makeThumbnail(item.url).catch(() => null);
      const entry = createRunEntry({
        fileName: item.file.name,
        source: "upload",
        width: natural.width,
        height: natural.height,
        thumbnail,
        threshold: thresholdRef.current,
        predictions: parsed,
      });
      saveRun(entry);
      update(item.id, { status: "done", natural, predictions: parsed, runId: entry.id });
    } catch (e) {
      console.error("[Face Insight Studio] batch predict failed", e);
      update(item.id, {
        status: "error",
        error: "Something went wrong while contacting the prediction service.",
      });
    }
  };

  const pending = items.filter((it) => it.status === "waiting" || it.status === "error");

  const runAll = async () => {
    if (pending.length === 0) return;
    setRunning(true);
    await runPool(pending, PARALLEL, processItem);
    setRunning(false);
  };

  const summary = useMemo(() => batchSummary(items, threshold), [items, threshold]);
  const finished = summary.done + summary.failed;
  const anyDone = summary.done > 0;

  const handleDownload = async (it: Item) => {
    setDownloading(it.id);
    try {
      const base = it.file.name.replace(/\.[^.]+$/, "");
      await downloadAnnotated(it.url, filterByConfidence(it.predictions, threshold), `${base}-annotated.png`);
    } catch {
      update(it.id, { error: "The annotated image couldn't be created." });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="panel flex flex-col gap-5 p-5" aria-label="Several photos">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Images className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">
              {items.length} photo{items.length === 1 ? "" : "s"} selected
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              Each photo is analysed separately and saved to your history.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={running}>
            <X /> <span className="hidden sm:inline">Start over</span>
          </Button>
          <Button onClick={runAll} disabled={running || pending.length === 0}>
            {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {running
              ? "Predicting…"
              : summary.failed > 0 && pending.length === summary.failed
                ? "Retry failed"
                : `Predict all`}
          </Button>
        </div>
      </div>

      {rejected.length > 0 && (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>
            {rejected.length} photo{rejected.length === 1 ? " was" : "s were"} skipped
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-0.5">
              {rejected.slice(0, 5).map((r) => (
                <li key={r.name} className="truncate">
                  <span className="font-medium">{r.name}</span> — {r.reason}
                </li>
              ))}
              {rejected.length > 5 && <li>…and {rejected.length - 5} more</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 rounded-lg bg-sunken p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Analysed" value={`${summary.done}/${summary.total}`} />
          <Stat label="Faces found" value={String(summary.faces)} />
          <Stat label="No face" value={String(summary.withoutFaces)} />
          <div className="col-span-3">
            <Progress value={summary.total ? (finished / summary.total) * 100 : 0} aria-label="Progress" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="batch-threshold" className="font-medium">
              Confidence threshold
            </label>
            <span className="font-mono text-sm">{formatPercent(threshold)}</span>
          </div>
          <Slider
            id="batch-threshold"
            min={0}
            max={1}
            step={0.01}
            value={[threshold]}
            onValueChange={([v]) => setThreshold(v ?? 0)}
            aria-label="Confidence threshold"
          />
          <p className="text-xs text-muted-foreground">Applies to every photo below.</p>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, i) => {
          const visible = filterByConfidence(it.predictions, threshold);
          return (
            <li key={it.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
              <AnnotatedImage
                src={it.url}
                natural={it.natural}
                predictions={it.status === "done" ? visible : []}
                scanning={it.status === "loading"}
                heightClass="h-48 object-contain"
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <p className="truncate text-sm font-medium" title={it.file.name}>
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  {it.file.name}
                </p>
                <StatusBadge status={it.status} />
              </div>

              {it.status === "done" && (
                <p className="text-sm text-muted-foreground">
                  {visible.length === 0
                    ? it.predictions.length === 0
                      ? "No face detected"
                      : "No face above the threshold"
                    : `${visible.length} face${visible.length === 1 ? "" : "s"} · top ${formatPercent(
                        Math.max(...visible.map((p) => p.confidence)),
                      )}`}
                </p>
              )}
              {it.error && <p className="text-sm text-destructive">{it.error}</p>}

              <div className="mt-auto flex flex-wrap gap-2">
                {it.status === "done" && visible.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(it)}
                    disabled={downloading === it.id}
                  >
                    {downloading === it.id ? <Loader2 className="animate-spin" /> : <Download />}
                    Download
                  </Button>
                )}
                {it.runId && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/history/$runId" params={{ runId: it.runId }}>
                      <ExternalLink /> Details
                    </Link>
                  </Button>
                )}
                {!running && it.status !== "loading" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto text-muted-foreground"
                    aria-label={`Remove ${it.file.name}`}
                    onClick={() => {
                      URL.revokeObjectURL(it.url);
                      setItems((list) => list.filter((x) => x.id !== it.id));
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {anyDone && (
        <p className="text-xs text-muted-foreground">
          Results are saved to your history in this browser.{" "}
          <Link to="/history" className="font-medium text-primary hover:underline">
            View history
          </Link>{" "}
          to open a photo and ask the AI to explain its detections.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: BatchStatus }) {
  if (status === "loading")
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3 animate-spin" /> Analysing
      </Badge>
    );
  if (status === "done")
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="size-3 text-success" /> Done
      </Badge>
    );
  if (status === "error")
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="size-3" /> Failed
      </Badge>
    );
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Clock className="size-3" /> Waiting
    </Badge>
  );
}
