// @vitest-environment node
// One live check of the Analyst and Writer steps against the real API (task AIB-T03). Skipped unless both
// AI_LIVE_CHECK=1 and the selected route's key are set, so `npm test` never calls a model or needs a key. Run it with:
//
//   $env:AI_LIVE_CHECK = "1"; npx vitest run tests/integration/analyst-writer.live.test.ts
//   Gateway route (CR-20261123-1) also: AI_GATEWAY=portkey, AI_GATEWAY_URL=<gateway root, no /v1>,
//   AI_GATEWAY_MODEL_PREFIX=@aws-bedrock-use2/us.anthropic. and PORTKEY_API_KEY in the environment.
//
// Uses the fictional 8-customer fixture only (ADR-0006) and the agent-spec defaults (claude-sonnet-5-5, effort medium):
// two model calls, a few cents. The key is read by the client from the environment and never printed; traces go to a
// temp folder outside the project and are deleted afterwards.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateContract, type AnalystToWriterV1, type FactSheetV1, type WriterDraftV1 } from "../../server/ai/contracts";
import { createModelClient } from "../../server/ai/client";
import { loadAiConfig } from "../../server/ai/config";
import { openReadOnlyStore, runBrief, type StepRegistry } from "../../server/ai/orchestrator";
import { analystStep } from "../../server/ai/steps/analyst";
import { retrieve } from "../../server/ai/steps/retriever";
import { writerStep } from "../../server/ai/steps/writer";
import { eventsByParent, useCasesByParent as liveUseCases } from "../../server/workbook";
import { ROOT, workbookApi } from "./harness";

// The selected route's key (AOPS-ROUTE-004, AOPS-ROUTE-007): PORTKEY_API_KEY when AI_GATEWAY=portkey, else ANTHROPIC_API_KEY.
const routeKey = process.env.AI_GATEWAY === "portkey" ? process.env.PORTKEY_API_KEY : process.env.ANTHROPIC_API_KEY;
const live = process.env.AI_LIVE_CHECK === "1" && (routeKey ?? "").trim() !== "";

describe.skipIf(!live)("live check (AI_LIVE_CHECK=1)", () => {
  const api = workbookApi();

  it("AIB-FMT-001 a live run of retrieve → analyse → write returns a cited four-section draft from the fixture", async () => {
    const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-ai-live-"));
    try {
      const result = loadAiConfig({ ...process.env, NODE_ENV: "test", AI_ENABLED: "true", AI_MODEL_MODE: "live", AI_RUNS_DIR: runsDir }, { projectDir: ROOT });
      if ("errors" in result) throw new Error(result.errors.join("; "));
      const client = createModelClient(result);
      expect(client?.mode).toBe("live");

      const store = openReadOnlyStore(api.file);
      await store.fresh();
      const customerId = (store.table("customer").rows as { id: number }[])
        .map((c) => c.id)
        .find((id) => liveUseCases(store, id).length > 0 && eventsByParent(store, id).length > 0)!;
      const steps: StepRegistry = {
        retrieve: { run: (input, ctx) => retrieve({ customerId: input.customerId }, { store: ctx.store, runId: input.runId }) },
        analyse: analystStep,
        write: writerStep,
        // The guard is AIB-T04: stop after the Writer by failing the run on purpose at the guard.
        guard: { run: async () => ({}) as never },
      };
      const lines: string[] = [];
      const record = await runBrief({ config: result.config, steps, store, client, log: (l) => lines.push(l) }, { customerId });

      // The guard stub's empty output fails at the hand-off; everything before it must have succeeded.
      expect(record).toMatchObject({ status: "failed", error: "invalid_output", failedStep: "guard" });
      const out = (step: string) => record.completed.find((c) => c.step === step)?.output;
      const sheet = out("retrieve") as FactSheetV1;
      const analysis = out("analyse") as AnalystToWriterV1;
      const draft = out("write") as WriterDraftV1;
      expect(validateContract("analyst-to-writer.v1", analysis)).toMatchObject({ ok: true });
      expect(validateContract("writer-draft.v1", draft)).toMatchObject({ ok: true });
      expect(draft.sections.map((s) => s.heading)).toEqual(["Overview", "Wins", "Risks", "Next steps"]);

      // Citations: reported, not asserted (the Guard's checks and the eval measure them, AIB-CITE-003, EVAL-CODE-002).
      const known = new Set([sheet.customer.fact_id, ...sheet.use_cases.map((u) => u.fact_id), ...sheet.events.map((e) => e.fact_id)]);
      const sentences = draft.sections.flatMap((s) => s.sentences);
      const uncited = sentences.filter((s) => s.factual && s.fact_ids.length === 0).length;
      const unknown = sentences.flatMap((s) => s.fact_ids).filter((id) => !known.has(id)).length;
      const words = sentences.map((s) => s.text.split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0);
      // Numbers only: no model text in the test output.
      console.info(
        `[live] sentences=${sentences.length} uncited_factual=${uncited} unknown_ids=${unknown} words=${words} ` +
          `tokens_in=${record.usage.inputTokens} tokens_out=${record.usage.outputTokens} cost_usd=${record.usage.costUsd.toFixed(4)}`,
      );
    } finally {
      fs.rmSync(runsDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }
  }, 120_000);
});
