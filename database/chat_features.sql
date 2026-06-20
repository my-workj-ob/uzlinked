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

-- ==========================================================
-- 6. PINNED CHATS (per-user pinning)
-- ==========================================================
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS pinned_by_user_one BOOLEAN DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS pinned_by_user_two BOOLEAN DEFAULT false;

-- ==========================================================
-- 7. GROUPS & CHANNELS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.groups_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('group', 'channel')),
    is_public BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 8. GROUP/CHANNEL MEMBERS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups_channels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- ==========================================================
-- 9. Extend messages table to support group/channel messages
-- ==========================================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups_channels(id) ON DELETE CASCADE;
-- Note: chat_id remains nullable for group/channel messages
-- Existing DMs have chat_id set, group messages have group_id set

-- ==========================================================
-- 10. RLS Policies for new tables
-- ==========================================================

-- groups_channels: anyone can see public groups, members can see private
ALTER TABLE public.groups_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public groups or channels" ON public.groups_channels
    FOR SELECT USING (
        is_public = true
        OR creator_id = auth.uid()
        OR id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Authenticated users can create groups or channels" ON public.groups_channels
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update their group or channel" ON public.groups_channels
    FOR UPDATE TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "Creator can delete their group or channel" ON public.groups_channels
    FOR DELETE TO authenticated USING (auth.uid() = creator_id);

-- group_members: members can see who is in their group
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can view membership" ON public.group_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins and creators can add members" ON public.group_members
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.group_members 
            WHERE group_id = group_members.group_id AND role IN ('creator', 'admin')
        )
        OR auth.uid() = (SELECT creator_id FROM public.groups_channels WHERE id = group_members.group_id)
    );

CREATE POLICY "Members can leave (delete themselves)" ON public.group_members
    FOR DELETE TO authenticated USING (
        user_id = auth.uid()
        OR auth.uid() IN (
            SELECT user_id FROM public.group_members 
            WHERE group_id = group_members.group_id AND role IN ('creator', 'admin')
        )
    );

CREATE POLICY "Admins can update member roles" ON public.group_members
    FOR UPDATE TO authenticated USING (
        auth.uid() IN (
            SELECT user_id FROM public.group_members 
            WHERE group_id = group_members.group_id AND role IN ('creator', 'admin')
        )
    );

-- ==========================================================
-- 11. Enable Realtime publication for all new tables safely
-- ==========================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- user_blocks
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_blocks'
    ) then
      alter publication supabase_realtime add table public.user_blocks;
    end if;
    -- groups_channels
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'groups_channels'
    ) then
      alter publication supabase_realtime add table public.groups_channels;
    end if;
    -- group_members
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_members'
    ) then
      alter publication supabase_realtime add table public.group_members;
    end if;
  end if;
end $$;
