"use client"

import React, { useState, useEffect } from 'react'
import { PostCard, PostType } from '@/components/post-card'
import { Stories } from '@/components/stories'

export default function FeedList() {
    const [posts, setPosts] = useState<PostType[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPosts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/posts')
            if (!response.ok) throw new Error('Postlarni yuklashda xatolik yuz berdi')
            const data = await response.json()
            setPosts(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPosts()
    }, [])

    const handleUpdatePost = async (id: string | number, newContent: string) => {
        try {
            const response = await fetch('/api/posts', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, content: newContent }),
            })

            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Postni tahrirlash imkonsiz bo'ldi")
            }

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
        const confirmDelete = window.confirm("Ushbu postni butunlay o'chirishni xohlaysizmi?")
        if (!confirmDelete) return

        try {
            const response = await fetch(`/api/posts?id=${id}`, {
                method: 'DELETE',
              })
  
              if (!response.ok) {
                  const errData = await response.json()
                  throw new Error(errData.error || "Postni o'chirish imkonsiz bo'ldi")
              }
  
              setPosts(prevPosts => prevPosts.filter(post => post.id !== id))
          } catch (err: any) {
              alert(`Xatolik: ${err.message}`)
          }
      }
  
      if (loading) {
          return (
              <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold text-slate-400">Tasmani yangilash...</p>
              </div>
          )
      }
  
      if (error) {
          return (
              <div className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">
                  {error}. Sahifani qayta yangilang.
              </div>
          )
      }
  
      return (
          <div className="flex flex-col gap-4">
              <Stories />
              
              {posts.length === 0 ? (
                  <div className="w-full py-16 bg-slate-50/50 border border-dashed border-slate-100 rounded-2xl text-center">
                      <p className="text-xs text-slate-400 font-bold">Hozircha hech qanday post yo'q 🏜️</p>
                  </div>
              ) : (
                  posts.map((post) => (
                      <PostCard
                          key={post.id}
                          post={post}
                          onDeletePost={handleDeletePost}
                          onUpdatePost={handleUpdatePost}
                      />
                  ))
              )}
          </div>
      )
  }