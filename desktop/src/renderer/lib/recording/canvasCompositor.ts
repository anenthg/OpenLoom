export interface CanvasCompositor {
  canvas: HTMLCanvasElement
  stream: MediaStream
  dispose: () => void
}

export function createCanvasCompositor(
  screenStream: MediaStream,
  cameraStream: MediaStream | null,
  maxW: number = 1920,
  maxH: number = 1080,
): CanvasCompositor {
  const screenTrack = screenStream.getVideoTracks()[0]
  const screenSettings = screenTrack.getSettings()

  const srcW = screenSettings.width || maxW
  const srcH = screenSettings.height || maxH
  const scale = Math.min(1, maxW / srcW, maxH / srcH)
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const screenVideo = document.createElement('video')
  screenVideo.srcObject = screenStream
  screenVideo.muted = true
  screenVideo.play()

  let cameraVideo: HTMLVideoElement | null = null
  if (cameraStream) {
    cameraVideo = document.createElement('video')
    cameraVideo.srcObject = cameraStream
    cameraVideo.muted = true
    cameraVideo.play()
  }

  const pipDiameter = 160
  const pipMargin = 20
  const pipX = w - pipDiameter - pipMargin
  const pipY = h - pipDiameter - pipMargin
  const pipRadius = pipDiameter / 2

  // Use captureStream(0) so frames are only emitted when we explicitly call
  // requestFrame(). This avoids relying on the browser's internal
  // "canvas-was-modified" heuristic which can silently produce 0 frames when
  // the canvas or its source videos are offscreen.
  const stream = canvas.captureStream(0)
  const captureTrack = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame(): void }

  // Use setInterval (not rAF) so drawing continues when window is unfocused
  const interval = setInterval(() => {
    if (screenVideo.readyState >= 2) {
      ctx.drawImage(screenVideo, 0, 0, w, h)
    } else {
      // Fill black while waiting for the video to load
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
    }

    if (cameraVideo && cameraVideo.readyState >= 2) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(pipX + pipRadius, pipY + pipRadius, pipRadius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()

      // Draw camera to fill the circle
      const camW = cameraVideo.videoWidth
      const camH = cameraVideo.videoHeight
      const camScale = Math.max(pipDiameter / camW, pipDiameter / camH)
      const drawW = camW * camScale
      const drawH = camH * camScale
      const offsetX = pipX + (pipDiameter - drawW) / 2
      const offsetY = pipY + (pipDiameter - drawH) / 2
      ctx.drawImage(cameraVideo, offsetX, offsetY, drawW, drawH)

      ctx.restore()

      // Draw circle border
      ctx.beginPath()
      ctx.arc(pipX + pipRadius, pipY + pipRadius, pipRadius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Explicitly push this frame to the capture stream
    captureTrack.requestFrame()
  }, 33)

  return {
    canvas,
    stream,
    dispose() {
      clearInterval(interval)
      screenVideo.pause()
      screenVideo.srcObject = null
      if (cameraVideo) {
        cameraVideo.pause()
        cameraVideo.srcObject = null
      }
    },
  }
}
