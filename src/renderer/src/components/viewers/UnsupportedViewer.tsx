import { useDialog } from '../../context/ModalContext'
import { extOf } from '../../lib/viewerRegistry'

type Props = {
  filePath: string
  fileName: string
  bytes: number
  mime: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function UnsupportedViewer({ filePath, fileName, bytes, mime }: Props) {
  const dialog = useDialog()
  const ext = extOf(fileName)

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-[12.5px]">
        <span className="text-gray-600 font-medium">{fileName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{formatBytes(bytes)}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 font-mono">{mime}</span>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">
            暂未提供「.{ext || '未知'}」格式的专用查看器
          </h3>
          <p className="text-[12.5px] text-gray-500 leading-relaxed mb-5">
            本编辑器已识别这个文件，但还没为它实现专门的可视化界面。文件本身已加载到内存中。
          </p>
          <div className="flex flex-col gap-2 text-[12px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-5 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500">文件名</span>
              <span className="font-mono text-gray-800 truncate max-w-[60%]">{fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">大小</span>
              <span className="font-mono text-gray-800">{formatBytes(bytes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">MIME</span>
              <span className="font-mono text-gray-800 truncate max-w-[60%]">{mime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">路径</span>
              <span className="font-mono text-gray-800 truncate max-w-[60%]" title={filePath}>{filePath}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                await dialog.alert({
                  title: '建议的打开方式',
                  message: `「.${ext}」文件通常可由对应的系统默认应用打开：右键点击文件 → 「打开方式」即可选择合适的程序。`
                })
              }}
              className="w-full h-9 text-[12.5px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              查看建议…
            </button>
            <button
              onClick={() => {
                // 提示信息：拷贝路径
                navigator.clipboard.writeText(filePath).catch(() => {})
              }}
              className="w-full h-9 text-[12.5px] font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              复制文件路径
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}