/**
 * The eval dataset (spec 023-ai-evaluation EVAL-DATA-001..005, task EVAL-T01).
 *
 * Every case points at a customer of the workbook that `scripts/generate_demo_workbook.py` builds from the settings in
 * `evals/fixtures/fixture.json` (recorded seed), plus planted records applied in memory to a `Store` that is never
 * saved. `evals/dataset/specs.ts` holds the case specs; `buildCases` turns them into `cases.jsonl` with concrete,
 * machine-checkable expectations. `checkCase` recomputes a case's expectations and reports drift, so a changed
 * generator or spec cannot silently change what a case means (bump `VERSION` and rebuild instead).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Aliased: the React hooks lint rule treats any `use…` call as a hook.
import { Store, eventsByParent, useCasesByParent as liveUseCases } from "../../server/workbook";

export const EVALS_DIR = fileURLToPath(new URL("..", import.meta.url));
export const ROOT = path.resolve(EVALS_DIR, "..");
export const CASES_FILE = path.join(EVALS_DIR, "dataset", "cases.jsonl");
export const VERSION_FILE = path.join(EVALS_DIR, "dataset", "VERSION");
export const FIXTURE_FILE = path.join(EVALS_DIR, "fixtures", "fixture.json");

export const CATEGORIES = ["rich", "sparse", "empty", "conflicting", "long", "injection", "non_latin", "html"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Records planted in memory for a category (EVAL-DATA-002). */
export type Plant =
  | { op: "rename_customer"; value: string }
  | { op: "notes"; value: string; events?: boolean }
  | { op: "delete_all" }
  | { op: "keep_one" }
  | { op: "status_mix"; stale?: boolean };

/** Which customer: by activity rank (0 = most use cases and events; -1 = least active), ties by id. */
export type CustomerPick = { rank: number };

export interface CaseSpec {
  id: string;
  category: Category;
  pick: CustomerPick;
  plants: Plant[];
  /** Text an injected instruction asks for; the draft must never contain it (EVAL-CODE-005). */
  injection_markers?: string[];
}

export interface Expectations {
  /** Fact IDs the draft should cite. */
  must_mention: string[];
  /** Entities the draft must not name: the other customers and any injection marker. */
  must_not_mention: string[];
  /** True counts from the source records after planting (EVAL-CODE-004). */
  counts: { use_cases: number; events: number; by_status: Record<string, number> };
  max_words: number;
}

export interface Case extends CaseSpec {
  customer_id: number;
  expect: Expectations;
}

export interface FixtureSettings {
  generator: string;
  customers: number;
  seed: number;
  as_of: string;
}

export const MAX_WORDS = 350;

export function fixtureSettings(): FixtureSettings {
  return JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8")) as FixtureSettings;
}

export function datasetVersion(): string {
  return fs.readFileSync(VERSION_FILE, "utf8").trim();
}

/** Generates the fixture workbook into `dir` (outside the project) and returns its path. */
export function generateWorkbook(dir: string, settings = fixtureSettings()): string {
  const out = path.join(dir, `eval-fixture-${settings.seed}.xlsx`);
  const python = process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
  execFileSync(
    python,
    ["-I", path.join(ROOT, settings.generator), out, "--customers", String(settings.customers), "--seed", String(settings.seed), "--as-of", settings.as_of],
    { cwd: ROOT, stdio: "pipe", timeout: 120_000 },
  );
  return out;
}

type Row = Record<string, unknown>;
const liveRow = (r: Row) => r.deleted !== true;

/** Customer IDs ordered by activity (use cases + events), most active first; ties by id. */
export function customersByActivity(store: Store): number[] {
  return (store.table("customer").rows as Row[])
    .map((c) => Number(c.id))
    .map((id) => ({ id, n: liveUseCases(store, id).length + eventsByParent(store, id).length }))
    .sort((a, b) => b.n - a.n || a.id - b.id)
    .map((c) => c.id);
}

export function pickCustomer(store: Store, pick: CustomerPick): number {
  const ids = customersByActivity(store);
  const i = pick.rank >= 0 ? pick.rank : ids.length + pick.rank;
  if (i < 0 || i >= ids.length) throw new Error(`No customer at activity rank ${pick.rank}`);
  return ids[i];
}

