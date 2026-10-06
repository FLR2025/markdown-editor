import { useState, useRef, useEffect } from 'react'

/** 预设调色板：常用文字色和背景色各一排 */
const PRESET_COLORS = [
  // 文字色
  '#000000', '#374151', '#6b7280', '#dc2626', '#ea580c', '#ca8a04',
  '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ffffff',
  // 背景高亮色
  '#fef08a', '#fed7aa', '#d9f99d', '#a5f3fc', '#c7d2fe', '#fbcfe8',
]

type Props = {
  /** 当前选中的颜色值（十六进制，如 '#ff0000'），空表示未选中 */
  value: string
  /** 用户选中颜色时回调 */
  onChange: (color: string) => void
  /** 按钮内展示的 ReactNode */
  children: React.ReactNode
  /** 按钮 title */
  title: string
  /** 触发器类名 */
  triggerClass?: string
}

export default function ColorPicker({ value, onChange, children, title, triggerClass = 'tt-toolbar-btn' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [customColor, setCustomColor] = useState('')
  const [position, setPosition] = useState<'left' | 'right'>('left')

  // 检测下拉框位置，防止超出屏幕
  useEffect(() => {
    if (!open || !containerRef.current || !dropdownRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dropdownWidth = dropdownRef.current.offsetWidth
    const viewportWidth = window.innerWidth
    // 如果左侧空间不够，切换到右侧对齐
    if (rect.left + dropdownWidth > viewportWidth - 8) {
      setPosition('right')
    } else {
      setPosition('left')
    }
  }, [open])

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

  const handlePick = (color: string) => {
    onChange(color)
    setOpen(false)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c = e.target.value
    setCustomColor(c)
    if (/^#[0-9a-fA-F]{6}$/.test(c)) {
      onChange(c)
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        className={triggerClass}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        title={title}
        aria-label={title}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {children}
        {value && (
          <span
            className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white"
            style={{ backgroundColor: value }}
          />
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className={`absolute top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-56 ${
            position === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)' }}
        >
          {/* 预设色块 */}
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${
                  value === c ? 'border-gray-800' : 'border-gray-200'
                }`}
                style={{
                  backgroundColor: c,
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)'
                }}
                title={c}
                onClick={() => handlePick(c)}
                aria-label={`颜色 ${c}`}
              />
            ))}
          </div>

          {/* 自定义颜色输入 */}
          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
            <label className="text-xs text-gray-500 whitespace-nowrap">自定义</label>
            <input
              type="color"
              value={customColor || value || '#000000'}
              onChange={(e) => {
                setCustomColor(e.target.value)
                onChange(e.target.value)
              }}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
              title="选择自定义颜色"
            />
            <input
              type="text"
              value={customColor || value || ''}
              onChange={handleCustomChange}
              placeholder="#000000"
              maxLength={7}
              className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-2 py-1 font-mono outline-none focus:border-blue-400"
            />
            {value && (
              <button
                type="button"
                className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                onClick={() => handlePick('')}
                title="清除颜色"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
