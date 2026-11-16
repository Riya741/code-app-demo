import { sanitizeHtml } from "@/lib/html";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Downloads rich text as a Word document (HTML in a Word wrapper, opens and edits in Word with colours and sizes kept).
 * `html` may also be plain text. Content is sanitised first.
 */
export function downloadWordDoc(filename: string, title: string, subtitle: string, html: string) {
  const body = /<\/?[a-z][\s\S]*?>/i.test(html)
    ? sanitizeHtml(html)
    : html
        .split(/\n{2,}/)
        .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
        .join("");
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1f2937; }
  h1 { color: #1e3a5f; font-size: 18pt; margin: 0 0 2pt; }
  .meta { color: #0f766e; font-size: 9pt; margin: 0 0 14pt; }
  h2, h3 { color: #1e3a5f; }
</style></head>
<body><h1>${esc(title)}</h1>${subtitle ? `<p class="meta">${esc(subtitle)}</p>` : ""}${body}</body></html>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", doc], { type: "application/msword;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
