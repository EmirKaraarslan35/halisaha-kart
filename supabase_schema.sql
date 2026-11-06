-- ==============================================================================
-- HALI SAHA KART UYGULAMASI - TEK PARÇA SUPABASE KURULUM SQL'İ
-- ==============================================================================
-- Bu dosyayı Supabase Dashboard -> SQL Editor alanına yapıştırıp "RUN" butonuna basarak
-- tüm tabloları, kısıtları, RLS güvenlik kurallarını, view'ları ve storage ayarlarını
-- tek seferde oluşturabilirsiniz.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLOLAR
-- ==============================================================================

-- 2.1 TEAMS (Sistemde sabit 2 takım: A ve B)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    side CHAR(1) NOT NULL UNIQUE CHECK (side IN ('A', 'B')),
    name TEXT NOT NULL,
    formation JSONB NOT NULL DEFAULT '[1, 2, 3, 1]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 PLAYERS (Oyuncular)
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    power INTEGER NOT NULL CHECK (power >= 1 AND power <= 99),
    default_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    photo_url TEXT,
    is_guest BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 LINEUP_SLOTS (Güncel Canlı Kadro Yuvaları)
CREATE TABLE IF NOT EXISTS public.lineup_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL,
    line_index INTEGER NOT NULL,
    position_label TEXT NOT NULL,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_team_slot UNIQUE (team_id, slot_index)
);

-- 2.4 LEAGUES (Ligler)
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    champion_side CHAR(1) CHECK (champion_side IN ('A', 'B')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aynı anda sadece tek bir aktif lig olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_leagues_single_active 
ON public.leagues(status) 
WHERE status = 'active';

-- 2.5 MATCHES (Maçlar)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'finished', 'cancelled')),
    team_a_name TEXT NOT NULL,
    team_b_name TEXT NOT NULL,
    formation_a JSONB NOT NULL,
    formation_b JSONB NOT NULL,
    score_a INTEGER NOT NULL DEFAULT 0,
    score_b INTEGER NOT NULL DEFAULT 0,
    mvp_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aynı anda sadece tek bir oynanan maç olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_single_playing 
ON public.matches(status) 
WHERE status = 'playing';

-- 2.6 MATCH_PLAYERS (O günkü maç kadro kopyası - GÜÇ YAZILMAZ)
CREATE TABLE IF NOT EXISTS public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    side CHAR(1) NOT NULL CHECK (side IN ('A', 'B')),
    slot_index INTEGER NOT NULL,
    position_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 GOALS (Goller & Asistler)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    scorer_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
    assist_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    is_own_goal BOOLEAN NOT NULL DEFAULT false,
    credited_side CHAR(1) NOT NULL CHECK (credited_side IN ('A', 'B')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Bir oyuncu kendi golüne asist yapamaz
    CONSTRAINT chk_scorer_not_assist CHECK (assist_id IS NULL OR scorer_id <> assist_id)
);

