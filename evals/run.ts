/**
 * Eval harness (spec 023-ai-evaluation EVAL-GATE-004, EVAL-EXP-003, EVAL-GATE-005; 024 AOPS-ROUTE-008; tasks EVAL-T04,
 * EVAL-T08). Run through npm:
 *
 *   npm run eval:smoke            8 cases (one per category), live; gate G7 against evals/thresholds.json
 *   npm run eval:full [-- --yes]  3-case pilot with its measured cost, then all cases only with --yes
 *   npm run eval:compare [-- --yes]  the same per config in evals/configs/
 *   npm run eval:grade -- <dir>   replay: re-grade recorded results, no model call
 *   npm run eval:build-dataset    rebuild evals/dataset/cases.jsonl from specs.ts (then bump VERSION)
 *
 * Live runs use the app's AI settings (AI_* variables, AOPS-T01); on the gateway route they need AI_GATEWAY_ALLOW_BULK=1
 * (AOPS-ROUTE-008), checked before the first model call. Requests are sent one at a time (Message Batches are not
 * assumed to pass through the gateway, CR-20261123-1). Results go to `<AI_RUNS_DIR>/evals/<time>-<command>/`, outside
 * the project (ai-data-policy §6). Exit code: 0 gate passed, 1 gate failed, 2 refused or error.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createModelClient, type ModelClient } from "../server/ai/client";
import { gatewayBulkRefusal, loadAiConfig, type AiConfig, type Env } from "../server/ai/config";
import { runBrief, type StepRegistry } from "../server/ai/orchestrator";
import { analystStep } from "../server/ai/steps/analyst";
import { guardStep } from "../server/ai/steps/guard";
import { retrieve } from "../server/ai/steps/retriever";
import { writerStep } from "../server/ai/steps/writer";
import type { Store } from "../server/workbook";
import { gate, gradeCase, summarise, type CaseResult, type Grade, type StepRecord, type Summary, type Thresholds } from "./graders/code";
import {
  EVALS_DIR,
  ROOT,
  buildCases,
  checkCase,
  datasetVersion,
  generateWorkbook,
  loadCases,
  openCaseStore,
  writeCases,
  type Case,
} from "./lib/dataset";

export const PILOT_SIZE = 3;
export const THRESHOLDS_FILE = path.join(EVALS_DIR, "thresholds.json");
export const CONFIGS_DIR = path.join(EVALS_DIR, "configs");

export interface EvalConfig {
  name: string;
  /** AI_* settings layered over the environment, e.g. { "AI_MODEL_WRITER": "claude-haiku-5-5" }. */
  env: Env;
}

export type Command = "smoke" | "full" | "compare";

export interface RunOptions {
  command: Command;
  env?: Env;
  /** Default: every config in evals/configs/ for compare, else the first one. */
  configs?: EvalConfig[];
  /** Run past the pilot (full, compare). */
  confirm?: boolean;
  cases?: Case[];
  /** Tests: model client and steps instead of the live ones. */
  client?: ModelClient | null;
  steps?: Partial<StepRegistry>;
  outDir?: string;
  log?: (line: string) => void;
}

export interface ConfigReport {
  config: string;
  pilot: Summary;
  summary?: Summary;
  gate?: { pass: boolean; breaches: string[] };
  grades: Grade[];
}

export interface RunReport {
  command: Command;
  dataset_version: string;
  refused?: string;
  stopped_after_pilot: boolean;
  configs: ConfigReport[];
  outDir: string;
}

const STEPS: StepRegistry = {
  retrieve: { run: (input, ctx) => retrieve({ customerId: input.customerId }, { store: ctx.store, runId: input.runId }) },
  analyse: analystStep,
  write: writerStep,
  guard: guardStep,
};

export function loadConfigs(dir = CONFIGS_DIR): EvalConfig[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as EvalConfig);
}

export function loadThresholds(file = THRESHOLDS_FILE): Thresholds {
  return JSON.parse(fs.readFileSync(file, "utf8")) as Thresholds;
}

/** Smoke: the first case of each category. */
export const smokeCases = (cases: readonly Case[]) => cases.filter((c) => c.id.endsWith("-01"));

