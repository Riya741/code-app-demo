import type { CustomerRow } from "@/lib/types";
import { getTable, post } from "@/lib/workbookApi";

/** Loads the visible customers from the `customer` sheet of code-app-data.xlsx. */
export async function fetchCustomers(): Promise<{ rows: CustomerRow[] }> {
  const all = await getTable<CustomerRow>("customer");
  const rows = all.filter((r) => r.visible === true || r.visible === 1 || r.visible === "true");
  return { rows };
}

export type SaveSummaryResult = { id: number; summary_last_modified: string };

/**
 * Writes a customer's executive summary to the workbook (SUM-EDIT-001, API-SUMM-001). `id` is the `customer` sheet `id`;
 * the server stores a blank summary as null and stamps `summary_last_modified` with the current UTC time.
 */
export function saveSummary(id: number, html: string): Promise<SaveSummaryResult> {
  return post<SaveSummaryResult>(`/customers/${encodeURIComponent(id)}/summary`, { executive_summary: html });
}
