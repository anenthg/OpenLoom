export const ALLOWED_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🎉'] as const

export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number]

export interface Reaction {
  id: string
  emoji: AllowedEmoji
  timestamp: number
  created_at: string
}
