-- 1. Profiles jadvalini yaratish
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text unique,
  nickname text,
  avatar_url text,
  bio text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  primary key (id)
);

-- 2. RLS (Row Level Security) - Xavfsizlik qoidalari
alter table public.profiles enable row level security;

-- Har kim profilni ko'ra olsin
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

-- Foydalanuvchi faqat o'z profilini tahrirlay olsin
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- 3. Trigger funksiyasi (Defensive layer uchun)
-- Bu funksiya avtomatik ravishda yangi user ro'yxatdan o'tganda profil yaratadi
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'Yangi foydalanuvchi');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger'ni ishga tushirish
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();