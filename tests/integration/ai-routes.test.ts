// @vitest-environment node
// The AI routes (spec 022-ai-account-brief: AIB-API-001..004, AIB-GEN-022; 024 AOPS-FAIL-007). Task AIB-T05.
//
// Drives `/api/ai` through the workbook plugin (harness.ts) on the generated 8-customer fixture. The real retrieve and
// guard steps run; analyse and write are stubs that build valid hand-offs from the fact sheet, and the model client is a
// fake that fails the test if called. No test reaches a model.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFakeModelClient } from "../../server/ai/client";
import { SECTION_HEADINGS, validateContract, type FactSheetV1 } from "../../server/ai/contracts";
import type { Env } from "../../server/ai/config";
import type { StepRegistry } from "../../server/ai/orchestrator";
import { AI_MESSAGES, type RunBody, type StatusBody } from "../../server/ai/routes";
import { sanitizeDraftHtml } from "../../server/ai/steps/guard";
import type { WorkbookPluginOptions } from "../../server/workbook";
import { ROOT, workbookApi, type Request } from "./harness";

const runsDir = fs.mkdtempSync(path.join(os.tmpdir(), "code-app-ai-routes-"));
beforeAll(() => void sanitizeDraftHtml(""), 60_000);
afterAll(() => fs.rmSync(runsDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));

const ON: Env = { NODE_ENV: "test", AI_ENABLED: "true", ANTHROPIC_API_KEY: "sk-ant-test-not-used", AI_RUNS_DIR: runsDir };
const GATEWAY: Env = { ...ON, AI_GATEWAY: "portkey", AI_GATEWAY_URL: "https://portkeygateway.example.com", AI_GATEWAY_MODEL_PREFIX: "@aws-bedrock-use2/us.anthropic.", PORTKEY_API_KEY: "pk-test-not-used" };


/** Stub LLM steps: valid hand-offs built from the fact sheet, citing the customer's fact ID. */
const STUBS: Partial<StepRegistry> = {
  analyse: {
    run: async (sheet: FactSheetV1) => ({
      contract: "analyst-to-writer.v1",
      run_id: sheet.run_id,
      no_activity: false,
      overview: [{ point: "Active customer.", fact_ids: [sheet.customer.fact_id] }],
      wins: [],
      risks: [],
      next_steps: [],
    }),
  },
  write: {
    run: async (input) => ({
      contract: "writer-draft.v1",
      run_id: input.runId,
      revision: 0,
      sections: SECTION_HEADINGS.map((heading) => ({ heading, sentences: [{ text: `${heading}: noted.`, factual: true, fact_ids: [input.analysis.overview[0].fact_ids[0]] }] })),
    }),
  },
};

// A model client that must never be called.
const client = createFakeModelClient([]);
const api = workbookApi({ ai: { env: ON, projectDir: ROOT, client, steps: STUBS, log: () => undefined } });
const plugin = (ai: WorkbookPluginOptions["ai"]): Request => api.reopen({ ai: { projectDir: ROOT, client, log: () => undefined, ...ai } });

/** Waits for the run to end by reading its event stream (the stream ends with the final event). */
async function events(request: Request, runId: string): Promise<Record<string, unknown>[]> {
  const reply = await request<string>("GET", `/api/ai/runs/${runId}/events`);
  expect(reply.headers["content-type"]).toBe("text/event-stream");
  return reply.body
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, "")) as Record<string, unknown>);
}

async function firstCustomer(): Promise<number> {
  const rows = await api.request<{ id: number }[]>("GET", "/api/workbook/table/customer");
  return rows.body[0].id;
}

describe("GET /api/ai/status", () => {
  it("AIB-API-004 returns enabled and available without calling the model", async () => {
    const r = await api.request<StatusBody>("GET", "/api/ai/status");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ enabled: true, available: true, auto_draft: true });
    expect(client.calls).toHaveLength(0);
    const off = await plugin({ env: { NODE_ENV: "test" } })<StatusBody>("GET", "/api/ai/status");
    expect(off.body).toMatchObject({ enabled: false, available: false, reason: "disabled" });
  });

  it("AIB-GEN-022 reports auto_draft false on the gateway route and true on the direct route", async () => {
    const gw = await plugin({ env: GATEWAY })<StatusBody>("GET", "/api/ai/status");
    expect(gw.body).toEqual({ enabled: true, available: true, auto_draft: false });
    expect((await api.request<StatusBody>("GET", "/api/ai/status")).body.auto_draft).toBe(true);
  });
});

