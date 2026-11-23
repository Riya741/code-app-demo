/**
 * AI configuration from the environment (spec 024-agent-ops, task AOPS-T01).
 *
 * - AOPS-ORCH-003: the model, effort, max tokens and timeout of each LLM step are configuration values whose defaults
 *   are the ones in the step's agent spec (`spec/agents/{analyst,writer}.md`, interim values of ADR-0007). A test
 *   parses the agent specs and checks `STEP_AGENTS` against them, as `AGENT_TOOL_ALLOWLIST` is checked in tools.ts.
 * - AOPS-ORCH-006 (CR-20261121-1): retrieve and guard are code steps with no agent spec (`agent: null`); there is no
 *   critique step and no orchestrator agent.
 * - AOPS-FAIL-007 / Article XII.8: AI is off unless `AI_ENABLED` is exactly `true`. `AI_MODEL_MODE=replay` (no API key
 *   needed) and `AI_FAULTS` are accepted only when `NODE_ENV` is `development` or `test`; replay elsewhere is an error.
 * - Invalid values never throw: `loadAiConfig` returns `{ ok: false, errors }`, each error naming the variable and the
 *   rule, never the value (a value could be a pasted key or free text; AOPS-OBS-002). The caller reports AI as
 *   disabled and the rest of the server runs unchanged.
 * - The API key is never read into the config: only whether one is present (`hasCredentials`). The live client reads
 *   `ANTHROPIC_API_KEY` itself when it is created (client.ts), so the config object can be logged or traced safely.
 *
 * Only `process.env` (or an object passed in) is read; no file is read here.
 */
import path from "node:path";

/* ------------------------------------------------------------------------------------------- steps */

/** The pipeline steps in their fixed order (AOPS-ORCH-006, ADR-0008). */
export const STEP_NAMES = ["retrieve", "analyse", "write", "guard"] as const;
export type StepName = (typeof STEP_NAMES)[number];

/** Effort levels the Messages API accepts (`output_config.effort`). */
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

/** The settings an LLM step runs with; every trace records the values used (AOPS-ORCH-003). */
export interface StepSettings {
  readonly model: string;
  readonly effort: Effort;
  readonly maxTokens: number;
  readonly timeoutMs: number;
}

export interface StepAgent {
  readonly step: StepName;
  /** Agent spec ID and version (spec/agents/*.md), recorded on the step's spans (AOPS-OBS-007); `null` for code steps. */
  readonly agent: string | null;
  readonly agentVersion: string | null;
  /** Suffix of the step's environment variables, e.g. `ANALYST` in `AI_MODEL_ANALYST` (named in the agent specs). */
  readonly envSuffix: string | null;
  /** The agent spec's "Model" section; `null` for code steps (retrieve, guard). */
  readonly defaults: StepSettings | null;
}

/** ADR-0007 interim default for every LLM step, as written in the agent specs. */
const INTERIM: StepSettings = Object.freeze({ model: "claude-sonnet-5-5", effort: "medium", maxTokens: 8000, timeoutMs: 45_000 });

/** One row per step; the agent rows are copied from the agent specs (checked against them by a test). */
export const STEP_AGENTS: Readonly<Record<StepName, StepAgent>> = Object.freeze({
  retrieve: { step: "retrieve", agent: null, agentVersion: null, envSuffix: null, defaults: null },
  analyse: { step: "analyse", agent: "AGENT-ANALYST", agentVersion: "1.0.0", envSuffix: "ANALYST", defaults: INTERIM },
  write: { step: "write", agent: "AGENT-WRITER", agentVersion: "1.1.0", envSuffix: "WRITER", defaults: INTERIM },
  guard: { step: "guard", agent: null, agentVersion: null, envSuffix: null, defaults: null },
});

/** The steps that call a model. */
export const LLM_STEPS: readonly StepName[] = STEP_NAMES.filter((s) => STEP_AGENTS[s].defaults !== null);

/* ------------------------------------------------------------------------------------------- config */

/** Per-run limits (AOPS-BUDG-001 defaults, AOPS-BUDG-002 variables). Parsed here; enforced by AOPS-T06. */
export interface RunLimits {
  readonly maxTokens: number;
  readonly maxCostUsd: number;
  readonly maxSeconds: number;
}

