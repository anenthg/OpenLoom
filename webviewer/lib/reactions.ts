export const REACTION_EMOJIS = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "❤️", label: "Heart" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "😂", label: "Laughing" },
  { emoji: "👏", label: "Clapping" },
  { emoji: "🎉", label: "Celebration" },
] as const;

export const ALLOWED_EMOJIS: string[] = REACTION_EMOJIS.map((r) => r.emoji);

export interface Reaction {
  id: string;
  emoji: string;
  timestamp: number;
  created_at: string;
}
