import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PostType } from '@/components/post-card'

export interface ProfileData {
  id: string
  username: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
}

export interface ProfileResponse {
  profile: ProfileData
  isOwnProfile: boolean
  isFollowing: boolean
  followersCount: number
  followingCount: number
  posts: any[]
  isPrivateProfile?: boolean
  hideContent?: boolean
}

// ----------------------------------------------------
// 1. Queries
// ----------------------------------------------------

// Feed posts query
export function usePosts() {
  return useQuery<PostType[]>({
    queryKey: ['posts'],
    queryFn: async () => {
      const res = await fetch('/api/posts', { cache: 'no-store' })
      if (!res.ok) throw new Error('Postlarni yuklashda xatolik yuz berdi')
      return res.json()
    },
  })
}

// Single post detail query
export function usePost(postId: string) {
  return useQuery<PostType>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts?id=${postId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Post topilmadi')
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return data[0]
      }
      throw new Error('Post topilmadi')
    },
    enabled: !!postId,
  })
}

// Profile details query
export function useProfile(userId: string) {
  return useQuery<ProfileResponse>({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Profilni yuklashda xatolik yuz berdi')
      }
      return res.json()
    },
    enabled: !!userId,
  })
}

// ----------------------------------------------------
// 2. Mutations
// ----------------------------------------------------

// Toggle like mutation
export function useLikeToggle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string | number) => {
      const res = await fetch('/api/posts/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        const errorData = await res.json()
        throw new Error(errorData.error || 'Serverda xatolik yuz berdi')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidate posts queries so it is up-to-date across components
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Follow toggle mutation
export function useFollowToggle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Xatolik yuz berdi')
      }
      return res.json()
    },
    onSuccess: (data, targetUserId) => {
      queryClient.invalidateQueries({ queryKey: ['profile', targetUserId] })
    },
  })
}

// Update post content mutation
export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, content }: { id: string | number; content: string }) => {
      const res = await fetch('/api/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Postni tahrirlash imkonsiz bo'ldi")
      }
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', String(variables.id)] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Delete post mutation
export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string | number) => {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Postni o'chirish imkonsiz bo'ldi")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// ----------------------------------------------------
// 3. Settings & Security Hooks
// ----------------------------------------------------

export interface SecurityLog {
  id: string
  user_id: string
  event_type: 'login' | 'logout' | 'password_change' | 'privacy_toggle' | 'two_factor_toggle' | 'account_delete_attempt'
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface SettingsProfile {
  id: string
  username: string
  nickname: string | null
  avatar_url: string | null
  bio: string | null
  is_private: boolean
  is_two_factor_enabled: boolean
}

export interface SettingsData {
  profile: SettingsProfile
  logs: SecurityLog[]
}

export interface UpdateSettingsInput {
  nickname?: string
  username?: string
  bio?: string
  avatar_url?: string
  is_private?: boolean
  is_two_factor_enabled?: boolean
  password?: string
}

// Fetch user settings and security logs
export function useSettings() {
  return useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch(`/api/profile/settings?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Sozlamalarni yuklashda xatolik yuz berdi')
      }
      return res.json()
    },
  })
}

// Update settings and security toggles / password
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpdateSettingsInput) => {
      const res = await fetch('/api/profile/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Sozlamalarni saqlash imkonsiz bo'ldi")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// Delete user account
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/profile/settings', { method: 'DELETE' })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Hisobni o'chirish imkonsiz bo'ldi")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

