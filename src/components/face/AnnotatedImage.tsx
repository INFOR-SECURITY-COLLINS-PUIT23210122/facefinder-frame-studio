import { formatPercent, type Prediction } from "@/lib/predictions";

type Props = {
  src: string;
  natural: { width: number; height: number } | null;
  predictions: Prediction[];
  scanning?: boolean;
  onLoad: (size: { width: number; height: number }) => void;
};

/** Image with boxes positioned in percentages of the original size, so they scale with the displayed image. */
export function AnnotatedImage({ src, natural, predictions, scanning, onLoad }: Props) {
  return (
    <div className="dot-grid flex items-center justify-center overflow-hidden rounded-lg border border-border">
      <div className="relative inline-block max-w-full">
        <img
          src={src}
          alt="Selected photo"
          className="block max-h-[520px] w-auto max-w-full"
          onLoad={(e) =>
            onLoad({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
          }
        />
        {natural &&
          predictions.map((p) => {
            const left = (p.box.x1 / natural.width) * 100;
            const top = (p.box.y1 / natural.height) * 100;
            const width = ((p.box.x2 - p.box.x1) / natural.width) * 100;
            const height = ((p.box.y2 - p.box.y1) / natural.height) * 100;
            return (
              <div
                key={p.id}
                className="detect-box pointer-events-none absolute"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              >
                <span
                  className={`detect-label absolute left-[-2px] whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-semibold leading-none ${top < 6 ? "top-0" : "-top-5"}`}
                >
                  {p.name} {formatPercent(p.confidence)}
                </span>
              </div>
            );
          })}
        {scanning && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-scan h-full w-full bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
