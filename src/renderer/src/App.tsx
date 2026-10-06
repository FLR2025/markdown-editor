import { useEditor } from '@tiptap/react'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { buildExtensions } from './lib/extensions'
import { markdownToHtml, htmlToMarkdown } from './lib/markdown'
import { type ExportFormat } from './lib/exportFormats'
import { classifyFile, type FileKind } from './lib/viewerRegistry'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import EditorArea from './components/Editor'
import Preview from './components/Preview'
import SourceEditor from './components/SourceEditor'
import StatusBar from './components/StatusBar'
import BrandWatermark from './components/BrandWatermark'
import TabBar, { type TabItem } from './components/TabBar'
import LoadingOverlay from './components/LoadingOverlay'
import ExportDialog from './components/ExportDialog'
import ActiveTabView from './components/ActiveTabView'
import { ModalProvider, useDialog } from './context/ModalContext'

const SAMPLE_DOC = `# 欢迎使用付小付 md 编辑器

一款基于 **Tiptap** 和 **Electron** 构建的现代化 Markdown 编辑器，界面参考 Tiptap 官方 *Simple Editor* 的浅色现代设计。

由 **付小付网络科技工作室** 倾情打造。

## 主要功能

- 直接打开 / 保存本地 \`.md\` 文件
- 实时 GitHub 风格 Markdown 预览
- 标题、列表、任务列表、表格、代码块
- 支持切换 **编辑 / 分栏 / 预览** 三种视图
- 多标签页：双击文件始终在新标签中打开
- 输入 \`/\` 快速插入块元素，选中文本弹出格式化工具条

### 任务清单

- [x] 选择编辑器（Tiptap）
- [x] 实现 Markdown 双向转换
- [x] 多标签页 + 自定义统一对话框
- [ ] 写一份漂亮的 README

### 代码示例

\`\`\`ts
function greet(name: string) {
  return \`你好，\${name}！\`
}
\`\`\`

| 快捷键          | 功能       |
| --------------- | ---------- |
| \`⌘N / Ctrl+N\`  | 新建文件   |
| \`⌘O / Ctrl+O\`  | 打开文件   |
| \`⌘S / Ctrl+S\`  | 保存       |
| \`⌘P / Ctrl+P\`  | 切换预览   |

> 小贴士：点击工具栏上的 **复制** 按钮，可以把当前文档复制为 Markdown 或 HTML。
`

type Mode = 'edit' | 'preview' | 'split'

/** 文本类 tab 的内部存储格式：markdown 源码 或 原始 HTML */
type TextFormat = 'markdown' | 'html'

/** 一个 tab 可以是文本/图片/SVG/ZIP/音视频/未支持格式之一
 *  - kind === 'text' | 'svg' 时：content 是字符串，contentFormat ∈ {markdown, html}
 *  - kind === 'image' | 'audio' | 'video'：dataUrl + bytes + mime 必填
 *  - kind === 'archive' (zip)：meta.entries 是入口列表，entries 是 entry → 内容
 *  - kind === 'unsupported'：bytes + mime 给「另存为 / 复制路径」用
 */
type Tab = {
  id: string
  filePath: string | null
  fileName: string
  kind: FileKind
  /** 文本类 tab 的内容（markdown 源码 或 原始 HTML） */
  content: string | null
  contentFormat: TextFormat | null
  /** 二进制媒体的 dataUrl（image / audio / video） */
  dataUrl: string | null
  mime: string | null
  bytes: number
  /** 其它元数据（zip 的 entry 列表、原始 base64 等） */
  meta: Record<string, unknown>
  dirty: boolean
}

type LoadingInfo = {
  fileName: string
  progress: number  // 0-100
  error?: string | null
}

