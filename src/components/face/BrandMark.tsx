import { cn } from "@/lib/utils";

/** Face Insight Studio mark: a face inside a camera viewfinder, with an "insight" dot. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        className="size-6"
      >
        <path d="M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2" />
        <circle cx="12" cy="10.5" r="3" />
        <path d="M7.8 17c1.1-1.3 2.5-2 4.2-2s3.1.7 4.2 2" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-detect ring-2 ring-background" />
    </span>
  );
}
