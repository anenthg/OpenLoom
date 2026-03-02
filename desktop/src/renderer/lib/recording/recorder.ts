export interface Recorder {
  start: () => void
  stop: () => Promise<Blob>
  dispose: () => void
}

export function createRecorder(
  videoStream: MediaStream,
  audioDestination: MediaStreamAudioDestinationNode | null,
  videoBitsPerSecond: number = 2_500_000,
): Recorder {
  // Combine video and audio tracks
  const tracks = [...videoStream.getVideoTracks()]
  const audioTracks = audioDestination ? audioDestination.stream.getAudioTracks() : []
  tracks.push(...audioTracks)
  const combinedStream = new MediaStream(tracks)

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
    const blob = new Blob(chunks, { type: mimeType })
    resolveStop?.(blob)
  }

  return {
    start() {
      chunks.length = 0
      mediaRecorder.start(1000) // 1s chunks
    },
    stop() {
      return new Promise<Blob>((resolve) => {
        resolveStop = resolve
        // Force a final data flush before stopping — without this,
        // recordings under 1s produce 0-byte blobs because the
        // timeslice (1000ms) hasn't elapsed yet.
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
