import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TRACKS = [
  ["basic", "기초 영단어"],
  ["elementary", "초등 필수"],
  ["middle", "중학 필수"],
  ["high", "고등/수능"],
  ["biz", "사회/비즈니스"],
  ["pro", "전문/학술"],
] as const;

type ArchiveSource = {
  schemaVersion: number;
  track: string;
  setId: number;
  title: string;
  version: number;
  words: unknown[];
};

/** public/archive의 실제 Set JSON 파일을 기준으로 앱용 목록을 다시 만듭니다. */
export function generateArchiveManifest(root = process.cwd()): void {
  const archiveRoot = join(root, "public", "archive");
  const tracks = Object.fromEntries(
    TRACKS.map(([track, label]) => {
      const directory = join(archiveRoot, track);
      const files = existsSync(directory)
        ? readdirSync(directory).filter((file) => file.toLowerCase().endsWith(".json"))
        : [];

      const descriptors = files
        .map((file) => {
          const fullPath = join(directory, file);
          const source = JSON.parse(readFileSync(fullPath, "utf8")) as ArchiveSource;
          if (
            source.schemaVersion !== 1 ||
            source.track !== track ||
            !Number.isInteger(source.setId) ||
            source.setId < 1 ||
            !Number.isInteger(source.version) ||
            source.version < 1 ||
            !Array.isArray(source.words) ||
            source.words.length < 1 ||
            source.words.length > 100
          ) {
            throw new Error(`Archive Set 형식이 올바르지 않습니다: ${fullPath}`);
          }

          return {
            setId: source.setId,
            title: `${label} Set ${source.setId}`,
            wordCount: source.words.length,
            version: source.version,
            file: relative(archiveRoot, fullPath).split(sep).join("/"),
          };
        })
        .sort((a, b) => a.setId - b.setId);

      if (new Set(descriptors.map(({ setId }) => setId)).size !== descriptors.length) {
        throw new Error(`${track} Archive 폴더에 중복된 Set ID가 있습니다.`);
      }
      return [track, descriptors];
    }),
  );

  const output = `${JSON.stringify({ schemaVersion: 1, tracks }, null, 2)}\n`;
  const manifestPath = join(archiveRoot, "manifest.json");
  if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== output) {
    writeFileSync(manifestPath, output, "utf8");
  }
}
