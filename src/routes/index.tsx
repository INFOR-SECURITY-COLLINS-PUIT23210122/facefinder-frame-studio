import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Camera,
  Download,
  History,
  ImageUp,
  Loader2,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AnnotatedImage } from "@/components/face/AnnotatedImage";
import { CameraCapture } from "@/components/face/CameraCapture";
import { ExplainPanel } from "@/components/face/ExplainPanel";
import { BatchView } from "@/components/face/BatchView";
import { ImageDropzone } from "@/components/face/ImageDropzone";
import { AppHeader } from "@/components/face/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadAnnotated, makeThumbnail } from "@/lib/annotate";
import { attachExplanation, createRunEntry, saveRun } from "@/lib/history";
import { pickBatchFiles, validateImage, type Rejected } from "@/lib/image-files";
import { predict } from "@/lib/predict.functions";
import {
  filterByConfidence,
  formatPercent,
  parsePredictions,
  type Prediction,
} from "@/lib/predictions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Face Insight Studio — Detect faces in your photos" },
      {
        name: "description",
        content:
          "Upload one or many photos, or use your camera, and see face detections with boxes and confidence scores.",
      },
      { property: "og:title", content: "Face Insight Studio — Detect faces in your photos" },
      {
        property: "og:description",
        content:
          "Upload one or many photos, or use your camera, and see face detections with boxes and confidence scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PRIVACY_NOTICE =
  "Images are sent to a third-party API for analysis. A small copy of each photo is kept only in this browser for your history — this app never stores photos on a server.";

type Status = "idle" | "loading" | "done" | "error";

function Index() {
  const predictFn = useServerFn(predict);
  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"upload" | "camera">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.25);
  const [downloading, setDownloading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ accepted: File[]; rejected: Rejected[] } | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const visible = useMemo(
    () => filterByConfidence(predictions, threshold),
    [predictions, threshold],
  );

  const resetResults = () => {
    setStatus("idle");
    setError(null);
    setPredictions([]);
    setRawJson(null);
    setRunId(null);
  };

  const selectFile = (f: File, from: "upload" | "camera") => {
    resetResults();
    setNatural(null);
    setSource(from);
    setFile(f);
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 1 && files[0]) {
      const err = validateImage(files[0]);
      if (err) {
        setStatus("error");
        setError(err);
      } else selectFile(files[0], "upload");
      return;
    }
    const picked = pickBatchFiles(files);
    if (picked.accepted.length === 0) {
      setStatus("error");
      setError("None of those photos could be used. Please choose JPG or PNG images up to 10 MB.");
      return;
    }
    resetResults();
    setBatch(picked);
  };

  const clearImage = () => {
    resetResults();
    setNatural(null);
    setFile(null);
  };

  const runPredict = async () => {
    if (!file) return;
    setStatus("loading");
    setError(null);
    setPredictions([]);
    setRawJson(null);
    setRunId(null);
    try {
      const fd = new FormData();
      fd.append("image", file, file.name);
      const res = await predictFn({ data: fd });
      if (!res.ok) {
        setStatus("error");
        setError(res.error);
        return;
      }
      const raw: unknown = JSON.parse(res.rawText);
      console.log("[Face Insight Studio] raw API response:", raw);
      setRawJson(JSON.stringify(raw, null, 2));
      const parsed = parsePredictions(raw, natural ?? undefined);
      setPredictions(parsed);
      setStatus("done");
      if (natural && preview) {
        // Saved only in this browser: results plus a small photo copy.
        const thumbnail = await makeThumbnail(preview).catch(() => null);
        const entry = createRunEntry({
          fileName: file.name,
          source,
          width: natural.width,
          height: natural.height,
          thumbnail,
          threshold,
          predictions: parsed,
        });
        saveRun(entry);
        setRunId(entry.id);
      }
    } catch (e) {
      console.error("[Face Insight Studio] predict failed", e);
      setStatus("error");
      setError("Something went wrong while contacting the prediction service. Please try again.");
    }
  };

  const handleDownload = async () => {
    if (!preview) return;
    setDownloading(true);
    try {
      await downloadAnnotated(preview, visible, "face-prediction-annotated.png");
    } catch {
      setError("The annotated image couldn't be created.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <h1 className="sr-only">Face Insight Studio</h1>
        {batch ? (
          <BatchView
            files={batch.accepted}
            rejected={batch.rejected}
            onClose={() => setBatch(null)}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: image input */}
            <section className="panel flex flex-col gap-4 p-5" aria-label="Image">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">1. Choose a photo</h2>
                {!file && (
                  <Tabs value={mode} onValueChange={(v) => setMode(v as "upload" | "camera")}>
                    <TabsList>
                      <TabsTrigger value="upload">
                        <ImageUp className="mr-1.5 size-4" /> Upload
                      </TabsTrigger>
                      <TabsTrigger value="camera">
                        <Camera className="mr-1.5 size-4" /> Use Camera
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {!file && mode === "upload" && <ImageDropzone onFiles={handleFiles} />}
              {!file && mode === "camera" && (
                <CameraCapture onCapture={(f) => selectFile(f, "camera")} />
              )}

              {file && preview && (
                <>
                  <AnnotatedImage
                    src={preview}
                    natural={natural}
                    predictions={status === "done" ? visible : []}
                    scanning={status === "loading"}
                    onLoad={setNatural}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="lg"
                      onClick={runPredict}
                      disabled={status === "loading" || !natural}
                    >
                      {status === "loading" ? <Loader2 className="animate-spin" /> : <Sparkles />}
                      {status === "loading" ? "Predicting…" : "Predict"}
                    </Button>
                    {source === "camera" ? (
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={status === "loading"}
                        onClick={() => {
                          clearImage();
                          setMode("camera");
                        }}
                      >
                        <RotateCcw /> Retake
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={status === "loading"}
                        onClick={clearImage}
                      >
                        <X /> Change photo
                      </Button>
                    )}
                    <span className="ml-auto truncate font-mono text-xs text-muted-foreground">
                      {natural ? `${natural.width}×${natural.height}` : ""} ·{" "}
                      {file.size < 1024 * 1024
                        ? `${Math.round(file.size / 1024)} KB`
                        : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                  </div>
                </>
              )}

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                {PRIVACY_NOTICE}
              </p>
            </section>

            {/* Right: results */}
            <section className="panel flex flex-col gap-4 p-5" aria-label="Results">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">2. Results</h2>
                {status === "done" && predictions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? <Loader2 className="animate-spin" /> : <Download />} Download
                    annotated image
                  </Button>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>That didn't work</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {status === "idle" && !error && (
                <EmptyState
                  title={file ? "Ready when you are" : "No photo yet"}
                  text={
                    file
                      ? "Press Predict to find faces in this photo."
                      : "Upload a photo or take one with your camera to get started."
                  }
                />
              )}

              {status === "loading" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  Analysing your photo…
                </div>
              )}

              {status === "done" && (
                <>
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
                      Showing {visible.length} of {predictions.length} prediction
                      {predictions.length === 1 ? "" : "s"}.
                    </p>
                  </div>

                  {predictions.length === 0 ? (
                    <EmptyState
                      title="No face detected"
                      text="The model didn't find any face in this photo. Try a clearer, well-lit picture."
                    />
                  ) : visible.length === 0 ? (
                    <EmptyState
                      title="No face detected"
                      text="All predictions are below the confidence threshold. Lower the slider to see them."
                    />
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
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {i + 1}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{p.name}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatPercent(p.confidence)}
                              </TableCell>
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

                  {preview && natural && (
                    <ExplainPanel
                      key={rawJson ?? "none"}
                      src={preview}
                      natural={natural}
                      predictions={visible}
                      threshold={threshold}
                      onExplained={(explanation, meta) => {
                        if (runId)
                          attachExplanation(runId, {
                            explanation,
                            ...meta,
                            createdAt: new Date().toISOString(),
                          });
                      }}
                    />
                  )}

                  {runId && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <History className="size-3.5" /> Saved to your history in this browser.
                      <Link to="/history" className="font-medium text-primary hover:underline">
                        View history
                      </Link>
                    </p>
                  )}

                  {rawJson && (
                    <details className="rounded-lg border border-border text-sm">
                      <summary className="cursor-pointer px-4 py-2 font-medium text-muted-foreground">
                        Raw API response
                      </summary>
                      <pre className="max-h-64 overflow-auto border-t border-border bg-sunken p-4 font-mono text-xs">
                        {rawJson}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        <section className="panel grid gap-6 p-6 md:grid-cols-3" aria-labelledby="about">
          <div>
            <h2 id="about" className="text-xl font-semibold">
              About
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              How the model works and what to keep in mind.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">What it predicts</h3>
            <p className="text-muted-foreground">
              A custom YOLO detection model trained on Ultralytics finds faces in a photo. For each
              face it returns the class it was trained to recognise, a confidence score and a
              bounding box in pixel coordinates.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Limitations</h3>
            <p className="text-muted-foreground">
              It can only answer with the classes it was trained on, so an unknown face may still
              get one of those labels — it is not a reliable identity check. Accuracy drops with
              poor lighting, blur, unusual angles, small or covered faces, and people unlike those
              in its training photos. Treat results as estimates, not facts.
            </p>
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-muted-foreground">{PRIVACY_NOTICE}</footer>
      </main>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <ScanFace className="size-8 text-muted-foreground" />
      <p className="font-display text-base font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
