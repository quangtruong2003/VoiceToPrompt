/**
 * Decode audio Blob (WebM/Opus) to Float32Array PCM 16kHz mono
 * using Web Audio API. This ensures Whisper gets clean PCM data
 * instead of raw compressed WebM bytes.
 */
export async function decodeAudioToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioContext = new OfflineAudioContext(1, 1, 16000)
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // Resample to 16kHz mono using OfflineAudioContext
  const targetSampleRate = 16000
  const numSamples = Math.ceil(audioBuffer.duration * targetSampleRate)

  const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate)
  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const renderedBuffer = await offlineCtx.startRendering()
  return renderedBuffer.getChannelData(0)
}
