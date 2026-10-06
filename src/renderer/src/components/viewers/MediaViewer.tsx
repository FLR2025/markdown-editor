type Props = {
  filePath: string
  fileName: string
  dataUrl: string
  mime: string
  bytes: number
  kind: 'audio' | 'video'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function MediaViewer({ filePath, fileName, dataUrl, mime, bytes, kind }: Props) {
  const isVideo = kind === 'video'
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-[12.5px]">
        <span className="text-gray-600 font-medium">{fileName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{formatBytes(bytes)}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 font-mono">{mime}</span>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 overflow-auto">
        {isVideo ? (
          <video
            src={dataUrl}
            controls
            autoPlay={false}
            className="max-w-full max-h-full rounded shadow-lg bg-black"
            style={{ outline: 'none' }}
          />
        ) : (
          <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div>
                <div className="text-[14px] font-semibold text-gray-900">{fileName}</div>
                <div className="text-[11.5px] text-gray-500 font-mono">{mime}</div>
              </div>
            </div>
            <audio src={dataUrl} controls className="w-full" />
          </div>
        )}
      </div>
      <div className="px-4 py-1.5 bg-white border-t border-gray-200 text-[11.5px] text-gray-500 font-mono">
        {filePath}
      </div>
    </div>
  )
}