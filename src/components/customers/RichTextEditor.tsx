import { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { sanitizeHtml } from "@/lib/html";

// Keep size / font / alignment as inline styles (not Quill's own classes) and accept any value, so formatting that came from the
// Power Apps rich text editor survives being opened and re-saved here.
type Attributor = { whitelist: string[] | null };
const Size = Quill.import("attributors/style/size") as unknown as Attributor;
const Font = Quill.import("attributors/style/font") as unknown as Attributor;
Size.whitelist = null;
Font.whitelist = null;
Quill.register(Quill.import("attributors/style/size") as never, true);
Quill.register(Quill.import("attributors/style/font") as never, true);
Quill.register(Quill.import("attributors/style/align") as never, true);

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ size: ["10px", "12px", "14px", "16px", "18px", "24px"] }],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  [{ align: [] }],
  ["link", "clean"],
];

const toInitialHtml = (v: string) =>
  /<\/?[a-z][\s\S]*?>/i.test(v)
    ? sanitizeHtml(v)
    : v
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!).replace(/\n/g, "<br>")}</p>`)
        .join("");

/** Rich text editor (Quill) that reports its HTML on every change; "" when the editor is empty. */
export function RichTextEditor({ html, onChange, compact }: { html: string; onChange: (html: string) => void; compact?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const mount = document.createElement("div");
    el.appendChild(mount);

    const quill = new Quill(mount, {
      theme: "snow",
      placeholder: "Write the executive summary...",
      modules: { toolbar: TOOLBAR },
    });
    quill.setContents(quill.clipboard.convert({ html: toInitialHtml(html) }), "silent");
    quill.on("text-change", () => onChangeRef.current(quill.getText().trim() ? quill.getSemanticHTML() : ""));
    quill.focus();
    quill.setSelection(quill.getLength(), 0);

    // Strict Mode mounts twice; Quill adds its toolbar next to the container, so clear the whole host.
    return () => {
      el.innerHTML = "";
    };
    // The editor is created once with the starting HTML; later edits live inside Quill.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className={compact ? "terra-editor terra-editor-compact" : "terra-editor"} />;
}
