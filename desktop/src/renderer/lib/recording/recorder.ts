export interface Recorder {
  start: () => void
  stop: () => Promise<Blob>
  dispose: () => void
}

export function createRecorder(
  videoStream: MediaStream,
  audioStream: MediaStream | null,
  videoBitsPerSecond: number = 2_500_000,
): Recorder {
  // Combine video and audio tracks into one stream for MediaRecorder
  const videoTracks = videoStream.getVideoTracks()
  const audioTracks = audioStream ? audioStream.getAudioTracks() : []
  const combinedStream = new MediaStream([...videoTracks, ...audioTracks])

  // Prefer VP9, fall back to VP8
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm'

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond,
  })

  const chunks: Blob[] = []

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  mediaRecorder.onerror = (e) => {
    console.error('[recorder] MediaRecorder error:', e)
  }

  let resolveStop: ((blob: Blob) => void) | null = null

  mediaRecorder.onstop = () => {
    resolveStop?.(new Blob(chunks, { type: mimeType }))
  }

  return {
    start() {
      chunks.length = 0
      mediaRecorder.start(1000)
    },
    stop() {
      return new Promise<Blob>((resolve) => {
        resolveStop = resolve
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.requestData()
        }
        mediaRecorder.stop()
      })
    },
    dispose() {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    },
  }
}
