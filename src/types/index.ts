export type TeamSide = 'A' | 'B'

export type PositionCode = 
  | 'KL' 
  | 'STP' 
  | 'SLB' 
  | 'SĞB' 
  | 'DOS' 
  | 'OS' 
  | 'SLK' 
  | 'SĞK' 
  | 'OOS' 
  | 'FV' 
  | 'SLF' 
  | 'SĞF'

export type CardTier = 'special' | 'gold' | 'silver' | 'bronze'

export interface Player {
  id: string
  full_name: string
  position: PositionCode | string
  power: number
  default_team_id: string | null
  photo_url: string | null
  is_guest: boolean
  is_active: boolean
  created_at: string
}

export interface Team {
  id: string
  side: TeamSide
  name: string
  formation: number[] // e.g. [1, 2, 3, 1]
  created_at: string
}

export interface LineupSlot {
  id: string
  team_id: string
  slot_index: number
  line_index: number
  position_label: string
  player_id: string | null
  created_at?: string
  player?: Player | null
}

export interface League {
  id: string
  name: string
  status: 'active' | 'finished'
  started_at: string
  finished_at: string | null
  champion_side: TeamSide | null
  note: string | null
  created_at: string
}

export interface Match {
  id: string
  league_id: string
  status: 'playing' | 'finished' | 'cancelled'
  team_a_name: string
  team_b_name: string
  formation_a: number[]
  formation_b: number[]
  score_a: number
  score_b: number
  mvp_player_id: string | null
  started_at: string
  finished_at: string | null
  created_at: string
  mvp?: Player | null
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  side: TeamSide
  slot_index: number
  position_label: string
  player?: Player
}

export interface Goal {
  id: string
  match_id: string
  scorer_id: string
  assist_id: string | null
  is_own_goal: boolean
  credited_side: TeamSide
  created_at?: string
  scorer?: Player
  assist?: Player
}

export interface PowerHistory {
  id: string
  player_id: string
  old_power: number
  new_power: number
  delta: number
  reason: string
  match_id: string | null
  reverted_of: string | null
  created_at: string
  match?: Match | null
}

export interface LeagueStanding {
  league_id: string
  side: TeamSide
  team_name: string
  matches_played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}

export interface PlayerStats {
  player_id: string
  full_name: string
  position: string
  power: number
  photo_url: string | null
  is_active: boolean
  is_guest: boolean
  default_team_id: string | null
  total_matches: number
  total_goals: number
  total_assists: number
  total_mvp: number
}

// Yardımcı sabitler ve fonksiyonlar
export const POSITION_OPTIONS: { code: PositionCode; label: string }[] = [
  { code: 'KL', label: 'Kaleci (KL)' },
  { code: 'STP', label: 'Stoper (STP)' },
  { code: 'SLB', label: 'Sol Bek (SLB)' },
  { code: 'SĞB', label: 'Sağ Bek (SĞB)' },
  { code: 'DOS', label: 'Ön Libero / Defansif OS (DOS)' },
  { code: 'OS', label: 'Orta Saha (OS)' },
  { code: 'SLK', label: 'Sol Kanat (SLK)' },
  { code: 'SĞK', label: 'Sağ Kanat (SĞK)' },
  { code: 'OOS', label: 'Ofansif Orta Saha (OOS)' },
  { code: 'FV', label: 'Forvet (FV)' },
  { code: 'SLF', label: 'Sol Forvet (SLF)' },
  { code: 'SĞF', label: 'Sağ Forvet (SĞF)' },
]

export function getCardTier(power: number): CardTier {
  if (power >= 85) return 'special'
  if (power >= 75) return 'gold'
  if (power >= 65) return 'silver'
  return 'bronze'
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function getShortName(fullName: string): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return parts[0]
}
