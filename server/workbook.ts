/**
 * Local data source: serves ../data/code-app-data.xlsx to the app through /api/workbook/* on the Vite dev server.
 *
 * Every sheet of the workbook is one table (same names and columns as the old SQL tables). The sheets are held in memory,
 * changes are applied there and the whole workbook is then written back (temp file + rename), so a save either lands
 * completely or leaves the file untouched, e.g. when Excel has it open.
 *
 * Override the location with the WORKBOOK_PATH environment variable.
 */
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import ExcelJS from "exceljs";
import JSZip from "jszip";

type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;
type Sheet = { cols: string[]; rows: Row[] };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const MAX_CELL = 32000; // Excel's hard limit is 32,767 characters per cell
// eslint-disable-next-line no-control-regex -- the point is to strip control characters Excel cannot store
const ILLEGAL_XML = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;

/* ------------------------------------------------------------------------------------------- store */

class Store {
  sheets = new Map<string, Sheet>();
  readme: string[] = [];
  loaded = false;
  mtimeMs = 0;

  constructor(readonly file: string) {}

  /** (Re)reads the file when it has never been read or was changed on disk (e.g. edited and saved in Excel). */
  async fresh() {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(this.file);
    } catch {
      throw new HttpError(500, `Workbook not found: ${this.file}`);
    }
    if (!this.loaded || stat.mtimeMs !== this.mtimeMs) await this.load(stat.mtimeMs);
  }

  private async load(mtimeMs: number) {
    const zip = await JSZip.loadAsync(fs.readFileSync(this.file));
    // openpyxl writes absolute part names for tables; ExcelJS only understands relative ones.
    for (const name of Object.keys(zip.files)) {
      if (!/^xl\/worksheets\/_rels\/.+\.rels$/.test(name)) continue;
      const xml = await zip.file(name)!.async("string");
      zip.file(name, xml.replace(/Target="\/xl\/tables\//g, 'Target="../tables/'));
    }
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await zip.generateAsync({ type: "nodebuffer" })) as unknown as ExcelJS.Buffer);

    this.sheets.clear();
    this.readme = [];
    wb.eachSheet((ws) => {
      if (ws.name === "README") {
        ws.eachRow((r) => this.readme.push(String(norm(r.getCell(1).value) ?? "")));
        return;
      }
      const cols: string[] = [];
      ws.getRow(1).eachCell({ includeEmpty: false }, (c, n) => (cols[n - 1] = String(norm(c.value) ?? "")));
      const rows: Row[] = [];
      ws.eachRow((r, n) => {
        if (n === 1) return;
        const row: Row = {};
        let any = false;
        cols.forEach((c, i) => {
          const v = norm(r.getCell(i + 1).value);
          row[c] = v;
          if (v !== null) any = true;
        });
        if (any) rows.push(row);
      });
      this.sheets.set(ws.name, { cols, rows });
    });
    this.loaded = true;
    this.mtimeMs = mtimeMs;
  }

  /** Writes every sheet back as an Excel table. Throws a 423 when the file is locked (open in Excel). */
  async save() {
    const out = new ExcelJS.Workbook();
    const readme = out.addWorksheet("README");
    this.readme.forEach((line, i) => {
      readme.addRow([line]);
      if (i === 0) readme.getRow(1).font = { bold: true, size: 14 };
    });
    readme.getColumn(1).width = 120;

    for (const [name, { cols, rows }] of this.sheets) {
      const ws = out.addWorksheet(name);
      const data = rows.length ? rows.map((r) => cols.map((c) => clean(r[c]))) : [cols.map(() => null)];
      ws.addTable({
        name,
        ref: "A1",
        headerRow: true,
        totalsRow: false,
        style: { theme: "TableStyleMedium2", showRowStripes: true },
        columns: cols.map((c) => ({ name: c, filterButton: true })),
        rows: data,
      });
      cols.forEach((c, i) => {
        const longest = Math.max(c.length, ...rows.slice(0, 300).map((r) => String(r[c] ?? "").length));
        ws.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 8), 48);
      });
      ws.views = [{ state: "frozen", ySplit: 1 }];
    }

    const buffer = Buffer.from(await out.xlsx.writeBuffer());
    const tmp = path.join(path.dirname(this.file), `~tmp-${path.basename(this.file)}`);
    try {
      fs.writeFileSync(tmp, buffer);
      fs.renameSync(tmp, this.file);
    } catch (e) {
      fs.rmSync(tmp, { force: true });
      this.loaded = false; // memory may now be ahead of the file: re-read it next time
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
        throw new HttpError(423, `Could not save: ${path.basename(this.file)} is open in Excel. Close it and try again.`);
      }
      throw e;
    }
    this.mtimeMs = fs.statSync(this.file).mtimeMs;
  }

  table(name: string): Sheet {
    const s = this.sheets.get(name);
    if (!s) throw new HttpError(404, `The workbook has no "${name}" sheet.`);
    return s;
  }
}

