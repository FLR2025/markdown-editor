import { ReactNode } from 'react'
import Modal from './Modal'

export type AlertOptions = {
  title?: string
  message: ReactNode
  detail?: ReactNode
  confirmText?: string
}

export type DialogChoice = {
  value: string
  label: string
  primary?: boolean
  danger?: boolean
}

export type ConfirmOptions = {
  title?: string
  message: ReactNode
  detail?: ReactNode
  /** 标准两按钮确认；传入 choices 后忽略 */
  confirmText?: string
  cancelText?: string
  danger?: boolean
  /** 自定义多选项 */
  choices?: DialogChoice[]
}

type CommonProps = {
  closing?: boolean
  onClose: () => void
}

/** 警告/提示对话框（统一外观，不分类型/严重等级） */
export function AlertDialog({
  options,
  closing = false,
  onClose
}: { options: AlertOptions } & CommonProps) {
  return (
    <Modal open onClose={onClose} closing={closing} width={460}>
      <div className="px-7 pt-7 pb-6">
        {options.title && (
          <h3 className="text-[16px] font-semibold text-gray-900 leading-snug mb-2 tracking-[-0.01em]">
            {options.title}
          </h3>
        )}
        <div className="text-[13.5px] text-gray-600 leading-[1.65] whitespace-pre-wrap">
          {options.message}
        </div>
        {options.detail && (
          <div className="mt-4 px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[12px] text-gray-500 max-h-48 overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
            {options.detail}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-9 text-[13px] font-medium text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] rounded-lg transition-[background-color,transform] duration-150 ease-out shadow-sm"
          >
            {options.confirmText ?? '知道了'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** 确认对话框（支持自定义 choices） */
export function ConfirmDialog({
  options,
  closing = false,
  onClose,
  onResolve
}: { options: ConfirmOptions; onResolve: (value: string | null) => void } & CommonProps) {
  const buttons: DialogChoice[] = options.choices ?? [
    {
      value: 'cancel',
      label: options.cancelText ?? '取消',
      danger: false
    },
    {
      value: 'ok',
      label: options.confirmText ?? '确定',
      primary: true,
      danger: options.danger
    }
  ]

  return (
    <Modal open onClose={onClose} closing={closing} width={520}>
      <div className="px-7 pt-7 pb-6">
        {options.title && (
          <h3 className="text-[16px] font-semibold text-gray-900 leading-snug mb-2 tracking-[-0.01em]">
            {options.title}
          </h3>
        )}
        <div className="text-[13.5px] text-gray-600 leading-[1.65] whitespace-pre-wrap">
          {options.message}
        </div>
        {options.detail && (
          <div className="mt-4 px-3.5 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-[12px] text-gray-500 max-h-48 overflow-auto whitespace-pre-wrap font-mono leading-relaxed break-all">
            {options.detail}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {buttons.map((b) => (
            <button
              key={b.value}
              onClick={() => onResolve(b.value)}
              className={
                'h-9 px-4 text-[13px] font-medium rounded-lg whitespace-nowrap ' +
                'transition-[background-color,color,transform,box-shadow] duration-150 ease-out ' +
                'active:scale-[0.98] ' +
                (b.primary
                  ? b.danger
                    ? 'text-white bg-rose-500 hover:bg-rose-600 shadow-sm'
                    : 'text-white bg-gray-900 hover:bg-gray-800 shadow-sm'
                  : b.danger
                    ? 'text-rose-600 bg-white border border-gray-200 hover:bg-rose-50 hover:border-rose-200'
                    : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300')
              }
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}