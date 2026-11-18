// @vitest-environment node
// Editing a use case keeps the target fields the form does not show (spec 005-use-case-form UCF-EDIT-004). Task UCF-T08.
// Runs through the QA-T03 harness: a temp copy of the generated fixture, re-read from the file with `reopen()`.
import { describe, expect, it } from "vitest";
import type { UseCaseInput, UseCaseRow } from "@/lib/types";
import { workbookApi } from "./harness";

// Same helpers as UseCaseForm.tsx (exported there); copied so this node-environment file does not load the component.
const splitIds = (v?: string) => (v ? v.split(/[\s,;|]+/).filter(Boolean) : []);
const idList = (v: string[]) => (v.length ? v.join(",") : undefined);

type Row = Record<string, string | number | boolean | null>;

const api = workbookApi();
const rows = async (sheet: string, query = "") => (await api.request<Row[]>("GET", `/api/workbook/table/${sheet}${query}`)).body;
const TARGETS = { target_users: 250, target_credits_consumed: 1200, target_api_calls: 50000 };

/** Saves a new use case with target values (as other tools would) and returns its id and customer. */
async function useCaseWithTargets() {
  const [customer] = await rows("customer");
  const [subsidiary] = await rows("subsidiary", `?where=parent_id:${customer.id}`);
  const [allowed] = await rows("solution_status");
  const { status, body } = await api.request<{ id: number }>("POST", "/api/workbook/use-cases", {
    parent_id: customer.id,
    subsidiary_id: subsidiary.id,
    solution_id: allowed.solution_id,
    status_id: allowed.status_id,
    note: "<p>Edit round trip</p>",
    value_snippet: "Before the edit",
    ...TARGETS,
  });
  expect(status).toBe(200);
  return { id: body.id, parentId: customer.id as number };
}

/** The use case as the Use Cases panel receives it (GET /use-cases), which is what the edit form opens with. */
async function listed(parentId: number, id: number) {
  const { body } = await api.request<UseCaseRow[]>("GET", `/api/workbook/use-cases?parentId=${parentId}`);
  const row = body.find((r) => r.id === id);
  expect(row).toBeDefined();
  return row as UseCaseRow;
}

/**
 * The body the edit form posts on "Save changes" when the user changes only the value. This is a hand-written copy of
 * the mapping in `submit` (UseCaseForm.tsx), not the form's own code: this file's evidence for UCF-EDIT-004 depends on
 * the exact-body assertion in tests/component/UseCaseForm.test.tsx ("UCF-EDIT-002 Save changes posts the full use case
 * …"), which pins the shape the form really posts. Keep the two in step. `withTargets: false` is the body the form
 * would send without UCF-T08. No solutions lookup is loaded here, so `premium_credit` takes the form's fallback (the
 * row's stored flag); the solution's flag would win when it is known.
 */
function editBody(row: UseCaseRow, parentId: number, withTargets = true): UseCaseInput {
  return {
    id: row.id,
    ...(withTargets && {
      target_users: row.target_users,
      target_credits_consumed: row.target_credits_consumed,
      target_api_calls: row.target_api_calls,
    }),
    parent_id: parentId,
    subsidiary_id: row.subsidiary_id,
    department_id: row.department_id,
    stakeholder_id: row.stakeholder_id,
    solution_id: row.solution_id,
    use_case_type_id: row.use_case_type_id,
    status_id: row.status_id,
    expected_launch_date: row.expected_launch_date ? row.expected_launch_date.slice(0, 10) : undefined,
    content_type_ids: idList(splitIds(row.content_type_ids)),
    personnel_ids: idList(splitIds(row.personnel_ids)),
    value_snippet: "After the edit",
    note: row.note?.trim() ? row.note : undefined,
    premium_credit: row.premium_credit ?? false,
    deleted: false,
  };
}

describe("use case edit round trip", () => {
  it("UCF-EDIT-004 an edit saved the way the form sends it leaves target_users, target_credits_consumed and target_api_calls unchanged in the file", async () => {
    const { id, parentId } = await useCaseWithTargets();
    const row = await listed(parentId, id);
    expect(row).toMatchObject(TARGETS);

    const saved = await api.request<{ id: number }>("POST", "/api/workbook/use-cases", editBody(row, parentId));
    expect(saved.status).toBe(200);
    expect(saved.body.id).toBe(id);

    const reread = await api.reopen()<Row[]>("GET", `/api/workbook/table/use_case?where=id:${id}`);
    expect(reread.body).toHaveLength(1);
    expect(reread.body[0]).toMatchObject({ ...TARGETS, value_snippet: "After the edit" });
  });

  // Why the form must send them: the API replaces every field it knows, so a body without targets clears them.
  it("UCF-EDIT-004 an edit body without the targets would erase them (the full-replace behaviour the form guards against)", async () => {
    const { id, parentId } = await useCaseWithTargets();
    const row = await listed(parentId, id);

    await api.request("POST", "/api/workbook/use-cases", editBody(row, parentId, false));

    const reread = await api.reopen()<Row[]>("GET", `/api/workbook/table/use_case?where=id:${id}`);
    expect(reread.body[0]).toMatchObject({ target_users: null, target_credits_consumed: null, target_api_calls: null });
  });
});
