// @vitest-environment node
// The model client seam and AI status (spec 024-agent-ops: AOPS-FAIL-007, AOPS-ORCH-003, AOPS-OBS-007, AOPS-OBS-002).
// Task AOPS-T01.
//
// Offline: the SDK class is replaced by a counting stand-in, except in one test that constructs the real client with a
// dummy key to read its retry setting (constructing it makes no request).
import os from "node:os";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE_URL,
  aiStatus,
  classifyModelError,
  createFakeModelClient,
  createModelClient,
  fakeMessage,
  type ModelClient,
  type ModelRequest,
  type SdkConstructor,
  type SdkLike,
  type SdkOptions,
} from "../../server/ai/client";
import { loadAiConfig, type Env } from "../../server/ai/config";

const PROJECT = path.join(os.tmpdir(), "code-app-client-test", "project");
const load = (env: Env) => loadAiConfig(env, { projectDir: PROJECT });

/** An SDK stand-in that counts constructions and records calls. */
function countingSdk() {
  const constructed: SdkOptions[] = [];
  const calls: { params: ModelRequest; options?: { signal?: AbortSignal; timeout?: number } }[] = [];
  class FakeSdk implements SdkLike {
    readonly maxRetries: number;
    readonly baseURL: string;
    readonly logLevel: string;
    readonly messages = {
      create: async (params: ModelRequest, options?: { signal?: AbortSignal; timeout?: number }) => {
        calls.push({ params, options });
        return fakeMessage({ text: "ok" });
      },
    };
    constructor(options: SdkOptions) {
      constructed.push(options);
      this.maxRetries = options.maxRetries;
      this.baseURL = options.baseURL;
      this.logLevel = options.logLevel;
    }
  }
  return { Sdk: FakeSdk as SdkConstructor, constructed, calls };
}

/** The options every live SDK client must be built with (AOPS-OBS-002, AOPS-T03). */
const SDK_OPTIONS = (apiKey: string): SdkOptions => ({
  apiKey,
  baseURL: DEFAULT_BASE_URL,
  maxRetries: 0,
  logLevel: "off",
  openTelemetry: false,
});

