"use client"

import { useRef, useState, useCallback } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

const FFMPEG_CORE_VERSION = '0.12.6'
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`

export interface CompressOptions {
    maxWidth?: number
    maxHeight?: number
    crf?: number
    preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'fast' | 'medium'
    maxDurationSec?: number
}

export interface CompressResult {
    file: File
    originalSize: number
    compressedSize: number
    ratio: number
}

const DEFAULTS: Required<CompressOptions> = {
    maxWidth: 1080,
    maxHeight: 1920,
    crf: 28,
    preset: 'veryfast',
    maxDurationSec: 90,
}

export function useVideoCompressor() {
    const ffmpegRef = useRef<FFmpeg | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        if (ffmpegRef.current) return ffmpegRef.current

        setIsLoading(true)
        setError(null)

        try {
            const ffmpeg = new FFmpeg()

            ffmpeg.on('progress', ({ progress: p }) => {
                setProgress(Math.min(100, Math.max(0, Math.round(p * 100))))
            })

            await ffmpeg.load({
                coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
            })

            ffmpegRef.current = ffmpeg
            setIsReady(true)
            return ffmpeg
        } catch (err: any) {
            setError(err?.message || 'FFmpeg yuklanmadi')
            throw err
        } finally {
            setIsLoading(false)
        }
    }, [])

    const compress = useCallback(async (
        inputFile: File,
        options: CompressOptions = {}
    ): Promise<CompressResult> => {
        const opts = { ...DEFAULTS, ...options }
        setError(null)
        setProgress(0)

        const ffmpeg = ffmpegRef.current || (await load())

        const inputName = `input_${Date.now()}.${inputFile.name.split('.').pop() || 'mp4'}`
        const outputName = `output_${Date.now()}.mp4`

        try {
            await ffmpeg.writeFile(inputName, await fetchFile(inputFile))

            const scaleFilter = `scale='min(${opts.maxWidth},iw)':'min(${opts.maxHeight},ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2`

            const args = [
                '-i', inputName,
                '-vf', scaleFilter,
                '-c:v', 'libx264',
                '-preset', opts.preset,
                '-crf', String(opts.crf),
                '-c:a', 'aac',
                '-b:a', '128k',
                '-movflags', '+faststart',
                '-pix_fmt', 'yuv420p',
            ]

            if (opts.maxDurationSec > 0) {
                args.push('-t', String(opts.maxDurationSec))
            }

            args.push(outputName)

            await ffmpeg.exec(args)

            const data = await ffmpeg.readFile(outputName) 
            const blob = new Blob([data] as any, { type: 'video/mp4' })

            const compressedFile = new File(
                [blob],
                inputFile.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
                { type: 'video/mp4' }
            )

            await ffmpeg.deleteFile(inputName)
            await ffmpeg.deleteFile(outputName)

            return {
                file: compressedFile,
                originalSize: inputFile.size,
                compressedSize: compressedFile.size,
                ratio: inputFile.size > 0 ? compressedFile.size / inputFile.size : 1,
            }
        } catch (err: any) {
            setError(err?.message || 'Video siqishda xato yuz berdi')

            try {
                await ffmpeg.deleteFile(inputName)
            } catch {}
            try {
                await ffmpeg.deleteFile(outputName)
            } catch {}

            throw err
        }
    }, [load])

    return {
        load,
        compress,
        isReady,
        isLoading,
        progress,
        error,
    }
}