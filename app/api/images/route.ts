import { NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const key = searchParams.get('key') 

        if (!key) {
            return NextResponse.json({ error: 'Fayl kaliti (key) topilmadi' }, { status: 400 })
        }

        const endpointInput = process.env.BLACKBAZE_BUCKET_ENDPOINT || ''
        const rawEndpoint = endpointInput.startsWith('http') ? endpointInput : `https://${endpointInput}`

        const s3 = new S3Client({
            endpoint: rawEndpoint,
            credentials: {
                accessKeyId: process.env.BLACKBAZE_APPLICATION_ID!,
                secretAccessKey: process.env.BLACKBAZE_APPLICATION_KEY!,
            },
            region: process.env.BLACKBAZE_BUCKET_REGION || 'us-east-005',
            forcePathStyle: true,
        })

        const command = new GetObjectCommand({
            Bucket: process.env.BLACKBAZE_BUCKET_NAME || 'uzlinked',
            Key: key,
        })

        const response = await s3.send(command)
        const data = await response.Body?.transformToByteArray()

        if (!data) {
            return NextResponse.json({ error: 'Rasm ma\'lumoti bo\'sh' }, { status: 404 })
        }

        return new Response(new Uint8Array(data), {
            headers: {
                'Content-Type': response.ContentType || 'image/png',
                'Cache-Control': 'public, max-age=31536000, immutable', 
            },
        })
    } catch (error: any) {
        console.error("❌ Proxy Image Error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}