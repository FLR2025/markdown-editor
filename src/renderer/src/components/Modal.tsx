import { ReactNode, useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 是否允许点击遮罩关闭，默认 true */
  maskClosable?: boolean
  /** 层级，嵌套弹窗时使用 */
  zIndex?: number
  /** 自定义宽度 */
  width?: number | string
  /** 退出中：触发关闭动画 */
  closing?: boolean
}

export default function Modal({
  open,
  onClose,
  children,
  maskClosable = true,
  zIndex = 50,
  width = 440,
  closing = false
}: Props) {
  useEffect(() => {
    if (!open || closing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closing, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex, pointerEvents: closing ? 'none' : 'auto' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          'absolute inset-0 bg-black/35 backdrop-blur-[2px] ' +
          (closing ? 'tt-modal-mask-out' : 'tt-modal-mask-in')
        }
        onClick={() => maskClosable && !closing && onClose()}
      />
      <div
        className={
          'relative bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.25)] border border-gray-100 ' +
          (closing ? 'tt-modal-panel-out' : 'tt-modal-panel-in')
        }
        style={{
          width,
          maxWidth: 'calc(100vw - 32px)',
          transformOrigin: 'center'
        }}
      >
        {children}
      </div>
    </div>
  )
}