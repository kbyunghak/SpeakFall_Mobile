const MIN_LEVEL = 1;
const MAX_LEVEL = 10;
const LEVEL_RANGE = MAX_LEVEL - MIN_LEVEL;
const LEVEL_1_FALL_SECONDS = 30;
const LEVEL_10_FALL_SECONDS = 20;
const LEVEL_1_SWAY_SECONDS = 9;
const LEVEL_10_SWAY_SECONDS = 6;
const LEVEL_1_SWAY_VW = 32;
const LEVEL_10_SWAY_VW = 8;

function levelProgress(level: number): number {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
  return (safeLevel - MIN_LEVEL) / LEVEL_RANGE;
}

/** 화면 높이와 무관하게 Lv.1은 30초, Lv.10은 20초에 도착합니다. */
export function fallDurationForLevel(level: number): number {
  return (
    LEVEL_1_FALL_SECONDS - (LEVEL_1_FALL_SECONDS - LEVEL_10_FALL_SECONDS) * levelProgress(level)
  );
}

/** 정규화된 화면 좌표에서 사용하는 초당 낙하량입니다. */
export function fallSpeedForLevel(level: number): number {
  return 1 / fallDurationForLevel(level);
}

/** 화면 너비 기준 좌우 흔들림 거리입니다. 낮은 레벨일수록 넓게 움직입니다. */
export function swayDistanceForLevel(level: number): number {
  return LEVEL_1_SWAY_VW - (LEVEL_1_SWAY_VW - LEVEL_10_SWAY_VW) * levelProgress(level);
}

export function swayDurationForLevel(level: number): number {
  return (
    LEVEL_1_SWAY_SECONDS -
    (LEVEL_1_SWAY_SECONDS - LEVEL_10_SWAY_SECONDS) * levelProgress(level)
  );
}

export function approximateFallSeconds(level: number): number {
  return fallDurationForLevel(level);
}
