// Date-only values on the stored calendar day (spec 020-performance-reliability DT-TIME-003). Tasks UCP-T08, EVP-T07, PERF-T03.
import { afterAll, describe, expect, it } from "vitest";
import { formatDay, isoDay, parseDay } from "@/lib/dates";

const previousTz = process.env.TZ;
afterAll(() => {
  if (previousTz === undefined) delete process.env.TZ;
  else process.env.TZ = previousTz;
});

/** Node re-reads TZ when it is assigned, so each zone below really is in effect for `Date`. */
const ZONES = ["America/Los_Angeles", "Pacific/Honolulu", "UTC", "Asia/Kolkata", "Pacific/Kiritimati"];

describe("formatDay", () => {
  it.each(ZONES)("DT-TIME-003 shows the stored calendar day in %s", (zone) => {
    process.env.TZ = zone;
    expect(formatDay("2026-11-11", "en-US")).toBe("Nov 11, 2026");
    expect(formatDay("2026-01-01", "en-US")).toBe("Jan 1, 2026");
    // A timestamp read back from the workbook keeps its stored day; the time part is ignored.
    expect(formatDay("2026-11-11T00:00:00.000Z", "en-US")).toBe("Nov 11, 2026");
    expect(formatDay("2026-12-31T23:30:00", "en-US")).toBe("Dec 31, 2026");
  });

  it("DT-TIME-003 the old instant-based reading is a day early west of UTC (why the helper exists)", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(new Date("2026-11-11").getDate()).toBe(10);
    expect(parseDay("2026-11-11")?.getDate()).toBe(11);
  });

  it("DT-TIME-003 empty, malformed, impossible and pre-2000 placeholder values show nothing", () => {
    for (const v of [undefined, null, "", "  ", "not a date", "11/11/2026", "2026-02-31", "2026-13-01", "1900-01-01", "1999-12-31"]) {
      expect(formatDay(v, "en-US")).toBe("");
      expect(isoDay(v)).toBeUndefined();
    }
  });

  it("DT-TIME-003 sorts and filters on YYYY-MM-DD of the stored day", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(isoDay("2026-11-11T00:00:00.000Z")).toBe("2026-11-11");
    expect(isoDay(" 2000-01-01 ")).toBe("2000-01-01");
  });
});
