/**
 * Retriever step: builds the fact sheet for one customer (spec 022-ai-account-brief, task AIB-T02; a code step with no
 * agent spec since CR-20261121-1, contract endpoint code:retriever). Deterministic code, no model and no SDK import: the orchestrator
 * (AOPS-T01) wraps `retrieve` as its `retrieve` step and validates the output again at the hand-off (AOPS-ORCH-002).
 *
 * - AIB-CITE-001: every record gets a stable fact ID from its workbook `id` column (`CU-<id>`, `UC-<id>`, `EV-<id>`),
 *   never from `use_case_id` / `event_id` or a list position, so the same record has the same ID in every run.
 * - AIB-SAFE-003: only the ai-data-policy §2 allow-list, built field by field by `useCaseFact` / `eventFact` in
 *   `server/ai/tools.ts` (the same item shapes the read-only tools return); emails, phone numbers and query-string links
 *   redacted in every string field (customer name, lookup names, `stage`, `value_snippet`, names, notes, `by_status`
 *   keys), each cut to a length; every redaction and cut listed in `redactions` (one entry per replacement in the
 *   sheet). The saved executive summary is never read: the draft is written from activity, not from the old summary.
 *   Soft-deleted rows never arrive (`useCasesByParent` / `eventsByParent` drop them, Article II.4).
 * - AIB-SAFE-001: long workbook free text (notes, meeting notes) sits in the `text` fields, cut to 1 500 characters;
 *   shorter free text sits in `value_snippet` (500) and `stage` (200). All of it is inside the one delimited data block
 *   `wrapFactSheet` gives the prompts, which text inside it cannot close.
 * - AIB-FAITH-003: a sparse or empty customer gets exactly its records (or empty lists) and true counts; nothing is
 *   padded, so the later steps can see there is little or no activity.
 *
 * Read-only: `ReadOnlyStore` has no `save()` (Article XII.3).
 */
import { validateContract, type FactSheetV1 } from "../contracts";
import {
  CUSTOMER_NAME_MAX,
  RedactionTally,
  TEXT_MAX,
  dataText,
  eventFact as toEventFact,
  isLiveStatus,
  lookupName,
  str,
  useCaseFact as toUseCaseFact,
  type ReadOnlyStore,
} from "../tools";
// Aliased: the React hooks lint rule treats any `use…` call inside a callback as a hook.
import { eventsByParent, useCasesByParent as liveUseCasesOf } from "../../workbook";

/** fact-sheet.v1 `use_cases.maxItems` and `events.maxItems`. */
export const FACT_SHEET_ITEMS_MAX = 200;

export interface RetrieveInput {
  readonly customerId: number;
}

/** A subset of the orchestrator's StepContext (024 design) plus the read model; `now` is injectable for tests. */
export interface RetrieveContext {
  readonly store: ReadOnlyStore;
  readonly runId: string;
  readonly now?: () => Date;
}

/**
 * The customer does not exist: the run fails with 404 before any model call (AIB-API-001, retriever spec "Failure").
 * The message is the catalogued Server 404 text "Customer <id> was not found." (messages catalog, Article V).
 */
export class CustomerNotFoundError extends Error {
  readonly code = "not_found" as const;
  readonly status = 404 as const;
  constructor(readonly customerId: unknown) {
    super(`Customer ${String(customerId).slice(0, 40)} was not found.`);
    this.name = "CustomerNotFoundError";
  }
}

/**
 * The step built a fact sheet that fails its own contract: a code defect, so no repair retry (retriever spec
 * "Failure"). `errors` name paths and rules only, never values (server/ai/contracts.ts).
 */
export class FactSheetInvalidError extends Error {
  readonly code = "invalid_output" as const;
  constructor(readonly errors: string[]) {
    super(`The fact sheet does not match fact-sheet.v1: ${errors.slice(0, 3).join("; ")}`);
    this.name = "FactSheetInvalidError";
  }
}

