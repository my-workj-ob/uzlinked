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
            const { data } = await supabase.auth.getUser()
            const user = data?.user
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
        } catch (e: any) {
            if (e?.message?.includes('Failed to fetch') || e?.message?.includes('fetch')) {
                console.warn('Story\'larni olishda tarmoq xatoligi:', e)
                alert('Internet aloqasi yo\'q yoki server bilan aloqa muammosi mavjud. Iltimos, internetingizni tekshiring.')
            } else {
                console.error('Story\'larni olishda xatolik:', e)
                alert('Story\'larni olishda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.')
            }
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
