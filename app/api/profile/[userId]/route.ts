import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
    }

    // Profil ma'lumotlarini olish
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, nickname, avatar_url, bio, is_private, is_two_factor_enabled, is_professional_mode, headline, tags, experience_info, contact_links, open_for_collab, is_premium')
        .eq('id', userId)
        .single()

    if (profileError || !profile) {
        return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 })
    }

    const isOwnProfile = user.id === userId

    // Joriy user shu profilga obuna bo'lganmi
    let isFollowing = false
    if (!isOwnProfile) {
        const { data: followRow } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle()

        isFollowing = !!followRow
    }

    const isPrivateProfile = profile.is_private || false
    const hideContent = isPrivateProfile && !isOwnProfile && !isFollowing

    // Shu userning postlarini faqat shartlar bajarilganda olish
    let formattedPosts: any[] = []
    if (!hideContent) {
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select(`
                id,
                content,
                image_url,
                created_at,
                likes:likes(count),
                comments:comments(count)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (postsError) {
            return NextResponse.json({ error: postsError.message }, { status: 500 })
        }

        // Joriy user ushbu postlarni like bosganmi, shuni tekshirish
        const postIds = (posts || []).map(p => p.id)
        let likedPostIds: (string | number)[] = []

        if (postIds.length > 0) {
            const { data: myLikes } = await supabase
                .from('likes')
                .select('post_id')
                .eq('user_id', user.id)
                .in('post_id', postIds)

            likedPostIds = (myLikes || []).map(l => l.post_id)
        }

        formattedPosts = (posts || []).map((p: any) => ({
            id: p.id,
            authorId: userId,
            content: p.content,
            image: p.image_url,
            createdAt: p.created_at,
            likes: p.likes?.[0]?.count || 0,
            commentsCount: p.comments?.[0]?.count || 0,
            likedByMe: likedPostIds.includes(p.id),
        }))
    }

    // Followers / following sonlari
    const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId)

    const { count: followingCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId)

    return NextResponse.json({
        profile,
        posts: formattedPosts,
        isOwnProfile,
        isFollowing,
        isPrivateProfile,
        hideContent,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
    })
}