import type { Editor } from '@tiptap/react'
import { useMemo } from 'react'
import { htmlToMarkdown } from '../lib/markdown'
import Preview from './Preview'
import SourceEditor from './SourceEditor'
import SplitEditor from './SplitEditor'
import ImageViewer from './viewers/ImageViewer'
import SvgViewer from './viewers/SvgViewer'
import ZipViewer from './viewers/ZipViewer'
import MediaViewer from './viewers/MediaViewer'
import UnsupportedViewer from './viewers/UnsupportedViewer'
import type { FileKind } from '../lib/viewerRegistry'

type TextFormat = 'markdown' | 'html'
type Mode = 'edit' | 'preview' | 'split'

type Tab = {
  id: string
  filePath: string | null
  fileName: string
  kind: FileKind
  content: string | null
  contentFormat: TextFormat | null
  dataUrl: string | null
  mime: string | null
  bytes: number
  meta: Record<string, unknown>
  dirty: boolean
}

type Props = {
  tab: Tab
  mode: Mode
  tiptap: Editor | null
  onSourceChange: (next: string) => void
  onSvgContentChange: (next: string) => void
  onZipEntriesChange: (next: Record<string, string | { base64: string }>) => void
}

/**
 * 当前活跃标签页的渲染分发器。
 * - 根据 `tab.kind` 选择对应的 viewer
 * - 文本类 tab 还根据 `mode`（edit / preview / split）切换不同视图
 * - 没有打开文件时（welcome tab）也走 text 分支，默认显示示例文档
 */
export default function ActiveTabView({
  tab,
  mode,
  tiptap,
  onSourceChange,
  onSvgContentChange,
  onZipEntriesChange
}: Props) {
  // ─── 图片：交给 ImageViewer ──────────────────
  if (tab.kind === 'image') {
    return (
      <ImageViewer
        filePath={tab.filePath ?? ''}
        fileName={tab.fileName}
        dataUrl={tab.dataUrl ?? ''}
        bytes={tab.bytes}
        mime={tab.mime ?? 'image/png'}
      />
    )
  }

  // ─── SVG：交给 SvgViewer（文本形式但走 SVG 可视化编辑器） ────────────
  if (tab.kind === 'svg') {
    return (
      <SvgViewer
        filePath={tab.filePath ?? ''}
        fileName={tab.fileName}
        content={tab.content ?? ''}
        bytes={tab.bytes}
        onContentChange={onSvgContentChange}
      />
    )
  }

  // ─── 音视频：交给 MediaViewer ───────────────
  if (tab.kind === 'audio' || tab.kind === 'video') {
    return (
      <MediaViewer
        filePath={tab.filePath ?? ''}
        fileName={tab.fileName}
        dataUrl={tab.dataUrl ?? ''}
        mime={tab.mime ?? ''}
        bytes={tab.bytes}
        kind={tab.kind}
      />
    )
  }

  // ─── ZIP：交给 ZipViewer ──────────────────
  if (tab.kind === 'archive') {
    const meta = (tab.meta ?? {}) as Record<string, unknown>
    const entries = (meta.entryData ?? {}) as Record<string, string | { base64: string }>
    const entryList = (meta.entries ?? []) as Array<{ name: string; size: number; isDir: boolean }>
    return (
      <ZipViewer
        filePath={tab.filePath ?? ''}
        fileName={tab.fileName}
        bytes={tab.bytes}
        entries={entries}
        onEntriesChange={onZipEntriesChange}
        meta={entryList}
      />
    )
  }

  // ─── 文本类（text / svg 也走这里，但 svg 上面已 return） ────────────
  // edit 模式由 App.tsx 渲染 EditorArea (Tiptap)，这里返回 null
  if (tab.kind === 'text') {
    if (mode === 'edit') return null

    // 预览时优先用编辑器的脏内容（未保存的）
    const previewMarkdown = useMemo(() => {
      if (tab.contentFormat === 'html') return undefined
      if (tab.dirty && tiptap) return htmlToMarkdown(tiptap.getHTML())
      return tab.content ?? ''
    }, [tab.contentFormat, tab.content, tab.dirty, tiptap])

    const previewHtml = useMemo(() => {
      if (tab.contentFormat !== 'html') return undefined
      if (tab.dirty && tiptap) return tiptap.getHTML()
      return tab.content ?? ''
    }, [tab.contentFormat, tab.content, tab.dirty, tiptap])

    const isHtml = tab.contentFormat === 'html'

    if (mode === 'preview') {
      return (
        <Preview
          markdown={previewMarkdown}
          html={previewHtml}
        />
      )
    }

    // split 模式：左侧源码 + 右侧渲染预览 + 双向滚动同步
    return (
      <SplitEditor
        value={tab.content ?? ''}
        isHtml={isHtml}
        tiptap={tiptap}
        mode={mode}
        onSourceChange={onSourceChange}
      />
    )
  }

  // ─── 其它（unsupported / pdf 等） ────────────
  return (
    <UnsupportedViewer
      filePath={tab.filePath ?? ''}
      fileName={tab.fileName}
      bytes={tab.bytes}
      mime={tab.mime ?? 'application/octet-stream'}
    />
  )
}