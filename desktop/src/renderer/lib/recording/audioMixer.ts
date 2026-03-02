export interface AudioMixer {
  /** Audio stream to feed into MediaRecorder */
  audioStream: MediaStream
  setMicMuted: (muted: boolean) => void
  dispose: () => void
}

export async function createAudioMixer(
  systemStream: MediaStream | null,
  micStream: MediaStream | null,
): Promise<AudioMixer> {
  const sysAudioTracks = systemStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []
  const micAudioTracks = micStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []

  // When mic is available, pass the raw mic track directly to the recorder.
  // This bypasses AudioContext → MediaStreamAudioDestinationNode routing
  // which can silently produce empty audio in Electron/Chromium.
  if (micAudioTracks.length > 0) {
    const micTrack = micAudioTracks[0]

    return {
      audioStream: new MediaStream([micTrack]),
      setMicMuted(muted: boolean) {
        micTrack.enabled = !muted
      },
      dispose() {
        sysAudioTracks.forEach((t) => t.stop())
      },
    }
  }

  // Fallback: system audio only (no mic) — route through AudioContext
  if (sysAudioTracks.length > 0) {
    const ctx = new AudioContext()
    if (ctx.state !== 'running') await ctx.resume()
    const destination = ctx.createMediaStreamDestination()

    const silence = ctx.createOscillator()
    const silenceGain = ctx.createGain()
    silenceGain.gain.value = 0
    silence.connect(silenceGain)
    silenceGain.connect(destination)
    silence.start()

    const liveSystemAudio = new MediaStream(sysAudioTracks)
    const systemSource = ctx.createMediaStreamSource(liveSystemAudio)
    systemSource.connect(destination)

    return {
      audioStream: destination.stream,
      setMicMuted() {},
      dispose() { ctx.close() },
    }
  }

  // No audio at all — return empty stream
  return {
    audioStream: new MediaStream(),
    setMicMuted() {},
    dispose() {},
  }
}
