import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Player,
  Team,
  LineupSlot,
  League,
  Match,
  Goal,
  PowerHistory,
  LeagueStanding,
  PlayerStats,
  TeamSide,
} from '../types'
import {
  INITIAL_PLAYERS,
  INITIAL_TEAMS,
  INITIAL_LEAGUE,
  INITIAL_MATCHES,
  INITIAL_GOALS,
} from '../lib/mockData'
import { generateSlotsForFormation, PRESET_FORMATIONS } from '../lib/formations'
import { supabase } from '../lib/supabase'
import {
  fetchCloudData,
  syncSlotsToCloud,
  syncPlayerToCloud,
  deletePlayerFromCloud,
  generateUuid,
  isUuid,
} from '../lib/supabaseSync'

interface AppContextType {
  isAdmin: boolean
  setIsAdmin: (val: boolean) => void
  isVisitorPreview: boolean
  setIsVisitorPreview: (val: boolean) => void
  effectiveIsAdmin: boolean

  teams: Team[]
  players: Player[]
  currentLeague: League | null
  activeMatch: Match | null
  matches: Match[]
  goals: Goal[]
  lineupSlots: { A: LineupSlot[]; B: LineupSlot[] }
  extraPlayers: Player[]
  teamA_Average: number
  teamB_Average: number
  standings: LeagueStanding[]
  playerStats: PlayerStats[]
  powerHistory: PowerHistory[]
  currentFormat: number

  // Kadro & Saha Aksiyonları
  swapOrAssignSlot: (
    source: { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null } | { type: 'extra'; playerId: string },
    target: { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null } | { type: 'extra' }
  ) => void
  assignPlayerToSlot: (playerId: string, side: TeamSide, slotIndex: number) => void
  removePlayerFromSlot: (side: TeamSide, slotIndex: number) => void
  changeFormation: (side: TeamSide, lines: number[]) => void
  changeMatchFormat: (playerCountPerTeam: number) => void
  clearPitchToRibbon: () => void
  loadLastMatchLineup: () => void

  // Oyuncu Yönetimi
  addPlayer: (data: Omit<Player, 'id' | 'created_at'>) => void
  updatePlayer: (id: string, data: Partial<Player>) => void
  togglePlayerActive: (id: string) => void
  deletePlayer: (id: string) => void

  // Maç Akışı & Düzenleme
  startMatch: (teamAName: string, teamBName: string) => void
  cancelMatch: () => void
  finishMatch: (
    scoreA: number,
    scoreB: number,
    matchGoals: Omit<Goal, 'id' | 'match_id'>[],
    mvpPlayerId: string | null,
    applyMvpPowerBonus: boolean
  ) => void
  editMatch: (
    matchId: string,
    scoreA: number,
    scoreB: number,
    matchGoals: Omit<Goal, 'id' | 'match_id'>[],
    mvpPlayerId: string | null
  ) => void
  deleteMatch: (matchId: string, revertPowerBonus?: boolean) => void

  // Lig Yönetimi
  startNewLeague: (name: string) => void
  finishCurrentLeague: () => void
  reopenLeague: () => void
  resetLeague: () => void
  deleteLeague: () => void

  // Güç & Yedek
  revertPowerChange: (historyId: string) => void
  exportBackupJson: () => void
  resetToDefaultData: () => void
}

