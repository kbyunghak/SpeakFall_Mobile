import type { TrackType } from "@/data/words";
import {
  parseArchiveManifest,
  parseArchiveSet,
  type ArchiveManifest,
  type ArchiveSetDescriptor,
  type ArchiveSetFile,
  type ArchiveWord,
} from "@/data/archive";
import bundledArchiveManifest from "../../../public/archive/manifest.json";

const CACHE_PREFIX = "speakfall.archive.v1";
const configuredBase = String(import.meta.env.VITE_ARCHIVE_BASE_URL ?? "/archive");
const ARCHIVE_BASE_URL = configuredBase.replace(/\/$/, "");
const cacheKey = (track: TrackType, setId: number) => `${CACHE_PREFIX}.${track}.${setId}`;

export async function fetchArchiveManifest(): Promise<ArchiveManifest> {
  try {
    const response = await fetch(`${ARCHIVE_BASE_URL}/manifest.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Archive 목록을 불러오지 못했습니다 (${response.status}).`);
    return parseArchiveManifest(await response.json());
  } catch (cause) {
    // Capacitor의 로컬 WebView가 절대 경로 fetch를 막는 기기에서도 빌드에 포함된
    // public/archive 목록을 사용해 실제 단계별 Set 수를 표시합니다.
    console.warn("Archive 원격 목록을 읽지 못해 내장 목록을 사용합니다.", cause);
    return parseArchiveManifest(bundledArchiveManifest);
  }
}

export async function downloadArchiveSet(
  track: TrackType,
  descriptor: ArchiveSetDescriptor,
): Promise<ArchiveSetFile> {
  const response = await fetch(`${ARCHIVE_BASE_URL}/${descriptor.file.replace(/^\//, "")}`);
  if (!response.ok) throw new Error(`단어 Set을 내려받지 못했습니다 (${response.status}).`);
  return parseArchiveSet(await response.json(), track, descriptor);
}

export function cacheArchiveSet(set: ArchiveSetFile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(cacheKey(set.track, set.setId), JSON.stringify(set));
}

export function readCachedArchiveSet(track: TrackType, setId: number): ArchiveSetFile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(track, setId));
    if (!raw) return null;
    const value = JSON.parse(raw) as ArchiveSetFile;
    return parseArchiveSet(value, track, {
      setId: value.setId,
      title: value.title,
      wordCount: value.words.length,
      version: value.version,
      file: "cached",
    });
  } catch {
    return null;
  }
}

export function readCachedArchiveWords(track: TrackType, setIds: readonly number[]): ArchiveWord[] {
  return setIds.flatMap((setId) => readCachedArchiveSet(track, setId)?.words ?? []);
}
