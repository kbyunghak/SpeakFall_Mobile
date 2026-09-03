import { DEFAULT_SKIN_ID, isSkinOwned } from "./skins";
import { DEFAULT_JELLY_ID, isJellyOwned, isKnownJelly } from "./specialJellies";
import type { TrackType, WordItem } from "./words";
import { TRACKS, WORLD_TRACKS, trackHasWords } from "./tracks";

const STORAGE_KEY = "speakfall.progress.v2";
const LEGACY_KEY = "speakfall.progress.v1";

export type LevelRecord = {
  /** 0~3 별 */
  stars: number;
  /** 최고 점수 */
  best: number;
};

export type ArchiveProgress = {
  /** 광고 보상으로 사용 권한을 얻은 Set ID */
  unlockedSets: Partial<Record<TrackType, number[]>>;
  /** 다운로드와 검증을 마치고 기기에 저장된 Set ID */
  downloadedSets: Partial<Record<TrackType, number[]>>;
};

export type Progress = {
  coins: number;
  /** `${track}:${level}` 키별 최고 기록 */
  levels: Record<string, LevelRecord>;
  /** 수집한 단어 (도감) */
  collected: string[];
  /** 보유한 스킨 id 목록 */
  ownedSkins: string[];
  /** 현재 장착 중인 스킨 id */
  equippedSkin: string;
  /** 보유한 Special Jelly id 목록 */
  ownedJellies: string[];
  /** 현재 장착 중인 젤리 id */
  equippedJelly: string;
  /** 보상형 광고 시청으로 영구 해제한 전문 트랙 */
  unlockedTracks: TrackType[];
  /** 선택형 추가 단어 Set 진행 상태. 실제 단어 데이터는 별도 캐시에 저장합니다. */
  archive: ArchiveProgress;
};

export const TOTAL_LEVELS = 10;

/** 진행도 저장 키 */
export const levelKey = (track: TrackType, level: number) => `${track}:${level}`;

export const emptyProgress = (): Progress => ({
  coins: 0,
  levels: {},
  collected: [],
  ownedSkins: [DEFAULT_SKIN_ID],
  equippedSkin: DEFAULT_SKIN_ID,
  ownedJellies: [DEFAULT_JELLY_ID],
  equippedJelly: DEFAULT_JELLY_ID,
  unlockedTracks: [],
  archive: { unlockedSets: {}, downloadedSets: {} },
});

function migrateArchive(raw: unknown): ArchiveProgress {
  const sanitize = (value: unknown): Partial<Record<TrackType, number[]>> => {
    if (!value || typeof value !== "object") return {};
    return Object.fromEntries(
      (["basic", ...WORLD_TRACKS] as TrackType[]).map((track) => {
        const ids = (value as Record<string, unknown>)[track];
        return [
          track,
          Array.isArray(ids)
            ? [...new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0))]
            : [],
        ];
      }),
    ) as Partial<Record<TrackType, number[]>>;
  };
  if (!raw || typeof raw !== "object") return { unlockedSets: {}, downloadedSets: {} };
  const value = raw as Partial<ArchiveProgress>;
  return {
    unlockedSets: sanitize(value.unlockedSets),
    downloadedSets: sanitize(value.downloadedSets),
  };
}

/** v1(숫자 키 = basic 트랙) 데이터를 v2 키로 변환합니다. */
function migrateLevels(raw: unknown): Record<string, LevelRecord> {
  const out: Record<string, LevelRecord> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, LevelRecord>)) {
    if (!value || typeof value !== "object") continue;
    const nextKey = key.includes(":") ? key : levelKey("basic", Number(key));
    out[nextKey] = { stars: value.stars ?? 0, best: value.best ?? 0 };
  }
  return out;
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const equipped = parsed.equippedSkin ?? DEFAULT_SKIN_ID;
    const ownedSkins = Array.isArray(parsed.ownedSkins)
      ? [...new Set([DEFAULT_SKIN_ID, ...parsed.ownedSkins])]
      : [DEFAULT_SKIN_ID];
    const equippedJelly = parsed.equippedJelly ?? DEFAULT_JELLY_ID;
    const ownedJellies = Array.isArray(parsed.ownedJellies)
      ? [...new Set([DEFAULT_JELLY_ID, ...parsed.ownedJellies.filter(isKnownJelly)])]
      : [DEFAULT_JELLY_ID];
    return {
      coins: typeof parsed.coins === "number" ? parsed.coins : 0,
      levels: migrateLevels(parsed.levels),
      collected: Array.isArray(parsed.collected) ? parsed.collected : [],
      ownedSkins,
      equippedSkin: isSkinOwned(ownedSkins, equipped) ? equipped : DEFAULT_SKIN_ID,
      ownedJellies,
      equippedJelly: isJellyOwned(ownedJellies, equippedJelly) ? equippedJelly : DEFAULT_JELLY_ID,
      unlockedTracks: Array.isArray(parsed.unlockedTracks)
        ? parsed.unlockedTracks.filter((track): track is TrackType =>
            WORLD_TRACKS.includes(track as TrackType),
          )
        : [],
      archive: migrateArchive(parsed.archive),
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked — 진행도만 이번 세션에 유지 */
  }
}

