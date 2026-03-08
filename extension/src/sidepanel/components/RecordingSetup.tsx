import { useState, useEffect, useCallback } from 'react'
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon, HDIcon, RecordIcon } from './icons'

type PermState = 'unknown' | 'granted' | 'denied' | 'prompt'

interface DeviceInfo {
  deviceId: string
  label: string
}

async function queryPermission(name: 'camera' | 'microphone'): Promise<PermState> {
  try {
    const result = await navigator.permissions.query({ name: name as PermissionName })
    if (result.state === 'granted') return 'granted'
    if (result.state === 'denied') return 'denied'

    // "prompt" may mean a temporary "Allow this time" grant that the
    // Permissions API doesn't surface as "granted". Check whether
    // enumerateDevices returns labelled devices — if so, access works.
    const kind = name === 'camera' ? 'videoinput' : 'audioinput'
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasLabelled = devices.some((d) => d.kind === kind && d.label)
    return hasLabelled ? 'granted' : 'prompt'
  } catch {
    return 'unknown'
  }
}

async function enumerateDevices(): Promise<{ cameras: DeviceInfo[]; mics: DeviceInfo[] }> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices
      .filter((d) => d.kind === 'videoinput' && d.deviceId)
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 8)}` }))
    const mics = devices
      .filter((d) => d.kind === 'audioinput' && d.deviceId)
      .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 8)}` }))
    return { cameras, mics }
  } catch {
    return { cameras: [], mics: [] }
  }
}

interface Props {
  onStart: (config: { camera: boolean; mic: boolean; hd: boolean; cameraDeviceId?: string; micDeviceId?: string }) => void
}

