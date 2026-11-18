import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/customers/Combobox";
import { Field, inputCls, textareaCls } from "@/components/customers/FormBits";
import { RichTextField } from "@/components/customers/RichTextField";
import { useSaveEvent } from "@/hooks/useParentActivity";
import { useEventTypes, usePersonnel, useSolutions, useSubsidiaries } from "@/hooks/useLookups";
import { detectKey, type Option } from "@/lib/lookups";
import { htmlToText, looksLikeHtml } from "@/lib/html";
import type { EventRow } from "@/lib/parentData";

const loadError = (e: unknown) => (e ? (e as Error).message : undefined);
const idList = (v: string[]) => (v.length ? v.join(",") : undefined);
const one = (v?: number) => (v == null ? [] : [String(v)]);
/** Value / notes can hold HTML from the old rich text control; the plain text boxes here show it as text. */
const plain = (v?: string) => (v && looksLikeHtml(v) ? htmlToText(v) : (v ?? ""));

/**
 * Dialog for adding an event under one of the selected customer's subsidiaries, or editing one (`row`). Mounted only
 * while open, so every open starts blank or from the row.
 */
export function EventForm({
  parentId,
  customerKeys,
  existing,
  row,
  onClose,
}: {
  parentId: number;
  /** Customer keys to find its subsidiaries by (the customer `id`, then its `parent_id`). */
  customerKeys: number[];
  /** Events already shown; used to work out which id column subsidiaries are keyed by, and to suggest stages. */
  existing: EventRow[];
  /**
   * When set the form opens filled in with this event, as an edit; "Save changes" posts the whole event with its `Id`
   * (the server replaces every field and the solution / contributor links, EVF-EDIT-002).
   */
  row?: EventRow;
  onClose: () => void;
}) {
  const save = useSaveEvent(parentId);
  const [subsidiary, setSubsidiary] = useState<string[]>(one(row?.subsidiary_id));
  const [solutionIds, setSolutionIds] = useState<string[]>(row?.solution_ids ?? []);
  const [eventType, setEventType] = useState<string[]>(one(row?.event_type_id));
  const [personnel, setPersonnel] = useState<string[]>(row?.css_contributor_ids ?? []);
  const [date, setDate] = useState(row?.event_date ? row.event_date.slice(0, 10) : "");
  const [stage, setStage] = useState(row?.stage ?? "");
  const [attendees, setAttendees] = useState(row?.attendee_count == null ? "" : String(row.attendee_count));
  const [duration, setDuration] = useState(row?.duration == null ? "" : String(row.duration));
  const [onsite, setOnsite] = useState(!!row?.onsite);
  const [virtual, setVirtual] = useState(!!row?.virtual);
  const [attendeeNames, setAttendeeNames] = useState(plain(row?.attendee_names));
  const [notes, setNotes] = useState(row?.meeting_notes ?? "");
  const [touched, setTouched] = useState(false);

  const subsidiaries = useSubsidiaries(customerKeys, true);
  const solutions = useSolutions(true);
  const eventTypes = useEventTypes(true);
  const personnelList = usePersonnel(true);

  const subKey = useMemo(
    () =>
      detectKey(
        existing.map((r) => ({ key: r.subsidiary_id, name: r.subsidiary_name })),
        (subsidiaries.data ?? []).map((s) => ({ id: s.id, alt: s.subsidiary_id, name: s.subsidiary_name })),
      ),
    [existing, subsidiaries.data],
  );
  const stageSuggestions = useMemo(() => [...new Set(existing.map((r) => r.stage).filter((s): s is string => !!s))], [existing]);

  const subsidiaryOptions: Option[] = (subsidiaries.data ?? [])
    .map((s) => ({ value: String(subKey === "alt" ? s.subsidiary_id : s.id), label: s.subsidiary_name ?? "(unnamed)" }))
    .filter((o) => o.value !== "undefined");
  const solutionOptions: Option[] = (solutions.data ?? []).map((s) => ({ value: String(s.id), label: s.solution_name ?? "(unnamed)" }));
  const eventTypeOptions: Option[] = (eventTypes.data ?? []).map((t) => ({ value: String(t.id), label: t.event_type }));
  const personnelOptions: Option[] = (personnelList.data ?? []).map((p) => ({ value: String(p.id), label: p.name ?? p.email }));

  const missing = { subsidiary: !subsidiary.length, eventType: !eventType.length, date: !date };
  const invalid = Object.values(missing).some(Boolean);
  const err = (k: keyof typeof missing) => (touched && missing[k] ? "Required" : undefined);
  const toNum = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    save.mutate(
      {
        // Editing keeps the row's own id; the subsidiary starts as the id the row is stored with (EVF-EDIT-002).
        Id: row?.id,
        SubsidiaryId: subsidiary[0],
        EventTypeId: Number(eventType[0]),
        EventDate: date,
        Stage: stage.trim() || undefined,
        AttendeeCount: toNum(attendees),
        Duration: toNum(duration),
        Onsite: onsite,
        Virtual: virtual,
        AttendeeNames: attendeeNames.trim() || undefined,
        MeetingNotes: notes.trim() ? notes : undefined,
        SolutionIds: idList(solutionIds),
        PersonnelIds: idList(personnel),
        Deleted: false,
      },
      {
        onSuccess: () => {
          toast.success(row ? "Event updated" : "Event added");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(95vw,max(50vw,560px))] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm text-title">{row ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription className="text-xs">Fields marked * are required.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Field label="Subsidiary" required>
            <Combobox
              options={subsidiaryOptions}
              value={subsidiary}
              onChange={setSubsidiary}
              loading={subsidiaries.isLoading}
              error={err("subsidiary") ?? loadError(subsidiaries.error)}
              emptyText="No subsidiaries found for this customer"
            />
          </Field>
          <Field label="Event type" required>
            <Combobox
              options={eventTypeOptions}
              value={eventType}
              onChange={setEventType}
              loading={eventTypes.isLoading}
              error={err("eventType") ?? loadError(eventTypes.error)}
            />
          </Field>
          <Field label="Event date" required>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            {err("date") && <p className="text-[11px] text-destructive">Required</p>}
          </Field>
          <Field label="Stage">
            <input list="event-stages" value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls} placeholder="e.g. Completed" />
            <datalist id="event-stages">
              {stageSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Solution" hint="(one or more)">
            <Combobox
              multiple
              options={solutionOptions}
              value={solutionIds}
              onChange={setSolutionIds}
              loading={solutions.isLoading}
              error={loadError(solutions.error)}
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
          <Field label="# of attendees">
            <input type="number" min={0} value={attendees} onChange={(e) => setAttendees(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Duration (min)">
            <input type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex items-center gap-5 text-xs">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={onsite} onChange={(e) => setOnsite(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /> Onsite
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={virtual} onChange={(e) => setVirtual(e.target.checked)} className="h-3.5 w-3.5 accent-primary" /> Virtual
            </label>
          </div>
          <Field label="Attendee names">
            <textarea value={attendeeNames} onChange={(e) => setAttendeeNames(e.target.value)} className={textareaCls} />
          </Field>
          <Field label="Meeting notes">
            <RichTextField value={notes} onChange={setNotes} placeholder="Click to add meeting notes..." />
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
            {row ? "Save changes" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
