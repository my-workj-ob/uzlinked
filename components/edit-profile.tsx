"use client"

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function EditProfileForm({ profile, onClose }: { profile: any, onClose: () => void }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nickname: profile?.nickname || "",
        username: profile?.username || "",
        bio: profile?.bio || ""
    })
    const supabase = createClient()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        const { error } = await supabase
            .from('profiles')
            .update(formData)
            .eq('id', profile.id)

        if (!error) {
            router.refresh() // Sahifani yangilash
            onClose()
        } else {
            alert("Xatolik yuz berdi: " + error.message)
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Profilni tahrirlash</h3>
            <input 
                className="w-full p-2 border rounded-lg mb-3"
                placeholder="Nickname"
                value={formData.nickname}
                onChange={e => setFormData({...formData, nickname: e.target.value})}
            />
            <input 
                className="w-full p-2 border rounded-lg mb-3"
                placeholder="Username"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
            />
            <textarea 
                className="w-full p-2 border rounded-lg mb-3"
                placeholder="Bio"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
            />
            <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg">Bekor qilish</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">
                    {loading ? "Saqlanmoqda..." : "Saqlash"}
                </button>
            </div>
        </form>
    )
}