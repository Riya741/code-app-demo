// @vitest-environment node
// AI configuration from the environment (spec 024-agent-ops: AOPS-ORCH-003, AOPS-FAIL-007). Task AOPS-T01.
//
// Step defaults are checked against the agent specs themselves (spec/agents/*.md, "## Model"), the same way tools.test.ts
// checks the tool allow-list. Nothing here reads a real environment file: every test passes its own env object.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMITS,
  LLM_STEPS,
  STEP_AGENTS,
  STEP_NAMES,
  isInside,
  loadAiConfig,
  type Env,
} from "../../server/ai/config";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
/** A project folder in the temp dir, so the default runs dir (`../data/ai-runs`) is outside it as in the real layout. */
const PROJECT = path.join(os.tmpdir(), "code-app-config-test", "project");

const load = (env: Env) => loadAiConfig(env, { projectDir: PROJECT });

function config(env: Env) {
  const result = load(env);
  if ("errors" in result) throw new Error(`config errors: ${result.errors.join("; ")}`);
  return result.config;
}

/** The error lines of a result, or `[]` when it is valid. */
const errorsOf = (result: ReturnType<typeof load>): string[] => ("errors" in result ? result.errors : []);

interface SpecModel {
  id: string;
  version: string;
  model?: string;
  effort?: string;
  maxTokens?: number;
  timeoutMs?: number;
  envSuffix?: string;
}

