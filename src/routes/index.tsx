import { createFileRoute } from "@tanstack/react-router";

import { SpeakFallGame } from "@/components/speakfall/SpeakFallGame";

const title = "말해봐! 영단어 구조대 — 목소리로 친구를 구하는 발음 게임";
const description =
  "단어를 말하면 낙하산이 펼쳐져요! 하늘에서 떨어지는 젤리 친구들의 영어 단어를 정확히 발음해 구조하세요.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="bg-background">
      <SpeakFallGame />
    </main>
  );
}
