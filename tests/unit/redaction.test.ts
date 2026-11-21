// @vitest-environment node
// Redaction and field forms shared by the Retriever's fact sheet and the read-only tools (spec 022 AIB-SAFE-003,
// ai-data-policy §3). Task AIB-T02, which also took over the AOPS-T02 review findings 5 and 6 on `server/ai/tools.ts`.
//
// Each "documented limit" test pins a trade-off described in the "Known limits" comments in server/ai/tools.ts (links
// and emails; phone numbers); if a limit is lifted, change that comment and the test together.
//
// Non-ASCII characters are written as escapes (\u{…}) or built with String.fromCharCode, never as literals.
import { describe, expect, it } from "vitest";
import {
  LOOKUP_MAX,
  NAME_MAX,
  PEOPLE_MAX,
  RedactionTally,
  STAGE_MAX,
  calendarDay,
  dataText,
  eventFact,
  redact,
  useCaseFact as toUseCaseFact,
} from "../../server/ai/tools";

/** Redacts one string with a fresh tally: [text, tally list]. */
function run(text: string) {
  const tally = new RedactionTally();
  return [redact(text, tally), tally.list()] as const;
}

/** ASCII digits as full-width digits (U+FF10-U+FF19). */
const fullWidth = (s: string) => s.replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));

describe("phone number separators and digits", () => {
  it("AIB-SAFE-003 treats Unicode hyphens and dashes (U+2010-U+2015) and slashes as separators", () => {
    for (const dash of ["\u{2010}", "\u{2011}", "\u{2012}", "\u{2013}", "\u{2014}", "\u{2015}", "/"]) {
      const phone = ["555", "123", "4567"].join(dash);
      expect(run(`Call ${phone} now`), JSON.stringify(dash)).toEqual(["Call [phone] now", [{ kind: "phone", count: 1 }]]);
    }
    expect(run("Call 1\u{2013}800\u{2013}555\u{2013}0199")[0]).toBe("Call [phone]");
    // A date written with an en dash or slashes is still a date.
    expect(run("On 2026\u{2013}01\u{2013}03 and 03/01/2026")).toEqual(["On 2026\u{2013}01\u{2013}03 and 03/01/2026", []]);
  });

  it("AIB-SAFE-003 redacts phone numbers written in full-width digits and leaves the rest of the text as it was", () => {
    expect(run(`Call ${fullWidth("5551234567")} today`)).toEqual(["Call [phone] today", [{ kind: "phone", count: 1 }]]);
    expect(run(`Tel ${fullWidth("555-123-4567")}, ${fullWidth("2026")}`)[0]).toBe(`Tel [phone], ${fullWidth("2026")}`);
    expect(run(`Renewals ${fullWidth("2024 2025 2026")}`)[0]).toBe(`Renewals ${fullWidth("2024 2025 2026")}`);
  });

  it("AIB-SAFE-003 documented limit: a full-width plus is not part of the number; the digits are still redacted", () => {
    expect(run("Call \u{ff0b}44 20 7946 0958")[0]).toBe("Call \u{ff0b}[phone]");
  });
});

describe("documented limits found in review 2", () => {
  it("AIB-SAFE-003 documented limit: separators outside the stage-1 list split a phone number, which is then kept", () => {
    const kept = [
      "Call 555  123  4567",
      "Call 555\t123\t4567",
      "Call 555\u{2009}123\u{2009}4567",
      "Call 555\u{202f}123\u{202f}4567",
      "Call 555\u{2212}123\u{2212}4567",
      "Call 555\u{ff0d}123\u{ff0d}4567",
      "Call \u{ff08}555\u{ff09}123-4567",
      "Call 555\u{3000}123\u{3000}4567",
    ];
    for (const text of kept) expect(run(text), JSON.stringify(text)).toEqual([text, []]);
  });

  it("AIB-SAFE-003 documented limit: a link path over 2 048 characters is kept; a long query is cut at 2 048", () => {
    const longPath = `See https://ex.com/${"a".repeat(3000)}?q=1`;
    expect(run(longPath)).toEqual([longPath, []]);
    const longQuery = run(`See https://ex.com/p?q=${"b".repeat(3000)}`)[0];
    expect(longQuery.startsWith("See [link]")).toBe(true);
    expect(longQuery.length).toBeLessThan(3000);
  });

  it("AIB-SAFE-003 documented limit: invalid email addresses are redacted only in part or not at all", () => {
    expect(run(`${"a".repeat(70)}@example.com`)[0]).toBe(`${"a".repeat(6)}[email]`);
    const manyLabels = "d@a.b.c.d.e.f.g.h.i.j.k.com";
    expect(run(manyLabels)[0]).not.toBe("[email]");
    const longLabel = `d@${"x".repeat(64)}.com`;
    expect(run(longLabel)[0]).not.toBe("[email]");
  });
});

