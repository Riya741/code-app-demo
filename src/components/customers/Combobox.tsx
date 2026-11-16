import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Option } from "@/lib/lookups";

/** Searchable dropdown. Single-select by default; `multiple` keeps the list open and shows a comma separated summary. */
export function Combobox({
  options,
  value,
  onChange,
  multiple,
  placeholder = "Select...",
  disabled,
  loading,
  error,
  invalid,
  emptyText = "No options",
  className,
}: {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  /** Red border without a message underneath, for dense layouts such as table cells. */
  invalid?: boolean;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.filter((o) => value.includes(o.value));
  const summary = selected.map((o) => o.label).join(", ");

  const pick = (v: string) => {
    if (multiple) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else {
      onChange(value.includes(v) ? [] : [v]);
      setOpen(false);
    }
  };

  return (
    <div className={className}>
      {/* modal so the list scrolls with the mouse wheel when this sits inside a dialog */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || loading}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md border border-input bg-background px-2.5 text-left text-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
              (error || invalid) && "border-destructive",
            )}
          >
            <span className={cn("min-w-0 flex-1 truncate", !summary && "text-muted-foreground")}>
              {loading ? "Loading..." : summary || placeholder}
            </span>
            {multiple && selected.length > 1 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">{selected.length}</span>
            )}
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0">
          <Command>
            <CommandInput placeholder="Search..." className="h-8 text-xs" />
            <CommandList className="max-h-56">
              <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">{emptyText}</CommandEmpty>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label}__${o.value}`} onSelect={() => pick(o.value)} className="gap-2 py-1.5 text-xs">
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
          {multiple && value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center justify-center gap-1 border-t py-1.5 text-[11px] font-medium text-primary hover:bg-accent"
            >
              <X className="h-3 w-3" /> Clear selection
            </button>
          )}
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