/** 특정 트랙/레벨 기록 조회 */
export function getRecord(
  p: Progress,
  level: number,
  track: TrackType = "basic",
): LevelRecord | undefined {
  return p.levels[levelKey(track, level)];
}

/** 해당 레벨을 플레이할 수 있는지 (1레벨은 항상 열림, 이후는 이전 레벨 별 1개 이상) */
export function isLevelUnlocked(p: Progress, level: number, track: TrackType = "basic"): boolean {
  if (level <= 1) return true;
  return (getRecord(p, level - 1, track)?.stars ?? 0) > 0;
}

/** 트랙 전체를 클리어했는지 (Lv.10까지 별 1개 이상) */
export function isTrackCleared(p: Progress, track: TrackType): boolean {
  return (getRecord(p, TOTAL_LEVELS, track)?.stars ?? 0) > 0;
}

/** 트랙의 별 합계 */
export function trackStars(p: Progress, track: TrackType): number {
  let sum = 0;
  for (let lv = 1; lv <= TOTAL_LEVELS; lv++) sum += getRecord(p, lv, track)?.stars ?? 0;
  return sum;
}

/** 전문 월드 해금 여부 — 기초 트랙 Lv.10 완파 */
export function isWorldUnlocked(p: Progress): boolean {
  return isTrackCleared(p, "basic") || p.unlockedTracks.length > 0;
}

/** 전문 월드 안에서 개별 섬을 열 수 있는지 (데이터가 있고 월드가 해금된 경우) */
export function isTrackPlayable(p: Progress, track: TrackType): boolean {
  if (track === "basic") return true;
  return trackHasWords(track) && (isTrackCleared(p, "basic") || p.unlockedTracks.includes(track));
}

export function unlockTrack(p: Progress, track: TrackType): Progress {
  if (track === "basic" || p.unlockedTracks.includes(track)) return p;
  return { ...p, unlockedTracks: [...p.unlockedTracks, track] };
}

function addArchiveSetId(
  source: Partial<Record<TrackType, number[]>>,
  track: TrackType,
  setId: number,
): Partial<Record<TrackType, number[]>> {
  const current = source[track] ?? [];
  if (current.includes(setId)) return source;
  return { ...source, [track]: [...current, setId].sort((a, b) => a - b) };
}

export function unlockArchiveSet(p: Progress, track: TrackType, setId: number): Progress {
  return {
    ...p,
    archive: {
      ...p.archive,
      unlockedSets: addArchiveSetId(p.archive.unlockedSets, track, setId),
    },
  };
}

export function markArchiveSetDownloaded(p: Progress, track: TrackType, setId: number): Progress {
  return {
    ...p,
    archive: {
      ...p.archive,
      downloadedSets: addArchiveSetId(p.archive.downloadedSets, track, setId),
    },
  };
}

export const isArchiveSetUnlocked = (p: Progress, track: TrackType, setId: number): boolean =>
  (p.archive.unlockedSets[track] ?? []).includes(setId);

export const isArchiveSetDownloaded = (p: Progress, track: TrackType, setId: number): boolean =>
  (p.archive.downloadedSets[track] ?? []).includes(setId);

/** 현재 칭호 — 클리어한 트랙 중 가장 상위 1개만 표시 */
export function getTitle(p: Progress): { label: string; emoji: string } {
  let bestRank = 0;
  let best = { label: "새내기 구조대원", emoji: "🐣" };
  for (const track of ["basic", ...WORLD_TRACKS] as TrackType[]) {
    const meta = TRACKS[track];
    if (!meta) continue;
    if (isTrackCleared(p, track) && meta.rank > bestRank) {
      bestRank = meta.rank;
      best = { label: meta.title, emoji: meta.titleEmoji };
    }
  }
  return best;
}

/** 남은 하트 수 기준 별 등급 */
export function starsForResult(cleared: boolean, rescued: number): number {
  if (!cleared) return 0;

  if (rescued >= 27) return 3;
  if (rescued >= 23) return 2;
  if (rescued >= 18) return 1;

  return 0;
}

/** 구조한 친구 + 별점으로 코인 계산 */
export function coinsForResult(rescued: number, stars: number): number {
  return rescued * 10 + stars * 20;
}

export type RoundResult = {
  level: number;
  track: TrackType;
  cleared: boolean;
  stars: number;
  coins: number;
  score: number;
  rescued: number;
  accuracy: number;
  bestCombo: number;
  words: WordItem[];
  missedWords: WordItem[];
};

/** 라운드 결과를 진행도에 반영한 새 진행도를 반환합니다. */
export function applyResult(p: Progress, r: RoundResult): Progress {
  const key = levelKey(r.track ?? "basic", r.level);
  const prev = p.levels[key];
  const collected = new Set(p.collected);
  r.words.forEach((w) => collected.add(w.word));
  return {
    coins: p.coins + r.coins,
    levels: {
      ...p.levels,
      [key]: {
        stars: Math.max(prev?.stars ?? 0, r.stars),
        best: Math.max(prev?.best ?? 0, r.score),
      },
    },
    collected: [...collected],
    ownedSkins: p.ownedSkins,
    equippedSkin: p.equippedSkin,
    ownedJellies: p.ownedJellies,
    equippedJelly: p.equippedJelly,
    unlockedTracks: p.unlockedTracks,
    archive: p.archive,
  };
}
