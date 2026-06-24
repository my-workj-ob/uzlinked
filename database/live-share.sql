-- ============================================================
-- LIVE SHARE — Supabase Realtime + WebRTC Signaling
-- Supabase Realtime Broadcast orqali P2P signaling amalga oshiriladi.
-- Oddiy socket.io/WebSocket kerak emas — Supabase channel broadcast yetarli.
--
-- Arxitektura:
--   Host  ──broadcast(offer/ice)──▶  Viewer
--   Viewer ──broadcast(answer/ice)──▶ Host
--   Presence → tomoshabinlar soni real-time
--
-- Idempotent: qayta ishga tushirsa ham xavfsiz
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. JADVAL: live_rooms
-- ──────────────────────────────────────────────
create table if not exists public.live_rooms (
    id            uuid        primary key default gen_random_uuid(),
    host_id       uuid        not null references auth.users(id) on delete cascade,
    title         text        not null default 'Jonli efir',
    game          text,
    -- thumbnail_url: keyingi versiyada host screenshot berishi uchun
    thumbnail_url text,
    video_url     text,       -- Saqlangan video yozuv URL manzili
    is_live       boolean     not null default true,
    viewer_count  integer     not null default 0 check (viewer_count >= 0),
    -- peak_viewers: efirdagi maksimal tomoshabinlar soni
    peak_viewers  integer     not null default 0 check (peak_viewers >= 0),
    created_at    timestamptz not null default now(),
    ended_at      timestamptz,
    -- updated_at: viewer_count o'zgarganda yangilanadi (feed refresh uchun)
    updated_at    timestamptz not null default now()
);

-- video_url ustunini mavjud jadvalga qo'shish (agar jadval oldindan bor bo'lsa)
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'live_rooms' and column_name = 'video_url'
    ) then
        alter table public.live_rooms add column video_url text;
    end if;
end $$;

-- updated_at ni avtomatik yangilash trigger
create or replace function public.live_rooms_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    -- peak_viewers ni yangilash
    if new.viewer_count > new.peak_viewers then
        new.peak_viewers = new.viewer_count;
    end if;
    return new;
end;
$$;

drop trigger if exists live_rooms_updated_at on public.live_rooms;
create trigger live_rooms_updated_at
    before update on public.live_rooms
    for each row execute function public.live_rooms_set_updated_at();

-- Indekslar
create index if not exists live_rooms_is_live_idx    on public.live_rooms (is_live, created_at desc);
create index if not exists live_rooms_host_idx        on public.live_rooms (host_id);
create index if not exists live_rooms_updated_at_idx  on public.live_rooms (updated_at desc);

-- ──────────────────────────────────────────────
-- 1b. JADVAL: live_chat_messages
-- Efir paytida yozilgan chat xabarlarini saqlash uchun
-- ──────────────────────────────────────────────
create table if not exists public.live_chat_messages (
    id            uuid        primary key default gen_random_uuid(),
    room_id       uuid        not null references public.live_rooms(id) on delete cascade,
    user_id       uuid        references auth.users(id) on delete cascade,
    user_name     text        not null,
    user_avatar   text,
    message       text        not null,
    created_at    timestamptz not null default now()
);

-- Indekslar
create index if not exists live_chat_messages_room_idx on public.live_chat_messages (room_id, created_at asc);

-- ──────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────
alter table public.live_rooms enable row level security;
alter table public.live_chat_messages enable row level security;

