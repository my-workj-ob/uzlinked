import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            return NextResponse.json({ error: 'Avtorizatsiyadan o\'tilmagan' }, { status: 401 })
        }

        const { error } = await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', session.user.id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Hisobingiz PRO darajasiga ko\'tarildi!' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
