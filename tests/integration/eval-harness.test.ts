// @vitest-environment node
// Eval dataset and harness (spec 023-ai-evaluation EVAL-DATA-001..005, EVAL-GATE-004, EVAL-EXP-003, EVAL-GATE-005;
// 024 AOPS-ROUTE-008). Tasks EVAL-T01, EVAL-T04, EVAL-T08. The harness runs the real retrieve and guard steps on the
// generated fixture with stub analyse/write steps and a model client that must never be called: no test reaches a model.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFakeModelClient } from "../../server/ai/client";
import { SECTION_HEADINGS, type FactSheetV1 } from "../../server/ai/contracts";
import type { Env } from "../../server/ai/config";
import type { StepRegistry } from "../../server/ai/orchestrator";
import { sanitizeDraftHtml } from "../../server/ai/steps/guard";
import { CATEGORIES, checkCase, datasetVersion, generateWorkbook, loadCases } from "../../evals/lib/dataset";
import { gradeRecorded, runEval } from "../../evals/run";
import { ROOT } from "./harness";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-eval-test-"));
const ENV: Env = { NODE_ENV: "test", AI_RUNS_DIR: path.join(tmp, "runs"), ANTHROPIC_API_KEY: "sk-ant-test-not-used" };
const GATEWAY: Env = { ...ENV, AI_GATEWAY: "portkey", AI_GATEWAY_URL: "https://portkeygateway.example.com", AI_GATEWAY_MODEL_PREFIX: "@aws-bedrock-use2/us.anthropic.", PORTKEY_API_KEY: "pk-test-not-used" };
const cases = loadCases();

beforeAll(() => void sanitizeDraftHtml(""), 60_000);
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));

/** Stub LLM steps that cite the customer and the newest use case; `bad` adds an unknown ID and an injection marker. */
function stubs(bad = false): Partial<StepRegistry> {
  return {
    analyse: {
      run: async (sheet: FactSheetV1) => ({
        contract: "analyst-to-writer.v1",
        run_id: sheet.run_id,
        no_activity: sheet.use_cases.length === 0 && sheet.events.length === 0,
        overview: [{ point: "Summary.", fact_ids: [sheet.customer.fact_id, ...sheet.use_cases.slice(0, 1).map((u) => u.fact_id)] }],
        wins: [],
        risks: [],
        next_steps: [],
      }),
    },
    write: {
      run: async (input) => ({
        contract: "writer-draft.v1",
        run_id: input.runId,
        revision: 0,
        sections: SECTION_HEADINGS.map((heading) => ({
          heading,
          sentences: [{ text: bad ? `${heading}: PWNED-ALPHA.` : `${heading}: noted.`, factual: true, fact_ids: bad ? ["UC-1"] : input.analysis.overview[0].fact_ids }],
        })),
      }),
    },
  };
}

const noModel = () => createFakeModelClient([]);

describe("dataset", () => {
  it("EVAL-DATA-001 holds at least 30 cases covering the 8 categories", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cases.map((c) => c.category))).toEqual(new Set(CATEGORIES));
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it("EVAL-DATA-003 has at least 3 cases each for prompt injection, HTML/script in notes and non-Latin names", () => {
    for (const cat of ["injection", "html", "non_latin"]) expect(cases.filter((c) => c.category === cat).length).toBeGreaterThanOrEqual(3);
    for (const c of cases.filter((x) => x.category === "injection")) expect(c.injection_markers?.length).toBeGreaterThan(0);
  });

  it("EVAL-DATA-004 every case stores must_mention, must_not_mention, counts by status and a word limit", () => {
    for (const c of cases) {
      expect(Array.isArray(c.expect.must_mention)).toBe(true);
      expect(c.expect.must_not_mention.length).toBeGreaterThan(0);
      expect(c.expect.counts).toEqual({ use_cases: expect.any(Number), events: expect.any(Number), by_status: expect.any(Object) });
      expect(c.expect.max_words).toBe(350);
    }
  });

  it("EVAL-DATA-005 the dataset has a version and every report names it", async () => {
    expect(datasetVersion()).toMatch(/^\d+$/);
    const report = await runEval({ command: "smoke", env: ENV, client: noModel(), steps: stubs(), cases: cases.slice(0, 1), outDir: path.join(tmp, "v"), log: () => undefined });
    expect(report.dataset_version).toBe(datasetVersion());
    expect(JSON.parse(fs.readFileSync(path.join(tmp, "v", "report.json"), "utf8")).dataset_version).toBe(datasetVersion());
  }, 120_000);

  it("EVAL-DATA-002 every case is reproduced exactly from the generator with the recorded seed and its planted records", async () => {
    const workbook = generateWorkbook(tmp);
    for (const c of cases) expect(await checkCase(workbook, c), c.id).toEqual([]);
  }, 300_000);
});

describe("harness", () => {
  it("EVAL-GATE-004 npm runs eval:smoke, eval:full and eval:compare through the harness", () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).scripts as Record<string, string>;
    for (const cmd of ["smoke", "full", "compare"]) expect(scripts[`eval:${cmd}`]).toMatch(new RegExp(`evals/run\\.ts ${cmd}$`));
  });

  it("AOPS-ROUTE-008 a live eval on the gateway route is refused before any model call unless AI_GATEWAY_ALLOW_BULK=1", async () => {
    const lines: string[] = [];
    const report = await runEval({ command: "smoke", env: GATEWAY, cases, outDir: path.join(tmp, "gw"), log: (l) => lines.push(l) });
    expect(report.refused).toMatch(/AI_GATEWAY_ALLOW_BULK=1/);
    expect(report.configs).toHaveLength(0);
    expect(fs.existsSync(path.join(tmp, "gw"))).toBe(false);
  });

  it("EVAL-EXP-003 a full run first runs a 3-case pilot, reports its cost and stops without --yes", async () => {
    const lines: string[] = [];
    const client = noModel();
    const report = await runEval({ command: "full", env: ENV, client, steps: stubs(), cases: cases.slice(0, 5), outDir: path.join(tmp, "pilot"), log: (l) => lines.push(l) });
    expect(report.stopped_after_pilot).toBe(true);
    expect(report.configs[0].grades).toHaveLength(3);
    expect(lines.some((l) => /pilot default: \$0\.0000 for 3 cases; projected \$0\.00 for 5/.test(l))).toBe(true);
    expect(client.calls).toHaveLength(0);
  }, 120_000);

  it("EVAL-GATE-005 the smoke suite passes clean drafts and fails on an unknown citation and a followed injection; replay re-grades the same", async () => {
    const smoke = cases.filter((c) => c.id === "rich-01" || c.id === "injection-01");
    const good = await runEval({ command: "smoke", env: ENV, client: noModel(), steps: stubs(), cases: smoke, outDir: path.join(tmp, "good"), log: () => undefined });
    expect(good.configs[0].gate).toEqual({ pass: true, breaches: [] });
    expect((await gradeRecorded(path.join(tmp, "good"), () => undefined)).pass).toBe(true);

    const bad = await runEval({ command: "smoke", env: ENV, client: noModel(), steps: stubs(true), cases: smoke, outDir: path.join(tmp, "bad"), log: () => undefined });
    const breaches = bad.configs[0].gate!.breaches.join(" | ");
    expect(breaches).toMatch(/citation_validity/);
    expect(breaches).toMatch(/injection_followed_cases/);
    expect((await gradeRecorded(path.join(tmp, "bad"), () => undefined)).pass).toBe(false);
  }, 180_000);
});
