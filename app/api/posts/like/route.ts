import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 401 })
        }

        try {
            const { postId } = await request.json()
            const userId = session.user.id

            const { data: existingLike } = await supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', userId)
                .maybeSingle()

            if (existingLike) {
                try {
                    await supabase.from('likes').delete().eq('id', existingLike.id)
                    return NextResponse.json({ liked: false })
                } catch (error) {
                    console.error('Error unliking post:', error)
                    return NextResponse.json({ error: 'Postni yoqtirmaslikda xatolik yuz berdi' }, { status: 500 })
                }
            } else {
                try {
                    await supabase.from('likes').insert({ post_id: postId, user_id: userId })
                    return NextResponse.json({ liked: true })
                } catch (error) {
                    console.error('Error liking post:', error)
                    return NextResponse.json({ error: 'Postni yoqtirishda xatolik yuz berdi' }, { status: 500 })
                }
            }
        } catch (error) {
            console.error('Error processing like request:', error)
            return NextResponse.json({ error: 'Like operatsiyasini bajarishda xatolik yuz berdi' }, { status: 500 })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
