import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Player, TeamSide } from '../types'
import { FifaCard } from './FifaCard'
import { PRESET_FORMATIONS } from '../lib/formations'
import { CardDetailModal } from './CardDetailModal'
import { toPng } from 'html-to-image'
import {
  Share2,
  Play,
  AlertCircle,
  X,
  Sliders,
  Eraser,
  UserCheck,
  ArrowUpDown,
  LogOut,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export const PitchScreen: React.FC<{ onNavigateToMatches?: () => void }> = () => {
  const {
    effectiveIsAdmin,
    isVisitorPreview,
    setIsVisitorPreview,
    teams,
    players,
    lineupSlots,
    extraPlayers,
    teamA_Average,
    teamB_Average,
    activeMatch,
    currentFormat,
    changeMatchFormat,
    clearPitchToRibbon,
    swapOrAssignSlot,
    assignPlayerToSlot,
    removePlayerFromSlot,
    changeFormation,
    startMatch,
    cancelMatch,
    currentLeague,
  } = useApp()

  const pitchRef = useRef<HTMLDivElement>(null)
  const extraRibbonRef = useRef<HTMLDivElement>(null)

  // Saha Görünümü: Tüm Saha / Sadece Takım A / Sadece Takım B
  const [pitchView, setPitchView] = useState<'all' | 'A' | 'B'>('all')

  // Yedek Şeridini Küçültme/Gizleme (Ekran alanını sahaya kazandırır)
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false)

  // Seçili kart (ekstra şeritten veya sahadan)
  const [selectedItem, setSelectedItem] = useState<
    | { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null }
    | { type: 'extra'; playerId: string }
    | null
  >(null)

  // Detay modalı (Büyük FUT kartı)
  const [inspectPlayer, setInspectPlayer] = useState<{ player: Player; side: TeamSide | null } | null>(null)

  // Mobil Slota Oyuncu Seçici Modal (Boş veya dolu slota doğrudan yedekten seçme)
  const [slotPicker, setSlotPicker] = useState<{
    side: TeamSide
    slotIndex: number
    positionLabel: string
  } | null>(null)

  // Sahadaki dolu slota dokunulduğunda çıkan hızlı aksiyon menüsü
  const [slotActionMenu, setSlotActionMenu] = useState<{
    side: TeamSide
    slotIndex: number
    player: Player
    positionLabel: string
  } | null>(null)

  // Diziliş Değiştirme Modalı
  const [formationModalSide, setFormationModalSide] = useState<TeamSide | null>(null)

  // Maç Başlatma Modalı
  const [showStartMatchModal, setShowStartMatchModal] = useState(false)
  const [matchTeamAName, setMatchTeamAName] = useState(teams[0]?.name || 'Kuzey FC')
  const [matchTeamBName, setMatchTeamBName] = useState(teams[1]?.name || 'Güney FC')

  // Paylaşım Butonu
  const [isExporting, setIsExporting] = useState(false)

  const handleShare = async () => {
    if (!pitchRef.current) return
    try {
      setIsExporting(true)
      const dataUrl = await toPng(pitchRef.current, { quality: 0.95, pixelRatio: 2 })
      
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'halisaha-kadro.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Halı Saha Maç Kadrosu',
            text: `${teams[0].name} (${teamA_Average}) vs ${teams[1].name} (${teamB_Average})`,
            files: [file],
          })
          setIsExporting(false)
          return
        }
      }

      const link = document.createElement('a')
      link.download = `kadro-${new Date().toISOString().split('T')[0]}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Paylaşım hatası:', err)
      alert('Görsel oluşturulurken bir hata oluştu.')
    } finally {
      setIsExporting(false)
    }
  }

  // Tıklama ile Seçim / Yer Değiştirme / Modal Açma
  const handleSlotClick = (side: TeamSide, slotIndex: number, playerId: string | null) => {
    if (activeMatch || !effectiveIsAdmin) {
      if (playerId) {
        const p = players.find(x => x.id === playerId)
        if (p) setInspectPlayer({ player: p, side })
      }
      return
    }

    // 1. Zaten bir yedek kartı veya başka bir slot seçiliyse doğrudan yerleştir
    if (selectedItem) {
      if (selectedItem.type === 'extra') {
        assignPlayerToSlot(selectedItem.playerId, side, slotIndex)
        setSelectedItem(null)
        return
      }
      if (selectedItem.type === 'slot') {
        swapOrAssignSlot(selectedItem, { type: 'slot', side, slotIndex, playerId })
        setSelectedItem(null)
        return
      }
    }

    // 2. Seçili kart yoksa:
    if (!playerId) {
      // Boş slota tıklandı -> Hızlı yedek oyuncu seçici modalını aç
      const slot = lineupSlots[side].find(s => s.slot_index === slotIndex)
      setSlotPicker({
        side,
        slotIndex,
        positionLabel: slot?.position_label || 'MEVKİ',
      })
    } else {
      // Dolu slota tıklandı -> Aksiyon menüsünü aç
      const p = players.find(x => x.id === playerId)
      const slot = lineupSlots[side].find(s => s.slot_index === slotIndex)
      if (p) {
        setSlotActionMenu({
          side,
          slotIndex,
          player: p,
          positionLabel: slot?.position_label || p.position,
        })
      }
    }
  }

  const handleExtraClick = (playerId: string) => {
    if (activeMatch || !effectiveIsAdmin) {
      const p = players.find(x => x.id === playerId)
      if (p) setInspectPlayer({ player: p, side: null })
      return
    }

    if (!selectedItem) {
      setSelectedItem({ type: 'extra', playerId })
    } else if (selectedItem.type === 'extra' && selectedItem.playerId === playerId) {
      setSelectedItem(null)
    } else if (selectedItem.type === 'slot') {
      swapOrAssignSlot(selectedItem, { type: 'extra' })
      setSelectedItem(null)
    }
  }

  const groupSlotsByLine = (slots: typeof lineupSlots.A) => {
    const lines: Record<number, typeof slots> = {}
    slots.forEach(s => {
      if (!lines[s.line_index]) lines[s.line_index] = []
      lines[s.line_index].push(s)
    })
    return lines
  }

  const linesA = groupSlotsByLine(lineupSlots.A)
  const linesB = groupSlotsByLine(lineupSlots.B)

  const onPitchA = lineupSlots.A.filter(s => s.player_id).length
  const onPitchB = lineupSlots.B.filter(s => s.player_id).length
  const isUneven = onPitchA !== onPitchB

  // Seçili ekstra oyuncu detayı
  const selectedExtraPlayer =
    selectedItem?.type === 'extra' ? players.find(p => p.id === selectedItem.playerId) : null

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      
      {/* Ziyaretçi Önizleme Modu Bildirimi */}
      {isVisitorPreview && (
        <div className="bg-sky-950 border-b border-sky-500/40 px-3 py-1 text-center text-xs text-sky-200 font-bold flex items-center justify-between z-40">
          <span>👁️ Ziyaretçi Önizleme Modu (Yönetim araçları gizli)</span>
          <button
            onClick={() => setIsVisitorPreview(false)}
            className="bg-sky-800 hover:bg-sky-700 text-white text-[10px] px-2 py-0.5 rounded-lg transition"
          >
            Yöneticiye Dön
          </button>
        </div>
      )}

      {/* ================= ÜST AKSİYON BARI ================= */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between z-30 shadow-md">
        
        {/* Sol: Başlık veya Canlı Maç Göstergesi */}
        <div className="flex items-center gap-2">
          <span className="fut-font text-base sm:text-lg font-black tracking-wider bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            FUT.KADRO
          </span>
          {activeMatch ? (
            <span className="flex items-center gap-1 bg-red-950/80 border border-red-600/50 text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              CANLI
            </span>
          ) : (
            <span className="bg-slate-800 text-emerald-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
              HAZIRLIK
            </span>
          )}
        </div>

        {/* Sağ: Aksiyon Butonları */}
        <div className="flex items-center gap-1.5">
          {/* Kadroyu Paylaş Butonu */}
          <button
            onClick={handleShare}
            disabled={isExporting}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-50"
            title="Kadro görselini WhatsApp / Instagram için indir veya paylaş"
          >
            <Share2 size={12} className="text-amber-400" />
            <span className="hidden sm:inline">Paylaş</span>
          </button>

          {/* Maç Başlat / Canlı Maçı Bitir */}
          {effectiveIsAdmin && (
            activeMatch ? (
              <button
                onClick={cancelMatch}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95"
              >
                <X size={12} />
                <span>İptal</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMatchTeamAName(teams[0]?.name || 'Kuzey FC')
                  setMatchTeamBName(teams[1]?.name || 'Güney FC')
                  setShowStartMatchModal(true)
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                <span>BAŞLAT</span>
              </button>
            )
          )}
        </div>

      </div>

      {/* ================= GÖRÜNÜM SEÇİCİ, FORMAT & SAHAYI BOŞALT BARI ================= */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-2.5 py-1 flex items-center justify-between text-xs z-20 gap-1 overflow-x-auto no-scrollbar">
        
        {/* Takım Odak Tabları: Tüm Saha / Takım A / Takım B */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-shrink-0">
          <button
            onClick={() => setPitchView('all')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition ${pitchView === 'all' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Tüm Saha
          </button>
          <button
            onClick={() => setPitchView('A')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition ${pitchView === 'A' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {teams[0]?.name || 'Takım A'}
          </button>
          <button
            onClick={() => setPitchView('B')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-black transition ${pitchView === 'B' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {teams[1]?.name || 'Takım B'}
          </button>
        </div>

        {/* Format Seçici & Sahayı Boşalt */}
        {effectiveIsAdmin && !activeMatch && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {[5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  onClick={() => changeMatchFormat(count)}
                  className={`
                    px-1.5 py-0.5 rounded text-[10px] font-black transition
                    ${currentFormat === count
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'}
                  `}
                >
                  {count}v{count}
                </button>
              ))}
            </div>

            <button
              onClick={clearPitchToRibbon}
              className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-bold transition shadow-sm active:scale-95"
              title="Tüm oyuncuları sahadan çıkarıp alt yedek şeridine alır"
            >
              <Eraser size={11} className="text-amber-400" />
              <span>Boşalt</span>
            </button>
          </div>
        )}

      </div>

      {/* Sayı Eşit Değilse Uyarı Rozeti */}
      {isUneven && (
        <div className="bg-amber-950/70 border-b border-amber-600/30 px-3 py-0.5 text-center text-[10px] text-amber-300 font-bold flex items-center justify-center gap-1.5 z-20">
          <AlertCircle size={11} />
          <span>Kadro dengesi: {teams[0]?.name} ({onPitchA}) - {teams[1]?.name} ({onPitchB})</span>
        </div>
      )}

      {/* ================= GERÇEKÇİ STADYUM SAHASI (DİKEY KAYDIRILABİLİR ALAN) ================= */}
      <div className="flex-1 overflow-y-auto overscroll-contain relative no-scrollbar">
        <div
          ref={pitchRef}
          className={`
            stadium-pitch relative flex flex-col justify-between p-2 border-x border-emerald-600/30 select-none
            ${pitchView === 'all' ? 'min-h-[580px] sm:min-h-[640px]' : 'min-h-[380px] h-full'}
          `}
        >
          {/* Saha Dış Sınır Çizgisi */}
          <div className="absolute inset-1.5 border border-white/35 pointer-events-none rounded-sm"></div>

          {/* Saha Orta Çizgisi ve Çemberi (Tüm Saha Modunda) */}
          {pitchView === 'all' && (
            <>
              <div className="absolute top-1/2 left-1.5 right-1.5 h-[2px] pitch-line -translate-y-1/2 z-0 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 z-0 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 z-0 pointer-events-none shadow-[0_0_6px_#ffffff]"></div>
              <div className="absolute top-[36px] left-1/2 -translate-x-1/2 w-14 h-7 border-b-2 border-white/35 rounded-b-full pointer-events-none z-0"></div>
              <div className="absolute bottom-[36px] left-1/2 -translate-x-1/2 w-14 h-7 border-t-2 border-white/35 rounded-t-full pointer-events-none z-0"></div>
            </>
          )}

          {/* ============ TAKIM A (ÜST YARI) ============ */}
          {(pitchView === 'all' || pitchView === 'A') && (
            <div className="relative z-10 flex flex-col flex-1 pb-1">
              
              {/* Takım A Başlığı & Güç Kartı */}
              <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-sky-500/40 mb-0.5 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
                  <span className="text-xs font-black tracking-wide text-sky-200 uppercase">{teams[0]?.name || 'Takım A'}</span>
                  {effectiveIsAdmin && !activeMatch && (
                    <button
                      onClick={() => setFormationModalSide('A')}
                      className="flex items-center gap-1 text-[9px] text-slate-300 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded-md font-bold transition"
                    >
                      <span>{teams[0]?.formation.slice(1).join('-')}</span>
                      <Sliders size={9} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">OVR</span>
                  <span className="fut-font text-lg text-emerald-400 font-black">{teamA_Average}</span>
                </div>
              </div>

              {/* Üst Ceza Sahası & Kale Ağı */}
              <div className="w-32 h-5 border-b-2 border-x-2 border-white/35 mx-auto -mt-0.5 mb-1 bg-white/5 goal-net relative pointer-events-none">
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_4px_#ffffff]"></div>
              </div>

              <div className="flex-1 flex flex-col justify-around py-0.5 gap-1">
                {Object.keys(linesA).map(lineIdxStr => {
                  const lineIdx = Number(lineIdxStr)
                  const slotsInLine = linesA[lineIdx]
                  return (
                    <div key={`line-a-${lineIdx}`} className="flex justify-around items-center px-0.5">
                      {slotsInLine.map(slot => {
                        const player = players.find(p => p.id === slot.player_id)
                        const isSelected =
                          selectedItem?.type === 'slot' &&
                          selectedItem.side === 'A' &&
                          selectedItem.slotIndex === slot.slot_index

                        return (
                          <div
                            key={slot.id}
                            className="relative touch-manipulation"
                          >
                            {player ? (
                              <FifaCard
                                player={player}
                                size="mini"
                                positionLabel={slot.position_label}
                                isSelected={isSelected}
                                teamSide="A"
                                onClick={() => handleSlotClick('A', slot.slot_index, player.id)}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSlotClick('A', slot.slot_index, null)}
                                className={`
                                  w-[45px] h-[58px] sm:w-[52px] sm:h-[66px] fut-shield-mini border-2 border-dashed
                                  flex flex-col items-center justify-center
                                  transition-all active:scale-95 touch-manipulation cursor-pointer select-none
                                  ${isSelected
                                    ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_12px_#10b981]'
                                    : selectedItem
                                    ? 'border-amber-400/80 bg-amber-950/30 animate-pulse hover:bg-amber-900/40'
                                    : 'border-white/40 bg-black/40 hover:bg-white/10'}
                                `}
                              >
                                <span className="text-[10px] font-black text-slate-200 tracking-wider">
                                  {slot.position_label}
                                </span>
                                <span className="text-[7.5px] text-amber-400 font-bold uppercase mt-0.5 leading-none">
                                  {selectedItem ? 'Koy' : '+ Boş'}
                                </span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ============ TAKIM B (ALT YARI) ============ */}
          {(pitchView === 'all' || pitchView === 'B') && (
            <div className="relative z-10 flex flex-col flex-1 pt-1 justify-between">
              
              {/* Tek Takım Görünümündeyse Başlığı Üstte Göster */}
              {pitchView === 'B' && (
                <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/40 mb-1 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
                    <span className="text-xs font-black tracking-wide text-amber-200 uppercase">{teams[1]?.name || 'Takım B'}</span>
                    {effectiveIsAdmin && !activeMatch && (
                      <button
                        onClick={() => setFormationModalSide('B')}
                        className="flex items-center gap-1 text-[9px] text-slate-300 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded-md font-bold transition"
                      >
                        <span>{teams[1]?.formation.slice(1).join('-')}</span>
                        <Sliders size={9} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">OVR</span>
                    <span className="fut-font text-lg text-emerald-400 font-black">{teamB_Average}</span>
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col justify-around py-0.5 gap-1">
                {Object.keys(linesB).reverse().map(lineIdxStr => {
                  const lineIdx = Number(lineIdxStr)
                  const slotsInLine = linesB[lineIdx]
                  return (
                    <div key={`line-b-${lineIdx}`} className="flex justify-around items-center px-0.5">
                      {slotsInLine.map(slot => {
                        const player = players.find(p => p.id === slot.player_id)
                        const isSelected =
                          selectedItem?.type === 'slot' &&
                          selectedItem.side === 'B' &&
                          selectedItem.slotIndex === slot.slot_index

                        return (
                          <div
                            key={slot.id}
                            className="relative touch-manipulation"
                          >
                            {player ? (
                              <FifaCard
                                player={player}
                                size="mini"
                                positionLabel={slot.position_label}
                                isSelected={isSelected}
                                teamSide="B"
                                onClick={() => handleSlotClick('B', slot.slot_index, player.id)}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSlotClick('B', slot.slot_index, null)}
                                className={`
                                  w-[45px] h-[58px] sm:w-[52px] sm:h-[66px] fut-shield-mini border-2 border-dashed
                                  flex flex-col items-center justify-center
                                  transition-all active:scale-95 touch-manipulation cursor-pointer select-none
                                  ${isSelected
                                    ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_12px_#10b981]'
                                    : selectedItem
                                    ? 'border-amber-400/80 bg-amber-950/30 animate-pulse hover:bg-amber-900/40'
                                    : 'border-white/40 bg-black/40 hover:bg-white/10'}
                                `}
                              >
                                <span className="text-[10px] font-black text-slate-200 tracking-wider">
                                  {slot.position_label}
                                </span>
                                <span className="text-[7.5px] text-amber-400 font-bold uppercase mt-0.5 leading-none">
                                  {selectedItem ? 'Koy' : '+ Boş'}
                                </span>
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Alt Ceza Sahası & Kale Ağı */}
              <div className="w-32 h-5 border-t-2 border-x-2 border-white/35 mx-auto mt-1 -mb-0.5 bg-white/5 goal-net relative pointer-events-none">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_4px_#ffffff]"></div>
              </div>

              {/* Tüm Saha Modunda Takım B Başlığı En Altta */}
              {pitchView === 'all' && (
                <div className="flex items-center justify-between bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/40 mt-0.5 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
                    <span className="text-xs font-black tracking-wide text-amber-200 uppercase">{teams[1]?.name || 'Takım B'}</span>
                    {effectiveIsAdmin && !activeMatch && (
                      <button
                        onClick={() => setFormationModalSide('B')}
                        className="flex items-center gap-1 text-[9px] text-slate-300 bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded-md font-bold transition"
                      >
                        <span>{teams[1]?.formation.slice(1).join('-')}</span>
                        <Sliders size={9} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">OVR</span>
                    <span className="fut-font text-lg text-emerald-400 font-black">{teamB_Average}</span>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* ================= SEÇİLEN YEDEK OYUNCU YÜZEN BİLDİRİMİ ================= */}
      {selectedExtraPlayer && (
        <div className="bg-emerald-950 border-t border-emerald-500 px-3 py-1.5 flex items-center justify-between text-xs text-white z-30 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <div>
              <span className="font-black text-amber-300">{selectedExtraPlayer.full_name}</span>
              <span className="text-[10px] text-emerald-300 ml-1 font-bold">({selectedExtraPlayer.position} - {selectedExtraPlayer.power})</span>
              <span className="text-[10px] text-slate-300 ml-1.5">seçildi. Sahadaki slota dokun!</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="bg-emerald-800 hover:bg-emerald-700 text-white text-[10px] px-2 py-0.5 rounded font-bold"
          >
            İptal
          </button>
        </div>
      )}

      {/* ================= ALT EKSTRA ŞERİT (KÜÇÜLTÜLEBİLİR & YATAY KAYDIRMALI) ================= */}
      {extraPlayers.length > 0 && (
        isRibbonCollapsed ? (
          <div className="bg-slate-950 border-t border-slate-800 px-3 py-1 z-20 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-black uppercase text-amber-400 flex-shrink-0">
                Yedekler ({extraPlayers.length}):
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {extraPlayers.map(p => `${p.full_name} (${p.position})`).join(', ')}
              </span>
            </div>
            <button
              onClick={() => setIsRibbonCollapsed(false)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-bold transition flex items-center gap-1 flex-shrink-0"
            >
              <span>Yedekleri Aç</span>
              <ChevronUp size={12} />
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-1.5 z-20 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  Yedekler ({extraPlayers.length})
                </span>
                <span className="text-[9px] text-slate-400 bg-slate-900 border border-slate-800 px-1 py-0.2 rounded font-bold">
                  Kaydır ➔
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 font-medium">
                  {selectedItem ? 'Sahadaki slota dokun' : 'Sahaya koymak için dokun'}
                </span>
                <button
                  onClick={() => setIsRibbonCollapsed(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 transition"
                  title="Yedek şeridini gizle (sahaya yer açar)"
                >
                  <span>Gizle</span>
                  <ChevronDown size={11} />
                </button>
              </div>
            </div>

            {/* Yatay Kaydırma Kutusu */}
            <div
              ref={extraRibbonRef}
              className="flex items-center gap-2 overflow-x-auto pb-1 smooth-scroll-x no-scrollbar select-none"
            >
              {extraPlayers.map(player => {
                const isSelected = selectedItem?.type === 'extra' && selectedItem.playerId === player.id
                return (
                  <div key={player.id} className="flex-shrink-0 touch-manipulation">
                    <FifaCard
                      player={player}
                      size="mini"
                      isSelected={isSelected}
                      onClick={() => handleExtraClick(player.id)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* ================= MODAL: DOĞRUDAN SLOTA OYUNCU SEÇİCİ ================= */}
      {slotPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-4 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  {slotPicker.side === 'A' ? teams[0]?.name : teams[1]?.name} Kadrosu
                </span>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-amber-400 font-extrabold">{slotPicker.positionLabel}</span> Pozisyonuna Oyuncu Seç
                </h3>
              </div>
              <button
                onClick={() => setSlotPicker(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {extraPlayers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Yedek şeridinde hiç oyuncu kalmadı. "Oyuncular" sekmesinden yeni oyuncu ekleyebilirsiniz.
                </div>
              ) : (
                [...extraPlayers]
                  .sort((a, b) => {
                    const aMatches = a.position === slotPicker.positionLabel ? 1 : 0
                    const bMatches = b.position === slotPicker.positionLabel ? 1 : 0
                    if (bMatches !== aMatches) return bMatches - aMatches
                    return b.power - a.power
                  })
                  .map(p => {
                    const isPerfectMatch = p.position === slotPicker.positionLabel
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          assignPlayerToSlot(p.id, slotPicker.side, slotPicker.slotIndex)
                          setSlotPicker(null)
                        }}
                        className={`
                          flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition active:scale-[0.98]
                          ${isPerfectMatch
                            ? 'bg-amber-950/30 border-amber-500/50 hover:bg-amber-900/40'
                            : 'bg-slate-800/80 border-slate-700 hover:bg-slate-700'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.full_name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-600"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center font-black text-amber-400 border border-slate-600">
                              {p.full_name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm">{p.full_name}</span>
                              {isPerfectMatch && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-black">
                                  Tam Uyumlu
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>Mevki: <strong className="text-slate-200">{p.position}</strong></span>
                              <span>•</span>
                              <span>Güç: <strong className="text-amber-400">{p.power}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow"
                        >
                          <Check size={14} />
                          <span>Koy</span>
                        </button>
                      </div>
                    )
                  })
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setSlotPicker(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SAHADAKİ OYUNCU İÇİN HIZLI İŞLEM MENÜSÜ ================= */}
      {slotActionMenu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-md">
                  {slotActionMenu.positionLabel}
                </span>
                <h3 className="text-sm font-black text-white">{slotActionMenu.player.full_name}</h3>
              </div>
              <button
                onClick={() => setSlotActionMenu(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-3">
              <button
                onClick={() => {
                  const targetSide = slotActionMenu.side
                  const targetSlotIndex = slotActionMenu.slotIndex
                  const targetLabel = slotActionMenu.positionLabel
                  setSlotActionMenu(null)
                  setSlotPicker({
                    side: targetSide,
                    slotIndex: targetSlotIndex,
                    positionLabel: targetLabel,
                  })
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs p-3 rounded-xl flex items-center justify-between transition active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={15} className="text-amber-400" />
                  <span>Başka Oyuncuyla Değiştir</span>
                </div>
                <span className="text-[10px] text-slate-400">Yedeklerden Seç ➔</span>
              </button>

              <button
                onClick={() => {
                  removePlayerFromSlot(slotActionMenu.side, slotActionMenu.slotIndex)
                  setSlotActionMenu(null)
                }}
                className="w-full bg-red-950/40 hover:bg-red-950/80 border border-red-500/30 text-red-300 font-bold text-xs p-3 rounded-xl flex items-center justify-between transition active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <LogOut size={15} className="text-red-400" />
                  <span>Sahadan Çıkar (Yedeğe Al)</span>
                </div>
                <span className="text-[10px] text-red-400/80">Boşalt</span>
              </button>

              <button
                onClick={() => {
                  const p = slotActionMenu.player
                  const side = slotActionMenu.side
                  setSlotActionMenu(null)
                  setInspectPlayer({ player: p, side })
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs p-3 rounded-xl flex items-center justify-between transition active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <Eye size={15} className="text-sky-400" />
                  <span>Büyük FUT Kartını İncele</span>
                </div>
                <span className="text-[10px] text-sky-400">Detay</span>
              </button>
            </div>

            <button
              onClick={() => setSlotActionMenu(null)}
              className="w-full bg-slate-950 text-slate-400 hover:text-white text-xs font-bold py-2 rounded-xl"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: DİZİLİŞ SEÇİCİ ================= */}
      {formationModalSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {formationModalSide === 'A' ? teams[0].name : teams[1].name} Dizilişi
              </h3>
              <button onClick={() => setFormationModalSide(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="text-xs text-slate-400 mb-1">Hazır Dizilişler:</div>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_FORMATIONS.filter(p => p.totalPlayers === currentFormat).map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      changeFormation(formationModalSide, preset.lines)
                      setFormationModalSide(null)
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left text-xs transition"
                  >
                    <div className="font-bold text-white">{preset.name}</div>
                    <div className="text-[10px] text-amber-400">{preset.totalPlayers} Kişilik</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MAÇ BAŞLAT ================= */}
      {showStartMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Play size={15} fill="currentColor" /> Maçı Başlat
              </h3>
              <button onClick={() => setShowStartMatchModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Maç başladığında o anki kadro kopyalanır ve <b>kadro kilitlenir</b>. Maç bitene kadar oyuncu değişikliği yapılamaz.
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-bold text-sky-400 block mb-1">Takım A İsmi</label>
                <input
                  type="text"
                  value={matchTeamAName}
                  onChange={e => setMatchTeamAName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-400 block mb-1">Takım B İsmi</label>
                <input
                  type="text"
                  value={matchTeamBName}
                  onChange={e => setMatchTeamBName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              onClick={() => {
                startMatch(matchTeamAName, matchTeamBName)
                setShowStartMatchModal(false)
              }}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-lg transition active:scale-95"
            >
              Onayla ve Maçı Başlat
            </button>
          </div>
        </div>
      )}

      {/* Kart Detay Modalı */}
      {inspectPlayer && (
        <CardDetailModal
          player={inspectPlayer.player}
          teamSide={inspectPlayer.side}
          onClose={() => setInspectPlayer(null)}
        />
      )}

    </div>
  )
}
