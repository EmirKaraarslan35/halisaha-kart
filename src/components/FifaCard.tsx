import React from 'react'
import { Player, getCardTier, getInitials, getShortName } from '../types'

interface FifaCardProps {
  player: Player
  size?: 'mini' | 'medium' | 'large'
  positionLabel?: string
  isSelected?: boolean
  onClick?: () => void
  teamSide?: 'A' | 'B' | null
  className?: string
}

export const FifaCard: React.FC<FifaCardProps> = ({
  player,
  size = 'medium',
  positionLabel,
  isSelected = false,
  onClick,
  teamSide,
  className = '',
}) => {
  const tier = getCardTier(player.power)
  const displayPos = positionLabel || player.position
  const initials = getInitials(player.full_name)
  const shortName = getShortName(player.full_name)

  const isShiny = tier === 'special' || tier === 'gold'

  const tierStyles = {
    special: {
      outer: 'fut-special-bg',
      inner: 'fut-special-inner',
      textNum: 'text-indigo-100',
      textPos: 'text-indigo-300',
      badge: 'border-indigo-400/50 text-indigo-200 bg-indigo-950/80',
      ring: 'ring-indigo-400',
      avatarBorder: 'border-indigo-400/60 from-indigo-800/60 to-black/95 text-indigo-100',
    },
    gold: {
      outer: 'fut-gold-bg',
      inner: 'fut-gold-inner',
      textNum: 'text-amber-100',
      textPos: 'text-amber-300',
      badge: 'border-amber-400/50 text-amber-200 bg-amber-950/80',
      ring: 'ring-amber-400',
      avatarBorder: 'border-amber-400/60 from-amber-700/60 to-black/95 text-amber-100',
    },
    silver: {
      outer: 'fut-silver-bg',
      inner: 'fut-silver-inner',
      textNum: 'text-slate-100',
      textPos: 'text-slate-300',
      badge: 'border-slate-400/50 text-slate-300 bg-slate-900/80',
      ring: 'ring-slate-300',
      avatarBorder: 'border-slate-400/60 from-slate-700/60 to-black/95 text-slate-200',
    },
    bronze: {
      outer: 'fut-bronze-bg',
      inner: 'fut-bronze-inner',
      textNum: 'text-amber-100',
      textPos: 'text-amber-300',
      badge: 'border-amber-600/50 text-amber-300 bg-amber-950/80',
      ring: 'ring-amber-600',
      avatarBorder: 'border-amber-600/60 from-amber-950/60 to-black/95 text-amber-200',
    },
  }[tier]

  // ================= 1. MİNİ BOYUT (Sahada) =================
  if (size === 'mini') {
    return (
      <div
        onClick={onClick}
        className={`
          ${tierStyles.outer} p-[1.5px] fut-shield-mini w-[45px] h-[58px] sm:w-[52px] sm:h-[66px] shadow-lg
          cursor-pointer select-none relative transition-all duration-150 ease-out
          ${isShiny ? 'shimmer-effect' : ''}
          ${isSelected ? 'scale-110 ring-2 ring-emerald-400 shadow-[0_0_16px_#10b981] z-30' : 'hover:scale-105 active:scale-90'}
          ${className}
        `}
      >
        <div className={`${tierStyles.inner} fut-shield-mini w-full h-full p-1 flex flex-col items-center justify-between text-white relative`}>
          
          <div className="w-full flex items-start justify-between">
            <div className="flex flex-col items-center leading-none">
              <span className={`fut-font text-[13px] sm:text-[15px] font-bold ${tierStyles.textNum}`}>{player.power}</span>
              <span className={`text-[6.5px] sm:text-[7px] font-black ${tierStyles.textPos} -mt-0.5`}>{displayPos}</span>
            </div>
            {teamSide && (
              <span 
                className={`w-1.5 h-1.5 rounded-full ${teamSide === 'A' ? 'bg-sky-400 shadow-[0_0_5px_#38bdf8]' : 'bg-amber-400 shadow-[0_0_5px_#f59e0b]'}`} 
              />
            )}
          </div>

          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-b ${tierStyles.avatarBorder} border flex items-center justify-center font-black text-[8px] sm:text-[9px] overflow-hidden shadow-inner`}>
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-tight truncate w-full text-center text-slate-100 pb-0.5 drop-shadow leading-none">
            {shortName}
          </div>

        </div>
      </div>
    )
  }

  // ================= 2. ORTA BOYUT (Şerit ve Listeler) =================
  if (size === 'medium') {
    return (
      <div
        onClick={onClick}
        className={`
          ${tierStyles.outer} p-[2px] fut-shield-md w-[80px] h-[106px] shadow-md
          cursor-pointer select-none transition-all duration-150 ease-out
          ${isShiny ? 'shimmer-effect' : ''}
          ${isSelected ? 'scale-105 ring-2 ring-emerald-400 shadow-[0_0_16px_#10b981]' : 'hover:scale-102 active:scale-90'}
          ${className}
        `}
      >
        <div className={`${tierStyles.inner} fut-shield-md w-full h-full p-1.5 flex flex-col items-center justify-between text-white relative`}>
          
          <div className="w-full flex items-start justify-between">
            <div className="flex flex-col items-center leading-none">
              <span className={`fut-font text-xl font-bold ${tierStyles.textNum}`}>{player.power}</span>
              <span className={`text-[9px] font-black ${tierStyles.textPos}`}>{displayPos}</span>
            </div>
            {player.is_guest && (
              <span className="text-[7px] bg-amber-500/30 text-amber-300 font-bold px-1 rounded">MİS</span>
            )}
          </div>

          <div className={`w-9 h-9 rounded-full bg-gradient-to-b ${tierStyles.avatarBorder} border flex items-center justify-center font-black text-xs overflow-hidden shadow-inner my-0.5`}>
            {player.photo_url ? (
              <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div className="w-full text-center border-t border-white/10 pt-0.5 pb-0.5">
            <div className="text-[9px] font-black uppercase tracking-tight truncate text-white leading-tight">
              {player.full_name}
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ================= 3. BÜYÜK BOYUT (Detay / Modal) =================
  return (
    <div
      onClick={onClick}
      className={`
        ${tierStyles.outer} p-[3px] fut-shield w-full max-w-[240px] aspect-[1/1.42] shadow-[0_0_35px_rgba(0,0,0,0.8)]
        select-none mx-auto relative ${isShiny ? 'shimmer-effect' : ''}
        ${className}
      `}
    >
      <div className={`${tierStyles.inner} fut-shield w-full h-full p-3.5 flex flex-col justify-between items-center text-white relative`}>
        
        <div className="w-full flex justify-between items-start">
          <div className="flex flex-col items-center leading-none">
            <span className={`fut-font text-4xl font-black ${tierStyles.textNum}`}>{player.power}</span>
            <span className={`text-xs font-black ${tierStyles.textPos} tracking-widest mt-0.5`}>{displayPos}</span>
            <div className="w-4 h-2.5 rounded bg-red-600 mt-1 shadow flex items-center justify-center text-[7px] font-bold text-white">TR</div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[9px] border px-2 py-0.5 rounded font-black uppercase tracking-wider ${tierStyles.badge}`}>
              {tier === 'special' ? 'ÖZEL' : tier === 'gold' ? 'ALTIN' : tier === 'silver' ? 'GÜMÜŞ' : 'BRONZ'}
            </span>
            {player.is_guest && (
              <span className="text-[8px] bg-amber-500/30 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                MİSAFİR OYUNCU
              </span>
            )}
          </div>
        </div>

        <div className={`w-24 h-24 rounded-full bg-gradient-to-b ${tierStyles.avatarBorder} border-2 flex items-center justify-center font-black text-3xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] my-2`}>
          {player.photo_url ? (
            <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <div className="w-full text-center border-t border-white/15 pt-1.5 pb-2">
          <div className="fut-font text-2xl font-bold tracking-wide uppercase leading-none text-white drop-shadow">
            {player.full_name}
          </div>
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-0.5">
            {teamSide === 'A' ? 'Kuzey FC (Takım A)' : teamSide === 'B' ? 'Güney FC (Takım B)' : 'Takımsız'}
          </div>
        </div>

      </div>
    </div>
  )
}
