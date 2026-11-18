// "Last modified" timestamp formatting (spec 003-executive-summary SUM-VIEW-004). Task SUM-T11.
import { describe, expect, it } from "vitest";
import { fmtUtc } from "@/components/customers/CustomerDetails";

/** Some ICU versions put a narrow no-break space (U+202F) before AM/PM; the criterion is about the words, not the space. */
const fmt = (v: unknown) => fmtUtc(v)?.replace(/\s/g, " ") ?? null;

describe("fmtUtc", () => {
  it("SUM-VIEW-004 formats as Mon D, YYYY, h:mm AM/PM UTC", () => {
    expect(fmt("2026-10-16T15:42:00Z")).toBe("Oct 16, 2026, 3:42 PM UTC");
    expect(fmt("2026-01-05T09:05:00Z")).toBe("Jan 5, 2026, 9:05 AM UTC");
  });

  it("SUM-VIEW-004 reads a zone-less timestamp as UTC", () => {
    expect(fmt("2026-10-16T15:42:00")).toBe("Oct 16, 2026, 3:42 PM UTC");
    expect(fmt("2026-10-16T15:42:00.123")).toBe("Oct 16, 2026, 3:42 PM UTC");
  });

  it("SUM-VIEW-004 reads a zone-less timestamp with a space instead of T as UTC", () => {
    expect(fmt("2026-10-16 15:42:00")).toBe("Oct 16, 2026, 3:42 PM UTC");
  });

  it("SUM-VIEW-004 converts a timestamp with a zone offset to UTC", () => {
    expect(fmt("2026-10-16T17:42:00+02:00")).toBe("Oct 16, 2026, 3:42 PM UTC");
    expect(fmt("2026-10-16T10:42:00-0500")).toBe("Oct 16, 2026, 3:42 PM UTC");
  });

  it("SUM-VIEW-004 reads a date-only value as midnight UTC", () => {
    expect(fmt("2026-10-16")).toBe("Oct 16, 2026, 12:00 AM UTC");
  });

  it("SUM-VIEW-004 hides placeholder dates before the year 2000 and shows 2000 itself", () => {
    expect(fmtUtc("1900-01-01T00:00:00")).toBeNull();
    expect(fmtUtc("1999-12-31 23:59:59")).toBeNull();
    expect(fmt("2000-01-01T00:00:00")).toBe("Jan 1, 2000, 12:00 AM UTC");
  });

  it("SUM-VIEW-004 returns null for invalid, blank and non-string values", () => {
    for (const v of ["not a date", "", "   ", null, undefined, 42, new Date("2026-10-16T15:42:00Z")]) {
      expect(fmtUtc(v)).toBeNull();
    }
  });
});
