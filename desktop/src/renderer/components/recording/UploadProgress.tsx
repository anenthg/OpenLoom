interface UploadProgressProps {
  progress: number
  shareURL: string | null
}

export default function UploadProgress({ progress, shareURL }: UploadProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <h2 className="text-lg font-semibold text-zinc-200 mb-6">
        {progress >= 100 ? 'Upload Complete!' : 'Uploading...'}
      </h2>

      <div className="w-full max-w-sm bg-zinc-800 rounded-full h-3 mb-4">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm text-zinc-400 mb-4">{progress}%</p>

      {shareURL && (
        <div className="text-center">
          <p className="text-sm text-zinc-400 mb-2">Share link:</p>
          <a
            href={shareURL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm break-all"
          >
            {shareURL}
          </a>
        </div>
      )}
    </div>
  )
}
