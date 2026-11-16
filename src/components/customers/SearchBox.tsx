import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, CornerDownLeft, Loader2, Search, SearchX, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

const MAX_RESULTS = 100;

const nameOf = (r: Row) => String(r.parent_name ?? "");
const idOf = (r: Row) => (r.parent_id == null ? "" : String(r.parent_id));
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi"));
  const lower = new Set(tokens.map((t) => t.toLowerCase()));
  return (
    <>
      {parts.map((p, i) =>
        lower.has(p.toLowerCase()) ? (
          <mark key={i} className="bg-transparent font-bold text-title">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** Matches parent name or parent ID (the ID is never displayed). Lower is better; null = no match. */
function score(name: string, id: string, query: string, tokens: string[]): number | null {
  const n = name.toLowerCase();
  if (!tokens.every((t) => n.includes(t))) return id && id.includes(query) ? 4 : null;
  if (n === query || id === query) return 0;
  if (n.startsWith(query)) return 1;
  if (tokens.every((t) => n.split(/[\s\-_/.,()&]+/).some((w) => w.startsWith(t)))) return 2;
  return 3;
}

export function SearchBox({
  rows,
  loading,
  error,
  onRetry,
  onSelect,
  variant,
  autoFocus,
}: {
  rows: Row[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onSelect: (row: Row) => void;
  variant: "hero" | "bar";
  autoFocus?: boolean;
}) {
  const bar = variant === "bar";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const deferred = useDeferredValue(query);

  const q = deferred.trim().toLowerCase();
  const tokens = useMemo(() => [...new Set(q.split(/\s+/).filter(Boolean))], [q]);

  // Name + hidden parent-ID index built once per data load; searching is entirely in-memory.
  const index = useMemo(() => rows.map((row) => ({ row, name: nameOf(row), id: idOf(row) })), [rows]);

  const { results, total } = useMemo(() => {
    if (!q) return { results: [] as Row[], total: 0 };
    const scored: { row: Row; s: number; name: string }[] = [];
    for (const { row, name, id } of index) {
      const s = score(name, id, q, tokens);
      if (s !== null) scored.push({ row, s, name });
    }
    scored.sort((a, b) => a.s - b.s || a.name.localeCompare(b.name));
    return { results: scored.slice(0, MAX_RESULTS).map((x) => x.row), total: scored.length };
  }, [index, q, tokens]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (row: Row) => {
    onSelect(row);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    }
  };

  const showPanel = open && !!query.trim() && !loading && !error;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-card/90 shadow-lg shadow-slate-900/5 ring-offset-background backdrop-blur transition-all duration-300 focus-within:border-primary/50 focus-within:shadow-xl focus-within:shadow-slate-900/15 focus-within:ring-2 focus-within:ring-primary/20",
          bar ? "h-8 gap-2 rounded-lg px-3" : "h-16 px-5",
        )}
      >
        {loading ? (
          <Loader2 className={cn("shrink-0 animate-spin text-primary", bar ? "h-4 w-4" : "h-5 w-5")} />
        ) : (
          <Search className={cn("shrink-0 text-title/70", bar ? "h-4 w-4" : "h-5 w-5")} />
        )}
        <input
          autoFocus={autoFocus}
          value={query}
          disabled={loading || !!error}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={
            loading ? "Loading parents..." : bar ? "Search another parent..." : "Search Parent"
          }
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="customer-results"
          aria-autocomplete="list"
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70 disabled:cursor-wait",
            bar ? "text-sm" : "text-lg",
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-center text-sm text-destructive">
          {error}{" "}
          <button onClick={onRetry} className="font-medium underline underline-offset-2">
            Try again
          </button>
        </p>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-title/15 bg-popover shadow-2xl shadow-slate-900/15 animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
              <SearchX className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No customers match "{query.trim()}"</p>
              <p className="text-xs text-muted-foreground">Check the spelling or try a shorter name.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b bg-title/[0.04] px-4 py-2 text-[11px] font-medium text-title">
                <span>
                  {total.toLocaleString()} {total === 1 ? "match" : "matches"}
                  {total > MAX_RESULTS && ` (showing top ${MAX_RESULTS})`}
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <CornerDownLeft className="h-3 w-3" /> to open
                </span>
              </div>
              <ul id="customer-results" role="listbox" ref={listRef} className="max-h-[min(60vh,28rem)] overflow-y-auto p-1.5">
                {results.map((row, i) => {
                  const name = nameOf(row);
                  return (
                    <li
                      key={`${row.id ?? row.parent_id}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(row)}
                      className={cn(
                        "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        i === active ? "bg-title/10 shadow-[inset_3px_0_0_hsl(var(--title))]" : "hover:bg-title/5",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-normal text-foreground">
                          <Highlight text={name} tokens={tokens} />
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-title/30 transition-all group-hover:translate-x-0.5 group-hover:text-title" />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
