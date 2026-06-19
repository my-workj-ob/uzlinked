import React from 'react'

export function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-4">
          {/* Header Skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          </div>
          {/* Image/Content Skeleton */}
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
          </div>
          <div className="aspect-4/3 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          {/* Action Row Skeleton */}
          <div className="flex items-center gap-4 pt-2">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="w-full animate-pulse pb-20">
      {/* Header Back Button */}
      <div className="flex items-center gap-3 pt-2 px-4">
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
      </div>

      {/* Cover Skeleton */}
      <div className="h-32 sm:h-44 w-full bg-slate-200 dark:bg-slate-800 sm:rounded-b-2xl mt-3" />

      {/* Avatar & Name Skeleton */}
      <div className="px-4 -mt-12 relative z-10 text-center sm:text-left sm:flex sm:items-end sm:gap-6 sm:px-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-slate-950 p-[3px] mx-auto sm:mx-0">
          <div className="w-full h-full bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
        <div className="mt-3 sm:mt-0 sm:mb-2 flex-1 space-y-2">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mx-auto sm:mx-0" />
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mx-auto sm:mx-0" />
        </div>
      </div>

      {/* Bio Skeleton */}
      <div className="px-4 mt-4 space-y-2 sm:px-6">
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mx-auto sm:mx-0" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mx-auto sm:mx-0" />
      </div>

      {/* Stats Skeleton */}
      <div className="mx-4 mt-6 py-2 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-8" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
        <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10" />
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-8" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
        <div className="w-px h-6 bg-slate-200/60 dark:bg-white/10" />
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-8" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
      </div>

      {/* Button Skeleton */}
      <div className="mx-4 mt-4 h-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />

      {/* Tab Skeleton */}
      <div className="mx-4 mt-6 border-b border-slate-200 dark:border-white/5 pb-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20 mx-auto" />
      </div>

      {/* Posts Skeleton */}
      <div className="w-full p-4 max-w-2xl mx-auto space-y-6">
        {[1, 2].map((i) => (
          <div key={i} className="border-b border-slate-100 dark:border-white/5 pb-5 space-y-3">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-16 px-4 bg-white/70 dark:bg-slate-900/70 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-20" />
        </div>
        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      {/* Main Skeleton */}
      <div className="py-8 max-w-2xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
          </div>
          <div className="aspect-4/3 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="flex items-center gap-4 pt-2">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}
