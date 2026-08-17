import bearBlue from "@/assets/jelly-bears/jelly-bear-blue.png";
import bearGreen from "@/assets/jelly-bears/jelly-bear-green.png";
import bearMint from "@/assets/jelly-bears/jelly-bear-mint.png";
import bearOrange from "@/assets/jelly-bears/jelly-bear-orange.png";
import bearPink from "@/assets/jelly-bears/jelly-bear-pink.png";
import bearPurple from "@/assets/jelly-bears/jelly-bear-purple.png";
import bearRainbow from "@/assets/jelly-bears/jelly-bear-rainbow.png";
import bearYellow from "@/assets/jelly-bears/jelly-bear-yellow.png";
import basicBlue from "@/assets/jelly-basic/jelly-basic-blue.png";
import basicGreen from "@/assets/jelly-basic/jelly-basic-green.png";
import basicMint from "@/assets/jelly-basic/jelly-basic-mint.png";
import basicOrange from "@/assets/jelly-basic/jelly-basic-orange.png";
import basicPink from "@/assets/jelly-basic/jelly-basic-pink.png";
import basicPurple from "@/assets/jelly-basic/jelly-basic-purple.png";
import basicRainbow from "@/assets/jelly-basic/jelly-basic-rainbow.png";
import basicYellow from "@/assets/jelly-basic/jelly-basic-yellow.png";
import colorPink from "@/assets/jelly-colors/jelly-berry-pink.png";
import colorPurple from "@/assets/jelly-colors/jelly-galaxy-purple.png";
import colorGreen from "@/assets/jelly-colors/jelly-green.png";
import colorMint from "@/assets/jelly-colors/jelly-mint.png";
import colorRainbow from "@/assets/jelly-colors/jelly-rainbow.png";
import colorBlue from "@/assets/jelly-colors/jelly-sky-blue.png";
import colorYellow from "@/assets/jelly-colors/jelly-sunny-yellow.png";
import colorOrange from "@/assets/jelly-colors/jelly-sunset-orange.png";
import dragonBlue from "@/assets/dragon-jellies/dragon-jelly-blue.png";
import dragonGreen from "@/assets/dragon-jellies/dragon-jelly-green.png";
import dragonMint from "@/assets/dragon-jellies/dragon-jelly-mint.png";
import dragonOrange from "@/assets/dragon-jellies/dragon-jelly-orange.png";
import dragonPink from "@/assets/dragon-jellies/dragon-jelly-pink.png";
import dragonPurple from "@/assets/dragon-jellies/dragon-jelly-purple.png";
import dragonRainbow from "@/assets/dragon-jellies/dragon-jelly-rainbow.png";
import dragonYellow from "@/assets/dragon-jellies/dragon-jelly-yellow.png";
import fruitBlue from "@/assets/fruit-jellies/fruit-jelly-blueberry-cluster.png";
import fruitPurple from "@/assets/fruit-jellies/fruit-jelly-grapes.png";
import fruitGreen from "@/assets/fruit-jellies/fruit-jelly-lime.png";
import fruitYellow from "@/assets/fruit-jellies/fruit-jelly-lemon.png";
import fruitMint from "@/assets/fruit-jellies/fruit-jelly-mint.png";
import fruitOrange from "@/assets/fruit-jellies/fruit-jelly-orange-slice.png";
import fruitRainbow from "@/assets/fruit-jellies/fruit-jelly-rainbow-grapes.png";
import fruitPink from "@/assets/fruit-jellies/fruit-jelly-peach.png";
import glitterBlue from "@/assets/glitter-jellies/glitter-jelly-blue.png";
import glitterGreen from "@/assets/glitter-jellies/glitter-jelly-green.png";
import glitterMint from "@/assets/glitter-jellies/glitter-jelly-mint.png";
import glitterOrange from "@/assets/glitter-jellies/glitter-jelly-orange.png";
import glitterPink from "@/assets/glitter-jellies/glitter-jelly-pink.png";
import glitterPurple from "@/assets/glitter-jellies/glitter-jelly-purple.png";
import glitterRainbow from "@/assets/glitter-jellies/glitter-jelly-rainbow.png";
import glitterYellow from "@/assets/glitter-jellies/glitter-jelly-yellow.png";
import puddingBlue from "@/assets/pudding-jellies/pudding-jelly-blue.png";
import puddingGreen from "@/assets/pudding-jellies/pudding-jelly-green.png";
import puddingMint from "@/assets/pudding-jellies/pudding-jelly-mint.png";
import puddingOrange from "@/assets/pudding-jellies/pudding-jelly-orange.png";
import puddingPink from "@/assets/pudding-jellies/pudding-jelly-pink.png";
import puddingPurple from "@/assets/pudding-jellies/pudding-jelly-purple.png";
import puddingRainbow from "@/assets/pudding-jellies/pudding-jelly-rainbow.png";
import puddingYellow from "@/assets/pudding-jellies/pudding-jelly-yellow.png";

