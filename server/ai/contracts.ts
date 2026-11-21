// Hand-off contracts as zod schemas (spec 022 AIB-CITE-001, spec 024 AOPS-ORCH-002; Constitution Article XII.2). Task AIB-T01.
//
// spec/contracts/*.schema.json are the source of truth; tests/unit/contracts.test.ts checks every schema here against its
// file (same properties, required set, strictness, and the same accept/reject answer on generated samples).
//
// Rules:
// - Every object is `.strict()` (`additionalProperties: false`): an unknown property is rejected, never stripped.
// - No defaults, transforms or coercion: a hand-off is accepted as it is or rejected, never repaired (AOPS-ORCH-002).
// - `maxLength` counts code points, as JSON Schema does (zod's `.max()` would count UTF-16 units).
// - `format: date` / `date-time` are asserted (RFC 3339: full date; date-time with seconds and `Z` or `±hh:mm`).
// - Error strings name the path and the rule, never a field value, so free text cannot leak into traces or logs
//   (Article III; 024 design "No free text in traces or logs").
import { z } from "zod";

// ---------------------------------------------------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------------------------------------------------

/** `run_<8..32 lower-case letters or digits>` (all contracts' `run_id`). */
export const RUN_ID_PATTERN = /^run_[0-9a-z]{8,32}$/;
/** A fact ID cited by a later step: customer, use case or event, built from the workbook `id` (AIB-CITE-001). */
export const FACT_ID_PATTERN = /^(CU|UC|EV)-[0-9]+$/;
export const CUSTOMER_FACT_ID_PATTERN = /^CU-[0-9]+$/;
export const USE_CASE_FACT_ID_PATTERN = /^UC-[0-9]+$/;
export const EVENT_FACT_ID_PATTERN = /^EV-[0-9]+$/;

/** RFC 3339 time part zod's `datetime()` leaves optional: seconds, and an offset written `Z` or `±hh:mm`. */
const RFC3339_TIME_TAIL = /T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

/** A string of at most `max` characters, counted as code points like JSON Schema's `maxLength`. */
const text = (max: number) =>
  z.string().refine((s) => Array.from(s).length <= max, { message: `must be at most ${max} characters` });

const runId = z.string().regex(RUN_ID_PATTERN);
const factId = z.string().regex(FACT_ID_PATTERN);
const count = z.number().int().min(0);
const revision = z.number().int().min(0).max(2);
/** `format: date` (calendar-checked, e.g. no 2026-02-30). */
const date = z.string().date();
/** `format: date-time` (RFC 3339 with seconds and an offset). */
const dateTime = z.string().datetime({ offset: true }).regex(RFC3339_TIME_TAIL);
/** Names of people on a fact-sheet record. */
const people = z.array(text(120)).max(20);
/** Free text from the workbook: redacted, at most 1500 characters, data only (AIB-SAFE-001). */
const dataText = text(1500).nullable();

// ---------------------------------------------------------------------------------------------------------------------
// fact-sheet.v1 (Retriever -> Analyst)
// ---------------------------------------------------------------------------------------------------------------------

export const FactSheetV1Schema = z
  .object({
    contract: z.literal("fact-sheet.v1"),
    run_id: runId,
    generated_at: dateTime,
    customer: z
      .object({
        fact_id: z.string().regex(CUSTOMER_FACT_ID_PATTERN),
        name: text(200),
      })
      .strict(),
    use_cases: z
      .array(
        z
          .object({
            fact_id: z.string().regex(USE_CASE_FACT_ID_PATTERN),
            solution: z.string(),
            use_case_type: z.string().nullable(),
            status: z.string().nullable(),
            is_live: z.boolean(),
            subsidiary: z.string(),
            department: z.string().nullable(),
            expected_launch_date: date.nullable(),
            value_snippet: text(500).nullable(),
            people,
            text: dataText,
          })
          .strict(),
      )
      .max(200),
    events: z
      .array(
        z
          .object({
            fact_id: z.string().regex(EVENT_FACT_ID_PATTERN),
            event_type: z.string().nullable(),
            subsidiary: z.string(),
            event_date: date.nullable(),
            stage: z.string().nullable(),
            attendee_count: count.nullable(),
            people,
            text: dataText,
          })
          .strict(),
      )
      .max(200),
    counts: z
      .object({
        use_cases: count,
        live_use_cases: count,
        events: count,
        by_status: z.record(z.string(), count),
      })
      .strict(),
    redactions: z.array(
      z
        .object({
          kind: z.enum(["email", "phone", "link", "truncated"]),
          count: z.number().int().min(1),
        })
        .strict(),
    ),
  })
  .strict();
