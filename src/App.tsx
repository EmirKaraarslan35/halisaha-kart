import React, { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { PitchScreen } from './components/PitchScreen'
import { MatchesScreen } from './components/MatchesScreen'
import { LeagueScreen } from './components/LeagueScreen'
import { CardsScreen } from './components/CardsScreen'
import { AdminProfileModal } from './components/AdminProfileModal'
import { Player } from './types'
import { 
  Users, 
  Trophy, 
  Calendar, 
  CreditCard, 
  Shield, 
  Download, 
  Lock, 
  Eye,
  EyeOff,
  X,
  KeyRound,
  AlertCircle
} from 'lucide-react'

type TabType = 'pitch' | 'matches' | 'league' | 'cards'

const MainLayout: React.FC = () => {
  const { 
    isAdmin, 
    setIsAdmin, 
    isVisitorPreview, 
    setIsVisitorPreview, 
    effectiveIsAdmin, 
    exportBackupJson 
  } = useApp()

  const [activeTab, setActiveTab] = useState<TabType>('pitch')
  const [adminProfilePlayer, setAdminProfilePlayer] = useState<Player | null>(null)
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState(false)

  // Yönetici Girişi (Şifre: Emir.1912bjk)
  const handleAdminToggle = (e: React.FormEvent) => {
    e.preventDefault()
    if (adminPassword === 'Emir.1912bjk') {
      setIsAdmin(true)
      setIsVisitorPreview(false)
      setShowAdminLoginModal(false)
      setAdminPassword('')
      setLoginError(false)
    } else {
      setLoginError(true)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-lg mx-auto bg-slate-950 text-slate-100 shadow-[0_0_60px_rgba(0,0,0,0.9)] border-x border-slate-800/80 relative overflow-hidden select-none">
      
      {/* ================= ANA İÇERİK EKRANI ================= */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'pitch' && <PitchScreen onNavigateToMatches={() => setActiveTab('matches')} />}
        {activeTab === 'matches' && <MatchesScreen />}
        {activeTab === 'league' && <LeagueScreen />}
        {activeTab === 'cards' && <CardsScreen onOpenAdminProfile={p => setAdminProfilePlayer(p)} />}
      </main>

      {/* ================= ALT BİLGİ & YÖNETİCİ ÇUBUĞU ================= */}
      <footer className="bg-slate-950 border-t border-slate-900 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-500 z-30">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Shield size={11} className="text-amber-400 fill-amber-500/20" /> {isVisitorPreview ? 'Yönetici (Önizleme)' : 'Yönetici Modu'}
              </span>

              {/* Ziyaretçi Gözüyle Önizle Butonu */}
              <button
                onClick={() => setIsVisitorPreview(!isVisitorPreview)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold transition ${isVisitorPreview ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.3)]' : 'bg-slate-900 hover:text-white border border-slate-800'}`}
                title="Arkadaşların nasıl gördüğünü test edin"
              >
                {isVisitorPreview ? <EyeOff size={10} /> : <Eye size={10} />}
                <span>{isVisitorPreview ? 'Yönetime Dön' : 'Ziyaretçi Önizle'}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setLoginError(false)
                setAdminPassword('')
                setShowAdminLoginModal(true)
              }}
              className="hover:text-amber-400 flex items-center gap-1 transition font-medium"
            >
              <Lock size={10} /> Yönetici Girişi
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setIsAdmin(false)
                setIsVisitorPreview(false)
              }}
              className="text-slate-500 hover:text-red-400 ml-1 transition"
            >
              (Çıkış)
            </button>
          )}
        </div>

        {effectiveIsAdmin && (
          <button
            onClick={exportBackupJson}
            className="flex items-center gap-1 text-slate-400 hover:text-amber-300 transition"
            title="Tüm veritabanını tek bir JSON olarak indir"
          >
            <Download size={11} />
            <span>Yedek (.json)</span>
          </button>
        )}
      </footer>

      {/* ================= ALT GEZİNME MENÜSÜ (BOTTOM NAV) ================= */}
      <nav className="bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-2 flex items-center justify-around text-slate-400 z-40">
        
        {/* 1. Kadro */}
        <button
          onClick={() => setActiveTab('pitch')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${activeTab === 'pitch' ? 'text-amber-400 font-black scale-105' : 'hover:text-slate-200'}`}
        >
          <Users size={18} />
          <span className="text-[10px] tracking-tight">Kadro</span>
        </button>

        {/* 2. Maçlar */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${activeTab === 'matches' ? 'text-amber-400 font-black scale-105' : 'hover:text-slate-200'}`}
        >
          <Calendar size={18} />
          <span className="text-[10px] tracking-tight">Maçlar</span>
        </button>

        {/* 3. Lig */}
        <button
          onClick={() => setActiveTab('league')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${activeTab === 'league' ? 'text-amber-400 font-black scale-105' : 'hover:text-slate-200'}`}
        >
          <Trophy size={18} />
          <span className="text-[10px] tracking-tight">Lig</span>
        </button>

        {/* 4. Kartlar */}
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${activeTab === 'cards' ? 'text-amber-400 font-black scale-105' : 'hover:text-slate-200'}`}
        >
          <CreditCard size={18} />
          <span className="text-[10px] tracking-tight">Kartlar</span>
        </button>

      </nav>

      {/* ================= MODAL: YÖNETİCİ PROFİLİ (GRAFİK) ================= */}
      {adminProfilePlayer && (
        <AdminProfileModal
          player={adminProfilePlayer}
          onClose={() => setAdminProfilePlayer(null)}
        />
      )}

      {/* ================= MODAL: VIP YÖNETİCİ GİRİŞİ ================= */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 w-full max-w-xs shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-4 relative">
            
            <button
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400 shadow-inner">
                <Shield size={24} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Yönetici Girişi
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Kadro düzenleme ve maç başlatma yetkisi
              </p>
            </div>

            <form onSubmit={handleAdminToggle} className="space-y-3">
              <div className="relative">
                <KeyRound size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  placeholder="Yönetici Şifresi"
                  autoFocus
                  value={adminPassword}
                  onChange={e => {
                    setAdminPassword(e.target.value)
                    setLoginError(false)
                  }}
                  className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${loginError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-amber-500'}`}
                />
              </div>

              {loginError && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold">
                  <AlertCircle size={12} /> Hatalı yönetici şifresi!
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-lg transition active:scale-95"
              >
                Giriş Yap
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  )
}

export default App
