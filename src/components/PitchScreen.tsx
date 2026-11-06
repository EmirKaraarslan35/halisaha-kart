import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { Player, TeamSide } from '../types'
import { FifaCard } from './FifaCard'
import { PRESET_FORMATIONS } from '../lib/formations'
import { CardDetailModal } from './CardDetailModal'
import { toPng } from 'html-to-image'
import { Share2, Play, AlertCircle, X, Sliders, Eraser } from 'lucide-react'

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
    changeFormation,
    startMatch,
    cancelMatch,
    currentLeague,
  } = useApp()

  const pitchRef = useRef<HTMLDivElement>(null)
  const extraRibbonRef = useRef<HTMLDivElement>(null)

  // Seçili kart
  const [selectedItem, setSelectedItem] = useState<
    | { type: 'slot'; side: TeamSide; slotIndex: number; playerId: string | null }
    | { type: 'extra'; playerId: string }
    | null
  >(null)

  // Detay modalı
  const [inspectPlayer, setInspectPlayer] = useState<{ player: Player; side: TeamSide | null } | null>(null)

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

  // Tıklama ile Seçim / Yer Değiştirme
  const handleSlotClick = (side: TeamSide, slotIndex: number, playerId: string | null) => {
    if (activeMatch || !effectiveIsAdmin) {
      if (playerId) {
        const p = players.find(x => x.id === playerId)
        if (p) setInspectPlayer({ player: p, side })
      }
      return
    }

    if (!selectedItem) {
      if (playerId) {
        setSelectedItem({ type: 'slot', side, slotIndex, playerId })
      }
    } else {
      swapOrAssignSlot(selectedItem, { type: 'slot', side, slotIndex, playerId })
      setSelectedItem(null)
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
            Önizlemeyi Kapat
          </button>
        </div>
      )}

      {/* Üst Durum Çubuğu */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/10 bg-slate-950/95 z-30">
        <div className="flex items-center gap-2">
          <span className="fut-font text-xl font-bold tracking-widest text-amber-400">FUT.KADRO</span>
          {activeMatch ? (
            <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> MAÇ OYNANIYOR
            </span>
          ) : (
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              HAZIRLIK
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            disabled={isExporting}
            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            <Share2 size={13} />
            <span className="text-[11px] font-bold">Paylaş</span>
          </button>

          {effectiveIsAdmin && (
            activeMatch ? (
              <button
                onClick={cancelMatch}
                className="bg-red-950/80 hover:bg-red-900 border border-red-600/50 text-red-300 text-xs font-bold px-2.5 py-1 rounded-lg transition"
              >
                Maçı İptal Et
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!currentLeague || currentLeague.status !== 'active') {
                    alert('Maç başlatmak için önce aktif bir lig başlatmalısınız!')
                    return
                  }
                  setShowStartMatchModal(true)
                }}
                className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase px-3 py-1 rounded-lg shadow-lg tracking-wide transition active:scale-95"
              >
                <Play size={12} fill="currentColor" />
                <span>Başlat</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ================= HIZLI MAÇ FORMATI & SAHAYI BOŞALT (Yönetici) ================= */}
      {effectiveIsAdmin && !activeMatch && (
        <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs z-20">
          
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Format:</span>
            {[5, 6, 7, 8].map(count => (
              <button
                key={count}
                onClick={() => changeMatchFormat(count)}
                className={`
                  px-2 py-0.5 rounded-md text-[10px] font-black transition
                  ${currentFormat === count
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}
                `}
              >
                {count}v{count}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearPitchToRibbon}
              className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-md text-[10px] font-bold transition shadow-sm active:scale-95"
              title="Tüm oyuncuları sahadan çıkarıp alt yedek şeridine alır"
            >
              <Eraser size={11} className="text-amber-400" />
              <span>Sahayı Boşalt</span>
            </button>
          </div>

        </div>
      )}

      {/* Sayı Eşit Değilse Uyarı Rozeti */}
      {isUneven && (
        <div className="bg-amber-950/70 border-b border-amber-600/30 px-3 py-1 text-center text-[10px] text-amber-300 font-bold flex items-center justify-center gap-1.5">
          <AlertCircle size={12} />
          <span>Kadro dengesi: Takım A ({onPitchA} kişi) - Takım B ({onPitchB} kişi)</span>
        </div>
      )}

      {/* ================= GERÇEKÇİ STADYUM SAHASI (3D & PROJEKTÖR ETKİSİ) ================= */}
      <div
        ref={pitchRef}
        className="flex-1 stadium-pitch relative flex flex-col justify-between p-2 overflow-hidden border-x border-emerald-600/30 select-none"
      >
        {/* Saha Dış Sınır Çizgisi */}
        <div className="absolute inset-1.5 border border-white/35 pointer-events-none rounded-sm"></div>

        {/* Saha Orta Çizgisi, Çemberi ve Noktası */}
        <div className="absolute top-1/2 left-1.5 right-1.5 h-[2px] pitch-line -translate-y-1/2 z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/35 z-0 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 z-0 pointer-events-none shadow-[0_0_6px_#ffffff]"></div>

        {/* Üst Ceza Yayı (D-Box Arc) */}
        <div className="absolute top-[38px] left-1/2 -translate-x-1/2 w-16 h-8 border-b-2 border-white/35 rounded-b-full pointer-events-none z-0"></div>

        {/* Alt Ceza Yayı (D-Box Arc) */}
        <div className="absolute bottom-[38px] left-1/2 -translate-x-1/2 w-16 h-8 border-t-2 border-white/35 rounded-t-full pointer-events-none z-0"></div>

        {/* ============ TAKIM A (ÜST YARI) ============ */}
        <div className="relative z-10 flex flex-col flex-1 pb-1">
          
          {/* Takım A Başlığı & Güç Kartı */}
          <div className="flex items-center justify-between bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-xl border border-sky-500/40 mb-0.5 shadow-lg">
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
              <span className="fut-font text-xl text-emerald-400 font-black">{teamA_Average}</span>
            </div>
          </div>

          {/* Üst Ceza Sahası & Kale Ağı */}
          <div className="w-36 h-6 border-b-2 border-x-2 border-white/35 mx-auto -mt-0.5 mb-1 bg-white/5 goal-net relative pointer-events-none">
            {/* Penaltı Noktası */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_4px_#ffffff]"></div>
          </div>

          <div className="flex-1 flex flex-col justify-around py-0.5">
            {Object.keys(linesA).map(lineIdxStr => {
              const lineIdx = Number(lineIdxStr)
              const slotsInLine = linesA[lineIdx]
              return (
                <div key={`line-a-${lineIdx}`} className="flex justify-around items-center px-1">
                  {slotsInLine.map(slot => {
                    const player = players.find(p => p.id === slot.player_id)
                    const isSelected = selectedItem?.type === 'slot' && selectedItem.side === 'A' && selectedItem.slotIndex === slot.slot_index

                    return (
                      <div
                        key={slot.id}
                        onDoubleClick={() => player && setInspectPlayer({ player, side: 'A' })}
                        className="relative"
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
                          <div
                            onClick={() => handleSlotClick('A', slot.slot_index, null)}
                            className={`
                              w-[52px] h-[66px] fut-shield-mini border border-dashed border-white/40
                              bg-black/35 backdrop-blur-xs flex flex-col items-center justify-center
                              cursor-pointer transition-all hover:bg-white/10 active:scale-90
                              ${isSelected ? 'ring-2 ring-emerald-400 bg-emerald-950/40 shadow-[0_0_12px_#10b981]' : ''}
                            `}
                          >
                            <span className="text-[10px] font-black text-slate-300">{slot.position_label}</span>
                            <span className="text-[8px] text-slate-400 font-bold">+ Boş</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ============ TAKIM B (ALT YARI) ============ */}
        <div className="relative z-10 flex flex-col flex-1 pt-1 justify-between">
          <div className="flex-1 flex flex-col justify-around py-0.5">
            {Object.keys(linesB).reverse().map(lineIdxStr => {
              const lineIdx = Number(lineIdxStr)
              const slotsInLine = linesB[lineIdx]
              return (
                <div key={`line-b-${lineIdx}`} className="flex justify-around items-center px-1">
                  {slotsInLine.map(slot => {
                    const player = players.find(p => p.id === slot.player_id)
                    const isSelected = selectedItem?.type === 'slot' && selectedItem.side === 'B' && selectedItem.slotIndex === slot.slot_index

                    return (
                      <div
                        key={slot.id}
                        onDoubleClick={() => player && setInspectPlayer({ player, side: 'B' })}
                        className="relative"
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
                          <div
                            onClick={() => handleSlotClick('B', slot.slot_index, null)}
                            className={`
                              w-[52px] h-[66px] fut-shield-mini border border-dashed border-white/40
                              bg-black/35 backdrop-blur-xs flex flex-col items-center justify-center
                              cursor-pointer transition-all hover:bg-white/10 active:scale-90
                              ${isSelected ? 'ring-2 ring-emerald-400 bg-emerald-950/40 shadow-[0_0_12px_#10b981]' : ''}
                            `}
                          >
                            <span className="text-[10px] font-black text-slate-300">{slot.position_label}</span>
                            <span className="text-[8px] text-slate-400 font-bold">+ Boş</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Alt Ceza Sahası & Kale Ağı */}
          <div className="w-36 h-6 border-t-2 border-x-2 border-white/35 mx-auto mt-1 -mb-0.5 bg-white/5 goal-net relative pointer-events-none">
            {/* Penaltı Noktası */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_4px_#ffffff]"></div>
          </div>

          <div className="flex items-center justify-between bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/40 mt-0.5 shadow-lg">
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
              <span className="fut-font text-xl text-emerald-400 font-black">{teamB_Average}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ================= ALT EKSTRA ŞERİT (DOKUNMA VE YATAY KAYDIRMA GELİŞTİRİLDİ) ================= */}
      {extraPlayers.length > 0 && (
        <div className="bg-slate-950/95 border-t border-slate-800 px-3 py-2 z-20 shadow-2xl">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Yedek / Ekstra Şerit ({extraPlayers.length})
              </span>
              <span className="text-[9px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-bold">
                Kaydırılabilir ➔
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium">
              {selectedItem ? 'Hedef slota dokun' : 'Sahaya koymak için tıkla'}
            </span>
          </div>

          {/* Yatay Kaydırma Kutusu (Touch-scroll ve Scrollbar desteği) */}
          <div
            ref={extraRibbonRef}
            className="flex items-center gap-2.5 overflow-x-auto pb-2 smooth-scroll-x no-scrollbar select-none"
          >
            {extraPlayers.map(player => {
              const isSelected = selectedItem?.type === 'extra' && selectedItem.playerId === player.id
              return (
                <div key={player.id} className="flex-shrink-0">
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