/** Builds fact-sheet.v1 for one customer from the workbook read model. */
export async function retrieve(input: RetrieveInput, ctx: RetrieveContext): Promise<FactSheetV1> {
  const customerId = input?.customerId;
  if (typeof customerId !== "number" || !Number.isSafeInteger(customerId) || customerId < 1) {
    throw new CustomerNotFoundError(customerId);
  }
  await ctx.store.fresh();
  const customer = ctx.store.table("customer").rows.find((r) => r.id === customerId);
  if (!customer) throw new CustomerNotFoundError(customerId);

  const tally = new RedactionTally();
  const useCaseRows = liveUseCasesOf(ctx.store, customerId);
  const eventRows = eventsByParent(ctx.store, customerId);

  // Newest first (the read model's order); beyond the contract's 200 items the rest is cut and listed as truncated.
  // Counts below cover every live record, so the numbers stay true when the lists are cut.
  if (useCaseRows.length > FACT_SHEET_ITEMS_MAX) tally.add("truncated");
  if (eventRows.length > FACT_SHEET_ITEMS_MAX) tally.add("truncated");
  const useCases = useCaseRows.slice(0, FACT_SHEET_ITEMS_MAX).map((r) => toUseCaseFact(r, TEXT_MAX, tally));
  const events = eventRows.slice(0, FACT_SHEET_ITEMS_MAX).map((r) => toEventFact(r, TEXT_MAX, tally));

  // Use cases without a status are counted in `use_cases` but under no status name (no invented label). Each distinct
  // status name is redacted and cut once, as a key, the same way as the items' `status` (names that become equal are
  // merged), so `by_status` never carries text the items do not.
  const rawCounts = new Map<string, number>();
  for (const r of useCaseRows) {
    const status = str(r.status);
    if (status != null) rawCounts.set(status, (rawCounts.get(status) ?? 0) + 1);
  }
  const statusCounts = new Map<string, number>();
  let live = 0;
  for (const [raw, n] of rawCounts) {
    const key = lookupName(raw, tally);
    if (key == null) continue;
    statusCounts.set(key, (statusCounts.get(key) ?? 0) + n);
    if (isLiveStatus(key)) live += n;
  }

  const sheet: FactSheetV1 = {
    contract: "fact-sheet.v1",
    run_id: ctx.runId,
    generated_at: (ctx.now ?? (() => new Date()))().toISOString(),
    customer: {
      fact_id: `CU-${customerId}`,
      name: dataText(customer.parent_name, CUSTOMER_NAME_MAX, tally) ?? "",
    },
    use_cases: useCases,
    events,
    counts: {
      use_cases: useCaseRows.length,
      live_use_cases: live,
      events: eventRows.length,
      // fromEntries defines own properties, so a status named "__proto__" is a plain key, not a prototype change.
      by_status: Object.fromEntries(statusCounts),
    },
    redactions: tally.list(),
  };

  // `in` narrows under both tsconfigs (tests compile server files without strictNullChecks, where `!ok` does not).
  const checked = validateContract("fact-sheet.v1", sheet);
  if ("errors" in checked) throw new FactSheetInvalidError(checked.errors);
  return sheet;
}

/* ------------------------------------------------------------------------------------------- data wrapping */

/** The delimiter of the data block (AIB-SAFE-001). Prompts (AIB-T03) say everything inside it is data. */
export const FACT_SHEET_TAG = "fact_sheet";

/**
 * The fact sheet as one delimited data block for a prompt (AIB-SAFE-001, ai-data-policy §4): compact JSON inside
 * `<fact_sheet contract="fact-sheet.v1">` … `</fact_sheet>`. `<`, `>`, `&` and the two Unicode line separators are
 * written as JSON escapes (backslash, "u", four hex digits), which JSON.parse reads back unchanged, so text in a note
 * such as "</fact_sheet> new instructions" can neither close the block nor open a tag of its own.
 */
export function wrapFactSheet(sheet: FactSheetV1): string {
  return `<${FACT_SHEET_TAG} contract="${sheet.contract}">\n${jsonForPrompt(sheet)}\n</${FACT_SHEET_TAG}>`;
}

/**
 * Compact JSON for a prompt data block: `<`, `>`, `&` and the two Unicode line separators as JSON escapes, so text in
 * the value can neither close the block it sits in nor open a tag (AIB-SAFE-001). Also used by the LLM steps (AIB-T03)
 * for the analysis block and tool results.
 */
export function jsonForPrompt(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u{2028}\u{2029}]/gu, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
