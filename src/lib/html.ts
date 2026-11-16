import DOMPurify from "dompurify";

const HTML_RE = /<\/?[a-z][\s\S]*?>/i;

export const looksLikeHtml = (v: unknown): v is string => typeof v === "string" && HTML_RE.test(v);

/** HTML -> single-line readable text (for grid cells, search, sort and CSV). */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(
    html.replace(/<\/(p|div|li|h[1-6]|tr)>|<br\s*\/?>/gi, " $&"),
    "text/html",
  );
  return (doc.body.textContent ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

/** Inline CSS we keep from rich-text content. Anything else (position, url(), expressions...) is dropped. */
const ALLOWED_CSS = new Set([
  "color", "background-color", "font-size", "font-weight", "font-style", "font-family", "line-height",
  "text-decoration", "text-decoration-line", "text-align", "text-indent", "margin-left", "padding-left",
]);
const SAFE_CSS_VALUE = /^[#\w\s.,%()\-+"'/]+$/;
const UNSAFE_CSS = /url\s*\(|expression|javascript|@import|var\s*\(/i;

/** #rgb / #rrggbb / rgb() / rgba() / black / white -> [r, g, b]; null for anything else (named colours etc. are left alone). */
function parseColor(v: string): [number, number, number] | null {
  const c = v.trim().toLowerCase();
  if (c === "black") return [0, 0, 0];
  if (c === "white") return [255, 255, 255];
  let m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

let probe: CanvasRenderingContext2D | null | undefined;

/** parseColor, plus anything else the browser understands (hsl(), named and system colours). */
function resolveColor(v: string): [number, number, number] | null {
  const direct = parseColor(v);
  if (direct) return direct;
  if (probe === undefined) probe = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!probe) return null;
  probe.fillStyle = "#010203";
  probe.fillStyle = v; // ignored when v is not a colour
  return probe.fillStyle === "#010203" ? null : parseColor(probe.fillStyle);
}

function toHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

/** hsl(...) as #rrggbb, for legacy attributes such as <font color> that don't accept hsl(). */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Dark-theme display only: text colours that would vanish on a dark panel (black, navy...) are lightened and light
 * backgrounds darkened, keeping the hue. The stored HTML is never changed. Returns null to drop the declaration.
 */
function adaptForDark(prop: string, value: string, asHex = false): string | null {
  const rgb = resolveColor(value);
  if (!rgb) return value;
  const [h, sat, l] = toHsl(rgb);
  const out = (nl: number) => (asHex ? hslToHex(h, sat, nl) : `hsl(${Math.round(h)}, ${Math.round(sat)}%, ${Math.round(nl)}%)`);
  const bright = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255; // perceived brightness, 0..1
  if (prop === "color") {
    return bright >= 0.5 ? value : out(clamp(100 - l, 62, 90));
  }
  if (bright < 0.5) return value;
  if (sat < 12 && l > 88) return null; // plain white "paper" -> let the dark panel show through
  return out(clamp(100 - l, 14, 34));
}

/** Set by sanitizeHtml for the duration of one (synchronous) sanitise call. */
let darkDisplay = false;

function cleanStyle(style: string): string {
  return style
    .split(";")
    .map((decl) => {
      const i = decl.indexOf(":");
      if (i < 0) return "";
      const prop = decl.slice(0, i).trim().toLowerCase();
      const value = decl.slice(i + 1).trim();
      if (!ALLOWED_CSS.has(prop) || !value || !SAFE_CSS_VALUE.test(value) || UNSAFE_CSS.test(value)) return "";
      if (darkDisplay && (prop === "color" || prop === "background-color")) {
        const adapted = adaptForDark(prop, value);
        return adapted ? `${prop}: ${adapted}` : "";
      }
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

// Keep the rich-text formatting (colour, size, weight, alignment, Quill ql-* classes) but nothing that could restyle the page.
DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style") {
    const cleaned = cleanStyle(data.attrValue);
    data.attrValue = cleaned;
    data.keepAttr = !!cleaned;
  } else if (darkDisplay && (data.attrName === "color" || data.attrName === "bgcolor")) {
    const adapted = adaptForDark(data.attrName === "color" ? "color" : "background-color", data.attrValue.trim(), true);
    data.attrValue = adapted ?? "";
    data.keepAttr = !!adapted;
  } else if (data.attrName === "class") {
    const kept = data.attrValue.split(/\s+/).filter((c) => /^ql-[\w-]+$/.test(c)).join(" ");
    data.attrValue = kept;
    data.keepAttr = !!kept;
  }
});
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Sanitised HTML safe to inject; drops scripts and event handlers, keeps safe inline formatting (colour, font size, weight,
 * alignment). Pass `dark` when showing it on a dark theme so authored dark colours stay readable.
 */
export function sanitizeHtml(html: string, dark = false): string {
  darkDisplay = dark;
  try {
    return DOMPurify.sanitize(html, { FORBID_TAGS: ["style"] });
  } finally {
    darkDisplay = false;
  }
}

/**
 * Classes for showing rich text. Bold text inherits its colour (so `<span style="color:red"><strong>..` stays red) and the
 * rest follows the app theme; pair with `sanitizeHtml(html, isDark)` so authored colours stay legible in dark mode.
 */
export const RICH_TEXT_CLASS =
  "prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:text-title prose-a:text-primary prose-strong:text-inherit";