-- 2.8 POWER_HISTORY (Güç Değişim Geçmişi - SADECE YÖNETİCİ GÖRÜR)
CREATE TABLE IF NOT EXISTS public.power_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    old_power INTEGER NOT NULL,
    new_power INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    reverted_of UUID REFERENCES public.power_history(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. BAŞLANGIÇ VERİSİ (SEED DATA)
-- ==============================================================================
-- Takım A ve Takım B sabit kayıtları (varsa dokunma)
INSERT INTO public.teams (side, name, formation)
VALUES 
    ('A', 'Kuzey FC (Takım A)', '[1, 2, 3, 1]'::jsonb),
    ('B', 'Güney FC (Takım B)', '[1, 3, 2, 1]'::jsonb)
ON CONFLICT (side) DO NOTHING;

-- ==============================================================================
-- 4. HESAPLANAN VERİLER İÇİN SQL VIEW'LAR (Derived Stats)
-- ==============================================================================

-- 4.1 Lig Puan Durumu View'ı (Her lig için Takım A ve Takım B satırları)
CREATE OR REPLACE VIEW public.view_league_standings AS
WITH finished_matches AS (
    SELECT 
        m.league_id,
        m.score_a,
        m.score_b,
        CASE 
            WHEN m.score_a > m.score_b THEN 'A'
            WHEN m.score_b > m.score_a THEN 'B'
            ELSE 'D'
        END AS winner
    FROM public.matches m
    WHERE m.status = 'finished'
),
team_sides AS (
    SELECT 'A'::char(1) AS side
    UNION ALL
    SELECT 'B'::char(1) AS side
)
SELECT 
    l.id AS league_id,
    ts.side,
    CASE WHEN ts.side = 'A' THEN t_a.name ELSE t_b.name END AS team_name,
    COUNT(fm.*) AS matches_played,
    COUNT(CASE WHEN (ts.side = 'A' AND fm.winner = 'A') OR (ts.side = 'B' AND fm.winner = 'B') THEN 1 END) AS wins,
    COUNT(CASE WHEN fm.winner = 'D' THEN 1 END) AS draws,
    COUNT(CASE WHEN (ts.side = 'A' AND fm.winner = 'B') OR (ts.side = 'B' AND fm.winner = 'A') THEN 1 END) AS losses,
    COALESCE(SUM(CASE WHEN ts.side = 'A' THEN fm.score_a ELSE fm.score_b END), 0) AS goals_for,
    COALESCE(SUM(CASE WHEN ts.side = 'A' THEN fm.score_b ELSE fm.score_a END), 0) AS goals_against,
    COALESCE(SUM(CASE WHEN ts.side = 'A' THEN fm.score_a - fm.score_b ELSE fm.score_b - fm.score_a END), 0) AS goal_diff,
    (COUNT(CASE WHEN (ts.side = 'A' AND fm.winner = 'A') OR (ts.side = 'B' AND fm.winner = 'B') THEN 1 END) * 3 +
     COUNT(CASE WHEN fm.winner = 'D' THEN 1 END) * 1) AS points
FROM public.leagues l
CROSS JOIN team_sides ts
LEFT JOIN public.teams t_a ON t_a.side = 'A'
LEFT JOIN public.teams t_b ON t_b.side = 'B'
LEFT JOIN finished_matches fm ON fm.league_id = l.id
GROUP BY l.id, ts.side, t_a.name, t_b.name
ORDER BY points DESC, goal_diff DESC, goals_for DESC;

-- 4.2 Oyuncu İstatistikleri View'ı
CREATE OR REPLACE VIEW public.view_player_stats AS
SELECT 
    p.id AS player_id,
    p.full_name,
    p.position,
    p.power,
    p.photo_url,
    p.is_active,
    p.is_guest,
    p.default_team_id,
    COUNT(DISTINCT mp.match_id) AS total_matches,
    COUNT(DISTINCT CASE WHEN g.id IS NOT NULL AND g.is_own_goal = false THEN g.id END) AS total_goals,
    COUNT(DISTINCT a.id) AS total_assists,
    COUNT(DISTINCT CASE WHEN m_mvp.id IS NOT NULL THEN m_mvp.id END) AS total_mvp
FROM public.players p
LEFT JOIN public.match_players mp ON mp.player_id = p.id
LEFT JOIN public.matches m ON m.id = mp.match_id AND m.status = 'finished'
LEFT JOIN public.goals g ON g.scorer_id = p.id AND g.match_id = m.id AND g.is_own_goal = false
LEFT JOIN public.goals a ON a.assist_id = p.id AND a.match_id = m.id
LEFT JOIN public.matches m_mvp ON m_mvp.mvp_player_id = p.id AND m_mvp.status = 'finished'
GROUP BY p.id;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================

-- Tüm tablolarda RLS etkinleştir
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_history ENABLE ROW LEVEL SECURITY;

-- 5.1 GENEL HERKESE AÇIK OKUMA (Ziyaretçiler SELECT yapabilir)
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Public read lineup_slots" ON public.lineup_slots FOR SELECT USING (true);
CREATE POLICY "Public read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Public read match_players" ON public.match_players FOR SELECT USING (true);
CREATE POLICY "Public read goals" ON public.goals FOR SELECT USING (true);

-- 5.2 POWER_HISTORY İSTİSNASI: Ziyaretçi ASLA okuyamaz! Sadece giriş yapmış yönetici okur.
CREATE POLICY "Admin read power_history" ON public.power_history 
FOR SELECT TO authenticated USING (true);

-- 5.3 YÖNETİCİ YAZMA YETKİLERİ (Sadece authenticated/yönetici INSERT/UPDATE/DELETE yapabilir)
CREATE POLICY "Admin write teams" ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write players" ON public.players FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write lineup_slots" ON public.lineup_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write leagues" ON public.leagues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write matches" ON public.matches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write match_players" ON public.match_players FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write goals" ON public.goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin write power_history" ON public.power_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. REALTIME YAYINI
-- ==============================================================================
-- Tablolardaki değişikliklerin ziyaretçilerin ekranına anında düşmesi için
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.lineup_slots, 
    public.players, 
    public.teams, 
    public.matches, 
    public.match_players, 
    public.goals, 
    public.leagues;
COMMIT;

-- ==============================================================================
-- 7. STORAGE BUCKET (player-photos)
-- ==============================================================================
-- Fotoğrafların yüklenmesi için storage bucket ve erişim kuralları
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Herkes fotoğrafları görebilir, sadece yönetici yükleyebilir/silebilir
CREATE POLICY "Public read player photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'player-photos');

CREATE POLICY "Admin insert player photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Admin update player photos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'player-photos');

CREATE POLICY "Admin delete player photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'player-photos');
