/**
 * Shared helpers for the two LLM steps, Analyst and Writer (spec 022-ai-account-brief, task AIB-T03).
 *
 * - Prompts: `server/ai/prompts/<name>.<version>.md`, each starting with the header
 *   `<!-- agent-spec: AGENT-X@<version> · requirements: … -->` (Article XII, spec lint check 11). `loadPrompt` checks
 *   that the header names the step's agent and the version in `STEP_AGENTS` (which a config test checks against the
 *   agent spec), so a prompt written for another agent version is never sent. The leading HTML comments are not sent.
 * - Output: structured outputs (`output_config.format`, 024 design "SDK usage notes"), then zod again at the boundary.
 *   `stop_reason` is checked before any content is read: a refusal or a truncated reply is never parsed
 *   (AOPS-FAIL-004 and AOPS-FAIL-005; their retry and fallback are AOPS-T03).
 * - Errors carry a code the orchestrator keeps (`invalid_output`, `model_error`) and a fixed reason for tests and the
 *   hand-off; never model text or workbook text (AOPS-OBS-002).
 */
import fs from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import type { ModelResponse } from "../client";
import { STEP_AGENTS, type StepName } from "../config";
import type { ModelToolDefinition } from "../tools";
import { jsonForPrompt } from "./retriever";

/* ------------------------------------------------------------------------------------------- errors */

/** Why an LLM step rejected a reply. Fixed values only: no model or workbook text. */
export const LLM_STEP_REASONS = [
  "refusal",
  "max_tokens",
  "unexpected_stop",
  "unexpected_tool_use",
  "tool_rounds_exceeded",
  "not_json",
  "contract",
  "unknown_fact_id",
  "no_activity_mismatch",
  "points_without_activity",
  "section_order",
] as const;
export type LlmStepReason = (typeof LLM_STEP_REASONS)[number];

/**
 * A rejected model reply. `code` is a run error code the orchestrator keeps (`reportedCode`): `model_error` for a
 * refusal or truncation (AOPS-T03 adds the retry), `invalid_output` for a reply that does not make a valid hand-off
 * (AOPS-T04 adds the one repair retry). Never repaired here.
 */
export class LlmStepError extends Error {
  constructor(
    readonly code: "invalid_output" | "model_error",
    readonly reason: LlmStepReason,
    /** Contract errors (paths and rules only, never values; server/ai/contracts.ts). */
    readonly errors: readonly string[] = [],
  ) {
    super(`${code}: ${reason}`);
    this.name = "LlmStepError";
  }
}

/* ------------------------------------------------------------------------------------------- prompts */

/** The prompt file of each LLM step (agent spec "Implementation"). */
const PROMPT_NAMES: Readonly<Partial<Record<StepName, string>>> = Object.freeze({ analyse: "analyst", write: "writer" });

/** The prompt version each step uses (writer.v2 since AIB-T11, CR-20261124-1). */
export const PROMPT_VERSIONS = Object.freeze({ analyse: "v1", write: "v2" } as const);

export interface Prompt {
  /** e.g. `analyst.v1`; recorded on the step's spans as `promptVersion`. */
  readonly version: string;
  readonly agent: string;
  readonly agentVersion: string;
  /** The system prompt: the file without its leading HTML comments. */
  readonly text: string;
}

const HEADER = /^<!--\s*agent-spec:\s*(AGENT-[A-Z0-9-]+?)@(\d+\.\d+\.\d+)\s[^\n]*?-->/;
const LEADING_COMMENTS = /^(?:\s*<!--[\s\S]*?-->)+\s*/;

/** The prompt file does not cite the step's agent spec at its current version: a code defect, never sent. */
export class PromptHeaderError extends Error {
  readonly code = "step_failed" as const;
  constructor(readonly file: string) {
    super(`Prompt ${file} does not cite its agent spec at the version in STEP_AGENTS`);
    this.name = "PromptHeaderError";
  }
}

const cache = new Map<string, Prompt>();

