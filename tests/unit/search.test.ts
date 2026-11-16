// Customer search ranking (spec 001-customer-search). Task SRCH-T07.
import { describe, expect, it } from "vitest";
import { MAX_RESULTS, normaliseQuery, rankMatches, score, tokenize } from "@/lib/search";

/** Score a name/id pair for a raw query, the way SearchBox does. */
const rank = (name: string, id: string, raw: string) => {
  const q = normaliseQuery(raw);
  return score(name, id, q, tokenize(q));
};

describe("query normalisation", () => {
  it("SRCH-RANK-001 trims and lower-cases the query", () => {
    expect(normaliseQuery("  Northmere BANK  ")).toBe("northmere bank");
  });

  it("SRCH-RANK-001 splits into unique whitespace-separated tokens", () => {
    expect(tokenize("bank  north\tbank")).toEqual(["bank", "north"]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("matching", () => {
  it("SRCH-RANK-002 matches when every token is a substring of the name", () => {
    expect(rank("Northmere Bank", "1001", "bank mere")).not.toBeNull();
  });

  it("SRCH-RANK-002 does not match when one token is missing from the name", () => {
    expect(rank("Northmere Bank", "1001", "bank insurance")).toBeNull();
  });

  it("SRCH-RANK-002 matches on a parent ID that contains the whole query", () => {
    expect(rank("Northmere Bank", "1001", "100")).toBe(4);
  });
});

describe("ranking", () => {
  it("SRCH-RANK-003 ranks an exact name match 0", () => {
    expect(rank("Northmere Bank", "1001", "northmere bank")).toBe(0);
  });

  it("SRCH-RANK-003 ranks an exact parent ID match 0", () => {
    expect(rank("Northmere Bank", "1001", "1001")).toBe(0);
  });

  it("SRCH-RANK-003 ranks a name that starts with the query 1", () => {
    expect(rank("Northmere Bank", "1001", "northmere b")).toBe(1);
  });

  it("SRCH-RANK-003 ranks 2 when every token starts a word (words split on punctuation)", () => {
    expect(rank("Northmere Bank", "1001", "bank north")).toBe(2);
    expect(rank("Müller & Söhne-Präzision", "1002", "präz söh")).toBe(2);
  });

  it("SRCH-RANK-003 ranks any other name match 3", () => {
    expect(rank("Northmere Bank", "1001", "mere")).toBe(3);
  });

  it("SRCH-RANK-003 sorts by rank, then by name", () => {
    const q = normaliseQuery("bank");
    const index = [
      { row: "C", name: "Zenfield Banking", id: "3" },
      { row: "B", name: "Investment bank", id: "2" },
      { row: "A", name: "Bank of Alder", id: "1" },
      { row: "D", name: "Ambergate Bank", id: "4" },
    ];
    // "Bank of Alder" starts with the query (1); "Ambergate Bank", "Investment bank" and "Zenfield Banking"
    // have a word starting with it (2), sorted by name.
    expect(rankMatches(index, q, tokenize(q)).results).toEqual(["A", "D", "B", "C"]);
  });
});

describe("result cap", () => {
  it("SRCH-RANK-004 returns at most 100 rows but counts every match", () => {
    const index = Array.from({ length: 150 }, (_, i) => ({ row: i, name: `Customer ${i}`, id: String(i) }));
    const q = normaliseQuery("customer");
    const { results, total } = rankMatches(index, q, tokenize(q));
    expect(MAX_RESULTS).toBe(100);
    expect(results).toHaveLength(100);
    expect(total).toBe(150);
  });

  it("SRCH-RANK-004 returns nothing for an empty query", () => {
    expect(rankMatches([{ row: 1, name: "Northmere Bank", id: "1" }], "", [])).toEqual({ results: [], total: 0 });
  });
});
