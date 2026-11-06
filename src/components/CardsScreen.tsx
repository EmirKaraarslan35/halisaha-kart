import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Player, POSITION_OPTIONS, PositionCode } from '../types'
import { FifaCard } from './FifaCard'
import { CardDetailModal } from './CardDetailModal'
import { Plus, Search, Zap, Edit, EyeOff, Check, X, Camera, Shield, Trash2 } from 'lucide-react'

export const CardsScreen: React.FC<{ onOpenAdminProfile?: (player: Player) => void }> = ({ onOpenAdminProfile }) => {
  const {
    effectiveIsAdmin,
    players,
    addPlayer,
    updatePlayer,
    togglePlayerActive,
    deletePlayer,
  } = useApp()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'active' | 'passive' | 'all'>('active')

  // Hızlı Misafir
  const [guestName, setGuestName] = useState('')
  const [guestPower, setGuestPower] = useState(70)

  // Oyuncu Ekle / Düzenle Modal
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  // Form State
  const [formName, setFormName] = useState('')
  const [formPos, setFormPos] = useState<PositionCode>('OS')
  const [formPower, setFormPower] = useState(75)
  const [formTeam, setFormTeam] = useState<'team-a' | 'team-b' | null>(null)
  const [formPhoto, setFormPhoto] = useState<string | null>(null)

  // Kart detay modalı
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null)

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (filterMode === 'active') return p.is_active
    if (filterMode === 'passive') return !p.is_active
    return true
  })

  const handleQuickGuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim()) return

    addPlayer({
      full_name: guestName.trim(),
      position: 'OS',
      power: Math.min(99, Math.max(1, guestPower)),
      default_team_id: null,
      photo_url: null,
      is_guest: true,
      is_active: true,
    })

    setGuestName('')
    setGuestPower(70)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 400
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 400, 400)
        const dataUrl = canvas.toDataURL('image/webp', 0.8)
        setFormPhoto(dataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const openNewModal = () => {
    setFormName('')
    setFormPos('OS')
    setFormPower(75)
    setFormTeam(null)
    setFormPhoto(null)
    setEditingPlayer(null)
    setIsNewModalOpen(true)
  }

  const openEditModal = (p: Player) => {
    setFormName(p.full_name)
    setFormPos(p.position as PositionCode)
    setFormPower(p.power)
    setFormTeam(p.default_team_id as any)
    setFormPhoto(p.photo_url)
    setEditingPlayer(p)
    setIsNewModalOpen(true)
  }

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return

    if (editingPlayer) {
      updatePlayer(editingPlayer.id, {
        full_name: formName.trim(),
        position: formPos,
        power: Math.min(99, Math.max(1, formPower)),
        default_team_id: formTeam,
        photo_url: formPhoto,
      })
    } else {
      addPlayer({
        full_name: formName.trim(),
        position: formPos,
        power: Math.min(99, Math.max(1, formPower)),
        default_team_id: formTeam,
        photo_url: formPhoto,
        is_guest: false,
        is_active: true,
      })
    }

    setIsNewModalOpen(false)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 space-y-4">
      
      {/* Üst Başlık & Yeni Ekle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Oyuncu Kartları</h2>
          <p className="text-xs text-slate-400">Tüm kadro havuzu ({players.length} Oyuncu)</p>
        </div>

        {effectiveIsAdmin && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase px-3 py-1.5 rounded-xl shadow-lg transition active:scale-95"
          >
            <Plus size={14} /> Yeni Kart
          </button>
        )}
      </div>

      {/* ================= 1. HIZLI MİSAFİR EKLEME BARI ================= */}
      {effectiveIsAdmin && (
        <form
          onSubmit={handleQuickGuest}
          className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-2 shadow-md"
        >
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase whitespace-nowrap pl-1">
            <Zap size={14} /> Hızlı Misafir
          </div>
          <input
            type="text"
            placeholder="Misafir Adı Soyadı"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            className="flex-1 min-w-[140px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
          />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold">Güç:</span>
            <input
              type="number"
              min="1"
              max="99"
              value={guestPower}
              onChange={e => setGuestPower(parseInt(e.target.value) || 60)}
              className="w-14 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white text-center font-bold"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition"
          >
            Ekle
          </button>
        </form>
      )}

      {/* ================= 2. FİLTRE VE ARAMA ================= */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Oyuncu ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>

        <select
          value={filterMode}
          onChange={e => setFilterMode(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold"
        >
          <option value="active">Sadece Aktifler</option>
          <option value="passive">Pasifleri Göster</option>
          <option value="all">Tüm Oyuncular</option>
        </select>
      </div>

      {/* ================= 3. KARTLAR IZGARASI ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredPlayers.map(player => (
          <div
            key={player.id}
            className={`
              bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center justify-between
              shadow-lg relative group transition hover:border-slate-700
              ${!player.is_active ? 'opacity-50 grayscale' : ''}
            `}
          >
            <div
              onClick={() => setInspectPlayer(player)}
              className="cursor-pointer my-1 transform group-hover:scale-105 transition"
            >
              <FifaCard player={player} size="medium" />
            </div>

            {/* Yönetici İşlem Butonları: Düzenle, Pasife Al / Sil */}
            {effectiveIsAdmin && (
              <div className="w-full flex items-center justify-between pt-2 border-t border-white/5 mt-1 gap-1">
                <button
                  onClick={() => openEditModal(player)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5"
                >
                  <Edit size={11} /> Düzenle
                </button>

                {onOpenAdminProfile && (
                  <button
                    onClick={() => onOpenAdminProfile(player)}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-0.5"
                    title="Grafik ve Güç Geçmişi"
                  >
                    <Shield size={11} /> Profil
                  </button>
                )}

                <div className="flex items-center gap-1">
                  {/* Pasife Al / Aktif Et */}
                  <button
                    onClick={() => togglePlayerActive(player.id)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                    title={player.is_active ? 'Pasife Al' : 'Aktif Et'}
                  >
                    {player.is_active ? <EyeOff size={12} /> : <Check size={12} className="text-emerald-400" />}
                  </button>

                  {/* Tamamen Sil */}
                  <button
                    onClick={() => deletePlayer(player.id)}
                    className="text-[10px] text-red-400 hover:text-red-300"
                    title="Oyuncuyu Tamamen Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ================= MODAL: OYUNCU EKLE / DÜZENLE ================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm shadow-2xl my-auto space-y-4">
            
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {editingPlayer ? 'Oyuncu Kartını Düzenle' : 'Yeni Oyuncu Kartı Oluştur'}
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-3">
              <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center overflow-hidden">
                  {formPhoto ? (
                    <img src={formPhoto} alt="Önizleme" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">FOTO YOK</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs text-amber-400 font-bold cursor-pointer hover:text-amber-300">
                    <Camera size={14} /> Fotoğraf Seç / Çek
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">Kare kırpılıp 400x400 WebP'ye dönüştürülür.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Ad Soyad</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Ana Mevki</label>
                <select
                  value={formPos}
                  onChange={e => setFormPos(e.target.value as PositionCode)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {POSITION_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Güç (OVR)</span>
                  <span className="text-amber-400 fut-font text-lg">{formPower}</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="99"
                  value={formPower}
                  onChange={e => setFormPower(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Varsayılan Takım</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormTeam('team-a')}
                    className={`p-2 rounded-xl border text-center font-bold ${formTeam === 'team-a' ? 'bg-sky-950 border-sky-400 text-sky-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Takım A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTeam('team-b')}
                    className={`p-2 rounded-xl border text-center font-bold ${formTeam === 'team-b' ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Takım B
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTeam(null)}
                    className={`p-2 rounded-xl border text-center font-bold ${formTeam === null ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Yok
                  </button>
                </div>
              </div>

              {editingPlayer && (
                <div className="pt-2 border-t border-white/10 flex justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      deletePlayer(editingPlayer.id)
                      setIsNewModalOpen(false)
                    }}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-bold"
                  >
                    <Trash2 size={13} />
                    Oyuncuyu Tamamen Sil
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-lg transition mt-4"
              >
                {editingPlayer ? 'Değişiklikleri Kaydet' : 'Kartı Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}

      {inspectPlayer && (
        <CardDetailModal
          player={inspectPlayer}
          onClose={() => setInspectPlayer(null)}
          onEdit={p => {
            setInspectPlayer(null)
            openEditModal(p)
          }}
        />
      )}

    </div>
  )
}
