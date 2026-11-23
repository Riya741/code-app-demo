// @vitest-environment node
// The Guard step (spec 022-ai-account-brief: AIB-CITE-003, AIB-SAFE-002, AIB-FMT-002, AIB-CITE-004). Task AIB-T04.
// Pure code: no model, no workbook. The fact sheet carries only the fact IDs the Guard reads.
import { beforeAll, describe, expect, it } from "vitest";
import { SECTION_HEADINGS, validateContract, type FactSheetV1, type WriterDraftV1 } from "../../server/ai/contracts";
import type { StepInputs } from "../../server/ai/orchestrator";
import { GuardError, WORD_BUDGET, countWords, guard, sanitizeDraftHtml } from "../../server/ai/steps/guard";
// jsdom (the sanitiser's DOM) is created on first use and is slow to start under a parallel suite: start it once here.
beforeAll(() => void sanitizeDraftHtml(""), 60_000);


const RUN = "run_guardtest0001";
const SHEET = {
  customer: { fact_id: "CU-1" },
  use_cases: [{ fact_id: "UC-10" }, { fact_id: "UC-11" }],
  events: [{ fact_id: "EV-20" }],
} as unknown as FactSheetV1;

type Sentence = WriterDraftV1["sections"][number]["sentences"][number];
const s = (text: string, fact_ids: string[] = ["UC-10"], factual = true): Sentence => ({ text, factual, fact_ids });

function draft(per: Partial<Record<(typeof SECTION_HEADINGS)[number], Sentence[]>> = {}): WriterDraftV1 {
  return {
    contract: "writer-draft.v1",
    run_id: RUN,
    revision: 0,
    sections: SECTION_HEADINGS.map((heading) => ({ heading, sentences: per[heading] ?? [s(`${heading} sentence.`)] })),
  };
}

function input(d: WriterDraftV1, fields: Partial<StepInputs["guard"]> = {}): StepInputs["guard"] {
  return { runId: RUN, customerId: 1, revisions: 0, draft: d, factSheet: SHEET, usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, costUsd: 0.01 }, ...fields };
}

describe("citation checks", () => {
  it("AIB-CITE-003 a draft whose factual sentences all cite known fact IDs is verified with no issues", async () => {
    const out = await guard(input(draft({ Risks: [s("No open risks.", [], false)] })));
    expect(out).toMatchObject({ status: "verified", issues: [], customer_id: 1, revisions: 0 });
    expect(out.usage).toEqual({ input_tokens: 100, output_tokens: 50, cache_read_tokens: 10, cost_usd: 0.01 });
    expect(validateContract("brief-draft.v1", out)).toMatchObject({ ok: true });
  });

  it("AIB-CITE-003 an uncited factual sentence or an unknown fact ID makes the draft unverified with an issue naming the sentence", async () => {
    const out = await guard(input(draft({ Wins: [s("Fine.", ["UC-10"]), s("SECRET-MODEL-TEXT one.", [])], Risks: [s("SECRET-MODEL-TEXT two.", ["UC-99", "EV-20"])] })));
    expect(out.status).toBe("unverified");
    expect(out.issues).toEqual([
      { type: "uncited", detail: "Wins, sentence 2: a factual statement has no citation." },
      { type: "unknown_citation", detail: "Risks, sentence 1: cites UC-99, which is not in this customer's records." },
    ]);
    // Issues name the sentence by position, never by its text.
    expect(JSON.stringify(out.issues)).not.toContain("SECRET-MODEL-TEXT");
  });
});

describe("HTML and citation markers", () => {
  it("AIB-SAFE-002 the HTML is built by code from escaped sentences: model markup never becomes HTML", async () => {
    const evil = `<script>alert(1)</script><img src=x onerror="alert(2)"> & <b>bold</b>`;
    const out = await guard(input(draft({ Overview: [s(evil)] })));
    expect(out.html).not.toMatch(/<script|<img|<b>/i);
    expect(out.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out.html).toContain("&amp;");
    // Only the tags code emits.
    const tags = new Set([...out.html.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase()));
    expect([...tags].sort()).toEqual(["p", "strong"]);
  });

  it("AIB-CITE-004 each sentence ends with bracketed markers for its known fact IDs; the four headings appear in order", async () => {
    const out = await guard(input(draft({ Overview: [s("Two projects.", ["UC-10", "UC-11"]), s("One event.", ["EV-20", "UC-404"])] })));
    expect(out.html).toContain("<p><strong>Overview</strong></p><p>Two projects. [UC-10] [UC-11] One event. [EV-20]</p>");
    expect(out.html).not.toContain("[UC-404]");
    expect(out.citations).toEqual(["UC-10", "UC-11", "EV-20"]);
    const headings = [...out.html.matchAll(/<strong>([^<]+)<\/strong>/g)].map((m) => m[1]);
    expect(headings).toEqual([...SECTION_HEADINGS]);
  });
});

describe("length budget and final check", () => {
  it("AIB-FMT-002 the word count excludes citation markers and a draft within the budget is kept whole", async () => {
    const out = await guard(input(draft({ Overview: [s("One two three.", ["UC-10", "UC-11", "EV-20"])] })));
    expect(out.word_count).toBe(3 + 2 + 2 + 3); // "One two three." + "Wins sentence." + "Risks sentence." + "Next steps sentence."
  });

  it("AIB-FMT-002 a draft over 350 words is cut to the budget, keeping each section's first sentence, and reported", async () => {
    const long = (n: number) => s(`${Array.from({ length: n }, (_, i) => `w${i}`).join(" ")}.`);
    const d = draft({
      Overview: [long(60), long(60), long(60)],
      Wins: [long(60), long(60)],
      Risks: [long(60)],
      "Next steps": [long(60), long(60)],
    });
    const out = await guard(input(d));
    expect(out.word_count).toBeLessThanOrEqual(WORD_BUDGET);
    expect(out.word_count).toBe(300); // 4 first sentences (240) + 1 more (60); the next would pass 350
    expect(out.status).toBe("unverified");
    expect(out.issues).toEqual([{ type: "over_budget", detail: "The draft had 480 words; sentences after the 350-word limit were removed." }]);
    const text = out.html.replace(/<[^>]+>/g, " ").replace(/\[[A-Z]{2}-\d+\]/g, " ");
    expect(countWords(text)).toBe(out.word_count + 5); // plus the headings: Overview, Wins, Risks, Next steps
  });

  it("AIB-SAFE-002 the final check rejects a result that does not match brief-draft.v1 with invalid_output", async () => {
    const bad = guard(input(draft(), { runId: "not-a-run-id" }));
    await expect(bad).rejects.toBeInstanceOf(GuardError);
    await expect(bad).rejects.toMatchObject({ code: "invalid_output" });
  });
});
