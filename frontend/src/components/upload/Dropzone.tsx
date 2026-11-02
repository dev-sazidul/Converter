import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, focusRing } from "@/lib/utils";

type DropzoneProps = {
  accept: string[];
  multiple: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  variant?: "hero" | "compact";
  onFiles: (files: File[]) => void;
};

export function Dropzone({
  accept,
  multiple,
  disabled = false,
  title,
  hint,
  variant = "hero",
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);

  function take(list: FileList | null) {
    if (!list || disabled) return;
    onFiles(Array.from(list));
  }

  if (variant === "compact") {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept.join(",")}
          multiple={multiple}
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {title}
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setHot(true);
      }}
      onDragLeave={() => setHot(false)}
      onDrop={(event) => {
        event.preventDefault();
        setHot(false);
        take(event.dataTransfer.files);
      }}
      className={cn(
        "rounded-3xl border border-dashed px-4 py-10 text-center transition sm:px-6 sm:py-14",
        hot ? "border-primary bg-primary-soft" : "border-line bg-white",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={accept.join(",")}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex h-12 max-w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60 sm:px-6",
          focusRing,
        )}
      >
        {title}
      </button>
      <p className="mt-3 text-sm text-muted">{hint}</p>
    </div>
  );
}
