import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDialog } from '../../context/ModalContext'

type Entry = { name: string; size: number; isDir: boolean }
type EntryData = string | { base64: string }

type Props = {
  filePath: string
  fileName: string
  bytes: number
  /** 当前 zip 内所有 entry 的内容（用于「删除/新增」后保存）。初始由 load 时灌入 */
  entries: Record<string, EntryData>
  onEntriesChange: (next: Record<string, EntryData>) => void
  /** 入口列表元数据（用于侧栏显示）；entries 内容变化时由父组件同步 */
  meta: Entry[]
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

/** 用扩展名判断一个 entry 是不是「文本」类型，可以预览 */
function isTextEntry(name: string): boolean {
  const textExts = ['txt', 'md', 'markdown', 'json', 'js', 'ts', 'tsx', 'jsx',
    'css', 'scss', 'less', 'html', 'htm', 'xml', 'yml', 'yaml', 'toml',
    'ini', 'conf', 'cfg', 'sh', 'bash', 'zsh', 'py', 'rb', 'go', 'rs',
    'java', 'kt', 'swift', 'c', 'h', 'cpp', 'hpp', 'sql', 'graphql', 'gql',
    'svg', 'vue', 'svelte', 'log']
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return textExts.includes(ext)
}

function entryToText(d: EntryData): string {
  if (typeof d === 'string') return d
  // base64 → utf-8
  const bin = atob(d.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

function entryToBase64(d: EntryData): string {
  if (typeof d === 'string') return btoa(unescape(encodeURIComponent(d)))
  return d.base64
}

export default function ZipViewer({ filePath, fileName, bytes, entries, onEntriesChange, meta }: Props) {
  const dialog = useDialog()
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const totalSize = useMemo(() => meta.reduce((s, e) => s + e.size, 0), [meta])
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return meta
    return meta.filter((e) => e.name.toLowerCase().includes(q))
  }, [meta, filter])

  const selectedData = selected ? entries[selected] : null

  // 抽取当前选中的单个文件到磁盘
  const extractOne = useCallback(async () => {
    if (!selected || !selectedData) return
    const r = await window.api.selectDir()
    if (!r) return
    const destPath = `${r.dirPath}/${basename(selected)}`
    const res = await window.api.zipExtractEntry({
      filePath,
      entryName: selected,
      destPath
    })
    if (res.ok) {
      await dialog.alert({ title: '抽取完成', message: `已抽取到：\n${res.path}` })
    }
  }, [filePath, selected, selectedData, dialog])

  // 抽取全部
  const extractAll = useCallback(async () => {
    const r = await window.api.selectDir()
    if (!r) return
    const res = await window.api.zipExtractAll({ filePath, destDir: r.dirPath })
    if (res.ok) {
      await dialog.alert({
        title: '抽取完成',
        message: `已抽取 ${res.count} 个文件到：\n${res.destDir}`
      })
    }
  }, [filePath, dialog])

  // 删除一个 entry
  const removeOne = useCallback(async () => {
    if (!selected) return
    const choice = await dialog.choose({
      title: '从 zip 中删除？',
      message: `将删除「${selected}」。此操作在「保存」之后才写入磁盘。`,
      choices: [
        { value: 'cancel', label: '取消' },
        { value: 'ok', label: '标记为待删除', primary: true }
      ]
    })
    if (choice !== 'ok') return
    const nextEntries: Record<string, EntryData> = {}
    for (const [k, v] of Object.entries(entries)) {
      if (k !== selected) nextEntries[k] = v
    }
    onEntriesChange(nextEntries)
    setSelected(null)
  }, [selected, entries, dialog, onEntriesChange])

  // 重新保存到新路径
  const saveAs = useCallback(async () => {
    const r = await window.api.saveExport({
      content: JSON.stringify(entries),
      defaultBaseName: fileName.replace(/\.[^.]+$/, ''),
      extensions: ['zip']
    })
    if (!r) return
    // 把当前 entries 写回新 zip：实际上 saveExport 是直接写 content，但 zip 需要特殊处理
    // 这里走专门的 zip:save
    const res = await window.api.zipSave({
      sourcePath: filePath,
      destPath: r.filePath,
      entries
    })
    if (res.ok) {
      await dialog.alert({ title: '已保存', message: `已另存为：\n${res.path}` })
    }
  }, [fileName, filePath, entries, dialog])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 text-[12.5px]">
        <span className="text-gray-600 font-medium">{fileName}</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{meta.filter((e) => !e.isDir).length} 个文件</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">压缩 {formatBytes(bytes)} · 解压 {formatBytes(totalSize)}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={extractAll} className="tt-toolbar-btn-wide" title="解压全部到目录">
            <span className="text-[12px]">解压全部…</span>
          </button>
          <button
            onClick={saveAs}
            className="tt-toolbar-btn-wide"
            title="把当前修改另存为新 zip"
          >
            <span className="text-[12px]">另存为…</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[minmax(260px,360px)_1fr] divide-x divide-gray-200 bg-white">
        <div className="flex flex-col min-h-0">
          <div className="p-2 border-b border-gray-200">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="搜索条目…"
              className="w-full h-8 px-2.5 text-[12.5px] bg-gray-50 border border-gray-200 rounded outline-none focus:border-sky-400 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-gray-400">没有匹配条目</div>
            ) : (
              filtered.map((e) => {
                const isPendingDelete = !(e.name in entries)
                return (
                  <button
                    key={e.name}
                    onClick={() => setSelected(e.name)}
                    className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center gap-2 hover:bg-gray-50 ${
                      selected === e.name ? 'bg-sky-50 text-sky-900' : 'text-gray-800'
                    } ${isPendingDelete ? 'opacity-50 line-through' : ''}`}
                  >
                    <span className="flex-1 truncate font-mono">{e.name}</span>
                    <span className="text-gray-400 text-[10.5px] flex-shrink-0">
                      {e.isDir ? '目录' : formatBytes(e.size)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          {!selected || !selectedData ? (
            <div className="flex-1 flex items-center justify-center text-[12.5px] text-gray-400">
              ← 选择一个条目查看、抽取或删除
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 text-[12px]">
                <span className="font-mono text-gray-700 truncate flex-1">{selected}</span>
                <span className="text-gray-400">{formatBytes(meta.find((e) => e.name === selected)?.size ?? 0)}</span>
                <button onClick={extractOne} className="tt-toolbar-btn-wide">
                  <span className="text-[12px]">抽取此文件…</span>
                </button>
                <button onClick={removeOne} className="tt-toolbar-btn-wide text-red-600 hover:bg-red-50">
                  <span className="text-[12px]">删除</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50">
                {isTextEntry(selected) ? (
                  <pre className="px-4 py-3 text-[12px] font-mono leading-6 text-gray-800 whitespace-pre-wrap break-all">
                    {entryToText(selectedData)}
                  </pre>
                ) : (
                  <div className="p-6 text-[12.5px] text-gray-500">
                    二进制文件（{(meta.find((e) => e.name === selected)?.size ?? 0).toLocaleString()} 字节），
                    无内置预览器。可「抽取此文件」到磁盘后用专用工具打开。
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-4 py-1.5 bg-white border-t border-gray-200 text-[11.5px] text-gray-500 font-mono">
        {filePath}
      </div>
    </div>
  )
}