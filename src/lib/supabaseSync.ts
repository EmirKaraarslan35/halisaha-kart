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

export function isUuid(str: string | null | undefined): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function ensureUuid(str: string | null | undefined): string {
  if (str && isUuid(str)) return str
  return generateUuid()
}

// Supabase'den tüm verileri çekme
export async function fetchCloudData(): Promise<CloudData | null> {
  if (!isSupabaseConfigured) return null

  try {
    const [
      { data: dbTeams, error: errTeams },
      { data: dbPlayers, error: errPlayers },
      { data: dbSlots, error: errSlots },
      { data: dbLeagues, error: errLeagues },
      { data: dbMatches, error: errMatches },
      { data: dbGoals, error: errGoals },
    ] = await Promise.all([
      supabase.from('teams').select('*'),
      supabase.from('players').select('*'),
      supabase.from('lineup_slots').select('*'),
      supabase.from('leagues').select('*').order('created_at', { ascending: false }),
      supabase.from('matches').select('*').order('started_at', { ascending: false }),
      supabase.from('goals').select('*'),
    ])

    if (errTeams || errPlayers || errSlots || errLeagues || errMatches || errGoals) {
      console.warn('Supabase fetch warnings:', { errTeams, errPlayers, errSlots, errLeagues, errMatches, errGoals })
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

    const league: League | null = dbLeagues && dbLeagues.length > 0 ? {
      id: dbLeagues[0].id,
      name: dbLeagues[0].name,
      status: dbLeagues[0].status,
      started_at: dbLeagues[0].started_at,
      finished_at: dbLeagues[0].finished_at,
      champion_side: dbLeagues[0].champion_side,
      note: dbLeagues[0].note,
      created_at: dbLeagues[0].created_at,
    } : null

    const matches: Match[] = dbMatches && dbMatches.length > 0 ? dbMatches.map((m: any) => ({
      id: m.id,
      league_id: m.league_id,
      status: m.status,
      team_a_name: m.team_a_name,
      team_b_name: m.team_b_name,
      formation_a: Array.isArray(m.formation_a) ? m.formation_a : JSON.parse(m.formation_a || '[1,2,3,1]'),
      formation_b: Array.isArray(m.formation_b) ? m.formation_b : JSON.parse(m.formation_b || '[1,3,2,1]'),
      score_a: m.score_a,
      score_b: m.score_b,
      mvp_player_id: m.mvp_player_id,
      started_at: m.started_at,
      finished_at: m.finished_at,
      created_at: m.created_at,
    })) : []

    const goals: Goal[] = dbGoals && dbGoals.length > 0 ? dbGoals.map((g: any) => ({
      id: g.id,
      match_id: g.match_id,
      scorer_id: g.scorer_id,
      assist_id: g.assist_id,
      is_own_goal: g.is_own_goal,
      credited_side: g.credited_side,
      created_at: g.created_at,
    })) : []

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
    const targetId = ensureUuid(player.id)
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

// Lig kaydetme / güncelleme
export async function syncLeagueToCloud(league: League) {
  if (!isSupabaseConfigured) return
  try {
    const targetId = ensureUuid(league.id)
    await supabase.from('leagues').upsert({
      id: targetId,
      name: league.name,
      status: league.status,
      started_at: league.started_at,
      finished_at: league.finished_at,
      champion_side: league.champion_side,
      note: league.note,
    })
  } catch (err) {
    console.error('syncLeagueToCloud error:', err)
  }
}

// Maç ve Golleri Supabase'e yazma
export async function syncMatchToCloud(match: Match, matchGoals: Goal[]) {
  if (!isSupabaseConfigured) return
  try {
    const matchId = ensureUuid(match.id)
    const leagueId = ensureUuid(match.league_id)

    // Önce ligin var olduğundan emin ol
    await supabase.from('leagues').upsert({
      id: leagueId,
      name: 'Lig Sezonu',
      status: 'active',
    })

    // Maçı kaydet
    await supabase.from('matches').upsert({
      id: matchId,
      league_id: leagueId,
      status: match.status,
      team_a_name: match.team_a_name,
      team_b_name: match.team_b_name,
      formation_a: match.formation_a,
      formation_b: match.formation_b,
      score_a: match.score_a,
      score_b: match.score_b,
      mvp_player_id: match.mvp_player_id && isUuid(match.mvp_player_id) ? match.mvp_player_id : null,
      started_at: match.started_at,
      finished_at: match.finished_at,
    })

    // Eski golleri temizle ve yenilerini ekle
    await supabase.from('goals').delete().eq('match_id', matchId)

    if (matchGoals.length > 0) {
      const goalRecords = matchGoals.map(g => ({
        id: ensureUuid(g.id),
        match_id: matchId,
        scorer_id: ensureUuid(g.scorer_id),
        assist_id: g.assist_id && isUuid(g.assist_id) ? g.assist_id : null,
        is_own_goal: Boolean(g.is_own_goal),
        credited_side: g.credited_side,
      }))
      await supabase.from('goals').insert(goalRecords)
    }
  } catch (err) {
    console.error('syncMatchToCloud error:', err)
  }
}

// Maç silme
export async function deleteMatchFromCloud(matchId: string) {
  if (!isSupabaseConfigured || !isUuid(matchId)) return
  try {
    await supabase.from('goals').delete().eq('match_id', matchId)
    await supabase.from('matches').delete().eq('id', matchId)
  } catch (err) {
    console.error('deleteMatchFromCloud error:', err)
  }
}
