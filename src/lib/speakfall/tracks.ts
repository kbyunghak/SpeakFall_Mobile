/**
 * 트랙(월드) 메타데이터.
 * 1단계 = 기초 영단어 구조대(basic), 2단계 = 전문 영단어 구조대(그 외).
 */
import type { TrackType } from "@/data/words";
import { getWordsByTrackLevel } from "@/data/words";

export type TrackMeta = {
  id: TrackType;
  /** 화면에 보이는 이름 */
  name: string;
  /** 테마 섬 이름 */
  island: string;
  emoji: string;
  desc: string;
  /** 카드 그라디언트 */
  gradient: string;
  /** 인식 임계값 보정 (긴 단어일수록 관대하게) */
  leniency: number;
  /** 클리어 시 얻는 칭호 */
  title: string;
  titleEmoji: string;
  /** 칭호 우선순위 (높을수록 상위) */
  rank: number;
};

export const BASIC_TRACK: TrackType = "basic";

export const TRACKS: Record<TrackType, TrackMeta> = {
  basic: {
    id: "basic",
    name: "기초 영단어 구조대",
    island: "새싹 들판",
    emoji: "🌱",
    desc: "파닉스와 초등 필수 단어로 시작해요",
    gradient: "from-[#bfe6ff] to-[#8fd0ff]",
    leniency: 0,
    title: "견습 구조대원",
    titleEmoji: "🐣",
    rank: 1,
  },
  elementary: {
    id: "elementary",
    name: "초등 필수",
    island: "무지개 마을",
    emoji: "🏡",
    desc: "기초 생활 단어와 쉬운 형용사·동사",
    gradient: "from-[#ffe3b0] to-[#ffbf6b]",
    leniency: 0.02,
    title: "정식 구조대원",
    titleEmoji: "🛡️",
    rank: 2,
  },
  middle: {
    id: "middle",
    name: "중학 필수",
    island: "중등 숲",
    emoji: "🏫",
    desc: "교과서 핵심 단어와 교내 표현",
    gradient: "from-[#c6f0c2] to-[#7fd48c]",
    leniency: 0.04,
    title: "정식 구조대원",
    titleEmoji: "🛡️",
    rank: 3,
  },
  high: {
    id: "high",
    name: "고등·수능",
    island: "고등 도시",
    emoji: "🎓",
    desc: "수능 빈출 독해 핵심 어휘",
    gradient: "from-[#d7c9ff] to-[#a48cf5]",
    leniency: 0.07,
    title: "엘리트 구조대원",
    titleEmoji: "⚡",
    rank: 4,
  },
  biz: {
    id: "biz",
    name: "사회·비즈니스",
    island: "비즈니스 은하수",
    emoji: "💼",
    desc: "일상 회화와 직장·시사 어휘",
    gradient: "from-[#ffd0dd] to-[#f78fb0]",
    leniency: 0.09,
    title: "마스터 구조대원",
    titleEmoji: "👑",
    rank: 5,
  },
  pro: {
    id: "pro",
    name: "전문·학술",
    island: "연구소 섬",
    emoji: "🔬",
    desc: "IT·과학·환경·예술 전문 어휘",
    gradient: "from-[#bfeaf5] to-[#68c6dd]",
    leniency: 0.11,
    title: "마스터 구조대원",
    titleEmoji: "👑",
    rank: 6,
  },
};

/** 전문 월드에 표시되는 트랙 순서 */
export const WORLD_TRACKS: TrackType[] = ["elementary", "middle", "high", "biz", "pro"];

export const getTrack = (id: TrackType): TrackMeta => TRACKS[id] ?? TRACKS.basic;

/** 해당 트랙에 실제 단어 데이터가 들어있는지 */
export function trackHasWords(id: TrackType): boolean {
  for (let lv = 1; lv <= 10; lv++) {
    if (getWordsByTrackLevel(lv, id).length > 0) return true;
  }
  return false;
}
