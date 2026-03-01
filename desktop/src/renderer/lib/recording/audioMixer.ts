export interface AudioMixer {
  destination: MediaStreamAudioDestinationNode
  setMicMuted: (muted: boolean) => void
  dispose: () => void
}

export function createAudioMixer(
  systemStream: MediaStream | null,
  micStream: MediaStream | null,
): AudioMixer {
  const ctx = new AudioContext()
  // AudioContext may start suspended after an async gap — ensure it's running
  if (ctx.state !== 'running') ctx.resume()
  console.log('[audio-mixer] ctx.state:', ctx.state)
  const destination = ctx.createMediaStreamDestination()

  let micGain: GainNode | null = null

  if (systemStream && systemStream.getAudioTracks().length > 0) {
    console.log('[audio-mixer] system audio tracks:', systemStream.getAudioTracks().length)
    const systemSource = ctx.createMediaStreamSource(systemStream)
    systemSource.connect(destination)
  } else {
    console.log('[audio-mixer] no system audio')
  }

  if (micStream && micStream.getAudioTracks().length > 0) {
    console.log('[audio-mixer] mic audio tracks:', micStream.getAudioTracks().length)
    const micSource = ctx.createMediaStreamSource(micStream)
    micGain = ctx.createGain()
    micSource.connect(micGain)
    micGain.connect(destination)
  } else {
    console.log('[audio-mixer] no mic stream')
  }

  console.log('[audio-mixer] destination tracks:', destination.stream.getAudioTracks().length)

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
