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

  console.log('[recorder] Video tracks:', videoStream.getVideoTracks().length)
  console.log('[recorder] Audio tracks from destination:', audioTracks.length, audioTracks.map((t) => ({ label: t.label, readyState: t.readyState })))
  console.log('[recorder] Combined stream tracks:', combinedStream.getTracks().length,
    '(video:', combinedStream.getVideoTracks().length,
    'audio:', combinedStream.getAudioTracks().length, ')')

  // Prefer VP9, fall back to VP8
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm'

  console.log('[recorder] Using mimeType:', mimeType)

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond,
  })

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
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
