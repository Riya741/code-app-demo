// @vitest-environment node
// Hand-off contracts: the zod schemas in server/ai/contracts.ts agree with spec/contracts/*.schema.json
// (spec 022 AIB-CITE-001, spec 024 AOPS-ORCH-002). Task AIB-T01.
//
// No JSON Schema library is added (package.json stays unchanged). Instead:
// 1. `structureErrors` walks each JSON Schema and its zod schema together: same properties, same required set, same
//    strictness (`additionalProperties: false` <-> `.strict()`), same nullability, arrays and maps in the same places.
// 2. `jsonErrors` is a small reference validator for exactly the keywords these files use; it throws on any other
//    keyword, so a new keyword cannot be ignored silently. `variants` derives samples from each JSON Schema and one valid
//    sample (each required property removed, an extra property, wrong types, every enum value and a non-member, pattern,
//    length, item-count, minimum/maximum and format boundaries). zod must give the same accept/reject answer as the
//    reference validator for every variant, and the variants with a known answer check the reference validator itself.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONTRACTS,
  MAX_CONTRACT_ERRORS,
  validateContract,
  type ContractId,
  type ContractResult,
} from "../../server/ai/contracts";

// ---------------------------------------------------------------------------------------------------------------------
// The JSON Schema files
// ---------------------------------------------------------------------------------------------------------------------

interface JsonSchema {
  type?: string | string[];
  const?: unknown;
  enum?: unknown[];
  pattern?: string;
  format?: string;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  propertyNames?: JsonSchema;
  items?: JsonSchema;
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  "x-contract"?: { name: string; version: number };
}

const CONTRACTS_DIR = fileURLToPath(new URL("../../spec/contracts/", import.meta.url));
const SCHEMA_FILES = fs.readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith(".schema.json")).sort();
const SCHEMAS: Record<string, JsonSchema> = Object.fromEntries(
  SCHEMA_FILES.map((file) => {
    const schema = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, file), "utf8")) as JsonSchema;
    return [`${schema["x-contract"].name}.v${schema["x-contract"].version}`, schema];
  }),
);
const IDS = Object.keys(CONTRACTS).sort() as ContractId[];

function resolveRef(root: JsonSchema, ref: string): JsonSchema {
  const m = /^#\/\$defs\/([A-Za-z0-9_]+)$/.exec(ref);
  if (!m || !root.$defs?.[m[1]]) throw new Error(`unsupported $ref ${ref}`);
  return root.$defs[m[1]];
}

// ---------------------------------------------------------------------------------------------------------------------
// Reference validator (the subset of JSON Schema 2020-12 used in spec/contracts)
// ---------------------------------------------------------------------------------------------------------------------

const ANNOTATIONS = ["$schema", "$id", "title", "description", "x-contract", "$defs"];
const ASSERTIONS = [
  "type", "const", "enum", "pattern", "format", "maxLength", "minItems", "maxItems", "minimum", "maximum",
  "required", "properties", "additionalProperties", "propertyNames", "items", "$ref",
];
const KNOWN_KEYWORDS = new Set([...ANNOTATIONS, ...ASSERTIONS]);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const typesOf = (s: JsonSchema): string[] => (s.type === undefined ? [] : [s.type].flat());

function isType(type: string, v: unknown): boolean {
  switch (type) {
    case "null": return v === null;
    case "boolean": return typeof v === "boolean";
    case "string": return typeof v === "string";
    case "integer": return typeof v === "number" && Number.isInteger(v);
    case "number": return typeof v === "number" && Number.isFinite(v);
    case "array": return Array.isArray(v);
    case "object": return isObject(v);
    default: throw new Error(`unsupported type ${type}`);
  }
}

function isDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = m.slice(1).map(Number);
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

// `format` is asserted here (RFC 3339, upper-case T and Z, seconds required), as the contracts README asks zod to
// validate the full schema; 2020-12 would treat it as an annotation by default.
function isDateTime(s: string): boolean {
  const m = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/.exec(s);
  return m !== null && isDate(m[1]);
}

