import { useState, useRef, useEffect } from 'react'

type Props = {
  onPick: (rows: number, cols: number) => void
  max?: number
  children?: React.ReactNode
  placement?: 'top' | 'bottom'
}

/**
 * 表格大小选择器：
 * - 一个 max×max 的方格网格
 * - 鼠标 hover 时高亮 (rows, cols) 区域 + 显示「rows × cols」文字
 * - 点击插入对应尺寸的表格
 */
export default function TableSizePicker({ onPick, max = 10, children, placement = 'bottom' }: Props) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handlePick = (r: number, c: number) => {
    onPick(r, c)
    setOpen(false)
  }

  const grid = (
    <div
      className="table-size-picker"
      onMouseLeave={() => setHover(null)}
      role="dialog"
      aria-label="选择表格大小"
    >
      <div
        className="table-size-picker__grid"
        style={{ gridTemplateColumns: `repeat(${max}, 14px)`, gridTemplateRows: `repeat(${max}, 14px)` }}
      >
        {Array.from({ length: max * max }).map((_, idx) => {
          const r = Math.floor(idx / max) + 1
          const c = (idx % max) + 1
          const active = hover && r <= hover.r && c <= hover.c
          return (
            <div
              key={idx}
              className={`table-size-picker__cell${active ? ' is-active' : ''}`}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => handlePick(r, c)}
              role="gridcell"
              aria-label={`${r} 行 × ${c} 列`}
            />
          )
        })}
      </div>
      <div className="table-size-picker__label">
        {hover ? `${hover.r} × ${hover.c}` : '选择行 × 列'}
      </div>
    </div>
  )

  // 有 trigger children：渲染按钮 + 下拉 picker
  if (children !== undefined) {
    return (
      <div ref={containerRef} className="relative inline-block">
        <button
          type="button"
          className="tt-toolbar-btn"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          {children}
        </button>

        {open && (
          <div
            className={`absolute left-0 z-50 ${
              placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
          >
            {grid}
          </div>
        )}
      </div>
    )
  }

  // 无 trigger：直接渲染 picker（供 SlashMenu 使用）
  return grid
}
