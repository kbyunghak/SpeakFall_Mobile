export type BackNavigablePhase = "island" | "map" | "collection" | "shop";
export type BackDestination = "idle" | "island";

/** 주요 선택 화면의 상단 뒤로가기 목적지를 한곳에서 관리합니다. */
export function backDestinationForPhase(phase: BackNavigablePhase): BackDestination {
  return phase === "island" ? "idle" : "island";
}
