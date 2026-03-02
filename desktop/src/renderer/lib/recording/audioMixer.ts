export interface AudioMixer {
  destination: MediaStreamAudioDestinationNode
  setMicMuted: (muted: boolean) => void
  dispose: () => void
}

export async function createAudioMixer(
  systemStream: MediaStream | null,
  micStream: MediaStream | null,
): Promise<AudioMixer> {
  const ctx = new AudioContext()
  // AudioContext starts suspended in Chromium until resumed after a user gesture.
  // We must await this — otherwise the destination produces silent tracks.
  if (ctx.state !== 'running') await ctx.resume()
  const destination = ctx.createMediaStreamDestination()

  let micGain: GainNode | null = null

  // Only connect system audio if it has live tracks
  const sysAudioTracks = systemStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []
  console.log('[audio-mixer] System audio tracks (live):', sysAudioTracks.length)
  if (sysAudioTracks.length > 0) {
    const liveSystemAudio = new MediaStream(sysAudioTracks)
    const systemSource = ctx.createMediaStreamSource(liveSystemAudio)
    systemSource.connect(destination)
  }

  // Only connect mic if it has live tracks
  const micAudioTracks = micStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []
  console.log('[audio-mixer] Mic audio tracks (live):', micAudioTracks.length)
  if (micAudioTracks.length > 0) {
    const liveMicAudio = new MediaStream(micAudioTracks)
    const micSource = ctx.createMediaStreamSource(liveMicAudio)
    micGain = ctx.createGain()
    micGain.gain.value = 1
    micSource.connect(micGain)
    micGain.connect(destination)
  }

  const destTracks = destination.stream.getAudioTracks()
  console.log('[audio-mixer] Destination tracks:', destTracks.length, destTracks.map((t) => ({ label: t.label, readyState: t.readyState })))
  console.log('[audio-mixer] AudioContext state:', ctx.state, 'sampleRate:', ctx.sampleRate)

  return {
    destination,
    setMicMuted(muted: boolean) {
      if (micGain) micGain.gain.value = muted ? 0 : 1
    },
    dispose() {
      ctx.close()
    },
  }
}
