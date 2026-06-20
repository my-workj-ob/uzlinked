-- Profiles jadvaliga premium statusni saqlovchi ustun qo'shish
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
