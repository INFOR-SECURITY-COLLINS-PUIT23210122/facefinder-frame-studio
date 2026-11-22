import { ImageUp } from "lucide-react";
import { useRef, useState } from "react";

import { MAX_BATCH } from "@/lib/image-files";
import { cn } from "@/lib/utils";

export { MAX_IMAGE_BYTES, validateImage } from "@/lib/image-files";

/** Click or drop one photo, or several at once. */
export function ImageDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (list: FileList | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <>
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
          handle(e.dataTransfer.files);
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
        <span className="font-display text-lg font-medium">Drop photos here</span>
        <span className="text-sm text-muted-foreground">
          or click to browse · JPG or PNG · up to 10 MB each
        </span>
        <span className="text-xs text-muted-foreground">
          Pick one photo, or up to {MAX_BATCH} at once
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
