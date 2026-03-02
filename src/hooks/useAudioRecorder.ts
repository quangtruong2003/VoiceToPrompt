import { useState, useRef, useCallback } from 'react'

interface UseAudioRecorderOptions {
  deviceId?: string
}

interface UseAudioRecorderReturn {
  isRecording: boolean
  duration: number
  startRecording: (deviceId?: string) => Promise<void>
  stopRecording: () => Promise<Blob | null>
}

export function useAudioRecorder(options?: UseAudioRecorderOptions): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async (deviceId?: string) => {
    try {
      chunksRef.current = []
      setDuration(0)

      const audioConstraints: MediaStreamConstraints['audio'] = {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      }

      // Use specific device if provided
      if (deviceId || options?.deviceId) {
        (audioConstraints as any).deviceId = { exact: deviceId || options?.deviceId }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(250)
      setIsRecording(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Failed to start recording:', err)
      throw err
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        setIsRecording(false)
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []
        setIsRecording(false)

        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [])

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
  }
}