export const DEFAULT_LIMITS: RunLimits = Object.freeze({ maxTokens: 60_000, maxCostUsd: 0.5, maxSeconds: 60 });

/** Fault kinds `AI_FAULTS` may name (AOPS-TEST-001); injected by the resilience layer (AOPS-T03). */
export const FAULT_KINDS = ["429", "529", "500", "timeout", "network", "badjson", "refusal", "max_tokens"] as const;
export type FaultKind = (typeof FAULT_KINDS)[number];
export type FaultRates = Readonly<Partial<Record<FaultKind, number>>>;

/** `live` calls the API; `replay` returns recorded responses (the replay model is AOPS-T09). */
export const MODEL_MODES = ["live", "replay"] as const;
export type ModelMode = (typeof MODEL_MODES)[number];

/** `AI_GATEWAY` values (AOPS-ROUTE-001, CR-20261123-1); `none` is the direct route. */
export const GATEWAYS = ["none", "portkey"] as const;
export type Route = "direct" | "gateway";

/** The gateway route's settings (AOPS-ROUTE-002). Holds no key. */
export interface GatewayConfig {
  readonly kind: "portkey";
  /** `AI_GATEWAY_URL`: the gateway root; the SDK appends `/v1/messages`. */
  readonly url: string;
  readonly host: string;
  /** `AI_GATEWAY_MODEL_PREFIX`, e.g. `@aws-bedrock-use2/us.anthropic.`; added to the model on the wire only. */
  readonly modelPrefix: string;
  /** The provider slug from the prefix, e.g. `@aws-bedrock-use2` (traced, AOPS-ROUTE-006). */
  readonly provider: string;
  /** `AI_GATEWAY_ALLOW_BULK === "1"` (AOPS-ROUTE-008). */
  readonly allowBulk: boolean;
}

export interface AiConfig {
  /** `AI_ENABLED === "true"`. */
  readonly enabled: boolean;
  /** Whether the selected route's key is set (`ANTHROPIC_API_KEY` direct, `PORTKEY_API_KEY` gateway). Never the key. */
  readonly hasCredentials: boolean;
  readonly modelMode: ModelMode;
  /** `direct` unless `AI_GATEWAY=portkey` (AOPS-ROUTE-001). */
  readonly route: Route;
  /** Set only on the gateway route. */
  readonly gateway: GatewayConfig | null;
  /** Settings per LLM step: agent-spec defaults, overridden by `AI_MODEL_<AGENT>` etc. */
  readonly steps: Readonly<Partial<Record<StepName, StepSettings>>>;
  readonly limits: RunLimits;
  /** Empty unless `NODE_ENV` is `development` or `test` (AOPS-TEST-001). */
  readonly faults: FaultRates;
  /** Checkpoints go here; traces go to `<runsDir>/traces/` (ai-data-policy §6). Always outside the project folder. */
  readonly runsDir: string;
  readonly tracesDir: string;
}

export type AiConfigResult = { ok: true; config: AiConfig } | { ok: false; errors: string[] };

export type Env = Readonly<Record<string, string | undefined>>;

export interface LoadOptions {
  /** The project folder; `AI_RUNS_DIR` is resolved against it. Default: the current working directory. */
  readonly projectDir?: string;
}

const MODEL_ID = /^[a-z0-9][a-z0-9.-]{0,63}$/;
const INTEGER = /^[0-9]{1,9}$/;
const DECIMAL = /^[0-9]{1,6}(\.[0-9]{1,6})?$/;

/** Collects errors; each names the variable and the rule only. */
class Reader {
  readonly errors: string[] = [];

  constructor(private readonly env: Env) {}

  /** The trimmed value, or `undefined` when unset or blank. */
  raw(name: string): string | undefined {
    const v = this.env[name];
    return v == null || v.trim() === "" ? undefined : v.trim();
  }