/** Runs `fn` with extra process environment variables, then restores the environment. */
function withProcessEnv<T>(extra: Record<string, string>, fn: () => T): T {
  const saved = { ...process.env };
  Object.assign(process.env, extra);
  try {
    return fn();
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}

describe("degrade gracefully", () => {
  it("AOPS-FAIL-007 with AI_ENABLED not true the model client is never created and status reports enabled: false", () => {
    for (const value of [undefined, "false", "1", "TRUE"]) {
      const env = { AI_ENABLED: value, ANTHROPIC_API_KEY: "sk-test-key" };
      const sdk = countingSdk();
      const result = load(env);
      expect(createModelClient(result, { env, Sdk: sdk.Sdk }), String(value)).toBeNull();
      expect(sdk.constructed).toHaveLength(0);
      expect(aiStatus(result)).toEqual({ enabled: false, available: false, reason: "disabled" });
    }
  });

  it("AOPS-FAIL-007 with AI enabled but no API key the client is never created and status reports enabled: false, no_credentials", () => {
    for (const key of [undefined, "", "   "]) {
      const env = { AI_ENABLED: "true", ANTHROPIC_API_KEY: key };
      const sdk = countingSdk();
      const result = load(env);
      expect(createModelClient(result, { env, Sdk: sdk.Sdk })).toBeNull();
      expect(sdk.constructed).toHaveLength(0);
      expect(aiStatus(result)).toEqual({ enabled: false, available: false, reason: "no_credentials" });
    }
  });

  it("AOPS-FAIL-007 with an invalid AI setting the client is never created and status reports enabled: false", () => {
    const env = { AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-key", AI_EFFORT_WRITER: "extreme" };
    const sdk = countingSdk();
    const result = load(env);
    expect(result.ok).toBe(false);
    expect(createModelClient(result, { env, Sdk: sdk.Sdk })).toBeNull();
    expect(sdk.constructed).toHaveLength(0);
    expect(aiStatus(result)).toEqual({ enabled: false, available: false, reason: "disabled" });
  });

  it("AOPS-FAIL-007 with AI enabled and a key the client is created once, SDK retries off, and the key is not exposed", () => {
    const env = { AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-SECRET-123" };
    const sdk = countingSdk();
    const result = load(env);
    const client = createModelClient(result, { env, Sdk: sdk.Sdk });
    expect(client).not.toBeNull();
    expect(client!.mode).toBe("live");
    expect(sdk.constructed).toEqual([SDK_OPTIONS("sk-test-SECRET-123")]);
    expect(aiStatus(result)).toEqual({ enabled: true, available: true });
    expect(JSON.stringify(client)).not.toContain("SECRET");
    expect(JSON.stringify(result)).not.toContain("SECRET");

    // The real SDK client, built the same way, has its own retries switched off (resilience.ts owns retries).
    const real = createModelClient(result, { env }) as ModelClient & { sdkSettings: { maxRetries: number } };
    expect(real.sdkSettings.maxRetries).toBe(0);
    expect(JSON.stringify(real)).not.toContain("SECRET");
    expect(Object.values(real).some((v) => typeof v === "object" && v !== null)).toBe(false);
  });

  it("AOPS-FAIL-007 status reports breaker_open while the breaker is open (enabled stays true)", () => {
    const result = load({ AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-key" });
    expect(aiStatus(result, { isOpen: () => true })).toEqual({ enabled: true, available: false, reason: "breaker_open" });
    expect(aiStatus(result, { isOpen: () => false })).toEqual({ enabled: true, available: true });
  });

  it("AOPS-FAIL-007 replay mode in development or test needs no key and uses only the replay factory (AOPS-T09 extension point)", () => {
    for (const nodeEnv of ["test", "development"]) {
      const env = { AI_ENABLED: "true", AI_MODEL_MODE: "replay", NODE_ENV: nodeEnv };
      const sdk = countingSdk();
      const result = load(env);
      expect(aiStatus(result), nodeEnv).toEqual({ enabled: true, available: true });
      expect(createModelClient(result, { env, Sdk: sdk.Sdk })).toBeNull();
      const replay = createFakeModelClient([fakeMessage({ text: "recorded" })]);
      expect(createModelClient(result, { env, Sdk: sdk.Sdk, replay: () => replay })).toBe(replay);
      expect(sdk.constructed).toHaveLength(0);
    }
  });

  it("AOPS-FAIL-007 replay mode outside development and test is a config error: no client, enabled: false", () => {
    for (const nodeEnv of ["production", undefined]) {
      const env = { AI_ENABLED: "true", AI_MODEL_MODE: "replay", NODE_ENV: nodeEnv };
      const sdk = countingSdk();
      const result = load(env);
      expect(result.ok, String(nodeEnv)).toBe(false);
      expect("errors" in result ? result.errors.join("\n") : "").toContain("AI_MODEL_MODE");
      const replay = createFakeModelClient([fakeMessage({ text: "recorded" })]);
      expect(createModelClient(result, { env, Sdk: sdk.Sdk, replay: () => replay })).toBeNull();
      expect(sdk.constructed).toHaveLength(0);
      expect(aiStatus(result)).toEqual({ enabled: false, available: false, reason: "disabled" });
    }
  });
});

describe("SDK client settings", () => {
  it("AOPS-OBS-002 the SDK client is built with logging and SDK telemetry off, the fixed API host and no retries, whatever the environment says", () => {
    const hostile = { ANTHROPIC_LOG: "debug", ANTHROPIC_BASE_URL: "https://example.invalid", ANTHROPIC_OPEN_TELEMETRY_TRACES_CONTENT_MODE: "content" };
    const env = { AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-key", ...hostile };
    const sdk = countingSdk();
    withProcessEnv(hostile, () => createModelClient(load(env), { env, Sdk: sdk.Sdk }));
    expect(DEFAULT_BASE_URL).toBe("https://api.anthropic.com");
    expect(sdk.constructed).toEqual([SDK_OPTIONS("sk-test-key")]);

    // The real SDK, with the same hostile process environment, settles on those values.
    const real = withProcessEnv(hostile, () => createModelClient(load(env), { env })) as ModelClient & {
      sdkSettings: { maxRetries: number; baseURL: string; logLevel: string | undefined };
    };
    expect(real.sdkSettings).toEqual({ maxRetries: 0, baseURL: DEFAULT_BASE_URL, logLevel: "off" });
  });
});

describe("live client calls", () => {
  it("AOPS-ORCH-003 the live client passes the step's timeout and the run's abort signal to the SDK call", async () => {
    const env = { AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-test-key" };
    const sdk = countingSdk();
    const client = createModelClient(load(env), { env, Sdk: sdk.Sdk })!;
    const signal = new AbortController().signal;
    const params: ModelRequest = { model: "claude-sonnet-5-5", max_tokens: 8000, messages: [{ role: "user", content: "x" }] };
    const reply = await client.create(params, { signal, timeoutMs: 45_000 });
    expect(reply.type).toBe("message");
    expect(sdk.calls).toEqual([{ params, options: { signal, timeout: 45_000 } }]);
  });

  it("AOPS-OBS-007 model errors are classified by SDK error class for the span's error code", () => {
    const h = new Headers();
    const gen = (status: number) => Anthropic.APIError.generate(status, undefined, "message text is never read", h);
    expect(classifyModelError(gen(429))).toBe("rate_limited");
    expect(classifyModelError(gen(529))).toBe("overloaded");
    expect(classifyModelError(gen(500))).toBe("server_error");
    expect(classifyModelError(gen(503))).toBe("server_error");
    expect(classifyModelError(gen(401))).toBe("auth");
    expect(classifyModelError(gen(400))).toBe("bad_request");
    expect(classifyModelError(gen(404))).toBe("api_error");
    expect(classifyModelError(new Anthropic.APIConnectionTimeoutError())).toBe("timeout");
    expect(classifyModelError(new Anthropic.APIConnectionError({ message: "reset" }))).toBe("network");
    expect(classifyModelError(new Anthropic.APIUserAbortError())).toBe("aborted");
    // A plain error that merely mentions a status is not classified by its text.
    expect(classifyModelError(new Error("429 rate limited"))).toBe("unknown");
  });
});
