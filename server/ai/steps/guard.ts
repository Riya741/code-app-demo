/**
 * The Guard: the pipeline's last step (spec 022-ai-account-brief, task AIB-T04). Deterministic code, not an agent: it never
 * calls a model and has no tools (`code:guard`).
 *
 * - AIB-CITE-003: every sentence's fact IDs must be in the run's fact sheet, and every factual sentence needs one. A miss
 *   does not fail the run: the draft becomes `unverified` with one issue per sentence, naming it by section and position
 *   (AOPS-FAIL-008). Issue texts are fixed (messages catalog §5); no model text goes into an issue.
 * - AIB-FMT-002: at most 350 words, citation markers excluded. Over the budget, the first sentence of each section is
 *   kept and the rest are kept in order while they fit; the cut is reported as an `over_budget` issue.
 * - AIB-SAFE-002: the HTML is built here from the plain-text sentences (every character escaped, only `<p>` and
 *   `<strong>` from code), then passed through DOMPurify with the rich-text settings (RTX-SAN-001). Model text is never
 *   inserted as markup.
 * - AIB-CITE-004: each sentence ends with its known fact IDs as bracketed markers (`[UC-123]`), plain text the user can
 *   keep or delete in the editor. Unknown IDs get no marker (they are reported as issues instead).
 * - Final check: the result is validated against brief-draft.v1 before it is returned; a failure is `invalid_output`.
 */
import { createRequire } from "node:module";
import createDOMPurify from "dompurify";
import { validateContract, type BriefDraftV1, type FactSheetV1, type WriterDraftV1 } from "../contracts";
import type { StepDefinition, StepInputs } from "../orchestrator";

export const WORD_BUDGET = 350;

/** Issue types (brief-draft.v1 `issues[].type`). */
export const GUARD_ISSUE_TYPES = ["uncited", "unknown_citation", "over_budget"] as const;
export type GuardIssueType = (typeof GUARD_ISSUE_TYPES)[number];

/** Issue texts (messages catalog §5, AIB-HUMAN-012). Only section names, positions, fact IDs and counts are filled in. */
export const GUARD_MESSAGES = {
  uncited: (section: string, n: number) => `${section}, sentence ${n}: a factual statement has no citation.`,
  unknown_citation: (section: string, n: number, id: string) => `${section}, sentence ${n}: cites ${id}, which is not in this customer's records.`,
  over_budget: (words: number) => `The draft had ${words} words; sentences after the ${WORD_BUDGET}-word limit were removed.`,
} as const;

/** The Guard's own failure: a run error code only, never free text. */
export class GuardError extends Error {
  readonly code = "invalid_output";
  constructor() {
    super("invalid_output");
    this.name = "GuardError";
  }
}

type Sentence = WriterDraftV1["sections"][number]["sentences"][number];
type Issue = BriefDraftV1["issues"][number];

/** Escapes text for an HTML text node. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Every fact ID in the fact sheet. */
export function knownFactIds(sheet: FactSheetV1): Set<string> {
  return new Set([sheet.customer.fact_id, ...sheet.use_cases.map((u) => u.fact_id), ...sheet.events.map((e) => e.fact_id)]);
}

/** AIB-CITE-003: one issue per uncited factual sentence and per unknown fact ID. */
export function citationIssues(draft: WriterDraftV1, known: ReadonlySet<string>): Issue[] {
  const issues: Issue[] = [];
  for (const section of draft.sections) {
    section.sentences.forEach((s, i) => {
      if (s.factual && s.fact_ids.length === 0) issues.push({ type: "uncited", detail: GUARD_MESSAGES.uncited(section.heading, i + 1) });
      for (const id of new Set(s.fact_ids)) {
        if (!known.has(id)) issues.push({ type: "unknown_citation", detail: GUARD_MESSAGES.unknown_citation(section.heading, i + 1, id) });
      }
    });
  }
  return issues;
}

/**
 * AIB-FMT-002: the sentences to keep, per section. Within the budget everything is kept. Over it, each section's first
 * sentence is kept, then the others in document order while the total stays within the budget.
 */
