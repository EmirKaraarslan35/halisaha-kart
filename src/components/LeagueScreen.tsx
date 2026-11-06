import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Trophy, Award, Target, Flame, Plus, RotateCcw, Trash2, RefreshCw } from 'lucide-react'

export const LeagueScreen: React.FC = () => {
  const {
    effectiveIsAdmin,
    currentLeague,
    standings,
    playerStats,
    startNewLeague,
    finishCurrentLeague,
    reopenLeague,
    resetLeague,
    deleteLeague,
  } = useApp()

  const [showNewLeagueModal, setShowNewLeagueModal] = useState(false)
  const [newLeagueName, setNewLeagueName] = useState('')

  const topScorers = [...playerStats]
    .filter(p => p.total_goals > 0)
    .sort((a, b) => b.total_goals - a.total_goals)

  const topAssists = [...playerStats]
    .filter(p => p.total_assists > 0)
    .sort((a, b) => b.total_assists - a.total_assists)

  const topMvps = [...playerStats]
    .filter(p => p.total_mvp > 0)
    .sort((a, b) => b.total_mvp - a.total_mvp)

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 space-y-4">
      
      {/* Üst Başlık & Lig Durumu */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            {currentLeague ? currentLeague.name : 'Lig'}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            {currentLeague?.status === 'active' ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Aktif Sezon
              </span>
            ) : currentLeague?.status === 'finished' ? (
              <span className="text-[10px] text-amber-400 font-bold uppercase">
                🏆 Tamamlandı (Şampiyon: {currentLeague.champion_side === 'A' ? 'Takım A' : 'Takım B'})
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold">Aktif Lig Yok</span>
            )}
          </div>
        </div>

        {/* Yönetici Aksiyonları: Bitir, Devam Ettir, Sıfırla, Sil */}
        {effectiveIsAdmin && (
          <div className="flex flex-wrap items-center gap-1.5">
            {currentLeague?.status === 'active' ? (
              <>
                <button
                  onClick={finishCurrentLeague}
                  className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  Ligi Bitir
                </button>
                <button
                  onClick={resetLeague}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold px-2 py-1.5 rounded-xl transition"
                  title="Skorları sıfırla"
                >
                  <RefreshCw size={13} />
                </button>
              </>
            ) : currentLeague?.status === 'finished' ? (
              <>
                <button
                  onClick={reopenLeague}
                  className="flex items-center gap-1 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                >
                  <RotateCcw size={12} />
                  Ligi Devam Ettir (Yeniden Aç)
                </button>
                <button
                  onClick={() => setShowNewLeagueModal(true)}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-lg transition"
                >
                  <Plus size={13} />
                  Yeni Lig
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowNewLeagueModal(true)}
                className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black uppercase px-3 py-1.5 rounded-xl shadow-lg transition"
              >
                <Plus size={13} />
                Yeni Lig Başlat
              </button>
            )}

            {currentLeague && (
              <button
                onClick={deleteLeague}
                className="bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-400 text-xs font-bold px-2 py-1.5 rounded-xl transition"
                title="Ligi tamamen sil"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= 1. TAKIM PUAN DURUMU (STANDINGS) ================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Puan Durumu</span>
          <span className="text-[10px] text-slate-500">G: 3 | B: 1 | M: 0</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-black/40 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Takım</th>
                <th className="py-2.5 px-2 text-center">O</th>
                <th className="py-2.5 px-2 text-center">G</th>
                <th className="py-2.5 px-2 text-center">B</th>
                <th className="py-2.5 px-2 text-center">M</th>
                <th className="py-2.5 px-2 text-center">AG</th>
                <th className="py-2.5 px-2 text-center">YG</th>
                <th className="py-2.5 px-2 text-center">Av</th>
                <th className="py-2.5 px-3 text-center font-black text-amber-400">P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {standings.map((row, idx) => {
                const isLeader = idx === 0 && row.matches_played > 0
                return (
                  <tr
                    key={row.side}
                    className={row.side === 'A' ? 'bg-sky-950/20' : 'bg-amber-950/20'}
                  >
                    <td className="py-3 px-3 font-black flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.side === 'A' ? 'bg-sky-400' : 'bg-amber-400'}`} />
                      <span className={row.side === 'A' ? 'text-sky-300' : 'text-amber-300'}>
                        {row.team_name}
                      </span>
                      {isLeader && <span className="text-xs" title="Lider">👑</span>}
                    </td>
                    <td className="py-3 px-2 text-center font-bold">{row.matches_played}</td>
                    <td className="py-3 px-2 text-center text-emerald-400">{row.wins}</td>
                    <td className="py-3 px-2 text-center text-slate-400">{row.draws}</td>
                    <td className="py-3 px-2 text-center text-red-400">{row.losses}</td>
                    <td className="py-3 px-2 text-center text-slate-300">{row.goals_for}</td>
                    <td className="py-3 px-2 text-center text-slate-400">{row.goals_against}</td>
                    <td className={`py-3 px-2 text-center font-bold ${row.goal_diff > 0 ? 'text-emerald-400' : row.goal_diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {row.goal_diff > 0 ? `+${row.goal_diff}` : row.goal_diff}
                    </td>
                    <td className="py-3 px-3 text-center font-black fut-font text-xl text-white">
                      {row.points}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 2. BİREYSEL KRALLIKLAR (GOL & ASİST & MVP) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 uppercase tracking-wider mb-2.5">
            <Flame size={14} className="text-amber-500" /> Gol Krallığı
          </div>

          {topScorers.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">Henüz gol atılmadı.</div>
          ) : (
            <div className="space-y-2 text-xs">
              {topScorers.slice(0, 5).map((p, idx) => (
                <div key={p.player_id} className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-center font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-white">{p.full_name}</span>
                    <span className="text-[10px] text-slate-400">({p.position})</span>
                  </div>
                  <span className="fut-font text-amber-400 text-base font-black">
                    {p.total_goals} GOL
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-black text-sky-400 uppercase tracking-wider mb-2.5">
            <Target size={14} className="text-sky-500" /> Asist Krallığı
          </div>

          {topAssists.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">Henüz asist yapılmadı.</div>
          ) : (
            <div className="space-y-2 text-xs">
              {topAssists.slice(0, 5).map((p, idx) => (
                <div key={p.player_id} className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-center font-black ${idx === 0 ? 'text-sky-400' : 'text-slate-500'}`}>
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-white">{p.full_name}</span>
                    <span className="text-[10px] text-slate-400">({p.position})</span>
                  </div>
                  <span className="fut-font text-sky-400 text-base font-black">
                    {p.total_assists} ASİST
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider mb-2.5">
            <Award size={14} className="text-emerald-500" /> Maçın Adamı (MVP)
          </div>

          {topMvps.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">Henüz MVP seçilmedi.</div>
          ) : (
            <div className="space-y-2 text-xs">
              {topMvps.slice(0, 5).map((p, idx) => (
                <div key={p.player_id} className="flex justify-between items-center border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 text-center font-black ${idx === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {idx + 1}.
                    </span>
                    <span className="font-bold text-white">{p.full_name}</span>
                  </div>
                  <span className="fut-font text-emerald-400 text-base font-black">
                    {p.total_mvp} KEZ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: YENİ LİG BAŞLAT ================= */}
      {showNewLeagueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3">
              Yeni Lig Sezonu Başlat
            </h3>

            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">Lig / Sezon Adı</label>
              <input
                type="text"
                placeholder="Örn. Aralık 2026 Sezonu"
                value={newLeagueName}
                onChange={e => setNewLeagueName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowNewLeagueModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  startNewLeague(newLeagueName)
                  setShowNewLeagueModal(false)
                  setNewLeagueName('')
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2 rounded-xl"
              >
                Başlat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