/** 把扩展名 / 路径 → text tab 的 contentFormat（仅 text/svg 用得到） */
function detectTextFormat(filePath: string | null, fileName?: string): TextFormat {
  const probe = (filePath ?? fileName ?? '').toLowerCase()
  if (probe.endsWith('.html') || probe.endsWith('.htm')) return 'html'
  return 'markdown'
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** 从主进程 session.json 拉回来的会话快照 */
type PersistedSession = {
  version: number
  savedAt: string
  tabs: Tab[]
  activeId: string | null
}

function makeWelcomeTab(): Tab {
  return {
    id: makeId(),
    filePath: null,
    // 用「欢迎」作名字，一眼就能和「未命名」（用户主动新建的空 tab）区分开
    fileName: '欢迎',
    kind: 'text',
    content: SAMPLE_DOC,
    contentFormat: 'markdown',
    dataUrl: null,
    mime: null,
    bytes: 0,
    meta: {},
    dirty: false
  }
}

function makeEmptyTextTab(): Tab {
  return {
    id: makeId(),
    filePath: null,
    fileName: '未命名',
    kind: 'text',
    content: '',
    contentFormat: 'markdown',
    dataUrl: null,
    mime: null,
    bytes: 0,
    meta: {},
    dirty: false
  }
}

/** 把「从磁盘读出来的文本」组装成 Tab */
function makeTextTabFromContent(
  filePath: string,
  fileName: string,
  kind: FileKind,
  content: string,
  bytes: number
): Tab {
  return {
    id: makeId(),
    filePath,
    fileName,
    kind,
    content,
    contentFormat: detectTextFormat(filePath, fileName),
    dataUrl: null,
    mime: kind === 'svg' ? 'image/svg+xml' : 'text/plain',
    bytes,
    meta: {},
    dirty: false
  }
}

function makeMediaTab(
  filePath: string,
  fileName: string,
  kind: 'image' | 'audio' | 'video',
  base64: string,
  mime: string,
  bytes: number
): Tab {
  return {
    id: makeId(),
    filePath,
    fileName,
    kind,
    content: null,
    contentFormat: null,
    dataUrl: `data:${mime};base64,${base64}`,
    mime,
    bytes,
    meta: {},
    dirty: false
  }
}

function makeZipTab(
  filePath: string,
  fileName: string,
  entries: Array<{ name: string; size: number; isDir: boolean }>,
  entryMap: Record<string, string | { base64: string }>,
  totalBytes: number
): Tab {
  // entryMap 太大不适合走 session 持久化，但放在内存里方便 viewer 实时编辑/抽取
  return {
    id: makeId(),
    filePath,
    fileName,
    kind: 'archive',
    content: null,
    contentFormat: null,
    dataUrl: null,
    mime: 'application/zip',
    bytes: totalBytes,
    meta: { entries, entryData: entryMap },
    dirty: false
  }
}

function makeUnsupportedTab(
  filePath: string,
  fileName: string,
  mime: string,
  bytes: number
): Tab {
  return {
    id: makeId(),
    filePath,
    fileName,
    kind: 'unsupported',
    content: null,
    contentFormat: null,
    dataUrl: null,
    mime,
    bytes,
    meta: {},
    dirty: false
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function basenameOf(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

function countWords(s: string): { words: number; chars: number } {
  const chars = s.length
  // 中文 / CJK 字符按字计，其他按空白分词
  const cjk = (s.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const other = (s.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\S+/g) ?? []).length
  return { words: cjk + other, chars }
}

const APP_NAME = '付小付 md 编辑器'

export default function App() {
  return (
    <ModalProvider>
      <Editor />
    </ModalProvider>
  )
}

function Editor() {
  const dialog = useDialog()

  // 初始只有一个标签页（示例文档）
  const [tabs, setTabs] = useState<Tab[]>(() => [makeWelcomeTab()])
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id)
  const [mode, setMode] = useState<Mode>('split')
  const [loading, setLoading] = useState<LoadingInfo | null>(null)
  /** 导出对话框：null 表示关闭 */
  const [exportOpen, setExportOpen] = useState(false)

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeId) ?? tabs[0],
    [tabs, activeId]
  )
  const filePath = activeTab.filePath
  const fileName = activeTab.fileName
  const dirty = activeTab.dirty

  // 进度订阅：在组件生命周期内常驻，由全局开关决定是否真的渲染
  const progressHandlerRef = useRef<((p: { read: number; total: number }) => void) | null>(null)

  const isApplyingFromMarkdown = useRef(false)
  const extensions = useRef(buildExtensions())

  // 当前标签的 contentFormat → 给 onUpdate 闭包用，避免 stale closure
  const contentFormatRef = useRef<TextFormat>('markdown')
  useEffect(() => {
    contentFormatRef.current = activeTab.contentFormat ?? 'markdown'
  }, [activeTab.contentFormat])

  const tiptap = useEditor({
    extensions: extensions.current,
    content: markdownToHtml(SAMPLE_DOC),
    autofocus: false,
    editorProps: { attributes: { class: 'tiptap' } },
    onUpdate: ({ editor }) => {
      if (isApplyingFromMarkdown.current) return
      const html = editor.getHTML()
      // HTML 模式下直接存原始 HTML（不做 html→markdown 的往返，避免污染）
      const next =
        contentFormatRef.current === 'html' ? html : htmlToMarkdown(html)
      isApplyingFromMarkdown.current = true
      updateActiveTab({ content: next, dirty: true })
      setTimeout(() => {
        isApplyingFromMarkdown.current = false
      }, 0)
    }
  })

  /** 修改当前标签（不可变更新） */
  const updateActiveTab = useCallback(
    (patch: Partial<Tab>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, ...patch } : t))
      )
    },
    [activeId]
  )

  /** 把内容同步到 Tiptap 编辑器（不触发 onUpdate） */
  const applyContent = useCallback(
    (next: string, format: TextFormat = 'markdown') => {
      updateActiveTab({ content: next, contentFormat: format })
      isApplyingFromMarkdown.current = true
      if (tiptap) {
        const html = format === 'html' ? next : markdownToHtml(next)
        tiptap.commands.setContent(html, false)
      }
      setTimeout(() => {
        isApplyingFromMarkdown.current = false
      }, 0)
    },
    [tiptap, updateActiveTab]
  )

  // ===== 标签页操作 =====

  const selectTab = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const newTab = useCallback(() => {
    const tab: Tab = makeEmptyTextTab()
    setTabs((prev) => [...prev, tab])
    setActiveId(tab.id)
  }, [])

  /** 关闭标签，如果脏了则确认 */
  const closeTab = useCallback(
    async (id: string) => {
      const target = tabs.find((t) => t.id === id)
      if (!target) return
      if (target.dirty) {
        const choice = await dialog.choose({
          title: '放弃未保存的修改？',
          message: `标签 “${target.fileName}” 包含未保存的修改。`,
          detail: target.filePath ?? '此文件尚未保存到磁盘',
          choices: [
            { value: 'cancel', label: '取消' },
            { value: 'discard', label: '放弃修改', danger: true },
            { value: 'save', label: '保存后关闭', primary: true }
          ]
        })
        if (choice === 'cancel' || choice === null) return
        if (choice === 'save') {
          // 切到该标签以便保存逻辑能正确找到它
          setActiveId(id)
          // 只有文本类 tab 才能「保存」到磁盘
          if (target.kind === 'text' || target.kind === 'svg') {
            if (!target.filePath) {
              const r = await window.api.saveFile(target.content ?? '', target.fileName)
              if (!r) return
            } else {
              await window.api.writeFile(target.filePath, target.content ?? '')
            }
          } else {
            await dialog.alert({
              title: '该文件类型不支持保存',
              message: '请使用 viewer 自身的「另存为…」功能保存。'
            })
            return
          }
        }
      }
      setTabs((prev) => {
        const next = prev.filter((t) => t.id !== id)
        if (next.length === 0) {
          // 至少保留一个标签：默认显示示例文档（无文件也好看）
          const welcome = makeWelcomeTab()
          setActiveId(welcome.id)
          return [welcome]
        }
        if (id === activeId) {
          const idx = prev.findIndex((t) => t.id === id)
          const fallback = prev[Math.min(idx, next.length - 1)]
          setActiveId(fallback.id)
        }
        return next
      })
    },
    [tabs, dialog, activeId]
  )

  const closeOthers = useCallback((id: string) => {
    setTabs((prev) => {
      const target = prev.find((t) => t.id === id)
      return target ? [target] : prev
    })
    setActiveId(id)
  }, [])

  const closeAll = useCallback(() => {
    const welcome = makeWelcomeTab()
    setTabs([welcome])
    setActiveId(welcome.id)
  }, [])

  // ===== 文件操作 =====

  /**
   * 用流式读取打开文件，并附带实时进度。
   * - 成功：写入新标签（或替换当前标签）
   * - 失败：进入错误态（不卡死、不白屏），用户可点"知道了"关闭遮罩
   */
  const loadFileIntoTab = useCallback(
    async (filePath: string, opts: { inNewTab?: boolean } = {}) => {
      const fileName = basenameOf(filePath)

      setLoading({ fileName, progress: 0 })

      // 进度订阅
      const off = window.api.onFileReadProgress((p) => {
        if (p.filePath !== filePath) return
        // 防御性过滤：要求 read/total 都是有效数字（避免 invoke 响应误渗进来时算出 NaN%）
        if (typeof p.read !== 'number' || typeof p.total !== 'number') return
        const pct = p.total > 0 ? (p.read / p.total) * 100 : 0
        setLoading({ fileName, progress: pct })
      })

      try {
        const kind = classifyFile(filePath)
        // ─── 文本 / svg：用 readFileWithProgress 走流式 + 进度 + utf-8 解码
        // ─── 图片 / 音视频：readFileBinary 直接拿 base64 + mime
        // ─── zip：先 zip:list 拿 entry 元信息 + 全量 entries 内容
        // ─── 其它 unsupported：readFileBinary 占位
        let tabData: Tab

        if (kind === 'text' || kind === 'svg') {
          const r = await window.api.readFileWithProgress(filePath)
          if (!r) throw new Error('读取失败：主进程没有返回内容')
          tabData = makeTextTabFromContent(filePath, fileName, kind, r.content, r.total ?? 0)
          if (kind === 'text' && !opts.inNewTab) {
            // 把内容灌进 tiptap
            isApplyingFromMarkdown.current = true
            if (tiptap) {
              const init =
                tabData.contentFormat === 'html'
                  ? (tabData.content ?? '')
                  : markdownToHtml(tabData.content ?? '')
              tiptap.commands.setContent(init, false)
            }
            setTimeout(() => {
              isApplyingFromMarkdown.current = false
            }, 0)
          }
        } else if (kind === 'image' || kind === 'audio' || kind === 'video') {
          const r = await window.api.readFileBinary(filePath)
          tabData = makeMediaTab(filePath, fileName, kind, r.base64, r.mime, r.bytes)
        } else if (kind === 'archive') {
          const r = await window.api.zipList(filePath)
          // 拿到 list 之后还要把每个 entry 的内容灌进内存（zip:list 不返回内容）
          // fflate 重新解压：直接 readFileBinary 拿全量 bytes，再用 fflate 在渲染端解压
          const bin = await window.api.readFileBinary(filePath)
          const { unzipSync, strFromU8 } = await import('fflate')
          const entries = unzipSync(Uint8Array.from(atob(bin.base64), (c) => c.charCodeAt(0)))
          const entryMap: Record<string, string | { base64: string }> = {}
          for (const [name, data] of Object.entries(entries)) {
            if (name.endsWith('/')) continue
            // 启发式：小于 1MB 且看起来像文本 → 直接当字符串存；否则 base64
            const sample = data.subarray(0, Math.min(64, data.length))
            let looksText = true
            for (let i = 0; i < sample.length; i++) {
              if (sample[i] === 0) {
                looksText = false
                break
              }
            }
            if (looksText && data.length < 1024 * 1024) {
              try {
                entryMap[name] = strFromU8(data)
              } catch {
                entryMap[name] = { base64: bytesToBase64(data) }
              }
            } else {
              entryMap[name] = { base64: bytesToBase64(data) }
            }
          }
          tabData = makeZipTab(filePath, fileName, r.entries, entryMap, r.totalBytes)
        } else {
          // unsupported：还是要把文件读出来，给 viewer 显示文件大小 / mime
          const r = await window.api.readFileBinary(filePath)
          tabData = makeUnsupportedTab(filePath, fileName, r.mime, r.bytes)
        }

        if (opts.inNewTab) {
          setTabs((prev) => [...prev, tabData])
          setActiveId(tabData.id)
        } else {
          setTabs((prev) => prev.map((t) => (t.id === activeId ? tabData : t)))
        }
        updateWindowTitle(fileName, filePath)
        setLoading(null)
      } catch (err) {
        const reason =
          (err as { message?: string })?.message
            ? (err as Error).message
            : String(err) || '未知错误'
        setLoading({ fileName, progress: 0, error: reason })
        return
      } finally {
        off()
      }
    },
    [activeId, tiptap]
  )

  /** 用户关闭错误态：清掉遮罩 */
  const dismissLoading = useCallback(() => {
    setLoading(null)
  }, [])

  /** 打开文件：先弹文件选择器（只返回路径），再处理未保存的情况 */
  const handleOpen = useCallback(async () => {
    const result = await window.api.openFile()
    if (!result) return
    if (dirty) {
      const choice = await dialog.choose({
        title: '当前文件未保存',
        message: `“${fileName}” 有未保存的修改。`,
        detail: result.filePath,
        choices: [
          { value: 'cancel', label: '取消' },
          { value: 'discard', label: '放弃当前文件打开新文件', danger: true },
          { value: 'newTab', label: '在新标签栏打开新文件', primary: true }
        ]
      })
      if (choice === 'cancel' || choice === null) return
      if (choice === 'newTab') {
        await loadFileIntoTab(result.filePath, { inNewTab: true })
        return
      }
      // 'discard' → 走默认替换当前标签的流程
    }
    await loadFileIntoTab(result.filePath)
  }, [dirty, fileName, dialog, loadFileIntoTab])

  const handleSave = useCallback(async () => {
    // 只有文本类 tab 有「保存」语义
    if (activeTab.kind !== 'text' && activeTab.kind !== 'svg') {
      await dialog.alert({
        title: '该文件类型不支持保存',
        message: '请使用 viewer 自身的「另存为…」按钮。'
      })
      return
    }
    if (!filePath) return handleSaveAs()
    await window.api.writeFile(filePath, activeTab.content ?? '')
    updateActiveTab({ dirty: false })
  }, [activeTab.kind, activeTab.content, filePath, updateActiveTab, dialog])

  const handleSaveAs = useCallback(async () => {
    if (activeTab.kind !== 'text' && activeTab.kind !== 'svg') {
      await dialog.alert({
        title: '该文件类型不支持保存',
        message: '请使用 viewer 自身的「另存为…」按钮。'
      })
      return
    }
    const result = await window.api.saveFile(activeTab.content ?? '', fileName || '未命名')
    if (!result) return
    updateActiveTab({ filePath: result.filePath, fileName: basenameOf(result.filePath), dirty: false })
    updateWindowTitle(basenameOf(result.filePath), result.filePath)
  }, [activeTab.kind, activeTab.content, fileName, updateActiveTab, dialog])

  /** 新建：当前标签若无内容直接清空，否则先确认 */
  const handleNew = useCallback(async () => {
    if (dirty) {
      const choice = await dialog.choose({
        title: '当前文件未保存',
        message: `“${fileName}” 有未保存的修改。`,
        choices: [
          { value: 'cancel', label: '取消' },
          { value: 'discard', label: '放弃当前文件打开新文件', danger: true },
          { value: 'newTab', label: '在新标签栏打开新文件', primary: true }
        ]
      })
      if (choice === 'cancel' || choice === null) return
      if (choice === 'newTab') {
        newTab()
        return
      }
    }
    // 替换当前标签为空文本 tab
    setTabs((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, ...makeEmptyTextTab(), id: t.id } : t))
    )
    isApplyingFromMarkdown.current = true
    if (tiptap) tiptap.commands.setContent('', false)
    setTimeout(() => {
      isApplyingFromMarkdown.current = false
    }, 0)
    window.api.setTitle(APP_NAME)
  }, [dirty, fileName, dialog, activeId, tiptap, newTab])

  /**
   * 重命名当前 tab
   * - 如果文件已经存到磁盘（filePath 不为空）→ 同步 rename 磁盘文件
   * - 如果只是新 tab 没存过 → 只改 tab 的 fileName
   */
  const handleRename = useCallback(
    async (newName: string) => {
      const trimmed = newName.trim()
      if (!trimmed) return
      if (trimmed === fileName) return

      let nextPath: string | null = activeTab.filePath
      if (activeTab.filePath) {
        try {
          const r = await window.api.renameFile({ filePath: activeTab.filePath, newName: trimmed })
          // r 是 { filePath, oldFilePath? } | { filePath }
          if ('filePath' in r) nextPath = r.filePath
        } catch (err) {
          const reason = (err as { message?: string })?.message ?? String(err)
          await dialog.alert({
            title: '重命名失败',
            message: `无法把文件改名为「${trimmed}」：\n${reason}`
          })
          return
        }
      }

      updateActiveTab({ fileName: trimmed, filePath: nextPath })
      updateWindowTitle(trimmed, nextPath)
    },
    [activeTab.filePath, fileName, updateActiveTab, dialog]
  )

  function updateWindowTitle(name: string, path?: string | null) {
    window.api.setTitle(
      path && path !== name ? `${name} – ${APP_NAME}` : `${name} – ${APP_NAME}`
    )
  }

  // ===== 菜单 & 快捷键 =====

  /** 打开导出对话框 */
  const handleExport = useCallback(() => {
    setExportOpen(true)
  }, [])

  /**
   * 用户在导出对话框里选中某个格式后：
   * 1) 用 format.convert 把当前内容转换成目标格式
   * 2) 调 saveExport IPC 弹 save dialog → 写入
   * 3) 写完之后弹一个简短的成功提示
   */
  const handleExportPick = useCallback(
    async ({ format, settings }: { format: ExportFormat; settings: import('./lib/exportFormats').ExportSettings }) => {
      // 导出只对文本类 tab 有意义
      if (activeTab.kind !== 'text' && activeTab.kind !== 'svg') {
        await dialog.alert({
          title: '该文件类型不支持导出',
          message: '请使用 viewer 自身的「另存为…」按钮。'
        })
        return
      }
      try {
        const ctx = {
          sourceFormat: (activeTab.contentFormat ?? 'markdown') as 'markdown' | 'html',
          fileName,
          timestamp: new Date().toISOString(),
          settings
        }
        const converted = await format.convert(activeTab.content ?? '', ctx)
        const baseName = settings.fileName.trim() || fileName.replace(/\.[^.]+$/, '') || format.defaultBaseName
        const r = await window.api.saveExport({ content: converted as string, defaultBaseName: baseName, extensions: format.extensions, encoding: 'utf8' })
        if (!r) return
        await dialog.alert({ title: '导出完成', message: `已导出为 ${format.label}（.${format.extension}）。` })
        setExportOpen(false)
      } catch (err) {
        const reason =
          (err as { message?: string })?.message ??
          String(err) ??
          '未知错误'
        await dialog.alert({ title: '导出失败', message: reason })
        throw err
      }
    },
    [activeTab.kind, activeTab.content, activeTab.contentFormat, fileName, dialog, updateActiveTab]
  )

  useEffect(() => {
    const offs = [
      window.api.onMenu('menu:new', handleNew),
      window.api.onMenu('menu:open', handleOpen),
      window.api.onMenu('menu:save', handleSave),
      window.api.onMenu('menu:save-as', handleSaveAs),
      window.api.onMenu('menu:export', handleExport),
      window.api.onMenu('menu:toggle-preview', () => {
        setMode((m) => (m === 'preview' ? 'split' : 'preview'))
      }),
      window.api.onMenu('menu:about', () => {
        dialog.alert({
          title: `关于 ${APP_NAME}`,
          message: (
            <div className="space-y-2">
              <div className="font-semibold text-gray-900">{APP_NAME}</div>
              <div className="text-gray-600 text-[12.5px] leading-relaxed">
                版本 8.0.2<br />
                一款基于 Tiptap 和 Electron 构建的现代化 Markdown 编辑器<br />
                © 2026 付小付网络科技工作室<br />
                官网：www.fuxiaoyu.cn
              </div>
            </div>
          )
        })
      })
    ]
    return () => offs.forEach((off) => off())
  }, [handleNew, handleOpen, handleSave, handleSaveAs, handleExport, dialog])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault()
        setMode((m) => (m === 'preview' ? 'split' : 'preview'))
      }
      // Ctrl/Cmd + W 关闭
      if (meta && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        closeTab(activeId)
      }
      // Ctrl/Cmd + E 导出
      if (meta && e.key.toLowerCase() === 'e' && !e.shiftKey) {
        e.preventDefault()
        handleExport()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, closeTab, handleExport])

  // 初始标题
  useEffect(() => {
    window.api.setTitle(APP_NAME)
  }, [])

  // 切换标签时同步编辑器内容（只对文本/SVG tab 生效；其它 tab 各自用 viewer）
  useEffect(() => {
    if (!tiptap) return
    if (activeTab.kind !== 'text' && activeTab.kind !== 'svg') {
      // 媒体/zip/unsupported：把 tiptap 清空，避免误编辑
      isApplyingFromMarkdown.current = true
      tiptap.commands.setContent('', false)
      setTimeout(() => {
        isApplyingFromMarkdown.current = false
      }, 0)
      updateWindowTitle(fileName, filePath)
      return
    }
    const html =
      activeTab.contentFormat === 'html'
        ? (activeTab.content ?? '')
        : markdownToHtml(activeTab.content ?? '')
    isApplyingFromMarkdown.current = true
    tiptap.commands.setContent(html, false)
    setTimeout(() => {
      isApplyingFromMarkdown.current = false
    }, 0)
    updateWindowTitle(fileName, filePath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // ===== 启动恢复 + 会话持久化（崩溃后能自己救回来） =====

  // 启动时拉取上次会话（崩溃恢复 / 优雅退出 都能用）
  useEffect(() => {
    let cancelled = false
    void window.api
      .loadSession()
      .then((raw) => {
        const s = raw as PersistedSession | null
        if (cancelled || !s || !Array.isArray(s.tabs) || s.tabs.length === 0) return
        // 还原 tabs：只重建「能完整恢复的」部分（文本/SVG 走 content；其它类型因数据太大不放进 session.json）
        const restored: Tab[] = s.tabs.map((t) => {
          const kind: FileKind = (t.kind ?? 'text') as FileKind
          const meta = (t.meta ?? {}) as Record<string, unknown>
          if (kind === 'image' || kind === 'audio' || kind === 'video') {
            // dataUrl 在 content 里；mime/bytes 在 meta 里
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              kind,
              content: null,
              contentFormat: null,
              dataUrl: t.content,
              mime: (meta.mime as string | undefined) ?? 'application/octet-stream',
              bytes: (meta.bytes as number | undefined) ?? 0,
              meta: {},
              dirty: false
            }
          }
          if (kind === 'archive') {
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              kind,
              content: null,
              contentFormat: null,
              dataUrl: null,
              mime: 'application/zip',
              bytes: (meta.bytes as number | undefined) ?? 0,
              meta,
              dirty: false
            }
          }
          if (kind === 'unsupported') {
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              kind,
              content: null,
              contentFormat: null,
              dataUrl: null,
              mime: (meta.mime as string | undefined) ?? 'application/octet-stream',
              bytes: (meta.bytes as number | undefined) ?? 0,
              meta,
              dirty: false
            }
          }
          // text / svg：content + contentFormat 够重建
          return {
            id: t.id,
            filePath: t.filePath,
            fileName: t.fileName,
            kind,
            content: t.content,
            contentFormat: t.contentFormat,
            dataUrl: null,
            mime: kind === 'svg' ? 'image/svg+xml' : null,
            bytes: (t.content ?? '').length,
            meta: {},
            dirty: false
          }
        })
        setTabs(restored)
        setActiveId(s.activeId ?? restored[0]?.id ?? makeId())
      })
      .catch(() => {
        // 读取失败忽略，正常启动就行
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 任何 tabs / activeId 变化 → 防抖 300ms 写到磁盘
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      // 持久化「能完整重建的最小集」
      // - 文本/SVG：content + contentFormat 足够
      // - 媒体：dataUrl 写到 content；mime + bytes 写到 meta
      // - 归档：content 不写（太大），只把 entries 元信息 + 文件大小写到 meta
      // - unsupported：mime + bytes 写到 meta
      const snapshot = {
        tabs: tabs.map((t) => {
          if (t.kind === 'image' || t.kind === 'audio' || t.kind === 'video') {
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              content: t.dataUrl,
              contentFormat: null,
              kind: t.kind,
              meta: { mime: t.mime, bytes: t.bytes },
              dirty: t.dirty
            }
          }
          if (t.kind === 'archive') {
            const meta = (t.meta ?? {}) as Record<string, unknown>
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              content: null,
              contentFormat: null,
              kind: t.kind,
              meta: {
                entries: meta.entries,
                bytes: t.bytes
                // entryData 不持久化（太大），恢复后重新加载 zip
              },
              dirty: t.dirty
            }
          }
          if (t.kind === 'unsupported') {
            return {
              id: t.id,
              filePath: t.filePath,
              fileName: t.fileName,
              content: null,
              contentFormat: null,
              kind: t.kind,
              meta: { mime: t.mime, bytes: t.bytes },
              dirty: t.dirty
            }
          }
          // text / svg
          return {
            id: t.id,
            filePath: t.filePath,
            fileName: t.fileName,
            content: t.content,
            contentFormat: t.contentFormat,
            kind: t.kind,
            meta: {},
            dirty: t.dirty
          }
        }),
        activeId
      }
      void window.api.saveSession(snapshot)
    }, 300)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [tabs, activeId])

  // 启动时如有“待打开文件”（冷启动并通过文件管理器双击打开），在新标签页中打开
  useEffect(() => {
    let cancelled = false
    window.api.takePendingFile().then((result) => {
      if (cancelled || !result) return
      // 主进程只返回路径，让渲染端走带进度的 read
      void loadFileIntoTab(result.filePath, { inNewTab: true })
    })
    return () => {
      cancelled = true
    }
  }, [loadFileIntoTab])

  // 监听主进程送来的“运行中再打开”文件 → 始终在新标签中打开
  useEffect(() => {
    const off = window.api.onOpenFile(({ filePath }) => {
      // 只收到路径，走带进度的 read
      void loadFileIntoTab(filePath, { inNewTab: true })
    })
    return () => {
      off()
    }
  }, [loadFileIntoTab])

  // 监听主进程送来的错误提示
  useEffect(() => {
    const off = window.api.onAppError(({ title, message, detail }) => {
      dialog.alert({ title, message, detail })
    })
    return () => {
      off()
    }
  }, [dialog])

  // ===== 派生数据 =====

  // 字数统计：只对文本类 tab 计算
  const counts = useMemo(
    () =>
      activeTab.kind === 'text' || activeTab.kind === 'svg'
        ? countWords(activeTab.content ?? '')
        : { words: 0, chars: 0 },
    [activeTab.kind, activeTab.content]
  )

  const tabItems: TabItem[] = useMemo(
    () =>
      tabs.map((t) => ({
        id: t.id,
        fileName: t.fileName,
        filePath: t.filePath,
        dirty: t.dirty
      })),
    [tabs]
  )

  const handleCopyMarkdown = useCallback(() => {
    if (activeTab.kind === 'text' || activeTab.kind === 'svg') {
      navigator.clipboard.writeText(activeTab.content ?? '').catch(() => {})
    }
  }, [activeTab.kind, activeTab.content])

  const handleCopyHtml = useCallback(() => {
    if (!tiptap) return
    navigator.clipboard.writeText(tiptap.getHTML()).catch(() => {})
  }, [tiptap])

  const handleSourceChange = useCallback(
    (next: string) => {
      // SourceEditor 只在 markdown 分栏下出现，所以这里安全地用 content
      updateActiveTab({ content: next, dirty: true })
    },
    [updateActiveTab]
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TitleBar
        fileName={fileName}
        dirty={dirty}
        mode={mode}
        onModeChange={setMode}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onExport={handleExport}
        onRename={handleRename}
        canRenameOnDisk={!!activeTab.filePath}
      />

      <TabBar
        tabs={tabItems}
        activeId={activeId}
        onSelect={selectTab}
        onClose={closeTab}
        onNew={() => newTab()}
        onCloseOthers={closeOthers}
        onCloseAll={closeAll}
      />

      {mode === 'edit' && (
        <Toolbar editor={tiptap} onCopyMarkdown={handleCopyMarkdown} onCopyHtml={handleCopyHtml} />
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'edit' ? (
          <EditorArea editor={tiptap} />
        ) : (
          <ActiveTabView
            tab={activeTab}
            mode={mode}
            tiptap={tiptap}
            onSourceChange={(next: string) => updateActiveTab({ content: next, dirty: true })}
            onSvgContentChange={(next: string) => updateActiveTab({ content: next, dirty: true })}
            onZipEntriesChange={(next: Record<string, string | { base64: string }>) => {
              const meta = (activeTab.meta ?? {}) as Record<string, unknown>
              updateActiveTab({ meta: { ...meta, entryData: next }, dirty: true })
            }}
          />
        )}
      </div>

      <BrandWatermark />

      <StatusBar words={counts.words} chars={counts.chars} saved={!dirty} filePath={filePath} />

      <LoadingOverlay
        show={loading !== null}
        fileName={loading?.fileName}
        progress={loading?.error ? undefined : loading?.progress}
        error={loading?.error ?? null}
        onDismiss={dismissLoading}
      />

      {exportOpen && (
        <ExportDialog
          sourceFormat={(activeTab.contentFormat ?? 'markdown') as 'markdown' | 'html'}
          fileName={fileName}
          onClose={() => setExportOpen(false)}
          onPick={handleExportPick}
        />
      )}
    </div>
  )
}