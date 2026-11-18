import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/customers/Combobox";
import { Field, inputCls, textareaCls } from "@/components/customers/FormBits";
import { RichTextField } from "@/components/customers/RichTextField";
import { useSaveUseCase } from "@/hooks/useParentActivity";
import {
  useContentTypes,
  useDepartments,
  usePersonnel,
  useSolutions,
  useSolutionStatuses,
  useSolutionUseCaseTypes,
  useStakeholders,
  useSubsidiaries,
} from "@/hooks/useLookups";
import { detectKey, type Option } from "@/lib/lookups";
import { htmlToText, looksLikeHtml } from "@/lib/html";
import type { UseCaseRow } from "@/lib/parentData";

const loadError = (e: unknown) => (e ? (e as Error).message : undefined);
export const num = (v: string[]) => (v[0] ? Number(v[0]) : undefined);
export const idList = (v: string[]) => (v.length ? v.join(",") : undefined);
/** Row id columns that hold several ids as one delimited string -> list of ids. */
export const splitIds = (v?: string) => (v ? v.split(/[\s,;|]+/).filter(Boolean) : []);
const one = (v?: number) => (v == null ? [] : [String(v)]);
/** Value / notes can hold HTML from the old rich text control; the plain text boxes here show it as text. */
export const plain =(v?: string) => (v && looksLikeHtml(v) ? htmlToText(v) : (v ?? ""));

