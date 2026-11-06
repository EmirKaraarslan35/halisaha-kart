import React from 'react'
import { Player, PowerHistory } from '../types'
import { useApp } from '../context/AppContext'
import { X, TrendingUp, RotateCcw, Award, Flame, Target } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

interface AdminProfileModalProps {
  player: Player | null
  onClose: () => void
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({ player, onClose }) => {
  const { powerHistory, revertPowerChange, playerStats } = useApp()

  if (!player) return null

  // Bu oyuncuya ait güç geçmişi
  const playerHistory = powerHistory
    .filter(ph => ph.player_id === player.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // İstatistik verisi
  const stats = playerStats.find(s => s.player_id === player.id)

  // Recharts için veri noktaları (İlk güçten bugüne)
  const chartData = [
    {
      date: 'Başlangıç',
      power: playerHistory.length > 0 ? playerHistory[0].old_power : player.power,
    },
    ...playerHistory.map(ph => ({
      date: new Date(ph.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      power: ph.new_power,
    })),
  ]

  // Eğer geçmiş yoksa tek nokta olmasın diye günceli ekle
  if (chartData.length === 1) {
    chartData.push({ date: 'Güncel', power: player.power })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-lg shadow-2xl my-auto space-y-4">
        
        {/* Başlık */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-amber-500/50 flex items-center justify-center font-black text-amber-300">
              {player.power}
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase">{player.full_name}</h3>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Yönetici Özel Profili • {player.position}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* İstatistik Rozetleri */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <Flame size={14} className="mx-auto text-amber-500 mb-1" />
            <div className="fut-font text-lg font-black text-white">{stats?.total_goals || 0}</div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">Toplam Gol</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <Target size={14} className="mx-auto text-sky-400 mb-1" />
            <div className="fut-font text-lg font-black text-white">{stats?.total_assists || 0}</div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">Toplam Asist</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <Award size={14} className="mx-auto text-emerald-400 mb-1" />
            <div className="fut-font text-lg font-black text-white">{stats?.total_mvp || 0}</div>
            <div className="text-[9px] text-slate-400 uppercase font-bold">MVP Sayısı</div>
          </div>
        </div>

        {/* ================= GÜÇ GRAFİĞİ (RECHARTS) ================= */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            <TrendingUp size={14} className="text-amber-400" />
            Güç Gelişim Grafiği (Zamana Göre)
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="power"
                  name="Güç"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ================= GÜÇ GEÇMİŞİ LİSTESİ & GERİ ALMA ================= */}
        <div>
          <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            Güç Değişim Geçmişi
          </div>

          {playerHistory.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-800">
              Bu oyuncu için henüz bir güç değişimi kaydedilmedi.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {[...playerHistory].reverse().map(ph => (
                <div
                  key={ph.id}
                  className="bg-slate-950 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-black ${ph.delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {ph.delta > 0 ? `+${ph.delta}` : ph.delta}
                      </span>
                      <span className="font-bold text-slate-200">({ph.old_power} → {ph.new_power})</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                        {ph.reason}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {new Date(ph.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Geri Al Butonu */}
                  <button
                    onClick={() => revertPowerChange(ph.id)}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-600/30 px-2 py-1 rounded-lg transition"
                    title="Bu değişimi geri al"
                  >
                    <RotateCcw size={11} /> Geri Al
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
