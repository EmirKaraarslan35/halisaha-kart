import React, { useRef, useState } from 'react'
import { Player } from '../types'
import { FifaCard } from './FifaCard'
import { useApp } from '../context/AppContext'
import { toPng } from 'html-to-image'
import { X, Edit3, Share2, Flame, Target, Award, Check, Sparkles } from 'lucide-react'

interface CardDetailModalProps {
  player: Player | null
  onClose: () => void
  onEdit?: (player: Player) => void
  teamSide?: 'A' | 'B' | null
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  player,
  onClose,
  onEdit,
  teamSide,
}) => {
  const { effectiveIsAdmin, playerStats } = useApp()
  const cardShareRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [copiedSuccess, setCopiedSuccess] = useState(false)

  if (!player) return null

  const stats = playerStats.find(s => s.player_id === player.id)

  const handleShareCard = async () => {
    if (!cardShareRef.current) return
    try {
      setIsExporting(true)
      const dataUrl = await toPng(cardShareRef.current, {
        quality: 0.98,
        pixelRatio: 3, // Instagram Story kalitesinde kristal netlik
      })

      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `${player.full_name}-fut-card.png`, { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${player.full_name} FIFA Kartı`,
            text: `${player.full_name} (${player.power} OVR - ${player.position}) Halı Saha Resmi Kartı!`,
            files: [file],
          })
          setIsExporting(false)
          return
        }
      }

      const link = document.createElement('a')
      link.download = `${player.full_name.toLowerCase().replace(/\s+/g, '-')}-kart.png`
      link.href = dataUrl
      link.click()
      setCopiedSuccess(true)
      setTimeout(() => setCopiedSuccess(false), 2500)
    } catch (err) {
      console.error('Kart paylaşım hatası:', err)
      alert('Kart görseli oluşturulurken bir hata oluştu.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-sm flex flex-col items-center my-auto">
        
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition shadow-lg z-50"
        >
          <X size={18} />
        </button>

        {/* ================= INSTAGRAM / WHATSAPP PAYLAŞIM POSTERİ ================= */}
        <div
          ref={cardShareRef}
          className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black p-5 rounded-3xl border-2 border-amber-500/30 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden select-none"
        >
          {/* Stadyum Gece Projektör Işıkları */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Üst Şerit & Mühür */}
          <div className="w-full flex justify-between items-center mb-3 z-10 px-1 border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span className="fut-font text-lg text-amber-400 font-bold tracking-widest leading-none">HALISAHA.FUT</span>
            </div>
            <span className="text-[9px] text-amber-200/90 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full font-black tracking-wider uppercase">
              2026 SEZONU
            </span>
          </div>

          {/* Büyük FIFA Kartı */}
          <div className="w-full flex justify-center mb-3 z-10">
            <FifaCard player={player} size="large" teamSide={teamSide} />
          </div>

          {/* Lig Performans Rozetleri */}
          <div className="w-full grid grid-cols-3 gap-2 text-center z-10 mt-1">
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-md">
              <Flame size={14} className="mx-auto text-amber-500 mb-0.5" />
              <div className="fut-font text-lg font-black text-white">{stats?.total_goals || 0}</div>
              <div className="text-[8px] text-slate-400 uppercase font-black">Toplam Gol</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-md">
              <Target size={14} className="mx-auto text-sky-400 mb-0.5" />
              <div className="fut-font text-lg font-black text-white">{stats?.total_assists || 0}</div>
              <div className="text-[8px] text-slate-400 uppercase font-black">Toplam Asist</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-md">
              <Award size={14} className="mx-auto text-emerald-400 mb-0.5" />
              <div className="fut-font text-lg font-black text-white">{stats?.total_mvp || 0}</div>
              <div className="text-[8px] text-slate-400 uppercase font-black">MVP Ödülü</div>
            </div>
          </div>

          {/* Alt Resmi Hologram İmzası */}
          <div className="w-full text-center mt-3 z-10">
            <span className="text-[8px] font-bold tracking-widest uppercase text-slate-500">
              OFFICIAL ULTIMATE CARD • TÜM HAKLARI SAKLIDIR
            </span>
          </div>
        </div>

        {/* ================= KARTIMI PAYLAŞ BUTONU ================= */}
        <div className="w-full flex flex-col gap-2 mt-3">
          <button
            onClick={handleShareCard}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.4)] transition active:scale-95"
          >
            {copiedSuccess ? (
              <>
                <Check size={16} /> Kart İndirildi!
              </>
            ) : (
              <>
                <Share2 size={16} /> Kartımı Paylaş (WhatsApp / Instagram)
              </>
            )}
          </button>

          {effectiveIsAdmin && onEdit && (
            <button
              onClick={() => {
                onClose()
                onEdit(player)
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 py-2 rounded-xl text-xs font-bold transition"
            >
              <Edit3 size={13} />
              Oyuncu Bilgilerini Düzenle
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
