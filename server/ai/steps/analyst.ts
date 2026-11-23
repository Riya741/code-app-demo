/**
 * Analyst step (spec 022-ai-account-brief, task AIB-T03; agent spec AGENT-ANALYST, prompt analyst.v1). Turns the fact
 * sheet into insights grouped by the brief's sections (analyst-to-writer.v1). Runs inside the orchestrator: it reaches
 * the model only through `ctx.callModel` (AOPS-ORCH-003) and tools only through `ctx.tools.call` (AOPS-ORCH-004).
 *
 * - AIB-SAFE-001: the fact sheet goes in as the one escaped `<fact_sheet>` data block (`wrapFactSheet`); tool results go
 *   in as escaped `<tool_data>` blocks; the prompt says both are data.
 * - AIB-CITE-002: the model must give every point at least one fact ID (contract `minItems`), and this step rejects a
 *   point citing an ID that is not in the fact sheet (agent spec "Done when").
 * - AIB-FAITH-001 / AIB-FAITH-002: the model sees only this customer's allow-listed, redacted records with true counts
 *   and stored calendar days, and the prompt forbids names, numbers and dates not in them. Whether a draft keeps to
 *   that is measured by the eval graders (EVAL-CODE-003, EVAL-CODE-004), not checked here.
 * - AIB-FAITH-003: `no_activity` must match the fact sheet, and a customer without activity gets at most one overview
 *   point (on the customer itself).
 * - Tools: `get_use_case` / `get_event`, `tool_choice: auto` (forced tool use is rejected on current models). At most
 *   `ANALYST_TOOL_ROUNDS` rounds and `ANALYST_TOOL_CALLS` calls; the request after the last round sets
 *   `tool_choice: none`, so the model must answer. A tool outside the allow-list fails the step (`tool_denied`).
 */
import type Anthropic from "@anthropic-ai/sdk";
import { validateContract, type AnalystToWriterV1, type FactSheetV1 } from "../contracts";
import type { StepContext, StepDefinition } from "../orchestrator";
import {
  ANALYST_OUTPUT_SCHEMA,
  LlmStepError,
  checkStop,
  dataBlock,
  jsonReply,
  loadPrompt,
  outputFormat,
  sdkTools,
  systemBlocks,
} from "./llm";
import { wrapFactSheet } from "./retriever";

export const ANALYST_PROMPT_VERSION = "analyst.v1";
/** Model requests that may end in tool calls; one more request (tools off) follows if the model is still calling. */
export const ANALYST_TOOL_ROUNDS = 3;
/** Tool calls per step; further calls get an error result asking the model to answer with what it has. */
export const ANALYST_TOOL_CALLS = 10;

const SECTIONS = ["overview", "wins", "risks", "next_steps"] as const;

/** The instruction after the data block (the system prompt carries the rules). */
const TASK = "Analyse the account in the fact sheet above. Reply with JSON only.";
const CALL_LIMIT = "Tool call limit reached. Answer with the data you already have.";

/** The tool result block for the model: the result as escaped data, or the tool's fixed error text. */
function toolResultBlock(use: Anthropic.ToolUseBlock, result: Awaited<ReturnType<StepContext["tools"]["call"]>>): Anthropic.ToolResultBlockParam {
  if (result.outcome === "ok") {
    return { type: "tool_result", tool_use_id: use.id, content: dataBlock("tool_data", { tool: result.tool }, result.content) };
  }
  return { type: "tool_result", tool_use_id: use.id, is_error: true, content: dataBlock("tool_error", { code: result.code }, result.message) };
}

/** Checks the insights against the fact sheet (agent spec "Done when", AIB-FAITH-003). Throws `LlmStepError`. */
function checkAgainstSheet(analysis: AnalystToWriterV1, sheet: FactSheetV1): void {
  const known = new Set<string>([sheet.customer.fact_id, ...sheet.use_cases.map((u) => u.fact_id), ...sheet.events.map((e) => e.fact_id)]);
  for (const section of SECTIONS) {
    for (const insight of analysis[section]) {
      if (insight.fact_ids.some((id) => !known.has(id))) throw new LlmStepError("invalid_output", "unknown_fact_id");
    }
  }
  const noActivity = sheet.counts.use_cases === 0 && sheet.counts.events === 0;
  if (analysis.no_activity !== noActivity) throw new LlmStepError("invalid_output", "no_activity_mismatch");
  if (noActivity && (analysis.overview.length > 1 || analysis.wins.length + analysis.risks.length + analysis.next_steps.length > 0)) {
    throw new LlmStepError("invalid_output", "points_without_activity");
  }
}

/** The Analyst step: fact-sheet.v1 → analyst-to-writer.v1. */
export async function analyse(sheet: FactSheetV1, ctx: StepContext): Promise<AnalystToWriterV1> {
  const prompt = loadPrompt("analyse");
  const tools = sdkTools(ctx.tools.definitions());
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        { type: "text", text: wrapFactSheet(sheet) },
        { type: "text", text: TASK },
      ],
    },
  ];
  let calls = 0;

  for (let round = 0; ; round++) {
    const toolsOff = round >= ANALYST_TOOL_ROUNDS;
    const response = await ctx.callModel({
      system: systemBlocks(prompt),
      messages,
      ...(tools.length ? { tools, tool_choice: toolsOff ? { type: "none" as const } : { type: "auto" as const } } : {}),
      output_config: { format: outputFormat(ANALYST_OUTPUT_SCHEMA) },
    });

    if (checkStop(response) === "tool_use") {
      if (toolsOff || !tools.length) throw new LlmStepError("invalid_output", toolsOff ? "tool_rounds_exceeded" : "unexpected_tool_use");
      const uses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      // The assistant turn goes back unchanged (thinking blocks included); every tool_use gets a result, in one message.
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of uses) {
        if (calls >= ANALYST_TOOL_CALLS) {
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: CALL_LIMIT });
          continue;
        }
        calls += 1;
        // A tool outside the Analyst's allow-list throws StepFailure("tool_denied") here and fails the step.
        results.push(toolResultBlock(use, await ctx.tools.call(use.name, use.input)));
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    // Code owns `contract` and `run_id`: written after the model's fields, so the model cannot set them.
    const output = { ...jsonReply(response), contract: "analyst-to-writer.v1", run_id: ctx.runId };
    const checked = validateContract("analyst-to-writer.v1", output);
    if ("errors" in checked) throw new LlmStepError("invalid_output", "contract", checked.errors);
    const analysis = checked.value as AnalystToWriterV1;
    checkAgainstSheet(analysis, sheet);
    return analysis;
  }
}

/** The orchestrator's `analyse` step. */
export const analystStep: StepDefinition<"analyse"> = Object.freeze({ run: analyse, promptVersion: ANALYST_PROMPT_VERSION });
