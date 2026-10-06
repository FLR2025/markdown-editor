import { forwardRef } from 'react'

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

const SourceEditor = forwardRef<HTMLTextAreaElement, Props>(function SourceEditor(
  { value, onChange, placeholder },
  ref
) {
  return (
    <div className="h-full min-h-0 overflow-hidden bg-white" data-testid="source-editor-shell">
      <div className="h-full min-h-0 max-w-[760px] mx-auto px-10 py-10">
        <div className="relative h-full min-h-0 overflow-hidden">
          <textarea
            data-testid="source-editor"
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? '在这里输入 Markdown 源码…'}
            spellCheck={false}
            className="relative h-full min-h-0 w-full overflow-y-auto resize-none border-0 outline-none bg-transparent text-[14.5px] font-mono leading-7 text-gray-800 placeholder:text-gray-400"
            style={{ fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace', tabSize: 2 }}
          />
        </div>
      </div>
    </div>
  )
})

export default SourceEditor
