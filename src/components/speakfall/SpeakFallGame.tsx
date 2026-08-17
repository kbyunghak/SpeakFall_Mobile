import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Coins,
  Flame,
  Heart,
  Lock,
  Map as MapIcon,
  Mic,
  Palette,
  Play,
  RotateCcw,
  ShoppingBag,
  Sprout,
  Star,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

import {
  EXTRA_WORDS_ON_MISS,
  MAX_WORDS_PER_LEVEL,
  RESCUES_PER_LEVEL_UP,
  WORDS_PER_LEVEL,
  createLevelWordQueue,
  findTranscriptIpa,
  getWordsByLevel,
  getPronunciationFocus,
  STRICTNESS,
  type Strictness,
  type WordItem,
} from "@/lib/speakfall/words";
import {
  TOTAL_LEVELS,
  applyResult,
  coinsForResult,
  emptyProgress,
  getRecord,
  getTitle,
  isLevelUnlocked,
  isTrackPlayable,
  loadProgress,
  markArchiveSetDownloaded,
  saveProgress,
  starsForResult,
  trackStars,
  unlockArchiveSet,
  unlockTrack,
  type Progress,
  type RoundResult,
} from "@/lib/speakfall/progress";
import { containsProfanity } from "@/lib/speakfall/profanity";
import { TRACKS, WORLD_TRACKS, getTrack, trackHasWords } from "@/lib/speakfall/tracks";
import type { TrackType } from "@/data/words";
import type { ArchiveManifest, ArchiveWord } from "@/data/archive";
import {
  cacheArchiveSet,
  downloadArchiveSet,
  fetchArchiveManifest,
  readCachedArchiveWords,
} from "@/lib/archive/repository";
import { APP_VERSION } from "@/lib/app/version";
import { formatCompactNumber } from "@/lib/format/compactNumber";
import {
  playClick,
  playCoin,
  playGameOver,
  playHazardBeep,
  playLevelUp,
  playMiss,
  playRescue,
  playStart,
  playTick,
  resumeAudio,
  setSoundEnabled as setSoundModuleEnabled,
} from "@/lib/speakfall/sound";
import { DEFAULT_SKIN_ID, SKINS, getSkin, isSkinOwned, type Skin } from "@/lib/speakfall/skins";
import {
  SkinCanopy,
  SkinEffects,
  SkinPreviewTrail,
  SkinShopPreview,
} from "@/components/speakfall/SkinVisuals";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { evaluatePronunciation } from "@/lib/speech/pronunciationEvaluator";
import type { SpeechResult } from "@/lib/speech/types";
import { showRewardedUnlockAd } from "@/lib/ads/rewarded";
import {
  fallSpeedForLevel,
  swayDistanceForLevel,
  swayDurationForLevel,
} from "@/lib/speakfall/difficulty";
import { backDestinationForPhase } from "@/lib/speakfall/navigation";
import {
  checkMicPermission,
  getPlatform,
  hasSeenMicOnboarding,
  markMicOnboarded,
  requestMicPermission,
  settingsHint,
  type MicStatus,
} from "@/lib/speakfall/mic";

import titleLockup from "@/assets/title-lockup.png";
import parachuteJelly from "@/assets/parachute-jelly.png";
import speakButton from "@/assets/speak-button.png";
import {
  DEFAULT_JELLY_ID,
  JELLY_CATEGORY_LABELS,
  JELLY_CATEGORY_ORDER,
  SPECIAL_JELLIES,
  getSpecialJelly,
  isJellyOwned,
  type JellyCategory,
  type JellyColor,
  type SpecialJelly,
} from "@/lib/speakfall/specialJellies";

const jellyThumbnailModules = import.meta.glob("../../assets/jelly/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const JELLY_THUMBNAIL_NAMES: Partial<Record<JellyCategory, Partial<Record<JellyColor, string>>>> = {
  color: {
    pink: "jelly-pink.png",
    purple: "jelly-purple.png",
    green: "jelly-green.png",
    mint: "jelly-mint.png",
    rainbow: "jelly-rainbow.png",
    blue: "jelly-blue.png",
    orange: "jelly-orange.png",
  },
  glitter: {
    pink: "glitter-jelly-pink.png",
    purple: "glitter-jelly-blue-purple.png",
    green: "glitter-jelly-green.png",
    mint: "glitter-jelly-cyan.png",
    rainbow: "glitter-jelly-rainbow.png",
    yellow: "glitter-jelly-gold.png",
    orange: "glitter-jelly-orange.png",
  },
  pudding: {
    pink: "pudding-jelly-pink.png",
    purple: "pudding-jelly-purple.png",
    green: "pudding-jelly-lime.png",
    mint: "pudding-jelly-mint.png",
    rainbow: "pudding-jelly-rainbow.png",
    blue: "pudding-jelly-blue.png",
    orange: "pudding-jelly-orange.png",
  },
  fruit: {
    pink: "fruit-jelly-peach.png",
    purple: "fruit-jelly-grapes.png",
    green: "fruit-jelly-green.png",
    rainbow: "fruit-jelly-rainbow-grapes.png",
    blue: "fruit-jelly-blueberry-cluster.png",
    yellow: "fruit-jelly-lemon.png",
    orange: "fruit-jelly-orange-slice.png",
  },
  bear: {
    pink: "jelly-bear-pink.png",
    purple: "jelly-bear-purple.png",
    green: "jelly-bear-lime.png",
    mint: "jelly-bear-mint.png",
    rainbow: "jelly-bear-rainbow.png",
    blue: "jelly-bear-blue.png",
    orange: "jelly-bear-orange.png",
  },
  dragon: {
    pink: "dragon-jelly-pink.png",
    purple: "dragon-jelly-purple.png",
    green: "dragon-jelly-glime.png",
    mint: "dragon-jelly-mint.png",
    rainbow: "dragon-jelly-rainbow.png",
    blue: "dragon-jelly-blue.png",
    orange: "dragon-jelly-orange.png",
  },
};

const JELLY_REPRESENTATIVE_COLORS: Record<JellyCategory, JellyColor> = {
  default: "pink",
  color: "blue",
  glitter: "pink",
  pudding: "pink",
  fruit: "pink",
  bear: "pink",
  dragon: "pink",
};

function getJellyThumbnail(jelly: SpecialJelly): string | undefined {
  const filename = JELLY_THUMBNAIL_NAMES[jelly.category]?.[jelly.color];
  return filename
    ? (jellyThumbnailModules[`../../assets/jelly/${filename}`] ?? jelly.image)
    : jelly.image;
}

type Faller = WordItem & {
  id: number;
  x: number;
  y: number;
  speed: number;
  hue: number;
  state: "falling" | "saved" | "crying";
  retried: boolean;
  missCount: number;
};

type Phase =
  | "idle"
  | "island"
  | "map"
  | "collection"
  | "shop"
  | "permission"
  | "countdown"
  | "playing"
  | "paused"
  | "over";

type RewardAdConfirmation = {
  title: string;
  description: string;
  reward: string;
};

const HUES = [10, 45, 145, 200, 255, 300];
const MAX_HP = 5;
/** 실패로 감속되더라도 젤리가 멈추지 않도록 하는 최소 낙하 속도 */
const MIN_FALL_SPEED = 0.022;
const IS_DEV = import.meta.env.DEV;

function JellyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="8" fill="currentColor" fillOpacity="0.18" />
      <circle cx="9" cy="11" r="1.5" fill="currentColor" />
      <circle cx="15" cy="11" r="1.5" fill="currentColor" />
      <path
        d="M9.5 16.5c1.2 1 3.8 1 5 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="9" r="2" fill="currentColor" fillOpacity="0.12" />
      <circle cx="19" cy="9" r="2" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

