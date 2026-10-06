import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import Preview from './Preview'
import SourceEditor from './SourceEditor'

type Mode = 'edit' | 'preview' | 'split'
type Props = { value: string; isHtml: boolean; tiptap: Editor | null; mode: Mode; onSourceChange: (next: string) => void }

export default function SplitEditor({ value, isHtml, mode, onSourceChange }: Props) {
  if (mode === 'edit') return <SourceEditor value={value} onChange={onSourceChange} />
  if (mode === 'preview') return <Preview markdown={isHtml ? undefined : value} html={isHtml ? value : undefined} />
  return <SplitWithSync value={value} isHtml={isHtml} onSourceChange={onSourceChange} />
}

type SplitProps = { value: string; isHtml: boolean; onSourceChange: (next: string) => void }

function SplitWithSync({ value, isHtml, onSourceChange }: SplitProps) {
  const leftRef = useRef<HTMLTextAreaElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const left = leftRef.current
    const right = rightRef.current
    if (!left || !right) return
    let frame: number | null = null
    let programmaticTarget: HTMLElement | null = null
    let programmaticTop = 0
    let pendingSource: HTMLElement | null = null
    let pendingTarget: HTMLElement | null = null
    const maxScroll = (element: HTMLElement) => Math.max(0, element.scrollHeight - element.clientHeight)
    const syncNow = (source: HTMLElement, target: HTMLElement) => {
      const sourceMax = maxScroll(source)
      const targetMax = maxScroll(target)
      const ratio = sourceMax > 0 ? Math.min(1, Math.max(0, source.scrollTop / sourceMax)) : 0
      programmaticTarget = target
      programmaticTop = ratio * targetMax
      target.scrollTop = programmaticTop
    }
    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (programmaticTarget === source && Math.abs(source.scrollTop - programmaticTop) < 1) { programmaticTarget = null; return }
      if (frame !== null) cancelAnimationFrame(frame)
      pendingSource = source; pendingTarget = target
      frame = requestAnimationFrame(() => { frame = null; if (pendingSource && pendingTarget) syncNow(pendingSource, pendingTarget); pendingSource = null; pendingTarget = null })
    }
    const onLeftScroll = () => sync(left, right)
    const onRightScroll = () => sync(right, left)
    left.addEventListener('scroll', onLeftScroll, { passive: true })
    right.addEventListener('scroll', onRightScroll, { passive: true })
    return () => { left.removeEventListener('scroll', onLeftScroll); right.removeEventListener('scroll', onRightScroll); if (frame !== null) cancelAnimationFrame(frame) }
  }, [])

  return <div className="h-full min-h-0 overflow-hidden grid grid-cols-2 divide-x divide-gray-200 bg-white">
    <div className="h-full min-h-0 overflow-hidden" data-testid="split-scroll-container"><SourceEditor value={value} onChange={onSourceChange} ref={leftRef} /></div>
    <div className="h-full min-h-0 overflow-hidden" data-testid="split-scroll-container"><Preview markdown={isHtml ? undefined : value} html={isHtml ? value : undefined} ref={rightRef} /></div>
  </div>
}
