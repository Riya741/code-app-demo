/** Thin client for the local workbook service (server/workbook.ts, served by the Vite dev server). */

const BASE = "/api/workbook";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch {
    throw new Error("Could not reach the workbook service. Start the app with `npm run dev`.");
  }
  // Outside the dev server the SPA fallback answers with index.html instead of JSON.
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("The workbook service is not available here. It only runs with `npm run dev` / `npm run preview`.");
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `The workbook request failed (${res.status}).`);
  return body as T;
}

type Query = { where?: Record<string, string | number>; orderBy?: string };

/** Rows of one sheet, optionally filtered on column = value (all conditions must match) and ordered. */
export function getTable<T>(name: string, { where, orderBy }: Query = {}): Promise<T[]> {
  const params = new URLSearchParams();
  for (const [col, val] of Object.entries(where ?? {})) params.append("where", `${col}:${val}`);
  if (orderBy) params.set("orderBy", orderBy);
  const qs = params.toString();
  return api<T[]>(`/table/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`);
}

export const post = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const remove = <T>(path: string) => api<T>(path, { method: "DELETE" });