function ParachuteJelly({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 130 150" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="pjCanopy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e6f1ff" />
        </linearGradient>
        <linearGradient id="pjBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ede6d" />
          <stop offset="100%" stopColor="#5fbf47" />
        </linearGradient>
      </defs>

      {/* canopy — concentric blue/white bands */}
      <path
        d="M65 6C33 6 9 26 5 52c16-12 36-18 60-18s44 6 60 18C121 26 97 6 65 6Z"
        fill="url(#pjCanopy)"
      />
      <path d="M65 6c-16 0-30 8-40 20 12-6 25-9 40-9s28 3 40 9C95 14 81 6 65 6Z" fill="#3d8ef0" />
      <path
        d="M65 17c-9 0-17 3-24 8 7-2 15-3 24-3s17 1 24 3c-7-5-15-8-24-8Z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path d="M65 22c-6 0-11 1-16 3 5-1 10-2 16-2s11 1 16 2c-5-2-10-3-16-3Z" fill="#1e64c8" />
      <path d="M18 34c-5 5-9 11-11 18 5-4 11-7 17-10l-6-8Z" fill="#3d8ef0" />
      <path d="M112 34c5 5 9 11 11 18-5-4-11-7-17-10l6-8Z" fill="#3d8ef0" />
      <path d="M5 52c16-12 36-18 60-18s44 6 60 18" stroke="#c9e0fb" strokeWidth="2" />

      {/* lines */}
      <path
        d="M8 50 46 86M122 50 84 86M40 36l8 50M90 36l-8 50"
        stroke="#7fa8d8"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* backpack + harness */}
      <rect x="48" y="80" width="34" height="18" rx="7" fill="#2a6fd0" />
      <rect x="53" y="84" width="24" height="5" rx="2.5" fill="#8dc0f7" />
      <circle cx="65" cy="94" r="4.5" fill="#ffffff" />
      <path d="M52 96l-4 14M78 96l4 14" stroke="#2a6fd0" strokeWidth="4" strokeLinecap="round" />

      {/* jelly body */}
      <rect x="34" y="94" width="62" height="50" rx="24" fill="url(#pjBody)" />
      <ellipse cx="34" cy="105" rx="8" ry="11" fill="#7fd158" />
      <ellipse cx="96" cy="105" rx="8" ry="11" fill="#7fd158" />
      <ellipse cx="36" cy="132" rx="7" ry="10" fill="#7fd158" />
      <ellipse cx="94" cy="132" rx="7" ry="10" fill="#7fd158" />
      <ellipse cx="50" cy="106" rx="9" ry="6" fill="#ffffff" opacity="0.45" />
      <circle cx="55" cy="114" r="4" fill="#22364f" />
      <circle cx="77" cy="114" r="4" fill="#22364f" />
      <circle cx="56.4" cy="112.6" r="1.4" fill="#ffffff" />
      <circle cx="78.4" cy="112.6" r="1.4" fill="#ffffff" />
      <ellipse cx="47" cy="120" rx="4" ry="2.8" fill="#ff9aa8" opacity="0.7" />
      <ellipse cx="85" cy="120" rx="4" ry="2.8" fill="#ff9aa8" opacity="0.7" />
      <path d="M60 124c3.5 3 8.5 3 12 0" stroke="#22364f" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** 난이도별 아이콘 — 새싹(쉬움) / 번개(보통) / 불꽃(어려움). */
function DifficultyIcon({
  level,
  selected,
}: {
  level: "easy" | "normal" | "hard";
  selected: boolean;
}) {
  const tone = selected
    ? "text-white"
    : level === "easy"
      ? "text-[#3fae6a]"
      : level === "normal"
        ? "text-[#f0a323]"
        : "text-[#ef5b46]";
  const Icon = level === "easy" ? Sprout : level === "normal" ? Zap : Flame;
  return (
    <span
      className={`flex size-11 items-center justify-center rounded-full transition-colors ${
        selected ? "bg-white/15" : "bg-[#eaf3ff]"
      }`}
    >
      <Icon
        className={`size-6 ${tone}`}
        strokeWidth={2.4}
        fill={level === "easy" ? "none" : "currentColor"}
        fillOpacity={level === "easy" ? 0 : 0.18}
      />
    </span>
  );
}

/** 음성 입력 대기/수신 상태를 보여주는 동적 음파 바. */
function Soundwave({ active }: { active: boolean }) {
  const bars = [0.45, 0.8, 1, 0.65, 0.9, 0.5, 0.75];
  return (
    <div className="mt-1.5 flex h-3.5 items-center gap-[3px]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-colors duration-200 ${
            active ? "bg-primary" : "bg-primary/25"
          }`}
          style={{
            height: `${h * 100}%`,
            animation: active ? `wave-bar 0.85s ease-in-out ${i * 0.08}s infinite` : undefined,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

/** Simple puffy cloud made of a few overlapping circles. */
function Puff({
  x,
  y,
  s = 1,
  opacity = 1,
}: {
  x: number;
  y: number;
  s?: number;
  opacity?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <g fill="#ffffff">
        <circle cx="-42" cy="6" r="28" />
        <circle cx="-8" cy="-10" r="36" />
        <circle cx="34" cy="-2" r="32" />
        <circle cx="62" cy="14" r="22" />
        <rect x="-58" y="4" width="128" height="28" rx="14" />
      </g>
      <g fill="#ffffff" opacity="0.7">
        <circle cx="-6" cy="-26" r="18" />
        <circle cx="26" cy="-20" r="16" />
      </g>
    </g>
  );
}

function SkyClouds() {
  return (
    <svg
      viewBox="0 0 390 780"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 z-0 size-full drop-shadow-[0_12px_14px_rgba(12,58,124,0.12)]"
      aria-hidden="true"
    >
      <g style={{ animation: "cloud-float 18s ease-in-out infinite" }}>
        <Puff x={46} y={96} s={0.78} opacity={0.95} />
      </g>
      <g style={{ animation: "cloud-float 24s ease-in-out infinite reverse" }}>
        <Puff x={340} y={188} s={0.72} opacity={0.8} />
      </g>
      <g style={{ animation: "cloud-float 30s ease-in-out infinite" }}>
        <Puff x={30} y={424} s={0.88} opacity={0.7} />
      </g>
      <g style={{ animation: "cloud-float 26s ease-in-out infinite reverse" }}>
        <Puff x={358} y={524} s={0.82} opacity={0.85} />
      </g>
      {/* horizon cloud bank */}
      <g opacity="0.95">
        <Puff x={80} y={742} s={1.35} />
        <Puff x={300} y={756} s={1.5} />
        <Puff x={195} y={778} s={1.7} />
      </g>
    </svg>
  );
}

function RibbonBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-fit" style={{ animation: "sway 5s ease-in-out infinite" }}>
      <svg viewBox="0 0 260 76" className="h-[68px] w-[248px]" aria-hidden="true">
        <path d="M8 18 44 8v58L8 74 22 46 8 18Z" fill="#154da0" />
        <path d="M252 18 216 8v58l36 8-14-28 14-28Z" fill="#154da0" />
        <path d="M38 6h184l-8 32 8 32H38l8-32-8-32Z" fill="#2a74d8" />
        <path d="M38 6h184l-8 32H46L38 6Z" fill="#3d8ef0" opacity="0.55" />
        <path
          d="M38 6h184l-8 32 8 32H38l8-32-8-32Z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          opacity="0.35"
        />
      </svg>
      <span className="ribbon-title absolute inset-0 flex items-center justify-center pb-1 text-[1.6rem]">
        {children}
      </span>
    </div>
  );
}

/** 상점에서 선택한 스킨을 젤리 친구에게 미리 입혀보는 무대 */
function ShopSkinPreview({ skin, jelly }: { skin: Skin; jelly: SpecialJelly }) {
  return (
    <div
      className="relative flex min-h-[210px] w-full flex-col items-center justify-center overflow-hidden py-5 short-screen:min-h-[165px] short-screen:py-3"
      aria-hidden
    >
      <SkinPreviewTrail skin={skin} />
      <div className="shop-preview-flight relative z-10 mx-auto flex flex-col items-center">
        <div className="relative flex flex-col items-center">
          <SkinEffects skin={skin} />
          <div className="relative z-10 -mb-5 flex flex-col items-center">
            <SkinCanopy skin={skin} />
          </div>

          <div className="relative z-20 flex size-16 items-center justify-center">
            {jelly.image ? (
              <img
                src={jelly.image}
                alt=""
                draggable={false}
                className="pointer-events-none size-full select-none object-contain drop-shadow-lg"
              />
            ) : (
              <DefaultJellyVisual className="size-14" hue={jelly.hue} rainbow={jelly.rainbow} />
            )}
          </div>
        </div>
      </div>
      <p className="ribbon-title mx-auto mt-3 w-full text-center text-lg text-[#173f78]">
        {skin.name}
      </p>
      <p className="mx-auto w-full text-center font-ui text-xs text-[#173f78]/60">
        {skin.effectLabel}
      </p>
    </div>
  );
}

function ShopJellySinglePreview({ jelly, equipped }: { jelly: SpecialJelly; equipped: boolean }) {
  return (
    <div className="flex min-h-[190px] flex-col items-center justify-center py-4 short-screen:min-h-[150px] short-screen:py-2">
      {jelly.image ? (
        <img
          src={jelly.image}
          alt=""
          draggable={false}
          className="size-28 object-contain drop-shadow-lg short-screen:size-20"
        />
      ) : (
        <DefaultJellyVisual className="size-24" hue={jelly.hue} rainbow={jelly.rainbow} />
      )}
      <p className="mt-2 font-display text-lg text-[#173f78]">{jelly.name}</p>
      <p className="font-ui text-xs text-[#173f78]/55">{equipped ? "현재 장착 중" : "미리보기"}</p>
    </div>
  );
}

export function SpeakFallGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(3);
  const [active, setActive] = useState<Faller | null>(null);
  const [nextWord, setNextWord] = useState<WordItem | null>(null);
  const [score, setScore] = useState(0);
  const [rescued, setRescued] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [heard, setHeard] = useState("");
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [strictness, setStrictness] = useState<Strictness>("normal");
  const [permissionDenied, setPermissionDenied] = useState(false);
  /** 마이크 권한 상태 (앱 실행 시 1회 확인) */
  const [micStatus, setMicStatus] = useState<MicStatus>("unknown");
  const [micBusy, setMicBusy] = useState(false);
  /** 권한 재시도 횟수 (안내 문구 강화용) */
  const [micTries, setMicTries] = useState(0);

  /** 첫 실행 마이크 안내 시트 */
  const [showMicOnboard, setShowMicOnboard] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [level, setLevel] = useState(1);
  const [track, setTrack] = useState<TrackType>("basic");
  /** 구조 지도에서 보고 있는 섬 */
  const [mapTrack, setMapTrack] = useState<TrackType>("basic");
  /** 도감에서 보고 있는 트랙 */
  const [colTrack, setColTrack] = useState<TrackType>("basic");
  const [wordsRemaining, setWordsRemaining] = useState(WORDS_PER_LEVEL);
  const [levelRescued, setLevelRescued] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const [result, setResult] = useState<RoundResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; hue: number; tx: number; ty: number }[]
  >([]);
  const [shopToast, setShopToast] = useState<string | null>(null);
  /** 상점에서 미리보기 중인 스킨 ID */
  const [shopPreviewId, setShopPreviewId] = useState<string | null>(null);
  const [shopJellyPreviewId, setShopJellyPreviewId] = useState<string | null>(null);
  const [shopJellyCategory, setShopJellyCategory] = useState<JellyCategory | null>(null);
  const [shopTab, setShopTab] = useState<"parachute" | "jelly">("parachute");
  const [testUnlockSkins, setTestUnlockSkins] = useState(false);
  /** 구조 성공 시 젤리 위에 뜨는 "+1" 표시 */
  const [plusOne, setPlusOne] = useState<number | null>(null);
  const [plusOneMsg, setPlusOneMsg] = useState("야호!");
  /** 도감에서 펼쳐진 레벨 (null이면 모두 접힘) */
  const [openCollectionLevel, setOpenCollectionLevel] = useState<number | null>(null);
  const [hiddenLabUnlocked, setHiddenLabUnlocked] = useState(false);
  const [rewardingTrack, setRewardingTrack] = useState<TrackType | null>(null);
  const [rewardingCoins, setRewardingCoins] = useState(false);
  const [archiveManifest, setArchiveManifest] = useState<ArchiveManifest | null>(null);
  const [archiveWords, setArchiveWords] = useState<ArchiveWord[]>([]);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [rewardAdConfirmation, setRewardAdConfirmation] = useState<RewardAdConfirmation | null>(
    null,
  );

  const activeRef = useRef<Faller | null>(null);
  const hiddenLabTapRef = useRef({ count: 0, lastTap: 0 });
  const pendingRewardActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const idRef = useRef(0);
  const elapsed = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const strictRef = useRef<Strictness>("normal");
  const gapRef = useRef(0);
  const voiceTimer = useRef<number | null>(null);
  const wordQueueRef = useRef<WordItem[]>([]);
  const clearedRef = useRef<Set<string>>(new Set());
  /** 이번 라운드에서 한 번이라도 등장한 단어 (중복 출제 방지) */
  const usedRef = useRef<Set<string>>(new Set());
  const recentRef = useRef<string[]>([]);
  const roundWordsRef = useRef<WordItem[]>([]);
  const statsRef = useRef({ score: 0, rescued: 0, attempts: 0, bestCombo: 0, hp: MAX_HP });
  /** 같은 젤리에 대한 실패 처리 중복 방지 */
  const missGuard = useRef<number | null>(null);

  const levelRef = useRef(1);
  const trackRef = useRef<TrackType>("basic");
  const progressRef = useRef<Progress>(emptyProgress());
  const hazardBeepAt = useRef(0);
  activeRef.current = active;
  phaseRef.current = phase;
  strictRef.current = strictness;
  levelRef.current = level;
  trackRef.current = track;
  progressRef.current = progress;
  statsRef.current = { score, rescued, attempts, bestCombo, hp };

  /** 저장된 진행도 불러오기 (브라우저 전용) */
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    setSoundModuleEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    if (phase === "shop") {
      setShopPreviewId(null);
      setShopJellyPreviewId(null);
      setShopJellyCategory(null);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "collection") return;
    let cancelled = false;
    fetchArchiveManifest()
      .then((manifest) => {
        if (!cancelled) setArchiveManifest(manifest);
      })
      .catch((cause) => {
        console.warn("Archive manifest load failed", cause);
        if (!cancelled) setArchiveManifest(null);
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  useEffect(() => {
    const setIds = progress.archive.downloadedSets[colTrack] ?? [];
    setArchiveWords(readCachedArchiveWords(colTrack, setIds));
  }, [colTrack, progress.archive.downloadedSets]);

  const equippedSkin = useMemo(() => getSkin(progress.equippedSkin), [progress.equippedSkin]);
  const equippedJelly = useMemo(
    () => getSpecialJelly(progress.equippedJelly),
    [progress.equippedJelly],
  );
  /** 현재 게임 트랙에서 다운로드가 끝난 추가 단어. 기본 단어와 출제 시점에 합칩니다. */
  const playArchiveWords = useMemo(
    () => readCachedArchiveWords(track, progress.archive.downloadedSets[track] ?? []),
    [progress.archive.downloadedSets, track],
  );

  /** 레벨이 낮을수록 좌우로 크게 흔들리고, 레벨 10은 일자로 내려옵니다. */
  const swayAmp = useMemo(() => swayDistanceForLevel(level), [level]);
  const swayTilt = useMemo(() => Math.max(0, 10 - level) * 1.2, [level]);
  const swayDur = useMemo(() => swayDurationForLevel(level), [level]);

  const showShopToast = useCallback((msg: string) => {
    setShopToast(msg);
    window.setTimeout(() => setShopToast((t) => (t === msg ? null : t)), 1400);
  }, []);

  const requestRewardedAd = useCallback(
    (confirmation: RewardAdConfirmation, action: () => void | Promise<void>) => {
      pendingRewardActionRef.current = action;
      setRewardAdConfirmation(confirmation);
    },
    [],
  );

  const cancelRewardedAd = useCallback(() => {
    pendingRewardActionRef.current = null;
    setRewardAdConfirmation(null);
  }, []);

  const confirmRewardedAd = useCallback(() => {
    const action = pendingRewardActionRef.current;
    pendingRewardActionRef.current = null;
    setRewardAdConfirmation(null);
    if (action) void action();
  }, []);

  const unlockTrackWithAd = useCallback(
    async (trackId: TrackType) => {
      const meta = TRACKS[trackId];
      if (!trackHasWords(trackId)) {
        showShopToast("곧 만나요! 준비중인 섬이에요");
        return;
      }
      setRewardingTrack(trackId);
      try {
        const rewarded = await showRewardedUnlockAd();
        if (!rewarded) {
          showShopToast("광고 보상을 받지 못했어요. Android 앱에서 다시 시도해주세요.");
          return;
        }
        setProgress((current) => {
          const next = unlockTrack(current, trackId);
          saveProgress(next);
          return next;
        });
        playCoin();
        showShopToast(`${meta.island} 잠금 해제!`);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        console.warn("Rewarded ad failed", detail);
        showShopToast("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setRewardingTrack(null);
      }
    },
    [showShopToast],
  );

  const earnCoinsWithAd = useCallback(async () => {
    if (rewardingCoins) return;
    setRewardingCoins(true);
    try {
      const rewarded = await showRewardedUnlockAd();
      if (!rewarded) {
        showShopToast("광고 보상을 받지 못했어요. Android 앱에서 다시 시도해주세요.");
        return;
      }
      setProgress((current) => {
        const next = { ...current, coins: current.coins + 100 };
        saveProgress(next);
        return next;
      });
      playCoin();
      showShopToast("보상 완료! 100코인을 받았어요");
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      console.warn("Rewarded coin ad failed", detail);
      showShopToast("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setRewardingCoins(false);
    }
  }, [rewardingCoins, showShopToast]);

  const receiveNextArchiveSet = useCallback(async () => {
    if (archiveBusy) return;
    const descriptors = archiveManifest?.tracks[colTrack] ?? [];
    if (descriptors.length === 0) {
      showShopToast("추가 단어 Set이 아직 준비되지 않았어요.");
      return;
    }

    const unlocked = progress.archive.unlockedSets[colTrack] ?? [];
    const downloaded = progress.archive.downloadedSets[colTrack] ?? [];
    const retry = descriptors.find(
      ({ setId }) => unlocked.includes(setId) && !downloaded.includes(setId),
    );
    const descriptor = retry ?? descriptors.find(({ setId }) => !unlocked.includes(setId));
    if (!descriptor) {
      showShopToast("이 트랙의 추가 단어 Set을 모두 받았어요!");
      return;
    }

    setArchiveBusy(true);
    try {
      let nextProgress = progress;
      if (!unlocked.includes(descriptor.setId)) {
        const rewarded = await showRewardedUnlockAd();
        if (!rewarded) {
          showShopToast("광고 보상을 받지 못했어요. Android 앱에서 다시 시도해주세요.");
          return;
        }
        nextProgress = unlockArchiveSet(nextProgress, colTrack, descriptor.setId);
        setProgress(nextProgress);
        saveProgress(nextProgress);
      }

      const archiveSet = await downloadArchiveSet(colTrack, descriptor);
      cacheArchiveSet(archiveSet);
      nextProgress = markArchiveSetDownloaded(nextProgress, colTrack, descriptor.setId);
      setProgress(nextProgress);
      saveProgress(nextProgress);
      setArchiveWords(
        readCachedArchiveWords(colTrack, nextProgress.archive.downloadedSets[colTrack] ?? []),
      );
      playCoin();
      showShopToast(`${descriptor.title} · ${archiveSet.words.length}단어 저장 완료!`);
    } catch (cause) {
      console.warn("Archive Set download failed", cause);
      showShopToast("Set 저장에 실패했어요. 광고 없이 다시 받을 수 있어요.");
    } finally {
      setArchiveBusy(false);
    }
  }, [archiveBusy, archiveManifest, colTrack, progress, showShopToast]);

  const buySkin = useCallback(
    (id: string) => {
      const skin = getSkin(id);
      if (isSkinOwned(progress.ownedSkins, id)) {
        showShopToast("이미 보유 중인 스킨이에요");
        return;
      }
      if (progress.coins < skin.price) {
        showShopToast("코인이 부족해요");
        return;
      }
      const next: Progress = {
        ...progress,
        coins: progress.coins - skin.price,
        ownedSkins: [...new Set([...progress.ownedSkins, id])],
        equippedSkin: id,
      };
      setProgress(next);
      saveProgress(next);
      playCoin();
      showShopToast(`${skin.name} 구매 완료!`);
    },
    [progress, showShopToast],
  );

  const equipSkin = useCallback(
    (id: string) => {
      if (!testUnlockSkins && !isSkinOwned(progress.ownedSkins, id)) {
        showShopToast("먼저 구매해야 해요");
        return;
      }
      const next: Progress = { ...progress, equippedSkin: id };
      setProgress(next);
      saveProgress(next);
      playClick();
      showShopToast("스킨을 장착했어요");
    },
    [progress, showShopToast, testUnlockSkins],
  );

  const buyJelly = useCallback(
    (id: string) => {
      const jelly = getSpecialJelly(id);
      if (isJellyOwned(progress.ownedJellies, id)) {
        showShopToast("이미 보유 중인 젤리예요");
        return;
      }
      if (progress.coins < jelly.price) {
        showShopToast("코인이 부족해요");
        return;
      }
      const next: Progress = {
        ...progress,
        coins: progress.coins - jelly.price,
        ownedJellies: [...new Set([...progress.ownedJellies, id])],
        equippedJelly: id,
      };
      setProgress(next);
      saveProgress(next);
      playCoin();
      showShopToast(`${jelly.name} 구매 완료!`);
    },
    [progress, showShopToast],
  );

  const equipJelly = useCallback(
    (id: string) => {
      if (!testUnlockSkins && !isJellyOwned(progress.ownedJellies, id)) {
        showShopToast("먼저 구매해야 해요");
        return;
      }
      const next: Progress = { ...progress, equippedJelly: id };
      setProgress(next);
      saveProgress(next);
      playClick();
      showShopToast("젤리를 장착했어요");
    },
    [progress, showShopToast, testUnlockSkins],
  );

  const spawnParticles = useCallback((count = 8) => {
    const next: typeof particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 28 + Math.random() * 22;
      next.push({
        id: Date.now() + i,
        x: 0,
        y: 0,
        hue: HUES[Math.floor(Math.random() * HUES.length)]!,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist - 18,
      });
    }
    setParticles(next);
    window.setTimeout(() => setParticles([]), 700);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 1200);
  }, []);

  /** 현재 레벨의 단어 풀에서 count개의 새로운 단어를 만듭니다. */
  const makeLevelWords = useCallback(
    (count: number) => {
      return createLevelWordQueue(
        level,
        track,
        playArchiveWords,
        count,
        [
          ...wordQueueRef.current.map(({ word }) => word),
          ...clearedRef.current,
          ...usedRef.current,
        ],
        recentRef.current,
      );
    },
    [level, playArchiveWords, track],
  );

  const makeFaller = useCallback(
    (item: WordItem): Faller => {
      return {
        ...item,
        id: ++idRef.current,
        x: 0.5,
        y: 0,
        speed: fallSpeedForLevel(level),
        hue: HUES[Math.floor(Math.random() * HUES.length)]!,
        state: "falling",
        retried: false,
        missCount: 0,
      };
    },
    [level],
  );

  const peekNext = useCallback(() => {
    const q = wordQueueRef.current;
    return q.length > 0 ? q[0] : null;
  }, []);

  const popNext = useCallback(() => {
    const q = wordQueueRef.current;
    const next = q.shift() ?? null;
    if (next) usedRef.current.add(next.word);
    setNextWord(q[0] ?? null);
    return next;
  }, []);

  const addPenaltyWords = useCallback(
    (count: number) => {
      const currentSize = wordQueueRef.current.length;
      const canAdd = Math.max(0, MAX_WORDS_PER_LEVEL - currentSize);
      const addCount = Math.min(count, canAdd);
      if (addCount <= 0) return;

      const extras = makeLevelWords(addCount);
      wordQueueRef.current.push(...extras);
      setWordsRemaining((n) => Math.min(n + addCount, MAX_WORDS_PER_LEVEL));
      setNextWord(wordQueueRef.current[0] ?? null);
    },
    [makeLevelWords],
  );

  /** 라운드 종료 — 결과 계산 후 진행도 저장. */
  const finishRound = useCallback((cleared: boolean) => {
    if (phaseRef.current === "over") return;
    if (cleared) {
      playLevelUp();
    } else {
      playGameOver();
    }
    const { score: s, rescued: r, attempts: a, bestCombo: bc, hp: h } = statsRef.current;
    const stars = starsForResult(cleared, h, MAX_HP);
    const coins = coinsForResult(r, stars);
    const round: RoundResult = {
      level: levelRef.current,
      track: trackRef.current,
      cleared,
      stars,
      coins,
      score: s,
      rescued: r,
      accuracy: a ? Math.round((r / a) * 100) : 0,
      bestCombo: bc,
      words: roundWordsRef.current,
    };
    const nextProgress = applyResult(progressRef.current, round);
    setProgress(nextProgress);
    saveProgress(nextProgress);
    setResult(round);
    setBest((b) => Math.max(b, s));
    setActive(null);
    setPhase("over");
    speechRef.current.stop();
  }, []);

  /** 레벨 목표 달성 — 한 레벨을 하나의 라운드로 마무리합니다. */
  const levelUp = useCallback(() => {
    showToast("레벨 클리어!");
    window.setTimeout(() => finishRound(true), 900);
  }, [finishRound, showToast]);

  // ---- STT 초기화 ----
  /** 초기화 직후 흘러들어오는 이전 세션 결과를 무시할 시각 */
  const muteUntilRef = useRef(0);
  /** 같은 시도에서 동일한 최종 결과가 중복 처리되는 것을 막는 값 */
  const lastFinalRef = useRef("");
  /** 틀린 발음 뒤 인식기를 새 세션으로 전환하기 위한 지연 타이머 */
  const retrySpeechTimerRef = useRef<number | null>(null);

  /**
   * 모든 시도 전에 음성 인식 결과를 완전히 초기화합니다.
   * 화면 표시 문구, 중복 판정 기록, 엔진 내부 누적 버퍼까지 함께 비웁니다.
   */
  const resetSpeech = useCallback(() => {
    if (retrySpeechTimerRef.current !== null) {
      window.clearTimeout(retrySpeechTimerRef.current);
      retrySpeechTimerRef.current = null;
    }
    setHeard("");
    lastFinalRef.current = "";
    muteUntilRef.current = Date.now() + 400;
    speechRef.current?.reset();
  }, []);

  /** Move on to the next friend after a short beat. */

  const queueNext = useCallback(
    (delay: number) => {
      gapRef.current = delay;
      window.setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        const upcoming = popNext();
        if (!upcoming) {
          levelUp();
          return;
        }
        resetSpeech();
        recentRef.current.push(upcoming.word);
        if (recentRef.current.length > 6) recentRef.current.shift();
        setActive(makeFaller(upcoming));
      }, delay);
    },
    [makeFaller, popNext, levelUp, resetSpeech],
  );

  /** Correct answer: parachute opens, star earned. */
  const rescue = useCallback(
    (target: Faller) => {
      resetSpeech();
      playRescue();
      playCoin();
      spawnParticles(10);
      // "+1" 팝업 — 젤리가 웃으며 그 자리에서 사라지기 전에 잠깐 떠오릅니다.
      const CHEERS = ["야호!", "고마워!", "살았다!", "최고야!", "신난다!"];
      setPlusOneMsg(CHEERS[Math.floor(Math.random() * CHEERS.length)]!);
      setPlusOne(target.id);
      window.setTimeout(() => setPlusOne((p) => (p === target.id ? null : p)), 900);
      setActive((cur) => (cur && cur.id === target.id ? { ...cur, state: "saved" } : cur));
      setRescued((r) => r + 1);
      setLevelRescued((r) => r + 1);
      setAttempts((a) => a + 1);
      clearedRef.current.add(target.word);
      if (!roundWordsRef.current.some((w) => w.word === target.word)) {
        const {
          id: _id,
          x: _x,
          y: _y,
          speed: _s,
          hue: _h,
          state: _st,
          retried: _r,
          missCount: _m,
          ...item
        } = target;
        roundWordsRef.current.push(item);
      }

      setWordsRemaining((n) => Math.max(0, n - 1));
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        const gain = Math.round(
          (60 + target.y * 60) * (1 + Math.min(next, 8) * 0.15) * (0.8 + target.level * 0.2),
        );
        setScore((s) => {
          const total = s + gain;
          setBest((b) => Math.max(b, total));
          return total;
        });
        showToast(next >= 3 && next % 3 === 0 ? `${next} COMBO!` : "좋아요!");
        return next;
      });
      setFlash("hit");
      window.setTimeout(() => setFlash(null), 220);

      // 레벨업 조건: 20명 구조 또는 큐가 비었을 때
      const willLevelUp =
        levelRescued + 1 >= RESCUES_PER_LEVEL_UP || wordQueueRef.current.length === 0;
      queueNext(willLevelUp ? 1600 : 1000);
      if (willLevelUp) {
        window.setTimeout(() => levelUp(), 1500);
      }
    },
    [queueNext, showToast, levelRescued, levelUp, spawnParticles, resetSpeech],
  );

  /** Misrecognition: slow down, then offer a Pass button after 3 misses. */
  const miss = useCallback(() => {
    const cur = activeRef.current;
    setCombo(0);
    setFlash("miss");
    playMiss();
    window.setTimeout(() => setFlash(null), 220);
    // 다음 시도가 이전 발음과 합쳐지지 않도록 인식 결과를 완전히 초기화합니다.
    resetSpeech();
    if (!cur || cur.state !== "falling") return;

    const nextMissCount = cur.missCount + 1;
    // 여러 번 틀려도 멈추지 않도록 최소 낙하 속도를 보장합니다.
    const slow = (s: number, f: number) => Math.max(s * f, MIN_FALL_SPEED);

    if (nextMissCount === 1) {
      // 첫 실패: 속도 늦추고 한 번 더 기회
      setActive((a) =>
        a && a.id === cur.id ? { ...a, missCount: 1, retried: true, speed: slow(a.speed, 0.7) } : a,
      );
      showToast("한 번 더 말해보세요");
      return;
    }

    if (nextMissCount === 2) {
      // 두 번째 실패: 조금 더 늦추기
      setActive((a) =>
        a && a.id === cur.id ? { ...a, missCount: 2, speed: slow(a.speed, 0.85) } : a,
      );
      showToast("다시 한 번!");
      return;
    }

    // 세 번째 실패부터 Pass 버튼 노출
    setActive((a) =>
      a && a.id === cur.id ? { ...a, missCount: nextMissCount, speed: slow(a.speed, 0.95) } : a,
    );
    showToast("Pass 버튼으로 넘어갈 수 있어요");
  }, [showToast, resetSpeech]);

  /** Pass the current word: 같은 단어는 다시 나오지 않고 패널티 단어만 추가됩니다. */
  const passCurrent = useCallback(() => {
    const cur = activeRef.current;
    if (!cur || cur.state !== "falling") return;
    resetSpeech();
    addPenaltyWords(EXTRA_WORDS_ON_MISS);
    showToast("다음 친구를 구해요");
    queueNext(600);
  }, [addPenaltyWords, showToast, queueNext, resetSpeech]);

  const handleTranscript = useCallback(
    (result: SpeechResult) => {
      const { transcript, isFinal } = result;
      if (phaseRef.current !== "playing") return;
      // 초기화 직후 도착한 이전 세션의 잔여 결과는 버립니다.
      if (Date.now() < muteUntilRef.current) return;
      const cur = activeRef.current;
      const text = transcript.trim();
      if (!text) return;
      setHeard(text);
      setVoiceLevel(1);
      if (voiceTimer.current) window.clearTimeout(voiceTimer.current);
      voiceTimer.current = window.setTimeout(() => setVoiceLevel(0), 700);
      if (!cur || cur.state !== "falling") return;

      const evaluation = evaluatePronunciation({
        target: cur,
        result,
        strictness: strictRef.current,
        trackLeniency: getTrack(trackRef.current).leniency,
      });
      if (evaluation.accepted) {
        if (retrySpeechTimerRef.current !== null) {
          window.clearTimeout(retrySpeechTimerRef.current);
          retrySpeechTimerRef.current = null;
        }
        rescue(cur);
        return;
      }

      // Android에서는 틀린 결과가 중간 결과로만 끝나는 경우가 있습니다.
      // 사용자가 계속 말하는 동안에는 기다리고, 결과가 잠잠해지면 새 세션으로
      // 전환해 이전 단어의 인식 버퍼가 다음 시도를 방해하지 않게 합니다.
      if (retrySpeechTimerRef.current !== null) {
        window.clearTimeout(retrySpeechTimerRef.current);
      }
      retrySpeechTimerRef.current = window.setTimeout(() => {
        retrySpeechTimerRef.current = null;
        lastFinalRef.current = "";
        muteUntilRef.current = Date.now() + 400;
        speechRef.current?.reset();
      }, 800);

      if (isFinal) {
        // 같은 최종 결과가 두 번 들어오면 판정/토스트를 중복 처리하지 않습니다.
        if (lastFinalRef.current === text) return;
        lastFinalRef.current = text;
        miss();
      }
    },
    [miss, rescue],
  );

  const speech = useSpeechRecognition(handleTranscript);
  const speechRef = useRef(speech);
  speechRef.current = speech;

  /** 목표 단어를 원어민 TTS로 재생하고 재생이 끝나면 음성 인식을 다시 시작합니다. */
  const playTargetPronunciation = useCallback(() => {
    const target = activeRef.current;
    if (!target || target.state !== "falling") return;

    resumeAudio();
    speechRef.current.stop();

    const resumeRecognition = () => {
      window.setTimeout(() => {
        if (phaseRef.current === "playing") speechRef.current.start();
      }, 250);
    };

    const play = async () => {
      const isNative = !!(
        window as typeof window & {
          Capacitor?: { isNativePlatform?: () => boolean };
        }
      ).Capacitor?.isNativePlatform?.();

      try {
        if (isNative) {
          const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
          await TextToSpeech.stop();
          await TextToSpeech.speak({
            text: target.word,
            lang: "en-US",
            rate: 0.82,
            pitch: 1,
            volume: 1,
          });
          return;
        }

        if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
          throw new Error("Speech synthesis is unavailable");
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(target.word);
        utterance.lang = "en-US";
        utterance.rate = 0.82;
        utterance.pitch = 1;
        const englishVoice = window.speechSynthesis
          .getVoices()
          .find((voice) => voice.lang.toLowerCase().startsWith("en-us"));
        if (englishVoice) utterance.voice = englishVoice;
        await new Promise<void>((resolve, reject) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => reject(new Error("Speech playback failed"));
          window.speechSynthesis.speak(utterance);
        });
      } catch {
        showToast("발음을 재생할 수 없어요. 기기의 TTS 설정을 확인해 주세요");
      } finally {
        resumeRecognition();
      }
    };

    window.setTimeout(() => void play(), 150);
  }, [showToast]);

  /** 앱 실행 시 마이크 권한 상태를 확인하고, 처음이면 안내 시트를 띄웁니다. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await checkMicPermission();
      if (!alive) return;
      setMicStatus(s);
      if (s !== "granted" && s !== "unsupported" && !hasSeenMicOnboarding()) {
        setShowMicOnboard(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** 설정 앱에 다녀와 다시 포그라운드로 돌아오면 권한 상태를 다시 확인 */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void checkMicPermission().then((s) => {
        setMicStatus(s);
        if (s === "granted") {
          setPermissionDenied(false);
          setShowMicOnboard(false);
        }
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /**
   * 버튼 하나로 "다시 확인 → 필요하면 다시 요청"을 반복 실행합니다.
   * 상태는 매 단계마다 즉시 화면에 반영됩니다.
   */
  const retryMic = useCallback(async (proceed = true) => {
    setMicBusy(true);
    setMicTries((n) => n + 1);
    // 1) 현재 상태 즉시 갱신
    const current = await checkMicPermission();
    setMicStatus(current);
    if (current === "granted") {
      setPermissionDenied(false);
      setShowMicOnboard(false);
      setMicBusy(false);
      if (proceed) setPhase("countdown");
      return true;
    }
    if (current === "unsupported") {
      setMicBusy(false);
      return false;
    }
    // 2) 아직이면 곧바로 재요청 (거부 상태여도 한 번 더 시도)
    const asked = await requestMicPermission();
    markMicOnboarded();
    setMicStatus(asked);
    setMicBusy(false);
    if (asked === "granted") {
      setPermissionDenied(false);
      setShowMicOnboard(false);
      if (proceed) setPhase("countdown");
      return true;
    }
    setPermissionDenied(asked === "denied");
    return false;
  }, []);

  const beginRound = useCallback(
    (startLevel = 1, startTrack: TrackType = "basic") => {
      idRef.current = 0;
      elapsed.current = 0;
      setScore(0);
      setRescued(0);
      setAttempts(0);
      setCombo(0);
      setBestCombo(0);
      setHeard("");
      setToast(null);
      setResult(null);
      setActive(null);
      setNextWord(null);
      setParticles([]);
      setPermissionDenied(false);
      setLevel(startLevel);
      setTrack(startTrack);
      trackRef.current = startTrack;
      setLevelRescued(0);
      setWordsRemaining(WORDS_PER_LEVEL);
      setHp(MAX_HP);
      clearedRef.current.clear();
      usedRef.current.clear();
      setPlusOne(null);
      recentRef.current = [];
      roundWordsRef.current = [];
      wordQueueRef.current = [];
      gapRef.current = 0;
      missGuard.current = null;
      statsRef.current = { score: 0, rescued: 0, attempts: 0, bestCombo: 0, hp: MAX_HP };
      // 권한이 이미 허용됐거나 마이크를 쓸 수 없는 기기면 바로 시작,
      // 그 외에는 권한 안내 화면을 먼저 보여줍니다.
      setPhase(micStatus === "granted" || micStatus === "unsupported" ? "countdown" : "permission");
    },
    [micStatus],
  );

  const stopGame = useCallback(() => {
    finishRound(false);
  }, [finishRound]);

  /** Countdown 3·2·1 — initialize queue here so level is known. */
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    wordQueueRef.current = makeLevelWords(WORDS_PER_LEVEL);
    setNextWord(wordQueueRef.current[0] ?? null);
    playTick();

    let n = 3;
    const iv = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(iv);
        playStart();
        const first = popNext();
        if (!first) {
          levelUp();
          return;
        }
        setActive(makeFaller(first));
        setPhase("playing");
        if (speechRef.current.supported) speechRef.current.start();
      } else {
        setCountdown(n);
        playTick();
      }
    }, 800);
    return () => window.clearInterval(iv);
  }, [phase, makeFaller, makeLevelWords, popNext, levelUp]);

  /** Fall loop — only ever one scored target. */
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed.current += dt;

      setActive((cur) => {
        if (!cur) return cur;
        if (cur.state === "saved") return { ...cur, y: Math.max(0, cur.y - 0.18 * dt) };
        if (cur.state === "crying") return cur;
        if (cur.state !== "falling") return cur;
        const y = cur.y + cur.speed * dt;

        // 위험 한계선 근접 시 경고음 (0.7초 간격)
        if (y > 0.72 && now - hazardBeepAt.current > 700) {
          hazardBeepAt.current = now;
          playHazardBeep();
        }

        if (y >= 1) {
          // StrictMode/리렌더로 updater가 두 번 실행돼도 하트는 1개만 차감
          if (missGuard.current !== cur.id) {
            missGuard.current = cur.id;
            setCombo(0);
            setAttempts((a) => a + 1);
            setFlash("miss");
            playMiss();
            window.setTimeout(() => setFlash(null), 220);

            // 하트 1개 감소 — 0이 되면 라운드 종료
            const next = Math.max(0, statsRef.current.hp - 1);
            statsRef.current.hp = next;
            setHp(next);
            if (next === 0) {
              window.setTimeout(() => stopGame(), 900);
            } else {
              window.setTimeout(() => queueNext(0), 650);
            }
          }
          return { ...cur, y: 1, state: "crying" };
        }

        return { ...cur, y };
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, queueNext, stopGame]);

  useEffect(() => () => speechRef.current.stop(), []);

  const near = active?.state === "falling" && active.y > 0.72;
  const accuracy = attempts ? Math.round((rescued / attempts) * 100) : 0;
  const title = useMemo(() => getTitle(progress), [progress]);
  const totalStars = useMemo(
    () =>
      Object.entries(progress.levels)
        .filter(([k]) => k.startsWith(`${mapTrack}:`))
        .reduce((sum, [, l]) => sum + l.stars, 0),
    [progress, mapTrack],
  );
  const collectedSet = useMemo(() => new Set(progress.collected), [progress.collected]);
  const collectionByLevel = useMemo(
    () =>
      Array.from({ length: TOTAL_LEVELS }, (_, i) => {
        const lv = i + 1;
        const words = getWordsByLevel(lv, colTrack);
        return { level: lv, words, owned: words.filter((w) => collectedSet.has(w.word)).length };
      }),
    [collectedSet, colTrack],
  );
  /** 단어 데이터가 준비된 트랙 목록 */
  const availableTracks = useMemo(
    () => (["basic", ...WORLD_TRACKS] as TrackType[]).filter((t) => trackHasWords(t)),
    [],
  );
  const archiveDescriptors = archiveManifest?.tracks[colTrack] ?? [];
  const archiveAvailableWords = archiveDescriptors.reduce(
    (total, descriptor) => total + descriptor.wordCount,
    0,
  );
  const archiveUnlocked = progress.archive.unlockedSets[colTrack] ?? [];
  const archiveDownloaded = progress.archive.downloadedSets[colTrack] ?? [];
  const pendingArchive = archiveDescriptors.find(
    ({ setId }) => archiveUnlocked.includes(setId) && !archiveDownloaded.includes(setId),
  );
  const nextArchive =
    pendingArchive ?? archiveDescriptors.find(({ setId }) => !archiveUnlocked.includes(setId));

  const inPlay = phase === "playing" || phase === "countdown" || phase === "paused";

  return (
    <div
      className={`relative mx-auto flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md touch-pan-y flex-col overflow-hidden overscroll-none text-foreground ${near ? "bg-sky-alert" : "bg-sky-glow"} transition-colors duration-500`}
    >
      {/* drifting clouds */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute left-[8%] top-[18%] h-16 w-40 animate-drift bg-cloud" />
        <div className="absolute right-[4%] top-[36%] h-14 w-32 animate-drift-slow bg-cloud" />
        <div className="absolute left-[22%] top-[60%] h-12 w-28 animate-drift bg-cloud opacity-80" />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-200 ${
          flash === "hit"
            ? "bg-hit-flash opacity-100"
            : flash === "miss"
              ? "bg-miss-flash opacity-100"
              : "opacity-0"
        }`}
        aria-hidden
      />

      {/* hazard warning pulse */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[oklch(0.65_0.18_20/0.22)] transition-opacity duration-200 ${
          near ? "animate-hazard-pulse" : "opacity-0"
        }`}
        aria-hidden
      />

      {inPlay && (
        <>
          {/* HUD — 하트 / 레벨 / 남은 단어 (타이틀 제거, 정보 단일화) */}
          <header className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 pt-[clamp(0.75rem,2.5dvh,1.5rem)]">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (phase !== "playing") return;
                  playClick();
                  speech.stop();
                  setPhase("paused");
                }}
                disabled={phase !== "playing"}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card/85 text-[#173f78] shadow-soft active:scale-95 disabled:opacity-40"
                aria-label="게임 일시정지 및 뒤로가기"
              >
                <ArrowLeft className="size-5" />
              </button>
              <span className="flex min-w-0 items-center gap-0.5" aria-label={`남은 하트 ${hp}개`}>
                {Array.from({ length: MAX_HP }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`size-[18px] shrink-0 ${
                      i < hp
                        ? "fill-destructive text-destructive drop-shadow-[0_2px_3px_rgba(220,60,70,0.35)]"
                        : "fill-foreground/10 text-foreground/20"
                    }`}
                  />
                ))}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {combo > 1 && (
                <span className="animate-pop rounded-full bg-accent px-2.5 py-1 font-display text-sm text-accent-foreground">
                  {combo}x
                </span>
              )}
              <span className="flex items-center gap-1 rounded-full bg-card/85 px-3 py-1 font-display text-sm shadow-soft">
                <JellyIcon className="size-4 text-primary" />
                {rescued}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                resumeAudio();
                const next = !soundEnabled;
                setSoundEnabled(next);
              }}
              className="flex size-9 items-center justify-center rounded-full bg-card/85 shadow-soft active:scale-95"
              aria-label={soundEnabled ? "소리 끄기" : "소리 켜기"}
            >
              {soundEnabled ? (
                <Volume2 className="size-4 text-foreground" />
              ) : (
                <VolumeX className="size-4 text-muted-foreground" />
              )}
            </button>
          </header>

          {/* Level progress — 레벨 표기는 여기 한 곳에만 */}
          <div className="relative z-10 px-5 pt-[clamp(0.35rem,1.2dvh,0.625rem)]">
            <div className="flex items-center justify-between font-display text-sm text-[#173f78]">
              <span>
                {track !== "basic" ? `${getTrack(track).emoji} ` : ""}Lv.{level}
              </span>
              <span className="font-ui text-xs text-muted-foreground">
                남은 단어 {wordsRemaining}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(levelRescued / RESCUES_PER_LEVEL_UP) * 100}%` }}
              />
            </div>
          </div>

          {/* Sky field */}
          <div className="relative z-10 min-h-0 flex-1">
            {active && (
              <div
                className="absolute flex w-full flex-col items-center px-6"
                style={{
                  left: "50%",
                  top: `${active.y * 82}%`,
                  transform: "translateX(-50%)",
                  ["--sway" as string]: `${swayAmp}vw`,
                  ["--tilt" as string]: `${swayTilt}deg`,
                  animation:
                    swayAmp > 0 && active.state === "falling"
                      ? `parachute-sway ${swayDur}s ease-in-out infinite`
                      : undefined,
                }}
              >
                {/* 스킨별 특수 효과 */}
                {active.state === "falling" && <SkinEffects skin={equippedSkin} />}

                {/* parachute — 스킨 모양(낙하산/우산/꽃/풍선), 구조되면 활짝 펼쳐짐 */}
                {active.state !== "crying" && (
                  <div
                    className={`relative z-10 -mb-5 flex flex-col items-center transition-all duration-500 ${
                      active.state === "saved" ? "animate-vanish-pop" : ""
                    }`}
                    aria-hidden
                  >
                    <SkinCanopy skin={equippedSkin} saved={active.state === "saved"} />
                  </div>
                )}

                {/* "야호! +1" 팝업 on rescue */}
                {plusOne === active.id && (
                  <span
                    className="ribbon-title animate-score-pop pointer-events-none absolute left-1/2 top-1/2 z-20 whitespace-nowrap text-xl text-emerald-500"
                    aria-hidden
                  >
                    {plusOneMsg} +1
                  </span>
                )}

                {/* particle burst on rescue */}
                {active.state === "saved" && particles.length > 0 && (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    aria-hidden
                  >
                    {particles.map((p) => (
                      <span
                        key={p.id}
                        className="absolute left-0 top-0 size-2 rounded-full"
                        style={{
                          background: `oklch(0.85 0.16 ${p.hue})`,
                          boxShadow: `0 0 6px oklch(0.8 0.14 ${p.hue})`,
                          ["--tx" as string]: `${p.tx}px`,
                          ["--ty" as string]: `${p.ty}px`,
                          animation: "particle-fade 0.7s ease-out forwards",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* jelly friend */}
                <div
                  className={`relative z-20 flex size-20 items-center justify-center ${
                    active.state === "falling" && !near ? "animate-bob" : ""
                  } ${active.state === "falling" && near ? "animate-scared-shake" : ""} ${
                    active.state === "saved" ? "animate-vanish-pop" : ""
                  } ${active.state === "crying" ? "animate-cry" : ""}`}
                >
                  {equippedJelly.image ? (
                    <img
                      src={equippedJelly.image}
                      alt=""
                      draggable={false}
                      className="pointer-events-none size-full select-none object-contain drop-shadow-[0_7px_7px_rgba(23,63,120,0.22)]"
                    />
                  ) : (
                    <DefaultJellyVisual
                      className="size-14"
                      hue={equippedJelly.hue ?? active.hue}
                      rainbow={equippedJelly.rainbow}
                    />
                  )}
                  {active.state === "crying" && (
                    <>
                      <span className="absolute left-[31%] top-[42%] size-1.5 rounded-full bg-sky-400 animate-tear" />
                      <span className="absolute right-[31%] top-[42%] size-1.5 rounded-full bg-sky-400 animate-tear" />
                    </>
                  )}
                  {/* scared sweat drops when near hazard */}
                  {active.state === "falling" && near && (
                    <>
                      <span className="absolute -right-1 top-2 size-1.5 rounded-full bg-sky-300/80" />
                      <span className="absolute -left-0.5 top-3 size-1 rounded-full bg-sky-300/80" />
                    </>
                  )}
                </div>

                {/* active word card — word first, IPA secondary */}
                <div className="relative -mt-0.5 flex flex-col items-center">
                  <span
                    className={`size-2 rotate-45 rounded-[2px] border-l border-t ${
                      active.state === "crying"
                        ? "border-destructive/30 bg-destructive/10 opacity-60"
                        : active.retried
                          ? "border-accent bg-accent/30"
                          : "border-border bg-card/90"
                    }`}
                    aria-hidden
                  />
                  <div
                    className={`-mt-1 flex items-baseline gap-2 whitespace-nowrap rounded-full border-2 px-5 py-2 shadow-soft backdrop-blur-sm ${
                      active.state === "crying"
                        ? "border-destructive/30 bg-destructive/10 opacity-60"
                        : active.retried
                          ? "animate-quake border-accent bg-accent/30"
                          : "border-border bg-card/95"
                    }`}
                  >
                    <span className="font-display text-2xl leading-none">{active.word}</span>
                    <span className="font-ui text-sm leading-none text-muted-foreground">
                      {active.ipa}
                    </span>
                  </div>
                  <span className="mt-1 font-ui text-sm text-muted-foreground">
                    {active.meaning}
                  </span>
                  {strictness === "hard" && getPronunciationFocus(active) && (
                    <span className="mt-1 rounded-full bg-destructive/10 px-2.5 py-0.5 font-display text-xs text-destructive">
                      발음 집중 · {getPronunciationFocus(active)} 구별
                    </span>
                  )}
                </div>
              </div>
            )}

            {toast && (
              <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
                <span className="animate-pop rounded-full bg-card px-4 py-2 font-display text-base shadow-soft">
                  {toast}
                </span>
              </div>
            )}
          </div>

          {/* Hazard line — 텍스트 영역 위쪽에 분리 배치 */}
          <div className="relative z-10 shrink-0 px-4 pb-1" aria-hidden>
            <div
              className={`h-0 w-full border-t-[3px] border-dashed transition-colors duration-300 ${
                near ? "border-destructive" : "border-destructive/30"
              }`}
            />
            <span
              className={`absolute -top-2 right-5 rounded-full px-2 py-0.5 font-display text-[0.65rem] tracking-wide transition-colors duration-300 ${
                near ? "bg-destructive text-white" : "bg-destructive/15 text-destructive/70"
              }`}
            >
              위험
            </span>
          </div>

          {/* Bottom bar — 하나의 음성 입력 바로 통합 */}
          <footer className="relative z-10 space-y-1.5 px-5 pb-[clamp(0.75rem,3dvh,2rem)] pt-2">
            {phase === "playing" && (
              <div className="flex items-center gap-3 rounded-3xl bg-card/95 px-4 py-2.5 shadow-soft backdrop-blur-sm">
                <span
                  className={`relative grid size-11 shrink-0 place-items-center rounded-full transition-colors ${
                    speech.listening ? "bg-destructive/15" : "bg-primary/10"
                  }`}
                  aria-label={speech.listening ? "음성 인식 중" : "음성 입력 대기 중"}
                >
                  {speech.listening && (
                    <span className="absolute inset-0 animate-ping rounded-full border-2 border-destructive/60" />
                  )}
                  <Mic
                    className={`size-5 transition-colors ${
                      speech.listening ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base text-[#173f78]">
                    {!speech.supported ? (
                      "이 브라우저는 음성 인식을 지원하지 않아요"
                    ) : active?.state === "falling" ? (
                      <>
                        <b className="text-primary">{active.word}</b>
                        <span> 을(를) 말해보세요!</span>
                      </>
                    ) : (
                      "다음 친구를 준비하는 중…"
                    )}
                  </p>
                  {heard && speech.supported && (
                    <div
                      className={`text-xs ${
                        containsProfanity(heard) ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {containsProfanity(heard) ? (
                        "앗! 다시 또박또박 말해볼까요?"
                      ) : (
                        <>
                          <p className="truncate">“{heard}”으로 들었어요 · 다시 말해보세요</p>
                          {active?.state === "falling" && (
                            <p className="mt-0.5 truncate font-ui">
                              목표 <b className="text-primary">{active.ipa}</b>
                              <span className="px-1">↔</span>
                              인식{" "}
                              <b className="text-destructive">
                                {findTranscriptIpa(heard) ?? "발음기호 정보 없음"}
                              </b>
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  <Soundwave active={speech.speaking || voiceLevel > 0} />
                </div>
                <button
                  type="button"
                  onClick={playTargetPronunciation}
                  disabled={!active || active.state !== "falling"}
                  className="flex h-11 w-[6.4rem] shrink-0 items-center justify-center transition active:translate-y-0.5 active:scale-[0.98] disabled:opacity-40"
                  aria-label={`${active?.word ?? "단어"} 발음 듣기`}
                >
                  <img src={speakButton} alt="" aria-hidden className="h-auto w-full" />
                </button>
              </div>
            )}

            {phase === "playing" && active?.state === "falling" && active.missCount >= 3 && (
              <button
                onClick={() => {
                  resumeAudio();
                  passCurrent();
                }}
                className="mx-auto flex items-center gap-2 rounded-full bg-[#f0f6ff] px-6 py-2.5 font-display text-lg text-[#2a74d8] shadow-[0_6px_0_#c9e0fb,0_10px_18px_-6px_rgba(23,63,120,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-1 active:scale-[0.98]"
              >
                Pass
              </button>
            )}
          </footer>
        </>
      )}

      {/* Overlays: 대기 / 권한 / 카운트다운 / 라운드 종료 */}
      {phase === "countdown" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <span key={countdown} className="animate-pop font-display text-7xl tabular-nums">
            {countdown}
          </span>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0d2d5e]/55 px-6 backdrop-blur-[5px]">
          <div className="animate-pop relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border-4 border-white/80 bg-[#f8fcff] text-center shadow-[0_24px_70px_-18px_rgba(13,45,94,0.65)]">
            <div className="relative overflow-hidden bg-gradient-to-b from-[#72d4ff] via-[#a9e7ff] to-[#e8f8ff] px-6 pb-8 pt-6">
              <span className="absolute left-7 top-7 text-xl text-white/80">★</span>
              <span className="absolute right-8 top-12 text-sm text-[#ffc93c]">★</span>
              <span className="absolute -left-6 bottom-1 h-14 w-28 rounded-[50%] bg-white/75" />
              <span className="absolute -right-8 bottom-0 h-16 w-32 rounded-[50%] bg-white/80" />
              <span className="relative inline-flex rounded-full bg-white/75 px-4 py-1 font-display text-[10px] tracking-[0.24em] text-[#3d8ef0] shadow-sm">
                PAUSE
              </span>
              <div className="relative mx-auto mt-4 grid size-20 place-items-center rounded-[42%] bg-gradient-to-br from-[#b9ef80] to-[#6fc95f] shadow-[0_10px_22px_-10px_rgba(23,63,120,0.45)]">
                <span className="absolute -top-2 left-4 size-5 rounded-full bg-[#8edc68]" />
                <span className="absolute -top-2 right-4 size-5 rounded-full bg-[#8edc68]" />
                <span className="absolute left-5 top-8 size-2.5 rounded-full bg-[#173f78]" />
                <span className="absolute right-5 top-8 size-2.5 rounded-full bg-[#173f78]" />
                <span className="absolute bottom-5 h-2 w-4 rounded-b-full bg-[#173f78]/75" />
              </div>
              <h2 className="relative mt-4 font-display text-2xl text-[#173f78]">
                잠깐 쉬어갈까요?
              </h2>
              <p className="relative mt-1 font-ui text-sm text-[#173f78]/65">
                친구도 안전하게 기다리고 있어요
              </p>
            </div>
            <div className="relative bg-[#f8fcff] px-6 pb-6 pt-5">
              <button
                type="button"
                onClick={() => {
                  resumeAudio();
                  playClick();
                  setPhase("playing");
                  window.setTimeout(() => speech.start(), 150);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#55a8ff] to-[#3d8ef0] py-4 font-display text-lg text-white shadow-[0_6px_0_#2a6fd0,0_12px_20px_-12px_rgba(42,111,208,0.8)] transition active:translate-y-1 active:shadow-[0_2px_0_#2a6fd0]"
              >
                <Play className="size-5 fill-current" /> 계속 모험하기
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  speech.stop();
                  setActive(null);
                  setPhase("idle");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 font-display text-sm text-[#173f78]/60 transition hover:bg-[#173f78]/5 active:scale-[0.98]"
              >
                <ArrowLeft className="size-4" /> 모험을 끝내고 홈으로
              </button>
              <p className="mt-1 font-ui text-[11px] text-[#173f78]/40">
                홈으로 가면 현재 라운드는 저장되지 않아요
              </p>
            </div>
          </div>
        </div>
      )}

      {!inPlay && (
        <div
          className={`absolute inset-0 z-20 isolate flex flex-col items-center px-4 text-center ${
            phase === "idle" ? "bg-sky-start" : "bg-sky-glow/90"
          }`}
        >
          {phase === "idle" && <SkyClouds />}
          {phase === "idle" && (
            <img
              src={parachuteJelly}
              alt=""
              aria-hidden
              className="pointer-events-none absolute right-0 top-18 z-20 w-28 drop-shadow-[0_16px_18px_rgba(12,58,124,0.32)] short-screen:top-14 short-screen:w-20"
              style={{ animation: "float-y 4.5s ease-in-out infinite" }}
            />
          )}
          {phase === "idle" && (
            <div className="relative z-10 flex h-full w-full max-w-md flex-col px-3">
              <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-y-auto overscroll-contain">
                <div className="flex w-full flex-col items-center py-5 tall-screen:py-10 short-screen:py-3">
                  {/* floating jelly on cloud */}
                  <div
                    className="pointer-events-none absolute left-3 top-3 z-20 w-16 drop-shadow-[0_10px_12px_rgba(12,58,124,0.22)] short-screen:left-2 short-screen:top-2 short-screen:w-12"
                    style={{ animation: "float-y 6s ease-in-out infinite" }}
                    aria-hidden
                  >
                    <svg viewBox="0 0 80 56" fill="none" className="w-full">
                      <g>
                        <circle cx="22" cy="34" r="16" fill="#ffffff" />
                        <circle cx="40" cy="24" r="20" fill="#ffffff" />
                        <circle cx="60" cy="32" r="17" fill="#ffffff" />
                        <rect x="18" y="32" width="46" height="18" rx="9" fill="#ffffff" />
                      </g>
                    </svg>
                    <svg
                      viewBox="0 0 44 44"
                      fill="none"
                      className="absolute -top-2 left-1/2 w-10 -translate-x-1/2 short-screen:w-8"
                    >
                      <rect x="10" y="14" width="24" height="20" rx="10" fill="url(#cjBody)" />
                      <ellipse cx="6" cy="22" rx="4" ry="6" fill="#8fd95f" />
                      <ellipse cx="38" cy="22" rx="4" ry="6" fill="#8fd95f" />
                      <ellipse cx="11" cy="33" rx="3" ry="5" fill="#8fd95f" />
                      <ellipse cx="33" cy="33" rx="3" ry="5" fill="#8fd95f" />
                      <circle cx="17" cy="21" r="2.2" fill="#22364f" />
                      <circle cx="27" cy="21" r="2.2" fill="#22364f" />
                      <circle cx="17.7" cy="20.2" r="0.8" fill="#ffffff" />
                      <circle cx="27.7" cy="20.2" r="0.8" fill="#ffffff" />
                      <path
                        d="M18 26c2 1.5 5 1.5 7 0"
                        stroke="#22364f"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="cjBody" x1="10" y1="14" x2="10" y2="34">
                          <stop offset="0%" stopColor="#9ede6d" />
                          <stop offset="100%" stopColor="#5fbf47" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  {/* title block */}
                  <div className="relative mb-2 w-full shrink-0 overflow-visible px-5 pt-3 tall-screen:mb-4 tall-screen:pt-6 short-screen:mb-1 short-screen:pt-2 short-screen:px-3">
                    {/* decorative stars */}
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute left-4 top-0 z-20 size-7 fill-[#ffc93c] drop-shadow-[0_2px_2px_rgba(12,58,124,0.2)] short-screen:left-3 short-screen:top-0 short-screen:size-5"
                      style={{ animation: "float-y 3.5s ease-in-out infinite" }}
                      aria-hidden
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-6 top-2 z-20 size-6 fill-[#ffc93c] drop-shadow-[0_2px_2px_rgba(12,58,124,0.2)] short-screen:right-5 short-screen:top-1 short-screen:size-4"
                      style={{ animation: "float-y 4s ease-in-out infinite 0.3s" }}
                      aria-hidden
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute left-8 top-[4.5rem] z-20 size-5 fill-[#ffc93c] drop-shadow-[0_2px_2px_rgba(12,58,124,0.2)] short-screen:left-7 short-screen:top-16 short-screen:size-4"
                      style={{ animation: "float-y 3.2s ease-in-out infinite 0.6s" }}
                      aria-hidden
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                    <svg
                      viewBox="0 0 24 24"
                      className="pointer-events-none absolute right-4 top-[5rem] z-20 size-6 fill-[#ffc93c] drop-shadow-[0_2px_2px_rgba(12,58,124,0.2)] short-screen:right-3 short-screen:top-[4.5rem] short-screen:size-4"
                      style={{ animation: "float-y 3.8s ease-in-out infinite 0.9s" }}
                      aria-hidden
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>

                    <img
                      src={titleLockup}
                      alt="말해봐!영단어 구조대"
                      className="relative z-10 mx-auto w-[116%] max-w-96 drop-shadow-[0_16px_20px_rgba(12,58,124,0.28)] short-screen:w-[108%] short-screen:max-w-60"
                    />
                  </div>

                  {/* game settings group */}
                  <div className="flex w-full flex-1 flex-col items-center justify-start gap-4 short-screen:gap-3">
                    {/* top banner */}
                    <div className="flex w-full items-center justify-center rounded-full bg-white/95 px-4 py-2.5 shadow-[0_10px_24px_-10px_rgba(23,63,120,0.35)] backdrop-blur-sm short-screen:py-2">
                      <p className="font-display text-base leading-tight text-[#2a74d8] short-screen:text-sm">
                        영단어를 말하고 떨어지는 친구들 구하세요!
                      </p>
                    </div>

                    {/* difficulty cards */}
                    <div className="flex w-full flex-col items-center gap-3">
                      <p className="flex items-center gap-2 font-display text-lg text-[#173f78] short-screen:text-base">
                        <Star className="size-4 fill-[#ffc93c] text-[#ffc93c]" />
                        음성 인식 난이도
                        <Star className="size-4 fill-[#ffc93c] text-[#ffc93c]" />
                      </p>
                      <div className="grid w-full grid-cols-3 gap-2.5">
                        {(Object.keys(STRICTNESS) as Strictness[]).map((key) => {
                          const selected = strictness === key;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                resumeAudio();
                                playClick();
                                setStrictness(key);
                              }}
                              className={`flex aspect-square min-h-[94px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all active:scale-[0.96] short-screen:min-h-[83px] ${
                                selected
                                  ? "border-dashed border-white/70 bg-[#173f78] text-white shadow-[0_8px_0_#0f2a5e,0_14px_24px_-8px_rgba(13,45,94,0.45)]"
                                  : "border-transparent bg-white/95 text-[#173f78] shadow-[0_4px_0_#c9dff8,0_10px_20px_-8px_rgba(23,63,120,0.3)]"
                              }`}
                            >
                              <DifficultyIcon level={key} selected={selected} />
                              <span className="font-display text-base leading-tight short-screen:text-sm">
                                {STRICTNESS[key].label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* hint bar */}
                    <div className="flex w-full items-center justify-center gap-2 rounded-full bg-white/80 px-4 py-2.5 font-ui text-sm text-[#173f78]/70 shadow-[0_6px_16px_-8px_rgba(23,63,120,0.25)] backdrop-blur-sm short-screen:text-xs">
                      <Mic className="size-4 text-[#3d8ef0]" />
                      {STRICTNESS[strictness].hint}
                    </div>

                    {/* start button below hint bar */}
                    <button
                      onClick={() => {
                        resumeAudio();
                        playClick();
                        setPhase("island");
                      }}
                      className="relative z-10 flex w-full items-center justify-center gap-3 rounded-full bg-[#3d8ef0] py-5 font-display text-2xl text-white shadow-[0_8px_0_#2a6fd0,0_18px_30px_-8px_rgba(14,70,150,0.45)] transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-1 active:scale-[0.98] short-screen:py-4 short-screen:text-xl"
                    >
                      <Play className="size-7 fill-white short-screen:size-6" />
                      모험 시작
                    </button>
                  </div>
                </div>
              </div>

              {/* 테스트 빌드에서는 화면 높이와 관계없이 항상 노출 */}
              <label className="relative z-30 mb-1 flex shrink-0 cursor-pointer items-center justify-center gap-2 self-center rounded-full bg-white/85 px-4 py-2 font-ui text-xs text-[#173f78]/70 shadow-[0_5px_14px_-9px_rgba(23,63,120,0.4)]">
                <input
                  type="checkbox"
                  checked={testUnlockSkins}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setTestUnlockSkins(checked);
                    if (!checked) {
                      setProgress((current) => {
                        const next: Progress = {
                          ...current,
                          equippedSkin: isSkinOwned(current.ownedSkins, current.equippedSkin)
                            ? current.equippedSkin
                            : DEFAULT_SKIN_ID,
                          equippedJelly: isJellyOwned(current.ownedJellies, current.equippedJelly)
                            ? current.equippedJelly
                            : DEFAULT_JELLY_ID,
                        };
                        saveProgress(next);
                        return next;
                      });
                    }
                  }}
                  className="size-4 accent-[#e84d8a]"
                />
                <span>스킨 해금 for 테스트버젼</span>
              </label>

              {/* 홈 하단 제작자 및 버전 */}
              <footer className="safe-bottom relative z-40 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-1 font-ui text-[10px] text-[#173f78]/45">
                <span aria-hidden />
                <span className="text-center tracking-wide">Design by JOYgle Studio</span>
                <span className="justify-self-end whitespace-nowrap">Ver: {APP_VERSION}</span>
              </footer>
            </div>
          )}

          {phase === "permission" && (
            <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-sky-start px-6 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-white/90 text-[#3d8ef0] shadow-[0_10px_24px_-10px_rgba(23,63,120,0.5)]">
                <Mic className="size-9" />
              </div>
              <h2 className="font-display text-2xl text-[#173f78]">마이크를 켜 주세요</h2>
              <p className="max-w-xs font-ui text-base text-[#3f6699]">
                친구를 구하려면 목소리가 필요해요. 녹음은 저장되지 않고 단어 판정에만 쓰여요.
              </p>

              {/* 현재 권한 상태 배지 — 버튼을 누를 때마다 즉시 갱신 */}
              <span className="rounded-full bg-white/80 px-3 py-1 font-ui text-xs text-[#3f6699]">
                현재 상태:{" "}
                {micBusy
                  ? "확인 중…"
                  : micStatus === "granted"
                    ? "허용됨"
                    : micStatus === "denied"
                      ? "차단됨"
                      : micStatus === "unsupported"
                        ? "사용 불가"
                        : micStatus === "prompt"
                          ? "요청 전"
                          : "알 수 없음"}
                {micTries > 0 && ` · 시도 ${micTries}회`}
              </span>

              {micStatus === "unsupported" ? (
                <p className="max-w-xs rounded-2xl bg-white/80 p-4 font-ui text-sm text-[#3f6699]">
                  이 기기에서는 음성 인식을 쓸 수 없어요. 마이크 없이도 게임을 둘러볼 수 있어요.
                </p>
              ) : (
                <>
                  {(permissionDenied || micStatus === "denied") && (
                    <div className="max-w-xs rounded-2xl bg-white/85 p-4 text-left font-ui text-sm text-[#3f6699]">
                      <p className="mb-1 font-semibold text-destructive">
                        마이크가 차단되어 있어요.
                      </p>
                      <p>{settingsHint(getPlatform())}</p>
                    </div>
                  )}
                  <button
                    disabled={micBusy}
                    onClick={() => {
                      resumeAudio();
                      playClick();
                      void retryMic(true);
                    }}
                    className="mt-1 flex items-center gap-2 rounded-full bg-[#3d8ef0] px-10 py-4 font-display text-lg text-white shadow-[0_8px_0_#2a6fd0] disabled:opacity-60"
                  >
                    <Mic className="size-5" />{" "}
                    {micBusy
                      ? "확인 중…"
                      : permissionDenied || micStatus === "denied"
                        ? "다시 확인하고 요청하기"
                        : "마이크 켜고 시작"}
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  resumeAudio();
                  playClick();
                  setPhase("countdown");
                }}
                className="font-ui text-sm text-[#3f6699] underline"
              >
                마이크 없이 둘러보기
              </button>
              <button
                onClick={() => {
                  resumeAudio();
                  playClick();
                  setPhase("idle");
                }}
                className="font-ui text-sm text-muted-foreground underline"
              >
                뒤로
              </button>
            </div>
          )}

          {/* ---------- 첫 실행 마이크 안내 시트 ---------- */}
          {showMicOnboard && phase === "idle" && (
            <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/35 px-4 pb-6">
              <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-[0_20px_40px_-16px_rgba(14,50,110,0.5)]">
                <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-[#e8f2ff] text-[#3d8ef0]">
                  <Mic className="size-8" />
                </div>
                <h2 className="font-display text-xl text-[#173f78]">마이크 준비하기</h2>
                <p className="mt-2 font-ui text-sm text-[#3f6699]">
                  영어 발음을 듣고 친구를 구하는 게임이에요. 마이크 권한을 허용하면 바로 놀 수
                  있어요.
                  <br />
                  목소리는 기기 안에서만 판정에 사용되고 저장되지 않아요.
                </p>
                {(permissionDenied || micStatus === "denied") && (
                  <p className="mt-3 rounded-xl bg-[#fff1f1] p-3 text-left font-ui text-xs text-[#a33]">
                    {settingsHint(getPlatform())}
                  </p>
                )}
                <button
                  disabled={micBusy}
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    void retryMic(false);
                  }}
                  className="mt-4 w-full rounded-full bg-[#3d8ef0] py-3.5 font-display text-base text-white shadow-[0_6px_0_#2a6fd0] disabled:opacity-60"
                >
                  {micBusy ? "확인 중…" : "마이크 허용하기"}
                </button>
                <button
                  onClick={() => {
                    playClick();
                    markMicOnboarded();
                    setShowMicOnboard(false);
                  }}
                  className="mt-3 font-ui text-sm text-muted-foreground underline"
                >
                  나중에 하기
                </button>
              </div>
            </div>
          )}

          {/* ---------- 단어 섬 고르기 ---------- */}
          {phase === "island" && (
            <div className="absolute inset-0 flex flex-col bg-sky-start px-5 pt-6 text-left">
              <div className="mb-5 flex shrink-0 items-center justify-between">
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase(backDestinationForPhase("island"));
                  }}
                  className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]"
                  aria-label="뒤로"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <p className="flex items-center gap-2 font-display text-2xl text-[#173f78]">
                  <MapIcon className="size-6 text-[#3d8ef0]" />
                  단어 섬 고르기
                </p>
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 font-display text-base text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]">
                  <Star className="size-4 fill-[#ffc93c] text-[#ffc93c]" />
                  {totalStars}/{TOTAL_LEVELS * 3}
                </span>
              </div>

              <p className="mb-6 text-center font-ui text-sm text-[#173f78]/70">
                {title.emoji} {title.label}
              </p>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-4">
                {(["basic", ...WORLD_TRACKS] as TrackType[]).map((id) => {
                  const meta = TRACKS[id];
                  const ready = trackHasWords(id);
                  const locked = id !== "basic" && !isTrackPlayable(progress, id);
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        resumeAudio();
                        playClick();
                        if (locked) {
                          requestRewardedAd(
                            {
                              title: `${meta.island}을 열까요?`,
                              description: "보상형 광고를 끝까지 보면 이 섬이 영구적으로 열려요.",
                              reward: `${meta.island} 잠금 해제`,
                            },
                            () => unlockTrackWithAd(id),
                          );
                          return;
                        }
                        setMapTrack(id);
                        setPhase("map");
                      }}
                      className={`relative flex items-center gap-3 rounded-[1.5rem] bg-gradient-to-br ${meta.gradient} px-4 py-4 text-left shadow-[0_10px_22px_-14px_rgba(23,63,120,0.7)] transition-all ${
                        locked ? "opacity-45 grayscale" : "active:scale-[0.98]"
                      }`}
                    >
                      <span className="text-4xl leading-none">{meta.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl text-[#173f78]">
                          {meta.island}
                        </span>
                        <span className="block font-ui text-xs text-[#173f78]/70">
                          {rewardingTrack === id
                            ? "보상형 광고를 준비하고 있어요..."
                            : locked && ready
                              ? "눌러서 광고를 보고 이 섬 열기"
                              : ready
                                ? meta.desc
                                : "곧 만나요! 준비중인 섬이에요"}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2 py-1 font-display text-xs text-[#173f78]">
                        {locked ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <>
                            <Star className="size-3.5 fill-[#ffc93c] text-[#ffc93c]" />
                            {trackStars(progress, id)}/{id === "basic" ? TOTAL_LEVELS * 3 : 30}
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
                {!hiddenLabUnlocked && (
                  <button
                    type="button"
                    className="h-8 w-full shrink-0 bg-transparent"
                    aria-label="숨겨진 공간"
                    onClick={() => {
                      const now = Date.now();
                      const previous = hiddenLabTapRef.current;
                      const count = now - previous.lastTap <= 1200 ? previous.count + 1 : 1;
                      hiddenLabTapRef.current = { count, lastTap: now };
                      if (count >= 5) {
                        hiddenLabTapRef.current = { count: 0, lastTap: 0 };
                        setHiddenLabUnlocked(true);
                        playClick();
                        setShopToast("숨겨진 영어 받아쓰기 연구실을 발견했어요!");
                      }
                    }}
                  />
                )}
                {hiddenLabUnlocked && (
                  <Link
                    to="/dictation"
                    onClick={() => {
                      resumeAudio();
                      playClick();
                    }}
                    className="group flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#173f78]/20 bg-white/25 px-4 py-2.5 text-center opacity-55 transition hover:bg-white/45 hover:opacity-90 active:scale-[0.98]"
                    aria-label="숨겨진 영어 받아쓰기 연구실 열기"
                  >
                    <Mic className="size-3.5 text-[#173f78]/60" />
                    <span className="font-ui text-[11px] font-bold tracking-[0.18em] text-[#173f78]/60">
                      HIDDEN · 영어 받아쓰기 연구실
                    </span>
                  </Link>
                )}
              </div>

              {/* 도감 / 상점 / 코인 */}
              <div className="shrink-0 py-4">
                <div className="flex w-full items-center gap-3 short-screen:gap-2">
                  <button
                    onClick={() => {
                      resumeAudio();
                      playClick();
                      setPhase("collection");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/90 py-3.5 font-display text-lg text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)] backdrop-blur-sm active:scale-[0.98] short-screen:py-3 short-screen:text-sm whitespace-nowrap"
                  >
                    <BookOpen className="size-5 text-[#3d8ef0] short-screen:size-4" />
                    단어 도감
                  </button>
                  <button
                    onClick={() => {
                      resumeAudio();
                      playClick();
                      setPhase("shop");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/90 py-3.5 font-display text-lg text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)] backdrop-blur-sm active:scale-[0.98] short-screen:py-3 short-screen:text-sm whitespace-nowrap"
                  >
                    <ShoppingBag className="size-5 text-[#e84d8a] short-screen:size-4" />
                    스킨 상점
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resumeAudio();
                      playClick();
                      requestRewardedAd(
                        {
                          title: "100코인을 받을까요?",
                          description: "보상형 광고를 끝까지 보면 코인이 바로 지급돼요.",
                          reward: "100코인",
                        },
                        earnCoinsWithAd,
                      );
                    }}
                    disabled={rewardingCoins}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-3.5 font-display text-lg text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)] backdrop-blur-sm active:scale-[0.97] disabled:opacity-60 short-screen:px-3 short-screen:py-3 short-screen:text-sm whitespace-nowrap"
                    aria-label="보상형 광고를 보고 100코인 받기"
                  >
                    <Coins className="size-5 text-[#f0a323] short-screen:size-4" />
                    <span>{rewardingCoins ? "..." : formatCompactNumber(progress.coins)}</span>
                    <span className="rounded-full bg-[#fff2bf] px-1.5 py-0.5 font-ui text-[9px] text-[#b77700]">
                      AD +100
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- 선택한 섬의 구조 지도 ---------- */}
          {phase === "map" && (
            <div className="absolute inset-0 overflow-y-auto bg-sky-start px-5 pb-10 pt-6 text-left">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase(backDestinationForPhase("map"));
                  }}
                  className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]"
                  aria-label="뒤로"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <p className="flex items-center gap-2 font-display text-2xl text-[#173f78]">
                  <MapIcon className="size-6 text-[#3d8ef0]" />
                  구조 지도
                </p>
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 font-display text-base text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]">
                  <Star className="size-4 fill-[#ffc93c] text-[#ffc93c]" />
                  {totalStars}/{TOTAL_LEVELS * 3}
                </span>
              </div>

              <p className="mb-3 text-center font-ui text-xs text-[#173f78]/70">
                {title.emoji} {title.label}
              </p>

              {/* 레벨 그리드 */}
              <>
                <p className="mb-3 text-center font-display text-lg text-[#173f78]">
                  {getTrack(mapTrack).emoji} {getTrack(mapTrack).island}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((lv) => {
                    const record = getRecord(progress, lv, mapTrack);
                    const unlocked = isLevelUnlocked(progress, lv, mapTrack);
                    return (
                      <button
                        key={lv}
                        disabled={!unlocked}
                        onClick={() => {
                          resumeAudio();
                          playClick();
                          beginRound(lv, mapTrack);
                        }}
                        className={`relative flex flex-col items-center gap-1.5 rounded-[1.5rem] px-3 py-5 transition-all ${
                          unlocked
                            ? "bg-white/95 text-[#173f78] shadow-[0_10px_22px_-14px_rgba(23,63,120,0.7)] active:scale-[0.97]"
                            : "bg-white/45 text-[#173f78]/40"
                        }`}
                      >
                        {!unlocked && <Lock className="absolute right-3 top-3 size-4" />}
                        <span className="font-display text-3xl leading-none">Lv.{lv}</span>
                        <span className="flex gap-0.5">
                          {[1, 2, 3].map((s) => (
                            <Star
                              key={s}
                              className={`size-4 ${
                                (record?.stars ?? 0) >= s
                                  ? "fill-[#ffc93c] text-[#ffc93c]"
                                  : "fill-[#173f78]/10 text-[#173f78]/20"
                              }`}
                            />
                          ))}
                        </span>
                        <span className="font-ui text-xs text-[#173f78]/60">
                          {record ? `최고 ${record.best}점` : unlocked ? "도전!" : "잠김"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            </div>
          )}

          {/* ---------- 단어 도감 ---------- */}
          {phase === "collection" && (
            <div className="absolute inset-0 overflow-y-auto bg-sky-start px-5 pb-10 pt-6 text-left">
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase(backDestinationForPhase("collection"));
                  }}
                  className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]"
                  aria-label="뒤로"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <p className="flex items-center gap-2 font-display text-2xl text-[#173f78]">
                  <BookOpen className="size-6 text-[#3d8ef0]" />
                  단어 도감
                </p>
                <span className="rounded-full bg-white/90 px-3 py-2 font-display text-base text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]">
                  {collectedSet.size}
                </span>
              </div>

              {/* 트랙 필터 — 가로 스크롤 */}
              {availableTracks.length > 1 && (
                <div className="mb-4 -mx-5 overflow-x-auto px-5 scrollbar-hide">
                  <div className="flex w-max gap-2">
                    {availableTracks.map((id) => (
                      <button
                        key={id}
                        onClick={() => {
                          resumeAudio();
                          playClick();
                          setColTrack(id);
                          setOpenCollectionLevel(null);
                        }}
                        className={`shrink-0 rounded-full px-4 py-2 font-display text-sm transition-all ${
                          colTrack === id
                            ? "bg-[#3d8ef0] text-white shadow-[0_3px_0_#2a6fd0]"
                            : "bg-white/80 text-[#173f78]/70"
                        }`}
                      >
                        {TRACKS[id].emoji} {TRACKS[id].name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4 rounded-[1.5rem] border border-white/80 bg-white/75 p-4 shadow-[0_8px_20px_-14px_rgba(23,63,120,0.45)] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base text-[#173f78]">
                      {TRACKS[colTrack].emoji} {TRACKS[colTrack].name}
                    </p>
                    <p className="mt-0.5 font-ui text-xs text-[#173f78]/55">
                      {archiveDescriptors.length === 0
                        ? "추가 보관함 · 준비중"
                        : `추가 보관함 ${archiveAvailableWords}단어 · Set ${archiveDescriptors.length}개`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resumeAudio();
                      playClick();
                      if (pendingArchive) {
                        void receiveNextArchiveSet();
                        return;
                      }
                      if (nextArchive) {
                        requestRewardedAd(
                          {
                            title: `Set ${nextArchive.setId}을 받을까요?`,
                            description: "보상형 광고를 끝까지 보면 추가 단어 Set이 잠금 해제돼요.",
                            reward: `${nextArchive.title} · ${nextArchive.wordCount}단어`,
                          },
                          receiveNextArchiveSet,
                        );
                      }
                    }}
                    disabled={archiveBusy || !nextArchive}
                    className="shrink-0 rounded-full bg-gradient-to-b from-[#55a8ff] to-[#3d8ef0] px-4 py-2.5 font-display text-xs text-white shadow-[0_4px_0_#2a6fd0] active:translate-y-0.5"
                  >
                    {archiveBusy
                      ? "받는 중..."
                      : !nextArchive
                        ? archiveDescriptors.length === 0
                          ? "준비중"
                          : "모두 받음"
                        : pendingArchive
                          ? `Set ${nextArchive.setId} 다시 받기`
                          : `광고 보고 Set ${nextArchive.setId} 받기`}
                  </button>
                </div>
                <p className="mt-3 font-ui text-[11px] leading-4 text-[#173f78]/50">
                  기본 단어는 그대로 유지됩니다. 추가 Set은 광고 보상으로 잠금 해제한 뒤 이 기기에
                  저장되며, 다운로드가 실패해도 광고를 다시 볼 필요가 없습니다.
                </p>
                {archiveDescriptors.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {archiveDescriptors.map((set) => {
                      const downloaded = archiveDownloaded.includes(set.setId);
                      const unlocked = archiveUnlocked.includes(set.setId);
                      return (
                        <span
                          key={set.setId}
                          className={`rounded-full px-2.5 py-1 font-ui text-[11px] ${
                            downloaded
                              ? "bg-emerald-100 text-emerald-700"
                              : unlocked
                                ? "bg-amber-100 text-amber-700"
                                : "bg-[#173f78]/5 text-[#173f78]/45"
                          }`}
                        >
                          Set {set.setId} · {downloaded ? "저장됨" : unlocked ? "재시도" : "잠김"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {archiveWords.length > 0 && (
                <section className="mb-4 rounded-3xl bg-white/90 p-4 backdrop-blur-sm">
                  <h3 className="font-display text-base text-[#173f78]">추가로 받은 단어</h3>
                  <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                    {archiveWords.map((word) => (
                      <span
                        key={word.word}
                        className="rounded-full bg-emerald-50 px-2.5 py-1 font-ui text-xs text-emerald-800"
                      >
                        {word.word} · {word.meaning}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex flex-col gap-3">
                {collectionByLevel.map(({ level: lv, words, owned }) => {
                  const open = openCollectionLevel === lv;
                  return (
                    <section key={lv} className="rounded-3xl bg-white/90 p-4 backdrop-blur-sm">
                      <button
                        onClick={() => {
                          resumeAudio();
                          playClick();
                          setOpenCollectionLevel(open ? null : lv);
                        }}
                        className="flex w-full items-center justify-between"
                      >
                        <h3 className="font-display text-xl text-[#173f78]">Lv.{lv}</h3>
                        <div className="flex items-center gap-2">
                          <span className="font-ui text-xs text-[#173f78]/60">
                            {owned}/{words.length} 수집
                          </span>
                          <span
                            className={`flex size-7 items-center justify-center rounded-full bg-[#eaf3ff] transition-transform ${open ? "rotate-180" : ""}`}
                          >
                            <ChevronDown className="size-4 text-[#3d8ef0]" />
                          </span>
                        </div>
                      </button>
                      {open && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {owned === 0 && (
                            <p className="font-ui text-xs text-[#173f78]/45">
                              아직 만난 단어가 없어요. Lv.{lv}에서 친구를 구해보세요!
                            </p>
                          )}
                          {words
                            .filter((w) => collectedSet.has(w.word))
                            .map((w) => (
                              <span
                                key={w.word}
                                className="rounded-full bg-[#e6f1ff] px-2.5 py-1 font-ui text-xs text-[#173f78]"
                              >
                                {w.word} · {w.meaning}
                              </span>
                            ))}
                          {owned > 0 && owned < words.length && (
                            <span className="rounded-full bg-[#173f78]/5 px-2.5 py-1 font-ui text-xs text-[#173f78]/40">
                              ??? +{words.length - owned}
                            </span>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------- 스킨 상점 ---------- */}
          {phase === "shop" && (
            <div className="absolute inset-0 z-30 flex flex-col bg-sky-start px-5 pb-6 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase(backDestinationForPhase("shop"));
                  }}
                  className="flex size-11 items-center justify-center rounded-full bg-white/90 text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]"
                  aria-label="뒤로"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <p className="flex items-center gap-2 font-display text-2xl text-[#173f78]">
                  <ShoppingBag className="size-6 text-[#e84d8a]" />
                  스킨 상점
                </p>
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 font-display text-base text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)]">
                  <Coins className="size-4 text-[#f0a323]" />
                  {progress.coins.toLocaleString("ko-KR")}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/55 p-1.5">
                <button
                  type="button"
                  onClick={() => setShopTab("parachute")}
                  className={`rounded-xl py-2 font-display text-sm ${
                    shopTab === "parachute" ? "bg-[#3d8ef0] text-white" : "text-[#173f78]/60"
                  }`}
                >
                  낙하산 스킨
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShopTab("jelly");
                    setShopJellyCategory(null);
                    setShopJellyPreviewId(null);
                  }}
                  className={`rounded-xl py-2 font-display text-sm ${
                    shopTab === "jelly" ? "bg-[#e84d8a] text-white" : "text-[#173f78]/60"
                  }`}
                >
                  젤리 스킨
                </button>
              </div>

              <div className="mb-4 overflow-hidden rounded-3xl bg-white/90 shadow-[0_8px_20px_-12px_rgba(23,63,120,0.45)] short-screen:mb-3">
                {shopTab === "parachute" ? (
                  <ShopSkinPreview
                    skin={getSkin(shopPreviewId ?? progress.equippedSkin)}
                    jelly={equippedJelly}
                  />
                ) : shopJellyCategory ? (
                  <ShopJellyGridPreview
                    jellies={SPECIAL_JELLIES.filter(
                      (jelly) => jelly.category === shopJellyCategory,
                    )}
                    selectedId={shopJellyPreviewId ?? progress.equippedJelly}
                    onSelect={(jelly) => {
                      playClick();
                      setShopJellyPreviewId(jelly.id);
                    }}
                    title={JELLY_CATEGORY_LABELS[shopJellyCategory]}
                  />
                ) : (
                  <ShopJellySinglePreview
                    jelly={getSpecialJelly(shopJellyPreviewId ?? progress.equippedJelly)}
                    equipped={
                      (shopJellyPreviewId ?? progress.equippedJelly) === progress.equippedJelly
                    }
                  />
                )}
              </div>

              <div
                key={`${shopTab}-${shopJellyCategory ?? "categories"}`}
                className="flex-1 space-y-3 overflow-y-auto px-1"
              >
                {shopTab === "parachute"
                  ? SKINS.map((skin) => {
                      const actuallyOwned = isSkinOwned(progress.ownedSkins, skin.id);
                      const owned = testUnlockSkins || actuallyOwned;
                      const equipped = progress.equippedSkin === skin.id;
                      const canBuy = progress.coins >= skin.price;
                      const isPreview = (shopPreviewId ?? progress.equippedSkin) === skin.id;
                      return (
                        <button
                          key={skin.id}
                          onClick={() => {
                            playClick();
                            setShopPreviewId(skin.id);
                          }}
                          className={`flex w-full items-center gap-4 rounded-3xl bg-white/95 p-4 text-left shadow-[0_8px_20px_-12px_rgba(23,63,120,0.45)] backdrop-blur-sm transition-all ${
                            equipped
                              ? "ring-2 ring-[#3d8ef0]"
                              : isPreview
                                ? "ring-2 ring-[#f0a323]"
                                : ""
                          }`}
                        >
                          <div className="shrink-0 rounded-2xl bg-[#eaf3ff] p-2">
                            <SkinShopPreview skin={skin} size={64} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg text-[#173f78]">{skin.name}</p>
                            <p className="font-ui text-xs text-[#173f78]/60">
                              {skin.id === DEFAULT_SKIN_ID
                                ? "기본 스킨"
                                : equipped
                                  ? "현재 장착 중"
                                  : owned
                                    ? testUnlockSkins && !actuallyOwned
                                      ? "테스트 해금"
                                      : "보유 중"
                                    : `${skin.price.toLocaleString("ko-KR")} 코인`}
                            </p>
                            <p className="mt-0.5 truncate font-ui text-[11px] text-[#3d8ef0]">
                              {skin.effectLabel}
                            </p>
                          </div>
                          {equipped ? (
                            <span className="flex min-w-[72px] shrink-0 items-center justify-center gap-1 rounded-full bg-[#3d8ef0]/10 px-3 py-2 font-display text-sm text-[#3d8ef0]">
                              <Check className="size-4" /> 장착
                            </span>
                          ) : owned ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                equipSkin(skin.id);
                              }}
                              className="flex min-w-[72px] shrink-0 items-center justify-center rounded-full bg-[#3d8ef0] px-4 py-2 font-display text-sm text-white shadow-[0_4px_0_#2a6fd0] active:translate-y-0.5"
                            >
                              장착
                            </span>
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                buySkin(skin.id);
                              }}
                              className={`flex min-w-[72px] shrink-0 items-center justify-center rounded-full px-4 py-2 font-display text-sm active:translate-y-0.5 ${
                                canBuy
                                  ? "bg-[#f0a323] text-white shadow-[0_4px_0_#d48a1a]"
                                  : "bg-[#173f78]/10 text-[#173f78]/40"
                              }`}
                            >
                              구매
                            </span>
                          )}
                        </button>
                      );
                    })
                  : JELLY_CATEGORY_ORDER.map((category) => {
                      const categoryJellies = SPECIAL_JELLIES.filter(
                        (jelly) => jelly.category === category,
                      );
                      const representative =
                        categoryJellies.find(
                          (jelly) => jelly.color === JELLY_REPRESENTATIVE_COLORS[category],
                        ) ?? categoryJellies[0]!;
                      const previewedInCategory = categoryJellies.find(
                        (jelly) => jelly.id === shopJellyPreviewId,
                      );
                      const equippedInCategory = categoryJellies.find(
                        (jelly) => jelly.id === progress.equippedJelly,
                      );
                      const selectedJelly =
                        previewedInCategory ?? equippedInCategory ?? representative;
                      const actuallyOwned = isJellyOwned(progress.ownedJellies, selectedJelly.id);
                      const owned = testUnlockSkins || actuallyOwned;
                      const equipped = progress.equippedJelly === selectedJelly.id;
                      const canBuy = progress.coins >= selectedJelly.price;

                      const activatePreview = () => {
                        setShopJellyCategory(category);
                        setShopJellyPreviewId(selectedJelly.id);
                      };

                      return (
                        <section
                          key={category}
                          className={`rounded-3xl bg-white/95 p-3 shadow-[0_8px_20px_-12px_rgba(23,63,120,0.45)] ${
                            shopJellyCategory === category ? "ring-2 ring-[#e84d8a]" : ""
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 px-1">
                            <div>
                              <p className="font-display text-lg text-[#173f78]">
                                {JELLY_CATEGORY_LABELS[category]}
                              </p>
                              <p className="font-ui text-xs text-[#173f78]/55">
                                {categoryJellies.length}가지 색상 ·{" "}
                                {category === "default"
                                  ? "무료"
                                  : `${representative.price.toLocaleString("ko-KR")} 코인`}
                              </p>
                            </div>
                            {equipped && (
                              <span className="flex items-center gap-1 rounded-full bg-[#e84d8a]/10 px-3 py-1.5 font-display text-xs text-[#e84d8a]">
                                <Check className="size-3.5" /> 장착 중
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-8 gap-1.5">
                            {categoryJellies.map((jelly) => {
                              const selected = selectedJelly.id === jelly.id;
                              return (
                                <button
                                  type="button"
                                  key={jelly.id}
                                  onClick={() => {
                                    playClick();
                                    setShopJellyCategory(category);
                                    setShopJellyPreviewId(jelly.id);
                                  }}
                                  aria-label={`${jelly.name} 미리보기`}
                                  className={`flex aspect-square min-w-0 items-center justify-center overflow-hidden rounded-xl bg-[#eaf3ff] p-0.5 ${
                                    selected ? "ring-2 ring-[#e84d8a]" : "ring-1 ring-white"
                                  }`}
                                >
                                  {getJellyThumbnail(jelly) ? (
                                    <img
                                      src={getJellyThumbnail(jelly)}
                                      alt=""
                                      className="size-full object-contain"
                                    />
                                  ) : (
                                    <DefaultJellyVisual
                                      className="size-8"
                                      hue={jelly.hue}
                                      rainbow={jelly.rainbow}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              activatePreview();
                              if (equipped) return;
                              if (owned) equipJelly(selectedJelly.id);
                              else if (canBuy) buyJelly(selectedJelly.id);
                              else {
                                showShopToast("코인이 부족해요");
                                requestRewardedAd(
                                  {
                                    title: "코인이 부족해요",
                                    description: "보상형 광고를 보고 100코인을 모으시겠어요?",
                                    reward: "100코인",
                                  },
                                  earnCoinsWithAd,
                                );
                              }
                            }}
                            className={`mt-3 flex w-full items-center justify-center rounded-full py-2.5 font-display text-sm active:translate-y-0.5 ${
                              equipped
                                ? "bg-[#e84d8a]/10 text-[#e84d8a]"
                                : owned
                                  ? "bg-[#e84d8a] text-white shadow-[0_4px_0_#c43e72]"
                                  : canBuy
                                    ? "bg-[#f0a323] text-white shadow-[0_4px_0_#d48a1a]"
                                    : "bg-[#173f78]/10 text-[#173f78]/55"
                            }`}
                          >
                            {JELLY_CATEGORY_LABELS[category]}{" "}
                            {equipped ? "장착 중" : owned ? "장착" : "구매"}
                          </button>
                        </section>
                      );
                    })}
              </div>

              {shopToast && (
                <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
                  <span className="animate-pop rounded-full bg-card px-4 py-2 font-display text-base shadow-soft">
                    {shopToast}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ---------- 결과 화면 ---------- */}
          {phase === "over" && result && (
            <div className="absolute inset-0 overflow-y-auto bg-sky-start px-5 pb-8 pt-8">
              <p className="text-center font-display text-3xl text-[#173f78]">
                {result.cleared ? `Lv.${result.level} 클리어!` : "라운드 종료"}
              </p>
              <p className="mt-1 text-center font-ui text-xs text-[#173f78]/60">
                {getTrack(result.track).emoji} {getTrack(result.track).island}
              </p>

              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`size-12 transition-transform ${
                      result.stars >= s
                        ? "animate-pop fill-[#ffc93c] text-[#ffc93c] drop-shadow-[0_6px_10px_rgba(240,163,35,0.45)]"
                        : "fill-white/70 text-[#173f78]/20"
                    }`}
                  />
                ))}
              </div>

              <p className="mt-4 text-center font-display text-6xl tabular-nums text-[#173f78]">
                {result.score}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { v: `${result.accuracy}%`, l: "정확도" },
                  { v: result.bestCombo, l: "최고 콤보" },
                  { v: result.rescued, l: "구조한 친구" },
                ].map((it) => (
                  <div key={it.l} className="rounded-2xl bg-white/90 py-3 backdrop-blur-sm">
                    <p className="font-display text-xl tabular-nums text-[#173f78]">{it.v}</p>
                    <p className="font-ui text-xs text-[#173f78]/60">{it.l}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/90 py-3 font-display text-xl text-[#173f78] backdrop-blur-sm">
                <Coins className="size-6 text-[#f0a323]" />+{formatCompactNumber(result.coins)} 코인
                <span className="font-ui text-xs text-[#173f78]/60">
                  (보유 {formatCompactNumber(progress.coins)})
                </span>
              </div>

              {result.words.length > 0 && (
                <section className="mt-4 rounded-3xl bg-white/90 p-4 backdrop-blur-sm">
                  <h3 className="mb-2 font-display text-lg text-[#173f78]">
                    이번에 구조한 단어 {result.words.length}개
                  </h3>
                  <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                    {result.words.map((w) => (
                      <li
                        key={w.word}
                        className="flex items-baseline justify-between gap-2 rounded-xl bg-[#e6f1ff] px-3 py-1.5"
                      >
                        <span className="font-display text-base text-[#173f78]">{w.word}</span>
                        <span className="font-ui text-xs text-[#173f78]/70">
                          {w.ipa} · {w.meaning}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase("map");
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/95 py-4 font-display text-lg text-[#173f78] shadow-[0_6px_16px_-8px_rgba(23,63,120,0.5)] active:scale-[0.98]"
                >
                  <MapIcon className="size-5" /> 지도로
                </button>
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    beginRound(result.level, result.track);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#3d8ef0] py-4 font-display text-lg text-white shadow-[0_6px_0_#2a6fd0] active:translate-y-0.5"
                >
                  <RotateCcw className="size-5" /> 다시 하기
                </button>
              </div>
              {result.cleared && result.level < TOTAL_LEVELS && (
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    beginRound(result.level + 1, result.track);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#173f78] py-4 font-display text-lg text-white shadow-[0_6px_0_#0d2d5e] active:translate-y-0.5"
                >
                  <Play className="size-5 fill-white" /> 다음 레벨 (Lv.{result.level + 1})
                </button>
              )}
              {/* 전문 구조대 자격증 — 기초 트랙 Lv.10 완파 */}
              {result.cleared && result.track === "basic" && result.level === TOTAL_LEVELS && (
                <button
                  onClick={() => {
                    resumeAudio();
                    playClick();
                    setPhase("island");
                  }}
                  className="mt-3 flex w-full flex-col items-center gap-0.5 rounded-[1.5rem] bg-gradient-to-br from-[#ffe9a8] to-[#ffc93c] py-4 font-display text-lg text-[#173f78] shadow-[0_8px_0_#e0a417] active:translate-y-0.5"
                >
                  🎉 기초 구조대 완주!
                  <span className="font-ui text-xs text-[#173f78]/70">
                    새로운 섬을 선택해 계속 모험해 보세요
                  </span>
                </button>
              )}
              <p className="mt-3 text-center font-ui text-xs text-[#173f78]/60">
                {title.emoji} {title.label} · Best {best}
              </p>
            </div>
          )}
        </div>
      )}

      {rewardAdConfirmation && (
        <div
          className="absolute inset-0 z-[120] flex items-center justify-center bg-[#102d5e]/45 px-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-ad-title"
        >
          <div className="w-full max-w-sm rounded-[2rem] border border-white/80 bg-gradient-to-b from-white to-[#eef7ff] p-5 text-center shadow-[0_24px_60px_-18px_rgba(13,45,94,0.65)]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1ae] to-[#ffc93c] text-[#173f78] shadow-[0_6px_0_#e0a417]">
              <Play className="ml-1 size-7 fill-current" />
            </div>
            <h2 id="reward-ad-title" className="mt-5 font-display text-2xl text-[#173f78]">
              {rewardAdConfirmation.title}
            </h2>
            <p className="mx-auto mt-2 max-w-xs font-ui text-sm leading-5 text-[#3f6699]">
              {rewardAdConfirmation.description}
            </p>
            <div className="mt-4 rounded-2xl bg-[#e4f2ff] px-4 py-3 font-display text-sm text-[#2469b5]">
              🎁 보상 · {rewardAdConfirmation.reward}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  cancelRewardedAd();
                }}
                className="rounded-full bg-white py-3.5 font-display text-base text-[#55749b] shadow-[0_4px_14px_-8px_rgba(23,63,120,0.45)] active:scale-[0.98]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  confirmRewardedAd();
                }}
                className="rounded-full bg-[#3d8ef0] py-3.5 font-display text-base text-white shadow-[0_5px_0_#2a6fd0] active:translate-y-0.5"
              >
                광고 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultJellyVisual({
  className = "size-20",
  hue = 145,
  rainbow = false,
}: {
  className?: string;
  hue?: number;
  rainbow?: boolean;
}) {
  const bodyBackground = rainbow
    ? "linear-gradient(135deg, #ff6b8b 4%, #ffbf3f 22%, #c9ed49 39%, #55dbad 55%, #55bdf3 72%, #9d6bef 88%, #ef6fc6 100%)"
    : `radial-gradient(circle at 35% 30%, oklch(0.95 0.09 ${hue}), oklch(0.72 0.17 ${hue}))`;
  const earBackground = rainbow
    ? "linear-gradient(135deg, #ff7b94, #65c8f2, #a172ef)"
    : `oklch(0.82 0.15 ${hue})`;

  return (
    <div
      className={`relative flex items-center justify-center rounded-[45%] shadow-soft ${className}`}
      style={{
        background: bodyBackground,
      }}
    >
      <span
        className="absolute -top-1.5 left-[22%] size-[22%] rounded-full"
        style={{ background: earBackground }}
      />
      <span
        className="absolute -top-1.5 right-[22%] size-[22%] rounded-full"
        style={{ background: earBackground }}
      />
      <span className="absolute left-[27%] top-[38%] size-[14%] rounded-full bg-foreground/70">
        <span className="absolute right-0 top-0 size-[35%] rounded-full bg-card" />
      </span>
      <span className="absolute right-[27%] top-[38%] size-[14%] rounded-full bg-foreground/70">
        <span className="absolute right-0 top-0 size-[35%] rounded-full bg-card" />
      </span>
      <span className="absolute bottom-[20%] h-[13%] w-[25%] rounded-b-full bg-foreground/70" />
    </div>
  );
}

function ShopJellyGridPreview({
  jellies,
  selectedId,
  onSelect,
  title,
}: {
  jellies: SpecialJelly[];
  selectedId: string;
  onSelect: (jelly: SpecialJelly) => void;
  title: string;
}) {
  return (
    <div className="w-full px-4 py-3 short-screen:py-2">
      <p className="mb-2 text-center font-display text-sm text-[#173f78]">{title}</p>
      <div className="grid grid-cols-4 gap-2">
        {jellies.slice(0, 8).map((jelly) => {
          const selected = selectedId === jelly.id;
          return (
            <button
              type="button"
              key={jelly.id}
              onClick={() => onSelect(jelly)}
              aria-label={`${jelly.name} 미리보기`}
              className={`flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#eaf3ff] p-1 transition-all ${
                selected ? "ring-2 ring-[#e84d8a]" : "ring-1 ring-white"
              }`}
            >
              {getJellyThumbnail(jelly) ? (
                <img
                  src={getJellyThumbnail(jelly)}
                  alt=""
                  className="size-full object-contain drop-shadow-sm"
                />
              ) : (
                <DefaultJellyVisual className="size-10" hue={jelly.hue} rainbow={jelly.rainbow} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
