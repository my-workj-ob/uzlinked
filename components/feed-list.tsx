// FeedList.tsx faylingizni quyidagicha yangilang:

"use client"

import React, { useState, useEffect } from 'react'
import { PostCard, PostType } from '@/components/post-card'

export default function FeedList() {
    const [posts, setPosts] = useState<PostType[]>([])
    const [loading, setLoading] = useState<boolean>(true)

    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts')
            if (!response.ok) throw new Error('Xato')
            const data = await response.json()
            setPosts(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPosts() }, [])

    // 🌟 1. TAHRIRLASH FUNKSIYASI (Yangi qo'shildi)
    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            const response = await fetch('/api/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, content: newContent })
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Yangilashda xato bo'ldi")
            }

            // Agar bazada muvaffaqiyatli yangilansa, UI (state) ni ham yangilaymiz
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    post.id === id ? { ...post, content: newContent } : post
                )
            )
        } catch (err: any) {
            alert(`Xatolik: ${err.message}`)
        }
    }

    const handleDeletePost = async (id: string | number) => {
        const confirmDelete = window.confirm("Ushbu postni o'chirishni xohlaysizmi?")
        if (!confirmDelete) return
        try {
            const response = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                setPosts(prev => prev.filter(post => post.id !== id))
            }
        } catch (err) { alert("O'chirishda xato") }
    }

    if (loading) return <div className="text-center py-10 text-xs">Yuklanmoqda...</div>

    return (
        <div className="flex flex-col gap-2.5">
            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onDeletePost={handleDeletePost}
                    onUpdatePost={handleUpdatePost} // 🌟 2. PROP ENDI UZATILDI!
                />
            ))}
        </div>
    )
}