export type JellyCategory =
  "default" | "color" | "glitter" | "pudding" | "fruit" | "bear" | "dragon";

export const JELLY_COLOR_ORDER = [
  "pink",
  "purple",
  "green",
  "mint",
  "rainbow",
  "blue",
  "yellow",
  "orange",
] as const;

export type JellyColor = (typeof JELLY_COLOR_ORDER)[number];

export type SpecialJelly = {
  id: string;
  name: string;
  price: number;
  image?: string;
  description: string;
  category: JellyCategory;
  color: JellyColor;
  hue?: number;
  rainbow?: boolean;
};

export const DEFAULT_JELLY_ID = "default-jelly";

export const JELLY_CATEGORY_LABELS: Record<JellyCategory, string> = {
  default: "기본 젤리",
  color: "버디 젤리",
  glitter: "글리터 젤리",
  pudding: "푸딩 젤리",
  fruit: "과일 젤리",
  bear: "곰 젤리",
  dragon: "용 젤리",
};

export const JELLY_CATEGORY_ORDER: JellyCategory[] = [
  "default",
  "color",
  "glitter",
  "pudding",
  "fruit",
  "bear",
  "dragon",
];

const COLOR = 3_000;
const PREMIUM = 5_000;
const RARE = 10_000;

function jelly(
  category: JellyCategory,
  color: JellyColor,
  name: string,
  price: number,
  image: string,
): SpecialJelly {
  return {
    id: `${category}-${color}`,
    name,
    price,
    image,
    category,
    color,
    description: `${JELLY_CATEGORY_LABELS[category]} 컬렉션`,
  };
}

function defaultJelly(id: string, color: JellyColor, name: string, image: string): SpecialJelly {
  return {
    id,
    color,
    name,
    price: 0,
    category: "default",
    description: "구조대 기본 젤리 컬렉션",
    image,
  };
}