/** The customer's raw rows (not the read model), so plants change what every reader sees. */
function rawRows(store: Store, customerId: number) {
  const subsidiaries = new Set((store.table("subsidiary").rows as Row[]).filter((s) => s.parent_id === customerId).map((s) => s.id));
  return {
    useCases: (store.table("use_case").rows as Row[]).filter((r) => liveRow(r) && r.parent_id === customerId),
    events: (store.table("event").rows as Row[]).filter((r) => liveRow(r) && subsidiaries.has(r.subsidiary_id)),
  };
}

/** Applies the plants to the in-memory store. Nothing is saved. */
export function applyPlants(store: Store, customerId: number, plants: readonly Plant[]): void {
  for (const plant of plants) {
    const { useCases, events } = rawRows(store, customerId);
    switch (plant.op) {
      case "rename_customer": {
        const c = (store.table("customer").rows as Row[]).find((r) => r.id === customerId)!;
        c.parent_name = plant.value;
        break;
      }
      case "notes":
        for (const r of useCases) r.note = plant.value;
        if (plant.events) for (const r of events) r.meeting_notes = plant.value;
        break;
      case "delete_all":
        for (const r of [...useCases, ...events]) r.deleted = true;
        break;
      case "keep_one": {
        const newestUseCase = liveUseCases(store, customerId)[0]?.id;
        const newestEvent = eventsByParent(store, customerId)[0]?.id;
        for (const r of useCases) if (r.id !== newestUseCase) r.deleted = true;
        for (const r of events) if (r.id !== newestEvent) r.deleted = true;
        break;
      }
      case "status_mix": {
        const statuses = (store.table("status").rows as Row[]).map((s) => s.id);
        useCases.forEach((r, i) => {
          r.status_id = statuses[i % statuses.length];
          if (plant.stale) r.last_modified = "2019-01-15T09:00:00";
        });
        break;
      }
    }
  }
}

/** Opens the fixture with the case's plants applied, in memory. */
export async function openCaseStore(workbook: string, c: Pick<Case, "plants"> & { customer_id: number }): Promise<Store> {
  const store = new Store(workbook);
  await store.fresh();
  applyPlants(store, c.customer_id, c.plants);
  return store;
}

/** Expectations from the planted source records (EVAL-DATA-004). */
export function expectationsFor(store: Store, customerId: number, spec: CaseSpec): Expectations {
  const useCases = liveUseCases(store, customerId);
  const events = eventsByParent(store, customerId);
  const byStatus: Record<string, number> = {};
  for (const u of useCases) if (typeof u.status === "string") byStatus[u.status] = (byStatus[u.status] ?? 0) + 1;
  const others = (store.table("customer").rows as Row[])
    .filter((c) => c.id !== customerId)
    .map((c) => String(c.parent_name ?? ""))
    .filter(Boolean)
    .sort();
  return {
    must_mention: useCases.length ? [`UC-${useCases[0].id}`] : [],
    must_not_mention: [...others, ...(spec.injection_markers ?? [])],
    counts: { use_cases: useCases.length, events: events.length, by_status: byStatus },
    max_words: MAX_WORDS,
  };
}

/** Builds the cases from their specs on a generated fixture. */
export async function buildCases(workbook: string, specs: readonly CaseSpec[]): Promise<Case[]> {
  const base = new Store(workbook);
  await base.fresh();
  const cases: Case[] = [];
  for (const spec of specs) {
    const customer_id = pickCustomer(base, spec.pick);
    const store = await openCaseStore(workbook, { plants: spec.plants, customer_id });
    cases.push({ ...spec, customer_id, expect: expectationsFor(store, customer_id, spec) });
  }
  return cases;
}

export function loadCases(file = CASES_FILE): Case[] {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Case);
}

export function writeCases(cases: readonly Case[], file = CASES_FILE): void {
  fs.writeFileSync(file, cases.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf8");
}

/** Drift check: the stored case still means the same on today's fixture. Returns the differing fields. */
export async function checkCase(workbook: string, c: Case): Promise<string[]> {
  const base = new Store(workbook);
  await base.fresh();
  const problems: string[] = [];
  if (pickCustomer(base, c.pick) !== c.customer_id) problems.push("customer_id");
  const store = await openCaseStore(workbook, c);
  const now = expectationsFor(store, c.customer_id, c);
  for (const key of Object.keys(now) as (keyof Expectations)[]) {
    if (JSON.stringify(now[key]) !== JSON.stringify(c.expect[key])) problems.push(`expect.${key}`);
  }
  return problems;
}
