/**
 * Writer step (spec 022-ai-account-brief, task AIB-T03; agent spec AGENT-WRITER, prompt writer.v2 since AIB-T11). Turns the
 * Analyst's insights into plain-text sentences in four fixed sections (writer-draft.v1). No tools: none are offered,
 * and a tool call is rejected as invalid output (agent spec "Tools").
 *
 * - AIB-FMT-001: exactly the sections Overview, Wins, Risks, Next steps, in that order (checked here: the contract fixes
 *   the count and the names, not the order); an empty section has one sentence saying so (prompt rule 2).
 * - AIB-CITE-002: every sentence carries `fact_ids` (contract) and the prompt requires at least one on each factual
 *   sentence, taken from the analysis. Whether they do, and whether each cited ID is in the fact sheet, is the Guard's
 *   citation check (AIB-CITE-003, AIB-T04), which marks the draft `unverified` rather than failing the run
 *   (CR-20261121-1); this step does not reject or repair citations.
 * - AIB-FAITH-001 / AIB-FAITH-002: the Writer sees only the analysis (no workbook data), and the prompt forbids names,
 *   numbers and dates that the points do not give; measured by the eval graders.
 * - AIB-SAFE-001: the analysis goes in as one escaped `<analysis>` data block, without `contract` and `run_id`.
 * - The 350-word budget (AIB-FMT-002) is asked for in the prompt and enforced by the Guard (AIB-T04).
 * - AIB-CITE-005: the prompt asks for 1 to 3 fact IDs per sentence; the Guard shows at most 3 markers either way.
 */
import { SECTION_HEADINGS, validateContract, type AnalystToWriterV1, type WriterDraftV1 } from "../contracts";
import type { StepContext, StepDefinition, StepInputs } from "../orchestrator";
import { LlmStepError, WRITER_OUTPUT_SCHEMA, dataBlock, jsonReply, loadPrompt, outputFormat, systemBlocks } from "./llm";

export const WRITER_PROMPT_VERSION = "writer.v2";

const TASK = "Write the executive summary from the analysis above. Reply with JSON only.";

/** The analysis as the Writer's data block: the insights only. */
export function wrapAnalysis(analysis: AnalystToWriterV1): string {
  const { no_activity, overview, wins, risks, next_steps } = analysis;
  return dataBlock("analysis", { contract: analysis.contract }, { no_activity, overview, wins, risks, next_steps });
}

/** The Writer step: analyst-to-writer.v1 → writer-draft.v1. */
export async function write(input: StepInputs["write"], ctx: StepContext): Promise<WriterDraftV1> {
  const prompt = loadPrompt("write");
  const response = await ctx.callModel({
    system: systemBlocks(prompt),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: wrapAnalysis(input.analysis) },
          { type: "text", text: TASK },
        ],
      },
    ],
    output_config: { format: outputFormat(WRITER_OUTPUT_SCHEMA) },
  });

  // `jsonReply` checks stop_reason first; a tool call (none offered) is invalid output.
  const output = { ...jsonReply(response), contract: "writer-draft.v1", run_id: ctx.runId, revision: input.revision };
  const checked = validateContract("writer-draft.v1", output);
  if ("errors" in checked) throw new LlmStepError("invalid_output", "contract", checked.errors);
  const draft = checked.value as WriterDraftV1;
  if (draft.sections.some((s, i) => s.heading !== SECTION_HEADINGS[i])) throw new LlmStepError("invalid_output", "section_order");
  return draft;
}

/** The orchestrator's `write` step. */
export const writerStep: StepDefinition<"write"> = Object.freeze({ run: write, promptVersion: WRITER_PROMPT_VERSION });
