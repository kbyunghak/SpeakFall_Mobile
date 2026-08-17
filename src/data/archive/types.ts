import type { Difficulty, TrackType } from "@/data/words";

export type ArchiveWord = {
  word: string;
  ipa: string;
  meaning: string;
  level: Difficulty;
};

export type ArchiveSetDescriptor = {
  setId: number;
  title: string;
  wordCount: number;
  version: number;
  file: string;
};

export type ArchiveManifest = {
  schemaVersion: 1;
  tracks: Record<TrackType, ArchiveSetDescriptor[]>;
};

export type ArchiveSetFile = {
  schemaVersion: 1;
  track: TrackType;
  setId: number;
  title: string;
  range: { from: number; to: number };
  version: number;
  words: ArchiveWord[];
};