  int(name: string, fallback: number, min: number, max: number): number {
    const v = this.raw(name);
    if (v === undefined) return fallback;
    const n = INTEGER.test(v) ? Number(v) : NaN;
    if (!Number.isInteger(n) || n < min || n > max) {
      this.errors.push(`${name} must be a whole number from ${min} to ${max}`);
      return fallback;
    }
    return n;
  }

  decimal(name: string, fallback: number, min: number, max: number): number {
    const v = this.raw(name);
    if (v === undefined) return fallback;
    const n = DECIMAL.test(v) ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < min || n > max) {
      this.errors.push(`${name} must be a number from ${min} to ${max}`);
      return fallback;
    }
    return n;
  }

  oneOf<T extends string>(name: string, options: readonly T[], fallback: T): T {
    const v = this.raw(name);
    if (v === undefined) return fallback;
    if (!(options as readonly string[]).includes(v)) {
      this.errors.push(`${name} must be one of ${options.join(", ")}`);
      return fallback;
    }
    return v as T;
  }

  model(name: string, fallback: string): string {
    const v = this.raw(name);
    if (v === undefined) return fallback;
    if (!MODEL_ID.test(v)) {
      this.errors.push(`${name} must be a model ID (lower-case letters, digits, '.' and '-')`);
      return fallback;
    }
    return v;
  }
}

/** `429:0.3,timeout:0.1,badjson:0.1` → rates. */
function parseFaults(r: Reader, nodeEnv: string | undefined): FaultRates {
  const value = r.raw("AI_FAULTS");
  if (value === undefined) return {};
  const out: Partial<Record<FaultKind, number>> = {};
  for (const part of value.split(",")) {
    const [kind, rate, extra] = part.trim().split(":");
    const n = rate !== undefined && DECIMAL.test(rate) ? Number(rate) : NaN;
    if (extra !== undefined || !(FAULT_KINDS as readonly string[]).includes(kind) || !(n >= 0 && n <= 1)) {
      r.errors.push(`AI_FAULTS must be a list of <kind>:<rate> with kind one of ${FAULT_KINDS.join(", ")} and rate from 0 to 1`);
      return {};
    }
    out[kind as FaultKind] = n;
  }
  // Fault injection only in development and test, never in a real run (AOPS-TEST-001).
  return isDevOrTest(nodeEnv) ? Object.freeze(out) : {};
}

/** Development and test only: fault injection (AOPS-TEST-001) and the replay model (AOPS-FAIL-007 as amended). */
const isDevOrTest = (nodeEnv: string | undefined) => nodeEnv === "development" || nodeEnv === "test";

/** Whether `child` is `parent` or below it. A folder named e.g. `..runs` inside `parent` is inside. */
export function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  if (rel === "") return true;
  const outside = rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  return !outside;
}

const GATEWAY_PREFIX = /^@[a-z0-9][a-z0-9-]{0,62}\/([a-z0-9-]{1,32}\.){0,4}$/;

/**
 * The gateway settings (AOPS-ROUTE-002); read only when `AI_GATEWAY=portkey`. Errors name the variable and the rule.
 * `null` with errors recorded when a setting is missing or invalid (AI then stays disabled).
 */
function parseGateway(r: Reader): GatewayConfig | null {
  const before = r.errors.length;
  const rawUrl = r.raw("AI_GATEWAY_URL");
  let url: URL | null = null;
  try {
    url = rawUrl ? new URL(rawUrl) : null;
  } catch {
    url = null;
  }
  const host = url?.hostname.toLowerCase() ?? "";
  const urlPath = url?.pathname.replace(/\/+$/, "") ?? "";
  if (
    !url ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    /\/v1$/i.test(urlPath) ||
    host === "anthropic.com" ||
    host.endsWith(".anthropic.com")
  ) {
    r.errors.push("AI_GATEWAY_URL must be an https URL of the gateway root (no credentials, query, fragment or trailing /v1; not an anthropic.com host)");
  }
  const prefix = r.raw("AI_GATEWAY_MODEL_PREFIX");
  if (!prefix || !GATEWAY_PREFIX.test(prefix)) {
    r.errors.push("AI_GATEWAY_MODEL_PREFIX must look like @provider/ or @provider/vendor. (lower-case letters, digits, '-')");
  }
  if (r.errors.length > before || !url || !prefix) return null;
  return Object.freeze({
    kind: "portkey" as const,
    url: `${url.origin}${urlPath}`,
    host,
    modelPrefix: prefix,
    provider: prefix.slice(0, prefix.indexOf("/")),
    allowBulk: r.raw("AI_GATEWAY_ALLOW_BULK") === "1",
  });
}

