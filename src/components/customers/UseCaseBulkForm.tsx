import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, ClipboardPaste, Copy, Loader2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/customers/Combobox";
import { Field, inputCls, textareaCls } from "@/components/customers/FormBits";
import { RichTextField } from "@/components/customers/RichTextField";
import { idList, num, plain, splitIds } from "@/components/customers/UseCaseForm";
import { useSaveUseCases } from "@/hooks/useParentActivity";
import {
  LOOKUP_STALE,
  useContentTypes,
  usePersonnel,
  useSolutions,
  useSolutionStatuses,
  useSolutionUseCaseTypes,
  useSubsidiaries,
} from "@/hooks/useLookups";
import { detectKey, fetchDepartments, fetchStakeholders, type Option } from "@/lib/lookups";
import type { UseCaseRow } from "@/lib/parentData";
import type { UseCaseInput } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One use case to be created. Ids are held as strings, the same as the single form's dropdowns. */
type Row = {
  key: number;
  subsidiary: string;
  department: string;
  stakeholder: string;
  solution: string;
  useCaseType: string;
  status: string;
  launch: string;
  /** Department name carried over from the source use case; picked in the new subsidiary once its departments have loaded. */
  hint?: string;
  /** Subsidiary the hint was last applied for, so a department the user clears on purpose stays cleared. */
  hintFor?: string;
  /** A copy starts at its solution's first status; set once the statuses have loaded. */
  resetStatus?: boolean;
  /** Details a cloned row keeps from its source. Used unless "same for every use case" is switched on. */
  contentTypes: string[];
  personnel: string[];
  value: string;
  note: string;
  /** Why the last save of this row failed. */
  error?: string;
};

const k = (n?: number) => (n == null ? "" : String(n));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const sameName = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

const PILL_TONES = {
  neutral: "bg-muted text-muted-foreground ring-border",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
  bad: "bg-red-50 text-red-700 ring-red-600/30 dark:bg-red-500/15 dark:text-red-300",
};

function Pill({ tone = "neutral", title, children }: { tone?: keyof typeof PILL_TONES; title?: string; children: ReactNode }) {
  return (
    <span
      title={title}
      className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1 ring-inset [&_svg]:size-3", PILL_TONES[tone])}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-[11px] font-bold uppercase tracking-wider text-title/85">
      {children}
      {hint && <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{hint}</span>}
    </p>
  );
}

const TH = "px-1.5 py-1.5 text-left text-[11px] font-semibold text-title whitespace-nowrap";

/**
 * Dialog for creating several use cases at once: cloning one or more existing use cases, or adding many from scratch.
 * Each row of the table becomes one use case; details that are the same for all of them are entered once underneath.
 * Mounted only while open, so every open starts fresh.
 */
