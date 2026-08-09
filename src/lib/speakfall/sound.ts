/**
 * SpeakFall sound FX — lightweight Web Audio synth.
 * No external assets required; works offline after first user gesture.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    const newCtx = new Ctx();
    const gain = newCtx.createGain();
    gain.gain.value = 0.35;
    gain.connect(newCtx.destination);
    ctx = newCtx;
    master = gain;
  }
  return ctx;
}

export function resumeAudio(): void {
  const c = getCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

export function isSoundEnabled(): boolean {
  return enabled;
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
  if (!c || !m || !enabled) return;

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
  if (!c || !m || !enabled) return;
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
  if (!c || !enabled) return;
  tone(880, 0.12, "sine", 0.9, 1320);
  window.setTimeout(() => tone(1320, 0.18, "sine", 0.7, 1760), 80);
  window.setTimeout(() => chord([1760, 2217], 0.35, "triangle"), 180);
}

/** Miss / 경고: 낮고 짧은 추락음 */
export function playMiss(): void {
  if (!enabled) return;
  tone(280, 0.18, "sawtooth", 0.35, 140);
}

/** 위험 한계선 근접: 짧은 경고 비프 (반복은 호출부에서) */
export function playHazardBeep(): void {
  if (!enabled) return;
  tone(620, 0.08, "square", 0.22, 520);
}

/** 카운트다운: 짧은 딸깍 */
export function playTick(): void {
  if (!enabled) return;
  tone(1200, 0.06, "sine", 0.35, 900);
}

/** 카운트다운 완료 / 게임 시작: 밝은 "띵" */
export function playStart(): void {
  if (!enabled) return;
  chord([523.25, 659.25, 783.99], 0.35, "triangle");
}

/** 레벨 클리어: 짧은 팡파레 */
export function playLevelUp(): void {
  if (!enabled) return;
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
  if (!enabled) return;
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
  if (!enabled) return;
  tone(987.77, 0.08, "sine", 0.45, 1318.51);
  window.setTimeout(() => tone(1318.51, 0.14, "sine", 0.35, 1975.53), 60);
}

/** UI 토글 / 버튼 클릭: 작은 클릭음 */
export function playClick(): void {
  if (!enabled) return;
  tone(800, 0.05, "sine", 0.18, 600);
}