/**
 * AOPS-ROUTE-008: the refusal for a bulk command (eval harness, chaos run) on the gateway route without
 * `AI_GATEWAY_ALLOW_BULK=1`, or `null` when it may run. Called before any model call; wired in EVAL-T04 and AOPS-T10.
 */
export function gatewayBulkRefusal(config: AiConfig): string | null {
  if (config.route !== "gateway" || config.gateway?.allowBulk) return null;
  return "Bulk model runs through the AI gateway need AI_GATEWAY_ALLOW_BULK=1 for this command.";
}

/** Parses the AI settings. Never throws; never reads a file; never keeps the API key. */
export function loadAiConfig(env: Env = process.env, options: LoadOptions = {}): AiConfigResult {
  const r = new Reader(env);
  const projectDir = path.resolve(options.projectDir ?? process.cwd());

  const steps: Partial<Record<StepName, StepSettings>> = {};
  for (const step of LLM_STEPS) {
    const { envSuffix, defaults } = STEP_AGENTS[step];
    if (!envSuffix) continue;
    const d = defaults!;
    steps[step] = Object.freeze({
      model: r.model(`AI_MODEL_${envSuffix}`, d.model),
      effort: r.oneOf(`AI_EFFORT_${envSuffix}`, EFFORTS, d.effort),
      maxTokens: r.int(`AI_MAX_TOKENS_${envSuffix}`, d.maxTokens, 1, 128_000),
      timeoutMs: r.int(`AI_TIMEOUT_MS_${envSuffix}`, d.timeoutMs, 1_000, 600_000),
    });
  }

  const limits: RunLimits = Object.freeze({
    maxTokens: r.int("AI_RUN_MAX_TOKENS", DEFAULT_LIMITS.maxTokens, 1, 10_000_000),
    maxCostUsd: r.decimal("AI_RUN_MAX_COST_USD", DEFAULT_LIMITS.maxCostUsd, 0, 100),
    maxSeconds: r.int("AI_RUN_MAX_SECONDS", DEFAULT_LIMITS.maxSeconds, 1, 3_600),
  });

  const modelMode = r.oneOf("AI_MODEL_MODE", MODEL_MODES, "live");
  // Replay needs no API key, so it must never be how a real server runs (AOPS-FAIL-007: credentials apply in live mode).
  if (modelMode === "replay" && !isDevOrTest(env.NODE_ENV)) {
    r.errors.push("AI_MODEL_MODE replay is allowed only when NODE_ENV is development or test");
  }
  const faults = parseFaults(r, env.NODE_ENV);

  const runsDir = path.resolve(projectDir, r.raw("AI_RUNS_DIR") ?? path.join("..", "data", "ai-runs"));
  // Checkpoints hold workbook text; they must never land where git could pick them up (ai-data-policy §6).
  if (isInside(runsDir, projectDir)) r.errors.push("AI_RUNS_DIR must be outside the project folder");

  const gateway = r.oneOf("AI_GATEWAY", GATEWAYS, "none") === "portkey" ? parseGateway(r) : null;
  const route: Route = gateway ? "gateway" : "direct";
  // Only the selected route's key is looked at (AOPS-ROUTE-004); its value is never kept.
  const keyName = route === "gateway" ? "PORTKEY_API_KEY" : "ANTHROPIC_API_KEY";

  if (r.errors.length) return { ok: false, errors: [...new Set(r.errors)] };
  return {
    ok: true,
    config: Object.freeze({
      enabled: env.AI_ENABLED === "true",
      hasCredentials: (env[keyName] ?? "").trim() !== "",
      modelMode,
      route,
      gateway,
      steps: Object.freeze(steps),
      limits,
      faults,
      runsDir,
      tracesDir: path.join(runsDir, "traces"),
    }),
  };
}
