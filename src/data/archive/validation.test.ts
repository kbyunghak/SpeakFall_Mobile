import { describe, expect, test } from "bun:test";
import { parseArchiveManifest, parseArchiveSet } from "./validation";

const descriptor = {
  setId: 1,
  title: "기초 Set 1",
  wordCount: 1,
  version: 1,
  file: "basic/set-1.json",
};

test("Archive Manifest의 여섯 트랙을 검증한다", () => {
  const manifest = parseArchiveManifest({
    schemaVersion: 1,
    tracks: {
      basic: [descriptor],
      elementary: [],
      middle: [],
      high: [],
      biz: [],
      pro: [],
    },
  });
  expect(manifest.tracks.basic[0]!.setId).toBe(1);
});

describe("Archive Set 검증", () => {
  test("Manifest와 일치하는 Set을 허용한다", () => {
    const set = parseArchiveSet(
      {
        schemaVersion: 1,
        track: "basic",
        setId: 1,
        title: "기초 Set 1",
        range: { from: 1, to: 1 },
        version: 1,
        words: [{ word: "apple", ipa: "/ˈæpəl/", meaning: "사과", level: 1 }],
      },
      "basic",
      descriptor,
    );
    expect(set.words[0]!.word).toBe("apple");
  });

  test("중복 단어를 거부한다", () => {
    expect(() =>
      parseArchiveSet(
        {
          schemaVersion: 1,
          track: "basic",
          setId: 1,
          title: "기초 Set 1",
          range: { from: 1, to: 2 },
          version: 1,
          words: [
            { word: "apple", ipa: "", meaning: "사과", level: 1 },
            { word: "Apple", ipa: "", meaning: "사과", level: 2 },
          ],
        },
        "basic",
        { ...descriptor, wordCount: 2 },
      ),
    ).toThrow("중복");
  });
});
