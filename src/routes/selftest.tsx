import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdBanner } from "@/components/ads/AdBanner";
import { CHECKS, buildReport, summarize, type CheckResult } from "@/lib/speakfall/selftest";

const title = "사전 설치 테스트 — 말해봐!영단어 구조대";
const description =
  "릴리즈 APK 설치 후 마이크, 음성 인식, 권한, 광고 영역, 저장소를 자동으로 점검하는 테스트 페이지입니다.";

export const Route = createFileRoute("/selftest")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SelfTestPage,
});

const STATUS_STYLE: Record<string, string> = {
  pass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  fail: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  running: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  idle: "bg-slate-500/10 text-slate-400 border-slate-600/40",
};

const STATUS_LABEL: Record<string, string> = {
  pass: "통과",
  warn: "주의",
  fail: "실패",
  running: "검사 중",
  idle: "대기",
};

function initialResults(): CheckResult[] {
  return CHECKS.map((c) => ({
    id: c.id,
    label: c.label,
    interactive: c.interactive ?? false,
    status: "idle" as const,
    detail: c.interactive ? "사용자 조작이 필요합니다." : "아직 실행하지 않았습니다.",
  }));
}

function SelfTestPage() {
  const [results, setResults] = useState<CheckResult[]>(initialResults);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = useCallback((id: string, patch: Partial<CheckResult>) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const runOne = useCallback(
    async (id: string) => {
      const def = CHECKS.find((c) => c.id === id);
      if (!def) return;
      update(id, { status: "running", detail: "검사 중…" });
      try {
        const out = await def.run();
        update(id, out);
      } catch (e: any) {
        update(id, { status: "fail", detail: `오류: ${e?.message ?? e}` });
      }
    },
    [update],
  );

  const runAuto = useCallback(async () => {
    setBusy(true);
    for (const c of CHECKS) {
      if (c.interactive) continue;
      await runOne(c.id);
    }
    setBusy(false);
  }, [runOne]);

  // 페이지 진입 시 자동 항목만 즉시 실행
  useEffect(() => {
    void runAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = summarize(results);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport(results));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#0F172A] text-slate-100">
      <div
        className="mx-auto max-w-2xl px-5 py-10"
        style={{
          paddingTop: "calc(2.5rem + env(safe-area-inset-top))",
          paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
          >
            ← 홈으로 돌아가기
          </Link>
          <Link
            to="/dictation"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            영어 받아쓰기 테스트
          </Link>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
          사전 설치 테스트
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          릴리즈 APK를 설치한 기기에서 이 페이지를 열고 아래 순서대로 확인하세요. 자동 항목은 진입
          즉시 실행되며, 마이크 권한·입력 항목은 버튼을 눌러 직접 확인해야 합니다.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            통과 {s.pass}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            주의 {s.warn}
          </span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
            실패 {s.fail}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAuto()}
            disabled={busy}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {busy ? "검사 중…" : "자동 검사 다시 실행"}
          </button>
          <button
            type="button"
            onClick={() => void copyReport()}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            {copied ? "복사됨!" : "리포트 복사"}
          </button>
        </div>

        <ul className="mt-6 space-y-3">
          {results.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-white">{r.label}</p>
                  <p className="mt-1 break-words text-sm text-slate-400">{r.detail}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void runOne(r.id)}
                className="mt-3 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {r.interactive ? "직접 테스트 실행" : "다시 검사"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            광고 영역 미리보기
          </p>
          <div data-selftest-ad>
            <AdBanner />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 text-sm text-slate-400">
          <p className="mb-2 font-bold text-slate-200">제출 전 확인 순서</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>릴리즈 APK 설치 후 앱을 처음 실행해 마이크 안내 시트가 보이는지 확인</li>
            <li>이 페이지에서 자동 검사 결과에 실패 항목이 없는지 확인</li>
            <li>마이크 권한 요청 → 입력 신호 테스트를 실제 음성으로 통과</li>
            <li>권한을 거부한 뒤 게임 화면의 설정 안내 문구가 뜨는지 확인</li>
            <li>게임에서 단어 1개를 실제 발음으로 구조 성공</li>
            <li>광고 영역이 레이아웃을 밀거나 가리지 않는지 확인</li>
            <li>리포트를 복사해 심사 기록에 보관</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
