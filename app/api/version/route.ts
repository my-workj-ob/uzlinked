import { NextResponse } from 'next/server'

let cachedCommit: any = null
let cacheTime = 0
const CACHE_TTL = 60 * 1000 // 60 seconds

export async function GET() {
    const now = Date.now()
    const serverSha = process.env.NEXT_PUBLIC_COMMIT_SHA || 'local-dev'

    if (cachedCommit && (now - cacheTime) < CACHE_TTL) {
        return NextResponse.json({
            commitSha: cachedCommit.sha,
            message: cachedCommit.commit?.message || '',
            author: cachedCommit.commit?.author?.name || '',
            date: cachedCommit.commit?.author?.date || '',
            serverSha
        })
    }

    try {
        const response = await fetch('https://api.github.com/repos/my-workj-ob/uzlinked/commits/main', {
            headers: {
                'User-Agent': 'VibeGrid-Update-Checker',
                'Accept': 'application/vnd.github.v3+json',
            },
            next: { revalidate: 60 }
        })

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        cachedCommit = data
        cacheTime = now

        return NextResponse.json({
            commitSha: data.sha,
            message: data.commit?.message || '',
            author: data.commit?.author?.name || '',
            date: data.commit?.author?.date || '',
            serverSha
        })
    } catch (error: any) {
        console.error('Failed to fetch version from GitHub:', error)
        if (cachedCommit) {
            return NextResponse.json({
                commitSha: cachedCommit.sha,
                message: cachedCommit.commit?.message || '',
                author: cachedCommit.commit?.author?.name || '',
                date: cachedCommit.commit?.author?.date || '',
                serverSha
            })
        }
        return NextResponse.json({
            commitSha: serverSha,
            message: 'Local development / offline mode',
            author: 'System',
            date: new Date().toISOString(),
            serverSha
        })
    }
}