-- Hamma (login bo'lmagan ham) jonli efirlarni ko'ra oladi
drop policy if exists "live_rooms_select" on public.live_rooms;
create policy "live_rooms_select"
    on public.live_rooms for select
    using (true);

-- Faqat login bo'lgan foydalanuvchi o'z efirini yaratadi
drop policy if exists "live_rooms_insert" on public.live_rooms;
create policy "live_rooms_insert"
    on public.live_rooms for insert
    with check (auth.uid() = host_id);

-- Faqat egasi yangilaydi (viewer_count, is_live, ended_at, thumbnail_url, video_url)
drop policy if exists "live_rooms_update" on public.live_rooms;
create policy "live_rooms_update"
    on public.live_rooms for update
    using  (auth.uid() = host_id)
    with check (auth.uid() = host_id);

-- Faqat egasi o'chiradi
drop policy if exists "live_rooms_delete" on public.live_rooms;
create policy "live_rooms_delete"
    on public.live_rooms for delete
    using (auth.uid() = host_id);

-- Chat RLS
drop policy if exists "live_chat_messages_select" on public.live_chat_messages;
create policy "live_chat_messages_select"
    on public.live_chat_messages for select
    using (true);

drop policy if exists "live_chat_messages_insert" on public.live_chat_messages;
create policy "live_chat_messages_insert"
    on public.live_chat_messages for insert
    with check (auth.uid() = user_id or user_id is null);

-- ──────────────────────────────────────────────
-- 3. SUPABASE REALTIME — postgres_changes
-- ──────────────────────────────────────────────
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname    = 'supabase_realtime'
          and schemaname = 'public'
          and tablename  = 'live_rooms'
    ) then
        alter publication supabase_realtime add table public.live_rooms;
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname    = 'supabase_realtime'
          and schemaname = 'public'
          and tablename  = 'live_chat_messages'
    ) then
        alter publication supabase_realtime add table public.live_chat_messages;
    end if;
end $$;

-- ──────────────────────────────────────────────
-- 4. SUPABASE REALTIME — Broadcast (WebRTC Signaling)
-- ──────────────────────────────────────────────

-- ──────────────────────────────────────────────
-- 5. Eskirgan efirlarni tozalash funksiyasi
-- ──────────────────────────────────────────────
create or replace function public.cleanup_old_live_rooms()
returns integer language plpgsql as $$
declare
    deleted_count integer;
begin
    delete from public.live_rooms
    where is_live = false
      and ended_at < now() - interval '7 days';
    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

-- ──────────────────────────────────────────────
-- 6. VIEW: jonli efirlar + so'nggi 24 soatda tugagan efirlar
-- ──────────────────────────────────────────────
create or replace view public.live_rooms_with_host as
    select
        r.id,
        r.host_id,
        r.title,
        r.game,
        r.thumbnail_url,
        r.video_url,
        r.is_live,
        r.viewer_count,
        r.peak_viewers,
        r.created_at,
        r.ended_at,
        r.updated_at,
        p.username   as host_username,
        p.avatar_url as host_avatar_url,
        p.nickname   as host_nickname
    from public.live_rooms r
    left join public.profiles p on p.id = r.host_id
    where
        -- Aktiv efirlar
        r.is_live = true
        or
        -- So'nggi 24 soatda tugagan efirlar
        (r.is_live = false and r.ended_at >= now() - interval '24 hours')
    order by
        -- Aktiv efirlar birinchi
        r.is_live desc,
        -- Aktiv: tomoshabinlar soni bo'yicha
        case when r.is_live then r.viewer_count end desc nulls last,
        -- Tugagan: eng so'nggi birinchi
        case when not r.is_live then r.ended_at end desc nulls last;
 - interval '24 hours')
    order by
        -- Aktiv efirlar birinchi
        r.is_live desc,
        -- Aktiv: tomoshabinlar soni bo'yicha
        case when r.is_live then r.viewer_count end desc nulls last,
        -- Tugagan: eng so'nggi birinchi
        case when not r.is_live then r.ended_at end desc nulls last;

-- ──────────────────────────────────────────────
-- 7. Eskirgan efirlarni tozalash
-- Supabase Dashboard > Database > Extensions > pg_cron yoqilsa:
--
--   select cron.schedule(
--       'cleanup-old-live-rooms',
--       '0 3 * * *',
--       $$ delete from public.live_rooms
--          where is_live = false
--          and ended_at < now() - interval '7 days' $$
--   );
--
-- Yoki Supabase Edge Function orqali har kuni ishlatiladi.
-- ──────────────────────────────────────────────
create or replace function public.cleanup_old_live_rooms()
returns integer language plpgsql as $$
declare
    deleted_count integer;
begin
    delete from public.live_rooms
    where is_live = false
      and ended_at < now() - interval '7 days';
    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;