export const SPECIAL_JELLIES: SpecialJelly[] = [
  defaultJelly("default-pink", "pink", "핑크 기본 젤리", basicPink),
  defaultJelly("default-purple", "purple", "퍼플 기본 젤리", basicPurple),
  defaultJelly(DEFAULT_JELLY_ID, "green", "그린 기본 젤리", basicGreen),
  defaultJelly("default-mint", "mint", "민트 기본 젤리", basicMint),
  defaultJelly("default-rainbow", "rainbow", "레인보우 기본 젤리", basicRainbow),
  defaultJelly("default-blue", "blue", "블루 기본 젤리", basicBlue),
  defaultJelly("default-yellow", "yellow", "옐로 기본 젤리", basicYellow),
  defaultJelly("default-orange", "orange", "오렌지 기본 젤리", basicOrange),

  jelly("color", "pink", "베리 핑크", COLOR, colorPink),
  jelly("color", "purple", "갤럭시 퍼플", COLOR, colorPurple),
  jelly("color", "green", "그린", COLOR, colorGreen),
  jelly("color", "mint", "민트", COLOR, colorMint),
  jelly("color", "rainbow", "레인보우", COLOR, colorRainbow),
  jelly("color", "blue", "스카이 블루", COLOR, colorBlue),
  jelly("color", "yellow", "써니 옐로우", COLOR, colorYellow),
  jelly("color", "orange", "선셋 오렌지", COLOR, colorOrange),

  jelly("glitter", "pink", "핑크 글리터", PREMIUM, glitterPink),
  jelly("glitter", "purple", "퍼플 글리터", PREMIUM, glitterPurple),
  jelly("glitter", "green", "그린 글리터", PREMIUM, glitterGreen),
  jelly("glitter", "mint", "민트 글리터", PREMIUM, glitterMint),
  jelly("glitter", "rainbow", "레인보우 글리터", PREMIUM, glitterRainbow),
  jelly("glitter", "blue", "블루 글리터", PREMIUM, glitterBlue),
  jelly("glitter", "yellow", "옐로 글리터", PREMIUM, glitterYellow),
  jelly("glitter", "orange", "오렌지 글리터", PREMIUM, glitterOrange),

  jelly("pudding", "pink", "딸기 푸딩", PREMIUM, puddingPink),
  jelly("pudding", "purple", "포도 푸딩", PREMIUM, puddingPurple),
  jelly("pudding", "green", "그린 푸딩", PREMIUM, puddingGreen),
  jelly("pudding", "mint", "민트 푸딩", PREMIUM, puddingMint),
  jelly("pudding", "rainbow", "레인보우 푸딩", PREMIUM, puddingRainbow),
  jelly("pudding", "blue", "블루 푸딩", PREMIUM, puddingBlue),
  jelly("pudding", "yellow", "레몬 푸딩", PREMIUM, puddingYellow),
  jelly("pudding", "orange", "오렌지 푸딩", PREMIUM, puddingOrange),

  jelly("fruit", "pink", "복숭아 젤리", PREMIUM, fruitPink),
  jelly("fruit", "purple", "포도 젤리", PREMIUM, fruitPurple),
  jelly("fruit", "green", "라임 젤리", PREMIUM, fruitGreen),
  jelly("fruit", "mint", "허니듀 젤리", PREMIUM, fruitMint),
  jelly("fruit", "rainbow", "무지개 포도 젤리", PREMIUM, fruitRainbow),
  jelly("fruit", "blue", "블루베리 젤리", PREMIUM, fruitBlue),
  jelly("fruit", "yellow", "레몬 젤리", PREMIUM, fruitYellow),
  jelly("fruit", "orange", "오렌지 젤리", PREMIUM, fruitOrange),

  jelly("bear", "pink", "핑크 곰", RARE, bearPink),
  jelly("bear", "purple", "퍼플 곰", RARE, bearPurple),
  jelly("bear", "green", "그린 곰", RARE, bearGreen),
  jelly("bear", "mint", "민트 곰", RARE, bearMint),
  jelly("bear", "rainbow", "레인보우 곰", RARE, bearRainbow),
  jelly("bear", "blue", "블루 곰", RARE, bearBlue),
  jelly("bear", "yellow", "옐로 곰", RARE, bearYellow),
  jelly("bear", "orange", "오렌지 곰", RARE, bearOrange),

  jelly("dragon", "pink", "핑크 드래곤", RARE, dragonPink),
  jelly("dragon", "purple", "퍼플 드래곤", RARE, dragonPurple),
  jelly("dragon", "green", "그린 드래곤", RARE, dragonGreen),
  jelly("dragon", "mint", "민트 드래곤", RARE, dragonMint),
  jelly("dragon", "rainbow", "레인보우 드래곤", RARE, dragonRainbow),
  jelly("dragon", "blue", "블루 드래곤", RARE, dragonBlue),
  jelly("dragon", "yellow", "옐로 드래곤", RARE, dragonYellow),
  jelly("dragon", "orange", "오렌지 드래곤", RARE, dragonOrange),
];

export function getSpecialJelly(id: string): SpecialJelly {
  return SPECIAL_JELLIES.find((candidate) => candidate.id === id) ?? SPECIAL_JELLIES[0]!;
}

export function isKnownJelly(id: string): boolean {
  return SPECIAL_JELLIES.some((jelly) => jelly.id === id);
}

export function isJellyOwned(owned: string[] | undefined, id: string): boolean {
  const jelly = SPECIAL_JELLIES.find((candidate) => candidate.id === id);
  if (jelly?.category === "default") return true;
  return Boolean(jelly && owned?.includes(id));
}
