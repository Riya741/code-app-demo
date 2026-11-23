// @vitest-environment node
// Gateway mode (spec 024-agent-ops AOPS-ROUTE-001..008, 019-security SEC-SUPPLY-005; CR-20261123-1, ADR-0009). Task
// AOPS-T12. Everything runs against a fake SDK class: no test reaches the gateway or the Anthropic API.
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aiStatus, createModelClient, fakeMessage, type ModelRequest, type SdkLike, type SdkOptions } from "../../server/ai/client";
import { gatewayBulkRefusal, loadAiConfig, type AiConfig, type Env } from "../../server/ai/config";
import { toTraceRecord, type Span } from "../../server/ai/trace";

const PORTKEY = "pk-test-SECRETVALUE-0123456789";
const ANTHROPIC = "sk-ant-test-OTHERSECRET-987654";
const GW: Env = {
  AI_ENABLED: "true",
  AI_GATEWAY: "portkey",
  AI_GATEWAY_URL: "https://portkeygateway.example.com",
  AI_GATEWAY_MODEL_PREFIX: "@aws-bedrock-use2/us.anthropic.",
  PORTKEY_API_KEY: PORTKEY,
};
// Platform-neutral absolute paths (CI runs on Linux, QA-T07): the runs folder is outside the project folder.
const BASE = path.join(os.tmpdir(), "code-app-gateway-test");
const OPTS = { projectDir: path.join(BASE, "project") };
const RUNS = { AI_RUNS_DIR: path.join(BASE, "runs") };

/** An environment that records every variable name read from it. */
function recording(values: Env): { env: Env; read: Set<string> } {
  const read = new Set<string>();
  const env = new Proxy({ ...values }, {
    get(target, name) {
      if (typeof name === "string") read.add(name);
      return (target as Record<string, string | undefined>)[name as string];
    },
  });
  return { env, read };
}

function config(env: Env): AiConfig {
  const r = loadAiConfig({ ...RUNS, ...env }, OPTS);
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r.config;
}

/** A fake SDK class: records its options and the requests, answers with `model` (default: what was asked). */
function fakeSdk(answerModel?: (asked: string) => string) {
  const built: SdkOptions[] = [];
  const requests: ModelRequest[] = [];
  class Sdk implements SdkLike {
    readonly maxRetries: number;
    readonly baseURL: string;
    readonly logLevel: string;
    constructor(readonly options: SdkOptions) {
      built.push(options);
      this.maxRetries = options.maxRetries;
      this.baseURL = options.baseURL;
      this.logLevel = options.logLevel;
    }
    readonly messages = {
      create: async (params: ModelRequest) => {
        requests.push(params);
        return fakeMessage({ model: answerModel ? answerModel(params.model) : params.model, text: "{}" });
      },
    };
  }
  return { Sdk, built, requests };
}

