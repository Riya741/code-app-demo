import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared shell so every panel on the customer page looks identical. Body scrolls only if it must. */
export function Panel({
  title,
  count,
  badges,
  headerRight,
  children,
  className,
  bodyClassName,
  headerClassName,
}: {
  title: string;
  count?: number;
  /** Extra figures shown right after the count, e.g. a "Live" tally. */
  badges?: ReactNode;
  /** Pinned to the far right of the title bar. */
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-lg shadow-slate-900/5 animate-in fade-in slide-in-from-bottom-4 duration-500",
        className,
      )}
    >
      <header className={cn("flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b bg-slate-100/80 min-h-8 px-3.5 py-1 dark:bg-slate-800/60", headerClassName)}>
        <div className="flex shrink-0 items-center gap-2">
          <h2 className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-title">{title}</h2>
          {count != null && (
            <span className="rounded-full bg-title/10 px-2 text-[10.5px] leading-4 font-semibold text-title ring-1 ring-inset ring-title/20">
              {count}
            </span>
          )}
          {badges}
        </div>
        {headerRight && <div className="ml-auto flex items-center gap-2">{headerRight}</div>}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>
    </section>
  );
}