/** Dialog for adding a use case to the selected customer, or editing one. Mounted only while open, so every open starts afresh. */
export function UseCaseForm({
  parentId,
  customerKeys,
  existing,
  row,
  onClose,
}: {
  parentId: number;
  /** Customer keys to find its subsidiaries by (the customer `id`, then its `parent_id`). */
  customerKeys: number[];
  /** Use cases already shown; used to work out which id column the lookups are keyed by. */
  existing: UseCaseRow[];
  /** When set the form opens filled in with this use case, as an edit, and saving updates that use case (by its `id`). */
  row?: UseCaseRow;
  onClose: () => void;
}) {
  const save = useSaveUseCase(parentId);
  const [subsidiary, setSubsidiary] = useState<string[]>(one(row?.subsidiary_id));
  const [department, setDepartment] = useState<string[]>(one(row?.department_id));
  const [stakeholder, setStakeholder] = useState<string[]>(one(row?.stakeholder_id));
  const [solution, setSolution] = useState<string[]>(one(row?.solution_id));
  const [useCaseType, setUseCaseType] = useState<string[]>(one(row?.use_case_type_id));
  const [status, setStatus] = useState<string[]>(one(row?.status_id));
  const [contentTypes, setContentTypes] = useState<string[]>(splitIds(row?.content_type_ids));
  const [personnel, setPersonnel] = useState<string[]>(splitIds(row?.personnel_ids));
  const [launch, setLaunch] = useState(row?.expected_launch_date ? row.expected_launch_date.slice(0, 10) : "");
  const [value, setValue] = useState(plain(row?.value_snippet));
  const [note, setNote] = useState(row?.note ?? "");
  const [touched, setTouched] = useState(false);

  const subsidiaries = useSubsidiaries(customerKeys, true);
  const departments = useDepartments(num(subsidiary) ?? null);
  const stakeholders = useStakeholders(num(department) ?? null);
  const solutions = useSolutions(true);
  const useCaseTypes = useSolutionUseCaseTypes(true);
  const statuses = useSolutionStatuses(true);
  const contentTypeList = useContentTypes(true);
  const personnelList = usePersonnel(true);

  const subKey = useMemo(
    () =>
      detectKey(
        existing.map((r) => ({ key: r.subsidiary_id, name: r.subsidiary_name })),
        (subsidiaries.data ?? []).map((s) => ({ id: s.id, alt: s.subsidiary_id, name: s.subsidiary_name })),
      ),
    [existing, subsidiaries.data],
  );
  const deptKey = useMemo(
    () =>
      detectKey(
        existing.map((r) => ({ key: r.department_id, name: r.department_name })),
        (departments.data ?? []).map((d) => ({ id: d.id, alt: d.department_id, name: d.department_name })),
      ),
    [existing, departments.data],
  );

  const subsidiaryOptions: Option[] = (subsidiaries.data ?? [])
    .map((s) => ({ value: String(subKey === "alt" ? s.subsidiary_id : s.id), label: s.subsidiary_name ?? "(unnamed)" }))
    .filter((o) => o.value !== "undefined");
  const departmentOptions: Option[] = (departments.data ?? [])
    .map((d) => ({
      value: String(deptKey === "alt" ? d.department_id : d.id),
      label: [d.department_name, d.department_type && `(${d.department_type})`].filter(Boolean).join(" ") || "(unnamed)",
    }))
    .filter((o) => o.value !== "undefined");
  const stakeholderOptions: Option[] = (stakeholders.data ?? []).map((s) => ({
    value: String(s.id),
    label: [s.stakeholder_name, s.stakeholder_title && `- ${s.stakeholder_title}`].filter(Boolean).join(" "),
  }));
  const solutionOptions: Option[] = (solutions.data ?? []).map((s) => ({ value: String(s.id), label: s.solution_name ?? "(unnamed)" }));
  const typeOptions: Option[] = (useCaseTypes.data ?? [])
    .filter((t) => String(t.solution_id) === solution[0])
    .map((t) => ({ value: String(t.use_case_type_id), label: t.use_case_type ?? "(unnamed)" }));
  const statusOptions: Option[] = (statuses.data ?? [])
    .filter((s) => String(s.solution_id) === solution[0])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({ value: String(s.status_id), label: s.status ?? "(unnamed)" }));
  const contentOptions: Option[] = (contentTypeList.data ?? []).map((c) => ({ value: String(c.id), label: c.content_type ?? "(unnamed)" }));
  const personnelOptions: Option[] = (personnelList.data ?? []).map((p) => ({ value: String(p.id), label: p.name ?? p.email }));

  const missing = {
    subsidiary: !subsidiary.length,
    solution: !solution.length,
    status: !status.length,
  };
  const invalid = Object.values(missing).some(Boolean);
  const err = (k: keyof typeof missing) => (touched && missing[k] ? "Required" : undefined);

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    const sol = (solutions.data ?? []).find((s) => String(s.id) === solution[0]);
    save.mutate(
      {
        // Editing: the API replaces the whole row, so send its id and the target fields this form does not show
        // (UCF-EDIT-002, UCF-EDIT-004).
        ...(row && {
          id: row.id,
          target_users: row.target_users,
          target_credits_consumed: row.target_credits_consumed,
          target_api_calls: row.target_api_calls,
        }),
        parent_id: parentId,
        subsidiary_id: num(subsidiary),
        department_id: num(department),
        stakeholder_id: num(stakeholder),
        solution_id: num(solution),
        use_case_type_id: num(useCaseType),
        status_id: num(status),
        expected_launch_date: launch || undefined,
        content_type_ids: idList(contentTypes),
        personnel_ids: idList(personnel),
        value_snippet: value.trim() || undefined,
        note: note.trim() ? note : undefined,
        // From the chosen solution when its flag is known. When it is not (lookup loading or failed, solution not in the
        // list, or a blank cell), an edit keeps the row's stored flag and an add sends false.
        premium_credit: sol?.premium_credit ?? row?.premium_credit ?? false,
        deleted: false,
      },
      {
        onSuccess: () => {
          toast.success(row ? "Use case updated" : "Use case added");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(95vw,max(50vw,560px))] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm text-title">{row ? "Edit use case" : "Add use case"}</DialogTitle>
          <DialogDescription className="text-xs">Fields marked * are required.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Subsidiary" required>
            <Combobox
              options={subsidiaryOptions}
              value={subsidiary}
              onChange={(v) => {
                setSubsidiary(v);
                setDepartment([]);
                setStakeholder([]);
              }}
              loading={subsidiaries.isLoading}
              error={err("subsidiary") ?? loadError(subsidiaries.error)}
              emptyText="No subsidiaries found for this customer"
            />
          </Field>
          <Field label="Department">
            <Combobox
              options={departmentOptions}
              value={department}
              onChange={(v) => {
                setDepartment(v);
                setStakeholder([]);
              }}
              disabled={!subsidiary.length}
              loading={departments.isLoading}
              error={loadError(departments.error)}
              placeholder={subsidiary.length ? "Select..." : "Choose a subsidiary first"}
              emptyText="No departments for this subsidiary"
            />
          </Field>
          <Field label="Stakeholder">
            <Combobox
              options={stakeholderOptions}
              value={stakeholder}
              onChange={setStakeholder}
              disabled={!department.length}
              loading={stakeholders.isLoading}
              error={loadError(stakeholders.error)}
              placeholder={department.length ? "Select..." : "Choose a department first"}
              emptyText="No stakeholders for this department"
            />
          </Field>
          <Field label="Solution" required>
            <Combobox
              options={solutionOptions}
              value={solution}
              onChange={(v) => {
                setSolution(v);
                setUseCaseType([]);
                setStatus([]);
              }}
              loading={solutions.isLoading}
              error={err("solution") ?? loadError(solutions.error)}
            />
          </Field>
          <Field label="Use case type">
            <Combobox
              options={typeOptions}
              value={useCaseType}
              onChange={setUseCaseType}
              disabled={!solution.length}
              loading={useCaseTypes.isLoading}
              error={loadError(useCaseTypes.error)}
              placeholder={solution.length ? "Select..." : "Choose a solution first"}
              emptyText="No use case types for this solution"
            />
          </Field>
          <Field label="Status" required>
            <Combobox
              options={statusOptions}
              value={status}
              onChange={setStatus}
              disabled={!solution.length}
              loading={statuses.isLoading}
              error={err("status") ?? loadError(statuses.error)}
              placeholder={solution.length ? "Select..." : "Choose a solution first"}
              emptyText="No statuses for this solution"
            />
          </Field>
          <Field label="Content type" hint="(one or more)">
            <Combobox
              multiple
              options={contentOptions}
              value={contentTypes}
              onChange={setContentTypes}
              loading={contentTypeList.isLoading}
              error={loadError(contentTypeList.error)}
            />
          </Field>
          <Field label="CSS contributor" hint="(one or more)">
            <Combobox
              multiple
              options={personnelOptions}
              value={personnel}
              onChange={setPersonnel}
              loading={personnelList.isLoading}
              error={loadError(personnelList.error)}
            />
          </Field>
          <Field label="Launch date">
            <input type="date" value={launch} onChange={(e) => setLaunch(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Value">
            <textarea value={value} onChange={(e) => setValue(e.target.value)} className={textareaCls} placeholder="Short value statement" />
          </Field>
          <Field label="Notes">
            <RichTextField value={note} onChange={setNote} placeholder="Click to add notes..." />
          </Field>
        </div>

        {save.error && (
          <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">Could not save: {save.error.message}</p>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-8 text-xs" disabled={save.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-8 text-xs" disabled={save.isPending} onClick={submit}>
            {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {row ? "Save changes" : "Add use case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
