import { useState, useEffect, useCallback } from 'react'

export interface AudioDevice {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

export function useAudioDevices() {
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const loadDevices = useCallback(async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaDevices = await navigator.mediaDevices.enumerateDevices()
      const audioInputDevices = mediaDevices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as 'audioinput',
        }))

      setDevices(audioInputDevices)

      // Set default device if not set
      if (!selectedDeviceId && audioInputDevices.length > 0) {
        const defaultDevice = audioInputDevices.find(d => d.deviceId === 'default') || audioInputDevices[0]
        setSelectedDeviceId(defaultDevice.deviceId)
      }
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDeviceId])

  useEffect(() => {
    loadDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', loadDevices)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices)
    }
  }, [loadDevices])

  const selectDevice = useCallback(async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    // Save to config via electron API
    if (window.electronAPI) {
      await window.electronAPI.saveConfig({ audioDeviceId: deviceId })
    }
  }, [])

  return {
    devices,
    selectedDeviceId,
    selectDevice,
    isLoading,
    reloadDevices: loadDevices,
  }
}
