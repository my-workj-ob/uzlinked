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

        if (tab === 'ijodkorlar' || query) {
            // Foydalanuvchilarni qidirish
            let profileQuery = supabase
                .from('profiles')
                .select('id, nickname, username, avatar_url, bio')
                .limit(20)

            if (query) {
                profileQuery = profileQuery.or(`nickname.ilike.%${query}%,username.ilike.%${query}%`)
            }

            const { data: profiles, error } = await profileQuery
            if (error) throw error

            // Har bir foydalanuvchining followers sonini olish
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

                    // Joriy user obuna bo'lganmi?
                    let isFollowing = false
                    if (currentUserId && currentUserId !== profile.id) {
                        const { data: followData } = await supabase
                            .from('follows')
                            .select('id')
                            .eq('follower_id', currentUserId)
                            .eq('following_id', profile.id)
                            .single()
                        isFollowing = !!followData
                    }

                    return {
                        ...profile,
                        avatar: profile.avatar_url || '/default-avatar.png',
                        followers: followersCount || 0,
                        posts: postsCount || 0,
                        isFollowing,
                        isMe: profile.id === currentUserId,
                    }
                })
            )

            return NextResponse.json({ type: 'profiles', data: enrichedProfiles })
        }

        // Postlarni rasm bilan olish (explore grid uchun)
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                id, image_key, content, created_at,
                profiles (nickname, avatar_url),
                likes (user_id)
            `)
            .not('image_key', 'is', null)
            .order('created_at', { ascending: false })
            .limit(30)

        if (error) throw error

        const formattedPosts = (posts || []).map((post: any) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
            return {
                id: post.id,
                image: post.image_key ? `/api/images?key=${post.image_key}` : null,
                content: post.content,
                author: profile?.nickname || 'Noma\'lum',
                avatar: profile?.avatar_url || '/default-avatar.png',
                likes: post.likes ? post.likes.length : 0,
                createdAt: post.created_at,
            }
        })

        return NextResponse.json({ type: 'posts', data: formattedPosts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
