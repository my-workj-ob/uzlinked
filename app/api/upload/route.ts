import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export async function POST(request: Request) {
    try {
        const endpointInput = process.env.BLACKBAZE_BUCKET_ENDPOINT || ''
        const rawEndpoint = endpointInput.startsWith('http') ? endpointInput : `https://${endpointInput}`
        
        const bucketName = process.env.BLACKBAZE_BUCKET_NAME || 'uzlinked'
        const region = process.env.BLACKBAZE_BUCKET_REGION || 'us-east-005'
        const keyId = process.env.BLACKBAZE_APPLICATION_ID
        const appKey = process.env.BLACKBAZE_APPLICATION_KEY

        if (!keyId || !appKey) {
            return NextResponse.json({ 
                error: 'Backblaze kalitlari topilmadi. .env faylini tekshiring.' 
            }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Fayl tanlanmagan' }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const fileExtension = file.name.split('.').pop()
        const fileName = `avatars/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`

        const s3 = new S3Client({
            endpoint: rawEndpoint,
            credentials: {
                accessKeyId: keyId,
                secretAccessKey: appKey,
            },
            region: region,
            forcePathStyle: true, 
        })

        await s3.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: buffer,
                ContentType: file.type,
            })
        )

        const match = region.match(/\d+$/)
        const regionNum = match ? match[0] : '005'
        const publicUrl = `/api/images?key=${fileName}`

        return NextResponse.json({ url: publicUrl })
    } catch (error: any) {
        return NextResponse.json({ 
            error: error.message,
            name: error.name
        }, { status: 500 })
    }
}