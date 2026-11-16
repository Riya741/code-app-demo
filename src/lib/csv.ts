const escape = (v: unknown) => {
  let s = v == null ? "" : String(v);
  // Text that starts with = + - @ would be run as a formula when the file is opened in Excel; prefix it so it stays text.
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(
  filename: string,
  columns: { id: string; header: string }[],
  rows: Record<string, unknown>[],
) {
  const lines = [columns.map((c) => escape(c.header)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => escape(r[c.id])).join(","));
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const prettify = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/** e.g. "Northmere_Bank_use-cases_2026-10-19.csv" */
export const exportFileName = (customer: string, what: string, ext = "csv") =>
  `${(customer || "customer").replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "")}_${what}_${new Date().toISOString().slice(0, 10)}.${ext}`;
