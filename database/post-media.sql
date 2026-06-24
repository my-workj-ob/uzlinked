-- ============================================================
-- POST MEDIA — Bitta postga bir nechta rasm (max 20) + video
-- ------------------------------------------------------------
-- Maqsad: post endi faqat bitta `image_url` emas, balki tartiblangan
-- media galereyasiga ega bo'ladi (rasm/video). Birinchi element =
-- "muqova". Eski `posts.image_url` orqaga moslik uchun saqlanadi.
--
-- Limit (API tomonidan majburlanadi, bu yerda hujjat sifatida):
--   * Bepul reja:  4 tagacha rasm, video YO'Q.
--   * PRO reja:    20 tagacha rasm + 1 ta video (max 60 soniya).
--
-- Bu migratsiya BUTUNLAY qo'shimcha (additive) va idempotent:
--   * Mavjud postlar o'zgarmaydi (image_url ishlayveradi).
--   * Yangi jadval bo'sh bo'lsa, feed image_url'ga qaytadi.
-- ============================================================

-- ------------------------------------------------------------
-- 1. post_media jadvali
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
        RAISE NOTICE 'public.posts jadvali topilmadi — post_media yaratilmadi';
    ELSE
        EXECUTE format($f$
            CREATE TABLE IF NOT EXISTS public.post_media (
                id          BIGSERIAL PRIMARY KEY,
                post_id     %s NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
                url         TEXT NOT NULL,
                storage_key TEXT,
                type        TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image','video')),
                position    INT  NOT NULL DEFAULT 0,
                duration    NUMERIC,           -- video davomiyligi (soniya)
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        $f$, CASE
            WHEN pid_type = 'uuid'     THEN 'uuid'
            WHEN pid_type = 'bigint'   THEN 'bigint'
            WHEN pid_type = 'integer'  THEN 'integer'
            WHEN pid_type = 'smallint' THEN 'smallint'
            ELSE 'uuid'
        END);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_media_post     ON public.post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_position ON public.post_media(post_id, position);

-- ------------------------------------------------------------
-- 2. RLS — media postning ko'rinishiga ergashadi
--    O'qish: hamma ko'ra oladi (post ochiq bo'lsa).
--    Yozish/o'chirish: faqat post egasi.
-- ------------------------------------------------------------
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_media hammaga ko'rinadi" ON public.post_media;
CREATE POLICY "post_media hammaga ko'rinadi" ON public.post_media
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_media'ni faqat egasi qo'shadi" ON public.post_media;
CREATE POLICY "post_media'ni faqat egasi qo'shadi" ON public.post_media
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_media.post_id AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "post_media'ni faqat egasi o'chiradi" ON public.post_media;
CREATE POLICY "post_media'ni faqat egasi o'chiradi" ON public.post_media
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.posts p
            WHERE p.id = post_media.post_id AND p.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------
-- 3. (Ixtiyoriy) eski postlarni ko'chirish — image_url'ni
--    post_media'ga bir martalik nusxalash. Faqat hali media'si
--    yo'q va image_url to'ldirilgan postlar uchun.
-- ------------------------------------------------------------
INSERT INTO public.post_media (post_id, url, storage_key, type, position)
SELECT p.id, p.image_url, p.image_key, 'image', 0
FROM public.posts p
WHERE p.image_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.post_media m WHERE m.post_id = p.id);
