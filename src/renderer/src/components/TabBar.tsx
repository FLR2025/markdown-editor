import { useRef, useState } from 'react'

export type TabItem = {
  id: string
  fileName: string
  filePath: string | null
  dirty: boolean
  loading?: boolean
  loadProgress?: number
}

type Props = {
  tabs: TabItem[]
  activeId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onNew: () => void
  onCloseOthers?: (id: string) => void
  onCloseAll?: () => void
}

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onCloseOthers,
  onCloseAll
}: Props) {
  const [menu, setMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={wrapRef}
      className="flex items-end bg-gray-100/80 border-b border-gray-200 select-none"
      onClick={() => setMenu(null)}
    >
      <div className="flex-1 flex items-end overflow-x-auto no-scrollbar">
        {tabs.map((t, i) => {
          const active = t.id === activeId
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  onClose(t.id)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ tabId: t.id, x: e.clientX, y: e.clientY })
              }}
              className={
                'group relative flex items-center gap-2 px-3.5 h-9 cursor-pointer border-r border-gray-200/70 ' +
                'max-w-[200px] min-w-[120px] animate-[tt-fade-in_var(--d-base)_var(--ease-out)_forwards] ' +
                'transition-[background-color,color] duration-150 ease-out ' +
                (active
                  ? 'bg-white text-gray-900'
                  : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700')
              }
              style={{
                borderTop: active ? '2px solid #111827' : '2px solid transparent',
                animationDelay: `${Math.min(i * 30, 150)}ms`,
                animationFillMode: 'both'
              }}
              title={t.filePath ?? t.fileName}
            >
              {t.loading ? (
                <Spinner />
              ) : (
                <DocIcon className={active ? 'text-gray-700' : 'text-gray-400'} />
              )}
              <span className="truncate text-[12.5px] flex-1">
                {t.fileName}
                {t.dirty && <span className="text-sky-500 ml-1">●</span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(t.id)
                }}
                className={
                  'shrink-0 w-4 h-4 rounded flex items-center justify-center ' +
                  (active
                    ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-700'
                    : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700')
                }
                title="关闭"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
        <button
          onClick={onNew}
          className="ml-1 mb-1 w-7 h-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:scale-95"
          title="新建标签 (Ctrl/Cmd + N)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {menu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] text-[12.5px] z-50 animate-[tt-scale-in_var(--d-fast)_var(--ease-out)_forwards]"
          style={{ left: menu.x, top: menu.y, transformOrigin: 'top left' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onClose(menu.tabId); setMenu(null) }}
            className="w-full px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700"
          >
            关闭
          </button>
          {onCloseOthers && tabs.length > 1 && (
            <button
              onClick={() => { onCloseOthers(menu.tabId); setMenu(null) }}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700"
            >
              关闭其他
            </button>
          )}
          {onCloseAll && tabs.length > 1 && (
            <button
              onClick={() => { onCloseAll(); setMenu(null) }}
              className="w-full px-3 py-1.5 text-left hover:bg-gray-50 text-gray-700"
            >
            关闭全部
            </button>
          )}
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { height: 0; } .no-scrollbar { scrollbar-width: none; }`}</style>
    </div>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin text-sky-500" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}