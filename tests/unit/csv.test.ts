// CSV export and file names (spec 010-export). Task EXP-T07.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportCsv, exportFileName } from "@/lib/csv";

/** Runs exportCsv and returns what the browser would download: the file name, the raw text and the blob URL calls. */
async function download(columns: { id: string; header: string }[], rows: Record<string, unknown>[]) {
  let blob: Blob | undefined;
  const create = vi.fn((b: Blob) => ((blob = b), "blob:test"));
  const revoke = vi.fn();
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
  let filename = "";
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    filename = this.download;
  });
  exportCsv("out.csv", columns, rows);
  click.mockRestore();
  const bytes = new Uint8Array(await blob!.arrayBuffer());
  return { filename, bytes, text: new TextDecoder().decode(bytes), type: blob!.type, create, revoke };
}

const col = (id: string) => ({ id, header: id });

describe("CSV format", () => {
  it("EXP-CSV-001 writes UTF-8 with a BOM, CRLF line ends and the header row first", async () => {
    const { bytes, text, type, filename } = await download([col("name"), col("count")], [{ name: "Müller", count: 3 }]);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(type).toBe("text/csv;charset=utf-8");
    expect(text.replace(/^\ufeff/, "")).toBe("name,count\r\nMüller,3");
    expect(filename).toBe("out.csv");
  });

  it("EXP-CSV-002 quotes values with quotes, commas or line breaks, doubling quotes; null is empty", async () => {
    const rows = [{ v: 'say "hi"' }, { v: "a,b" }, { v: "line1\nline2" }, { v: null }, { v: undefined }];
    const { text } = await download([col("v")], rows);
    expect(text.replace(/^\ufeff/, "").split("\r\n")).toEqual(["v", '"say ""hi"""', '"a,b"', '"line1\nline2"', "", ""]);
  });

  it("EXP-CSV-003 prefixes formula-like strings with an apostrophe but leaves numbers alone", async () => {
    const rows = ["=SUM(1,2)", "+1", "-1", "@cmd", "\tx", "\rx", "plain", -5, 42].map((v) => ({ v }));
    const { text } = await download([col("v")], rows);
    const lines = text.replace(/^\ufeff/, "").split("\r\n").slice(1);
    expect(lines).toEqual(['"\'=SUM(1,2)"', "'+1", "'-1", "'@cmd", "'\tx", "\"'\rx\"", "plain", "-5", "42"]);
  });

  it("EXP-CSV-005 downloads through a Blob URL and revokes it afterwards", async () => {
    const { create, revoke } = await download([col("v")], [{ v: 1 }]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:test");
  });
});

describe("file names", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T23:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("EXP-NAME-001 names files <customer>_<what>_<UTC date>.<ext>", () => {
    expect(exportFileName("Northmere Bank", "use-cases")).toBe("Northmere_Bank_use-cases_2026-10-19.csv");
    expect(exportFileName("Tidewell Home & Living", "executive-summary", "doc")).toBe(
      "Tidewell_Home_Living_executive-summary_2026-10-19.doc",
    );
    expect(exportFileName("", "events")).toBe("customer_events_2026-10-19.csv");
  });

  // Known gap (gap register, fixed by EXP-T04): only ASCII letters survive today. it.fails passes while the gap
  // exists and starts failing once it is fixed, as a reminder to switch this to it() and update the spec.
  it.fails("EXP-NAME-002 keeps letters of any script in the customer part", () => {
    expect(exportFileName("Müller & Söhne", "events")).toBe("Müller_Söhne_events_2026-10-19.csv");
    expect(exportFileName("さくら電機", "events")).toBe("さくら電機_events_2026-10-19.csv");
  });
});
