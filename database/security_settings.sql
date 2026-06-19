-- ==========================================================
-- VIBEGRID SECURITY & SETTINGS DATABASE MIGRATION
-- ==========================================================

-- 1. Profiles jadvaliga yangi sozlamalar ustunlarini qo'shish
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT false;

-- 2. Xavfsizlik jurnali (Security Logs) jadvalini yaratish
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'password_change', 'privacy_toggle', 'two_factor_toggle', 'account_delete_attempt')),
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indekslash (tezkor qidirish uchun)
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_logs(user_id);

-- RLS (Row Level Security) faollashtirish
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Xavfsizlik qoidalari (Policies)
-- Foydalanuvchi faqat o'ziga tegishli jurnallarni ko'ra oladi
CREATE POLICY "Foydalanuvchilar o'z xavfsizlik jurnallarini ko'ra oladi" 
ON public.security_logs
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Tizim yoki foydalanuvchi yangi jurnal yozuvi qo'sha oladi
CREATE POLICY "Foydalanuvchilar xavfsizlik jurnali yoza oladi" 
ON public.security_logs
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);
