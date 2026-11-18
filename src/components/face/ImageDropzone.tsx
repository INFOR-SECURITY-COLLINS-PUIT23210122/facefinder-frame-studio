import { ImageUp } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png"];

export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Please choose a JPG or PNG image.";
  if (file.size > MAX_IMAGE_BYTES) return "That image is larger than 10 MB. Please choose a smaller one.";
  return null;
}

type Props = { onFile: (file: File) => void; onError: (message: string) => void };

export function ImageDropzone({ onFile, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File | undefined) => {
    if (!file) return;
    const err = validateImage(file);
    if (err) onError(err);
    else onFile(file);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handle(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "dot-grid group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors",
        "hover:border-primary focus-visible:border-primary focus-visible:outline-none",
        dragging && "border-primary bg-accent",
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-card text-primary shadow-panel transition-transform group-hover:-translate-y-0.5">
        <ImageUp className="size-6" />
      </span>
      <span className="font-display text-lg font-medium">Drop a photo here</span>
      <span className="text-sm text-muted-foreground">or click to browse · JPG or PNG · up to 10 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </button>
  );
}
