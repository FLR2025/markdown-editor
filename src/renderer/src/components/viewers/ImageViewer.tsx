import { useEffect, useRef, useState } from 'react'
import { useDialog } from '../../context/ModalContext'

type Props = {
  filePath: string
  fileName: string
  dataUrl: string
  bytes: number
  mime: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default function ImageViewer({ filePath, fileName, dataUrl, bytes, mime }: Props) {
  const dialog = useDialog()
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
    }
  }, [dataUrl])

  const onCopy = () => {
    // 用 canvas 把图片转成 png 再写剪贴板
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (blob) navigator.clipboard.write([new ClipboardItem({ [mime]: blob })])
      }, mime)
    }
    img.src = dataUrl
  }

  const onSaveAs = async () => {
    const r = await window.api.saveExport({
      content: dataUrlToBase64(dataUrl),
      defaultBaseName: fileName.replace(/\.[^.]+$/, ''),
      extensions: [fileName.split('.').pop() ?? 'png']
    })
    if (r) {
      await dialog.alert({ title: '已保存', message: `已另存为：\n${r.filePath}` })
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y)
    })
  }
  const onMouseUp = () => {
    setDragging(false)
    dragStart.current = null
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-[12.5px]">
        <span className="text-gray-600 font-medium">{fileName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 font-mono">
          {size ? `${size.w} × ${size.h}` : '加载中…'}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{formatBytes(bytes)}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 font-mono">{mime}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.25))} className="tt-toolbar-btn" title="缩小">−</button>
          <span className="text-[11.5px] text-gray-500 font-mono w-12 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom((z) => Math.min(8, z + 0.25))} className="tt-toolbar-btn" title="放大">+</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }} className="tt-toolbar-btn-wide" title="实际大小">
            <span className="text-[12px]">1:1</span>
          </button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }) }} className="tt-toolbar-btn-wide" title="适应窗口">
            <span className="text-[12px]">适应</span>
          </button>
          <button onClick={onCopy} className="tt-toolbar-btn-wide" title="复制到剪贴板">
            <span className="text-[12px]">复制</span>
          </button>
          <button onClick={onSaveAs} className="tt-toolbar-btn-wide" title="另存为…">
            <span className="text-[12px]">另存为…</span>
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <img
          ref={imgRef}
          src={dataUrl}
          alt={fileName}
          onLoad={() => setSize({ w: imgRef.current?.naturalWidth ?? 0, h: imgRef.current?.naturalHeight ?? 0 })}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 80ms ease-out',
            maxWidth: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            background: 'white'
          }}
        />
      </div>
      <div className="px-4 py-1.5 bg-white border-t border-gray-200 text-[11.5px] text-gray-500 font-mono">
        {filePath}
      </div>
    </div>
  )
}

function dataUrlToBase64(dataUrl: string): string {
  // saveExport 接受 base64 字符串（不是 data URL）；如果入参是 data URL，剥前缀
  const i = dataUrl.indexOf(',')
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl
}