export interface AudioMixer {
  audioStream: MediaStream
  setMicMuted: (muted: boolean) => void
  dispose: () => void
  getDebugLevels?: () => { system: number; mic: number; output: number }
  getMicBars?: (barCount: number) => number[]
}

type LogFn = (msg: string) => void

function createLevelMonitor(ctx: AudioContext, source: AudioNode): AnalyserNode {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)
  return analyser
}

function readLevel(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteTimeDomainData(data)
  let max = 0
  for (let i = 0; i < data.length; i++) {
    const v = Math.abs(data[i] - 128)
    if (v > max) max = v
  }
  return Math.round((max / 128) * 100)
}

export async function createAudioMixer(
  systemStream: MediaStream | null,
  micStream: MediaStream | null,
  log: LogFn = console.log,
): Promise<AudioMixer> {
  const sysAudioTracks = systemStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []
  const micAudioTracks = micStream?.getAudioTracks().filter((t) => t.readyState === 'live') ?? []

  const hasSys = sysAudioTracks.length > 0
  const hasMic = micAudioTracks.length > 0

  log(`[mixer] hasSys=${hasSys} (${sysAudioTracks.length}) hasMic=${hasMic} (${micAudioTracks.length})`)

  // No audio at all
  if (!hasSys && !hasMic) {
    log('[mixer] No audio sources, returning empty stream')
    return {
      audioStream: new MediaStream(),
      setMicMuted() {},
      dispose() {},
    }
  }

  // Try AudioContext mixing
  try {
    log('[mixer] Creating AudioContext...')
    const ctx = new AudioContext()
    log(`[mixer] AudioContext created: sampleRate=${ctx.sampleRate} state=${ctx.state}`)

    if (ctx.state !== 'running') {
      log('[mixer] AudioContext not running, calling resume() with timeout...')
      const resumed = await Promise.race([
        ctx.resume().then(() => true),
        new Promise<false>((r) => setTimeout(() => r(false), 2000)),
      ])
      if (!resumed) {
        log('[mixer] AudioContext.resume() timed out! Falling back to direct tracks.')
        ctx.close().catch(() => {})
        return createFallbackMixer(sysAudioTracks, micAudioTracks, log)
      }
      log(`[mixer] AudioContext resumed: state=${ctx.state}`)
    }

    const destination = ctx.createMediaStreamDestination()
    log('[mixer] MediaStreamDestination created')

    // Silent oscillator to keep AudioContext active
    const silence = ctx.createOscillator()
    const silenceGain = ctx.createGain()
    silenceGain.gain.value = 0
    silence.connect(silenceGain)
    silenceGain.connect(destination)
    silence.start()

    let sysAnalyser: AnalyserNode | null = null
    let micAnalyser: AnalyserNode | null = null
    let outAnalyser: AnalyserNode | null = null

    // System audio
    let sysSource: MediaStreamAudioSourceNode | null = null
    if (hasSys) {
      const sysStream = new MediaStream(sysAudioTracks)
      sysSource = ctx.createMediaStreamSource(sysStream)
      sysSource.connect(destination)
      sysAnalyser = createLevelMonitor(ctx, sysSource)
      log('[mixer] System audio source connected')
    }

    // Mic audio with gain node for muting
    let micGain: GainNode | null = null
    let micSource: MediaStreamAudioSourceNode | null = null
    if (hasMic) {
      const micStreamCopy = new MediaStream(micAudioTracks)
      micSource = ctx.createMediaStreamSource(micStreamCopy)
      micGain = ctx.createGain()
      micGain.gain.value = 1
      micSource.connect(micGain)
      micGain.connect(destination)
      micAnalyser = createLevelMonitor(ctx, micSource)
      log('[mixer] Mic audio source connected, gain=1')
    }

    // Monitor the mixed output by creating a source from the destination's stream
    const outSource = ctx.createMediaStreamSource(destination.stream)
    outAnalyser = createLevelMonitor(ctx, outSource)

    const destTracks = destination.stream.getAudioTracks()
    log(`[mixer] Output stream: ${destTracks.length} audio tracks`)
    destTracks.forEach((t, i) => {
      log(`[mixer]   track[${i}]: state=${t.readyState} enabled=${t.enabled} muted=${t.muted}`)
    })

    // Keep references alive to prevent GC
    const _refs = { sysSource, micSource, micGain, silenceGain, silence, outSource }

    log('[mixer] AudioContext mixer ready')
    return {
      audioStream: destination.stream,
      setMicMuted(muted: boolean) {
        if (micGain) micGain.gain.value = muted ? 0 : 1
      },
      getDebugLevels() {
        return {
          system: sysAnalyser ? readLevel(sysAnalyser) : -1,
          mic: micAnalyser ? readLevel(micAnalyser) : -1,
          output: outAnalyser ? readLevel(outAnalyser) : -1,
        }
      },
      getMicBars(barCount: number): number[] {
        if (!micAnalyser) return new Array(barCount).fill(0)
        const data = new Uint8Array(micAnalyser.frequencyBinCount)
        micAnalyser.getByteFrequencyData(data)
        const bars: number[] = []
        const binSize = Math.floor(data.length / barCount)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < binSize; j++) {
            sum += data[i * binSize + j]
          }
          bars.push(Math.round((sum / binSize / 255) * 100))
        }
        return bars
      },
      dispose() {
        void _refs
        ctx.close()
      },
    }
  } catch (e) {
    log(`[mixer] AudioContext failed: ${e instanceof Error ? e.message : String(e)}`)
    log('[mixer] Falling back to direct tracks')
    return createFallbackMixer(sysAudioTracks, micAudioTracks, log)
  }
}

/**
 * Fallback when AudioContext is unavailable (e.g. offscreen document restrictions).
 * Combines all audio tracks into a single MediaStream without mixing.
 * MediaRecorder will only record the first audio track, so prefer mic over system audio.
 */
function createFallbackMixer(
  sysAudioTracks: MediaStreamTrack[],
  micAudioTracks: MediaStreamTrack[],
  log: LogFn,
): AudioMixer {
  // Prefer mic track — it's the one the user explicitly selected
  const tracks = [...micAudioTracks, ...sysAudioTracks]
  const stream = new MediaStream(tracks)

  log(`[mixer-fallback] Created stream with ${tracks.length} audio tracks`)
  tracks.forEach((t, i) => {
    log(`[mixer-fallback]   track[${i}]: ${t.label} state=${t.readyState} enabled=${t.enabled}`)
  })

  const micTrack = micAudioTracks[0] ?? null

  return {
    audioStream: stream,
    setMicMuted(muted: boolean) {
      if (micTrack) micTrack.enabled = !muted
    },
    dispose() {
      // Don't stop tracks here — they'll be stopped when the source streams end
    },
  }
}
