// @vitest-environment node
// Trace spans, cost and masking (spec 024-agent-ops: AOPS-OBS-007, AOPS-OBS-002). Task AOPS-T01.
//
// Traces are written to a temp folder only; nothing is written into the project or ../data.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateContract } from "../../server/ai/contracts";
import {
  CACHE_READ_MULTIPLIER,
  PRICES_PER_MTOK,
  Tracer,
  costUsd,
  fileSink,
  maskContractErrors,
  priceFor,
  toTraceRecord,
  type Span,
} from "../../server/ai/trace";

const RUN = "run_0123456789abcdef01234567";
const MARK = "ZQXFREETEXT";

let dir = "";
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-trace-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

function factSheet(): Record<string, unknown> {
  return {
    contract: "fact-sheet.v1",
    run_id: RUN,
    generated_at: "2026-11-20T10:00:00Z",
    customer: { fact_id: "CU-1", name: "Fictional Co" },
    use_cases: [],
    events: [],
    counts: { use_cases: 0, live_use_cases: 0, events: 0, by_status: {} },
    redactions: [],
  };
}

function errorsOf(value: unknown, id: Parameters<typeof validateContract>[0] = "fact-sheet.v1"): string[] {
  const r = validateContract(id, value);
  if (!("errors" in r)) throw new Error("expected invalid");
  return r.errors;
}

describe("masking validator errors", () => {
  it("AOPS-OBS-002 keys of record maps (by_status, gates) are always shown as [?], even when they look like names", () => {
    const sheet = factSheet();
    (sheet.counts as Record<string, unknown>).by_status = { Live: -1, [`${MARK} Status Name`]: 1.5, [MARK]: "x" };
    const raw = errorsOf(sheet);
    expect(raw.join("\n")).toContain("by_status.Live"); // the validator shows safe-looking keys...
    expect(raw.join("\n")).toContain(MARK);
    const masked = maskContractErrors(raw);
    expect(masked.join("\n")).not.toContain(MARK);
    expect(masked.join("\n")).not.toContain("Live");
    expect(masked).toContain("counts.by_status[?]: must be at least 0");
    expect(masked.every((l) => !/by_status\.[A-Za-z]/.test(l))).toBe(true);

    const handoff = { contract: "task-handoff.v1", task: "AOPS-T01", agent: "AGENT-IMPLEMENTER", covers: ["AOPS-ORCH-006"], files_changed: [], tests: [], verdict: "pending", gates: { [MARK]: "pass", G1: "maybe" } };
    const maskedGates = maskContractErrors(errorsOf(handoff, "task-handoff.v1"));
    expect(maskedGates.join("\n")).not.toContain(MARK);
    expect(maskedGates.join("\n")).not.toContain("G1");
    expect(maskedGates.some((l) => l.startsWith("gates[?]: "))).toBe(true);
  });

  it("AOPS-OBS-002 unknown property names are never shown, only counted at their parent path", () => {
    const sheet = factSheet();
    sheet[`${MARK}_one`] = 1;
    sheet[`${MARK} two words`] = 2;
    (sheet.customer as Record<string, unknown>)[`${MARK}_inner`] = 3;
    const raw = errorsOf(sheet);
    expect(raw.join("\n")).toContain(MARK);
    const masked = maskContractErrors(raw);
    expect(masked.join("\n")).not.toContain(MARK);
    expect(masked).toEqual(expect.arrayContaining(["(root): 2 unexpected properties", "customer: 1 unexpected property"]));
  });

  it("AOPS-OBS-002 any line outside the validator's grammar is masked; known rules and the overflow line pass", () => {
    expect(maskContractErrors([`${MARK} said hello`])).toEqual(["(masked): (masked)"]);
    expect(maskContractErrors([`use_cases[0].text: ${MARK} leaked`])).toEqual(["use_cases[0].text: (masked)"]);
    expect(maskContractErrors([`use_cases[0].${MARK} x: is required`])).toEqual(["(masked): (masked)"]);
    expect(maskContractErrors(["use_cases[0].text: must be at most 1500 characters", "(3 more errors)"])).toEqual([
      "use_cases[0].text: must be at most 1500 characters",
      "(3 more errors)",
    ]);
    const enumErr = errorsOf({ ...factSheet(), redactions: [{ kind: MARK, count: 1 }] });
    expect(maskContractErrors(enumErr)).toEqual(['redactions[0].kind: must be one of "email", "phone", "link", "truncated"']);
  });
});

