import { describe, expect, test } from "bun:test";
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
