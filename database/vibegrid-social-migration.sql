-- ==========================================================
-- VIBEGRID REELS — TO'LIQ IJTIMOIY TIZIM MIGRATSIYASI
-- ==========================================================
-- Eslatma: bu fayl mavjud `reels`, `profiles`, `follows` jadvallari
-- ustiga quriladi. Ishlatishdan oldin staging'da test qiling.

-- ----------------------------------------------------------
-- 1. WATCH TIME TRACKING (algoritm uchun eng muhim signal)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_views (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    session_id TEXT, -- anonim userlar uchun (login bo'lmasa)
    watch_seconds NUMERIC DEFAULT 0,
    video_duration NUMERIC DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reel_views_reel ON reel_views(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_user ON reel_views(user_id);

ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hamma view yoza oladi" ON reel_views
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Faqat o'ziniki ko'rinadi" ON reel_views
    FOR SELECT USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 2. COMMENTS (reply bilan, nested)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
    likes_count INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_parent ON reel_comments(parent_id);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kommentlarni hamma ko'ra oladi" ON reel_comments
    FOR SELECT USING (is_deleted = false);
CREATE POLICY "Foydalanuvchilar komment yoza oladi" ON reel_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Foydalanuvchilar o'z kommentini o'chira oladi" ON reel_comments
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reel_comment_likes (
    id BIGSERIAL PRIMARY KEY,
    comment_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);
ALTER TABLE reel_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Komment laykini hamma ko'ra oladi" ON reel_comment_likes FOR SELECT USING (true);
CREATE POLICY "Foydalanuvchilar komment layk bosa oladi" ON reel_comment_likes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Foydalanuvchilar laykni bekor qila oladi" ON reel_comment_likes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 3. SAVES / BOOKMARKS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_saves (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);
ALTER TABLE reel_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foydalanuvchi faqat o'z saqlanganlarini ko'radi" ON reel_saves
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Foydalanuvchilar saqlay oladi" ON reel_saves
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Foydalanuvchilar saqlovdan olib tashlay oladi" ON reel_saves
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 4. SHARES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_shares (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    method TEXT DEFAULT 'link', -- link | telegram | dm
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reel_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hamma share yoza oladi" ON reel_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Share ochiq hisoblanadi" ON reel_shares FOR SELECT USING (true);

-- ----------------------------------------------------------
-- 5. HASHTAGS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_hashtags (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    tag TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reel_hashtags_tag ON reel_hashtags(tag);
ALTER TABLE reel_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hashtaglarni hamma ko'ra oladi" ON reel_hashtags FOR SELECT USING (true);
CREATE POLICY "Egasi hashtag qo'sha oladi" ON reel_hashtags
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM reels WHERE reels.id = reel_id AND reels.user_id = auth.uid())
    );

-- ----------------------------------------------------------
-- 6. NOTIFICATIONS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,   -- kim oladi
    actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,           -- kim qildi
    type TEXT NOT NULL CHECK (type IN ('like','comment','follow','mention','reply')),
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES reel_comments(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foydalanuvchi faqat o'z bildirishnomasini ko'radi" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tizim bildirishnoma yoza oladi" ON notifications
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Foydalanuvchi o'qilgan deb belgilay oladi" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------
-- 7. REPORTS (moderatsiya)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reel_reports (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reel_id, reporter_id)
);
ALTER TABLE reel_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Foydalanuvchi report yoza oladi" ON reel_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Faqat o'zi yozgan reportni ko'radi" ON reel_reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Avtomatik flag: 5+ report tushsa reel "pending_review" statusiga o'tadi
ALTER TABLE reels ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'active'
    CHECK (moderation_status IN ('active','pending_review','removed'));

CREATE OR REPLACE FUNCTION auto_flag_reel()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM reel_reports WHERE reel_id = NEW.reel_id) >= 5 THEN
        UPDATE reels SET moderation_status = 'pending_review' WHERE id = NEW.reel_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_flag_reel ON reel_reports;
CREATE TRIGGER trg_auto_flag_reel
    AFTER INSERT ON reel_reports
    FOR EACH ROW EXECUTE FUNCTION auto_flag_reel();

-- ----------------------------------------------------------
-- 8. ALGORITMIK RANKING — "Siz uchun" feed funksiyasi
-- ----------------------------------------------------------
-- score = likes*1 + comments*3 + shares*5 + saves*4 + completion_rate*10 - yangilik penalty
-- Yangi videolarga "exploration boost" beriladi (birinchi 2 soat ichida).

CREATE OR REPLACE FUNCTION get_ranked_reels(
    p_user_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    reel_id UUID,
    score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS reel_id,
        (
            COALESCE(likes.cnt, 0) * 1.0
            + COALESCE(comments.cnt, 0) * 3.0
            + COALESCE(shares.cnt, 0) * 5.0
            + COALESCE(saves.cnt, 0) * 4.0
            + COALESCE(views.completion_rate, 0) * 10.0
            + CASE
                WHEN r.created_at > NOW() - INTERVAL '2 hours' THEN 15.0  -- yangi video boost
                WHEN r.created_at > NOW() - INTERVAL '24 hours' THEN 5.0
                ELSE 0
              END
            - (EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400.0) * 0.5 -- vaqt o'tishi bilan pasayadi
        ) AS score
    FROM reels r
    LEFT JOIN (
        SELECT reel_id, COUNT(*) cnt FROM reel_likes GROUP BY reel_id
    ) likes ON likes.reel_id = r.id
    LEFT JOIN (
        SELECT reel_id, COUNT(*) cnt FROM reel_comments WHERE is_deleted = false GROUP BY reel_id
    ) comments ON comments.reel_id = r.id
    LEFT JOIN (
        SELECT reel_id, COUNT(*) cnt FROM reel_shares GROUP BY reel_id
    ) shares ON shares.reel_id = r.id
    LEFT JOIN (
        SELECT reel_id, COUNT(*) cnt FROM reel_saves GROUP BY reel_id
    ) saves ON saves.reel_id = r.id
    LEFT JOIN (
        SELECT reel_id, AVG(CASE WHEN completed THEN 1.0 ELSE watch_seconds / GREATEST(video_duration, 1) END) AS completion_rate
        FROM reel_views GROUP BY reel_id
    ) views ON views.reel_id = r.id
    WHERE r.moderation_status = 'active'
    ORDER BY score DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------
-- 8.1 views_count'ni xavfsiz oshirish uchun RPC
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_views_count(p_reel_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE reels SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_reel_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 9. Reel'dagi likes/comments sonini tez olish uchun view
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW reel_stats AS
SELECT
    r.id AS reel_id,
    COALESCE(l.cnt, 0) AS likes_count,
    COALESCE(c.cnt, 0) AS comments_count,
    COALESCE(s.cnt, 0) AS shares_count,
    COALESCE(sv.cnt, 0) AS saves_count
FROM reels r
LEFT JOIN (SELECT reel_id, COUNT(*) cnt FROM reel_likes GROUP BY reel_id) l ON l.reel_id = r.id
LEFT JOIN (SELECT reel_id, COUNT(*) cnt FROM reel_comments WHERE is_deleted = false GROUP BY reel_id) c ON c.reel_id = r.id
LEFT JOIN (SELECT reel_id, COUNT(*) cnt FROM reel_shares GROUP BY reel_id) s ON s.reel_id = r.id
LEFT JOIN (SELECT reel_id, COUNT(*) cnt FROM reel_saves GROUP BY reel_id) sv ON sv.reel_id = r.id;
