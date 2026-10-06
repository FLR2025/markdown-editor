import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { Editor, Range } from '@tiptap/core'
import type { SlashMenuItem } from '../lib/slashCommands'
import TableSizePicker from './TableSizePicker'

type Props = {
  items: SlashMenuItem[]
  command: (item: SlashMenuItem) => void
  editor: Editor
  range: Range
}

export type SlashMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const SlashMenu = forwardRef<SlashMenuHandle, Props>(({ items, command, editor, range }, ref) => {
  const [selected, setSelected] = useState(0)
  // 当用户 hover 或键盘选到「表格」item 时，切到 picker 子视图
  const [pickingTable, setPickingTable] = useState(false)

  // 当候选项变化时，重置选中到第一项
  useEffect(() => {
    setSelected(0)
    setPickingTable(false)
  }, [items])

  const select = (i: number) => {
    const item = items[i]
    if (!item) return
    // 表格 item 单独走 picker
    if (item.title === '表格') {
      setPickingTable(true)
      return
    }
    command(item)
  }

  const insertTableAtRange = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertTable({ rows, cols, withHeaderRow: true })
      .insertParagraph()
      .run()
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      // Picker 子视图：方向键左右调 rows/cols（或直接点选），Enter 插入，Esc 退回
      if (pickingTable) {
        if (event.key === 'Escape') {
          setPickingTable(false)
          return true
        }
        if (event.key === 'Enter') {
          insertTableAtRange(3, 3)
          return true
        }
        return false
      }
      if (items.length === 0) {
        if (event.key === 'Enter') return true
        return false
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s + items.length - 1) % items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length)
        return true
      }
      if (event.key === 'Home') {
        setSelected(0)
        return true
      }
      if (event.key === 'End') {
        setSelected(items.length - 1)
        return true
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        select(selected)
        return true
      }
      if (event.key === 'ArrowRight' && items[selected]?.title === '表格') {
        setPickingTable(true)
        return true
      }
      return false
    }
  }))

  if (items.length === 0) {
    return <div className="slash-menu slash-menu--empty">未找到匹配项</div>
  }

  // Picker 子视图
  if (pickingTable) {
    return (
      <div className="slash-menu slash-menu--picker">
        <div className="slash-menu__picker-hint">选择行 × 列 · Enter 确认 3×3 · Esc 返回</div>
        <TableSizePicker onPick={insertTableAtRange} max={8} />
      </div>
    )
  }

  return (
    <div className="slash-menu" role="listbox" aria-label="插入命令">
      {items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === selected}
          className={`slash-menu__item${i === selected ? ' is-selected' : ''}`}
          onMouseEnter={() => setSelected(i)}
          onClick={() => select(i)}
        >
          <span className="slash-menu__icon">{item.icon}</span>
          <span className="slash-menu__text">
            <span className="slash-menu__title">{item.title}</span>
            <span className="slash-menu__desc">{item.description}</span>
          </span>
          {item.title === '表格' && (
            <span className="slash-menu__chev" aria-hidden>›</span>
          )}
        </button>
      ))}
    </div>
  )
})

SlashMenu.displayName = 'SlashMenu'
export default SlashMenu