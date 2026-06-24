-- ============================================================
-- PROFIL SOZLAMALARI — yagona, aniq, idempotent migratsiya
-- ------------------------------------------------------------
-- Bu fayl profil sozlamalari sahifasi (/dashboard/settings) to'liq
-- ishlashi uchun KERAKLI barcha ustun va jadvallarni bitta joyda
-- kafolatlaydi. Ilgari ular bir nechta fayllarga tarqalgan edi
-- (profiles.sql, security_settings.sql, chat_features.sql,
--  pwa_push_setup.sql, add_premium_to_profiles.sql).
--
-- BUTUNLAY ADDITIVE: faqat "ADD COLUMN IF NOT EXISTS" ishlatamiz,
-- hech qanday ustun/jadval o'chirilmaydi. Bir necha marta ishga
-- tushirsa ham xavfsiz.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles — sozlamalar ustunlari
-- ------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS nickname    TEXT,
    ADD COLUMN IF NOT EXISTS username    TEXT,
    ADD COLUMN IF NOT EXISTS bio         TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url  TEXT,
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Xavfsizlik / maxfiylik
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_private            BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT false;

-- Obuna (subscription) — media limitlari uchun
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- Xabarlar (chat) sozlamalari
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS chat_read_receipts_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS chat_who_can_message       TEXT    DEFAULT 'everyone',
    ADD COLUMN IF NOT EXISTS chat_notifications_enabled BOOLEAN DEFAULT true;

-- chat_who_can_message uchun qiymat cheklovi (faqat mavjud bo'lmasa qo'shamiz)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND constraint_name = 'profiles_chat_who_can_message_check'
    ) THEN
        BEGIN
            ALTER TABLE public.profiles
                ADD CONSTRAINT profiles_chat_who_can_message_check
                CHECK (chat_who_can_message IN ('everyone', 'nobody', 'following'));
        EXCEPTION WHEN duplicate_object THEN
            -- allaqachon mavjud — e'tiborsiz
            NULL;
        END;
    END IF;
END $$;

-- Bildirishnoma sozlamalari (JSONB)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
        "interactions": {"likes": true, "comments": true, "shares": true, "mentions": true},
        "social": {"followers": true, "requests": true, "friend_activity": true},
        "chat": {"direct_messages": true, "group_mentions": true},
        "content": {"stories": true, "live": true},
        "monetization": {"tips": true, "marketplace": true},
        "retention": {"daily_goals": true, "reminders": true},
        "system": {"security_alerts": true, "billing": true}
    }'::jsonb;

-- ------------------------------------------------------------
-- 2. security_logs — faollik tarixi (Faollik tarixi tab)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'login', 'logout', 'password_change',
        'privacy_toggle', 'two_factor_toggle', 'account_delete_attempt'
    )),
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foydalanuvchilar o'z xavfsizlik jurnallarini ko'ra oladi" ON public.security_logs;
CREATE POLICY "Foydalanuvchilar o'z xavfsizlik jurnallarini ko'ra oladi"
    ON public.security_logs FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Foydalanuvchilar xavfsizlik jurnali yoza oladi" ON public.security_logs;
CREATE POLICY "Foydalanuvchilar xavfsizlik jurnali yoza oladi"
    ON public.security_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. user_blocks — bloklangan foydalanuvchilar (Xabarlar tab)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Foydalanuvchi o'z bloklarini ko'radi" ON public.user_blocks;
CREATE POLICY "Foydalanuvchi o'z bloklarini ko'radi"
    ON public.user_blocks FOR SELECT TO authenticated
    USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Foydalanuvchi blok qo'sha oladi" ON public.user_blocks;
CREATE POLICY "Foydalanuvchi blok qo'sha oladi"
    ON public.user_blocks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Foydalanuvchi blokdan chiqara oladi" ON public.user_blocks;
CREATE POLICY "Foydalanuvchi blokdan chiqara oladi"
    ON public.user_blocks FOR DELETE TO authenticated
    USING (auth.uid() = blocker_id);

-- ============================================================
-- Tugadi. Endi /dashboard/settings dagi barcha tab'lar
-- (profil, obuna, xavfsizlik, faollik tarixi, bildirishnomalar,
--  xabarlar) to'liq ishlaydi.
-- ============================================================
