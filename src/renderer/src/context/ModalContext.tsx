import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { AlertDialog, ConfirmDialog, AlertOptions, ConfirmOptions } from '../components/Dialog'

type Resolver = (value: string | null) => void

type Entry =
  | { kind: 'alert'; options: AlertOptions; closing: boolean; resolver: Resolver }
  | { kind: 'confirm'; options: ConfirmOptions; closing: boolean; resolver: Resolver }

/** 与 Modal.tsx 的退出动画时长保持一致 */
const EXIT_MS = 200

type DialogApi = {
  alert: (options: AlertOptions | string) => Promise<void>
  /** 简化的两按钮确认，返回 boolean */
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  /** 自定义多选项，返回所选 value 或 null（取消） */
  choose: (options: ConfirmOptions) => Promise<string | null>
}

const Ctx = createContext<DialogApi | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry | null>(null)
  // 用 ref 记录最新的 resolver，避免闭包问题
  const resolverRef = useRef<Resolver | null>(null)
  // 用 ref 跟踪关闭定时器，组件卸载时清理
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const resolveAndClose = useCallback((value: string | null) => {
    if (resolverRef.current) {
      resolverRef.current(value)
      resolverRef.current = null
    }
    if (!entry) return
    // 标记为 closing，组件渲染退出动画
    setEntry({ ...entry, closing: true })
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setEntry(null)
      closeTimerRef.current = null
    }, EXIT_MS)
  }, [entry])

  const close = useCallback((value: string | null = null) => {
    resolveAndClose(value)
  }, [resolveAndClose])

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    const opts: AlertOptions =
      typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      resolverRef.current = () => resolve()
      setEntry({ kind: 'alert', options: opts, closing: false, resolver: () => resolve() })
    })
  }, [])

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      resolverRef.current = (v) => resolve(v === 'ok')
      setEntry({
        kind: 'confirm',
        options: opts,
        closing: false,
        resolver: (v) => resolve(v === 'ok')
      })
    })
  }, [])

  const choose = useCallback((options: ConfirmOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setEntry({
        kind: 'confirm',
        options,
        closing: false,
        resolver: resolve
      })
    })
  }, [])

  const api: DialogApi = { alert, confirm, choose }

  return (
    <Ctx.Provider value={api}>
      {children}
      {entry?.kind === 'alert' && (
        <AlertDialog
          options={entry.options}
          closing={entry.closing}
          onClose={() => close(null)}
        />
      )}
      {entry?.kind === 'confirm' && (
        <ConfirmDialog
          options={entry.options}
          closing={entry.closing}
          onClose={() => close(null)}
          onResolve={(v) => close(v)}
        />
      )}
    </Ctx.Provider>
  )
}

export function useDialog(): DialogApi {
  const api = useContext(Ctx)
  if (!api) {
    throw new Error('useDialog must be used inside <ModalProvider>')
  }
  return api
}