export default function RecordingSetup({ onStart }: Props) {
  const [camera, setCamera] = useState(true)
  const [mic, setMic] = useState(true)
  const [hd, setHd] = useState(false)
  const [cameraPerm, setCameraPerm] = useState<PermState>('unknown')
  const [micPerm, setMicPerm] = useState<PermState>('unknown')
  const [waitingForPermission, setWaitingForPermission] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [cameras, setCameras] = useState<DeviceInfo[]>([])
  const [mics, setMics] = useState<DeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMic, setSelectedMic] = useState<string>('')

  const refreshPermissions = useCallback(async () => {
    const [cam, microphone] = await Promise.all([
      queryPermission('camera'),
      queryPermission('microphone'),
    ])
    setCameraPerm(cam)
    setMicPerm(microphone)
  }, [])

  const refreshDevices = useCallback(async () => {
    const { cameras: cams, mics: ms } = await enumerateDevices()
    setCameras(cams)
    setMics(ms)
    // Auto-select first device if none selected
    if (cams.length > 0 && !selectedCamera) setSelectedCamera(cams[0].deviceId)
    if (ms.length > 0 && !selectedMic) setSelectedMic(ms[0].deviceId)
  }, [selectedCamera, selectedMic])

  // Check permissions and enumerate devices on mount
  useEffect(() => {
    refreshPermissions()
    refreshDevices()

    let camStatus: PermissionStatus | null = null
    let micStatus: PermissionStatus | null = null

    navigator.permissions.query({ name: 'camera' as PermissionName }).then((s) => {
      camStatus = s
      s.onchange = () => {
        setCameraPerm(s.state as PermState)
        refreshDevices()
      }
    }).catch(() => {})

    navigator.permissions.query({ name: 'microphone' as PermissionName }).then((s) => {
      micStatus = s
      s.onchange = () => {
        setMicPerm(s.state as PermState)
        refreshDevices()
      }
    }).catch(() => {})

    // Also listen for device changes (plug/unplug)
    const onDeviceChange = () => refreshDevices()
    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)

    return () => {
      if (camStatus) camStatus.onchange = null
      if (micStatus) micStatus.onchange = null
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
    }
  }, [refreshPermissions, refreshDevices])

  // Listen for permission granted/denied from the permissions tab
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === 'PERMISSIONS_GRANTED') {
        setWaitingForPermission(false)
        setError(null)
        // Set granted directly — navigator.permissions.query may still
        // report "prompt" for temporary "Allow this time" grants.
        setCameraPerm('granted')
        setMicPerm('granted')
        refreshDevices()
      }
      if (message.type === 'PERMISSIONS_DENIED') {
        setWaitingForPermission(false)
        setError('Permission denied. Please allow access and try again.')
        refreshPermissions()
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [refreshPermissions, refreshDevices])

  const cameraGranted = cameraPerm === 'granted'
  const micGranted = micPerm === 'granted'
  const needsPermission = (camera && !cameraGranted) || (mic && !micGranted)

  const handleGrantPermission = () => {
    setWaitingForPermission(true)
    setError(null)
    chrome.tabs.create({
      url: chrome.runtime.getURL('permissions/index.html'),
      active: true,
    })
  }

  const handleStart = () => {
    onStart({
      camera: camera && cameraGranted,
      mic: mic && micGranted,
      hd,
      cameraDeviceId: camera && cameraGranted ? selectedCamera : undefined,
      micDeviceId: mic && micGranted ? selectedMic : undefined,
    })
  }

  const selectedCameraLabel = cameras.find((c) => c.deviceId === selectedCamera)?.label
  const selectedMicLabel = mics.find((m) => m.deviceId === selectedMic)?.label

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-zinc-100 mb-2">New Recording</h2>
        <p className="text-sm text-zinc-500">Configure your recording options</p>
      </div>

      {/* Toggle buttons with permission status */}
      <div className="flex items-center gap-6 mb-6">
        {/* Camera toggle */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => setCamera(!camera)}
            title={camera ? 'Camera on' : 'Camera off'}
            className={`p-3 rounded-full transition-all ${
              camera && cameraGranted
                ? 'bg-[var(--emerald)]/15 text-[var(--emerald)] hover:bg-[var(--emerald)]/25'
                : camera && !cameraGranted
                  ? 'bg-[var(--mustard)]/10 text-[var(--mustard)] hover:bg-[var(--mustard)]/20'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            {camera ? <CameraIcon className="w-6 h-6" /> : <CameraOffIcon className="w-6 h-6" />}
          </button>
          <span className={`text-[10px] ${
            !camera ? 'text-zinc-500' : cameraGranted ? 'text-[var(--emerald)]' : 'text-[var(--mustard)]'
          }`}>
            {!camera ? 'Off' : cameraGranted ? 'Ready' : 'No access'}
          </span>
        </div>

        {/* Mic toggle */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => setMic(!mic)}
            title={mic ? 'Mic on' : 'Mic off'}
            className={`p-3 rounded-full transition-all ${
              mic && micGranted
                ? 'bg-[var(--emerald)]/15 text-[var(--emerald)] hover:bg-[var(--emerald)]/25'
                : mic && !micGranted
                  ? 'bg-[var(--mustard)]/10 text-[var(--mustard)] hover:bg-[var(--mustard)]/20'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            {mic ? <MicIcon className="w-6 h-6" /> : <MicOffIcon className="w-6 h-6" />}
          </button>
          <span className={`text-[10px] ${
            !mic ? 'text-zinc-500' : micGranted ? 'text-[var(--emerald)]' : 'text-[var(--mustard)]'
          }`}>
            {!mic ? 'Off' : micGranted ? 'Ready' : 'No access'}
          </span>
        </div>

        {/* HD toggle */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={() => setHd(!hd)}
            title={hd ? 'HD on' : 'HD off'}
            className={`p-3 rounded-full transition-all ${
              hd
                ? 'bg-[var(--mustard)]/15 text-[var(--mustard)] hover:bg-[var(--mustard)]/25'
                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
            }`}
          >
            <HDIcon className="w-6 h-6" />
          </button>
          <span className={`text-[10px] ${hd ? 'text-[var(--mustard)]' : 'text-zinc-500'}`}>
            {hd ? 'HD' : 'SD'}
          </span>
        </div>
      </div>

      {/* Device selectors — only shown when permissions are granted */}
      {(cameraGranted || micGranted) && (
        <div className="w-full max-w-xs space-y-3 mb-6">
          {/* Camera selector */}
          {camera && cameraGranted && cameras.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Camera</label>
              {cameras.length === 1 ? (
                <p className="text-xs text-zinc-300 truncate px-2 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50">
                  {selectedCameraLabel}
                </p>
              ) : (
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="w-full text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                >
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Mic selector */}
          {mic && micGranted && mics.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Microphone</label>
              {mics.length === 1 ? (
                <p className="text-xs text-zinc-300 truncate px-2 py-1.5 bg-zinc-800/50 rounded border border-zinc-700/50">
                  {selectedMicLabel}
                </p>
              ) : (
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="w-full text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 focus:outline-none focus:border-zinc-500"
                >
                  {mics.map((m) => (
                    <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grant permission button */}
      {needsPermission && (
        <>
          <button
            onClick={handleGrantPermission}
            disabled={waitingForPermission}
            className="mb-4 px-5 py-2.5 bg-[var(--mustard)] hover:brightness-110 active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-400 text-zinc-900 rounded-lg text-sm font-semibold transition-all"
          >
            {waitingForPermission ? 'Waiting for permission...' : 'Grant Camera & Mic Access'}
          </button>
          <img
            src="../assets-static/permission.png"
            alt="How to grant camera and mic permission"
            className="mb-4 w-full max-w-xs rounded-lg border border-zinc-700/50"
          />
        </>
      )}

      {waitingForPermission && (
        <p className="mb-4 text-xs text-zinc-400 text-center max-w-xs">
          A tab has opened — please allow access there.
        </p>
      )}

      {/* Start recording button */}
      <button
        onClick={handleStart}
        disabled={waitingForPermission}
        className="flex items-center gap-3 px-8 py-4 bg-[var(--crimson)] hover:brightness-110 hover:shadow-[0_0_30px_rgba(217,43,43,0.3)] active:scale-[0.97] disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded-xl text-lg font-semibold transition-all"
      >
        <RecordIcon className="w-6 h-6" />
        Start Recording
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-400 text-center max-w-xs">{error}</p>
      )}
    </div>
  )
}
