/**
 * SpeakFall sound FX — lightweight Web Audio synth.
 * No external assets required; works offline after first user gesture.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let soundEffectsEnabled = true;
let backgroundMusicEnabled = true;
let backgroundMusicVolume = 0.16;
let soundEffectsVolume = 0.35;

export type BackgroundMusicTrack = "main" | "game" | "result";

const BACKGROUND_MUSIC_URLS: Record<BackgroundMusicTrack, string> = {
  main: "/audio/bgm/main-theme.mp3",
  game: "/audio/bgm/game-theme.mp3",
  result: "/audio/bgm/result-theme.mp3",
};

let backgroundMusic: HTMLAudioElement | null = null;
let backgroundMusicTrack: BackgroundMusicTrack | null = null;
let requestedBackgroundMusicTrack: BackgroundMusicTrack | null = null;

function syncBackgroundMusic(): void {
  if (typeof window === "undefined") return;

  if (!requestedBackgroundMusicTrack) {
    backgroundMusic?.pause();
    return;
  }

  if (!backgroundMusic || backgroundMusicTrack !== requestedBackgroundMusicTrack) {
    backgroundMusic?.pause();
    backgroundMusic = new Audio(BACKGROUND_MUSIC_URLS[requestedBackgroundMusicTrack]);
    backgroundMusic.loop = true;
    backgroundMusic.preload = "auto";
    backgroundMusic.volume = backgroundMusicVolume;
    backgroundMusicTrack = requestedBackgroundMusicTrack;
  }

  if (!backgroundMusicEnabled) {
    backgroundMusic.pause();
    return;
  }

  if (!backgroundMusic.paused) return;

  void backgroundMusic.play().catch(() => {
    // 모바일 브라우저는 첫 사용자 동작 전 재생을 차단할 수 있습니다.
  });
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const newCtx = new Ctx();
    const gain = newCtx.createGain();
    gain.gain.value = soundEffectsVolume;
    gain.connect(newCtx.destination);
    ctx = newCtx;
    master = gain;
  }
  return ctx;
}

export function resumeAudio(): void {
  const c = getCtx();

  if (c && c.state === "suspended") {
    void c.resume().catch(() => {});
  }
}

export function setSoundEffectsEnabled(value: boolean): void {
  soundEffectsEnabled = value;
}

export function isSoundEffectsEnabled(): boolean {
  return soundEffectsEnabled;
}

export function setBackgroundMusicEnabled(value: boolean): void {
  backgroundMusicEnabled = value;
  syncBackgroundMusic();
}

export function setBackgroundMusicVolume(value: number): void {
  backgroundMusicVolume = Math.max(0, Math.min(1, value));
  if (backgroundMusic) backgroundMusic.volume = backgroundMusicVolume;
}

export function setSoundEffectsVolume(value: number): void {
  soundEffectsVolume = Math.max(0, Math.min(1, value));
  if (master) master.gain.value = soundEffectsVolume;
}

export function setBackgroundMusic(track: BackgroundMusicTrack | null): void {
  requestedBackgroundMusicTrack = track;
  syncBackgroundMusic();
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 1,
  slideTo?: number,
): void {
  const c = getCtx();
  const m = master;
  if (!c || !m || !soundEffectsEnabled) return;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + duration);
  }
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(m);
  osc.start();
  osc.stop(c.currentTime + duration + 0.05);
}

function chord(freqs: number[], duration: number, type: OscillatorType = "triangle"): void {
  const c = getCtx();
  const m = master;
  if (!c || !m || !soundEffectsEnabled) return;
  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const attack = 0.03;
    const release = duration * 0.6;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.25, c.currentTime + attack + i * 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + attack + release);
    osc.connect(g);
    g.connect(m);
    osc.start();
    osc.stop(c.currentTime + duration + 0.1);
  });
}

/** 구출 성공: "팝!" + 낙하산 펼침 느낌의 경쾌한 상승음 */
export function playRescue(): void {
  const c = getCtx();
  if (!c || !soundEffectsEnabled) return;
  tone(880, 0.12, "sine", 0.9, 1320);
  window.setTimeout(() => tone(1320, 0.18, "sine", 0.7, 1760), 80);
  window.setTimeout(() => chord([1760, 2217], 0.35, "triangle"), 180);
}

/** Miss / 경고: 낮고 짧은 추락음 */
export function playMiss(): void {
  if (!soundEffectsEnabled) return;
  tone(280, 0.18, "sawtooth", 0.35, 140);
}

/** 위험 한계선 근접: 짧은 경고 비프 (반복은 호출부에서) */
export function playHazardBeep(): void {
  if (!soundEffectsEnabled) return;
  tone(620, 0.08, "square", 0.22, 520);
}

/** 카운트다운: 짧은 딸깍 */
export function playTick(): void {
  if (!soundEffectsEnabled) return;
  tone(1200, 0.06, "sine", 0.35, 900);
}

/** 카운트다운 완료 / 게임 시작: 밝은 "띵" */
export function playStart(): void {
  if (!soundEffectsEnabled) return;
  chord([523.25, 659.25, 783.99], 0.35, "triangle");
}

/** 레벨 클리어: 짧은 팡파레 */
export function playLevelUp(): void {
  if (!soundEffectsEnabled) return;
  const c = getCtx();
  const m = master;
  if (!c || !m) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.04 + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35 + i * 0.12);
    osc.connect(g);
    g.connect(m);
    osc.start(c.currentTime + i * 0.12);
    osc.stop(c.currentTime + i * 0.12 + 0.45);
  });
}

/** 라운드 실패: 슬픈 하강음 */
export function playGameOver(): void {
  if (!soundEffectsEnabled) return;
  const c = getCtx();
  const m = master;
  if (!c || !m) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(349.23, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(146.83, c.currentTime + 0.9);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.linearRampToValueAtTime(0.35, c.currentTime + 0.1);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.1);
  osc.connect(g);
  g.connect(m);
  osc.start();
  osc.stop(c.currentTime + 1.2);
}

/** 코인 획득: 반짝이는 짧은 상승음 */
export function playCoin(): void {
  if (!soundEffectsEnabled) return;
  tone(987.77, 0.08, "sine", 0.45, 1318.51);
  window.setTimeout(() => tone(1318.51, 0.14, "sine", 0.35, 1975.53), 60);
}

/** UI 토글 / 버튼 클릭: 작은 클릭음 */
export function playClick(): void {
  if (!soundEffectsEnabled) return;
  tone(800, 0.05, "sine", 0.18, 600);
}

/** Handles visibility change events for the document **/
function handleVisibilityChange(): void {
  if (typeof document === "undefined") return;

  if (document.visibilityState === "hidden") {
    backgroundMusic?.pause();
    return;
  }

  if (
    document.visibilityState === "visible" &&
    backgroundMusicEnabled &&
    requestedBackgroundMusicTrack
  ) {
    syncBackgroundMusic();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
}