export function fitBudget(draft: WriterDraftV1): { kept: Sentence[][]; words: number; originalWords: number } {
  const words = draft.sections.map((sec) => sec.sentences.map((s) => countWords(s.text)));
  const originalWords = words.flat().reduce((a, b) => a + b, 0);
  if (originalWords <= WORD_BUDGET) return { kept: draft.sections.map((sec) => [...sec.sentences]), words: originalWords, originalWords };
  const keep = words.map((ws) => ws.map((_, i) => i === 0));
  let total = words.reduce((a, ws) => a + ws[0], 0);
  words.forEach((ws, si) =>
    ws.forEach((w, i) => {
      if (i > 0 && total + w <= WORD_BUDGET) {
        keep[si][i] = true;
        total += w;
      }
    }),
  );
  return { kept: draft.sections.map((sec, si) => sec.sentences.filter((_, i) => keep[si][i])), words: total, originalWords };
}

/* ------------------------------------------------------------------------------------------- sanitising */

type Purifier = { sanitize(html: string, config: Record<string, unknown>): string };
let purifier: Purifier | undefined;

/** DOMPurify on a jsdom window, created on first use (jsdom ships no types; only `window` is used). */
function getPurifier(): Purifier {
  if (!purifier) {
    const { JSDOM } = createRequire(import.meta.url)("jsdom") as { JSDOM: new (html: string) => { window: unknown } };
    purifier = createDOMPurify(new JSDOM("").window as Parameters<typeof createDOMPurify>[0]) as unknown as Purifier;
  }
  return purifier;
}

/** The rich-text sanitiser's settings (RTX-SAN-001: DOMPurify, `<style>` forbidden). */
export function sanitizeDraftHtml(html: string): string {
  return getPurifier().sanitize(html, { FORBID_TAGS: ["style"] });
}

/** AIB-SAFE-002, AIB-CITE-004: code-built HTML: a bold heading paragraph, then one paragraph of marked sentences. */
export function buildHtml(sections: readonly { heading: string; sentences: readonly Sentence[] }[], known: ReadonlySet<string>): string {
  return sections
    .map((sec) => {
      const body = sec.sentences
        .map((s) => {
          const markers = [...new Set(s.fact_ids)].filter((id) => known.has(id)).map((id) => ` [${id}]`).join("");
          return escapeHtml(s.text.trim()) + markers;
        })
        .join(" ");
      return `<p><strong>${escapeHtml(sec.heading)}</strong></p><p>${body}</p>`;
    })
    .join("");
}

/* ------------------------------------------------------------------------------------------- the step */

export async function guard(input: StepInputs["guard"]): Promise<BriefDraftV1> {
  const known = knownFactIds(input.factSheet);
  const { kept, words, originalWords } = fitBudget(input.draft);
  const issues = citationIssues(input.draft, known);
  if (originalWords > WORD_BUDGET) issues.push({ type: "over_budget", detail: GUARD_MESSAGES.over_budget(originalWords) });

  const sections = input.draft.sections.map((sec, i) => ({ heading: sec.heading, sentences: kept[i] }));
  const citations = [...new Set(sections.flatMap((s) => s.sentences.flatMap((x) => x.fact_ids)).filter((id) => known.has(id)))];
  const draft: BriefDraftV1 = {
    contract: "brief-draft.v1",
    run_id: input.runId,
    customer_id: input.customerId,
    status: issues.length ? "unverified" : "verified",
    html: sanitizeDraftHtml(buildHtml(sections, known)),
    citations,
    issues,
    word_count: words,
    revisions: input.revisions,
    usage: {
      input_tokens: input.usage.inputTokens,
      output_tokens: input.usage.outputTokens,
      cache_read_tokens: input.usage.cacheReadTokens,
      cost_usd: input.usage.costUsd,
    },
  };
  // Final check: never hand on a draft that does not match the contract.
  const checked = validateContract("brief-draft.v1", draft);
  if (!checked.ok) throw new GuardError();
  return draft;
}

export const guardStep: StepDefinition<"guard"> = { run: (input) => guard(input) };
