import { describe, expect, test } from "bun:test";
import {
  fallDurationForLevel,
  fallSpeedForLevel,
  swayDistanceForLevel,
  swayDurationForLevel,
} from "./difficulty";

describe("screen-independent game difficulty", () => {
  test("uses a fixed 30-to-20 second fall duration", () => {
    expect(fallDurationForLevel(1)).toBe(30);
    expect(fallDurationForLevel(10)).toBe(20);
  });

  test("increases fall speed gradually without a high-level spike", () => {
    const speeds = Array.from({ length: 10 }, (_, index) => fallSpeedForLevel(index + 1));
    expect(speeds.every((speed, index) => index === 0 || speed >= speeds[index - 1]!)).toBe(true);
    expect(Math.max(...speeds.slice(1).map((speed, index) => speed - speeds[index]!))).toBeLessThan(
      0.004,
    );
  });

  test("shortens horizontal travel from 32vw to 8vw", () => {
    expect(swayDistanceForLevel(1)).toBe(32);
    expect(swayDistanceForLevel(10)).toBe(8);
  });

  test("slows the horizontal sway to a 9-to-6 second cycle", () => {
    expect(swayDurationForLevel(1)).toBe(9);
    expect(swayDurationForLevel(10)).toBe(6);
  });

  test("caps levels outside 1 through 10", () => {
    expect(fallDurationForLevel(0)).toBe(fallDurationForLevel(1));
    expect(fallDurationForLevel(99)).toBe(fallDurationForLevel(10));
  });
});
