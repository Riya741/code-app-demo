# Design — Exports

## Components and files
| File | Role |
|---|---|
| `src/lib/csv.ts` | `exportCsv(filename, columns, rows)`, `exportFileName(customer, what, ext)`, `prettify` (unused) |
| `src/lib/wordDoc.ts` | `downloadWordDoc(filename, title, subtitle, html)` |
| `src/components/customers/ExportButton.tsx` | Shared button |
| `src/components/customers/DataGrid.tsx` | Builds rows for CSV |

## CSV escape
```
s = v == null ? "" : String(v)
if typeof v == "string" and /^[=+\-@\t\r]/.test(s): s = "'" + s
if /[",\n\r]/.test(s): s = '"' + s.replaceAll('"','""') + '"'
```
File = BOM + lines joined by CRLF; `text/csv;charset=utf-8`.

## Word document
Word namespace HTML (`xmlns:o`, `xmlns:w`), inline `<style>`, body = sanitised HTML (light colours) or escaped
paragraphs; Blob `application/msword;charset=utf-8` with BOM.

## Planned change — EXP-NAME-002
`customer.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || "customer"`.

## Planned change — EXP-WORD-004 (optional)
Generate `.docx` with a small library (e.g. `docx` or `html-docx-js`) only if users report the warning; requires an
ADR because it adds a dependency (Article VIII).

## Constitution check
| Article | Compliance |
|---|---|
| III | Formula-injection guard; sanitised Word body. ✅ |
| V | Success toasts after export. ✅ |
| VIII | No export library; browser-only. ✅ |