/** Names an entity grader may look for (EVAL-CODE-003): every name list in the workbook. */
export function workbookNames(store: Store): string[] {
  const col = (table: string, field: string) => store.table(table).rows.map((r) => r[field]).filter((v): v is string => typeof v === "string" && v.trim() !== "");
  return [
    ...col("customer", "parent_name"),
    ...col("subsidiary", "subsidiary_name"),
    ...col("department", "department_name"),
    ...col("solution", "solution_name"),
    ...col("personnel", "name"),
    ...col("stakeholder", "stakeholder_name"),
  ];
}

function aiConfigFor(env: Env, extra: Env): AiConfig {
  const result = loadAiConfig({ ...env, ...extra, AI_ENABLED: "true" }, { projectDir: ROOT });
  if ("errors" in result) throw new Error(`AI settings: ${result.errors.join("; ")}`);
  return result.config;
}

/** Runs one case through the real pipeline and records outputs, usage and per-step latency (EVAL-CODE-006). */
async function runCase(c: Case, workbook: string, config: AiConfig, cfgName: string, client: ModelClient | null, steps: StepRegistry, version: string): Promise<{ result: CaseResult; store: Store }> {
  const store = await openCaseStore(workbook, c);
  const spans: Record<string, unknown>[] = [];
  const t0 = Date.now();
  const record = await runBrief(
    { config, steps, client, store: { fresh: () => store.fresh(), table: (n) => store.table(n) }, sink: () => ({ write: (r) => spans.push(r) }), log: () => undefined },
    { customerId: c.customer_id },
  );
  const out = (step: string) => record.completed.find((x) => x.step === step)?.output;
  const stepRecords: StepRecord[] = spans
    .filter((s) => s.kind === "step")
    .map((s) => {
      const t = (s.tokens ?? {}) as { input?: number; output?: number; cacheRead?: number };
      return { step: String(s.step), latency_ms: Number(s.latencyMs ?? 0), input_tokens: t.input ?? 0, output_tokens: t.output ?? 0, cache_read_tokens: t.cacheRead ?? 0, cost_usd: Number(s.costUsd ?? 0) };
    });
  return {
    store,
    result: {
      case_id: c.id,
      category: c.category,
      config: cfgName,
      dataset_version: version,
      status: record.status,
      ...(record.error ? { error: record.error } : {}),
      ...(record.failedStep ? { failed_step: record.failedStep } : {}),
      outputs: { retrieve: out("retrieve"), analyse: out("analyse"), write: out("write"), guard: out("guard") },
      usage: { input_tokens: record.usage.inputTokens, output_tokens: record.usage.outputTokens, cache_read_tokens: record.usage.cacheReadTokens, cost_usd: record.usage.costUsd },
      latency_ms: Date.now() - t0,
      steps: stepRecords,
    },
  };
}

function writeReport(dir: string, report: RunReport, results: CaseResult[]) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "results.jsonl"), results.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");
  fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify(report, null, 2), "utf8");
}

