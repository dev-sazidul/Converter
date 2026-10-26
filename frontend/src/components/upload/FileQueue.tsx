import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, FileText, GripVertical, Trash2 } from "lucide-react";
import { cn, focusRing, formatBytes } from "@/lib/utils";

export type QueueItem = {
  id: string;
  file: File;
};

type FileQueueProps = {
  items: QueueItem[];
  reorder: boolean;
  disabled?: boolean;
  onReorder: (items: QueueItem[]) => void;
  onRemove: (id: string) => void;
};

export function FileQueue({ items, reorder, disabled = false, onReorder, onRemove }: FileQueueProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onReorder(next);
  }

  function dropOn(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const next = items.slice();
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    onReorder(next);
    setDragIndex(null);
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable={reorder && !disabled}
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => {
            if (reorder) event.preventDefault();
          }}
          onDrop={() => dropOn(index)}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2",
            dragIndex === index && "border-primary",
          )}
        >
          {reorder && (
            <span className="hidden text-muted sm:inline-flex" aria-hidden="true">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{item.file.name}</p>
            <p className="text-xs text-muted">{formatBytes(item.file.size)}</p>
          </div>
          {reorder && (
            <div className="flex shrink-0">
              <IconButton label={`Move ${item.file.name} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </IconButton>
              <IconButton label={`Move ${item.file.name} down`} disabled={disabled || index === items.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown className="h-4 w-4" />
              </IconButton>
            </div>
          )}
          <IconButton label={`Remove ${item.file.name}`} disabled={disabled} onClick={() => onRemove(item.id)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </li>
      ))}
    </ol>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-primary-soft hover:text-ink disabled:opacity-40", focusRing)}
    >
      {children}
    </button>
  );
}
