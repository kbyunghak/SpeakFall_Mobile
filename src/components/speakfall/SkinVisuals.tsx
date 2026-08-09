import type { Skin } from "@/lib/speakfall/skins";

/** 스킨 모양별 캐노피(낙하산/우산/꽃/풍선) */
export function SkinCanopy({ skin, saved }: { skin: Skin; saved?: boolean }) {
  const w = saved ? 132 : 116;
  const h = saved ? 92 : 82;
  const lid = `cpL-${skin.id}`;
  const did = `cpD-${skin.id}`;

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 120 76"
      className={`transition-all duration-500 ${skin.rainbow ? "rainbow-glow" : ""}`}
      style={{ filter: `drop-shadow(0 8px 12px ${skin.preview}55)` }}
      aria-hidden
    >
      <defs>
        <linearGradient id={lid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin.canopy[0]} />
          <stop offset="100%" stopColor={skin.canopy[1]} />
        </linearGradient>
        <linearGradient id={did} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin.canopy[1]} />
          <stop offset="100%" stopColor={skin.accent} />
        </linearGradient>
      </defs>

      {skin.shape === "flower" ? (
        <>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const a = -Math.PI + (Math.PI * i) / 6;
            const cx = 60 + Math.cos(a) * 44;
            const cy = 42 + Math.sin(a) * 26;
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx="17"
                ry="14"
                fill={i % 2 === 0 ? `url(#${lid})` : `url(#${did})`}
                opacity="0.95"
              />
            );
          })}
          <circle cx="60" cy="34" r="11" fill={skin.accent} opacity="0.9" />
          <circle cx="60" cy="34" r="5" fill="#fff8d6" />
        </>
      ) : skin.shape === "balloon" ? (
        <>
          <ellipse cx="60" cy="30" rx="40" ry="32" fill={`url(#${lid})`} />
          <ellipse cx="46" cy="20" rx="11" ry="8" fill="#ffffff" opacity="0.55" />
          <path d="M54 60h12l-6 8Z" fill={skin.accent} />
        </>
      ) : skin.shape === "umbrella" ? (
        <>
          {skin.rainbow && (
            <g className="rainbow-arc">
              {(
                [
                  ["#ffb3ba", 58],
                  ["#ffdfba", 51],
                  ["#ffffba", 44],
                  ["#baffc9", 37],
                  ["#bae1ff", 30],
                ] as [string, number][]
              ).map(([color, r], i) => (
                <path
                  key={i}
                  d={`M${60 - r} 58 a${r} ${r} 0 0 1 ${r * 2} 0`}
                  fill="none"
                  stroke={color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.75"
                />
              ))}
            </g>
          )}

          {skin.rainbow && skin.canopy.length >= 7
            ? [0, 1, 2, 3, 4, 5, 6].map((i) => {
                const x0 = 4 + i * 16;
                const x1 = x0 + 16;
                const mid = (x0 + x1) / 2;
                return (
                  <path
                    key={i}
                    d={`M60 18 L${x0} 52 Q${mid} 58 ${x1} 52 Z`}
                    fill={skin.canopy[i]}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                );
              })
            : [0, 1, 2, 3, 4, 5].map((i) => {
                const x0 = 6 + i * 18;
                const x1 = x0 + 18;
                return (
                  <path
                    key={i}
                    d={`M60 4 Q${(x0 + x1) / 2} 14 ${x0} 46 Q${(x0 + x1) / 2} 56 ${x1} 46 Z`}
                    fill={i % 2 === 0 ? `url(#${lid})` : `url(#${did})`}
                  />
                );
              })}
          <circle cx="60" cy="18" r="3.5" fill={skin.accent} />
          <path d="M60 20v34" stroke={skin.accent} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <line x1="48" y1="53" x2="43.5" y2="74" stroke="oklch(0.4 0.03 260 / 0.45)" strokeWidth="1" />
          <line x1="72" y1="53" x2="76.5" y2="74" stroke="oklch(0.4 0.03 260 / 0.45)" strokeWidth="1" />
          <circle cx="43.5" cy="75" r="2.4" fill={skin.accent} opacity="0.85" />
          <circle cx="76.5" cy="75" r="2.4" fill={skin.accent} opacity="0.85" />
        </>
      ) : (
        <>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x0 = 6 + i * 18;
            const x1 = x0 + 18;
            return (
              <path
                key={i}
                d={`M60 3 L${x0} 45 Q${(x0 + x1) / 2} 55 ${x1} 45 Z`}
                fill={i % 2 === 0 ? `url(#${lid})` : `url(#${did})`}
              />
            );
          })}
          <path
            d="M6 45 Q15 55 24 45 Q33 55 42 45 Q51 55 60 45 Q69 55 78 45 Q87 55 96 45 Q105 55 114 45"
            fill="none"
            stroke={skin.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        </>
      )}

      {/* strings — 젤리의 양쪽 귀에 모여서 붙습니다 (우산은 손잡이라 줄이 없습니다) */}
      {skin.shape !== "umbrella" &&
        (skin.shape === "balloon" ? [46, 60, 74] : [6, 24, 42, 60, 78, 96, 114]).map((x) => (
          <line
            key={x}
            x1={x}
            y1={skin.shape === "balloon" ? 60 : x === 60 ? 50 : 47}
            x2={x <= 60 ? 43.5 : 76.5}
            y2={76}
            stroke="oklch(0.4 0.03 260 / 0.45)"
            strokeWidth="1"
          />
        ))}
      {/* 귀 연결부 매듭 */}
      {skin.shape !== "umbrella" && (
        <>
          <circle cx="43.5" cy="75" r="2.4" fill={skin.accent} opacity="0.85" />
          <circle cx="76.5" cy="75" r="2.4" fill={skin.accent} opacity="0.85" />
        </>
      )}

    </svg>
  );
}