const AppContext = createContext<AppContextType | null>(null)

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(`halisaha_${key}`)
    return item ? JSON.parse(item) : fallback
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err)
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`halisaha_${key}`, JSON.stringify(value))
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err)
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => loadFromStorage('isAdmin', true))
  const [isVisitorPreview, setIsVisitorPreview] = useState<boolean>(false)
  const effectiveIsAdmin = isAdmin && !isVisitorPreview

  const [currentFormat, setCurrentFormat] = useState<number>(() => loadFromStorage('format', 7))
  const [teams, setTeams] = useState<Team[]>(() => loadFromStorage('teams', INITIAL_TEAMS))
  const [players, setPlayers] = useState<Player[]>(() => loadFromStorage('players', INITIAL_PLAYERS))
  const [currentLeague, setCurrentLeague] = useState<League | null>(() => loadFromStorage('league', INITIAL_LEAGUE))
  const [matches, setMatches] = useState<Match[]>(() => loadFromStorage('matches', INITIAL_MATCHES))
  const [goals, setGoals] = useState<Goal[]>(() => loadFromStorage('goals', INITIAL_GOALS))
  const [activeMatch, setActiveMatch] = useState<Match | null>(() => loadFromStorage('activeMatch', null))
  const [powerHistory, setPowerHistory] = useState<PowerHistory[]>(() => loadFromStorage('powerHistory', []))

  // Kadro yuvaları
  const [lineupSlots, setLineupSlots] = useState<{ A: LineupSlot[]; B: LineupSlot[] }>(() => {
    const cachedSlots = loadFromStorage<{ A: LineupSlot[]; B: LineupSlot[] } | null>('lineupSlots', null)
    if (cachedSlots) return cachedSlots

    const teamA = INITIAL_TEAMS[0]
    const slotsA = generateSlotsForFormation(teamA.formation).map((slot, idx) => ({
      id: `slot-a-${idx}`,
      team_id: teamA.id,
      slot_index: slot.slot_index,
      line_index: slot.line_index,
      position_label: slot.position_label,
      player_id: INITIAL_PLAYERS[idx] ? INITIAL_PLAYERS[idx].id : null,
    }))

    const teamB = INITIAL_TEAMS[1]
    const slotsB = generateSlotsForFormation(teamB.formation).map((slot, idx) => ({
      id: `slot-b-${idx}`,
      team_id: teamB.id,
      slot_index: slot.slot_index,
      line_index: slot.line_index,
      position_label: slot.position_label,
      player_id: INITIAL_PLAYERS[idx + 7] ? INITIAL_PLAYERS[idx + 7].id : null,
    }))

    return { A: slotsA, B: slotsB }
  })

  // KALICI LOCALSTORAGE SENKRONİZASYONU
  useEffect(() => { saveToStorage('isAdmin', isAdmin) }, [isAdmin])
  useEffect(() => { saveToStorage('format', currentFormat) }, [currentFormat])
  useEffect(() => { saveToStorage('teams', teams) }, [teams])
  useEffect(() => { saveToStorage('players', players) }, [players])
  useEffect(() => { saveToStorage('league', currentLeague) }, [currentLeague])
  useEffect(() => { saveToStorage('matches', matches) }, [matches])
  useEffect(() => { saveToStorage('goals', goals) }, [goals])
  useEffect(() => { saveToStorage('activeMatch', activeMatch) }, [activeMatch])
  useEffect(() => { saveToStorage('powerHistory', powerHistory) }, [powerHistory])
  useEffect(() => { saveToStorage('lineupSlots', lineupSlots) }, [lineupSlots])

  // ================= SUPABASE BULUT SENKRONİZASYONU =================
  useEffect(() => {
    let isMounted = true

    async function initCloud() {
      try {
        const cloud = await fetchCloudData()
        if (!isMounted || !cloud) return

        if (cloud.teams && cloud.teams.length >= 2) {
          setTeams(cloud.teams)
        }

        if (cloud.players && cloud.players.length > 0) {
          setPlayers(cloud.players)
        } else if (players.length > 0) {
          for (const p of players) {
            syncPlayerToCloud(p)
          }
        }

        if (cloud.lineupSlots && (cloud.lineupSlots.A.length > 0 || cloud.lineupSlots.B.length > 0)) {
          setLineupSlots(cloud.lineupSlots)
        } else if (lineupSlots.A.length > 0 && cloud.teams.length >= 2) {
          syncSlotsToCloud(lineupSlots.A, lineupSlots.B, cloud.teams[0].id, cloud.teams[1].id)
        }

        if (cloud.league) setCurrentLeague(cloud.league)
        if (cloud.matches && cloud.matches.length > 0) setMatches(cloud.matches)
        if (cloud.goals && cloud.goals.length > 0) setGoals(cloud.goals)
      } catch (err) {
        console.error('Cloud init error:', err)
      }
    }

    initCloud()

    // Canlı Değişiklik Dinleyici (Başka biri veya yönetici kadroyu değiştirince anında ekran güncellenir)
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lineup_slots' }, async () => {
        const fresh = await fetchCloudData()
        if (fresh && fresh.lineupSlots && fresh.lineupSlots.A.length > 0) {
          setLineupSlots(fresh.lineupSlots)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async () => {
        const fresh = await fetchCloudData()
        if (fresh && fresh.players && fresh.players.length > 0) {
          setPlayers(fresh.players)
        }
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  // Sahadaki oyuncu id'leri
  const assignedPlayerIds = new Set<string>()
  lineupSlots.A.forEach(s => s.player_id && assignedPlayerIds.add(s.player_id))
  lineupSlots.B.forEach(s => s.player_id && assignedPlayerIds.add(s.player_id))

  // Ekstra şeritte duran oyuncular
  const extraPlayers = players.filter(p => p.is_active && !assignedPlayerIds.has(p.id))

  // Güç Ortalamaları
  const calcAverage = (slots: LineupSlot[]) => {
    const onPitch = slots
      .map(s => players.find(p => p.id === s.player_id))
      .filter((p): p is Player => Boolean(p && p.is_active))
    if (onPitch.length === 0) return 0
    const sum = onPitch.reduce((acc, cur) => acc + cur.power, 0)
    return Number((sum / onPitch.length).toFixed(1))
  }

  const teamA_Average = calcAverage(lineupSlots.A)
  const teamB_Average = calcAverage(lineupSlots.B)

  // ================= DİNAMİK LİG PUAN DURUMU =================
  const standings: LeagueStanding[] = React.useMemo(() => {
    if (!currentLeague) return []
    const finishedMatches = matches.filter(
      m => m.league_id === currentLeague.id && m.status === 'finished'
    )

    const calcForSide = (side: TeamSide): LeagueStanding => {
      let wins = 0, draws = 0, losses = 0, goals_for = 0, goals_against = 0
      const teamObj = teams.find(t => t.side === side)
      const teamName = side === 'A' ? (teamObj?.name || 'Takım A') : (teamObj?.name || 'Takım B')

      finishedMatches.forEach(m => {
        const gf = side === 'A' ? m.score_a : m.score_b
        const ga = side === 'A' ? m.score_b : m.score_a
        goals_for += gf
        goals_against += ga

        if (gf > ga) wins++
        else if (gf === ga) draws++
        else losses++
      })

      const matches_played = finishedMatches.length
      const goal_diff = goals_for - goals_against
      const points = wins * 3 + draws * 1

      return {
        league_id: currentLeague.id,
        side,
        team_name: teamName,
        matches_played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        goal_diff,
        points,
      }
    }

    const res = [calcForSide('A'), calcForSide('B')]
    return res.sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
  }, [currentLeague, matches, teams])

  // ================= OYUNCU İSTATİSTİKLERİ =================
  const playerStats: PlayerStats[] = React.useMemo(() => {
    return players.map(p => {
      const playerGoals = goals.filter(g => g.scorer_id === p.id && !g.is_own_goal).length
      const playerAssists = goals.filter(g => g.assist_id === p.id).length
      const mvpCount = matches.filter(m => m.status === 'finished' && m.mvp_player_id === p.id).length

      return {
        player_id: p.id,
        full_name: p.full_name,
        position: p.position,
        power: p.power,
        photo_url: p.photo_url,
        is_active: p.is_active,
        is_guest: p.is_guest,
        default_team_id: p.default_team_id,
        total_matches: matches.filter(m => m.status === 'finished').length,
        total_goals: playerGoals,
        total_assists: playerAssists,
        total_mvp: mvpCount,
      }
    }).sort((a, b) => b.total_goals - a.total_goals || b.total_assists - a.total_assists)
  }, [players, goals, matches])

  // ================= KADRO DEĞİŞİKLİĞİ (GÜVENLİ & IMMUTABLE & BULUT SENKRONİZASYONLU) =================
  const swapOrAssignSlot: AppContextType['swapOrAssignSlot'] = (source, target) => {
    if (activeMatch) {
      alert('Maç oynanırken kadro değiştirilemez!')
      return
    }

    setLineupSlots(prev => {
      const nextA = prev.A.map(s => ({ ...s }))
      const nextB = prev.B.map(s => ({ ...s }))

      if (source.type === 'slot' && target.type === 'slot') {
        const sourceList = source.side === 'A' ? nextA : nextB
        const targetList = target.side === 'A' ? nextA : nextB

        const sourceSlot = sourceList.find(s => s.slot_index === source.slotIndex)
        const targetSlot = targetList.find(s => s.slot_index === target.slotIndex)

        if (sourceSlot && targetSlot) {
          const temp = sourceSlot.player_id
          sourceSlot.player_id = targetSlot.player_id
          targetSlot.player_id = temp
        }
      } else if (source.type === 'extra' && target.type === 'slot') {
        nextA.forEach(s => { if (s.player_id === source.playerId) s.player_id = null })
        nextB.forEach(s => { if (s.player_id === source.playerId) s.player_id = null })
        const targetList = target.side === 'A' ? nextA : nextB
        const targetSlot = targetList.find(s => s.slot_index === target.slotIndex)
        if (targetSlot) {
          targetSlot.player_id = source.playerId
        }
      } else if (source.type === 'slot' && target.type === 'extra') {
        const sourceList = source.side === 'A' ? nextA : nextB
        const sourceSlot = sourceList.find(s => s.slot_index === source.slotIndex)
        if (sourceSlot) {
          sourceSlot.player_id = null
        }
      }

      if (teams.length >= 2) {
        syncSlotsToCloud(nextA, nextB, teams[0].id, teams[1].id)
      }

      return { A: nextA, B: nextB }
    })
  }

  // Doğrudan Slota Oyuncu Atama (Buluta Anında Kaydeder)
  const assignPlayerToSlot = (playerId: string, side: TeamSide, slotIndex: number) => {
    if (activeMatch) return
    setLineupSlots(prev => {
      const nextA = prev.A.map(s => ({
        ...s,
        player_id: s.player_id === playerId ? null : s.player_id
      }))
      const nextB = prev.B.map(s => ({
        ...s,
        player_id: s.player_id === playerId ? null : s.player_id
      }))
      const targetSide = side === 'A' ? nextA : nextB
      const targetSlot = targetSide.find(s => s.slot_index === slotIndex)
      if (targetSlot) {
        targetSlot.player_id = playerId
      }

      if (teams.length >= 2) {
        syncSlotsToCloud(nextA, nextB, teams[0].id, teams[1].id)
      }

      return { A: nextA, B: nextB }
    })
  }

  // Slottan Oyuncuyu Çıkarma (Yedeğe Alma & Bulut Senkronu)
  const removePlayerFromSlot = (side: TeamSide, slotIndex: number) => {
    if (activeMatch) return
    setLineupSlots(prev => {
      const targetSide = side === 'A' ? 'A' : 'B'
      const updatedList = prev[targetSide].map(s => {
        if (s.slot_index === slotIndex) {
          return { ...s, player_id: null }
        }
        return s
      })
      const nextSlots = { ...prev, [targetSide]: updatedList }
      if (teams.length >= 2) {
        syncSlotsToCloud(nextSlots.A, nextSlots.B, teams[0].id, teams[1].id)
      }
      return nextSlots
    })
  }

  // ================= SAHAYI BOŞALT (HERKESİ YEDEĞE AT & BULUT SENKRONU) =================
  const clearPitchToRibbon = () => {
    if (activeMatch) {
      alert('Maç oynanırken kadro boşaltılamaz!')
      return
    }
    if (!confirm('Tüm oyuncuları sahadan yedek şeridine almak istediğinize emin misiniz?')) return

    setLineupSlots(prev => {
      const emptyA = prev.A.map(s => ({ ...s, player_id: null }))
      const emptyB = prev.B.map(s => ({ ...s, player_id: null }))
      if (teams.length >= 2) {
        syncSlotsToCloud(emptyA, emptyB, teams[0].id, teams[1].id)
      }
      return { A: emptyA, B: emptyB }
    })
  }

  const loadLastMatchLineup = () => {
    if (activeMatch) {
      alert('Maç oynanırken işlem yapılamaz!')
      return
    }
    alert('Son maçın kadrosu yüklendi.')
  }

  // ================= 5v5, 6v6, 7v7, 8v8 FORMAT DEĞİŞTİRİCİ =================
  const changeMatchFormat = (playerCountPerTeam: number) => {
    if (activeMatch) {
      alert('Maç oynanırken format değiştirilemez!')
      return
    }

    setCurrentFormat(playerCountPerTeam)

    const presetsForCount = PRESET_FORMATIONS.filter(p => p.totalPlayers === playerCountPerTeam)
    const presetA = presetsForCount[0] || { lines: [1, 2, playerCountPerTeam - 4, 1] }
    const presetB = presetsForCount[1] || presetsForCount[0] || { lines: [1, 2, playerCountPerTeam - 4, 1] }

    setTeams(prev => [
      { ...prev[0], formation: presetA.lines },
      { ...prev[1], formation: presetB.lines },
    ])

    setLineupSlots(prev => {
      const getUpdatedSlots = (side: TeamSide, lines: number[]) => {
        const currentAssigned = prev[side].map(s => s.player_id).filter(Boolean) as string[]
        const newSlots = generateSlotsForFormation(lines)
        return newSlots.map((gSlot, idx) => ({
          id: `slot-${side.toLowerCase()}-${idx}`,
          team_id: side === 'A' ? teams[0].id : teams[1].id,
          slot_index: gSlot.slot_index,
          line_index: gSlot.line_index,
          position_label: gSlot.position_label,
          player_id: currentAssigned[idx] || null,
        }))
      }

      return {
        A: getUpdatedSlots('A', presetA.lines),
        B: getUpdatedSlots('B', presetB.lines),
      }
    })
  }

  // ================= DİZİLİŞ DEĞİŞTİRME =================
  const changeFormation = (side: TeamSide, lines: number[]) => {
    if (activeMatch) {
      alert('Maç oynanırken diziliş değiştirilemez!')
      return
    }

    setTeams(prev =>
      prev.map(t => (t.side === side ? { ...t, formation: lines } : t))
    )

    setLineupSlots(prev => {
      const currentSlots = prev[side]
      const currentPlayers = currentSlots.map(s => s.player_id).filter(Boolean) as string[]
      const newGeneratedSlots = generateSlotsForFormation(lines)

      const updatedSlots: LineupSlot[] = newGeneratedSlots.map((gSlot, idx) => ({
        id: `slot-${side.toLowerCase()}-${idx}`,
        team_id: side === 'A' ? teams[0].id : teams[1].id,
        slot_index: gSlot.slot_index,
        line_index: gSlot.line_index,
        position_label: gSlot.position_label,
        player_id: currentPlayers[idx] || null,
      }))

      return {
        ...prev,
        [side]: updatedSlots,
      }
    })
  }

  // ================= OYUNCU YÖNETİMİ =================
  const addPlayer = (data: Omit<Player, 'id' | 'created_at'>) => {
    const newId = generateUuid()
    const newPlayer: Player = {
      ...data,
      id: newId,
      created_at: new Date().toISOString(),
    }
    setPlayers(prev => [newPlayer, ...prev])
    syncPlayerToCloud(newPlayer)
  }

  const updatePlayer = (id: string, data: Partial<Player>) => {
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...data }
          syncPlayerToCloud(updated)
          if (data.power !== undefined && data.power !== p.power) {
            const historyEntry: PowerHistory = {
              id: `ph-${Date.now()}`,
              player_id: p.id,
              old_power: p.power,
              new_power: data.power,
              delta: data.power - p.power,
              reason: 'elle düzenleme',
              match_id: null,
              reverted_of: null,
              created_at: new Date().toISOString(),
            }
            setPowerHistory(ph => [historyEntry, ...ph])
          }
          return updated
        }
        return p
      })
    )
  }

  const togglePlayerActive = (id: string) => {
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, is_active: !p.is_active }
          syncPlayerToCloud(updated)
          return updated
        }
        return p
      })
    )
  }

  const deletePlayer = (id: string) => {
    const player = players.find(p => p.id === id)
    if (!player) return

    if (!confirm(`"${player.full_name}" adlı oyuncuyu sistemden silmek istediğinize emin misiniz?`)) {
      return
    }

    setLineupSlots(prev => {
      const nextSlots = {
        A: prev.A.map(s => (s.player_id === id ? { ...s, player_id: null } : s)),
        B: prev.B.map(s => (s.player_id === id ? { ...s, player_id: null } : s)),
      }
      if (teams.length >= 2) {
        syncSlotsToCloud(nextSlots.A, nextSlots.B, teams[0].id, teams[1].id)
      }
      return nextSlots
    })

    setPlayers(prev => prev.filter(p => p.id !== id))
    deletePlayerFromCloud(id)
  }

  // ================= MAÇ AKIŞI & DÜZENLEME =================
  const startMatch = (teamAName: string, teamBName: string) => {
    if (!currentLeague || currentLeague.status !== 'active') {
      alert('Maç başlatmak için önce aktif bir lig olmalıdır!')
      return
    }
    if (activeMatch) {
      alert('Zaten oynanmakta olan bir maç var!')
      return
    }

    const newMatch: Match = {
      id: `match-${Date.now()}`,
      league_id: currentLeague.id,
      status: 'playing',
      team_a_name: teamAName || teams[0].name,
      team_b_name: teamBName || teams[1].name,
      formation_a: teams[0].formation,
      formation_b: teams[1].formation,
      score_a: 0,
      score_b: 0,
      mvp_player_id: null,
      started_at: new Date().toISOString(),
      finished_at: null,
      created_at: new Date().toISOString(),
    }

    setActiveMatch(newMatch)
  }

  const cancelMatch = () => {
    if (!activeMatch) return
    if (confirm('Maçı iptal etmek istediğinize emin misiniz?')) {
      setActiveMatch(null)
    }
  }

  const finishMatch: AppContextType['finishMatch'] = (
    scoreA,
    scoreB,
    matchGoals,
    mvpPlayerId,
    applyMvpPowerBonus
  ) => {
    if (!activeMatch) return

    if (matchGoals.length !== scoreA + scoreB) {
      alert(`Gol sayısı toplam skora (${scoreA + scoreB}) eşit olmalıdır!`)
      return
    }

    const finishedMatch: Match = {
      ...activeMatch,
      status: 'finished',
      score_a: scoreA,
      score_b: scoreB,
      mvp_player_id: mvpPlayerId,
      finished_at: new Date().toISOString(),
    }

    const createdGoals: Goal[] = matchGoals.map((g, idx) => ({
      ...g,
      id: `goal-${Date.now()}-${idx}`,
      match_id: finishedMatch.id,
      created_at: new Date().toISOString(),
    }))

    setGoals(prev => [...prev, ...createdGoals])
    setMatches(prev => [finishedMatch, ...prev])
    setActiveMatch(null)

    if (applyMvpPowerBonus && mvpPlayerId) {
      const mvp = players.find(p => p.id === mvpPlayerId)
      if (mvp && mvp.power < 99) {
        const newPower = mvp.power + 1
        updatePlayer(mvp.id, { power: newPower })
        
        const bonusEntry: PowerHistory = {
          id: `ph-mvp-${Date.now()}`,
          player_id: mvp.id,
          old_power: mvp.power,
          new_power: newPower,
          delta: 1,
          reason: 'maçın adamı',
          match_id: finishedMatch.id,
          reverted_of: null,
          created_at: new Date().toISOString(),
        }
        setPowerHistory(ph => [bonusEntry, ...ph])
      }
    }
  }

  const editMatch: AppContextType['editMatch'] = (
    matchId,
    scoreA,
    scoreB,
    matchGoals,
    mvpPlayerId
  ) => {
    if (matchGoals.length !== scoreA + scoreB) {
      alert(`Gol sayısı toplam skora (${scoreA + scoreB}) eşit olmalıdır!`)
      return
    }

    setMatches(prev =>
      prev.map(m => (m.id === matchId ? { ...m, score_a: scoreA, score_b: scoreB, mvp_player_id: mvpPlayerId } : m))
    )

    setGoals(prev => {
      const filtered = prev.filter(g => g.match_id !== matchId)
      const updatedGoals: Goal[] = matchGoals.map((g, idx) => ({
        ...g,
        id: `goal-edit-${Date.now()}-${idx}`,
        match_id: matchId,
        created_at: new Date().toISOString(),
      }))
      return [...filtered, ...updatedGoals]
    })
  }

  const deleteMatch = (matchId: string, revertPowerBonus = false) => {
    if (!confirm('Bu maçı silmek istediğinize emin misiniz? Lig tablosu ve istatistikler otomatik yeniden hesaplanacaktır.')) return

    if (revertPowerBonus) {
      const historyToRevert = powerHistory.find(ph => ph.match_id === matchId && ph.reason === 'maçın adamı')
      if (historyToRevert) {
        revertPowerChange(historyToRevert.id)
      }
    }

    setMatches(prev => prev.filter(m => m.id !== matchId))
    setGoals(prev => prev.filter(g => g.match_id !== matchId))
  }

  // ================= LİG YÖNETİMİ =================
  const startNewLeague = (name: string) => {
    const newLeague: League = {
      id: `league-${Date.now()}`,
      name: name || `${new Date().toLocaleString('tr-TR', { month: 'long', year: 'numeric' })} Sezonu`,
      status: 'active',
      started_at: new Date().toISOString(),
      finished_at: null,
      champion_side: null,
      note: null,
      created_at: new Date().toISOString(),
    }
    setCurrentLeague(newLeague)
  }

  const finishCurrentLeague = () => {
    if (!currentLeague) return
    if (!confirm('Mevcut ligi bitirip şampiyonu ilan etmek istediğinize emin misiniz?')) return

    const champ = standings.length > 0 ? standings[0].side : null
    setCurrentLeague(prev => prev ? { ...prev, status: 'finished', finished_at: new Date().toISOString(), champion_side: champ } : null)
  }

  const reopenLeague = () => {
    if (!currentLeague) return
    if (!confirm('Bitirilmiş ligi yeniden açıp devam ettirmek istediğinize emin misiniz?')) return

    setCurrentLeague(prev => prev ? { ...prev, status: 'active', finished_at: null, champion_side: null } : null)
  }

  const resetLeague = () => {
    if (!currentLeague) return
    if (!confirm('Bu lige ait tüm maç ve gol kayıtları sıfırlanacaktır. Emin misiniz?')) return

    const leagueId = currentLeague.id
    setMatches(prev => prev.filter(m => m.league_id !== leagueId))
    const deletedMatchIds = new Set(matches.filter(m => m.league_id === leagueId).map(m => m.id))
    setGoals(prev => prev.filter(g => !deletedMatchIds.has(g.match_id)))
  }

  const deleteLeague = () => {
    if (!currentLeague) return
    if (!confirm('Mevcut ligi ve bu lige ait tüm maçları tamamen silmek istediğinize emin misiniz?')) return

    const leagueId = currentLeague.id
    setMatches(prev => prev.filter(m => m.league_id !== leagueId))
    const deletedMatchIds = new Set(matches.filter(m => m.league_id === leagueId).map(m => m.id))
    setGoals(prev => prev.filter(g => !deletedMatchIds.has(g.match_id)))
    setCurrentLeague(null)
  }

  // ================= GÜÇ GERİ ALMA & YEDEK =================
  const revertPowerChange = (historyId: string) => {
    const entry = powerHistory.find(ph => ph.id === historyId)
    if (!entry) return
    const targetPlayer = players.find(p => p.id === entry.player_id)
    if (!targetPlayer) return

    const restoredPower = entry.old_power
    setPlayers(prev =>
      prev.map(p => (p.id === targetPlayer.id ? { ...p, power: restoredPower } : p))
    )

    const revertEntry: PowerHistory = {
      id: `ph-rev-${Date.now()}`,
      player_id: targetPlayer.id,
      old_power: targetPlayer.power,
      new_power: restoredPower,
      delta: restoredPower - targetPlayer.power,
      reason: 'geri alma',
      match_id: entry.match_id,
      reverted_of: entry.id,
      created_at: new Date().toISOString(),
    }
    setPowerHistory(ph => [revertEntry, ...ph])
  }

  const exportBackupJson = () => {
    const data = {
      version: '1.2',
      exported_at: new Date().toISOString(),
      currentFormat,
      teams,
      players,
      lineupSlots,
      currentLeague,
      matches,
      goals,
      powerHistory,
    }

    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `halisaha-yedek-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetToDefaultData = () => {
    if (!confirm('Tüm özel verileriniz silinip örnek başlangıç verilerine dönülecek. Emin misiniz?')) return
    localStorage.clear()
    window.location.reload()
  }

  return (
    <AppContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        isVisitorPreview,
        setIsVisitorPreview,
        effectiveIsAdmin,
        currentFormat,
        teams,
        players,
        currentLeague,
        activeMatch,
        matches,
        goals,
        lineupSlots,
        extraPlayers,
        teamA_Average,
        teamB_Average,
        standings,
        playerStats,
        powerHistory,
        swapOrAssignSlot,
        assignPlayerToSlot,
        removePlayerFromSlot,
        changeFormation,
        changeMatchFormat,
        clearPitchToRibbon,
        loadLastMatchLineup,
        addPlayer,
        updatePlayer,
        togglePlayerActive,
        deletePlayer,
        startMatch,
        cancelMatch,
        finishMatch,
        editMatch,
        revertPowerChange,
        startNewLeague,
        finishCurrentLeague,
        reopenLeague,
        resetLeague,
        deleteLeague,
        deleteMatch,
        exportBackupJson,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within an AppProvider')
  return context
}
