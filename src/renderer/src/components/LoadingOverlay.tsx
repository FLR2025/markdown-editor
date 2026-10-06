import { ReactNode } from 'react'

type Props = {
  /** 是否显示 */
  show: boolean
  /** 文件名（可选） */
  fileName?: string
  /** 加载进度 0-100 */
  progress?: number
  /** 自定义说明文字 */
  message?: string
  /** 错误态：错误时显示，并把遮罩染红 */
  error?: string | null
  /** 错误时点击"知道了"的回调 */
  onDismiss?: () => void
  /** 子节点（可选） */
  children?: ReactNode
}

/**
 * 全屏加载遮罩：带文件名 + 实时进度条 + 模糊背景
 * 解决「双击大文件直接白屏」的体验问题
 */
export default function LoadingOverlay({
  show,
  fileName,
  progress,
  message,
  error,
  onDismiss,
  children
}: Props) {
  if (!show) return null
  const pct = Math.max(0, Math.min(100, Math.round(progress ?? 0)))
  const indeterminate = progress === undefined && !error

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/85 backdrop-blur-[2px] animate-[tt-fade-in_var(--d-base)_var(--ease-out)_forwards]">
      <div className="w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(15,23,42,0.2)] border border-gray-100 p-7 animate-[tt-pop-in_var(--d-slow)_var(--ease-out-soft)_forwards]">
        {error ? (
          <ErrorState fileName={fileName} error={error} onDismiss={onDismiss} />
        ) : (
          <>
            <div className="flex items-start gap-3 mb-5">
              <Spinner />
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="text-[14px] font-medium text-gray-900 leading-snug">
                  {fileName ? `正在打开「${fileName}」` : (message ?? '正在加载文件…')}
                </div>
                {fileName && message && (
                  <div className="text-[12px] text-gray-500 mt-1 truncate" title={message}>
                    {message}
                  </div>
                )}
              </div>
            </div>
            <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {indeterminate ? (
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full animate-[tt-indet_1.4s_var(--ease-in-out)_infinite]" />
              ) : (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400 to-sky-500 rounded-full"
                  style={{
                    width: `${pct}%`,
                    transition: 'width 180ms var(--ease-out-soft)'
                  }}
                />
              )}
            </div>
            {!indeterminate && (
              <div className="mt-2 text-right text-[11px] text-gray-400 tabular-nums">
                {pct.toLocaleString()}%
              </div>
            )}
          </>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  )
}

function ErrorState({
  fileName,
  error,
  onDismiss
}: {
  fileName?: string
  error: string
  onDismiss?: () => void
}) {
  return (
    <>
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-gray-900 leading-snug">
            {fileName ? `打开「${fileName}」时出错了` : '出错了'}
          </div>
          <div className="text-[12.5px] text-gray-500 mt-1.5 leading-relaxed">原因是：</div>
        </div>
      </div>
      <div className="px-3.5 py-2.5 bg-rose-50/60 border border-rose-100 rounded-lg text-[12px] text-rose-700 max-h-40 overflow-auto whitespace-pre-wrap font-mono leading-relaxed break-all">
        {error}
      </div>
      {onDismiss && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={onDismiss}
            className="h-9 px-4 text-[13px] font-medium text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] rounded-lg transition-[background-color,transform] duration-150 ease-out shadow-sm"
          >
            知道了
          </button>
        </div>
      )}
    </>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin text-sky-500 shrink-0 mt-0.5" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}