const RAIN = [-46, -30, -14, 6, 22, 40, 52];
const PETALS = [-52, -34, -18, 4, 20, 38, 54];

/** 스킨별 낙하 중 특수 효과 레이어 */
export function SkinEffects({ skin }: { skin: Skin }) {
  if (skin.effect === "none") return null;

  if (skin.effect === "rain") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-0" aria-hidden>
        {/* 무지개 */}
        <svg
          width="180"
          height="96"
          viewBox="0 0 180 96"
          className="absolute -left-[90px] -top-8 opacity-70"
        >
          {["#ff6b6b", "#ffb03c", "#ffe14d", "#6bcf7f", "#4d96ff", "#9b59b6"].map((c, i) => (
            <path
              key={c}
              d={`M${16 + i * 7} 92 a${74 - i * 7} ${74 - i * 7} 0 0 1 ${(74 - i * 7) * 2} 0`}
              fill="none"
              stroke={c}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.55"
            />
          ))}
        </svg>
        {RAIN.map((x, i) => (
          <span
            key={x}
            className="absolute top-6 h-4 w-[2px] rounded-full bg-sky-400/70"
            style={{
              left: `${x}px`,
              animation: `sfx-rain ${0.7 + (i % 3) * 0.2}s linear ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (skin.effect === "petals") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-0" aria-hidden>
        {PETALS.map((x, i) => (
          <span
            key={x}
            className="absolute top-4 size-2 rounded-[60%_40%_60%_40%]"
            style={{
              left: `${x}px`,
              background: i % 2 ? "#ffb3d0" : "#ffd9e6",
              boxShadow: "0 0 4px rgba(242,120,159,0.5)",
              animation: `sfx-petal ${2 + (i % 4) * 0.4}s linear ${i * 0.25}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (skin.effect === "stars") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-0" aria-hidden>
        {PETALS.map((x, i) => (
          <span
            key={x}
            className="absolute top-8 size-1.5 rounded-full bg-violet-200"
            style={{
              left: `${x}px`,
              boxShadow: "0 0 8px #c9a8ff, 0 0 14px #7c3aed",
              animation: `sfx-twinkle ${1.2 + (i % 3) * 0.3}s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  if (skin.effect === "sparkle") {
    return (
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-0" aria-hidden>
        {RAIN.map((x, i) => (
          <span
            key={x}
            className="absolute top-6 size-1.5 rotate-45 bg-amber-300"
            style={{
              left: `${x}px`,
              boxShadow: "0 0 8px #ffb84d",
              animation: `sfx-twinkle ${1 + (i % 3) * 0.25}s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    );
  }

  // confetti
  const COLORS = ["#ff6b6b", "#ffd93c", "#6bcf7f", "#4d96ff", "#9b59b6"];
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-40 w-0" aria-hidden>
      {PETALS.map((x, i) => (
        <span
          key={x}
          className="absolute top-4 h-2.5 w-1.5 rounded-[2px]"
          style={{
            left: `${x}px`,
            background: COLORS[i % COLORS.length],
            animation: `sfx-petal ${1.6 + (i % 4) * 0.3}s linear ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/** 상점에서 사용하는 스킨 미리보기 */
export function SkinShopPreview({ skin, size = 64 }: { skin: Skin; size?: number }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      <div style={{ transform: `scale(${size / 116})`, transformOrigin: "center" }}>
        <SkinCanopy skin={skin} />
      </div>
    </div>
  );
}
