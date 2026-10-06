import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { IconExternalLink, IconUnlink, IconCopy, IconCheck } from './Icons'

type Props = {
  editor: Editor
}

/**
 * 链接气泡：在链接上 / 选中文本上点链接按钮时弹出
 * - URL 输入
 * - 应用 / 打开外部 / 复制链接 / 移除
 */
export default function LinkPopover({ editor }: Props) {
  const isExisting = editor.isActive('link')
  const initial = (editor.getAttributes('link').href as string | undefined) ?? ''
  const [href, setHref] = useState(initial)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHref(initial)
    // 聚焦 + 选中已有 URL
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }, [initial])

  const apply = () => {
    const value = href.trim()
    if (value === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run()
  }

  const openExternal = () => {
    if (!initial) return
    window.open(initial, '_blank', 'noopener')
  }

  const copyLink = async () => {
    if (!initial) return
    try {
      await navigator.clipboard.writeText(initial)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <div className="link-popover" onMouseDown={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        className="link-popover__input"
        value={href}
        placeholder={isExisting ? '编辑链接地址…' : '粘贴或输入链接地址…'}
        onChange={(e) => setHref(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            apply()
          }
        }}
      />
      <button
        type="button"
        className="link-popover__btn link-popover__btn--primary"
        onClick={apply}
        title={isExisting ? '应用修改' : '应用链接'}
      >
        {isExisting ? '应用' : '插入'}
      </button>
      {isExisting && (
        <>
          <span className="link-popover__divider" />
          <button
            type="button"
            className="link-popover__btn"
            onClick={openExternal}
            title="在浏览器中打开"
          >
            <IconExternalLink size={14} />
          </button>
          <button
            type="button"
            className="link-popover__btn"
            onClick={copyLink}
            title="复制链接"
          >
            {copied ? <IconCheck size={14} className="text-emerald-500" /> : <IconCopy size={14} />}
          </button>
          <button
            type="button"
            className="link-popover__btn link-popover__btn--danger"
            onClick={removeLink}
            title="移除链接"
          >
            <IconUnlink size={14} />
          </button>
        </>
      )}
    </div>
  )
}