describe("amounts next to a currency", () => {
  it("AIB-SAFE-003 redacts phone-shaped numbers next to a currency sign, a currency code or a percent sign", () => {
    const redacted = ["USD 555-123-4567", "\u{20ac} 555 123 4567", "555 123 4567 USD", "Sum 555 123 4567%", "$07700900123", "07700900123 EUR"];
    for (const text of redacted) expect(run(text)[1], text).toEqual([{ kind: "phone", count: 1 }]);
    expect(run("Sum 555 123 4567%")[0]).toBe("Sum [phone]%");
  });

  it("AIB-SAFE-003 keeps amount-shaped numbers next to a currency or a percent sign", () => {
    for (const text of ["Contract $ 612 345 678", "\u{20ac}612.345.678", "Contract 612345678 EUR", "Growth 123456789%", "GBP 123456789.50"]) {
      expect(run(text), text).toEqual([text, []]);
    }
  });

  it("AIB-SAFE-003 documented limit: an unseparated number not starting with 0 next to a currency is kept as an amount", () => {
    expect(run("USD 5551234567")).toEqual(["USD 5551234567", []]);
  });
});

describe("links", () => {
  it("AIB-SAFE-003 redacts links with a query string with or without a scheme", () => {
    expect(run("See www.example.com/?q=1 and example.com/deck?token=abc.")).toEqual([
      "See [link] and [link].",
      [{ kind: "link", count: 2 }],
    ]);
    expect(run("Open https://x.example:8443/p?q=1&r=2, then www.example.com?ref=mail")[0]).toBe("Open [link], then [link]");
    expect(run("Docs at https://example.com/page and www.example.com/about")[1]).toEqual([]);
  });

  it("AIB-SAFE-003 documented limit: a bare domain with a query but no path is not redacted", () => {
    expect(run("Try example.com?q=1")).toEqual(["Try example.com?q=1", []]);
  });

  it("AIB-SAFE-003 documented limit: a long number in a link path without a query is redacted as a phone number", () => {
    expect(run("https://example.com/123456789/987")[0]).toBe("https://example.com/[phone]");
  });
});

describe("worst-case input", () => {
  it("AIB-SAFE-003 redacts a 32 767-character cell of any shape in linear time", () => {
    const MAX = 32_767; // Excel's limit per cell
    const fill = (unit: string) => unit.repeat(Math.ceil(MAX / unit.length)).slice(0, MAX);
    const cells = [
      fill("a"),
      `${fill("a").slice(1)}@`,
      fill("a."),
      fill("a.aa/"),
      fill("a@b."),
      `www.${fill("a")}`,
      `https://${fill("a/")}?`,
      fill("1"),
      `${fill("1 ").slice(1)}x`,
      fill("1-"),
      fill("+1 (2) "),
      fill("2026-01-03 "),
    ];
    for (const cell of cells) {
      const started = performance.now();
      redact(cell, new RedactionTally());
      expect(performance.now() - started, cell.slice(0, 12)).toBeLessThan(500);
    }
  });
});

