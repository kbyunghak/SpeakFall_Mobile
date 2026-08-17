export type SkinShape = "parachute" | "umbrella" | "flower" | "balloon";
export type SkinEffect = "none" | "sparkle" | "rain" | "petals" | "stars" | "confetti";

export type Skin = {
  id: string;
  name: string;
  price: number;
  /** 캐노피 모양 */
  shape: SkinShape;
  /** 낙하 중 발동하는 특수 효과 */
  effect: SkinEffect;
  /** 효과 설명 (상점 표시용) */
  effectLabel: string;
  /** 낙하산 캐노피 그라데이션 색상 (2개=그라데이션, 6개=무지개 패널) */
  canopy: string[];
  /** 캐노피 강조색 (중앙 밴드) */
  accent: string;
  /** 젤리 몸체 색상 (선택사항 — 없으면 기본 그라데이션 유지) */
  body?: [string, string];
  /** 상점 아이콘용 단색 */
  preview: string;
  /** 무지개 캐노피 (6개 패널에 각각 다른 색) */
  rainbow?: boolean;
};

export const SKINS: Skin[] = [
  {
    id: "default",
    name: "하늘 블루",
    price: 0,
    shape: "parachute",
    effect: "none",
    effectLabel: "기본 낙하산",
    canopy: ["#5eb0ff", "#1a6fd8"],
    accent: "#1557a8",
    preview: "#3d8ef0",
  },
  {
    id: "sunny",
    name: "선샤인 옐로우",
    price: 1000,
    shape: "parachute",
    effect: "none",
    effectLabel: "색만 다른 낙하산",
    canopy: ["#fff8db", "#ffe082"],
    accent: "#f0a323",
    preview: "#f0a323",
  },
  {
    id: "mint",
    name: "민트 초코",
    price: 1000,
    shape: "parachute",
    effect: "none",
    effectLabel: "색만 다른 낙하산",
    canopy: ["#e0f7e9", "#8de0b3"],
    accent: "#3fae6a",
    preview: "#3fae6a",
  },
  {
    id: "berry",
    name: "베리 핑크",
    price: 1000,
    shape: "parachute",
    effect: "none",
    effectLabel: "색만 다른 낙하산",
    canopy: ["#ffe6ef", "#ff9ec0"],
    accent: "#e84d8a",
    preview: "#e84d8a",
  },
  {
    id: "umbrella",
    name: "레인보우 우산",
    price: 10000,
    shape: "umbrella",
    effect: "none",
    effectLabel: "무지개가 떠요",
    canopy: ["#ff5e5e", "#ff9f40", "#ffdd59", "#7bed9f", "#4facfe", "#5f27cd", "#a55eea"],
    accent: "#5f27cd",
    preview: "#8b5cf6",
    rainbow: true,
  },
  {
    id: "flower",
    name: "벚꽃 파라솔",
    price: 10000,
    shape: "flower",
    effect: "petals",
    effectLabel: "꽃가루가 흩날려요",
    canopy: ["#ffeef5", "#ffb3d0"],
    accent: "#f2789f",
    preview: "#ff9ec5",
  },
  {
    id: "sunset",
    name: "선셋 오렌지",
    price: 10000,
    shape: "parachute",
    effect: "sparkle",
    effectLabel: "노을빛 반짝임이 나요",
    canopy: ["#ffeadb", "#ff9e6d"],
    accent: "#ef5b46",
    preview: "#ef5b46",
  },
  {
    id: "galaxy",
    name: "갤럭시 퍼플",
    price: 10000,
    shape: "balloon",
    effect: "stars",
    effectLabel: "별가루가 쏟아져요",
    canopy: ["#f0e6ff", "#c9a8ff"],
    accent: "#7c3aed",
    preview: "#7c3aed",
  },
  {
    id: "rainbow",
    name: "무지개 팝",
    price: 10000,
    shape: "parachute",
    effect: "confetti",
    effectLabel: "컬러 색종이가 팡팡!",
    canopy: ["#ffe6f0", "#b8e0ff"],
    accent: "#ff6b6b",
    preview: "#ff6b6b",
  },
];

export const DEFAULT_SKIN_ID = "default";

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]!;
}

/** 미리보기와 실제 플레이가 동일하게 사용하는 최종 효과입니다. */
export function getEffectiveSkinEffect(skin: Skin): SkinEffect {
  return skin.rainbow && skin.effect === "none" ? "rain" : skin.effect;
}

export function isSkinOwned(ownedSkins: string[] | undefined, id: string): boolean {
  if (id === DEFAULT_SKIN_ID) return true;
  return ownedSkins?.includes(id) ?? false;
}

export function canAfford(coins: number, price: number): boolean {
  return coins >= price;
}
