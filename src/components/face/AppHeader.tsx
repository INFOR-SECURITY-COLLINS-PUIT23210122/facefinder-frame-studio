import { Link } from "@tanstack/react-router";
import { History, ScanFace } from "lucide-react";

import { ThemeToggle } from "@/components/face/ThemeToggle";

const navLink =
  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanFace className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-semibold leading-tight">Face Prediction</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Face detection with your Ultralytics model
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1" aria-label="Main">
            <Link
              to="/"
              className={navLink}
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              <ScanFace className="size-4" /> Detect
            </Link>
            <Link
              to="/history"
              className={navLink}
              activeProps={{ className: "bg-muted text-foreground" }}
            >
              <History className="size-4" /> History
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
