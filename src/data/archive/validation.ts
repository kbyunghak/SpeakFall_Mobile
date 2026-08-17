import type { TrackType } from "@/data/words";
import type { ArchiveManifest, ArchiveSetDescriptor, ArchiveSetFile, ArchiveWord } from "./types";

const TRACKS: TrackType[] = ["basic", "elementary", "middle", "high", "biz", "pro"];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) > 0;

function parseDescriptor(value: unknown): ArchiveSetDescriptor {
  if (!isRecord(value)) throw new Error("Archive Set 정보 형식이 올바르지 않습니다.");
  if (
    !isPositiveInteger(value.setId) ||
    typeof value.title !== "string" ||
    !isPositiveInteger(value.wordCount) ||
    value.wordCount > 100 ||
    !isPositiveInteger(value.version) ||
    typeof value.file !== "string" ||
    value.file.includes("..")
  ) {
    throw new Error("Archive Set 정보가 유효하지 않습니다.");
  }
  return value as ArchiveSetDescriptor;
}

export function parseArchiveManifest(value: unknown): ArchiveManifest {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.tracks)) {
    throw new Error("지원하지 않는 Archive Manifest입니다.");
  }
  const tracks = Object.fromEntries(
    TRACKS.map((track) => {
      const rawSets = value.tracks[track];
      if (!Array.isArray(rawSets)) throw new Error(`${track} Archive 목록이 없습니다.`);
      const sets = rawSets.map(parseDescriptor).sort((a, b) => a.setId - b.setId);
      if (new Set(sets.map(({ setId }) => setId)).size !== sets.length) {
        throw new Error(`${track} Archive Set ID가 중복됩니다.`);
      }
      return [track, sets];
    }),
  ) as Record<TrackType, ArchiveSetDescriptor[]>;
  return { schemaVersion: 1, tracks };
}

function parseWord(value: unknown): ArchiveWord {
  if (!isRecord(value)) throw new Error("Archive 단어 형식이 올바르지 않습니다.");
  if (
    typeof value.word !== "string" ||
    !value.word.trim() ||
    typeof value.ipa !== "string" ||
    typeof value.meaning !== "string" ||
    !isPositiveInteger(value.level) ||
    value.level > 10
  ) {
    throw new Error("Archive 단어의 필수 정보가 없습니다.");
  }
  return value as ArchiveWord;
}

export function parseArchiveSet(
  value: unknown,
  expectedTrack: TrackType,
  descriptor: ArchiveSetDescriptor,
): ArchiveSetFile {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.range)) {
    throw new Error("지원하지 않는 Archive Set 파일입니다.");
  }
  if (
    value.track !== expectedTrack ||
    value.setId !== descriptor.setId ||
    value.version !== descriptor.version ||
    typeof value.title !== "string" ||
    !Array.isArray(value.words) ||
    value.words.length !== descriptor.wordCount ||
    value.words.length > 100 ||
    !isPositiveInteger(value.range.from) ||
    !isPositiveInteger(value.range.to)
  ) {
    throw new Error("Archive Set 정보가 Manifest와 일치하지 않습니다.");
  }
  const words = value.words.map(parseWord);
  if (new Set(words.map(({ word }) => word.trim().toLowerCase())).size !== words.length) {
    throw new Error("Archive Set 안에 중복 단어가 있습니다.");
  }
  return { ...(value as Omit<ArchiveSetFile, "words">), words };
}
