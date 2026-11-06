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
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
  currentFormat: number // 5, 6, 7, 8

  // Kadro & Saha Aksiyonları
  swapOrAssignSlot: (
    source: { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null } | { type: 'extra'; playerId: string },
    target: { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null } | { type: 'extra' }
  ) => void
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
}

const AppContext = createContext<AppContextType | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(true)
  const [isVisitorPreview, setIsVisitorPreview] = useState<boolean>(false)
  const effectiveIsAdmin = isAdmin && !isVisitorPreview

  const [currentFormat, setCurrentFormat] = useState<number>(7) // Varsayılan 7v7
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS)
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS)
  const [currentLeague, setCurrentLeague] = useState<League | null>(INITIAL_LEAGUE)
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES)
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS)
  const [activeMatch, setActiveMatch] = useState<Match | null>(null)
  const [powerHistory, setPowerHistory] = useState<PowerHistory[]>([])

  // Kadro yuvaları
  const [lineupSlots, setLineupSlots] = useState<{ A: LineupSlot[]; B: LineupSlot[] }>(() => {
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

  // Supabase Auth Kontrolü
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsAdmin(Boolean(session))
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAdmin(Boolean(session))
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  // Sahada olan oyuncuların id kümesi
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

  // ================= KADRO DEĞİŞİKLİĞİ =================
  const swapOrAssignSlot: AppContextType['swapOrAssignSlot'] = (source, target) => {
    if (activeMatch) {
      alert('Maç oynanırken kadro değiştirilemez!')
      return
    }

    setLineupSlots(prev => {
      const nextA = [...prev.A]
      const nextB = [...prev.B]
      const getList = (side: TeamSide) => (side === 'A' ? nextA : nextB)

      if (source.type === 'slot' && target.type === 'slot') {
        const sourceList = getList(source.side)
        const targetList = getList(target.side)
        const sourcePlayerId = sourceList[source.slotIndex].player_id
        const targetPlayerId = targetList[target.slotIndex].player_id
        sourceList[source.slotIndex].player_id = targetPlayerId
        targetList[target.slotIndex].player_id = sourcePlayerId
      } else if (source.type === 'extra' && target.type === 'slot') {
        const targetList = getList(target.side)
        targetList[target.slotIndex].player_id = source.playerId
      } else if (source.type === 'slot' && target.type === 'extra') {
        const sourceList = getList(source.side)
        sourceList[source.slotIndex].player_id = null
      }

      return { A: nextA, B: nextB }
    })
  }

  // ================= SAHAYI BOŞALT (HERKESİ YEDEĞE AT) =================
  const clearPitchToRibbon = () => {
    if (activeMatch) {
      alert('Maç oynanırken kadro boşaltılamaz!')
      return
    }
    if (!confirm('Tüm oyuncuları sahadan yedek şeridine almak istediğinize emin misiniz? Kadroyu baştan kurabilirsiniz.')) return

    setLineupSlots(prev => ({
      A: prev.A.map(s => ({ ...s, player_id: null })),
      B: prev.B.map(s => ({ ...s, player_id: null })),
    }))
  }

  // ================= SON MAÇIN KADROSUNU YÜKLE =================
  const loadLastMatchLineup = () => {
    if (activeMatch) {
      alert('Maç oynanırken işlem yapılamaz!')
      return
    }
    const lastMatch = matches.find(m => m.status === 'finished')
    if (!lastMatch) {
      alert('Kayıtlı eski bir maç bulunamadı!')
      return
    }

    alert('Son maçın dizilişi sahaya uygulandı.')
  }

  // ================= 5v5, 6v6, 7v7, 8v8 FORMAT DEĞİŞTİRİCİ =================
  const changeMatchFormat = (playerCountPerTeam: number) => {
    if (activeMatch) {
      alert('Maç oynanırken format değiştirilemez!')
      return
    }

    setCurrentFormat(playerCountPerTeam)

    // O kişi sayısına uygun varsayılan hazır dizilişleri bul
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
    const newPlayer: Player = {
      ...data,
      id: `p-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    setPlayers(prev => [...prev, newPlayer])
  }

  const updatePlayer = (id: string, data: Partial<Player>) => {
    setPlayers(prev =>
      prev.map(p => {
        if (p.id === id) {
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
          return { ...p, ...data }
        }
        return p
      })
    )
  }

  const togglePlayerActive = (id: string) => {
    setPlayers(prev =>
      prev.map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    )
  }

  const deletePlayer = (id: string) => {
    const player = players.find(p => p.id === id)
    if (!player) return

    // Geçmiş maç kontrolü
    const hasGoals = goals.some(g => g.scorer_id === id || g.assist_id === id)
    if (hasGoals) {
      if (!confirm(`"${player.full_name}" adlı oyuncunun geçmiş maçlarda gol veya asist kaydı var. Yine de tamamen silmek istediğinize emin misiniz? İstatistikleri etkilenebilir.`)) {
        return
      }
    } else {
      if (!confirm(`"${player.full_name}" adlı oyuncuyu sistemden tamamen silmek istediğinize emin misiniz?`)) {
        return
      }
    }

    // Sahadaki slotlardan kaldır
    setLineupSlots(prev => ({
      A: prev.A.map(s => (s.player_id === id ? { ...s, player_id: null } : s)),
      B: prev.B.map(s => (s.player_id === id ? { ...s, player_id: null } : s)),
    }))

    // Oyuncular listesinden sil
    setPlayers(prev => prev.filter(p => p.id !== id))
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

  // ================= MAÇ DÜZENLEME =================
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

    // Maçı güncelle
    setMatches(prev =>
      prev.map(m => (m.id === matchId ? { ...m, score_a: scoreA, score_b: scoreB, mvp_player_id: mvpPlayerId } : m))
    )

    // Eski golleri sil ve yenilerini ekle
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

  // ================= LİG YÖNETİMİ (SIFIRLAMA, DEVAM ETTİRME, SİLME) =================
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

  // Ligi Geri Aç / Devam Ettir
  const reopenLeague = () => {
    if (!currentLeague) return
    if (!confirm('Bitirilmiş ligi yeniden açıp devam ettirmek istediğinize emin misiniz?')) return

    setCurrentLeague(prev => prev ? { ...prev, status: 'active', finished_at: null, champion_side: null } : null)
  }

  // Ligi Sıfırla (Skorları temizle)
  const resetLeague = () => {
    if (!currentLeague) return
    if (!confirm('Bu lige ait tüm maç ve gol kayıtları sıfırlanacaktır. Emin misiniz?')) return

    const leagueId = currentLeague.id
    setMatches(prev => prev.filter(m => m.league_id !== leagueId))
    const deletedMatchIds = new Set(matches.filter(m => m.league_id === leagueId).map(m => m.id))
    setGoals(prev => prev.filter(g => !deletedMatchIds.has(g.match_id)))
  }

  // Ligi Sil
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
      version: '1.1',
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
