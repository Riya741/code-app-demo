/**
 * The model client seam (spec 024-agent-ops, task AOPS-T01; design decision D1).
 *
 * - `ModelClient.create(params)` is the only way the pipeline reaches a model. It uses the SDK's own types
 *   (`Anthropic.MessageCreateParamsNonStreaming`, `Anthropic.Message`), so the live, fake and replay clients are
 *   interchangeable.
 * - AOPS-FAIL-007 / Article XII.8: `createModelClient` returns `null`, and never constructs the SDK client, unless
 *   `AI_ENABLED=true`, the config is valid and `ANTHROPIC_API_KEY` is set. `aiStatus` then reports `enabled: false`.
 * - The live client is created with `maxRetries: 0`: retries belong to the resilience layer (AOPS-T03), so every retry
 *   is counted and traced (design "Alternatives considered"). Logging and SDK telemetry are off and the host is fixed
 *   (`SdkOptions`). The key is passed explicitly from the environment, so the SDK never falls back to credential
 *   files, and it is held only in a private field.
 * - Replay (`AI_MODEL_MODE=replay`, AOPS-T09; development and test only, config.ts) plugs in through
 *   `ClientDeps.replay`; it needs no credentials.
 * - Errors are classified by the SDK's typed error classes, never by message text.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { AiConfigResult, Env } from "./config";

export type ModelRequest = Anthropic.MessageCreateParamsNonStreaming;
export type ModelResponse = Anthropic.Message;

export interface ModelCallOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface ModelClient {
  readonly mode: "live" | "replay" | "fake";
  create(params: ModelRequest, options?: ModelCallOptions): Promise<ModelResponse>;
}

/* ------------------------------------------------------------------------------------------- status */

export type AiUnavailableReason = "disabled" | "no_credentials" | "breaker_open";

/** `GET /api/ai/status` body (022 design, AIB-API-004); computed without calling the model. */
export interface AiStatus {
  readonly enabled: boolean;
  readonly available: boolean;
  readonly reason?: AiUnavailableReason;
}

/** The circuit breaker's view (AOPS-FAIL-006, AOPS-T06). */
export interface BreakerView {
  isOpen(): boolean;
}

/**
 * Whether AI is enabled and available. An invalid config reports `disabled` (the errors are for the server log, never
 * for the browser). Replay mode needs no credentials.
 */
export function aiStatus(result: AiConfigResult, breaker?: BreakerView): AiStatus {
  if (!result.ok || !result.config.enabled) return { enabled: false, available: false, reason: "disabled" };
  if (result.config.modelMode === "live" && !result.config.hasCredentials) {
    return { enabled: false, available: false, reason: "no_credentials" };
  }
  if (breaker?.isOpen()) return { enabled: true, available: false, reason: "breaker_open" };
  return { enabled: true, available: true };
}

/* ------------------------------------------------------------------------------------------- live client */

/** The only API host the pipeline talks to; passed explicitly so `ANTHROPIC_BASE_URL` cannot redirect it silently. */
export const DEFAULT_BASE_URL = "https://api.anthropic.com";

/**
 * Every option that would otherwise fall back to an environment variable is set explicitly (AOPS-OBS-002, Article III):
 * - `logLevel: "off"`: `ANTHROPIC_LOG=debug` can never print request or response bodies (prompts, model output);
 * - `openTelemetry: false`: no SDK spans, so `ANTHROPIC_OPEN_TELEMETRY_TRACES_CONTENT_MODE` cannot export content;
 * - `baseURL`: `ANTHROPIC_BASE_URL` is ignored;
 * - `apiKey`: no credential files or profiles are consulted;
 * - `maxRetries: 0`: retries are the resilience layer's (AOPS-T03).
 * Not closable by an option: `ANTHROPIC_CUSTOM_HEADERS` still adds headers (recorded in the AOPS-T01 hand-off).
 */
export interface SdkOptions {
  apiKey: string;
  baseURL: string;
  maxRetries: 0;
  logLevel: "off";
  openTelemetry: false;
}

/** The part of the SDK client this module uses; lets a test count constructions without a network. */
export interface SdkLike {
  readonly maxRetries: number;
  readonly baseURL: string;
  readonly logLevel?: string;
  readonly messages: {
    create(params: ModelRequest, options?: { signal?: AbortSignal; timeout?: number }): PromiseLike<ModelResponse>;
  };
}

export type SdkConstructor = new (options: SdkOptions) => SdkLike;

class LiveModelClient implements ModelClient {
  readonly mode = "live" as const;
  // A true private field: the SDK client holds the key, so it must not show up in a log or `JSON.stringify` of this.
  readonly #sdk: SdkLike;

  constructor(sdk: SdkLike) {
    this.#sdk = sdk;
  }

