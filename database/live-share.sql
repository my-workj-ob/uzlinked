-- ============================================================
-- LIVE SHARE (Gamerlar uchun jonli efir) — desktop only
-- Idempotent: qayta ishga tushirsa ham xavfsiz
-- ============================================================

-- Jonli efir xonalari
create table if not exists public.live_rooms (
    id uuid primary key default gen_random_uuid(),
    host_id uuid not null references auth.users (id) on delete cascade,
    title text not null default 'Jonli efir',
    game text,
    is_live boolean not null default true,
    viewer_count integer not null default 0,
    created_at timestamptz not null default now(),
    ended_at timestamptz
);

create index if not exists live_rooms_is_live_idx on public.live_rooms (is_live, created_at desc);
create index if not exists live_rooms_host_idx on public.live_rooms (host_id);

alter table public.live_rooms enable row level security;

-- Hamma jonli efirlarni ko'ra oladi
drop policy if exists "live_rooms_select" on public.live_rooms;
create policy "live_rooms_select"
    on public.live_rooms for select
    using (true);

-- Faqat o'zining efirini yaratadi
drop policy if exists "live_rooms_insert" on public.live_rooms;
create policy "live_rooms_insert"
    on public.live_rooms for insert
    with check (auth.uid() = host_id);

-- Faqat egasi yangilaydi (viewer_count, is_live, ended_at)
drop policy if exists "live_rooms_update" on public.live_rooms;
create policy "live_rooms_update"
    on public.live_rooms for update
    using (auth.uid() = host_id)
    with check (auth.uid() = host_id);

-- Faqat egasi o'chiradi
drop policy if exists "live_rooms_delete" on public.live_rooms;
create policy "live_rooms_delete"
    on public.live_rooms for delete
    using (auth.uid() = host_id);

-- Lobby jonli yangilanishi uchun realtime'ga qo'shamiz (agar hali bo'lmasa)
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'live_rooms'
    ) then
        alter publication supabase_realtime add table public.live_rooms;
    end if;
exception when others then
    -- publication mavjud bo'lmasa jim o'tamiz
    null;
end $$;
