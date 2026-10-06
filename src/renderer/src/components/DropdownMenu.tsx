import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'

type MenuItem = {
  label: string
  onClick: () => void
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
  divider?: never
}

type MenuDivider = {
  divider: true
  label?: never
  onClick?: never
  icon?: never
  shortcut?: never
  danger?: never
}

type MenuEntry = MenuItem | MenuDivider

type Props = {
  trigger: ReactNode
  items: MenuEntry[]
  align?: 'left' | 'right'
}

export default function DropdownMenu({ trigger, items, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // 过滤掉分隔线，只保留可交互项用于键盘导航
  const actionableItems = items.filter((item): item is MenuItem => !('divider' in item))

  const close = useCallback(() => {
    setOpen(false)
    setHighlightedIndex(0)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.min(i + 1, actionableItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const item = actionableItems[highlightedIndex]
        if (item) {
          item.onClick()
          close()
        }
      }
    },
    [open, close, actionableItems, highlightedIndex]
  )

  // 重置高亮索引
  useEffect(() => {
    if (open) setHighlightedIndex(0)
  }, [open])

  let actionableIndex = 0

  return (
    <div className="relative inline-flex">
      <div ref={triggerRef} onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          className="absolute top-full mt-1 z-50 min-w-[180px] py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{
            animation: 'tt-pop-in 150ms cubic-bezier(0.16, 1, 0.3, 1) both',
            [align === 'right' ? 'right' : 'left']: 0
          }}
        >
          {items.map((item, index) => {
            if ('divider' in item && item.divider) {
              return <div key={`divider-${index}`} className="my-1 border-t border-gray-100" />
            }

            const itemIndex = actionableIndex++
            const isHighlighted = itemIndex === highlightedIndex

            return (
              <button
                key={`item-${item.label}`}
                role="menuitem"
                onClick={() => {
                  item.onClick()
                  close()
                }}
                onMouseEnter={() => setHighlightedIndex(itemIndex)}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px]
                  transition-colors duration-75
                  ${isHighlighted ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}
                  ${item.danger ? 'text-red-600' : ''}
                  ${item.danger && isHighlighted ? 'bg-red-50' : ''}
                `}
              >
                {item.icon && (
                  <span className="w-4 h-4 flex items-center justify-center opacity-70">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-[11px] text-gray-400 font-mono ml-2">{item.shortcut}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Backdrop for closing on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={close}
          onContextMenu={(e) => {
            e.preventDefault()
            close()
          }}
        />
      )}
    </div>
  )
}
