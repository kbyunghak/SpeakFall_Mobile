import { describe, expect, test } from "bun:test";
import { WORDS } from "./index";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

describe("pronunciation aliases", () => {
  test("모든 bear에 bare가 Homophone으로 등록되어 있다", () => {
    const bears = WORDS.filter(({ word }) => normalize(word) === "bear");
    expect(bears.length).toBeGreaterThan(0);
    for (const bear of bears) expect(bear.homophones).toContain("bare");
  });

  test("rain에 reign이 Homophone으로 등록되어 있다", () => {
    const rain = WORDS.find(({ word }) => normalize(word) === "rain");
    expect(rain?.homophones).toContain("reign");
  });

  test("two에 to와 too가 Homophone으로 등록되어 있다", () => {
    const two = WORDS.find(({ word }) => word === "two");
    expect(two?.homophones).toEqual(expect.arrayContaining(["to", "too"]));
  });

  test("pig-pick은 Homophone이 아닌 Natural Alias다", () => {
    const pig = WORDS.find(({ word }) => normalize(word) === "pig");
    expect(pig?.naturalAliases).toContain("pick");
    expect(pig?.homophones ?? []).not.toContain("pick");
  });

  test("허용 목록은 정규화 후에도 유효하고 서로 중복되지 않는다", () => {
    const violations: string[] = [];
    for (const item of WORDS) {
      const target = normalize(item.word);
      const homophones = (item.homophones ?? []).map(normalize);
      const aliases = (item.naturalAliases ?? []).map(normalize);
      if (!homophones.every(Boolean)) violations.push(`${item.word}: empty homophone`);
      if (!aliases.every(Boolean)) violations.push(`${item.word}: empty natural alias`);
      if (homophones.includes(target)) violations.push(`${item.word}: self homophone`);
      if (aliases.includes(target)) violations.push(`${item.word}: self natural alias`);
      if (new Set(homophones).size !== homophones.length) {
        violations.push(`${item.word}: duplicate homophone`);
      }
      if (new Set(aliases).size !== aliases.length) {
        violations.push(`${item.word}: duplicate natural alias`);
      }
      if (homophones.some((value) => aliases.includes(value))) {
        violations.push(`${item.word}: homophone/natural alias overlap`);
      }
    }
    expect(violations).toEqual([]);
  });
});
