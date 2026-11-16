import { Suspense, lazy, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RICH_TEXT_CLASS, looksLikeHtml, sanitizeHtml } from "@/lib/html";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const RichTextEditor = lazy(() => import("@/components/customers/RichTextEditor").then((m) => ({ default: m.RichTextEditor })));

/**
 * Form field that reads like a normal text input; clicking the text swaps it for the rich text editor (with a Done button).
 * `value` is HTML ("" when empty).
 */
export function RichTextField({
  value,
  onChange,
  placeholder = "Click to add...",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const dark = useTheme().resolvedTheme === "dark";

  if (editing) {
    return (
      <div className="overflow-hidden rounded-md border border-primary/40 ring-1 ring-primary/20">
        <Suspense fallback={<p className="p-3 text-xs text-muted-foreground">Loading editor...</p>}>
          <RichTextEditor html={value} onChange={onChange} compact />
        </Suspense>
        <div className="flex justify-end border-t bg-muted/40 p-1">
          <Button type="button" size="sm" className="h-6 gap-1 px-2 text-[11px] [&_svg]:size-3" onClick={() => setEditing(false)}>
            <Check /> Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click to edit"
      onClick={(e) => !(e.target as HTMLElement).closest("a") && setEditing(true)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), setEditing(true))}
      className={cn(
        "group relative max-h-40 min-h-[64px] cursor-text overflow-auto rounded-md border border-input bg-background px-2.5 py-1.5 text-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-1 focus-visible:ring-ring",
      )}
    >
      <Pencil className="pointer-events-none absolute right-2 top-1.5 h-3 w-3 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
      {value ? (
        looksLikeHtml(value) ? (
          <div
            className={cn(RICH_TEXT_CLASS, "prose-p:my-1")}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value, dark) }}
          />
        ) : (
          <p className="whitespace-pre-line">{value}</p>
        )
      ) : (
        <span className="text-muted-foreground/70">{placeholder}</span>
      )}
    </div>
  );
}