describe("POST /api/ai/brief", () => {
  it("AIB-API-001 returns 202 with a run ID, 404 for an unknown customer and 503 'AI is not enabled' when AI is off", async () => {
    const started = await api.request<{ runId: string }>("POST", "/api/ai/brief", { customerId: await firstCustomer() });
    expect(started.status).toBe(202);
    expect(started.body.runId).toMatch(/^run_[0-9a-z]{8,32}$/);
    await events(api.request, started.body.runId);

    const missing = await api.request("POST", "/api/ai/brief", { customerId: 987654 });
    expect(missing).toMatchObject({ status: 404, body: { error: AI_MESSAGES.customerNotFound } });
    const bad = await api.request("POST", "/api/ai/brief", { customerId: "1" });
    expect(bad).toMatchObject({ status: 400, body: { error: AI_MESSAGES.badRequest } });
    const off = await plugin({ env: { NODE_ENV: "test" } })("POST", "/api/ai/brief", { customerId: 1 });
    expect(off).toMatchObject({ status: 503, body: { error: "AI is not enabled" } });
  });

  it("AIB-GEN-022 on the gateway route a run still starts on the user's request", async () => {
    const gw = plugin({ env: GATEWAY, steps: STUBS });
    const started = await gw<{ runId: string }>("POST", "/api/ai/brief", { customerId: await firstCustomer() });
    expect(started.status).toBe(202);
    expect((await events(gw, started.body.runId)).at(-1)).toEqual({ status: "succeeded" });
  });
});

describe("run progress and result", () => {
  it("AIB-API-002 streams one event per step change and a final event with the outcome", async () => {
    const { body } = await api.request<{ runId: string }>("POST", "/api/ai/brief", { customerId: await firstCustomer() });
    const list = await events(api.request, body.runId);
    expect(list).toEqual([
      { step: "retrieve", revision: 0, status: "running" },
      { step: "analyse", revision: 0, status: "running" },
      { step: "write", revision: 0, status: "running" },
      { step: "guard", revision: 0, status: "running" },
      { status: "succeeded" },
    ]);
    // A late subscriber gets the same history and the stream ends.
    expect(await events(api.request, body.runId)).toEqual(list);
  });

  it("AIB-API-003 returns the status and, once finished, the brief-draft.v1 draft; an unknown run is 404", async () => {
    const customerId = await firstCustomer();
    const { body } = await api.request<{ runId: string }>("POST", "/api/ai/brief", { customerId });
    await events(api.request, body.runId);
    const run = await api.request<RunBody>("GET", `/api/ai/runs/${body.runId}`);
    expect(run.status).toBe(200);
    expect(run.body).toMatchObject({ runId: body.runId, status: "succeeded", step: "guard" });
    expect(validateContract("brief-draft.v1", run.body.draft)).toMatchObject({ ok: true });
    expect(run.body.draft).toMatchObject({ customer_id: customerId, status: "verified" });
    expect(run.body.draft!.html).toContain("[CU-");
    expect(await api.request("GET", "/api/ai/runs/run_doesnotexist01")).toMatchObject({ status: 404, body: { error: AI_MESSAGES.runNotFound } });
  });

  it("AIB-API-003 a failed run returns a catalog reason, never the raw error text", async () => {
    const failing = plugin({ env: ON, steps: { ...STUBS, write: { run: async () => { throw new Error("RAW-INTERNAL-DETAIL"); } } } });
    const { body } = await failing<{ runId: string }>("POST", "/api/ai/brief", { customerId: await firstCustomer() });
    expect((await events(failing, body.runId)).at(-1)).toEqual({ status: "failed" });
    const run = await failing<RunBody>("GET", `/api/ai/runs/${body.runId}`);
    expect(run.body).toMatchObject({ status: "failed", error: AI_MESSAGES.failed });
    expect(run.body.draft).toBeUndefined();
    expect(JSON.stringify(run.body)).not.toContain("RAW-INTERNAL-DETAIL");
  });

  it("AOPS-REC-002 POST /runs/:id/cancel answers 204 and the run ends cancelled", async () => {
    const slow = plugin({
      env: ON,
      steps: {
        ...STUBS,
        analyse: { run: (_sheet, ctx) => new Promise((_, reject) => ctx.signal.addEventListener("abort", () => reject(new Error("aborted")))) },
      },
    });
    const { body } = await slow<{ runId: string }>("POST", "/api/ai/brief", { customerId: await firstCustomer() });
    const stream = events(slow, body.runId);
    const cancel = await slow("POST", `/api/ai/runs/${body.runId}/cancel`);
    expect(cancel.status).toBe(204);
    expect((await stream).at(-1)).toEqual({ status: "cancelled" });
    expect((await slow<RunBody>("GET", `/api/ai/runs/${body.runId}`)).body.status).toBe("cancelled");
  });
});
