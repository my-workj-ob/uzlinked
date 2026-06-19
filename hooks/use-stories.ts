"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface StoryItem {
    id: string
    media_url: string
    media_type: 'image' | 'video'
    created_at: string
    expires_at: string
}

export interface StoryUserGroup {
    user_id: string
    username: string
    nickname: string | null
    avatar_url: string | null
    stories: StoryItem[]
}

export const useStories = () => {
    const [storyGroups, setStoryGroups] = useState<StoryUserGroup[]>([])
    const [myProfile, setMyProfile] = useState<{ id: string; avatar_url: string | null; username: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createClient()

    const fetchStories = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const [storiesRes, profileRes] = await Promise.all([
                fetch('/api/stories'),
                supabase.from('profiles').select('id, avatar_url, username').eq('id', user.id).single(),
            ])

            const storiesJson = await storiesRes.json()
            if (storiesRes.ok) {
                setStoryGroups(storiesJson.data || [])
            }

            if (profileRes.data) {
                setMyProfile(profileRes.data)
            }
        } catch (e) {
            console.error('Story\'larni olishda xatolik:', e)
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchStories()
    }, [fetchStories])

    // Mening story'larimni va boshqalarnikini ajratamiz
    const myStoryGroup = storyGroups.find(g => g.user_id === myProfile?.id)
    const otherStoryGroups = storyGroups.filter(g => g.user_id !== myProfile?.id)

    return {
        storyGroups,
        myStoryGroup,
        otherStoryGroups,
        myProfile,
        isLoading,
        refetch: fetchStories,
    }
}