// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SplitEditor from './SplitEditor'

const metrics = (el: HTMLElement, height: number, top = 0) => Object.defineProperties(el, {
  scrollHeight: { configurable: true, value: height },
  clientHeight: { configurable: true, value: 500 },
  scrollTop: { configurable: true, writable: true, value: top }
})
const view = (value = '# 标题\n\n同步内容') => <SplitEditor value={value} isHtml={false} mode="split" onSourceChange={vi.fn()} tiptap={null} />
const panels = () => [document.querySelector('textarea')!, document.querySelector('.preview-body')!.parentElement!.parentElement!] as const
const flush = () => vi.runOnlyPendingTimers()
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('SplitEditor 滚动回归', () => {
  it('约束 grid 和面板高度，源码 textarea 是唯一源码滚动容器', () => {
    const { container } = render(view())
    const [left, right] = panels()
    expect(container.firstElementChild!.classList.contains('overflow-hidden')).toBe(true)
    for (const el of [container.firstElementChild!, left, right]) expect(el.classList.contains('min-h-0')).toBe(true)
    expect(left.classList.contains('overflow-y-auto')).toBe(true)
    expect(left.parentElement!.classList.contains('overflow-hidden')).toBe(true)
  })
  it('真实 textarea 与预览按可滚动距离双向同步，程序事件不反馈', () => {
    vi.useFakeTimers(); render(view())
    const [left, right] = panels()
    metrics(left, 2000); metrics(right, 3000)
    left.scrollTop = 750; fireEvent.scroll(left); flush()
    expect(right.scrollTop).toBe(1250)
    fireEvent.scroll(right); flush()
    expect(left.scrollTop).toBe(750)
    right.scrollTop = 1000; fireEvent.scroll(right); flush()
    expect(left.scrollTop).toBe(600)
  })
  it('ResizeObserver 首次通知和内容更新不改写用户位置', () => {
    const callbacks: ResizeObserverCallback[] = []
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: ResizeObserverCallback) { callbacks.push(cb) }
      observe() {} disconnect() {}
    })
    const { rerender } = render(view())
    const [left, right] = panels()
    metrics(left, 2000, 320); metrics(right, 3000, 640)
    // 旧实现监听的外层也有尺寸，模拟它错误地用外层驱动预览。
    metrics(left.parentElement!.parentElement!, 2000, 100)
    rerender(view('# 更新\n\n同步内容'))
    callbacks.forEach(cb => cb([], {} as ResizeObserver))
    expect(left.scrollTop).toBe(320)
    expect(right.scrollTop).toBe(640)
  })
  it('不可滚动和越界位置不会产生 NaN 或超出目标范围', () => {
    vi.useFakeTimers(); render(view())
    const [left, right] = panels()
    metrics(left, 500); metrics(right, 3000, 100)
    fireEvent.scroll(left); flush(); expect(right.scrollTop).toBe(0)
    metrics(left, 2000, 2000)
    fireEvent.scroll(left); flush(); expect(right.scrollTop).toBe(2500)
  })
  it('连续事件仅采用最后一次用户滚动，卸载取消待执行同步', () => {
    vi.useFakeTimers(); const { unmount } = render(view())
    const [left, right] = panels()
    metrics(left, 2000); metrics(right, 3000)
    left.scrollTop = 500; fireEvent.scroll(left)
    right.scrollTop = 1000; fireEvent.scroll(right); flush()
    expect(left.scrollTop).toBe(600)
    left.scrollTop = 900; fireEvent.scroll(left); unmount(); flush()
    expect(right.scrollTop).toBe(1000)
  })
  it('分栏选择不再创建跨栏高亮或源码镜像层', () => {
    const { container } = render(view())
    const source = container.querySelector('[data-testid="source-editor"]') as HTMLTextAreaElement
    source.setSelectionRange(0, 4)
    fireEvent.select(source)
    fireEvent.keyUp(source)
    fireEvent(document, new Event('selectionchange'))
    expect(container.querySelector('[data-testid="source-mirror-highlight"]')).toBeNull()
    expect(container.querySelector('.sync-highlight')).toBeNull()
  })

})