/** Each runtime agent spec's ID, version and "## Model" settings. */
function runtimeSpecs(): SpecModel[] {
  const dir = path.join(ROOT, "spec", "agents");
  const out: SpecModel[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md")) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    if (text.match(/\*\*Kind:\*\*\s*(\w+)/)?.[1] !== "runtime") continue;
    const section = text.split(/^## Model\s*$/m)[1].split(/^## /m)[0];
    const spec: SpecModel = {
      id: text.match(/\*\*ID:\*\*\s*(AGENT-[A-Z-]+)/)![1],
      version: text.match(/\*\*Version:\*\*\s*(\d+\.\d+\.\d+)/)![1],
    };
    const model = section.match(/`(claude-[a-z0-9-]+)`/);
    if (model) {
      spec.model = model[1];
      spec.effort = section.match(/effort `(\w+)`/)![1];
      spec.maxTokens = Number(section.match(/`max_tokens` ([0-9][^a-z(]*)/)![1].replace(/\D/g, ""));
      spec.timeoutMs = Number(section.match(/timeout (\d+) s/)![1]) * 1000;
      spec.envSuffix = section.match(/`AI_MODEL_([A-Z]+)`/)![1];
      expect(section).toContain(`\`AI_EFFORT_${spec.envSuffix}\``);
    }
    out.push(spec);
  }
  return out;
}

describe("step settings", () => {
  it("AOPS-ORCH-003 each step's agent, version and model defaults are the ones in its agent spec", () => {
    const specs = runtimeSpecs();
    // Only the agent steps have specs; retrieve and guard are code steps with no agent (CR-20261121-1).
    const agentSteps = STEP_NAMES.filter((s) => STEP_AGENTS[s].agent !== null);
    expect(agentSteps).toEqual(["analyse", "write"]);
    expect(specs.map((s) => s.id).sort()).toEqual(agentSteps.map((s) => STEP_AGENTS[s].agent).sort());
    for (const step of ["retrieve", "guard"] as const) {
      expect(STEP_AGENTS[step], step).toMatchObject({ agent: null, agentVersion: null, envSuffix: null, defaults: null });
    }
    for (const spec of specs) {
      const row = Object.values(STEP_AGENTS).find((r) => r.agent === spec.id)!;
      expect(row.agentVersion, spec.id).toBe(spec.version);
      if (spec.model) {
        expect(row.defaults, spec.id).toEqual({ model: spec.model, effort: spec.effort, maxTokens: spec.maxTokens, timeoutMs: spec.timeoutMs });
        expect(row.envSuffix, spec.id).toBe(spec.envSuffix);
      } else {
        expect(row.defaults, `${spec.id} is deterministic`).toBeNull();
      }
    }
    // ADR-0007 interim choice for every LLM step.
    expect(LLM_STEPS).toEqual(["analyse", "write"]);
    for (const step of LLM_STEPS) expect(STEP_AGENTS[step].defaults).toMatchObject({ model: "claude-sonnet-5-5", effort: "medium" });
  });

  it("AOPS-ORCH-003 with nothing set every LLM step gets its agent-spec defaults and AI is off", () => {
    const c = config({});
    for (const step of LLM_STEPS) expect(c.steps[step]).toEqual(STEP_AGENTS[step].defaults);
    expect(c.steps.retrieve).toBeUndefined();
    expect(c.steps.guard).toBeUndefined();
    expect(c.enabled).toBe(false);
    expect(c.hasCredentials).toBe(false);
    expect(c.modelMode).toBe("live");
    expect(c.limits).toEqual(DEFAULT_LIMITS);
    expect(c.limits).toEqual({ maxTokens: 60_000, maxCostUsd: 0.5, maxSeconds: 60 });
    expect(c.faults).toEqual({});
    expect(c.runsDir).toBe(path.resolve(PROJECT, "..", "data", "ai-runs"));
    expect(c.tracesDir).toBe(path.join(c.runsDir, "traces"));
  });

  it("AOPS-ORCH-003 AI_MODEL_, AI_EFFORT_, AI_MAX_TOKENS_ and AI_TIMEOUT_MS_ per agent override only that step", () => {
    const c = config({
      AI_MODEL_WRITER: "claude-haiku-5-5",
      AI_EFFORT_WRITER: "high",
      AI_MAX_TOKENS_ANALYST: "12000",
      AI_TIMEOUT_MS_ANALYST: "30000",
      AI_RUN_MAX_TOKENS: "40000",
      AI_RUN_MAX_COST_USD: "0.25",
      AI_RUN_MAX_SECONDS: "90",
    });
    expect(c.steps.analyse).toEqual({ model: "claude-sonnet-5-5", effort: "medium", maxTokens: 12000, timeoutMs: 30000 });
    expect(c.steps.write).toEqual({ model: "claude-haiku-5-5", effort: "high", maxTokens: 8000, timeoutMs: 45000 });
    expect(c.steps.guard).toBeUndefined();
    expect(c.limits).toEqual({ maxTokens: 40000, maxCostUsd: 0.25, maxSeconds: 90 });
  });
});

describe("enabling AI and config errors", () => {
  it("AOPS-FAIL-007 AI is enabled only by AI_ENABLED=true; the key's presence is recorded, never the key", () => {
    for (const value of [undefined, "", "false", "TRUE", "1", "yes", " true"]) {
      expect(config({ AI_ENABLED: value }).enabled, String(value)).toBe(false);
    }
    const c = config({ AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-NEVER-STORED" });
    expect(c.enabled).toBe(true);
    expect(c.hasCredentials).toBe(true);
    expect(JSON.stringify(c)).not.toContain("NEVER-STORED");
    expect(config({ AI_ENABLED: "true", ANTHROPIC_API_KEY: "   " }).hasCredentials).toBe(false);
  });

  it("AOPS-FAIL-007 an invalid AI setting is a config error naming the variable and the rule, never its value, and never throws", () => {
    const secret = "sk-ant-PASTED-BY-MISTAKE";
    const cases: [Env, string][] = [
      [{ AI_MODEL_ANALYST: secret }, "AI_MODEL_ANALYST"],
      [{ AI_MODEL_WRITER: "Claude Sonnet" }, "AI_MODEL_WRITER"],
      [{ AI_EFFORT_WRITER: "extreme" }, "AI_EFFORT_WRITER"],
      [{ AI_MAX_TOKENS_WRITER: "8k" }, "AI_MAX_TOKENS_WRITER"],
      [{ AI_MAX_TOKENS_WRITER: "0" }, "AI_MAX_TOKENS_WRITER"],
      [{ AI_TIMEOUT_MS_WRITER: "-5" }, "AI_TIMEOUT_MS_WRITER"],
      [{ AI_TIMEOUT_MS_WRITER: "4.5" }, "AI_TIMEOUT_MS_WRITER"],
      [{ AI_RUN_MAX_TOKENS: "lots" }, "AI_RUN_MAX_TOKENS"],
      [{ AI_RUN_MAX_COST_USD: "$1" }, "AI_RUN_MAX_COST_USD"],
      [{ AI_RUN_MAX_COST_USD: "1e3" }, "AI_RUN_MAX_COST_USD"],
      [{ AI_RUN_MAX_SECONDS: "0" }, "AI_RUN_MAX_SECONDS"],
      [{ AI_MODEL_MODE: "record" }, "AI_MODEL_MODE"],
      [{ AI_FAULTS: "429:2" }, "AI_FAULTS"],
      [{ AI_FAULTS: "meteor:0.1" }, "AI_FAULTS"],
      [{ AI_FAULTS: `429:0.1,${secret}` }, "AI_FAULTS"],
      [{ AI_RUNS_DIR: "./ai-runs" }, "AI_RUNS_DIR"],
      [{ AI_RUNS_DIR: PROJECT }, "AI_RUNS_DIR"],
    ];
    for (const [env, variable] of cases) {
      const full = { AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-key", NODE_ENV: "test", ...env };
      let result: ReturnType<typeof load> | undefined;
      expect(() => (result = load(full)), variable).not.toThrow();
      expect(result!.ok, variable).toBe(false);
      const text = errorsOf(result!).join("\n");
      expect(text, variable).toContain(variable);
      for (const value of Object.values(env)) {
        if (value && value.length > 3) expect(text, variable).not.toContain(value);
      }
      expect(text).not.toContain("sk-test-key");
    }
    // Several mistakes are all reported at once.
    expect(errorsOf(load({ AI_EFFORT_ANALYST: "x", AI_RUN_MAX_SECONDS: "x" }))).toHaveLength(2);
  });

  it("AOPS-FAIL-007 AI_RUNS_DIR outside the project folder is accepted as given", () => {
    const outside = path.join(os.tmpdir(), "code-app-config-test", "runs");
    const c = config({ AI_RUNS_DIR: outside });
    expect(c.runsDir).toBe(path.resolve(outside));
    expect(c.tracesDir).toBe(path.join(path.resolve(outside), "traces"));
  });

  it("AOPS-FAIL-007 a folder whose name starts with '..' inside the project is still inside it", () => {
    const dotted = path.join(PROJECT, "..runs");
    expect(isInside(dotted, PROJECT)).toBe(true);
    expect(isInside(path.join(PROJECT, "a", "..b", "c"), PROJECT)).toBe(true);
    expect(isInside(PROJECT, PROJECT)).toBe(true);
    expect(isInside(path.dirname(PROJECT), PROJECT)).toBe(false);
    expect(isInside(path.join(path.dirname(PROJECT), "data"), PROJECT)).toBe(false);
    const result = load({ AI_RUNS_DIR: "..runs" });
    expect(result.ok).toBe(false);
    expect("errors" in result ? result.errors : []).toEqual(["AI_RUNS_DIR must be outside the project folder"]);
  });

  it("AOPS-FAIL-007 AI_MODEL_MODE=replay is accepted only when NODE_ENV is development or test", () => {
    expect(config({ AI_MODEL_MODE: "replay", NODE_ENV: "test" }).modelMode).toBe("replay");
    expect(config({ AI_MODEL_MODE: "replay", NODE_ENV: "development" }).modelMode).toBe("replay");
    for (const nodeEnv of ["production", undefined]) {
      const result = load({ AI_MODEL_MODE: "replay", NODE_ENV: nodeEnv });
      expect(result.ok, String(nodeEnv)).toBe(false);
      expect("errors" in result ? result.errors : []).toEqual(["AI_MODEL_MODE replay is allowed only when NODE_ENV is development or test"]);
    }
    expect(config({ AI_MODEL_MODE: "live", NODE_ENV: "production" }).modelMode).toBe("live");
  });

  it("AOPS-TEST-001 AI_FAULTS is parsed in development and test and ignored otherwise", () => {
    const faults = "429:0.3,timeout:0.1,badjson:0.1";
    expect(config({ AI_FAULTS: faults, NODE_ENV: "test" }).faults).toEqual({ "429": 0.3, timeout: 0.1, badjson: 0.1 });
    expect(config({ AI_FAULTS: faults, NODE_ENV: "development" }).faults).toEqual({ "429": 0.3, timeout: 0.1, badjson: 0.1 });
    expect(config({ AI_FAULTS: faults, NODE_ENV: "production" }).faults).toEqual({});
    expect(config({ AI_FAULTS: faults }).faults).toEqual({});
  });
});
