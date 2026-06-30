import { describe, expect, test } from "bun:test";
import { parseServerAddress } from "../src/utils/connection-string";
import {
  buildObjectNameLiteral,
  buildTableReference,
  clampSqlInteger,
  quoteIdentifierPart,
  sqlLikeContainsLiteral,
  sqlStringLiteral,
  validateReadOnlyQuery,
} from "../src/utils/query";

describe("SQL query helpers", () => {
  test("escapes SQL string literals", () => {
    expect(sqlStringLiteral("dbo' UNION SELECT name--")).toBe(
      "'dbo'' UNION SELECT name--'"
    );
  });

  test("quotes SQL Server identifiers", () => {
    expect(quoteIdentifierPart("weird]name")).toBe("[weird]]name]");
    expect(buildTableReference("Orders]Archive", "sales")).toBe(
      "[sales].[Orders]]Archive]"
    );
  });

  test("builds OBJECT_ID object name literals safely", () => {
    expect(buildObjectNameLiteral("Get'Report", "dbo")).toBe(
      "'[dbo].[Get''Report]'"
    );
  });

  test("escapes LIKE contains patterns", () => {
    expect(sqlLikeContainsLiteral("100%_[x]")).toBe(
      "'%100\\%\\_[[]x]%' ESCAPE '\\'"
    );
  });

  test("clamps integer SQL fragments", () => {
    expect(clampSqlInteger(0, 1, 100, 10)).toBe(1);
    expect(clampSqlInteger(101.9, 1, 100, 10)).toBe(100);
    expect(clampSqlInteger(Number.NaN, 1, 100, 10)).toBe(10);
  });

  test("rejects stacked or commented read-only queries", () => {
    expect(() => validateReadOnlyQuery("SELECT 1")).not.toThrow();
    expect(() => validateReadOnlyQuery("SELECT 1; DROP TABLE Users")).toThrow();
    expect(() => validateReadOnlyQuery("SELECT 1 -- tail")).toThrow();
  });

  test("rejects write-capable or external SELECT constructs", () => {
    expect(() => validateReadOnlyQuery("SELECT * INTO copied_users FROM Users")).toThrow();
    expect(() => validateReadOnlyQuery("SELECT * FROM OPENROWSET('SQLNCLI', 'server=x', 'SELECT 1')")).toThrow();
    expect(() => validateReadOnlyQuery("SELECT 1 WAITFOR DELAY '00:00:05'")).toThrow();
  });
});

describe("connection string helpers", () => {
  test("parses SQL Server host values without ports", () => {
    expect(parseServerAddress("localhost")).toEqual({ server: "localhost" });
    expect(parseServerAddress(" tcp:database.example.com ")).toEqual({
      server: "tcp:database.example.com",
    });
  });

  test("parses SQL Server host values with comma ports", () => {
    expect(parseServerAddress("localhost,1433")).toEqual({
      server: "localhost",
      port: 1433,
    });
    expect(parseServerAddress(" tcp:database.example.com , 1500 ")).toEqual({
      server: "tcp:database.example.com",
      port: 1500,
    });
  });

  test("rejects malformed SQL Server port values", () => {
    expect(() => parseServerAddress(",1433")).toThrow();
    expect(() => parseServerAddress("localhost,")).toThrow();
    expect(() => parseServerAddress("localhost,abc")).toThrow();
    expect(() => parseServerAddress("localhost,1433abc")).toThrow();
    expect(() => parseServerAddress("localhost,0")).toThrow();
    expect(() => parseServerAddress("localhost,65536")).toThrow();
    expect(() => parseServerAddress("localhost,1433,extra")).toThrow();
  });
});