export function UseCaseBulkForm({
  parentId,
  customerKeys,
  existing,
  sources = [],
  startWithPaste,
  onClose,
}: {
  parentId: number;
  /** Customer keys to find its subsidiaries by (the customer `id`, then its `parent_id`). */
  customerKeys: number[];
  /** Use cases already shown; used to spot duplicates and to work out which id column the lookups are keyed by. */
  existing: UseCaseRow[];
  /** Use cases to copy. Empty to add new ones from scratch. */
  sources?: UseCaseRow[];
  /** Open with the "paste from Excel" box showing. */
  startWithPaste?: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const save = useSaveUseCases(parentId);
  const many = sources.length > 1;
  const cloning = sources.length > 0;

  const keyRef = useRef(1);
  const newKey = () => keyRef.current++;
  const blank = (over: Partial<Row> = {}): Row => ({
    key: newKey(), subsidiary: "", department: "", stakeholder: "", solution: "", useCaseType: "", status: "", launch: "",
    contentTypes: [], personnel: [], value: "", note: "", ...over,
  });

  const [rows, setRows] = useState<Row[]>(() =>
    cloning
      ? sources.map((s) =>
          blank({
            hint: s.department_name,
            solution: k(s.solution_id),
            useCaseType: k(s.use_case_type_id),
            resetStatus: true,
            contentTypes: splitIds(s.content_type_ids),
            personnel: splitIds(s.personnel_ids),
            value: plain(s.value_snippet),
            note: s.note ?? "",
          }),
        )
      : [blank(), blank()],
  );
  const first = sources[0];
  const [shared, setShared] = useState({
    on: !many,
    contentTypes: splitIds(first?.content_type_ids),
    personnel: splitIds(first?.personnel_ids),
    value: plain(first?.value_snippet),
    note: first?.note ?? "",
  });
  const [fill, setFill] = useState({ subsidiary: [] as string[], solution: [] as string[], status: [] as string[], launch: "", onlyEmpty: true });
  const [pasteOpen, setPasteOpen] = useState(!!startWithPaste);
  const [pasteText, setPasteText] = useState("");
  const [touched, setTouched] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ------------------------------- lookups ------------------------------- */
  const subsidiaries = useSubsidiaries(customerKeys, true);
  const solutions = useSolutions(true);
  const useCaseTypes = useSolutionUseCaseTypes(true);
  const statuses = useSolutionStatuses(true);
  const contentTypeList = useContentTypes(true);
  const personnelList = usePersonnel(true);

  // Departments / stakeholders are per row, so load one list for each distinct subsidiary / department in the table.
  // The query keys match useDepartments / useStakeholders, so the cache is shared with the single form.
  const subKeys = [...new Set(rows.map((r) => r.subsidiary).filter(Boolean))];
  const deptKeys = [...new Set(rows.map((r) => r.department).filter(Boolean))];
  const deptQueries = useQueries({
    queries: subKeys.map((s) => ({ queryKey: ["lookup", "departments", Number(s)], queryFn: () => fetchDepartments(Number(s)), staleTime: LOOKUP_STALE })),
  });
  const stakeQueries = useQueries({
    queries: deptKeys.map((d) => ({ queryKey: ["lookup", "stakeholders", Number(d)], queryFn: () => fetchStakeholders(Number(d)), staleTime: LOOKUP_STALE })),
  });
  const deptsBySub = new Map(subKeys.map((s, i) => [s, deptQueries[i]?.data] as const));
  const stakesByDept = new Map(deptKeys.map((d, i) => [d, stakeQueries[i]?.data] as const));
  const loadedDepts = [...deptsBySub.values()].flatMap((d) => d ?? []);
  const deptLoading = (sub: string) => !!deptQueries[subKeys.indexOf(sub)]?.isLoading;
  const stakeLoading = (dept: string) => !!stakeQueries[deptKeys.indexOf(dept)]?.isLoading;
  const deptError = (sub: string) => deptQueries[subKeys.indexOf(sub)]?.error as Error | null | undefined;

  const subKey = useMemo(
    () =>
      detectKey(
        existing.map((r) => ({ key: r.subsidiary_id, name: r.subsidiary_name })),
        (subsidiaries.data ?? []).map((s) => ({ id: s.id, alt: s.subsidiary_id, name: s.subsidiary_name })),
      ),
    [existing, subsidiaries.data],
  );
  const deptKeyFor = (lists: typeof loadedDepts) =>
    detectKey(
      existing.map((r) => ({ key: r.department_id, name: r.department_name })),
      lists.map((d) => ({ id: d.id, alt: d.department_id, name: d.department_name })),
    );
  const deptKey = deptKeyFor(loadedDepts);
  const deptValue = (d: (typeof loadedDepts)[number], key = deptKey) => String(key === "alt" ? d.department_id : d.id);

  const subsidiaryOptions: Option[] = (subsidiaries.data ?? [])
    .map((s) => ({ value: String(subKey === "alt" ? s.subsidiary_id : s.id), label: s.subsidiary_name ?? "(unnamed)" }))
    .filter((o) => o.value !== "undefined");
  const solutionOptions: Option[] = (solutions.data ?? []).map((s) => ({ value: String(s.id), label: s.solution_name ?? "(unnamed)" }));
  const contentOptions: Option[] = (contentTypeList.data ?? []).map((c) => ({ value: String(c.id), label: c.content_type ?? "(unnamed)" }));
  const personnelOptions: Option[] = (personnelList.data ?? []).map((p) => ({ value: String(p.id), label: p.name ?? p.email }));

  const deptOptions = (sub: string): Option[] =>
    (deptsBySub.get(sub) ?? [])
      .map((d) => ({ value: deptValue(d), label: [d.department_name, d.department_type && `(${d.department_type})`].filter(Boolean).join(" ") || "(unnamed)" }))
      .filter((o) => o.value !== "undefined");
  const stakeOptions = (dept: string): Option[] =>
    (stakesByDept.get(dept) ?? []).map((s) => ({ value: String(s.id), label: [s.stakeholder_name, s.stakeholder_title && `- ${s.stakeholder_title}`].filter(Boolean).join(" ") }));
  const typesFor = (sol: string) => (useCaseTypes.data ?? []).filter((t) => String(t.solution_id) === sol);
  const statusesFor = (sol: string) =>
    (statuses.data ?? []).filter((s) => String(s.solution_id) === sol).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const typeOptions = (sol: string): Option[] => typesFor(sol).map((t) => ({ value: String(t.use_case_type_id), label: t.use_case_type ?? "(unnamed)" }));
  const statusOptions = (sol: string): Option[] => statusesFor(sol).map((s) => ({ value: String(s.status_id), label: s.status ?? "(unnamed)" }));
  // "Set on all rows" picks a status by name, because each solution has its own list of statuses.
  const statusNameOptions: Option[] = [...new Set((statuses.data ?? []).map((s) => s.status).filter((s): s is string => !!s))].map((s) => ({ value: s, label: s }));

  /* --------------------------- keep rows consistent --------------------------- */
  // Runs after every render but only changes state when a row needs it, so it settles immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRows((rs) => {
      let changed = false;
      const next = rs.map((r) => {
        // Pick the source's department in the new subsidiary once that subsidiary's departments are known.
        if (r.hint && r.subsidiary && !r.department && r.hintFor !== r.subsidiary) {
          const list = deptsBySub.get(r.subsidiary);
          if (list) {
            changed = true;
            const hit = list.find((d) => sameName(d.department_name, r.hint));
            return { ...r, hintFor: r.subsidiary, department: hit ? deptValue(hit) : "" };
          }
        }
        // A copy starts at its solution's first status ("Planned" when it has one) instead of inheriting "Live".
        if (r.resetStatus && statuses.data && r.solution) {
          changed = true;
          const list = statusesFor(r.solution);
          const start = list.find((s) => /planned/i.test(s.status ?? "")) ?? list[0];
          return { ...r, resetStatus: false, status: start ? String(start.status_id) : "" };
        }
        return r;
      });
      return changed ? next : rs;
    });
  });

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p, error: undefined } : r)));
  const withSubsidiary = (r: Row, v: string): Row => ({ ...r, subsidiary: v, department: "", stakeholder: "", hintFor: undefined, error: undefined });
  /** Changing the solution keeps the use case type and status when the new solution has one of the same name. */
  const withSolution = (r: Row, v: string): Row => {
    const oldType = (useCaseTypes.data ?? []).find((t) => String(t.use_case_type_id) === r.useCaseType)?.use_case_type;
    const oldStatus = (statuses.data ?? []).find((s) => String(s.status_id) === r.status)?.status;
    const type = typesFor(v).find((t) => sameName(t.use_case_type, oldType));
    const status = statusesFor(v).find((s) => sameName(s.status, oldStatus));
    return { ...r, solution: v, useCaseType: type ? String(type.use_case_type_id) : "", status: status ? String(status.status_id) : "", error: undefined };
  };

  const applyFill = () =>
    setRows((rs) =>
      rs.map((r) => {
        const can = (cur: string) => !fill.onlyEmpty || !cur;
        let n = r;
        if (fill.solution[0] && can(n.solution)) n = withSolution(n, fill.solution[0]);
        if (fill.subsidiary[0] && can(n.subsidiary)) n = withSubsidiary(n, fill.subsidiary[0]);
        if (fill.status[0] && can(n.status)) {
          const hit = statusesFor(n.solution).find((s) => sameName(s.status, fill.status[0]));
          if (hit) n = { ...n, status: String(hit.status_id) };
        }
        if (fill.launch && can(n.launch)) n = { ...n, launch: fill.launch };
        return n;
      }),
    );

  /** A row with no target yet; these are the ones "every department in..." and "paste" fill in. */
  const pending = (r: Row) => !r.subsidiary && !r.department;
  const template = (): Row => {
    const base = rows.find(pending) ?? rows[rows.length - 1];
    return blank(base ? { solution: base.solution, useCaseType: base.useCaseType, status: base.status, launch: base.launch, hint: base.hint, contentTypes: base.contentTypes, personnel: base.personnel, value: base.value, note: base.note } : {});
  };

  const addRow = () => {
    const r = template();
    setRows((rs) => [...rs, r]);
    requestAnimationFrame(() => document.getElementById(`bulk-row-${r.key}`)?.scrollIntoView({ block: "nearest" }));
  };
  const duplicateRow = (r: Row) =>
    setRows((rs) => {
      const i = rs.findIndex((x) => x.key === r.key);
      return [...rs.slice(0, i + 1), { ...r, key: newKey(), error: undefined }, ...rs.slice(i + 1)];
    });
  const removeRow = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  /** One copy of every pending row for each department of the subsidiary (or one row per department when there is nothing pending). */
  const addAllDepartments = async (sub: string) => {
    try {
      const depts = await qc.fetchQuery({ queryKey: ["lookup", "departments", Number(sub)], queryFn: () => fetchDepartments(Number(sub)), staleTime: LOOKUP_STALE });
      if (!depts.length) return void toast.info("That subsidiary has no departments");
      const key = deptKeyFor([...loadedDepts, ...depts]);
      const bases = rows.filter(pending);
      const made = (bases.length ? bases : [template()]).flatMap((b) =>
        depts.map((d) => ({ ...b, key: newKey(), subsidiary: sub, department: deptValue(d, key), stakeholder: "", hint: undefined, hintFor: undefined })),
      );
      setRows((rs) => [...rs.filter((r) => !pending(r)), ...made]);
    } catch (e) {
      toast.error("Could not load departments", { description: (e as Error).message });
    }
  };

  /** Lines of "subsidiary, department, stakeholder" (tab or comma separated) become rows; names are matched to the lookups. */
  const addPasted = async () => {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const base = template();
    const made: Row[] = [];
    let unmatched = 0;
    for (const line of lines) {
      const [subName, deptName, stakeName] = line.split(/\t|,/).map((c) => c.trim());
      const r: Row = { ...base, key: newKey(), hint: undefined };
      const sub = subsidiaryOptions.find((o) => sameName(o.label, subName));
      if (sub) {
        r.subsidiary = sub.value;
        if (deptName) {
          const depts = await qc.fetchQuery({ queryKey: ["lookup", "departments", Number(sub.value)], queryFn: () => fetchDepartments(Number(sub.value)), staleTime: LOOKUP_STALE });
          const dept = depts.find((d) => sameName(d.department_name, deptName));
          if (dept) {
            r.department = deptValue(dept, deptKeyFor([...loadedDepts, ...depts]));
            if (stakeName) {
              const people = await qc.fetchQuery({ queryKey: ["lookup", "stakeholders", Number(r.department)], queryFn: () => fetchStakeholders(Number(r.department)), staleTime: LOOKUP_STALE });
              const person = people.find((s) => sameName(s.stakeholder_name, stakeName));
              if (person) r.stakeholder = String(person.id);
              else unmatched++;
            }
          } else unmatched++;
        }
      } else unmatched++;
      made.push(r);
    }
    setRows((rs) => [...rs.filter((r) => !pending(r)), ...made]);
    setPasteText("");
    setPasteOpen(false);
    if (unmatched) toast.warning(`${plural(unmatched, "name")} didn't match and were left blank`, { description: "Choose them in the table." });
  };

  /* ------------------------------- checking ------------------------------- */
  const checks = rows.map((r, i) => {
    const missing = (["subsidiary", "solution", "status"] as const).filter((f) => !r[f]);
    let duplicate = "";
    if (!missing.length) {
      const same = (o: { subsidiary: string; department: string; solution: string; useCaseType: string }) =>
        o.subsidiary === r.subsidiary && o.department === r.department && o.solution === r.solution && o.useCaseType === r.useCaseType;
      if (existing.some((e) => same({ subsidiary: k(e.subsidiary_id), department: k(e.department_id), solution: k(e.solution_id), useCaseType: k(e.use_case_type_id) })))
        duplicate = "A use case with the same subsidiary, department, solution and type already exists";
      else {
        const j = rows.slice(0, i).findIndex(same);
        if (j >= 0) duplicate = `Same as row ${j + 1}`;
      }
    }
    return { missing, duplicate };
  });
  const incomplete = checks.filter((c) => c.missing.length).length;
  const duplicates = checks.filter((c) => !c.missing.length && c.duplicate).length;
  const ready = rows.length - incomplete - duplicates;
  const failedCount = rows.filter((r) => r.error).length;
  const bad = (i: number, f: "subsidiary" | "solution" | "status") => touched && checks[i].missing.includes(f);

  const submit = async () => {
    setTouched(true);
    if (!rows.length) return;
    const firstBad = checks.findIndex((c) => c.missing.length);
    if (firstBad >= 0) {
      requestAnimationFrame(() => document.getElementById(`bulk-row-${rows[firstBad].key}`)?.scrollIntoView({ block: "nearest" }));
      return;
    }
    const inputs: UseCaseInput[] = rows.map((r) => {
      const d = shared.on ? shared : r;
      const sol = (solutions.data ?? []).find((s) => String(s.id) === r.solution);
      return {
        parent_id: parentId,
        subsidiary_id: num([r.subsidiary]),
        department_id: num([r.department]),
        stakeholder_id: num([r.stakeholder]),
        solution_id: num([r.solution]),
        use_case_type_id: num([r.useCaseType]),
        status_id: num([r.status]),
        expected_launch_date: r.launch || undefined,
        content_type_ids: idList(d.contentTypes),
        personnel_ids: idList(d.personnel),
        value_snippet: d.value.trim() || undefined,
        note: d.note.trim() ? d.note : undefined,
        premium_credit: sol?.premium_credit ?? false,
        deleted: false,
      };
    });
    setProgress(0);
    const { failed } = await save.mutateAsync({ inputs, onProgress: setProgress });
    if (!failed.length) {
      toast.success(`${plural(inputs.length, "use case")} created`);
      return onClose();
    }
    // Keep only the rows that did not save, each with its reason, so the user can fix them and try again.
    const why = new Map(failed.map((f) => [f.index, f.message]));
    setRows((rs) => rs.filter((_, i) => why.has(i)).map((r) => ({ ...r, error: why.get(rs.indexOf(r)) })));
    toast.error(`${inputs.length - failed.length} of ${inputs.length} created`, { description: "The rows that did not save are still in the table." });
  };

  /* ---------------------------------- view ---------------------------------- */
  const title = !cloning ? "Add multiple use cases" : many ? `Clone ${sources.length} use cases` : "Clone use case";
  const description = !cloning
    ? "Add one row for each use case. Anything the same for all of them goes in the details section below the table."
    : "Each row becomes a new use case with the details of its source. Choose where the copies go, then check the rows.";
  const busy = save.isPending;
  const loadError = (e: unknown) => (e ? (e as Error).message : undefined);
  const lookupError = loadError(subsidiaries.error) ?? loadError(solutions.error) ?? loadError(statuses.error) ?? loadError(useCaseTypes.error);

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="flex max-h-[92vh] w-[min(96vw,1280px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 px-6 pb-2 pt-5 pr-12">
          <DialogTitle className="text-sm text-title">{title}</DialogTitle>
          <DialogDescription className="mt-1 max-w-[80ch] text-xs">{description}</DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-1">
          {cloning && (
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border bg-accent/50 px-2.5 py-2">
              <span className="text-[11px] font-semibold text-title">Cloning from</span>
              {sources.slice(0, 3).map((s, i) => (
                <span key={s.id ?? i} className="flex flex-col rounded-md border bg-card px-2 py-0.5 leading-tight">
                  <span className="text-xs font-semibold">{[s.solution_name?.trim() || "Untitled", s.use_case_type].filter(Boolean).join(" / ")}</span>
                  <span className="text-[10.5px] text-muted-foreground">{[s.subsidiary_name, s.department_name].filter(Boolean).join(" / ") || "No subsidiary"}</span>
                </span>
              ))}
              {sources.length > 3 && <Pill>+{sources.length - 3} more</Pill>}
              <p className="basis-full text-[11px] text-muted-foreground">
                Copies start as new use cases: the status is set to Planned (or the solution's first status) and the launch date is cleared. The stakeholder is not copied
                because it belongs to the original department.
              </p>
            </div>
          )}

          {lookupError && <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">Could not load some lists: {lookupError}</p>}

          <div>
            <SectionTitle hint={many ? "Pick a subsidiary to send every copy to the same place." : "Fill the same value into every row at once."}>Set on all rows</SectionTitle>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2 rounded-lg border border-dashed p-2.5">
              <Field label="Subsidiary" className="w-44">
                <Combobox options={subsidiaryOptions} value={fill.subsidiary} onChange={(v) => setFill((f) => ({ ...f, subsidiary: v }))} loading={subsidiaries.isLoading} placeholder="Leave as is" />
              </Field>
              <Field label="Solution" className="w-52">
                <Combobox options={solutionOptions} value={fill.solution} onChange={(v) => setFill((f) => ({ ...f, solution: v }))} loading={solutions.isLoading} placeholder="Leave as is" />
              </Field>
              <Field label="Status" className="w-40">
                <Combobox options={statusNameOptions} value={fill.status} onChange={(v) => setFill((f) => ({ ...f, status: v }))} loading={statuses.isLoading} placeholder="Leave as is" />
              </Field>
              <Field label="Launch date" className="w-36">
                <input type="date" value={fill.launch} onChange={(e) => setFill((f) => ({ ...f, launch: e.target.value }))} className={inputCls} />
              </Field>
              <label className="flex h-8 cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                <Checkbox className="h-3.5 w-3.5" checked={fill.onlyEmpty} onCheckedChange={(c) => setFill((f) => ({ ...f, onlyEmpty: c === true }))} />
                Only fill empty cells
              </label>
              <Button type="button" variant="outline" className="h-8 text-xs" disabled={!rows.length} onClick={applyFill}>
                Apply to {plural(rows.length, "row")}
              </Button>
            </div>
          </div>

          <div>
            <SectionTitle hint="Fields marked * are required.">Use cases to create</SectionTitle>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-xs">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className={cn(TH, "w-8 pl-2.5")} />
                      <th className={cn(TH, "w-[155px]")}>Subsidiary <span className="text-destructive">*</span></th>
                      <th className={cn(TH, "w-[175px]")}>Department</th>
                      <th className={cn(TH, "w-[165px]")}>Stakeholder</th>
                      <th className={cn(TH, "w-[175px]")}>Solution <span className="text-destructive">*</span></th>
                      <th className={cn(TH, "w-[150px]")}>Use case type</th>
                      <th className={cn(TH, "w-[130px]")}>Status <span className="text-destructive">*</span></th>
                      <th className={cn(TH, "w-[125px]")}>Launch date</th>
                      <th className={cn(TH, "w-[100px]")}>Check</th>
                      <th className={cn(TH, "w-[68px]")} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const c = checks[i];
                      return (
                        <tr key={r.key} id={`bulk-row-${r.key}`} className={cn("border-t align-middle", c.duplicate && !r.error && "bg-amber-50/60 dark:bg-amber-500/5")}>
                          <td className="py-1 pl-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                          <td className="px-1.5 py-1">
                            <Combobox options={subsidiaryOptions} value={r.subsidiary ? [r.subsidiary] : []} onChange={(v) => setRows((rs) => rs.map((x) => (x.key === r.key ? withSubsidiary(x, v[0] ?? "") : x)))} loading={subsidiaries.isLoading} invalid={bad(i, "subsidiary")} emptyText="No subsidiaries found for this customer" />
                          </td>
                          <td className="px-1.5 py-1">
                            <Combobox options={deptOptions(r.subsidiary)} value={r.department ? [r.department] : []} onChange={(v) => patch(r.key, { department: v[0] ?? "", stakeholder: "" })} disabled={!r.subsidiary} loading={deptLoading(r.subsidiary)} invalid={!!deptError(r.subsidiary)} placeholder={r.subsidiary ? "None" : "Pick a subsidiary"} emptyText={deptError(r.subsidiary)?.message ?? "No departments for this subsidiary"} />
                          </td>
                          <td className="px-1.5 py-1">
                            <Combobox options={stakeOptions(r.department)} value={r.stakeholder ? [r.stakeholder] : []} onChange={(v) => patch(r.key, { stakeholder: v[0] ?? "" })} disabled={!r.department} loading={stakeLoading(r.department)} placeholder={r.department ? "None" : "Pick a department"} emptyText="No stakeholders for this department" />
                          </td>
                          <td className="px-1.5 py-1">
                            <Combobox options={solutionOptions} value={r.solution ? [r.solution] : []} onChange={(v) => setRows((rs) => rs.map((x) => (x.key === r.key ? withSolution(x, v[0] ?? "") : x)))} loading={solutions.isLoading} invalid={bad(i, "solution")} />
                          </td>
                          <td className="px-1.5 py-1">
                            <Combobox options={typeOptions(r.solution)} value={r.useCaseType ? [r.useCaseType] : []} onChange={(v) => patch(r.key, { useCaseType: v[0] ?? "" })} disabled={!r.solution} loading={useCaseTypes.isLoading} placeholder={r.solution ? "None" : "Pick a solution"} emptyText="No use case types for this solution" />
                          </td>
                          <td className="px-1.5 py-1">
                            <Combobox options={statusOptions(r.solution)} value={r.status ? [r.status] : []} onChange={(v) => patch(r.key, { status: v[0] ?? "" })} disabled={!r.solution} loading={statuses.isLoading} invalid={bad(i, "status")} placeholder={r.solution ? "Select..." : "Pick a solution"} emptyText="No statuses for this solution" />
                          </td>
                          <td className="px-1.5 py-1">
                            <input type="date" value={r.launch} onChange={(e) => patch(r.key, { launch: e.target.value })} className={inputCls} aria-label={`Launch date, row ${i + 1}`} />
                          </td>
                          <td className="px-1.5 py-1">
                            {r.error ? (
                              <Pill tone="bad" title={r.error}><AlertTriangle /> Not saved</Pill>
                            ) : c.missing.length ? (
                              <Pill tone={touched ? "bad" : "neutral"} title={`Required: ${c.missing.join(", ")}`}>{touched && <AlertTriangle />} Incomplete</Pill>
                            ) : c.duplicate ? (
                              <Pill tone="warn" title={c.duplicate}><AlertTriangle /> Duplicate</Pill>
                            ) : (
                              <Pill tone="ok"><Check /> Ready</Pill>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-1 pr-2 text-right">
                            <button type="button" title="Duplicate row" aria-label={`Duplicate row ${i + 1}`} onClick={() => duplicateRow(r)} className="inline-flex h-6 w-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/15 dark:text-sky-300">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" title="Remove row" aria-label={`Remove row ${i + 1}`} onClick={() => removeRow(r.key)} className="inline-flex h-6 w-6 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-600/10 dark:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={10} className="border-t px-3 py-6 text-center text-muted-foreground">No rows yet. Add a row below.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t px-2.5 py-2">
                <Button type="button" variant="outline" className="h-8 gap-1 text-xs [&_svg]:size-3.5" onClick={addRow}>
                  <Plus /> Add row
                </Button>
                <Combobox className="w-[250px]" options={subsidiaryOptions} value={[]} onChange={(v) => v[0] && void addAllDepartments(v[0])} loading={subsidiaries.isLoading} placeholder="Add rows for every department in..." />
                <Button type="button" variant="ghost" className="h-8 gap-1 text-xs [&_svg]:size-3.5" onClick={() => setPasteOpen((o) => !o)}>
                  <ClipboardPaste /> Paste from Excel
                </Button>
              </div>
              {pasteOpen && (
                <div className="space-y-2 border-t bg-muted/30 px-2.5 py-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    One use case per line: subsidiary, department, stakeholder, separated by tabs or commas. Names are matched to the lists above; the department and stakeholder are optional.
                  </p>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className={cn(textareaCls, "font-mono")}
                    placeholder={"North America\tFinance\nEMEA\tProcurement\nAsia Pacific\tPatient Experience\tMei Tanaka"}
                  />
                  <div className="flex gap-2">
                    <Button type="button" className="h-7 text-xs" disabled={!pasteText.trim()} onClick={() => void addPasted()}>Add rows</Button>
                    <Button type="button" variant="ghost" className="h-7 text-xs" onClick={() => setPasteOpen(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-title/85">
                Details for every use case{" "}
                <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                  {many ? "Each copy keeps the content types, contributors, value and notes of its source." : "Applied to all rows, so you only enter them once."}
                </span>
              </p>
              {many && (
                <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Checkbox className="h-3.5 w-3.5" checked={shared.on} onCheckedChange={(c) => setShared((s) => ({ ...s, on: c === true }))} />
                  Replace on every copy
                </label>
              )}
            </div>
            {shared.on && (
              <div className="grid gap-3 px-2.5 pb-3 sm:grid-cols-2">
                <Field label="Content type" hint="(one or more)">
                  <Combobox multiple options={contentOptions} value={shared.contentTypes} onChange={(v) => setShared((s) => ({ ...s, contentTypes: v }))} loading={contentTypeList.isLoading} error={loadError(contentTypeList.error)} />
                </Field>
                <Field label="CSS contributor" hint="(one or more)">
                  <Combobox multiple options={personnelOptions} value={shared.personnel} onChange={(v) => setShared((s) => ({ ...s, personnel: v }))} loading={personnelList.isLoading} error={loadError(personnelList.error)} />
                </Field>
                <Field label="Value" className="sm:col-span-2">
                  <textarea value={shared.value} onChange={(e) => setShared((s) => ({ ...s, value: e.target.value }))} className={textareaCls} placeholder="Short value statement" />
                </Field>
                <Field label="Notes" className="sm:col-span-2">
                  <RichTextField value={shared.note} onChange={(html) => setShared((s) => ({ ...s, note: html }))} placeholder="Click to add notes..." />
                </Field>
              </div>
            )}
          </div>

          {failedCount > 0 && (
            <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              {plural(failedCount, "row")} could not be saved. Hover "Not saved" on a row to see why, then try again.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t bg-muted/40 px-6 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-title">{plural(rows.length, "use case")}</span>
            {ready > 0 && <Pill tone="ok">{ready} ready</Pill>}
            {duplicates > 0 && <Pill tone="warn">{plural(duplicates, "possible duplicate")}</Pill>}
            {incomplete > 0 && <Pill tone={touched ? "bad" : "neutral"}>{incomplete} incomplete</Pill>}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="h-8 text-xs" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button className="h-8 text-xs" disabled={busy || !rows.length} onClick={() => void submit()}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {busy ? `Creating ${progress + 1 > rows.length ? rows.length : progress + 1} of ${rows.length}...` : rows.length ? `Create ${plural(rows.length, "use case")}` : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
