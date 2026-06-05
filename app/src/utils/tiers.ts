export const TIERS = [
  { name: 'Bronze',   min: 0,     max: 999,       color: '#CD7F32', next: 1000  },
  { name: 'Silver',   min: 1000,  max: 4999,       color: '#A8A8A8', next: 5000  },
  { name: 'Gold',     min: 5000,  max: 9999,       color: '#FFD700', next: 10000 },
  { name: 'Platinum', min: 10000, max: Infinity,   color: '#E5E4E2', next: null  },
]

export type Tier = (typeof TIERS)[number]

export function getTier(points: number): Tier {
  return TIERS.find(t => points >= t.min && points <= t.max) ?? TIERS[0]
}

export const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  Bronze:   { bg: '#CD7F32', text: '#fff' },
  Silver:   { bg: '#A8A8A8', text: '#fff' },
  Gold:     { bg: '#FFE500', text: '#000' },
  Platinum: { bg: '#E5E4E2', text: '#000' },
}
