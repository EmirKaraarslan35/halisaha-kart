import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Goal, Player, TeamSide, Match } from '../types'
import { Trash2, Edit3, Award, Calendar, CheckCircle } from 'lucide-react'

export const MatchesScreen: React.FC = () => {
  const {
    effectiveIsAdmin,
    activeMatch,
    matches,
    goals,
    players,
    lineupSlots,
    finishMatch,
    editMatch,
    cancelMatch,
    deleteMatch,
  } = useApp()

  // Maç Bitirme / Düzenleme Modal State'i
  const [showModal, setShowModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [matchGoals, setMatchGoals] = useState<Omit<Goal, 'id' | 'match_id'>[]>([])
  const [mvpPlayerId, setMvpPlayerId] = useState<string | null>(null)
  const [applyMvpBonus, setApplyMvpBonus] = useState(true)

  // Genişletilmiş maç detayı
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)

  // Aktif maçtaki oyuncular listesi
  const matchPlayersA = lineupSlots.A.map(s => players.find(p => p.id === s.player_id)).filter((p): p is Player => Boolean(p))
  const matchPlayersB = lineupSlots.B.map(s => players.find(p => p.id === s.player_id)).filter((p): p is Player => Boolean(p))
  const allMatchPlayers = [...matchPlayersA, ...matchPlayersB]

  // Gol Ekleme
  const handleAddGoal = (creditedSide: TeamSide) => {
    const targetPool = creditedSide === 'A' ? matchPlayersA : matchPlayersB
    const defaultScorer = targetPool[0] || players[0]
    if (!defaultScorer) {
      alert('Oyuncu bulunamadı!')
      return
    }

    const newGoal: Omit<Goal, 'id' | 'match_id'> = {
      scorer_id: defaultScorer.id,
      assist_id: null,
      is_own_goal: false,
      credited_side: creditedSide,
    }
    setMatchGoals(prev => [...prev, newGoal])
  }

  const handleRemoveGoal = (index: number) => {
    setMatchGoals(prev => prev.filter((_, i) => i !== index))
  }

  const handleGoalChange = (index: number, updates: Partial<Omit<Goal, 'id' | 'match_id'>>) => {
    setMatchGoals(prev =>
      prev.map((g, i) => {
        if (i === index) {
          const next = { ...g, ...updates }
          if (next.is_own_goal) next.assist_id = null
          return next
        }
        return g
      })
    )
  }

  const totalRequiredGoals = scoreA + scoreB
  const isGoalCountValid = matchGoals.length === totalRequiredGoals

  const openFinishModal = () => {
    setEditingMatch(null)
    setScoreA(0)
    setScoreB(0)
    setMatchGoals([])
    setMvpPlayerId(allMatchPlayers[0]?.id || null)
    setApplyMvpBonus(true)
    setShowModal(true)
  }

  const openEditModal = (m: Match) => {
    setEditingMatch(m)
    setScoreA(m.score_a)
    setScoreB(m.score_b)
    const existingGoals = goals.filter(g => g.match_id === m.id).map(g => ({
      scorer_id: g.scorer_id,
      assist_id: g.assist_id,
      is_own_goal: g.is_own_goal,
      credited_side: g.credited_side,
    }))
    setMatchGoals(existingGoals)
    setMvpPlayerId(m.mvp_player_id)
    setApplyMvpBonus(false)
    setShowModal(true)
  }

  const handleModalSubmit = () => {
    if (!isGoalCountValid) {
      alert(`Girilen gol sayısı (${matchGoals.length}), toplam skora (${totalRequiredGoals}) eşit olmalıdır!`)
      return
    }

    if (editingMatch) {
      // Düzenleme
      editMatch(editingMatch.id, scoreA, scoreB, matchGoals, mvpPlayerId)
    } else {
      // Yeni bitirilen maç
      finishMatch(scoreA, scoreB, matchGoals, mvpPlayerId, applyMvpBonus)
    }

    setShowModal(false)
    setEditingMatch(null)
    setMatchGoals([])
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 space-y-4">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Maçlar & Geçmiş</h2>
          <p className="text-xs text-slate-400">Oynanan tüm maçlar ve sonuç detayları</p>
        </div>
      </div>

      {/* ================= 1. AKTİF MAÇ KARTI ================= */}
      {activeMatch && (
        <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-2 border-red-500/50 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-black text-red-400 uppercase tracking-widest animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-400"></span> MAÇ OYNANIYOR
            </span>
            <span className="text-[10px] text-slate-400">Kadro Kilitlendi</span>
          </div>

          <div className="flex items-center justify-around my-2 text-center">
            <div className="flex-1">
              <div className="text-xs font-bold text-sky-400 truncate">{activeMatch.team_a_name}</div>
              <div className="text-[10px] text-slate-400">{activeMatch.formation_a.slice(1).join('-')}</div>
            </div>
            <div className="px-3">
              <span className="fut-font text-2xl font-black text-slate-500">VS</span>
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-400 truncate">{activeMatch.team_b_name}</div>
              <div className="text-[10px] text-slate-400">{activeMatch.formation_b.slice(1).join('-')}</div>
            </div>
          </div>

          {effectiveIsAdmin && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={openFinishModal}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-lg transition active:scale-95"
              >
                Maçı Bitir (Skor ve Gol Girişi)
              </button>
              <button
                onClick={cancelMatch}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3 rounded-xl border border-slate-700"
              >
                İptal Et
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= 2. BİTEN MAÇLAR LİSTESİ ================= */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Tamamlanan Maçlar ({matches.length})</h3>

        {matches.length === 0 ? (
          <div className="text-center py-10 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <Calendar size={32} className="mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-400">Henüz tamamlanmış bir maç yok.</p>
          </div>
        ) : (
          matches.map(m => {
            const isExpanded = expandedMatchId === m.id
            const matchGoalsList = goals.filter(g => g.match_id === m.id)
            const mvpPlayer = players.find(p => p.id === m.mvp_player_id)

            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition"
              >
                <div
                  onClick={() => setExpandedMatchId(isExpanded ? null : m.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 mb-1">
                      {new Date(m.started_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-xs text-sky-400 truncate max-w-[110px]">{m.team_a_name}</div>
                      <div className="fut-font text-xl font-black text-white px-2 py-0.5 bg-black/40 rounded-lg">
                        {m.score_a} - {m.score_b}
                      </div>
                      <div className="font-bold text-xs text-amber-400 truncate max-w-[110px]">{m.team_b_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {mvpPlayer && (
                      <div className="hidden sm:flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] text-amber-300 font-bold">
                        <Award size={11} /> {mvpPlayer.full_name}
                      </div>
                    )}
                    <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
                    {mvpPlayer && (
                      <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-600/30 p-2 rounded-xl text-xs text-amber-200">
                        <Award size={15} className="text-amber-400" />
                        <div>
                          <span className="font-bold">Maçın Adamı (MVP):</span> {mvpPlayer.full_name} ({mvpPlayer.power} OVR)
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Goller & Asistler</div>
                      {matchGoalsList.length === 0 ? (
                        <div className="text-xs text-slate-500">Gol kaydı bulunmuyor.</div>
                      ) : (
                        <div className="space-y-1.5 text-xs">
                          {matchGoalsList.map((g, gIdx) => {
                            const scorer = players.find(p => p.id === g.scorer_id)
                            const assist = g.assist_id ? players.find(p => p.id === g.assist_id) : null
                            return (
                              <div key={gIdx} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                                <div className="flex items-center gap-2">
                                  <span>{g.is_own_goal ? '⚠️' : '⚽'}</span>
                                  <span className={`font-bold ${g.is_own_goal ? 'text-red-400' : 'text-white'}`}>
                                    {scorer?.full_name || 'Bilinmeyen'} {g.is_own_goal && '(Kendi Kalesine)'}
                                  </span>
                                  {assist && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      (Asist: {assist.full_name})
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${g.credited_side === 'A' ? 'bg-sky-950 text-sky-300' : 'bg-amber-950 text-amber-300'}`}>
                                  {g.credited_side === 'A' ? m.team_a_name : m.team_b_name}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Yönetici Aksiyonları: DÜZENLE & SİL */}
                    {effectiveIsAdmin && (
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(m)}
                          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl transition font-bold"
                        >
                          <Edit3 size={13} />
                          Skor & Golleri Düzenle
                        </button>
                        <button
                          onClick={() => deleteMatch(m.id, true)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-xl transition"
                        >
                          <Trash2 size={13} />
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ================= MODAL: MAÇ BİTİR / DÜZENLE ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl my-auto space-y-4">
            
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">
                {editingMatch ? 'Maç Kaydını Düzenle' : 'Maç Sonu Raporu'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Skor Girişi */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-xs font-bold text-sky-400 mb-1">{editingMatch ? editingMatch.team_a_name : activeMatch?.team_a_name}</div>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={e => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-12 text-center text-3xl font-black bg-slate-900 border-2 border-sky-500/50 rounded-xl text-white fut-font"
                  />
                </div>
                <div className="text-2xl font-black text-slate-600 fut-font">:</div>
                <div className="text-center">
                  <div className="text-xs font-bold text-amber-400 mb-1">{editingMatch ? editingMatch.team_b_name : activeMatch?.team_b_name}</div>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={e => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-12 text-center text-3xl font-black bg-slate-900 border-2 border-amber-500/50 rounded-xl text-white fut-font"
                  />
                </div>
              </div>

              <div className={`mt-2 text-[10px] font-bold py-1 px-2 rounded-full inline-block ${isGoalCountValid ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'}`}>
                {isGoalCountValid ? `Toplam ${totalRequiredGoals} Gol Girildi (${matchGoals.length}/${totalRequiredGoals} Eşleşti ✓)` : `Lütfen skora uygun tam ${totalRequiredGoals} gol girin (Şu an: ${matchGoals.length})`}
              </div>
            </div>

            {/* Gol Satırları */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-300 uppercase">Goller ({matchGoals.length})</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleAddGoal('A')}
                    className="text-[10px] bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-600/40 px-2 py-1 rounded-lg font-bold"
                  >
                    + Takım A Golü
                  </button>
                  <button
                    onClick={() => handleAddGoal('B')}
                    className="text-[10px] bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-600/40 px-2 py-1 rounded-lg font-bold"
                  >
                    + Takım B Golü
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {matchGoals.map((g, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400">Gol #{idx + 1} ({g.credited_side === 'A' ? 'Takım A' : 'Takım B'})</span>
                      <button onClick={() => handleRemoveGoal(idx)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-0.5">Golü Atan</label>
                        <select
                          value={g.scorer_id}
                          onChange={e => handleGoalChange(idx, { scorer_id: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white"
                        >
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-slate-400 block mb-0.5">Asist (İsteğe Bağlı)</label>
                        <select
                          value={g.assist_id || ''}
                          disabled={g.is_own_goal}
                          onChange={e => handleGoalChange(idx, { assist_id: e.target.value || null })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white disabled:opacity-50"
                        >
                          <option value="">(Asistsiz)</option>
                          {players
                            .filter(p => p.id !== g.scorer_id)
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`edit-og-${idx}`}
                        checked={g.is_own_goal}
                        onChange={e => handleGoalChange(idx, { is_own_goal: e.target.checked })}
                        className="accent-amber-500 rounded"
                      />
                      <label htmlFor={`edit-og-${idx}`} className="text-[10px] text-slate-400 cursor-pointer">
                        Kendi Kalesine Gol (Rakip takım skoruna yazar, gol krallığına eklenmez)
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MVP ve Güç */}
            <div className="bg-gradient-to-b from-amber-950/40 to-slate-950 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
              <label className="text-xs font-black text-amber-300 block uppercase tracking-wider">
                ⭐ Maçın Adamı (MVP)
              </label>
              <select
                value={mvpPlayerId || ''}
                onChange={e => setMvpPlayerId(e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white font-bold"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.power} OVR - {p.position})</option>
                ))}
              </select>

              {!editingMatch && mvpPlayerId && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-200">
                      {players.find(p => p.id === mvpPlayerId)?.full_name}'e +1 Güç Ödülü
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Mevcut: {players.find(p => p.id === mvpPlayerId)?.power} → Yeni:{' '}
                      <span className="font-bold text-emerald-400">
                        {Math.min(99, (players.find(p => p.id === mvpPlayerId)?.power || 0) + 1)}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={applyMvpBonus}
                    onChange={e => setApplyMvpBonus(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleModalSubmit}
              disabled={!isGoalCountValid}
              className={`
                w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-lg
                ${isGoalCountValid
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
              `}
            >
              {editingMatch ? 'Değişiklikleri Kaydet' : 'Maçı Bitir ve Lig Tablosunu Güncelle'}
            </button>

          </div>
        </div>
      )}

    </div>
  )
}
