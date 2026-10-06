type Props = {
  words: number
  chars: number
  saved: boolean
  filePath: string | null
}

export default function StatusBar({ words, chars, saved, filePath }: Props) {
  return (
    <div
      className="flex items-center justify-between px-4 bg-white border-t border-gray-200 text-[11px] text-gray-500"
      style={{ height: 28 }}
    >
      <div className="flex items-center gap-3">
        <span>{saved ? '已保存' : '未保存的修改'}</span>
        {filePath && (
          <span className="text-gray-400 truncate max-w-[400px]" title={filePath}>
            {filePath}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>{words} 字</span>
        <span>{chars} 字符</span>
      </div>
    </div>
  )
}