describe("route selection and settings", () => {
  it("AOPS-ROUTE-001 the direct route is the default; an unknown AI_GATEWAY value is a config error naming the variable, not the value", () => {
    expect(config({ AI_ENABLED: "true" })).toMatchObject({ route: "direct", gateway: null });
    expect(config({ AI_GATEWAY: "none" }).route).toBe("direct");
    const bad = loadAiConfig({ ...RUNS, AI_GATEWAY: "openrouter-xyz" }, OPTS);
    expect(bad.ok).toBe(false);
    const errors = (bad as { errors: string[] }).errors.join(" ");
    expect(errors).toContain("AI_GATEWAY");
    expect(errors).not.toContain("openrouter-xyz");
    expect(aiStatus(bad)).toMatchObject({ enabled: false, reason: "disabled" });
  });

  it("AOPS-ROUTE-002 gateway settings: https root URL and a provider prefix are required; errors never echo values", () => {
    const c = config(GW);
    expect(c).toMatchObject({ route: "gateway", gateway: { url: "https://portkeygateway.example.com", host: "portkeygateway.example.com", provider: "@aws-bedrock-use2", allowBulk: false } });
    const bad: [string, string][] = [
      ["AI_GATEWAY_URL", "http://portkeygateway.example.com"],
      ["AI_GATEWAY_URL", "https://portkeygateway.example.com/v1"],
      ["AI_GATEWAY_URL", "https://user:pw@portkeygateway.example.com"],
      ["AI_GATEWAY_URL", "https://portkeygateway.example.com?x=1"],
      ["AI_GATEWAY_URL", "https://api.anthropic.com"],
      ["AI_GATEWAY_URL", ""],
      ["AI_GATEWAY_MODEL_PREFIX", "aws-bedrock-use2/us.anthropic."],
      ["AI_GATEWAY_MODEL_PREFIX", "@AWS/x."],
      ["AI_GATEWAY_MODEL_PREFIX", ""],
    ];
    for (const [name, value] of bad) {
      const r = loadAiConfig({ ...RUNS, ...GW, [name]: value }, OPTS);
      expect(r.ok, `${name}=${value}`).toBe(false);
      const text = (r as { errors: string[] }).errors.join(" ");
      expect(text).toContain(name);
      if (value) expect(text).not.toContain(value);
    }
  });

  it("AOPS-ROUTE-002 on the direct route the gateway variables and PORTKEY_API_KEY are never read", () => {
    const { env, read } = recording({ ...RUNS, AI_ENABLED: "true", ANTHROPIC_API_KEY: ANTHROPIC, PORTKEY_API_KEY: PORTKEY, AI_GATEWAY_URL: "x" });
    const r = loadAiConfig(env, OPTS);
    createModelClient(r, { env, Sdk: fakeSdk().Sdk });
    for (const name of ["AI_GATEWAY_URL", "AI_GATEWAY_MODEL_PREFIX", "AI_GATEWAY_ALLOW_BULK", "PORTKEY_API_KEY"]) expect(read.has(name), name).toBe(false);
  });
});

describe("credentials and the SDK", () => {
  it("AOPS-ROUTE-004 credentials are those of the selected route; a missing key reports no_credentials and builds no client", () => {
    expect(config(GW).hasCredentials).toBe(true);
    expect(config({ ...GW, PORTKEY_API_KEY: undefined, ANTHROPIC_API_KEY: ANTHROPIC }).hasCredentials).toBe(false);
    expect(config({ AI_ENABLED: "true", PORTKEY_API_KEY: PORTKEY }).hasCredentials).toBe(false);
    const missing = loadAiConfig({ ...RUNS, ...GW, PORTKEY_API_KEY: "" }, OPTS);
    expect(aiStatus(missing)).toEqual({ enabled: false, available: false, reason: "no_credentials" });
    const { Sdk, built } = fakeSdk();
    expect(createModelClient(missing, { env: { ...GW, PORTKEY_API_KEY: "" }, Sdk })).toBeNull();
    expect(built).toHaveLength(0);
  });

  it("AOPS-ROUTE-005 the gateway SDK gets the gateway URL, the Portkey key as its only credential, no Anthropic key and the same hardening", () => {
    const { Sdk, built } = fakeSdk();
    const { env, read } = recording({ ...RUNS, ...GW, ANTHROPIC_API_KEY: ANTHROPIC });
    createModelClient(loadAiConfig(env, OPTS), { env, Sdk });
    expect(built).toEqual([{ apiKey: null, authToken: PORTKEY, baseURL: "https://portkeygateway.example.com", maxRetries: 0, logLevel: "off", openTelemetry: false }]);
    expect(read.has("ANTHROPIC_API_KEY")).toBe(false);
    expect(read.has("ANTHROPIC_BASE_URL")).toBe(false);

    const direct = fakeSdk();
    createModelClient(loadAiConfig({ ...RUNS, AI_ENABLED: "true", ANTHROPIC_API_KEY: ANTHROPIC }, OPTS), { env: { ANTHROPIC_API_KEY: ANTHROPIC, PORTKEY_API_KEY: PORTKEY }, Sdk: direct.Sdk });
    expect(direct.built).toEqual([{ apiKey: ANTHROPIC, baseURL: "https://api.anthropic.com", maxRetries: 0, logLevel: "off", openTelemetry: false }]);
  });

  it("AOPS-ROUTE-003 the gateway gets prefix + model; the response comes back with the plain model; another model is a failed call", async () => {
    const ok = fakeSdk((asked) => asked.replace("@aws-bedrock-use2/", ""));
    const client = createModelClient(loadAiConfig({ ...RUNS, ...GW }, OPTS), { env: GW, Sdk: ok.Sdk })!;
    const res = await client.create({ model: "claude-sonnet-5-5", max_tokens: 10, messages: [{ role: "user", content: "x" }] });
    expect(ok.requests[0].model).toBe("@aws-bedrock-use2/us.anthropic.claude-sonnet-5-5");
    expect(res.model).toBe("claude-sonnet-5-5");

    const swapped = fakeSdk(() => "us.anthropic.claude-haiku-5-5");
    const other = createModelClient(loadAiConfig({ ...RUNS, ...GW }, OPTS), { env: GW, Sdk: swapped.Sdk })!;
    await expect(other.create({ model: "claude-sonnet-5-5", max_tokens: 10, messages: [{ role: "user", content: "x" }] })).rejects.toThrow(/different model/);
  });
});

