import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Compact input styling shared by the Add forms, matching the grid's filter inputs. */
export const inputCls =
  "h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/70 hover:border-primary/40 focus:border-primary/60 focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";
export const textareaCls = cn(inputCls, "h-auto min-h-[64px] resize-y py-1.5");

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="flex items-baseline gap-1 text-[11px] font-semibold text-title">
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && <span className="font-normal text-muted-foreground/70">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
