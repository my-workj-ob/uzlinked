-- ==========================================================
-- UZLINKED: OPTIONAL PORTFOLIO MODE & TRANSCRIPTION MIGRATION
-- ==========================================================
-- Eslatma: Ushbu SQL kodini Supabase SQL Editor'da bajaring.
-- Bu kod mavjud `profiles` va `messages` jadvallariga yangi ustunlarni xavfsiz qo'shadi.

-- 1. Profiles jadvaliga yangi ustunlarni qo'shish
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_professional_mode boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS headline text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_info text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_links jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS open_for_collab boolean DEFAULT false;

-- 2. Messages jadvaliga transkripsiya ustunini qo'shish (audio xabarlar matni uchun)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS transcription text;

-- 3. RLS qoidalarini tekshirish
-- Profiles ommaviy o'qilishi va faqat egasi tomonidan o'zgartirilishi mumkinligi kafolatlangan.
-- Yangi ustunlar avtomatik ravishda mavjud SELECT va UPDATE RLS qoidalari ostida ishlaydi.
