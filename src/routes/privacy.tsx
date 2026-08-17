import { createFileRoute, Link } from "@tanstack/react-router";

const title = "개인정보처리방침 — 말해봐!영단어 구조대";
const description =
  "말해봐!영단어 구조대는 음성 인식과 기기 내 저장소를 사용하며, 개인정보를 최소로 수집합니다.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="min-h-[100dvh] bg-[#0F172A] text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
          >
            ← 홈으로 돌아가기
          </Link>
        </div>

        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          개인정보처리방침
        </h1>

        <p className="mb-10 text-slate-400">
          <span className="font-semibold text-sky-300">말해봐!영단어 구조대</span>는 어린이를 포함한
          모든 사용자가 안심하고 즐길 수 있는 영어 학습 게임입니다. 본 방침은 어떤 정보를 어떻게
          사용하는지 설명합니다.
        </p>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">1. 수집하는 정보</h2>
          <p className="mb-3 text-slate-300 leading-relaxed">
            본 앱은 아래와 같은 정보를 수집할 수 있습니다.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-slate-300 leading-relaxed">
            <li>
              <span className="font-semibold text-white">음성(마이크) 데이터:</span> 게임 플레이 중
              단어 발음을 인식하기 위해 실시간으로 사용됩니다. 음성 데이터는 기기 내에서만 처리되며,
              녹음 파일이나 텍스트로 서버에 전송되지 않습니다.
            </li>
            <li>
              <span className="font-semibold text-white">기기 저장소:</span> 게임 진행도, 코인,
              획득한 스킨 등을 기기 내부(localStorage)에 저장합니다. 이 데이터는 사용자의 기기에만
              남아 있으며 개발자가 접근할 수 없습니다.
            </li>
            <li>
              <span className="font-semibold text-white">기기 식별자 및 광고 ID:</span> 보상형 광고
              제공을 위해 Google Mobile Ads SDK가 광고 ID, 기기 정보, 광고 상호작용 정보를 처리할 수
              있습니다. 앱은 아동 대상, 동의 연령 미만, 비개인화 광고 및 전체 이용가 광고 설정을
              적용합니다.
            </li>
            <li>
              <span className="font-semibold text-white">계정 정보:</span> 별도의 회원가입이나
              로그인이 없어 이메일, 이름, 생년월일 등을 수집하지 않습니다.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">2. 수집 목적</h2>
          <ul className="list-disc space-y-2 pl-5 text-slate-300 leading-relaxed">
            <li>음성 인식을 통한 영어 발음 학습 게임 제공</li>
            <li>게임 진행도 및 보상 저장</li>
            <li>선택적으로 시청하는 보상형 광고 제공 및 섬 잠금 해제</li>
            <li>앱 사용 중 발생하는 오류 확인 및 성능 개선(별도 동의 시에 한함)</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">3. 보관 및 삭제</h2>
          <p className="text-slate-300 leading-relaxed">
            음성 데이터는 실시간 처리 후 즉시 폐기됩니다. 게임 진행도 등은 기기 내부에 저장되며,
            앱을 삭제하면 함께 삭제됩니다. 별도의 서버에 개인정보를 보관하지 않습니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">4. 제3자 제공</h2>
          <p className="text-slate-300 leading-relaxed">
            본 앱은 사용자의 개인정보를 판매하지 않습니다. 보상형 광고를 제공하기 위해 Google Mobile
            Ads SDK를 사용하며, 광고 제공 과정에서 Google이 제한된 기기 및 광고 상호작용 정보를
            처리할 수 있습니다. 자세한 내용은 Google의 개인정보처리방침을 확인해 주세요.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">5. 아동 개인정보 보호 (COPPA)</h2>
          <p className="text-slate-300 leading-relaxed">
            본 앱은 어린이를 포함한 모든 연령이 이용할 수 있도록 설계되었습니다. 13세 미만 아동의
            개인정보를 의도적으로 수집하지 않으며, 음성 인식 데이터도 기기 내에서만 처리됩니다.
            COPPA 및 관련 법규를 준수합니다.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">6. 사용자 권리</h2>
          <p className="mb-3 text-slate-300 leading-relaxed">
            사용자는 다음과 같은 권리를 가집니다.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-slate-300 leading-relaxed">
            <li>마이크 권한 허용 또는 거부(설정에서 언제든 변경 가능)</li>
            <li>앱 삭제를 통한 저장 데이터 제거</li>
            <li>개인정보처리방침에 대한 문의 및 의견 제시</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">7. 문의처</h2>
          <p className="text-slate-300 leading-relaxed">
            개인정보처리방침에 대한 문의는 아래 이메일로 부탁드립니다.
          </p>
          <p className="mt-2 font-semibold text-white">support@speakfall.example.com</p>
          <p className="mt-2 text-sm text-slate-400">(실제 운영 이메일로 교체해 주세요.)</p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-bold text-sky-300">8. 개정</h2>
          <p className="text-slate-300 leading-relaxed">
            본 개인정보처리방침은 법률 변경 또는 앱 기능 변경에 따라 수정될 수 있습니다. 중요한 변경
            사항이 있을 경우 앱 내 공지 또는 웹사이트를 통해 안내하겠습니다.
          </p>
        </section>

        <p className="text-sm text-slate-500">최종 개정일: 2026년 8월 15일</p>
      </div>
    </main>
  );
}