describe("traces, bulk runs and the keys", () => {
  const span = (fields: Partial<Span>): Span => ({ spanId: "0123456789abcdef", runId: "run_aops0t12test", kind: "run", startedAt: "2026-11-23T10:00:00.000Z", latencyMs: 1, outcome: "ok", ...fields });

  it("AOPS-ROUTE-006 the trace keeps route, gateway host and provider slug, and drops anything else in those fields", () => {
    expect(toTraceRecord(span({ route: "gateway", gatewayHost: "portkeygateway.example.com", gatewayProvider: "@aws-bedrock-use2" }))).toMatchObject({ route: "gateway", gatewayHost: "portkeygateway.example.com", gatewayProvider: "@aws-bedrock-use2" });
    const rec = toTraceRecord(span({ route: "other" as never, gatewayHost: `x ${PORTKEY}`, gatewayProvider: PORTKEY }))!;
    expect(rec).not.toHaveProperty("route");
    expect(JSON.stringify(rec)).not.toContain(PORTKEY);
  });

  it("AOPS-ROUTE-008 bulk runs on the gateway route are refused, naming AI_GATEWAY_ALLOW_BULK, unless it is exactly 1", () => {
    expect(gatewayBulkRefusal(config(GW))).toMatch(/AI_GATEWAY_ALLOW_BULK=1/);
    expect(gatewayBulkRefusal(config({ ...GW, AI_GATEWAY_ALLOW_BULK: "yes" }))).not.toBeNull();
    expect(gatewayBulkRefusal(config({ ...GW, AI_GATEWAY_ALLOW_BULK: "1" }))).toBeNull();
    expect(gatewayBulkRefusal(config({ AI_ENABLED: "true" }))).toBeNull();
  });

  it("SEC-SUPPLY-005 neither key appears in the config, the client object or a mismatch error", async () => {
    const c = config({ ...GW, ANTHROPIC_API_KEY: ANTHROPIC });
    const swapped = fakeSdk(() => "other-model");
    const client = createModelClient(loadAiConfig({ ...RUNS, ...GW }, OPTS), { env: GW, Sdk: swapped.Sdk })!;
    const err = await client.create({ model: "claude-sonnet-5-5", max_tokens: 10, messages: [{ role: "user", content: "x" }] }).catch((e: Error) => `${e.name} ${e.message}`);
    for (const text of [JSON.stringify(c), JSON.stringify(client), String(err)]) {
      expect(text).not.toContain(PORTKEY);
      expect(text).not.toContain(ANTHROPIC);
    }
  });

  it("AOPS-ROUTE-007 the gateway route is exercised through an injected SDK only: the fake is what gets built", () => {
    const { Sdk, built } = fakeSdk();
    expect(createModelClient(loadAiConfig({ ...RUNS, ...GW }, OPTS), { env: GW, Sdk })?.mode).toBe("live");
    expect(built).toHaveLength(1);
  });
});