/** Reads and checks a step's prompt once per process. Throws `PromptHeaderError` on a header that does not match. */
export function loadPrompt(step: "analyse" | "write", version: string = PROMPT_VERSIONS[step]): Prompt {
  const name = `${PROMPT_NAMES[step]}.${version}`;
  const hit = cache.get(name);
  if (hit) return hit;
  const file = new URL(`../prompts/${name}.md`, import.meta.url);
  const raw = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const m = HEADER.exec(raw);
  const { agent, agentVersion } = STEP_AGENTS[step];
  if (!m || m[1] !== agent || m[2] !== agentVersion) throw new PromptHeaderError(`${name}.md`);
  const prompt: Prompt = Object.freeze({ version: name, agent: m[1], agentVersion: m[2], text: raw.replace(LEADING_COMMENTS, "").trimEnd() });
  cache.set(name, prompt);
  return prompt;
}

/** The system prompt as one cached block (024 design: stable system prompts carry `cache_control`). */
export function systemBlocks(prompt: Prompt): Anthropic.TextBlockParam[] {
  return [{ type: "text", text: prompt.text, cache_control: { type: "ephemeral" } }];
}

/**
 * The step's allowed tool definitions in the SDK's shape, strict as built by tools.ts; the last one carries
 * `cache_control`, so the tool list is cached with the system prompt (024 design "SDK usage notes").
 */
export function sdkTools(defs: readonly ModelToolDefinition[]): Anthropic.Tool[] {
  return defs.map((d, i) => ({
    name: d.name,
    description: d.description,
    input_schema: { ...d.input_schema },
    strict: d.strict,
    ...(i === defs.length - 1 ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

/** A delimited data block for a prompt (AIB-SAFE-001): escaped JSON that text inside it cannot close. */
export function dataBlock(tag: string, attributes: Readonly<Record<string, string>>, value: unknown): string {
  const attrs = Object.entries(attributes)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join("");
  return `<${tag}${attrs}>\n${jsonForPrompt(value)}\n</${tag}>`;
}

/* ------------------------------------------------------------------------------------------- replies */

/**
 * Checks `stop_reason` before anything is read (024 design). A refusal or a reply cut at `max_tokens` is never parsed;
 * `tool_use` is returned to the caller, which decides whether tools were allowed.
 */
export function checkStop(response: ModelResponse): "end_turn" | "tool_use" {
  switch (response.stop_reason) {
    case "end_turn":
    case "stop_sequence":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "refusal":
      throw new LlmStepError("model_error", "refusal");
    case "max_tokens":
      throw new LlmStepError("model_error", "max_tokens");
    default:
      // `pause_turn` (server tools only, none are offered), null or a stop reason this code does not know.
      throw new LlmStepError("model_error", "unexpected_stop");
  }
}

/** The JSON object of a finished structured-output reply. Throws `LlmStepError` for anything else. */
export function jsonReply(response: ModelResponse): Record<string, unknown> {
  if (checkStop(response) === "tool_use") throw new LlmStepError("invalid_output", "unexpected_tool_use");
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new LlmStepError("invalid_output", "not_json");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new LlmStepError("invalid_output", "not_json");
  return value as Record<string, unknown>;
}

/** The JSON Schema for `output_config.format`. */
export function outputFormat(schema: Readonly<Record<string, unknown>>): Anthropic.JSONOutputFormat {
  return { type: "json_schema", schema: schema as Record<string, unknown> };
}

/* ------------------------------------------------------------------------------------------- model schemas */

// What the model is asked to return: the step's output contract without the fields code owns (`contract`, `run_id`,
// `revision`) and without the keywords structured outputs do not accept (lengths, item counts, patterns); those are
// checked by zod when the step validates its output, and again by the orchestrator (AOPS-ORCH-002). A test derives
// these schemas from spec/contracts/*.schema.json the same way and compares them.

const factIds = { type: "array", items: { type: "string" } } as const;

const insights = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["point", "fact_ids"],
    properties: { point: { type: "string" }, fact_ids: factIds },
  },
} as const;

/** analyst-to-writer.v1 without `contract` and `run_id`. */
export const ANALYST_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["overview", "wins", "risks", "next_steps", "no_activity"],
  properties: { no_activity: { type: "boolean" }, overview: insights, wins: insights, risks: insights, next_steps: insights },
});

/** writer-draft.v1 without `contract`, `run_id` and `revision`. */
export const WRITER_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "sentences"],
        properties: {
          heading: { enum: ["Overview", "Wins", "Risks", "Next steps"] },
          sentences: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "factual", "fact_ids"],
              properties: { text: { type: "string" }, factual: { type: "boolean" }, fact_ids: factIds },
            },
          },
        },
      },
    },
  },
});
