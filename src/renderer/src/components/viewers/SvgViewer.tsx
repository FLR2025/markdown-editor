import { useMemo, useState } from 'react'
import { useDialog } from '../../context/ModalContext'

type Props = {
  filePath: string
  fileName: string
  /** SVG 是文本，直接当字符串传入 */
  content: string
  bytes: number
  onContentChange: (next: string) => void
}

type Tab = 'preview' | 'source'

export default function SvgViewer({ filePath, fileName, content, bytes, onContentChange }: Props) {
  const dialog = useDialog()
  const [tab, setTab] = useState<Tab>('preview')
  const [source, setSource] = useState(content)

  const error = useMemo(() => {
    if (tab !== 'preview') return null
    // 简化检查：保证能解析成 DOM
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(source, 'image/svg+xml')
      const errEl = doc.querySelector('parsererror')
      return errEl ? errEl.textContent : null
    } catch (e) {
      return String((e as Error).message)
    }
  }, [source, tab])

  const onSourceChange = (next: string) => {
    setSource(next)
    onContentChange(next)
  }

  const exportPng = async () => {
    // 把当前 SVG 渲染到 canvas，导出 PNG
    const blob = new Blob([source], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 1024
      canvas.height = img.naturalHeight || 1024
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(async (b) => {
        if (!b) return
        const buf = await b.arrayBuffer()
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        const r = await window.api.saveExport({
          content: base64,
          defaultBaseName: fileName.replace(/\.[^.]+$/, ''),
          extensions: ['png']
        })
        if (r) await dialog.alert({ title: '已导出', message: r.filePath })
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-[12.5px]">
        <div className="flex items-center bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setTab('preview')}
            className={`px-2.5 h-7 text-[12px] rounded ${tab === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            预览
          </button>
          <button
            onClick={() => setTab('source')}
            className={`px-2.5 h-7 text-[12px] rounded ${tab === 'source' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            源码
          </button>
        </div>
        <span className="text-gray-600 font-medium ml-2">{fileName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{(bytes / 1024).toFixed(1)} KB</span>
        <div className="ml-auto">
          <button onClick={exportPng} className="tt-toolbar-btn-wide" title="导出为 PNG">
            <span className="text-[12px]">导出 PNG</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'preview' ? (
          <div className="h-full overflow-auto p-6 flex items-center justify-center">
            {error ? (
              <div className="text-[13px] text-red-600 max-w-md text-center">
                <div className="font-semibold mb-1">SVG 解析失败</div>
                <pre className="text-left text-[11.5px] whitespace-pre-wrap bg-red-50 border border-red-100 rounded p-3 font-mono">
                  {error}
                </pre>
                <div className="mt-3 text-gray-500">切到「源码」标签修改后重试</div>
              </div>
            ) : (
              <div
                className="bg-white p-4 shadow-md rounded"
                style={{ maxWidth: '90%', maxHeight: '90%' }}
                dangerouslySetInnerHTML={{ __html: source }}
              />
            )}
          </div>
        ) : (
          <textarea
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            spellCheck={false}
            className="w-full h-full px-6 py-4 font-mono text-[12.5px] leading-6 text-gray-800 bg-white border-0 outline-none resize-none"
            style={{ fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace', tabSize: 2 }}
          />
        )}
      </div>

      <div className="px-4 py-1.5 bg-white border-t border-gray-200 text-[11.5px] text-gray-500 font-mono">
        {filePath}
      </div>
    </div>
  )
}