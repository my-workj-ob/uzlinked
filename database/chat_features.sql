-- ==========================================================
-- VIBEGRID CHAT OPTIMIZATIONS & FEATURES MIGRATION
-- ==========================================================

-- 1. Messages table updates for reply, edit, and delete
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- 2. Profiles table updates for chat/messages settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_read_receipts_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_who_can_message TEXT DEFAULT 'everyone' CHECK (chat_who_can_message IN ('everyone', 'nobody', 'following'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_notifications_enabled BOOLEAN DEFAULT true;

-- 3. Block and Spam table
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    is_spam BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- Enable RLS for user_blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view blocks they are involved in" ON public.user_blocks
    FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can insert their own blocks" ON public.user_blocks
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks" ON public.user_blocks
    FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- 4. Add reactions and is_read to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 5. Enable Realtime publication for user_blocks safely
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_blocks'
    ) then
      alter publication supabase_realtime add table public.user_blocks;
    end if;
  end if;
end $$;