describe("span records", () => {
  it("AOPS-OBS-002 a span is rebuilt from allowed shapes only: free text in any field, or an unknown field, is dropped", () => {
    const span = {
      spanId: "0123456789abcdef",
      runId: RUN,
      kind: "llm_call",
      startedAt: "2026-11-20T10:00:00.000Z",
      latencyMs: 12,
      outcome: "ok",
      step: "analyse",
      agent: "AGENT-ANALYST",
      agentVersion: "1.0.0",
      promptVersion: "analyst.v1",
      model: `${MARK} model`,
      effort: "medium",
      stopReason: `${MARK}`,
      tool: `${MARK}_tool`,
      errorCode: `${MARK} broke`,
      prompt: `${MARK} system prompt`,
      output: { text: MARK },
    } as unknown as Span;
    const record = toTraceRecord(span)!;
    expect(JSON.stringify(record)).not.toContain(MARK);
    expect(Object.keys(record).sort()).toEqual(
      ["agent", "agentVersion", "effort", "kind", "latencyMs", "outcome", "promptVersion", "runId", "spanId", "startedAt", "step"].sort(),
    );
    expect(toTraceRecord({ ...span, runId: `run_${MARK}` })).toBeNull();
  });

  it("AOPS-OBS-007 cost comes from usage and one price table, cache reads at the discounted rate", () => {
    expect(PRICES_PER_MTOK).toEqual({
      "claude-opus-5-5": { input: 4, output: 20 },
      "claude-sonnet-5-5": { input: 2, output: 10 },
      "claude-haiku-5-5": { input: 0.1, output: 0.5 },
    });
    const M = 1_000_000;
    expect(costUsd("claude-sonnet-5-5", { input: M, output: 0, cacheRead: 0 })).toBeCloseTo(2, 10);
    expect(costUsd("claude-sonnet-5-5", { input: 0, output: M, cacheRead: 0 })).toBeCloseTo(10, 10);
    expect(costUsd("claude-sonnet-5-5", { input: 0, output: 0, cacheRead: M })).toBeCloseTo(2 * CACHE_READ_MULTIPLIER, 10);
    expect(costUsd("claude-opus-5-5", { input: 1000, output: 500, cacheRead: 0 })).toBeCloseTo((1000 * 4 + 500 * 20) / M, 12);
    expect(costUsd("claude-haiku-5-5", { input: 1000, output: 500, cacheRead: 0 })).toBeCloseTo((1000 * 0.1 + 500 * 0.5) / M, 12);
    expect(priceFor("claude-sonnet-5-5-20261001")).toEqual({ input: 2, output: 10 });
    // An unknown model is charged at the dearest price, so budgets never under-count.
    expect(priceFor("claude-unknown-9")).toEqual({ input: 4, output: 20 });
  });

  it("AOPS-OBS-007 each ended span is appended once as one JSON line to traces/<run_id>.jsonl, linked to its parent", () => {
    let t = 1000;
    const tracer = new Tracer({ runId: RUN, sink: fileSink(dir, RUN), now: () => t, clock: () => Date.UTC(2026, 10, 20, 10, 0, 0) });
    const run = tracer.start("run", { agent: "AGENT-ORCHESTRATOR", agentVersion: "1.0.0" });
    const step = tracer.start("step", { step: "analyse", agent: "AGENT-ANALYST", agentVersion: "1.0.0" }, run);
    t += 250;
    step.set({ tokens: { input: 10, output: 5, cacheRead: 2 } });
    step.end({ outcome: "ok", costUsd: 0.0001 });
    step.end({ outcome: "error" }); // ignored
    t += 50;
    run.end({ outcome: "ok", status: "succeeded" });

    const lines = fs.readFileSync(path.join(dir, `${RUN}.jsonl`), "utf8").trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    const [s, r] = lines.map((l) => JSON.parse(l));
    expect(s).toMatchObject({ kind: "step", runId: RUN, parentId: run.spanId, step: "analyse", agent: "AGENT-ANALYST", agentVersion: "1.0.0", latencyMs: 250, outcome: "ok", costUsd: 0.0001, tokens: { input: 10, output: 5, cacheRead: 2, cacheWrite: 0 }, startedAt: "2026-11-20T10:00:00.000Z" });
    expect(r).toMatchObject({ kind: "run", runId: RUN, spanId: run.spanId, latencyMs: 300, outcome: "ok", status: "succeeded" });
    expect(r.parentId).toBeUndefined();
  });

  it("AOPS-OBS-007 a trace that cannot be written never throws and is reported once with the run ID only", () => {
    const blocked = path.join(dir, "not-a-folder");
    fs.writeFileSync(blocked, "x");
    const warnings: string[] = [];
    const tracer = new Tracer({ runId: RUN, sink: fileSink(blocked, RUN, (l) => warnings.push(l)) });
    expect(() => {
      tracer.start("run").end({ outcome: "ok" });
      tracer.start("run").end({ outcome: "ok" });
    }).not.toThrow();
    expect(warnings).toEqual([`[ai] ${RUN} trace_write_failed`]);
  });
});
