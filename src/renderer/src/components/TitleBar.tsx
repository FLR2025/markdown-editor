import { useState, useRef, useEffect, useCallback } from 'react'
import { IconFile, IconSave, IconOpen, IconColumns, IconEdit, IconEye, IconFilePlus, IconDownload, IconChevronDown } from './Icons'
import DropdownMenu from './DropdownMenu'

type Props = {
  fileName: string
  dirty: boolean
  mode: 'edit' | 'preview' | 'split'
  onModeChange: (mode: 'edit' | 'preview' | 'split') => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExport: () => void
  /**
   * 改完名后回调（newName 不含目录）
   * 父组件自己决定要不要 rename 磁盘上的文件
   */
  onRename?: (newName: string) => void
  /** 文件是否已经存到磁盘（决定能不能直接重命名文件） */
  canRenameOnDisk?: boolean
}

export default function TitleBar({
  fileName,
  dirty,
  mode,
  onModeChange,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
  onRename,
  canRenameOnDisk
}: Props) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(fileName)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // fileName 外部变化时同步 draft
  useEffect(() => {
    if (!editing) setDraft(fileName)
  }, [fileName, editing])

  // 进入编辑态时自动 focus + 全选
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      // 选中文件名「主干」部分（不含扩展名），方便用户直接改名字
      const name = fileName
      const dot = name.lastIndexOf('.')
      if (dot > 0) {
        inputRef.current.setSelectionRange(0, dot)
      } else {
        inputRef.current.select()
      }
    }
  }, [editing, fileName])

  const startEdit = useCallback(() => {
    if (!onRename) return
    setDraft(fileName)
    setEditing(true)
  }, [onRename, fileName])

  const commit = useCallback(() => {
    const next = draft.trim()
    if (!next || next === fileName) {
      setEditing(false)
      return
    }
    onRename?.(next)
    setEditing(false)
  }, [draft, fileName, onRename])

  const cancel = useCallback(() => {
    setDraft(fileName)
    setEditing(false)
  }, [fileName])

  return (
    <div
      className="drag-region flex items-center justify-between px-3 bg-white border-b border-gray-200"
      style={{ height: 44 }}
    >
      <div
        className="no-drag flex items-center"
        style={isMac ? { marginLeft: 70 } : { marginLeft: 0 }}
      >
        <div className="flex items-center gap-1.5 text-gray-900 font-semibold mr-4 no-drag">
          <span className="text-[15px] tracking-tight">付小付 md 编辑器</span>
        </div>
        <div className="no-drag">
          {/* 文件操作下拉菜单 */}
          <DropdownMenu
            align="left"
            trigger={
              <button className="tt-toolbar-btn-wide flex items-center gap-1" title="文件操作">
                <IconFilePlus size={15} />
                <span>文件</span>
                <IconChevronDown size={12} />
              </button>
            }
            items={[
              {
                label: '新建文件',
                shortcut: '⌘N',
                onClick: onNew,
                icon: <IconFilePlus size={14} />
              },
              {
                label: '打开文件…',
                shortcut: '⌘O',
                onClick: onOpen,
                icon: <IconOpen size={14} />
              },
              { divider: true },
              {
                label: '保存',
                shortcut: '⌘S',
                onClick: onSave,
                icon: <IconSave size={14} />
              },
              {
                label: '另存为…',
                shortcut: '⌘⇧S',
                onClick: onSaveAs,
                icon: <IconSave size={14} />
              },
              { divider: true },
              {
                label: '导出…',
                shortcut: '⌘E',
                onClick: onExport,
                icon: <IconDownload size={14} />
              }
            ]}
          />
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-gray-500 text-[13px] pointer-events-auto"
        title={canRenameOnDisk ? '点击文件名重命名（同时重命名磁盘文件）' : '点击重命名当前 tab 名（不会改磁盘文件）'}
      >
        <IconFile />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            spellCheck={false}
            className="font-medium text-gray-700 bg-white border border-sky-400 rounded px-1.5 py-0.5 outline-none ring-2 ring-sky-100 min-w-[120px] max-w-[320px] text-center"
            style={{ fontSize: 13 }}
          />
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className={
              'font-medium text-gray-700 px-1.5 py-0.5 rounded transition-colors ' +
              (onRename
                ? 'hover:bg-gray-100 hover:text-gray-900 cursor-text'
                : 'cursor-default')
            }
            disabled={!onRename}
          >
            {fileName || '未命名'}
          </button>
        )}
        {dirty && <span className="text-gray-400" aria-label="有未保存修改">●</span>}
      </div>

      <div className="no-drag flex items-center bg-gray-100 rounded-md p-0.5">
        <button
          onClick={() => onModeChange('edit')}
          className={`tt-toolbar-btn-wide ${mode === 'edit' ? 'is-active' : ''}`}
          title="富文本编辑"
          aria-label="富文本编辑"
          style={mode === 'edit' ? { background: '#ffffff', color: '#18181b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : {}}
        >
          <IconEdit />
          <span>编辑</span>
        </button>
        <button
          onClick={() => onModeChange('split')}
          className={`tt-toolbar-btn-wide ${mode === 'split' ? 'is-active' : ''}`}
          title="源码 + 预览分栏"
          aria-label="源码 + 预览分栏"
          style={mode === 'split' ? { background: '#ffffff', color: '#18181b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : {}}
        >
          <IconColumns />
          <span>分栏</span>
        </button>
        <button
          onClick={() => onModeChange('preview')}
          className={`tt-toolbar-btn-wide ${mode === 'preview' ? 'is-active' : ''}`}
          title="仅预览"
          aria-label="仅预览"
          style={mode === 'preview' ? { background: '#ffffff', color: '#18181b', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : {}}
        >
          <IconEye />
          <span>预览</span>
        </button>
      </div>
    </div>
  )
}