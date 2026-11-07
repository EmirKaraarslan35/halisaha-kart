import { supabase, isSupabaseConfigured } from './supabase'
import { Player, Team, LineupSlot, League, Match, Goal } from '../types'

export interface CloudData {
  teams: Team[]
  players: Player[]
  lineupSlots: { A: LineupSlot[]; B: LineupSlot[] }
  league: League | null
  matches: Match[]
  goals: Goal[]
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

// Supabase'den ilk verileri çekme
export async function fetchCloudData(): Promise<CloudData | null> {
  if (!isSupabaseConfigured) return null

  try {
    const [
      { data: dbTeams, error: errTeams },
      { data: dbPlayers, error: errPlayers },
      { data: dbSlots, error: errSlots },
      { data: dbLeagues },
      { data: dbMatches },
      { data: dbGoals },
    ] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('lineup_slots').select('*'),
      supabase.from('leagues').select('*').eq('status', 'active').limit(1),
      supabase.from('matches').select('*').order('started_at', { ascending: false }),
      supabase.from('goals').select('*'),
    ])

    if (errTeams || errPlayers || errSlots) {
      console.warn('Supabase fetch notice:', errTeams || errPlayers || errSlots)
    }

    const teams: Team[] = dbTeams && dbTeams.length > 0 ? dbTeams.map((t: any) => ({
      id: t.id,
      side: t.side,
      name: t.name,
      formation: Array.isArray(t.formation) ? t.formation : (typeof t.formation === 'string' ? JSON.parse(t.formation) : [1, 2, 3, 1]),
      created_at: t.created_at,
    })) : []

    const players: Player[] = dbPlayers && dbPlayers.length > 0 ? dbPlayers.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      position: p.position,
      power: p.power,
      photo_url: p.photo_url || null,
      is_guest: p.is_guest,
      is_active: p.is_active,
      default_team_id: p.default_team_id || null,
      created_at: p.created_at,
    })) : []

    const teamA = teams.find(t => t.side === 'A')
    const teamB = teams.find(t => t.side === 'B')

    let slotsA: LineupSlot[] = []
    let slotsB: LineupSlot[] = []

    if (dbSlots && dbSlots.length > 0) {
      slotsA = dbSlots
        .filter((s: any) => teamA && s.team_id === teamA.id)
        .sort((a: any, b: any) => a.slot_index - b.slot_index)
        .map((s: any) => ({
          id: s.id,
          team_id: s.team_id,
          slot_index: s.slot_index,
          line_index: s.line_index,
          position_label: s.position_label,
          player_id: s.player_id,
        }))

      slotsB = dbSlots
        .filter((s: any) => teamB && s.team_id === teamB.id)
        .sort((a: any, b: any) => a.slot_index - b.slot_index)
        .map((s: any) => ({
          id: s.id,
          team_id: s.team_id,
          slot_index: s.slot_index,
          line_index: s.line_index,
          position_label: s.position_label,
          player_id: s.player_id,
        }))
    }

    const league: League | null = dbLeagues && dbLeagues.length > 0 ? dbLeagues[0] : null
    const matches: Match[] = dbMatches || []
    const goals: Goal[] = dbGoals || []

    return {
      teams,
      players,
      lineupSlots: { A: slotsA, B: slotsB },
      league,
      matches,
      goals,
    }
  } catch (err) {
    console.error('fetchCloudData error:', err)
    return null
  }
}

// Kadro yuvalarını Supabase'e yazma
export async function syncSlotsToCloud(
  slotsA: LineupSlot[],
  slotsB: LineupSlot[],
  teamAId: string,
  teamBId: string
) {
  if (!isSupabaseConfigured) return

  try {
    const validPlayerId = (id: string | null) => (id && isUuid(id) ? id : null)

    const records = [
      ...slotsA.map(s => ({
        team_id: teamAId,
        slot_index: s.slot_index,
        line_index: s.line_index,
        position_label: s.position_label,
        player_id: validPlayerId(s.player_id),
      })),
      ...slotsB.map(s => ({
        team_id: teamBId,
        slot_index: s.slot_index,
        line_index: s.line_index,
        position_label: s.position_label,
        player_id: validPlayerId(s.player_id),
      })),
    ]

    await supabase.from('lineup_slots').upsert(records, {
      onConflict: 'team_id,slot_index',
    })
  } catch (err) {
    console.error('syncSlotsToCloud error:', err)
  }
}

// Oyuncuyu Supabase'e yazma
export async function syncPlayerToCloud(player: Player) {
  if (!isSupabaseConfigured) return
  try {
    const targetId = isUuid(player.id) ? player.id : generateUuid()
    await supabase.from('players').upsert({
      id: targetId,
      full_name: player.full_name,
      position: player.position,
      power: player.power,
      photo_url: player.photo_url || null,
      is_guest: player.is_guest,
      is_active: player.is_active,
      default_team_id: player.default_team_id && isUuid(player.default_team_id) ? player.default_team_id : null,
    })
  } catch (err) {
    console.error('syncPlayerToCloud error:', err)
  }
}

// Oyuncu silme
export async function deletePlayerFromCloud(playerId: string) {
  if (!isSupabaseConfigured || !isUuid(playerId)) return
  try {
    await supabase.from('players').delete().eq('id', playerId)
  } catch (err) {
    console.error('deletePlayerFromCloud error:', err)
  }
}
