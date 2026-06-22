import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getSupabaseClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {}
                },
            },
        }
    )
}function calculateVibeScore(
    item: any,
    type: 'post' | 'reel' | 'profile' | 'group_channel',
    currentUserTags: string[],
    isFollowingOrJoined: boolean
): number {
    let baseEngagement = 1.0
    if (type === 'post' || type === 'reel') {
        const likes = Number(item.likes) || 0
        const comments = Number(item.comments_count) || 0
        const views = Number(item.views_count) || 0
        baseEngagement = (likes * 1.5) + (comments * 3.5) + (views * 0.1) + 1.0
    } else if (type === 'profile') {
        const followers = Number(item.followers) || 0
        const posts = Number(item.posts) || 0
        baseEngagement = (followers * 2.0) + (posts * 1.0) + 1.0
    } else if (type === 'group_channel') {
        const members = Number(item.memberCount) || 0
        baseEngagement = (members * 2.0) + 1.0
    }

    let ageInHours = 0
    if (item.created_at) {
        const ageInMs = Date.now() - new Date(item.created_at).getTime()
        ageInHours = Math.max(0, ageInMs / (1000 * 60 * 60))
    }
    const timeDecay = Math.pow(ageInHours + 2, 1.6)

    let itemTags: string[] = []
    if (Array.isArray(item.tags)) {
        itemTags = item.tags
    } else {
        const textToAnalyze = (item.content || item.description || item.title || item.name || '').toLowerCase()
        const hashtags = textToAnalyze.match(/#(\w+)/g)
        if (hashtags) {
            itemTags = hashtags.map((h: string) => h.replace('#', ''))
        }
    }

    const matchingTagsCount = itemTags.filter(tag =>
        currentUserTags.some(ut => ut.toLowerCase() === tag.toLowerCase())
    ).length
    const tagMatchBoost = 1.0 + (matchingTagsCount * 0.4)

    let discoveryBoost = 1.0
    if (type === 'profile') {
        discoveryBoost = isFollowingOrJoined ? 1.0 : 1.25
    } else if (type === 'group_channel') {
        discoveryBoost = isFollowingOrJoined ? 1.0 : 1.15
    }

    return (baseEngagement / timeDecay) * tagMatchBoost * discoveryBoost
}

// GET — Explore sahifasi uchun postlar va foydalanuvchilarni qidirish
export async function GET(request: Request) {
    try {
        const supabase = await getSupabaseClient()
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q') || ''
        const tab = searchParams.get('tab') || 'trendlar'

        const { data: { session } } = await supabase.auth.getSession()
        const currentUserId = session?.user?.id

        let currentUserTags: string[] = []
        if (currentUserId) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('tags')
                .eq('id', currentUserId)
                .maybeSingle()
            if (userProfile && Array.isArray(userProfile.tags)) {
                currentUserTags = userProfile.tags
            }
        }

        // ==========================================
        // 1. UNIFIED SEARCH TABS ("All" Tab)
        // ==========================================
        if (tab === 'all') {
            // A. Profiles
            let profileQuery = supabase
                .from('profiles')
                .select('id, nickname, username, avatar_url, bio, is_professional_mode, headline, tags, open_for_collab, is_private, is_premium')
                .not('is_private', 'eq', true)
                .limit(20)

            if (query) {
                profileQuery = profileQuery.or(`nickname.ilike.%${query}%,username.ilike.%${query}%,headline.ilike.%${query}%,tags::text.ilike.%${query}%`)
            }

            const { data: rawProfiles, error: profErr } = await profileQuery
            if (profErr) throw profErr

            const enrichedProfiles = await Promise.all(
                (rawProfiles || []).map(async (profile: any) => {
                    const { count: followersCount } = await supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('following_id', profile.id)

                    const { count: postsCount } = await supabase
                        .from('posts')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', profile.id)

                    let isFollowing = false
                    if (currentUserId && currentUserId !== profile.id) {
                        const { data: followData } = await supabase
                            .from('follows')
                            .select('id')
                            .eq('follower_id', currentUserId)
                            .eq('following_id', profile.id)
                            .maybeSingle()
                        isFollowing = !!followData
                    }

                    return {
                        ...profile,
                        avatar: profile.avatar_url || '/default-avatar.png',
                        followers: followersCount || 0,
                        posts: postsCount || 0,
                        isFollowing,
                        isMe: profile.id === currentUserId,
                        isPremium: profile.is_premium || false,
                    }
                })
            )

            const scoredProfiles = enrichedProfiles.map(profile => {
                const vibeScore = calculateVibeScore(profile, 'profile', currentUserTags, profile.isFollowing)
                return { ...profile, vibeScore }
            }).sort((a, b) => b.vibeScore - a.vibeScore).slice(0, 5)

            // B. Groups & Channels
            let groupQuery = supabase
                .from('groups_channels')
                .select('id, name, username, avatar_url, description, type, creator_id, created_at')
                .eq('is_public', true)
                .limit(20)

            if (query) {
                groupQuery = groupQuery.or(`name.ilike.%${query}%,username.ilike.%${query}%,description.ilike.%${query}%`)
            }

            const { data: rawGroups, error: groupErr } = await groupQuery
            if (groupErr) throw groupErr

            const enrichedGroups = await Promise.all(
                (rawGroups || []).map(async (group: any) => {
                    const { count: memberCount } = await supabase
                        .from('group_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id)

                    let isMember = false
                    if (currentUserId) {
                        const { data: memberData } = await supabase
                            .from('group_members')
                            .select('id')
                            .eq('group_id', group.id)
                            .eq('user_id', currentUserId)
                            .maybeSingle()
                        isMember = !!memberData
                    }

                    return {
                        ...group,
                        avatar: group.avatar_url || '/default-avatar.png',
                        memberCount: memberCount || 0,
                        isMember,
                    }
                })
            )

            const scoredGroups = enrichedGroups.map(group => {
                const vibeScore = calculateVibeScore(group, 'group_channel', currentUserTags, group.isMember)
                return { ...group, vibeScore }
            }).sort((a, b) => b.vibeScore - a.vibeScore).slice(0, 5)

            // C. Posts & Reels
            let postsQuery = supabase
                .from('posts')
                .select(`
                    id, image_url, content, created_at,
                    profiles (nickname, avatar_url, is_private, is_premium),
                    likes (user_id),
                    comments (id)
                `)
                .not('image_url', 'is', null)
                .order('created_at', { ascending: false })

            if (query) {
                postsQuery = postsQuery.ilike('content', `%${query}%`)
            }
            postsQuery = postsQuery.limit(20)

            let reelsQuery = supabase
                .from('reels')
                .select(`
                    id, video_key, thumbnail_key, title, description, created_at, views_count,
                    profiles (nickname, avatar_url, is_private),
                    reel_likes (user_id),
                    reel_comments (id)
                `)
                .order('created_at', { ascending: false })

            if (query) {
                reelsQuery = reelsQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
            }
            reelsQuery = reelsQuery.limit(20)

            const [postsRes, reelsRes] = await Promise.all([postsQuery, reelsQuery])
            if (postsRes.error) throw postsRes.error
            if (reelsRes.error) throw reelsRes.error

            const formattedPosts = (postsRes.data || [])
                .filter((p: any) => {
                    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
                    return !prof || !prof.is_private
                })
                .map((post: any) => {
                    const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
                    return {
                        id: post.id,
                        type: 'post',
                        image: post.image_url,
                        content: post.content,
                        author: profile?.nickname || 'Noma\'lum',
                        avatar: profile?.avatar_url || '/default-avatar.png',
                        likes: post.likes ? post.likes.length : 0,
                        comments_count: post.comments ? post.comments.length : 0,
                        created_at: post.created_at,
                        authorIsPremium: profile?.is_premium || false,
                    }
                })

            const formattedReels = (reelsRes.data || [])
                .filter((r: any) => {
                    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                    return !prof || !prof.is_private
                })
                .map((reel: any) => {
                    const profile = Array.isArray(reel.profiles) ? reel.profiles[0] : reel.profiles
                    let videoUrl = ''
                    if (reel.video_key) {
                        if (reel.video_key.startsWith('http')) {
                            videoUrl = reel.video_key
                        } else if (reel.video_key.includes('/')) {
                            videoUrl = `/api/videos?key=${reel.video_key}`
                        } else {
                            videoUrl = `https://utfs.io/f/${reel.video_key}`
                        }
                    }
                    let thumbnailUrl = null
                    if (reel.thumbnail_key) {
                        if (reel.thumbnail_key.startsWith('http')) {
                            thumbnailUrl = reel.thumbnail_key
                        } else if (reel.thumbnail_key.includes('/')) {
                            thumbnailUrl = `/api/images?key=${reel.thumbnail_key}`
                        } else {
                            thumbnailUrl = `https://utfs.io/f/${reel.thumbnail_key}`
                        }
                    }
                    return {
                        id: reel.id,
                        type: 'reel',
                        image: thumbnailUrl || videoUrl,
                        videoUrl: videoUrl,
                        content: reel.description || reel.title || '',
                        author: profile?.nickname || 'Noma\'lum',
                        avatar: profile?.avatar_url || '/default-avatar.png',
                        likes: reel.reel_likes ? reel.reel_likes.length : 0,
                        comments_count: reel.reel_comments ? reel.reel_comments.length : 0,
                        views_count: reel.views_count || 0,
                        created_at: reel.created_at,
                    }
                })

            const scoredContent = [...formattedPosts, ...formattedReels].map(item => {
                const vibeScore = calculateVibeScore(item, item.type as any, currentUserTags, false)
                return { ...item, vibeScore }
            }).sort((a, b) => b.vibeScore - a.vibeScore).slice(0, 10)

            return NextResponse.json({
                type: 'all',
                data: {
                    profiles: scoredProfiles,
                    groups: scoredGroups,
                    posts: scoredContent,
                }
            })
        }

        if (tab === 'guruhlar' || tab === 'kanallar') {
            const targetType = tab === 'guruhlar' ? 'group' : 'channel'
            let groupQuery = supabase
                .from('groups_channels')
                .select('id, name, username, avatar_url, description, type, creator_id, created_at')
                .eq('is_public', true)
                .eq('type', targetType)
                .limit(30)

            if (query) {
                groupQuery = groupQuery.or(`name.ilike.%${query}%,username.ilike.%${query}%,description.ilike.%${query}%`)
            }

            const { data: groups, error } = await groupQuery
            if (error) throw error

            const enrichedGroups = await Promise.all(
                (groups || []).map(async (group: any) => {
                    const { count: memberCount } = await supabase
                        .from('group_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id)

                    let isMember = false
                    if (currentUserId) {
                        const { data: memberData } = await supabase
                            .from('group_members')
                            .select('id')
                            .eq('group_id', group.id)
                            .eq('user_id', currentUserId)
                            .maybeSingle()
                        isMember = !!memberData
                    }

                    return {
                        ...group,
                        avatar: group.avatar_url || '/default-avatar.png',
                        memberCount: memberCount || 0,
                        isMember,
                    }
                })
            )

            // VibeScore sort for groups discovery
            const scoredGroups = enrichedGroups.map(group => {
                const vibeScore = calculateVibeScore(group, 'group_channel', currentUserTags, false)
                return { ...group, vibeScore }
            }).sort((a, b) => b.vibeScore - a.vibeScore)

            return NextResponse.json({ type: 'groups_channels', data: scoredGroups })
        }

        // ==========================================
        // 3. CREATORS & PROFESSIONALS TABS
        // ==========================================
        if (tab === 'ijodkorlar' || tab === 'hamjamiyat' || query) {
            let profileQuery = supabase
                .from('profiles')
                .select('id, nickname, username, avatar_url, bio, is_professional_mode, headline, tags, open_for_collab, is_private, is_premium')
                .not('is_private', 'eq', true)
                .limit(20)

            if (tab === 'hamjamiyat') {
                profileQuery = profileQuery.eq('is_professional_mode', true)
            }

            if (query) {
                if (tab === 'hamjamiyat') {
                    profileQuery = profileQuery.or(`nickname.ilike.%${query}%,username.ilike.%${query}%,headline.ilike.%${query}%,tags::text.ilike.%${query}%`)
                } else {
                    profileQuery = profileQuery.or(`nickname.ilike.%${query}%,username.ilike.%${query}%`)
                }
            }

            const { data: profiles, error } = await profileQuery
            if (error) throw error

            const enrichedProfiles = await Promise.all(
                (profiles || []).map(async (profile: any) => {
                    const { count: followersCount } = await supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('following_id', profile.id)

                    const { count: postsCount } = await supabase
                        .from('posts')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', profile.id)

                    let isFollowing = false
                    if (currentUserId && currentUserId !== profile.id) {
                        const { data: followData } = await supabase
                            .from('follows')
                            .select('id')
                            .eq('follower_id', currentUserId)
                            .eq('following_id', profile.id)
                            .maybeSingle()
                        isFollowing = !!followData
                    }

                    return {
                        ...profile,
                        avatar: profile.avatar_url || '/default-avatar.png',
                        followers: followersCount || 0,
                        posts: postsCount || 0,
                        isFollowing,
                        isMe: profile.id === currentUserId,
                        isPremium: profile.is_premium || false,
                    }
                })
            )

            // VibeScore sort for profiles/creators
            const scoredProfiles = enrichedProfiles.map(profile => {
                const vibeScore = calculateVibeScore(profile, 'profile', currentUserTags, profile.isFollowing)
                return { ...profile, vibeScore }
            }).sort((a, b) => b.vibeScore - a.vibeScore)

            return NextResponse.json({ type: 'profiles', data: scoredProfiles })
        }

        // ==========================================
        // 4. TRENDING TAB (Combined Posts & Reels)
        // ==========================================
        const { data: posts, error: postsErr } = await supabase
            .from('posts')
            .select(`
                id, image_url, content, created_at,
                profiles (nickname, avatar_url, is_private, is_premium),
                likes (user_id),
                comments (id)
            `)
            .not('image_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30)

        const { data: reels, error: reelsErr } = await supabase
            .from('reels')
            .select(`
                id, video_key, thumbnail_key, title, description, created_at, views_count,
                profiles (nickname, avatar_url, is_private),
                reel_likes (user_id),
                reel_comments (id)
            `)
            .order('created_at', { ascending: false })
            .limit(30)

        if (postsErr) throw postsErr
        if (reelsErr) throw reelsErr

        const formattedPosts = (posts || [])
            .filter((p: any) => {
                const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
                return !prof || !prof.is_private
            })
            .map((post: any) => {
                const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
                return {
                    id: post.id,
                    type: 'post',
                    image: post.image_url,
                    content: post.content,
                    author: profile?.nickname || 'Noma\'lum',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    likes: post.likes ? post.likes.length : 0,
                    comments_count: post.comments ? post.comments.length : 0,
                    created_at: post.created_at,
                    authorIsPremium: profile?.is_premium || false,
                }
            })

        const formattedReels = (reels || [])
            .filter((r: any) => {
                const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
                return !prof || !prof.is_private
            })
            .map((reel: any) => {
                const profile = Array.isArray(reel.profiles) ? reel.profiles[0] : reel.profiles
                let videoUrl = ''
                if (reel.video_key) {
                    if (reel.video_key.startsWith('http')) {
                        videoUrl = reel.video_key
                    } else if (reel.video_key.includes('/')) {
                        videoUrl = `/api/videos?key=${reel.video_key}`
                    } else {
                        videoUrl = `https://utfs.io/f/${reel.video_key}`
                    }
                }
                let thumbnailUrl = null
                if (reel.thumbnail_key) {
                    if (reel.thumbnail_key.startsWith('http')) {
                        thumbnailUrl = reel.thumbnail_key
                    } else if (reel.thumbnail_key.includes('/')) {
                        thumbnailUrl = `/api/images?key=${reel.thumbnail_key}`
                    } else {
                        thumbnailUrl = `https://utfs.io/f/${reel.thumbnail_key}`
                    }
                }
                return {
                    id: reel.id,
                    type: 'reel',
                    image: thumbnailUrl || videoUrl,
                    videoUrl: videoUrl,
                    content: reel.description || reel.title || '',
                    author: profile?.nickname || 'Noma\'lum',
                    avatar: profile?.avatar_url || '/default-avatar.png',
                    likes: reel.reel_likes ? reel.reel_likes.length : 0,
                    comments_count: reel.reel_comments ? reel.reel_comments.length : 0,
                    views_count: reel.views_count || 0,
                    created_at: reel.created_at,
                }
            })

        // Sort everything using our VibeScore Recommendation Engine
        const combinedContent = [...formattedPosts, ...formattedReels].map(item => {
            const vibeScore = calculateVibeScore(item, item.type as any, currentUserTags, false)
            return { ...item, vibeScore }
        }).sort((a, b) => b.vibeScore - a.vibeScore)

        return NextResponse.json({ type: 'posts', data: combinedContent.slice(0, 30) })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