/** The harness. Never calls a model before the gateway check, the dataset drift check and the pilot. */
export async function runEval(opts: RunOptions): Promise<RunReport> {
  const log = opts.log ?? ((l: string) => console.info(l));
  const env = opts.env ?? process.env;
  const version = datasetVersion();
  const all = opts.cases ?? loadCases();
  const cases = opts.command === "smoke" ? smokeCases(all) : all;
  const configs = opts.configs ?? (opts.command === "compare" ? loadConfigs() : loadConfigs().slice(0, 1));
  const baseConfig = aiConfigFor(env, configs[0]?.env ?? {});
  const outDir = opts.outDir ?? path.join(baseConfig.runsDir, "evals", `${new Date().toISOString().replace(/[:.]/g, "-")}-${opts.command}`);
  const report: RunReport = { command: opts.command, dataset_version: version, stopped_after_pilot: false, configs: [], outDir };

  // AOPS-ROUTE-008: a live eval on the gateway route needs AI_GATEWAY_ALLOW_BULK=1, before any model call.
  if (opts.client === undefined) {
    const refusal = gatewayBulkRefusal(baseConfig);
    if (refusal) {
      log(`[eval] refused: ${refusal}`);
      return { ...report, refused: refusal };
    }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-eval-"));
  const results: CaseResult[] = [];
  try {
    const workbook = generateWorkbook(tmp);
    for (const c of cases) {
      const drift = await checkCase(workbook, c);
      if (drift.length) throw new Error(`Case ${c.id} no longer matches the fixture (${drift.join(", ")}): rebuild the dataset and bump VERSION.`);
    }
    const thresholds = loadThresholds();
    for (const cfg of configs) {
      const config = aiConfigFor(env, cfg.env);
      const client = opts.client !== undefined ? opts.client : createModelClient({ ok: true, config });
      const steps = { ...STEPS, ...opts.steps };
      const grades: Grade[] = [];
      const runOne = async (c: Case) => {
        const { result, store } = await runCase(c, workbook, config, cfg.name, client, steps, version);
        results.push(result);
        const g = gradeCase(result, c, workbookNames(store));
        grades.push(g);
        log(`[eval] ${cfg.name} ${c.id} ${result.status} cost=$${result.usage.cost_usd.toFixed(4)} ${result.latency_ms}ms`);
      };
      // EVAL-EXP-003: a 3-case pilot with its measured cost before any full run.
      const pilotCases = opts.command === "smoke" ? cases : cases.slice(0, PILOT_SIZE);
      for (const c of pilotCases) await runOne(c);
      const pilot = summarise(grades);
      const entry: ConfigReport = { config: cfg.name, pilot, grades };
      report.configs.push(entry);
      if (opts.command !== "smoke") {
        const projected = (pilot.cost_usd / Math.max(pilotCases.length, 1)) * cases.length;
        log(`[eval] pilot ${cfg.name}: $${pilot.cost_usd.toFixed(4)} for ${pilotCases.length} cases; projected $${projected.toFixed(2)} for ${cases.length}`);
        if (!opts.confirm) {
          report.stopped_after_pilot = true;
          continue;
        }
        for (const c of cases.slice(PILOT_SIZE)) await runOne(c);
      }
      entry.summary = summarise(grades);
      entry.gate = gate(entry.summary, thresholds);
      log(`[eval] ${cfg.name}: gate ${entry.gate.pass ? "passed" : `failed: ${entry.gate.breaches.join("; ")}`} · cost $${entry.summary.cost_usd.toFixed(4)} · dataset v${version}`);
    }
    if (report.stopped_after_pilot) log("[eval] stopped after the pilot; run again with --yes to continue");
    writeReport(outDir, report, results);
    log(`[eval] results: ${outDir}`);
    return report;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

/** Replay (EVAL-T04): re-grades recorded results; no model call. */
export async function gradeRecorded(dir: string, log: (l: string) => void = (l) => console.info(l)): Promise<{ pass: boolean; summary: Summary; breaches: string[] }> {
  const results = fs.readFileSync(path.join(dir, "results.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as CaseResult);
  const byId = new Map(loadCases().map((c) => [c.id, c]));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-eval-"));
  try {
    const workbook = generateWorkbook(tmp);
    const grades: Grade[] = [];
    for (const r of results) {
      const c = byId.get(r.case_id);
      if (!c) throw new Error(`Unknown case ${r.case_id}`);
      const store = await openCaseStore(workbook, c);
      grades.push(gradeCase(r, c, workbookNames(store)));
    }
    const summary = summarise(grades);
    const g = gate(summary, loadThresholds());
    log(`[eval] replay of ${results.length} results: gate ${g.pass ? "passed" : `failed: ${g.breaches.join("; ")}`}`);
    return { pass: g.pass, summary, breaches: g.breaches };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

export async function buildDataset(log: (l: string) => void = (l) => console.info(l)): Promise<Case[]> {
  const { SPECS } = await import("./dataset/specs");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-eval-"));
  try {
    const cases = await buildCases(generateWorkbook(tmp), SPECS);
    writeCases(cases);
    log(`[eval] wrote ${cases.length} cases; bump evals/dataset/VERSION if they changed`);
    return cases;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === "build-dataset") return (await buildDataset(), 0);
    if (command === "grade") {
      if (!rest[0]) throw new Error("Usage: eval:grade -- <results dir>");
      return (await gradeRecorded(rest[0])).pass ? 0 : 1;
    }
    if (command === "smoke" || command === "full" || command === "compare") {
      const report = await runEval({ command, confirm: rest.includes("--yes") });
      if (report.refused) return 2;
      if (report.stopped_after_pilot) return 0;
      return report.configs.every((c) => c.gate?.pass) ? 0 : 1;
    }
    throw new Error("Usage: run.ts smoke | full [--yes] | compare [--yes] | grade <dir> | build-dataset");
  } catch (e) {
    console.error(`[eval] ${(e as Error).message}`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main(process.argv.slice(2)).then((code) => process.exit(code));
}