function norm(v: unknown): Cell {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 19);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return norm(o.result);
    if (Array.isArray(o.richText)) return norm((o.richText as { text: string }[]).map((t) => t.text).join(""));
    if ("text" in o) return norm(o.text);
    return String(v);
  }
  if (typeof v === "string") return v === "" ? null : v;
  return v as Cell;
}

function clean(v: Cell | undefined): Cell {
  if (typeof v !== "string") return v ?? null;
  const s = v.replace(ILLEGAL_XML, "");
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL) : s;
}

/* ------------------------------------------------------------------------------------------- helpers */

const num = (v: unknown): number | null => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const text = (v: unknown): string | null => (v == null || String(v).trim() === "" ? null : String(v));
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : v == null ? fallback : v === "true" || v === 1);
const ids = (v: unknown): number[] => [...new Set(String(v ?? "").split(/[\s,;|]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
const nextId = (rows: Row[], col = "id") => rows.reduce((m, r) => Math.max(m, Number(r[col]) || 0), 0) + 1;
const now = () => new Date().toISOString().slice(0, 19);
const live = (r: Row) => r.deleted !== true;
const byId = (rows: Row[], key = "id") => new Map(rows.map((r) => [r[key], r]));
const names = (xs: (Cell | undefined)[]) => xs.filter((x): x is string => typeof x === "string" && x !== "");

function group(rows: Row[], key: string, value: string) {
  const out = new Map<Cell, Cell[]>();
  for (const r of rows) out.set(r[key], [...(out.get(r[key]) ?? []), r[value]]);
  return out;
}

function required(body: Record<string, unknown>, ...keys: string[]) {
  const missing = keys.filter((k) => body[k] == null || body[k] === "");
  if (missing.length) throw new HttpError(400, `Missing: ${missing.join(", ")}`);
}

/* ------------------------------------------------------------------------------------------- queries */

function useCasesByParent(s: Store, parentId: number) {
  const t = (n: string) => s.table(n).rows;
  const solution = byId(t("solution"));
  const department = byId(t("department"));
  const subsidiary = byId(t("subsidiary"));
  const stakeholder = byId(t("stakeholder"));
  const status = byId(t("status"));
  const type = byId(t("use_case_type"));
  const customer = byId(t("customer"));
  const people = byId(t("personnel"));
  const content = byId(t("content_type"));
  const personnelOf = group(t("use_case_personnel"), "use_case_id", "personnel_id");
  const contentOf = group(t("use_case_content_type"), "use_case_id", "content_type_id");

  return t("use_case")
    .filter((r) => live(r) && r.parent_id === parentId)
    .map((r): Record<string, unknown> => {
      const sol = solution.get(r.solution_id);
      const dep = department.get(r.department_id);
      const stk = stakeholder.get(r.stakeholder_id);
      const pIds = personnelOf.get(r.id) ?? [];
      const cIds = contentOf.get(r.id) ?? [];
      return {
        ...r,
        solution_name: sol?.solution_name ?? null,
        metric_type: sol?.metric_type ?? null,
        solution_premium_credit: sol?.premium_credit ?? null,
        department_name: dep?.department_name ?? null,
        department_type: dep?.department_type ?? null,
        subsidiary_name: subsidiary.get(r.subsidiary_id)?.subsidiary_name ?? null,
        parent_name: customer.get(r.parent_id)?.parent_name ?? null,
        stakeholder_name: stk?.stakeholder_name ?? null,
        stakeholder_title: stk?.stakeholder_title ?? null,
        status: status.get(r.status_id)?.status ?? null,
        use_case_type: type.get(r.use_case_type_id)?.use_case_type ?? null,
        personnel_ids: pIds.join(",") || null,
        personnel_names: names(pIds.map((i) => people.get(i)?.name)).join(", ") || null,
        content_type_ids: cIds.join(",") || null,
        content_type_names: names(cIds.map((i) => content.get(i)?.content_type)).join(", ") || null,
      };
    })
    .sort((a, b) => String(b.last_modified ?? "").localeCompare(String(a.last_modified ?? "")) || Number(b.id) - Number(a.id));
}

function eventsByParent(s: Store, parentId: number) {
  const t = (n: string) => s.table(n).rows;
  const subsidiary = byId(t("subsidiary"));
  const type = byId(t("event_type"));
  const people = byId(t("personnel"));
  const solution = byId(t("solution"));
  const personnelOf = group(t("event_personnel"), "event_id", "personnel_id");
  const solutionOf = group(t("event_solution"), "event_id", "solution_id");

  return t("event")
    .filter((r) => live(r) && subsidiary.get(r.subsidiary_id)?.parent_id === parentId)
    .map((r): Record<string, unknown> => {
      const pIds = personnelOf.get(r.id) ?? [];
      const sIds = solutionOf.get(r.id) ?? [];
      return {
        ...r,
        event_type: type.get(r.event_type_id)?.event_type ?? null,
        subsidiary_name: subsidiary.get(r.subsidiary_id)?.subsidiary_name ?? null,
        css_contributors: names(pIds.map((i) => people.get(i)?.name)).join(", ") || null,
        solution_names: names(sIds.map((i) => solution.get(i)?.solution_name)).join(", ") || null,
        css_contributor_ids: pIds.map(String),
        solution_ids: sIds.map(String),
      };
    })
    .sort((a, b) => String(b.event_date ?? "").localeCompare(String(a.event_date ?? "")));
}

/** Every solution -> its allowed statuses (what usp_getSolutionStatuses returned). */
function solutionStatuses(s: Store) {
  const solution = byId(s.table("solution").rows);
  const status = byId(s.table("status").rows);
  return s.table("solution_status").rows.map((r) => ({
    ...r,
    solution_name: solution.get(r.solution_id)?.solution_name ?? null,
    status: status.get(r.status_id)?.status ?? null,
  }));
}

/** Every solution -> its allowed use case types (what usp_GetSolutionUseCaseTypes returned). */
function solutionUseCaseTypes(s: Store) {
  const solution = byId(s.table("solution").rows);
  const type = byId(s.table("use_case_type").rows);
  return s.table("solution_use_case_type").rows.map((r) => ({
    ...r,
    solution_name: solution.get(r.solution_id)?.solution_name ?? null,
    use_case_type: type.get(r.use_case_type_id)?.use_case_type ?? null,
  }));
}

/* ------------------------------------------------------------------------------------------- changes */

/** Replaces the link rows of one parent record (e.g. the personnel of a use case). */
function relink(s: Store, table: string, parentCol: string, parentId: number, otherCol: string, otherIds: number[], idCol = "id") {
  const sheet = s.table(table);
  sheet.rows = sheet.rows.filter((r) => r[parentCol] !== parentId);
  let id = nextId(sheet.rows, idCol);
  for (const o of otherIds) sheet.rows.push({ [idCol]: id++, [parentCol]: parentId, [otherCol]: o });
}

/** Insert a use case, or update it when `id` is given; also replaces its personnel / content type links. */
function saveUseCase(s: Store, body: Record<string, unknown>) {
  required(body, "parent_id", "solution_id", "status_id", "subsidiary_id");
  const sheet = s.table("use_case");
  const given = num(body.id);
  let row = given == null ? undefined : sheet.rows.find((r) => r.id === given);
  if (given != null && !row) throw new HttpError(404, `Use case ${given} was not found.`);

  const fields: Row = {
    parent_id: num(body.parent_id),
    subsidiary_id: num(body.subsidiary_id),
    department_id: num(body.department_id),
    stakeholder_id: num(body.stakeholder_id),
    solution_id: num(body.solution_id),
    status_id: num(body.status_id),
    use_case_type_id: num(body.use_case_type_id),
    target_users: num(body.target_users),
    target_credits_consumed: num(body.target_credits_consumed),
    target_api_calls: num(body.target_api_calls),
    expected_launch_date: text(body.expected_launch_date),
    note: text(body.note),
    value_snippet: text(body.value_snippet),
    premium_credit: bool(body.premium_credit),
    deleted: bool(body.deleted),
    last_modified: now(),
  };
  const previousStatus = row?.status_id ?? null;
  if (!row) {
    const id = nextId(sheet.rows);
    row = Object.fromEntries(sheet.cols.map((c) => [c, null])) as Row;
    Object.assign(row, { id, use_case_id: id, created: now() });
    sheet.rows.push(row);
  }
  Object.assign(row, fields);
  const id = row.id as number;

  relink(s, "use_case_personnel", "use_case_id", id, "personnel_id", ids(body.personnel_ids));
  relink(s, "use_case_content_type", "use_case_id", id, "content_type_id", ids(body.content_type_ids));
  if (previousStatus !== fields.status_id) {
    const h = s.sheets.get("use_case_status_history");
    if (h) h.rows.push({ id: nextId(h.rows), use_case_id: id, status_id: fields.status_id, previous_status_id: previousStatus, change_datetime: now() });
  }
  return id;
}

/** Insert an event, or update it when `Id` is given; also replaces its contributor / solution links. */
function saveEvent(s: Store, body: Record<string, unknown>) {
  required(body, "SubsidiaryId", "EventTypeId", "EventDate");
  const sheet = s.table("event");
  const given = num(body.Id);
  let row = given == null ? undefined : sheet.rows.find((r) => r.id === given);
  if (given != null && !row) throw new HttpError(404, `Event ${given} was not found.`);

  const fields: Row = {
    subsidiary_id: num(body.SubsidiaryId),
    event_type_id: num(body.EventTypeId),
    event_date: text(body.EventDate)?.slice(0, 10) ?? null,
    stage: text(body.Stage),
    attendee_count: num(body.AttendeeCount),
    attendee_names: text(body.AttendeeNames),
    meeting_notes: text(body.MeetingNotes),
    duration: num(body.Duration),
    onsite: bool(body.Onsite),
    virtual: bool(body.Virtual),
    deleted: bool(body.Deleted),
    last_modified: now(),
  };
  if (!row) {
    const id = nextId(sheet.rows);
    row = Object.fromEntries(sheet.cols.map((c) => [c, null])) as Row;
    Object.assign(row, { id, event_id: id, created: now() });
    sheet.rows.push(row);
  }
  Object.assign(row, fields);
  const id = row.id as number;

  relink(s, "event_personnel", "event_id", id, "personnel_id", ids(body.PersonnelIds), "event_personnel_id");
  relink(s, "event_solution", "event_id", id, "solution_id", ids(body.SolutionIds), "event_solution_id");
  return id;
}

/** Stores a customer's executive summary (blank → null) and stamps `summary_last_modified` (API-SUMM-001). */
function saveSummary(s: Store, id: number, body: Record<string, unknown>) {
  const row = s.table("customer").rows.find((r) => r.id === id);
  if (!row) throw new HttpError(404, `Customer ${id} was not found.`);
  row.executive_summary = text(body.executive_summary);
  row.summary_last_modified = now();
  return { id, summary_last_modified: row.summary_last_modified };
}

/** Soft delete, the way the old app did it: the row stays, `deleted` becomes true, and the read queries leave it out. */
function softDelete(s: Store, table: "use_case" | "event", id: number) {
  const row = s.table(table).rows.find((r) => r.id === id);
  const label = table === "event" ? "event" : "use case";
  if (!row) throw new HttpError(404, `This ${label} could not be found.`);
  if (row.deleted === true) throw new HttpError(409, `This ${label} was already deleted.`);
  row.deleted = true;
  row.last_modified = now();
}

/* ------------------------------------------------------------------------------------------- http */

function filterRows(rows: Row[], params: URLSearchParams) {
  let out = rows;
  for (const w of params.getAll("where")) {
    const i = w.indexOf(":");
    const col = w.slice(0, i);
    const val = w.slice(i + 1);
    out = out.filter((r) => String(r[col] ?? "") === val);
  }
  const order = params.get("orderBy");
  if (order) out = [...out].sort((a, b) => String(a[order] ?? "").localeCompare(String(b[order] ?? ""), undefined, { sensitivity: "base" }));
  return out;
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
}

export function workbookPlugin(defaultFile: string): Plugin {
  const store = new Store(path.resolve(process.env.WORKBOOK_PATH ?? defaultFile));

  // One request at a time: reads wait for a save in progress and saves never interleave.
  let queue: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  };

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://local");
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const method = req.method ?? "GET";
    const parent = () => {
      const p = num(url.searchParams.get("parentId"));
      if (p == null) throw new HttpError(400, "parentId is required.");
      return p;
    };

    try {
      const result = await exclusive(async () => {
        await store.fresh();
        if (method === "GET" && parts[0] === "table" && parts[1]) {
          return filterRows(store.table(parts[1]).rows, url.searchParams);
        }
        if (method === "GET" && parts[0] === "use-cases") return useCasesByParent(store, parent());
        if (method === "GET" && parts[0] === "events") return eventsByParent(store, parent());
        if (method === "GET" && parts[0] === "solution-statuses") return solutionStatuses(store);
        if (method === "GET" && parts[0] === "solution-use-case-types") return solutionUseCaseTypes(store);
        if (method === "GET" && parts[0] === "health") return { file: store.file, tables: [...store.sheets.keys()] };

        const mutate = async (change: () => unknown) => {
          const out = change();
          await store.save();
          return out;
        };
        if (method === "POST" && parts[0] === "use-cases" && !parts[1]) {
          const body = await readBody(req);
          return mutate(() => ({ id: saveUseCase(store, body) }));
        }
        if (method === "POST" && parts[0] === "events" && !parts[1]) {
          const body = await readBody(req);
          return mutate(() => ({ id: saveEvent(store, body) }));
        }
        if (method === "POST" && parts[0] === "customers" && num(parts[1]) != null && parts[2] === "summary" && !parts[3]) {
          const body = await readBody(req);
          return mutate(() => saveSummary(store, Number(parts[1]), body));
        }
        if (method === "DELETE" && (parts[0] === "use-cases" || parts[0] === "events") && num(parts[1]) != null) {
          return mutate(() => (softDelete(store, parts[0] === "events" ? "event" : "use_case", Number(parts[1])), { ok: true }));
        }
        throw new HttpError(404, `Unknown workbook request: ${method} ${url.pathname}`);
      });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch (e) {
      // Memory may hold half-applied changes after a failure: drop it and re-read the file on the next request.
      if (method !== "GET") store.loaded = false;
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error("[workbook]", e);
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
    }
  };

  // Must return nothing: Vite treats a function returned from configureServer as a post-middleware hook.
  const attach = (server: { middlewares: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse) => void) => unknown } }): void => {
    server.middlewares.use("/api/workbook", (req, res) => void handle(req, res));
  };

  return {
    name: "local-workbook",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
