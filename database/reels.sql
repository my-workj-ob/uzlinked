-- ==========================================
-- REELS JADVALI
-- ==========================================
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    video_key TEXT NOT NULL,          -- Backblaze da videos/... path
    thumbnail_key TEXT,               -- Backblaze da thumbnail (ixtiyoriy)
    title TEXT,
    description TEXT,
    views_count INT DEFAULT 0,
    likes_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reellarni hamma ko'ra oladi" ON reels
    FOR SELECT USING (true);

CREATE POLICY "Foydalanuvchilar o'z reellarini qo'sha oladi" ON reels
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchilar o'z reellarini o'chira oladi" ON reels
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchilar o'z reellarini yangilay oladi" ON reels
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hamma ko'rishlar sonini yangilay oladi" ON reels
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- ==========================================
-- REEL LIKES JADVALI
-- ==========================================
CREATE TABLE IF NOT EXISTS reel_likes (
    id BIGSERIAL PRIMARY KEY,
    reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reel likelarini hamma ko'ra oladi" ON reel_likes
    FOR SELECT USING (true);

CREATE POLICY "Foydalanuvchilar reel layk bosa oladi" ON reel_likes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchilar o'z reel laykini o'chira oladi" ON reel_likes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ==========================================
-- LISTINGS (E'LONLAR) JADVALI
-- ==========================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL,
    category TEXT DEFAULT 'digital' CHECK (category IN ('digital', 'physical', 'service')),
    image_key TEXT,
    contact TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "E'lonlarni hamma ko'ra oladi" ON listings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Foydalanuvchilar o'z e'lonlarini qo'sha oladi" ON listings
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Foydalanuvchilar o'z e'lonlarini yangilay oladi" ON listings
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND (SELECT user_id FROM listings WHERE id = id) = user_id);

CREATE POLICY "Foydalanuvchilar o'z e'lonlarini o'chira oladi" ON listings
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ==========================================
-- FOLLOWS (OBUNA) JADVALI
-- ==========================================
CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obunalarni hamma ko'ra oladi" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Foydalanuvchilar obuna bo'la oladi" ON follows
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Foydalanuvchilar obunani bekor qila oladi" ON follows
    FOR DELETE TO authenticated
    USING (auth.uid() = follower_id);

-- Reellar tartibi va foydalanuvchi bo'yicha qidiruv uchun
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);

-- Layklar tez hisoblanishi va tekshirilishi uchun
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);

-- E'lonlarni filtrlash uchun
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);

-- Obunachilarni tezkor tekshirish uchun
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

-- ==========================================
-- REEL LIKES HISOBLASH TRIGGERI
-- ==========================================
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.reel_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reel_likes_count_trigger
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- ==========================================
-- REEL LIKES SONINI OLISH FUNKSIYASI
-- ==========================================
CREATE OR REPLACE FUNCTION get_reel_likes_count(reel_id UUID)
RETURNS INT AS $$
DECLARE
    likes_count INT;
BEGIN
    SELECT COUNT(*) INTO likes_count FROM reel_likes WHERE reel_id = get_reel_likes_count.reel_id;
    RETURN likes_count;
END;
$$ LANGUAGE plpgsql;
