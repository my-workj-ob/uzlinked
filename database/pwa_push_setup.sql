-- =========================================================================
-- PWA PUSH NOTIFICATIONS SETUP
-- =========================================================================
-- Run this script in your Supabase SQL Editor.

-- 1. Create push_subscriptions table to store client subscription credentials
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies for push_subscriptions
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- 3. Add notification_settings JSONB column to public.profiles table
-- This stores the 17 notification toggles, grouped by category, defaulting to true.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "interactions": {
    "likes": true,
    "comments": true,
    "shares": true,
    "mentions": true
  },
  "social": {
    "followers": true,
    "requests": true,
    "friend_activity": true
  },
  "chat": {
    "direct_messages": true,
    "group_mentions": true
  },
  "content": {
    "stories": true,
    "live": true
  },
  "monetization": {
    "tips": true,
    "marketplace": true
  },
  "retention": {
    "daily_goals": true,
    "reminders": true
  },
  "system": {
    "security_alerts": true,
    "billing": true
  }
}'::jsonb;