/** Errors (paths) for `value` against `schema`; empty when valid. */
function jsonErrors(root: JsonSchema, schema: JsonSchema, value: unknown, at = "$"): string[] {
  for (const k of Object.keys(schema)) if (!KNOWN_KEYWORDS.has(k)) throw new Error(`unsupported keyword ${k} at ${at}`);
  if (schema.$ref !== undefined) {
    if (Object.keys(schema).length > 1) throw new Error(`$ref with siblings at ${at}`);
    return jsonErrors(root, resolveRef(root, schema.$ref), value, at);
  }
  const types = typesOf(schema);
  if (types.length && !types.some((t) => isType(t, value))) return [`${at}: type`];
  const errs: string[] = [];
  if ("const" in schema && !isDeepStrictEqual(value, schema.const)) errs.push(`${at}: const`);
  if (schema.enum && !schema.enum.some((e) => isDeepStrictEqual(e, value))) errs.push(`${at}: enum`);
  if (typeof value === "string") {
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) errs.push(`${at}: pattern`);
    if (schema.maxLength !== undefined && Array.from(value).length > schema.maxLength) errs.push(`${at}: maxLength`);
    if (schema.format === "date" && !isDate(value)) errs.push(`${at}: format`);
    else if (schema.format === "date-time" && !isDateTime(value)) errs.push(`${at}: format`);
    else if (schema.format !== undefined && schema.format !== "date" && schema.format !== "date-time") {
      throw new Error(`unsupported format ${schema.format}`);
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${at}: minimum`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${at}: maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${at}: minItems`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${at}: maxItems`);
    if (schema.items) value.forEach((item, i) => errs.push(...jsonErrors(root, schema.items, item, `${at}[${i}]`)));
  }
  if (isObject(value)) {
    for (const k of schema.required ?? []) if (!(k in value)) errs.push(`${at}.${k}: required`);
    for (const [k, v] of Object.entries(value)) {
      const declared = schema.properties?.[k];
      if (declared) errs.push(...jsonErrors(root, declared, v, `${at}.${k}`));
      else if (schema.additionalProperties === false) errs.push(`${at}.${k}: additional`);
      else if (isObject(schema.additionalProperties)) errs.push(...jsonErrors(root, schema.additionalProperties, v, `${at}.${k}`));
      if (schema.propertyNames) errs.push(...jsonErrors(root, schema.propertyNames, k, `${at}.<${k}>`));
    }
  }
  return errs;
}

// ---------------------------------------------------------------------------------------------------------------------
// One valid sample per contract (fictional data). Every optional property is present, nullable ones are not null,
// every array and map has at least one entry, so `variants` can reach every keyword.
// ---------------------------------------------------------------------------------------------------------------------

const RUN = "run_ab12cd34ef";

const SAMPLES: Record<ContractId, Record<string, unknown>> = {
  "fact-sheet.v1": {
    contract: "fact-sheet.v1",
    run_id: RUN,
    generated_at: "2026-11-20T09:30:00Z",
    customer: { fact_id: "CU-12", name: "Fictional Industries" },
    use_cases: [
      {
        fact_id: "UC-101",
        solution: "Knowledge search",
        use_case_type: "Pilot",
        status: "Live",
        is_live: true,
        subsidiary: "Fictional Industries EU",
        department: "Support",
        expected_launch_date: "2026-12-01",
        value_snippet: "Shorter answer times.",
        people: ["Alex Example"],
        text: "Notes about the pilot.",
      },
    ],
    events: [
      {
        fact_id: "EV-7",
        event_type: "Workshop",
        subsidiary: "Fictional Industries EU",
        event_date: "2026-10-15",
        stage: "Completed",
        attendee_count: 12,
        people: ["Sam Sample"],
        text: "Workshop notes.",
      },
    ],
    counts: { use_cases: 1, live_use_cases: 1, events: 1, by_status: { Live: 1 } },
    redactions: [{ kind: "email", count: 2 }],
  },
  "analyst-to-writer.v1": {
    contract: "analyst-to-writer.v1",
    run_id: RUN,
    no_activity: false,
    overview: [{ point: "One live use case.", fact_ids: ["CU-12", "UC-101"] }],
    wins: [{ point: "The pilot went live.", fact_ids: ["UC-101"] }],
    risks: [{ point: "No follow-up event is planned.", fact_ids: ["EV-7"] }],
    next_steps: [{ point: "Plan a review.", fact_ids: ["EV-7"] }],
  },
  "writer-draft.v1": {
    contract: "writer-draft.v1",
    run_id: RUN,
    revision: 1,
    sections: ["Overview", "Wins", "Risks", "Next steps"].map((heading) => ({
      heading,
      sentences: [{ text: `${heading} sentence.`, factual: true, fact_ids: ["UC-101"] }],
    })),
  },
  "brief-draft.v1": {
    contract: "brief-draft.v1",
    run_id: RUN,
    customer_id: 12,
    status: "unverified",
    html: "<h3>Overview</h3><p>One live use case. [UC-101]</p>",
    citations: ["UC-101"],
    issues: [{ type: "uncited", detail: "Sentence has no citation." }],
    word_count: 120,
    revisions: 2,
    usage: { input_tokens: 1000, output_tokens: 300, cache_read_tokens: 800, cost_usd: 0.0125 },
  },
  "task-handoff.v1": {
    contract: "task-handoff.v1",
    task: "AIB-T01",
    agent: "session",
    covers: ["AIB-CITE-001", "AOPS-ORCH-002"],
    files_changed: ["server/ai/contracts.ts"],
    tests: ["tests/unit/contracts.test.ts"],
    gates: { G1: "pass" },
    verdict: "pending",
    reviewer: "session",
  },
  "judge-verdict.v1": {
    contract: "judge-verdict.v1",
    case_id: "rich-03",
    judge_prompt_version: "judge.v1",
    criteria: [
      { criterion: "faithfulness", evidence: ["Two use cases are live."], reasoning: "Matches the fact sheet.", score: 5 },
      { criterion: "coverage", evidence: ["Renewal is at risk."], reasoning: "Names the main risk.", score: 4 },
      { criterion: "actionability", evidence: ["Schedule a review."], reasoning: "One concrete step.", score: 3 },
      { criterion: "executive_tone", evidence: ["Two use cases are live."], reasoning: "Short and plain.", score: 4 },
    ],
  },
};

// ---------------------------------------------------------------------------------------------------------------------
// Variants derived from a JSON Schema and a valid sample
// ---------------------------------------------------------------------------------------------------------------------

type Path = (string | number)[];
type Bag = Record<string | number, unknown>;
/** `expect` is the known answer (true = valid) when the variant is built to be valid or invalid; else undefined. */
interface Variant { label: string; value: unknown; expect?: boolean }

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function edit(root: unknown, at: Path, change: (parent: Bag, key: string | number) => void): unknown {
  const out = copy(root);
  let parent = out as Bag;
  for (const k of at.slice(0, -1)) parent = parent[k] as Bag;
  change(parent, at[at.length - 1]);
  return out;
}
const setAt = (root: unknown, at: Path, v: unknown) => (at.length === 0 ? v : edit(root, at, (p, k) => { p[k] = v; }));
const deleteAt = (root: unknown, at: Path) => edit(root, at, (p, k) => { delete p[k]; });
const show = (at: Path) => at.reduce<string>((s, k) => (typeof k === "number" ? `${s}[${k}]` : `${s}.${k}`), "$");

/** One value of each JSON type; a probe whose type the schema does not allow must be rejected. */
const TYPE_PROBES: unknown[] = ["text", 1, 1.5, true, null, [], {}];

/** Strings near a valid one; anchored patterns must reject the padded ones. */
function patternProbes(v: string): [string, boolean | undefined][] {
  return [
    ["", false], [` ${v}`, false], [`${v} `, false], [`${v}\n`, false], [`x${v}`, false],
    ["x", undefined], [v.toLowerCase(), undefined], [v.toUpperCase(), undefined], [`${v}0`, undefined], [v.slice(0, -1), undefined],
  ];
}

const FORMAT_PROBES: Record<string, [string, boolean][]> = {
  date: [
    ["2028-02-29", true], ["2026-02-29", false], ["2026-02-30", false], ["2026-13-01", false], ["2026-1-5", false],
    ["20-11-2026", false], ["2026-11-20T10:00:00Z", false],
  ],
  "date-time": [
    ["2026-11-20T10:00:00.5+05:30", true], ["2026-11-20T23:59:59-08:00", true], ["2026-11-20", false],
    ["2026-11-20T10:00:00", false], ["2026-11-20T10:00Z", false], ["2026-11-20T10:00:00+0100", false],
    ["2026-11-20T24:00:00Z", false], ["2026-02-30T10:00:00Z", false], ["2026-11-20 10:00:00Z", false],
  ],
};

function variants(root: JsonSchema, sample: unknown): Variant[] {
  const out: Variant[] = [];
  const add = (label: string, at: Path, value: unknown, expected?: boolean) =>
    out.push({ label: `${show(at)} ${label}`, value: setAt(sample, at, value), expect: expected });

  const walk = (s: JsonSchema, v: unknown, at: Path): void => {
    if (s.$ref !== undefined) return walk(resolveRef(root, s.$ref), v, at);
    const types = typesOf(s);
    if (types.length) {
      for (const probe of TYPE_PROBES) {
        if (!types.some((t) => isType(t, probe))) add(`as ${JSON.stringify(probe)}`, at, probe, false);
      }
    }
    if (types.includes("null")) add("null", at, null, true);
    if ("const" in s) add("other const", at, "other.v1", false);
    if (s.enum) {
      for (const e of s.enum) add(`enum ${JSON.stringify(e)}`, at, e, true);
      add("not in enum", at, "not-in-enum", false);
    }
    if (typeof v === "string") {
      if (s.pattern !== undefined) for (const [probe, ok] of patternProbes(v)) add(`pattern ${JSON.stringify(probe)}`, at, probe, ok);
      if (s.format !== undefined) for (const [probe, ok] of FORMAT_PROBES[s.format]) add(`format ${probe}`, at, probe, ok);
      if (s.maxLength !== undefined) {
        add("at maxLength", at, "a".repeat(s.maxLength), true);
        add("over maxLength", at, "a".repeat(s.maxLength + 1), false);
        add("at maxLength in code points", at, "\u{1F600}".repeat(s.maxLength), true);
        add("over maxLength in code points", at, "\u{1F600}".repeat(s.maxLength + 1), false);
      }
    }
    if (typeof v === "number") {
      const step = types.includes("number") ? 0.001 : 1;
      if (s.minimum !== undefined) {
        add("at minimum", at, s.minimum, true);
        add("below minimum", at, s.minimum - step, false);
      }
      if (s.maximum !== undefined) {
        add("at maximum", at, s.maximum, true);
        add("above maximum", at, s.maximum + step, false);
      }
    }
    if (Array.isArray(v)) {
      if (v.length === 0) throw new Error(`sample array at ${show(at)} is empty`);
      const fill = (n: number) => Array.from({ length: n }, () => copy(v[0]));
      if (s.minItems) {
        add("below minItems", at, fill(s.minItems - 1), false);
        add("at minItems", at, fill(s.minItems), true);
      } else {
        add("empty", at, [], true);
      }
      if (s.maxItems !== undefined) {
        add("at maxItems", at, fill(s.maxItems), true);
        add("over maxItems", at, fill(s.maxItems + 1), false);
      }
      if (s.items) walk(s.items, v[0], [...at, 0]);
    }
    if (isObject(v)) {
      const required = s.required ?? [];
      for (const k of required) {
        if (!(k in v)) throw new Error(`sample misses ${show([...at, k])}`);
        out.push({ label: `${show(at)} without ${k}`, value: deleteAt(sample, [...at, k]), expect: false });
      }
      for (const k of Object.keys(s.properties ?? {})) {
        if (required.includes(k)) continue;
        if (!(k in v)) throw new Error(`sample misses optional ${show([...at, k])}`);
        out.push({ label: `${show(at)} without optional ${k}`, value: deleteAt(sample, [...at, k]), expect: true });
      }
      if (s.additionalProperties === false) {
        add("extra property", [...at, "unexpected_extra"], 1, false);
      } else if (isObject(s.additionalProperties)) {
        const entries = Object.entries(v);
        if (entries.length === 0) throw new Error(`sample map at ${show(at)} is empty`);
        add("empty map", at, {}, true);
        add("extra entry", [...at, "unexpected_extra"], entries[0][1]);
        if (s.propertyNames?.pattern !== undefined) {
          for (const [key, ok] of patternProbes(entries[0][0])) add(`key ${JSON.stringify(key)}`, [...at, key], entries[0][1], ok);
        }
        for (const [k, sub] of entries) walk(s.additionalProperties, sub, [...at, k]);
      }
      for (const [k, sub] of Object.entries(s.properties ?? {})) walk(sub, v[k], [...at, k]);
    }
  };
  walk(root, sample, []);
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// Structural comparison of a zod schema with its JSON Schema
// ---------------------------------------------------------------------------------------------------------------------

function unwrap(t: z.ZodTypeAny): z.ZodTypeAny {
  for (;;) {
    if (t instanceof z.ZodOptional || t instanceof z.ZodNullable) t = t.unwrap();
    else if (t instanceof z.ZodEffects) t = t.innerType();
    else return t;
  }
}

function structureErrors(root: JsonSchema, s: JsonSchema, t: z.ZodTypeAny, at: string, out: string[]): string[] {
  if (s.$ref !== undefined) return structureErrors(root, resolveRef(root, s.$ref), t, at, out);
  if (t.isNullable() !== typesOf(s).includes("null")) out.push(`${at}: nullability differs`);
  const inner = unwrap(t);
  if (s.properties) {
    if (!(inner instanceof z.ZodObject)) return [...out, `${at}: zod is not an object`];
    const zodKeys = Object.keys(inner.shape).sort();
    const jsonKeys = Object.keys(s.properties).sort();
    if (zodKeys.join() !== jsonKeys.join()) out.push(`${at}: properties ${zodKeys.join()} vs ${jsonKeys.join()}`);
    if ((inner._def.unknownKeys === "strict") !== (s.additionalProperties === false)) out.push(`${at}: strictness differs`);
    for (const k of jsonKeys) {
      const field = inner.shape[k] as z.ZodTypeAny | undefined;
      if (!field) continue;
      if (field.isOptional() === (s.required ?? []).includes(k)) out.push(`${at}.${k}: required differs`);
      structureErrors(root, s.properties[k], field, `${at}.${k}`, out);
    }
  } else if (s.items) {
    if (!(inner instanceof z.ZodArray)) return [...out, `${at}: zod is not an array`];
    structureErrors(root, s.items, inner.element, `${at}[]`, out);
  } else if (isObject(s.additionalProperties)) {
    if (!(inner instanceof z.ZodRecord)) return [...out, `${at}: zod is not a record`];
    structureErrors(root, s.additionalProperties, inner.valueSchema, `${at}{}`, out);
  } else if (inner instanceof z.ZodObject || inner instanceof z.ZodArray || inner instanceof z.ZodRecord) {
    out.push(`${at}: zod has structure the JSON Schema does not`);
  }
  return out;
}

const zodAccepts = (id: ContractId, value: unknown) => CONTRACTS[id].safeParse(value).success;
/** The error strings of a failed result (`in` narrows even without strictNullChecks, which tsconfig.app.json turns off). */
const errorsOf = (result: ContractResult<unknown>): string[] => ("errors" in result ? result.errors : []);

// ---------------------------------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------------------------------

describe("contract registry", () => {
  it("AOPS-ORCH-002 has one zod schema per contract file in spec/contracts, keyed by name and version", () => {
    expect(SCHEMA_FILES.length).toBeGreaterThanOrEqual(5); // 5 since CR-20261121-1 removed critic-verdict.v1
    expect(Object.keys(SCHEMAS).sort()).toEqual(IDS);
    for (const id of IDS) expect(SCHEMAS[id].properties?.contract?.const).toBe(id);
  });
});

describe("zod schemas agree with the JSON Schema files", () => {
  for (const id of IDS) {
    it(`AOPS-ORCH-002 ${id}: same properties, required set, strictness and nullability as the JSON Schema`, () => {
      expect(structureErrors(SCHEMAS[id], SCHEMAS[id], CONTRACTS[id], "$", [])).toEqual([]);
    });

    it(`AOPS-ORCH-002 ${id}: zod accepts and rejects exactly what the JSON Schema accepts and rejects`, () => {
      const schema = SCHEMAS[id];
      const sample = SAMPLES[id];
      expect(jsonErrors(schema, schema, sample)).toEqual([]);
      expect(zodAccepts(id, sample)).toBe(true);

      const cases = variants(schema, sample);
      expect(cases.length).toBeGreaterThan(20);
      const wrongReference: string[] = [];
      const disagreements: string[] = [];
      for (const c of cases) {
        const jsonOk = jsonErrors(schema, schema, c.value).length === 0;
        if (c.expect !== undefined && jsonOk !== c.expect) wrongReference.push(c.label);
        if (zodAccepts(id, c.value) !== jsonOk) disagreements.push(`${c.label} (JSON Schema ${jsonOk ? "accepts" : "rejects"})`);
      }
      expect(wrongReference).toEqual([]);
      expect(disagreements).toEqual([]);
      // Both answers occur, so the comparison is not vacuous.
      expect(cases.some((c) => c.expect === true)).toBe(true);
      expect(cases.some((c) => c.expect === false)).toBe(true);
    });
  }
});

describe("fact IDs", () => {
  const factSheet = SAMPLES["fact-sheet.v1"];
  const schema = SCHEMAS["fact-sheet.v1"];
  const both = (value: unknown) => ({
    json: jsonErrors(schema, schema, value).length === 0,
    zod: validateContract("fact-sheet.v1", value).ok,
  });

  it("AIB-CITE-001 the fact sheet accepts only CU-, UC- and EV- fact IDs built from a numeric id, each on its own record kind", () => {
    const cases: [Path, string, boolean][] = [
      [["customer", "fact_id"], "CU-42", true],
      [["customer", "fact_id"], "CU-0", true],
      [["customer", "fact_id"], "UC-42", false],
      [["customer", "fact_id"], "CU-", false],
      [["customer", "fact_id"], "CU-4a", false],
      [["customer", "fact_id"], "cu-42", false],
      [["customer", "fact_id"], "CU-4.2", false],
      [["customer", "fact_id"], "CU--42", false],
      [["use_cases", 0, "fact_id"], "UC-1234567", true],
      [["use_cases", 0, "fact_id"], "EV-12", false],
      [["use_cases", 0, "fact_id"], "UC-12 ", false],
      [["events", 0, "fact_id"], "EV-3", true],
      [["events", 0, "fact_id"], "UC-3", false],
      [["events", 0, "fact_id"], "EV-three", false],
    ];
    for (const [at, factId, ok] of cases) {
      expect(both(setAt(factSheet, at, factId)), `${show(at)} = ${factId}`).toEqual({ json: ok, zod: ok });
    }
  });

  it("AIB-CITE-001 every record in the fact sheet must carry its fact ID", () => {
    for (const at of [["customer", "fact_id"], ["use_cases", 0, "fact_id"], ["events", 0, "fact_id"]] as Path[]) {
      expect(both(deleteAt(factSheet, at)), show(at)).toEqual({ json: false, zod: false });
    }
  });

  it("AIB-CITE-001 citations in later hand-offs accept fact IDs of any record kind and nothing else", () => {
    const sites: [ContractId, Path][] = [
      ["analyst-to-writer.v1", ["wins", 0, "fact_ids", 0]],
      ["writer-draft.v1", ["sections", 0, "sentences", 0, "fact_ids", 0]],
      ["brief-draft.v1", ["citations", 0]],
    ];
    for (const [id, at] of sites) {
      for (const [factId, ok] of [["CU-1", true], ["UC-22", true], ["EV-333", true], ["XX-1", false], ["UC", false], ["UC-1,UC-2", false], ["[UC-1]", false]] as [string, boolean][]) {
        const value = setAt(SAMPLES[id], at, factId);
        const json = jsonErrors(SCHEMAS[id], SCHEMAS[id], value).length === 0;
        expect({ json, zod: validateContract(id, value).ok }, `${id} ${show(at)} = ${factId}`).toEqual({ json: ok, zod: ok });
      }
    }
  });
});

describe("validateContract", () => {
  it("AOPS-ORCH-002 returns a valid hand-off unchanged: nothing added, stripped or coerced", () => {
    for (const id of IDS) {
      const result = validateContract(id, copy(SAMPLES[id]));
      expect(result).toStrictEqual({ ok: true, value: SAMPLES[id] });
    }
    // An absent optional property stays absent (no `reviewer: undefined` added).
    const { reviewer: _reviewer, ...withoutReviewer } = SAMPLES["task-handoff.v1"];
    expect(validateContract("task-handoff.v1", withoutReviewer)).toStrictEqual({ ok: true, value: withoutReviewer });
    // A map key zod's record parser would drop (`__proto__` from JSON.parse) is kept: the input itself is returned.
    const sheet = JSON.parse(JSON.stringify(SAMPLES["fact-sheet.v1"]));
    const withProtoKey = JSON.parse(
      JSON.stringify(sheet).replace('"by_status":{', '"by_status":{"__proto__":1,'),
    );
    expect(Object.keys(withProtoKey.counts.by_status)).toContain("__proto__");
    const kept = validateContract("fact-sheet.v1", withProtoKey);
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(Object.keys(kept.value.counts.by_status)).toContain("__proto__");
  });

  it("AOPS-ORCH-002 rejects an invalid hand-off with errors and no value, never repairing it", () => {
    const sample = SAMPLES["writer-draft.v1"];
    const invalid = [
      setAt(sample, ["revision"], "1"), // no coercion of "1" to 1
      setAt(sample, ["unexpected_extra"], true), // not stripped
      deleteAt(sample, ["sections"]), // no default
      setAt(sample, ["sections", 0, "heading"], "overview"), // no case folding
      setAt(sample, ["sections", 0, "sentences", 0, "text"], "x".repeat(401)), // not truncated
      setAt(sample, ["contract"], "writer-draft.v2"),
      null,
      "{}",
    ];
    for (const value of invalid) {
      const result = validateContract("writer-draft.v1", value);
      expect(result.ok, JSON.stringify(value)?.slice(0, 80)).toBe(false);
      expect("value" in result).toBe(false);
      expect(errorsOf(result).length).toBeGreaterThan(0);
    }
  });

  it("AOPS-ORCH-002 checks a hand-off against the contract it names, not any contract", () => {
    expect(validateContract("brief-draft.v1", SAMPLES["writer-draft.v1"]).ok).toBe(false);
    expect(validateContract("nope.v1" as ContractId, SAMPLES["fact-sheet.v1"])).toEqual({
      ok: false,
      errors: ["(root): unknown contract id"],
    });
  });

  it("AOPS-ORCH-002 error strings name the path and the rule but never a field value", () => {
    const marker = "zz-private-zz";
    let value = SAMPLES["fact-sheet.v1"];
    value = setAt(value, ["customer", "name"], `${marker} `.repeat(30)) as Bag;
    value = setAt(value, ["use_cases", 0, "text"], `${marker} `.repeat(200)) as Bag;
    value = setAt(value, ["use_cases", 0, "is_live"], marker) as Bag;
    value = setAt(value, ["use_cases", 0, "fact_id"], marker) as Bag;
    value = setAt(value, ["events", 0, "event_date"], marker) as Bag;
    value = setAt(value, ["redactions", 0, "kind"], marker) as Bag;
    value = setAt(value, ["contract"], marker) as Bag;
    value = setAt(value, ["counts", "by_status", `In progress ${marker}`], -1) as Bag;
    value = setAt(value, ["counts", "extra_note"], marker) as Bag;
    value = deleteAt(value, ["run_id"]) as Bag;

    const result = validateContract("fact-sheet.v1", value);
    expect(result.ok).toBe(false);
    const errors = errorsOf(result);
    expect(errors.join("\n")).not.toContain(marker);
    expect(errors).toEqual(
      expect.arrayContaining([
        'contract: must equal "fact-sheet.v1"',
        "run_id: is required",
        "customer.name: must be at most 200 characters",
        "use_cases[0].fact_id: does not match the required pattern",
        "use_cases[0].is_live: expected boolean, received string",
        "use_cases[0].text: must be at most 1500 characters",
        "events[0].event_date: is not a valid date",
        'redactions[0].kind: must be one of "email", "phone", "link", "truncated"',
        "counts.by_status[?]: must be at least 0",
        "counts.extra_note: unexpected property",
      ]),
    );
  });

  it("AOPS-ORCH-002 caps the error strings and counts the rest", () => {
    const sample = SAMPLES["fact-sheet.v1"];
    const useCase = (sample.use_cases as Bag[])[0];
    const value = setAt(sample, ["use_cases"], Array.from({ length: 30 }, () => ({ ...useCase, is_live: "yes" })));
    const result = validateContract("fact-sheet.v1", value);
    expect(result.ok).toBe(false);
    const errors = errorsOf(result);
    expect(errors).toHaveLength(MAX_CONTRACT_ERRORS + 1);
    expect(errors[MAX_CONTRACT_ERRORS]).toBe(`(${30 - MAX_CONTRACT_ERRORS} more errors)`);
  });
});

describe("task-handoff.v1 after CR-20261121-1", () => {
  it("DEVA-HAND-004 accepts session as agent and reviewer, and earlier hand-offs naming retired agents still validate", () => {
    const current = SAMPLES["task-handoff.v1"];
    expect(validateContract("task-handoff.v1", current).ok).toBe(true);
    expect(validateContract("task-handoff.v1", { ...current, reviewer: "human" }).ok).toBe(true);
    expect(validateContract("task-handoff.v1", { ...current, agent: "AGENT-IMPLEMENTER", reviewer: "AGENT-REVIEWER" }).ok).toBe(true);
    expect(validateContract("task-handoff.v1", { ...current, agent: "human" }).ok).toBe(false);
    expect(validateContract("task-handoff.v1", { ...current, reviewer: "someone" }).ok).toBe(false);
  });
});
