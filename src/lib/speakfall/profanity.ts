/** Words we never want to display literally in a kids' learning game. */
const PROFANITY = [
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "bastard",
  "whore",
  "slut",
  "nigga",
  "nigger",
  "faggot",
  "damn",
  "goddamn",
  "crap",
  "penis",
  "vagina",
  "sex",
  "porn",
  "씨발",
  "시발",
  "개새끼",
  "병신",
  "지랄",
  "좆",
];

const SET = new Set(PROFANITY);

export function isProfane(token: string): boolean {
  const t = token.toLowerCase().replace(/[^a-z가-힣]/g, "");
  return t.length > 0 && SET.has(t);
}

/** Replaces bad words with a soft placeholder so nothing offensive is shown. */
export function maskProfanity(text: string): string {
  return text
    .split(/(\s+)/)
    .map((chunk) => {
      if (!chunk.trim()) return chunk;
      if (!isProfane(chunk)) return chunk;
      const clean = chunk.replace(/[^a-zA-Z가-힣]/g, "");
      return clean[0] + "*".repeat(Math.max(1, clean.length - 1));
    })
    .join("");
}

export function containsProfanity(text: string): boolean {
  return text.split(/\s+/).some(isProfane);
}