describe("phone numbers", () => {
  it("AIB-SAFE-003 redacts phone numbers written without separators", () => {
    expect(run("Call 5551234567 today")).toEqual(["Call [phone] today", [{ kind: "phone", count: 1 }]]);
    expect(run("Mobile 07700900123.")).toEqual(["Mobile [phone].", [{ kind: "phone", count: 1 }]]);
    expect(run("+447700900123")[0]).toBe("[phone]");
  });

  it("AIB-SAFE-003 redacts a phone number directly followed by a date and keeps the date", () => {
    expect(run("Ring 20 7946 0958 2026-01-03 at noon")[0]).toBe("Ring [phone] 2026-01-03 at noon");
    expect(run("Ring 20 7946 0958 03.01.2026")[0]).toBe("Ring [phone] 03.01.2026");
    expect(run("2026-01-03 5551234567")[0]).toBe("2026-01-03 [phone]");
    expect(run("Ring +44 20 7946 0958 2026-01-03T09:00:00Z")[0]).toBe("Ring [phone] 2026-01-03T09:00:00Z");
  });

  it("AIB-SAFE-003 redacts a whole number with a short leading group such as 1-800-555-0199", () => {
    expect(run("Toll free 1-800-555-0199.")).toEqual(["Toll free [phone].", [{ kind: "phone", count: 1 }]]);
    expect(run("1 800 555 0199")[0]).toBe("[phone]");
    expect(run("+1 (800) 555-0199")[0]).toBe("[phone]");
    expect(run("+44 (0)20 7946 0958")[0]).toBe("[phone]");
  });

  it("AIB-SAFE-003 keeps amounts, years, decimals and addresses that only look like long numbers", () => {
    const kept = [
      "Budget 1 200 000 000 for the year",
      "Budget 1.200.000.000",
      "Reach 200 000 000 users",
      "Contract $ 612 345 678",
      "Contract 612345678 EUR",
      "Growth 123456789%",
      "Renewals 2024 2025 2026",
      "Pi is 3.14159265358",
      "Host 192.168.100.200",
      "Calls on 2026-01-03 2026-01-10, 1,500 credits, $10M",
      "Launch 2026-01-03 for 120 users",
    ];
    for (const text of kept) expect(run(text), text).toEqual([text, []]);
  });

  it("AIB-SAFE-003 finds each of several numbers in one run and leaves a year next to them", () => {
    expect(run("555-123-4567 555-765-4321")).toEqual(["[phone] [phone]", [{ kind: "phone", count: 2 }]]);
    expect(run("Since 2026 5551234567")[0]).toBe("Since 2026 [phone]");
    expect(run("20 7946 0958 2026 renewal")[0]).toBe("[phone] 2026 renewal");
    // A leading group that looks like a year stays part of the number when the rest is too short to be one.
    expect(run("2079 460 958")[0]).toBe("[phone]");
  });

  it("AIB-SAFE-003 counts every email, phone number and query-string link in the tally", () => {
    const tally = new RedactionTally();
    const text = redact("a@example.com, b@example.org, 5551234567, https://x.example/p?q=1 and (555) 123-4567", tally);
    expect(text).toBe("[email], [email], [phone], [link] and [phone]");
    expect(tally.list()).toEqual([
      { kind: "email", count: 2 },
      { kind: "phone", count: 2 },
      { kind: "link", count: 1 },
    ]);
  });

  it("AIB-SAFE-003 documented limit: fewer than nine digits is not redacted", () => {
    expect(run("Desk 7946 0958, ext 555-0199")).toEqual(["Desk 7946 0958, ext 555-0199", []]);
  });

  it("AIB-SAFE-003 documented limit: a number glued to letters is not redacted", () => {
    expect(run("Call 5551234567x12 or tel5551234567 (INV123456789)")[0]).toBe("Call 5551234567x12 or tel5551234567 (INV123456789)");
  });

  it("AIB-SAFE-003 documented limit: three groups of three are a phone number unless the last group is 000", () => {
    expect(run("Call 612 345 678")[0]).toBe("Call [phone]");
    expect(run("Reach 612 345 000")[0]).toBe("Reach 612 345 000");
  });

  it("AIB-SAFE-003 documented limit: long numbers that are not phone numbers are redacted (the safe side)", () => {
    expect(run("Budget 1200000000 and range 100000-200000")[0]).toBe("Budget [phone] and range [phone]");
    expect(run("Ticket 12345/67890")[0]).toBe("Ticket [phone]");
  });
});

