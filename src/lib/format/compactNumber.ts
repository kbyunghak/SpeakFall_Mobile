const UNITS = [
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
  { value: 1_000, suffix: "K" },
] as const;

/** UI용 숫자 축약: 1,000 → 1K, 10,500 → 10.5K */
export function formatCompactNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  for (const unit of UNITS) {
    if (safeValue < unit.value) continue;
    const scaled = safeValue / unit.value;
    const digits = scaled < 100 && !Number.isInteger(scaled) ? 1 : 0;
    return `${scaled.toFixed(digits).replace(/\.0$/, "")}${unit.suffix}`;
  }
  return Math.floor(safeValue).toLocaleString("en-US");
}
