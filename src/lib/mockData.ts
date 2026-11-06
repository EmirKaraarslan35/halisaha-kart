import { Player, Team, LineupSlot, League, Match, Goal, LeagueStanding, PlayerStats } from '../types'

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-a',
    side: 'A',
    name: 'Kuzey FC (Takım A)',
    formation: [1, 2, 3, 1], // 7 kişilik: Kaleci, 2 Defans, 3 Orta Saha, 1 Forvet
    created_at: new Date().toISOString(),
  },
  {
    id: 'team-b',
    side: 'B',
    name: 'Güney FC (Takım B)',
    formation: [1, 3, 2, 1], // 7 kişilik: Kaleci, 3 Defans, 2 Orta Saha, 1 Forvet
    created_at: new Date().toISOString(),
  },
]

export const INITIAL_PLAYERS: Player[] = [
  // Takım A Oyuncuları
  { id: 'p-1', full_name: 'Murat Yılmaz', position: 'KL', power: 78, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-2', full_name: 'Emre Demir', position: 'STP', power: 72, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-3', full_name: 'Burak Korkmaz', position: 'STP', power: 86, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-4', full_name: 'Can Arslan', position: 'SLK', power: 64, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-5', full_name: 'Ahmet Yılmaz', position: 'OS', power: 81, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-6', full_name: 'Serkan Koç', position: 'SĞK', power: 74, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-7', full_name: 'Ozan Soydan', position: 'FV', power: 70, default_team_id: 'team-a', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },

  // Takım B Oyuncuları
  { id: 'p-8', full_name: 'Hakan Güler', position: 'KL', power: 75, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-9', full_name: 'Ali Aksoy', position: 'SLB', power: 69, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-10', full_name: 'Kemal Dağ', position: 'STP', power: 79, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-11', full_name: 'Mert Tunç', position: 'SĞB', power: 63, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-12', full_name: 'Yusuf Kurt', position: 'OS', power: 77, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-13', full_name: 'Eren Kara', position: 'OS', power: 71, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-14', full_name: 'Tolga Kaya', position: 'FV', power: 88, default_team_id: 'team-b', photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },

  // Ekstra / Yedek Oyuncular
  { id: 'p-15', full_name: 'Semih Yıldız', position: 'OS', power: 68, default_team_id: null, photo_url: null, is_guest: false, is_active: true, created_at: '2026-11-01' },
  { id: 'p-16', full_name: 'Arda Bayraktar', position: 'FV', power: 60, default_team_id: null, photo_url: null, is_guest: true, is_active: true, created_at: '2026-11-01' },
]

export const INITIAL_LEAGUE: League = {
  id: 'league-1',
  name: 'Kasım 2026 Sezonu',
  status: 'active',
  started_at: '2026-11-01T20:00:00Z',
  finished_at: null,
  champion_side: null,
  note: null,
  created_at: '2026-11-01T20:00:00Z',
}

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'm-1',
    league_id: 'league-1',
    status: 'finished',
    team_a_name: 'Kuzey FC',
    team_b_name: 'Güney FC',
    formation_a: [1, 2, 3, 1],
    formation_b: [1, 3, 2, 1],
    score_a: 5,
    score_b: 3,
    mvp_player_id: 'p-5', // Ahmet Yılmaz
    started_at: '2026-11-02T21:00:00Z',
    finished_at: '2026-11-02T22:00:00Z',
    created_at: '2026-11-02T21:00:00Z',
  },
  {
    id: 'm-2',
    league_id: 'league-1',
    status: 'finished',
    team_a_name: 'Kuzey FC',
    team_b_name: 'Güney FC',
    formation_a: [1, 2, 3, 1],
    formation_b: [1, 3, 2, 1],
    score_a: 4,
    score_b: 6,
    mvp_player_id: 'p-14', // Tolga Kaya
    started_at: '2026-11-05T21:00:00Z',
    finished_at: '2026-11-05T22:00:00Z',
    created_at: '2026-11-05T21:00:00Z',
  },
]

export const INITIAL_GOALS: Goal[] = [
  // Maç 1 (5 - 3)
  { id: 'g-1', match_id: 'm-1', scorer_id: 'p-5', assist_id: 'p-6', is_own_goal: false, credited_side: 'A' },
  { id: 'g-2', match_id: 'm-1', scorer_id: 'p-7', assist_id: 'p-5', is_own_goal: false, credited_side: 'A' },
  { id: 'g-3', match_id: 'm-1', scorer_id: 'p-5', assist_id: null, is_own_goal: false, credited_side: 'A' },
  { id: 'g-4', match_id: 'm-1', scorer_id: 'p-3', assist_id: 'p-4', is_own_goal: false, credited_side: 'A' },
  { id: 'g-5', match_id: 'm-1', scorer_id: 'p-7', assist_id: null, is_own_goal: false, credited_side: 'A' },
  { id: 'g-6', match_id: 'm-1', scorer_id: 'p-14', assist_id: 'p-12', is_own_goal: false, credited_side: 'B' },
  { id: 'g-7', match_id: 'm-1', scorer_id: 'p-14', assist_id: null, is_own_goal: false, credited_side: 'B' },
  { id: 'g-8', match_id: 'm-1', scorer_id: 'p-12', assist_id: 'p-14', is_own_goal: false, credited_side: 'B' },

  // Maç 2 (4 - 6)
  { id: 'g-9', match_id: 'm-2', scorer_id: 'p-5', assist_id: null, is_own_goal: false, credited_side: 'A' },
  { id: 'g-10', match_id: 'm-2', scorer_id: 'p-6', assist_id: 'p-5', is_own_goal: false, credited_side: 'A' },
  { id: 'g-11', match_id: 'm-2', scorer_id: 'p-7', assist_id: 'p-6', is_own_goal: false, credited_side: 'A' },
  { id: 'g-12', match_id: 'm-2', scorer_id: 'p-4', assist_id: null, is_own_goal: false, credited_side: 'A' },
  { id: 'g-13', match_id: 'm-2', scorer_id: 'p-14', assist_id: 'p-12', is_own_goal: false, credited_side: 'B' },
  { id: 'g-14', match_id: 'm-2', scorer_id: 'p-14', assist_id: 'p-13', is_own_goal: false, credited_side: 'B' },
  { id: 'g-15', match_id: 'm-2', scorer_id: 'p-14', assist_id: null, is_own_goal: false, credited_side: 'B' },
  { id: 'g-16', match_id: 'm-2', scorer_id: 'p-12', assist_id: 'p-14', is_own_goal: false, credited_side: 'B' },
  { id: 'g-17', match_id: 'm-2', scorer_id: 'p-13', assist_id: 'p-12', is_own_goal: false, credited_side: 'B' },
  { id: 'g-18', match_id: 'm-2', scorer_id: 'p-10', assist_id: null, is_own_goal: false, credited_side: 'B' },
]
