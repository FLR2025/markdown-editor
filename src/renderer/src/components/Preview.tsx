import { forwardRef, useMemo } from 'react'
import { previewContent } from '../lib/previewDocument'

type Props = {
  /** 二选一：markdown 源码 或 原始 HTML 片段 */
  markdown?: string
  html?: string
}

/**
 * 预览面板：能渲染 markdown 源码，也能直接渲染已解析好的 HTML 片段。
 * - 给 Markdown 标签：用 marked 走 markdown→html
 * - 给 HTML 标签：直接走 dangerouslySetInnerHTML（视觉 HTML 模式的预览）
 */
const Preview = forwardRef<HTMLDivElement, Props>(function Preview(
  { markdown, html },
  ref
) {
  const resolved = useMemo<string>(() => {
    if (typeof html === 'string') return html
    if (typeof markdown === 'string') return previewContent(markdown, 'markdown')
    return ''
  }, [html, markdown])

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-white" ref={ref}>
      <div className="max-w-[760px] mx-auto px-10 py-12">
        <div
          className="preview-body"
          dangerouslySetInnerHTML={{ __html: resolved }}
        />
      </div>
    </div>
  )
})

export default Preview