describe("every string field", () => {
  it("AIB-SAFE-003 redacts and cuts lookup names and event stage, and lists every redaction", () => {
    const tally = new RedactionTally();
    const fact = toUseCaseFact(
      {
        id: 1,
        solution_name: "Suite a@example.com",
        use_case_type: "Type b@example.com",
        status: "Live c@example.com",
        subsidiary_name: "Sub d@example.com",
        department_name: "Dept 5551234567",
        note: null,
      },
      1500,
      tally,
    );
    expect([fact.solution, fact.use_case_type, fact.status, fact.subsidiary, fact.department]).toEqual([
      "Suite [email]",
      "Type [email]",
      "Live [email]",
      "Sub [email]",
      "Dept [phone]",
    ]);
    expect(fact.is_live).toBe(true);
    expect(tally.list()).toEqual([
      { kind: "email", count: 4 },
      { kind: "phone", count: 1 },
    ]);

    const evTally = new RedactionTally();
    const event = eventFact(
      { id: 2, event_type: "Workshop e@example.com", subsidiary_name: "S".repeat(LOOKUP_MAX + 50), stage: `Call f@example.com or 5551234567 ${"S".repeat(3000)}` },
      1500,
      evTally,
    );
    expect(event.event_type).toBe("Workshop [email]");
    expect(event.subsidiary).toBe("S".repeat(LOOKUP_MAX));
    expect(event.stage).toBe(`Call [email] or [phone] ${"S".repeat(STAGE_MAX - 24)}`);
    expect(evTally.list()).toEqual([
      { kind: "email", count: 2 },
      { kind: "phone", count: 1 },
      { kind: "truncated", count: 2 },
    ]);
  });
});

describe("cuts", () => {
  it("AIB-SAFE-003 cuts text by characters, never inside one, and lists the cut as truncated", () => {
    const tally = new RedactionTally();
    const emoji = "\u{1F600}";
    expect(dataText(emoji.repeat(10), 4, tally)).toBe(emoji.repeat(4));
    expect(dataText(emoji.repeat(4), 4, tally)).toBe(emoji.repeat(4)); // 8 UTF-16 units, 4 characters: not cut
    expect(dataText("   ", 4, tally)).toBeNull();
    expect(tally.list()).toEqual([{ kind: "truncated", count: 1 }]);
  });

  it("AIB-SAFE-003 caps names at 20 per record and lists a cut list of names as truncated", () => {
    const names = Array.from({ length: PEOPLE_MAX + 5 }, (_, i) => `Person ${i + 1}`);
    const tally = new RedactionTally();
    const fact = toUseCaseFact({ id: 7, personnel_names: names.join(", "), stakeholder_name: "Person 1" }, 1500, tally);
    expect(fact.people).toEqual(names.slice(0, PEOPLE_MAX));
    expect(tally.list()).toEqual([{ kind: "truncated", count: 1 }]);

    const exact = new RedactionTally();
    expect(eventFact({ id: 8, css_contributors: names.slice(0, PEOPLE_MAX).join(", ") }, 1500, exact).people).toHaveLength(PEOPLE_MAX);
    expect(exact.list()).toEqual([]);

    const long = new RedactionTally();
    expect(eventFact({ id: 9, css_contributors: "N".repeat(NAME_MAX + 1) }, 1500, long).people).toEqual(["N".repeat(NAME_MAX)]);
    expect(long.list()).toEqual([{ kind: "truncated", count: 1 }]);
  });
});

describe("dates", () => {
  it("AIB-SAFE-003 sends dates as the stored calendar day YYYY-MM-DD, or null", () => {
    expect(calendarDay("2026-01-03")).toBe("2026-01-03");
    expect(calendarDay("2026-01-03T23:30:00")).toBe("2026-01-03"); // a Date cell as the Store reads it: the stored day
    expect(calendarDay("2026-01-03 09:00")).toBe("2026-01-03");
    expect(calendarDay(new Date(Date.UTC(2026, 0, 3)))).toBe("2026-01-03");
    expect(calendarDay(46025)).toBe("2026-01-03"); // Excel serial day number
    expect(calendarDay(46025.75)).toBe("2026-01-03"); // with a time of day
    expect(calendarDay(61)).toBe("1900-03-01");
    for (const bad of ["2026-02-30", "2026-13-01", "2026-1-3", "03/01/2026", "2026-01-031", "soon", "", 0, 60, -5, Infinity, NaN, 3e6, true, null, undefined, {}, new Date("x")]) {
      expect(calendarDay(bad), String(bad)).toBeNull();
    }
  });
});
