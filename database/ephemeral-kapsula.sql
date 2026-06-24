-- ============================================================
-- KAPSULA — Efemer (vaqtinchalik) kontent + "saqlab qolish"
-- ------------------------------------------------------------
-- Falsafa: post yozayotganda foydalanuvchi TANLAYDI — "Doimiy"
-- yoki "Kapsula (72 soat)". Kapsula post 72 soatdan keyin "erib
-- ketadi", boshqa odam uni "Kapsula"ga solib saqlasagina o'sha
-- foydalanuvchi uchun saqlanib qoladi. "Like" soni emas —
-- "qancha odam saqlab qoldi" muhim (saves_count).
--
-- Bu migratsiya BUTUNLAY qo'shimcha (additive):
--   * Mavjud postlar expires_at = NULL bo'lib qoladi = abadiy.
--   * expires_at uchun DEFAULT yo'q — yangi postlar ham default
--     bo'yicha DOIMIY (NULL). TTL faqat foydalanuvchi "Kapsula"
--     tanlaganda API tomonidan o'rnatiladi (now() + 72 soat).
-- Idempotent: bir necha marta ishga tushirsa ham xavfsiz.
-- ============================================================

-- ------------------------------------------------------------
-- 1. posts.expires_at — TTL ustuni
--    DEFAULT yo'q: barcha postlar default bo'yicha NULL = abadiy.
--    "Kapsula" tanlangan postlarda expires_at'ni API o'rnatadi.
--    (Avvalgi migratsiyada DEFAULT bo'lgan bo'lsa — DROP qilamiz.)
-- ------------------------------------------------------------
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.posts ALTER COLUMN expires_at DROP DEFAULT;

-- "qancha odam saqlab qoldi" hisoblagichi (denormalizatsiya, tez o'qish uchun)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS saves_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at);

-- ------------------------------------------------------------
-- 2. post_saves — "Kapsula" jadvali
--    posts.id turi loyihaga qarab UUID yoki BIGINT bo'lishi mumkin,
--    shuning uchun post_id turini dinamik aniqlab olamiz.
-- ------------------------------------------------------------
DO $$
DECLARE
    pid_type text;
BEGIN
    SELECT data_type INTO pid_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'id';

    IF pid_type IS NULL THEN
        RAISE NOTICE 'public.posts jadvali topilmadi — post_saves yaratilmadi';
    ELSE
        EXECUTE format($f$
            CREATE TABLE IF NOT EXISTS public.post_saves (
                id BIGSERIAL PRIMARY KEY,
                post_id %s NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE(post_id, user_id)
            )
        $f$, CASE
            WHEN pid_type = 'uuid' THEN 'uuid'
            WHEN pid_type = 'bigint' THEN 'bigint'
            WHEN pid_type = 'integer' THEN 'integer'
            WHEN pid_type = 'smallint' THEN 'smallint'
            ELSE 'uuid'
        END);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_saves_user ON public.post_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_post ON public.post_saves(post_id);

-- ------------------------------------------------------------
-- 3. RLS — har kim faqat o'z saqlanganlarini ko'radi/boshqaradi
-- ------------------------------------------------------------
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foydalanuvchi faqat o'z kapsulalarini ko'radi" ON public.post_saves;
CREATE POLICY "Foydalanuvchi faqat o'z kapsulalarini ko'radi" ON public.post_saves
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi kapsulaga saqlay oladi" ON public.post_saves;
CREATE POLICY "Foydalanuvchi kapsulaga saqlay oladi" ON public.post_saves
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchi kapsuladan olib tashlay oladi" ON public.post_saves;
CREATE POLICY "Foydalanuvchi kapsuladan olib tashlay oladi" ON public.post_saves
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. saves_count'ni avtomatik yangilab turuvchi trigger
--    (SELECT RLS bilan boshqalarning saqlashlari ko'rinmaydi,
--     shuning uchun ochiq hisoblagichni trigger orqali yuritamiz)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_post_saves_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_saves_count ON public.post_saves;
CREATE TRIGGER trg_post_saves_count
    AFTER INSERT OR DELETE ON public.post_saves
    FOR EACH ROW EXECUTE FUNCTION public.bump_post_saves_count();

-- ------------------------------------------------------------
-- 5. (ixtiyoriy) Erib ketgan, hech kim saqlamagan postlarni
--    butunlay tozalash uchun yordamchi funksiya. Cron orqali
--    chaqirish mumkin (pg_cron). UI baribir client/server'da
--    filtrlaydi, shuning uchun bu majburiy emas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_posts()
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    WITH del AS (
        DELETE FROM public.posts p
        WHERE p.expires_at IS NOT NULL
          AND p.expires_at < now()
          AND NOT EXISTS (SELECT 1 FROM public.post_saves s WHERE s.post_id = p.id)
        RETURNING p.id
    )
    SELECT COUNT(*) INTO deleted_count FROM del;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
