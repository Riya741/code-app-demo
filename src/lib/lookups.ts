import type {
  Content_type,
  Department,
  Event_type,
  Personnel,
  Solution,
  SolutionStatusRow,
  SolutionUseCaseTypeRow,
  Stakeholder,
  Subsidiary,
} from "@/lib/types";
import { api, getTable } from "@/lib/workbookApi";

export type { SolutionStatusRow, SolutionUseCaseTypeRow };

/** Options for the Add forms' dropdowns. `value` is what gets saved, `label` what the user sees. */
export type Option = { value: string; label: string };

/**
 * Subsidiaries of a customer. The customer's own `id` is tried first, then its `parent_id`, until one of them yields
 * subsidiaries (in the workbook both are the same number).
 */
export async function fetchSubsidiaries(customerKeys: number[]): Promise<Subsidiary[]> {
  for (const key of customerKeys) {
    const found = await getTable<Subsidiary>("subsidiary", { where: { parent_id: key }, orderBy: "subsidiary_name" });
    if (found.length) return found;
  }
  return [];
}

export const fetchDepartments = (subsidiaryKey: number) =>
  getTable<Department>("department", { where: { subsidiary_id: subsidiaryKey }, orderBy: "department_name" });

export const fetchStakeholders = (departmentKey: number) =>
  getTable<Stakeholder>("stakeholder", { where: { department_id: departmentKey }, orderBy: "stakeholder_name" });

export const fetchSolutions = () => getTable<Solution>("solution", { orderBy: "solution_name" });
export const fetchContentTypes = () => getTable<Content_type>("content_type", { orderBy: "content_type" });
export const fetchPersonnel = () => getTable<Personnel>("personnel", { orderBy: "name" });
export const fetchEventTypes = () => getTable<Event_type>("event_type", { orderBy: "event_type" });

/** Every solution -> allowed use case types. Filter by `solution_id` in the form. */
export const fetchSolutionUseCaseTypes = () => api<SolutionUseCaseTypeRow[]>("/solution-use-case-types");

/** Every solution -> allowed statuses. Filter by `solution_id` in the form. */
export const fetchSolutionStatuses = () => api<SolutionStatusRow[]>("/solution-statuses");

/**
 * Lookup tables like subsidiary and department carry both a surrogate `id` and a second `<name>_id` column, and it isn't
 * visible from the schema which one the use case / event rows point at. Rows already on screen settle it: match each
 * row's name to the lookup and see which column its saved id equals. Defaults to `id` when there is nothing to learn from.
 */
export function detectKey(
  samples: { key?: number; name?: string }[],
  lookup: { id?: number; alt?: number; name?: string }[],
): "id" | "alt" {
  let id = 0;
  let alt = 0;
  for (const s of samples) {
    if (s.key == null || !s.name) continue;
    const hits = lookup.filter((l) => l.name?.toLowerCase() === s.name!.toLowerCase());
    if (hits.some((l) => l.id === s.key)) id++;
    if (hits.some((l) => l.alt === s.key)) alt++;
  }
  return alt > id ? "alt" : "id";
}
