import { NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key')

        if (!key) {
            return NextResponse.json({ error: 'Video kaliti (key) topilmadi' }, { status: 400 })
        }

        const rangeHeader = request.headers.get('range')

        const endpointInput = process.env.BLACKBAZE_BUCKET_ENDPOINT || ''
        const rawEndpoint = endpointInput.startsWith('http') ? endpointInput : `https://${endpointInput}`

        const s3 = new S3Client({
            endpoint: rawEndpoint,
            credentials: {
                accessKeyId: process.env.BLACKBAZE_APPLICATION_ID!,
                secretAccessKey: process.env.BLACKBAZE_APPLICATION_KEY!,
            },
            region: process.env.BLACKBAZE_BUCKET_REGION || '',
            forcePathStyle: true,
        })

        const s3Params: any = {
            Bucket: process.env.BLACKBAZE_BUCKET_NAME || '',
            Key: key,
        }

        if (rangeHeader) {
            s3Params.Range = rangeHeader
        }

        const command = new GetObjectCommand(s3Params)
        const response = await s3.send(command)

        if (!response.Body) {
            return NextResponse.json({ error: 'Video ma\'lumoti bo\'sh' }, { status: 404 })
        }

        const stream = response.Body as unknown as ReadableStream

        const responseHeaders: HeadersInit = {
            'Content-Type': response.ContentType || 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
        }

        if (response.ContentRange) {
            responseHeaders['Content-Range'] = response.ContentRange
        }
        if (response.ContentLength) {
            responseHeaders['Content-Length'] = response.ContentLength.toString()
        }

        const status = rangeHeader ? 206 : 200

        return new Response(stream, {
            status,
            headers: responseHeaders,
        })

    } catch (error: any) {
        console.error('❌ Video Proxy Error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
