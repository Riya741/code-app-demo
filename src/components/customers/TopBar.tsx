import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { Building2, Moon, RefreshCw, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({
  selectedLabel,
  onClear,
  onRefresh,
  refreshing,
  children,
}: {
  /** "Name" + "Parent ID: 1234" of the selected customer; shown as a chip on the left. */
  selectedLabel?: { name: string; id?: string };
  onClear: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  /** Slot for the compact search bar once a customer is selected. */
  children?: ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/75 backdrop-blur-xl">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-5">
        <div className="min-w-0 shrink-0 sm:max-w-[40%]">
          {selectedLabel && (
            <div
              key={`${selectedLabel.name}-${selectedLabel.id}`}
              className="flex max-w-full items-center gap-2 rounded-full border bg-card py-1 pl-1.5 pr-1 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                <Building2 className="h-3 w-3" />
              </span>
              <span className="truncate text-sm font-semibold">{selectedLabel.name}</span>
              {selectedLabel.id && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Parent ID: <span className="font-mono font-medium text-foreground">{selectedLabel.id}</span>
                </span>
              )}
              <button
                onClick={onClear}
                aria-label="Clear selected customer"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {children && <div className="mx-auto w-full max-w-md animate-in fade-in duration-500">{children}</div>}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} aria-label="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