  /** For tests: the SDK client's settled retry, host and log settings (never the key). */
  get sdkSettings(): { maxRetries: number; baseURL: string; logLevel: string | undefined } {
    return { maxRetries: this.#sdk.maxRetries, baseURL: this.#sdk.baseURL, logLevel: this.#sdk.logLevel };
  }

  async create(params: ModelRequest, options: ModelCallOptions = {}): Promise<ModelResponse> {
    return await this.#sdk.messages.create(params, { signal: options.signal, timeout: options.timeoutMs });
  }
}

export interface ClientDeps {
  /** Where `ANTHROPIC_API_KEY` is read from. Default: `process.env`. */
  readonly env?: Env;
  /** The SDK client class. Default: `Anthropic`. */
  readonly Sdk?: SdkConstructor;
  /** Replay model factory (AOPS-T09). Without it, replay mode has no client. */
  readonly replay?: () => ModelClient;
}

/**
 * The model client for this server, or `null` when AI must not reach a model (AOPS-FAIL-007): AI disabled, config
 * invalid, or live mode without `ANTHROPIC_API_KEY`. Nothing is constructed in those cases.
 */
export function createModelClient(result: AiConfigResult, deps: ClientDeps = {}): ModelClient | null {
  if (!aiStatus(result).enabled || !result.ok) return null;
  if (result.config.modelMode === "replay") return deps.replay ? deps.replay() : null;
  const apiKey = (deps.env ?? process.env).ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const Sdk = deps.Sdk ?? (Anthropic as unknown as SdkConstructor);
  return new LiveModelClient(new Sdk({ apiKey, baseURL: DEFAULT_BASE_URL, maxRetries: 0, logLevel: "off", openTelemetry: false }));
}

/* ------------------------------------------------------------------------------------------- fake client */

export type FakeReply = ModelResponse | Error | ((params: ModelRequest, call: number) => ModelResponse | Error);

export interface FakeModelClient extends ModelClient {
  /** Every request received, in order (tests only; never traced). */
  readonly calls: { params: ModelRequest; options: ModelCallOptions }[];
}

/** An in-memory client for tests: replies in order; the last reply repeats. An `Error` reply is thrown. */
export function createFakeModelClient(replies: FakeReply[]): FakeModelClient {
  const calls: { params: ModelRequest; options: ModelCallOptions }[] = [];
  return {
    mode: "fake",
    calls,
    async create(params, options = {}) {
      calls.push({ params, options });
      if (replies.length === 0) throw new Error("fake model client has no replies");
      const reply = replies[Math.min(calls.length, replies.length) - 1];
      const out = typeof reply === "function" ? reply(params, calls.length) : reply;
      if (out instanceof Error) throw out;
      return out;
    },
  };
}

/** A well-formed `Anthropic.Message` for fakes and recorded fixtures. */
export function fakeMessage(fields: {
  model?: string;
  content?: Anthropic.ContentBlock[];
  text?: string;
  stopReason?: Anthropic.StopReason;
  usage?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
}): ModelResponse {
  const content: Anthropic.ContentBlock[] = fields.content ?? [{ type: "text", text: fields.text ?? "", citations: null }];
  return {
    id: "msg_fake",
    type: "message",
    role: "assistant",
    model: fields.model ?? "claude-sonnet-5-5",
    container: null,
    content,
    diagnostics: null,
    stop_details: null,
    stop_reason: fields.stopReason ?? "end_turn",
    stop_sequence: null,
    usage: {
      cache_creation: null,
      cache_creation_input_tokens: fields.usage?.cacheWrite ?? 0,
      cache_read_input_tokens: fields.usage?.cacheRead ?? 0,
      inference_geo: null,
      input_tokens: fields.usage?.input ?? 0,
      output_tokens: fields.usage?.output ?? 0,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: null,
      speed: null,
    },
  };
}

/* ------------------------------------------------------------------------------------------- errors */

export const MODEL_ERROR_CODES = [
  "aborted",
  "timeout",
  "network",
  "rate_limited",
  "overloaded",
  "server_error",
  "auth",
  "bad_request",
  "api_error",
  "unknown",
] as const;
export type ModelErrorCode = (typeof MODEL_ERROR_CODES)[number];

/**
 * A model-call failure as an enum for spans and for the resilience layer (AOPS-T03 decides what to retry). Uses the
 * SDK's typed errors only; the error message is never read.
 */
export function classifyModelError(e: unknown): ModelErrorCode {
  if (e instanceof Anthropic.APIUserAbortError) return "aborted";
  if (e instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (e instanceof Anthropic.APIConnectionError) return "network";
  if (e instanceof Anthropic.RateLimitError) return "rate_limited";
  if (e instanceof Anthropic.OverloadedError) return "overloaded";
  if (e instanceof Anthropic.InternalServerError) return "server_error";
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return "auth";
  if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.UnprocessableEntityError) return "bad_request";
  if (e instanceof Anthropic.APIError) return "api_error";
  if (e instanceof Error && e.name === "AbortError") return "aborted";
  return "unknown";
}
