import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  ChevronRight,
  History as HistoryIcon,
  ImageUp,
  Loader2,
  MessageSquareText,
  ScanFace,
  Trash2,
} from "lucide-react";

import { AppHeader } from "@/components/face/AppHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHistory } from "@/hooks/use-history";
import { clearHistory, deleteRun, type HistoryEntry } from "@/lib/history";
import { filterByConfidence, formatPercent } from "@/lib/predictions";

export const Route = createFileRoute("/history/")({
  head: () => ({
    meta: [
      { title: "History — Face Prediction" },
      {
        name: "description",
        content: "Review your past face detection runs and AI explanations, saved in your browser.",
      },
      { property: "og:title", content: "History — Face Prediction" },
      {
        property: "og:description",
        content: "Review your past face detection runs and AI explanations, saved in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

export const HISTORY_NOTE =
  "History is saved only in this browser: a small copy of each photo, its detections and any AI explanation. Nothing is stored on a server, and clearing your browser data removes it.";

function HistoryPage() {
  const { entries, ready } = useHistory();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">History</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{HISTORY_NOTE}</p>
          </div>
          {ready && entries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 /> Clear history
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all {entries.length} saved run{entries.length === 1 ? "" : "s"}{" "}
                    and their photo copies from this browser. It can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearHistory}>Clear history</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {!ready ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your history…
          </div>
        ) : entries.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <HistoryIcon className="size-8 text-muted-foreground" />
            <p className="font-display text-base font-semibold">No past runs yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Every time you press Predict, the result is saved here so you can come back to it.
            </p>
            <Button asChild>
              <Link to="/">
                <ScanFace /> Analyse a photo
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <RunCard key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function RunCard({ entry: e }: { entry: HistoryEntry }) {
  const threshold = e.explanation?.threshold ?? e.threshold;
  const faces = filterByConfidence(e.predictions, threshold);
  const top = faces.reduce((m, p) => Math.max(m, p.confidence), 0);

  return (
    <li className="panel group relative flex flex-col overflow-hidden">
      <Link
        to="/history/$runId"
        params={{ runId: e.id }}
        className="flex flex-1 flex-col"
        aria-label={`Open run from ${new Date(e.createdAt).toLocaleString()}`}
      >
        <div className="dot-grid flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-border">
          {e.thumbnail ? (
            <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <ScanFace className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {new Date(e.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {e.source === "camera" ? <Camera className="size-3.5" /> : <ImageUp className="size-3.5" />}
            <span className="truncate">{e.fileName}</span>
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <Badge variant="secondary">
              {faces.length} face{faces.length === 1 ? "" : "s"}
            </Badge>
            {faces.length > 0 && <Badge variant="outline">top {formatPercent(top)}</Badge>}
            {e.explanation && (
              <Badge variant="outline">
                <MessageSquareText className="mr-1 size-3" /> Explained
              </Badge>
            )}
          </div>
        </div>
      </Link>
      <Button
        variant="secondary"
        size="icon"
        className="absolute right-2 top-2 size-8 opacity-90"
        aria-label="Delete this run"
        onClick={() => deleteRun(e.id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
