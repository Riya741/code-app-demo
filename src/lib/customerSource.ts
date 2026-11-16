import type { CustomerRow } from "@/lib/types";
import { getTable } from "@/lib/workbookApi";

/** Loads the visible customers from the `customer` sheet of code-app-data.xlsx. */
export async function fetchCustomers(): Promise<{ rows: CustomerRow[] }> {
  const all = await getTable<CustomerRow>("customer");
  const rows = all.filter((r) => r.visible === true || r.visible === 1 || r.visible === "true");
  return { rows };
}
