"use client"

import { Stories } from '@/components/stories'
import { PostCard } from '@/components/post-card'
import { PromotedCard } from '@/components/promoted-card'

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-[#F7F9FB] text-slate-800 font-sans antialiased selection:bg-blue-500 selection:text-white">
            <Stories />
            <div className="space-y-4">
                <PostCard />
                <PromotedCard />
            </div>
        </div>

    )
}