export type FactSheetV1 = z.infer<typeof FactSheetV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// analyst-to-writer.v1 (Analyst -> Writer)
// ---------------------------------------------------------------------------------------------------------------------

const insights = z
  .array(
    z
      .object({
        point: text(400),
        fact_ids: z.array(factId).min(1),
      })
      .strict(),
  )
  .max(8);

export const AnalystToWriterV1Schema = z
  .object({
    contract: z.literal("analyst-to-writer.v1"),
    run_id: runId,
    no_activity: z.boolean(),
    overview: insights,
    wins: insights,
    risks: insights,
    next_steps: insights,
  })
  .strict();
export type AnalystToWriterV1 = z.infer<typeof AnalystToWriterV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// writer-draft.v1 (Writer -> guard code step; was writer-to-critic.v1 until CR-20261121-1)
// ---------------------------------------------------------------------------------------------------------------------

export const SECTION_HEADINGS = ["Overview", "Wins", "Risks", "Next steps"] as const;

export const WriterDraftV1Schema = z
  .object({
    contract: z.literal("writer-draft.v1"),
    run_id: runId,
    revision,
    sections: z
      .array(
        z
          .object({
            heading: z.enum(SECTION_HEADINGS),
            sentences: z
              .array(
                z
                  .object({
                    text: text(400),
                    factual: z.boolean(),
                    fact_ids: z.array(factId),
                  })
                  .strict(),
              )
              .min(1)
              .max(10),
          })
          .strict(),
      )
      .min(4)
      .max(4),
  })
  .strict();
export type WriterDraftV1 = z.infer<typeof WriterDraftV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// judge-verdict.v1: eval judge -> eval harness (CR-20261121-2, EVAL-JUDGE-006)
// ---------------------------------------------------------------------------------------------------------------------

export const JUDGE_CRITERIA = ["faithfulness", "coverage", "actionability", "executive_tone"] as const;

