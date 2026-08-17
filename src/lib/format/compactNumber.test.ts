import { describe, expect, test } from "bun:test";
import { formatCompactNumber } from "./compactNumber";

describe("formatCompactNumber", () => {
  test("천 단위 코인을 K로 표시한다", () => {
    expect(formatCompactNumber(1_000)).toBe("1K");
    expect(formatCompactNumber(10_000)).toBe("10K");
    expect(formatCompactNumber(10_500)).toBe("10.5K");
  });

  test("큰 숫자와 천 미만 숫자를 표시한다", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(1_000_000)).toBe("1M");
  });
});