export const JudgeVerdictV1Schema = z
  .object({
    contract: z.literal("judge-verdict.v1"),
    case_id: z.string().regex(/^(rich|sparse|empty|conflicting|long|injection|non_latin|html)-[0-9]{2}$/),
    judge_prompt_version: z.string().regex(/^judge\.v[0-9]+$/),
    criteria: z
      .array(
        z
          .object({
            criterion: z.enum(JUDGE_CRITERIA),
            evidence: z.array(text(400)).min(1).max(5),
            reasoning: text(1200),
            score: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .min(4)
      .max(4),
  })
  .strict();
export type JudgeVerdictV1 = z.infer<typeof JudgeVerdictV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// brief-draft.v1 (Guard -> Orchestrator -> UI)
// ---------------------------------------------------------------------------------------------------------------------

export const BriefDraftV1Schema = z
  .object({
    contract: z.literal("brief-draft.v1"),
    run_id: runId,
    customer_id: z.number().int(),
    status: z.enum(["verified", "unverified"]),
    html: text(20000),
    citations: z.array(factId),
    issues: z.array(
      z
        .object({
          type: z.string(),
          detail: text(400),
        })
        .strict(),
    ),
    word_count: z.number().int().min(0).max(350),
    revisions: revision,
    usage: z
      .object({
        input_tokens: count,
        output_tokens: count,
        cache_read_tokens: count,
        cost_usd: z.number().finite().min(0),
      })
      .strict(),
  })
  .strict();
export type BriefDraftV1 = z.infer<typeof BriefDraftV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// task-handoff.v1 (main session -> human; the front matter of spec/handoffs/<TASK-ID>.md). `session` accepted since CR-20261121-1.
// ---------------------------------------------------------------------------------------------------------------------

const agentId = z.string().regex(/^(AGENT-[A-Z][A-Z-]*|session)$/);

export const TaskHandoffV1Schema = z
  .object({
    contract: z.literal("task-handoff.v1"),
    task: z.string().regex(/^[A-Z][A-Z0-9]{1,4}-T[0-9]{2}$/),
    agent: agentId,
    covers: z.array(z.string().regex(/^[A-Z][A-Z0-9]{1,4}-[A-Z]{2,6}-[0-9]{3}$/)).min(1),
    files_changed: z.array(z.string()),
    tests: z.array(z.string()),
    gates: z.record(z.string().regex(/^G[1-7]$/), z.enum(["pass", "fail", "n/a"])),
    verdict: z.enum(["pending", "pass", "fail"]),
    reviewer: z
      .string()
      .regex(/^(AGENT-[A-Z][A-Z-]*|session|human)$/)
      .optional(),
  })
  .strict();
export type TaskHandoffV1 = z.infer<typeof TaskHandoffV1Schema>;

// ---------------------------------------------------------------------------------------------------------------------
// Registry and validation
// ---------------------------------------------------------------------------------------------------------------------

/** Every contract, keyed by `<x-contract.name>.v<x-contract.version>` (also the value of its `contract` field). */
export const CONTRACTS = {
  "fact-sheet.v1": FactSheetV1Schema,
  "analyst-to-writer.v1": AnalystToWriterV1Schema,
  "writer-draft.v1": WriterDraftV1Schema,
  "brief-draft.v1": BriefDraftV1Schema,
  "task-handoff.v1": TaskHandoffV1Schema,
  "judge-verdict.v1": JudgeVerdictV1Schema,
} as const;

export type ContractId = keyof typeof CONTRACTS;
export type ContractValue<Id extends ContractId> = z.infer<(typeof CONTRACTS)[Id]>;
export type ContractResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

/** At most this many error strings per result; the rest are counted in a last line. */
export const MAX_CONTRACT_ERRORS = 20;

/** Path segments that look like property names are shown; anything else (e.g. a record key with spaces) is masked. */
const SAFE_KEY = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function formatPath(path: (string | number)[]): string {
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") out += `[${segment}]`;
    else if (SAFE_KEY.test(segment)) out += out ? `.${segment}` : segment;
    else out += "[?]";
  }
  return out || "(root)";
}

/** The rule an issue broke, built only from the schema side of the issue (never from the received value). */
function describeIssue(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.received === "undefined" ? "is required" : `expected ${issue.expected}, received ${issue.received}`;
    case z.ZodIssueCode.invalid_literal:
      return `must equal ${JSON.stringify(issue.expected)}`;
    case z.ZodIssueCode.invalid_enum_value:
      return `must be one of ${issue.options.map((o) => JSON.stringify(o)).join(", ")}`;
    case z.ZodIssueCode.invalid_string:
      return issue.validation === "regex" ? "does not match the required pattern" : `is not a valid ${String(issue.validation)}`;
    case z.ZodIssueCode.too_small:
      return issue.type === "array"
        ? `must contain at least ${issue.minimum} item(s)`
        : `must be ${issue.inclusive ? "at least" : "greater than"} ${issue.minimum}`;
    case z.ZodIssueCode.too_big:
      return issue.type === "array"
        ? `must contain at most ${issue.maximum} item(s)`
        : `must be ${issue.inclusive ? "at most" : "less than"} ${issue.maximum}`;
    case z.ZodIssueCode.not_finite:
      return "must be a finite number";
    case z.ZodIssueCode.custom:
      // Only the refinements in this file raise custom issues, and their messages contain no value.
      return issue.message;
    default:
      return "is invalid";
  }
}

/** One line per broken rule, `<path>: <rule>`, de-duplicated and capped at MAX_CONTRACT_ERRORS. */
export function formatContractIssues(issues: z.ZodIssue[]): string[] {
  const lines: string[] = [];
  for (const issue of issues) {
    if (issue.code === z.ZodIssueCode.unrecognized_keys) {
      for (const key of issue.keys) lines.push(`${formatPath([...issue.path, key])}: unexpected property`);
    } else {
      lines.push(`${formatPath(issue.path)}: ${describeIssue(issue)}`);
    }
  }
  const unique = [...new Set(lines)];
  if (unique.length <= MAX_CONTRACT_ERRORS) return unique;
  return [...unique.slice(0, MAX_CONTRACT_ERRORS), `(${unique.length - MAX_CONTRACT_ERRORS} more errors)`];
}

/**
 * Checks a hand-off against its contract (AOPS-ORCH-002). On success the caller's own value is returned, not zod's
 * parsed copy: the schemas have no transforms, and zod's record parser silently drops a `__proto__` key, so returning
 * the input is the only way to guarantee nothing is added, stripped or coerced. On failure there is no value, only the
 * error strings, so an invalid hand-off can be neither passed on nor silently repaired.
 */
export function validateContract<Id extends ContractId>(id: Id, value: unknown): ContractResult<ContractValue<Id>> {
  if (!Object.prototype.hasOwnProperty.call(CONTRACTS, id)) return { ok: false, errors: ["(root): unknown contract id"] };
  const result = CONTRACTS[id].safeParse(value);
  if (result.success) return { ok: true, value: value as ContractValue<Id> };
  return { ok: false, errors: formatContractIssues(result.error.issues) };
}
