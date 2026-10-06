import { type Editor } from '@tiptap/react'
import { useRef, useState, useEffect } from 'react'
import {
  IconBold,
  IconItalic,
  IconStrike,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconQuote,
  IconList,
  IconOrderedList,
  IconTaskList,
  IconLink,
  IconImage,
  IconTable,
  IconUndo,
  IconRedo,
  IconHorizontalRule,
  IconCodeBlock,
  IconMarkdown,
  IconHtml,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconTextColor,
  IconHighlight,
  IconChevronLeft,
  IconChevronRight
} from './Icons'
import TableSizePicker from './TableSizePicker'
import ColorPicker from './ColorPicker'

type Props = {
  editor: Editor | null
  onCopyMarkdown: () => void
  onCopyHtml: () => void
}

const Btn = ({
  active,
  onClick,
  disabled,
  title,
  children
}: {
  active?: boolean
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) => (
  <button
    type="button"
    className={`tt-toolbar-btn ${active ? 'is-active' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
  >
    {children}
  </button>
)

export default function Toolbar({ editor, onCopyMarkdown, onCopyHtml }: Props) {
  if (!editor) return null

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 0)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      window.addEventListener('resize', checkScroll)
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    }
  }, [])

  const scrollLeft = () => {
    const el = scrollRef.current
    if (el) el.scrollBy({ left: -150, behavior: 'smooth' })
  }

  const scrollRight = () => {
    const el = scrollRef.current
    if (el) el.scrollBy({ left: 150, behavior: 'smooth' })
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('请输入链接地址', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt('请输入图片地址')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const insertTable = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .insertParagraph()
      .run()
  }

  return (
    <div className="drag-region flex items-center gap-0.5 px-2 py-1.5 bg-white border-b border-gray-200" style={{ overflow: 'visible' }}>
      {showLeftArrow && (
        <button
          type="button"
          className="no-drag tt-toolbar-btn tt-scroll-btn flex-shrink-0"
          onClick={scrollLeft}
          title="向左滚动"
        >
          <IconChevronLeft />
        </button>
      )}
      <div ref={scrollRef} className="no-drag flex items-center gap-0.5 overflow-x-auto scrollbar-hide flex-shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <Btn title="撤销" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <IconUndo />
        </Btn>
        <Btn title="重做" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <IconRedo />
        </Btn>

        <div className="tt-divider" />

        <Btn title="一级标题" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <IconH1 />
        </Btn>
        <Btn title="二级标题" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <IconH2 />
        </Btn>
        <Btn title="三级标题" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <IconH3 />
        </Btn>

        <div className="tt-divider" />

        <Btn title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <IconBold />
        </Btn>
        <Btn title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <IconItalic />
        </Btn>
        <Btn title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <IconStrike />
        </Btn>
        <Btn title="行内代码" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <IconCode />
        </Btn>

        <div className="tt-divider" />

        <Btn title="居左" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <IconAlignLeft />
        </Btn>
        <Btn title="居中" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <IconAlignCenter />
        </Btn>
        <Btn title="居右" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <IconAlignRight />
        </Btn>

        <div className="tt-divider" />

        <ColorPicker
          title="文字颜色"
          value={editor.getAttributes('textStyle').color ?? ''}
          onChange={(color) => editor.chain().focus().setColor(color).run()}
        >
          <IconTextColor />
        </ColorPicker>

        <ColorPicker
          title="背景高亮"
          value={editor.getAttributes('highlight').color ?? ''}
          onChange={(color) => editor.chain().focus().setHighlight({ color }).run()}
        >
          <IconHighlight />
        </ColorPicker>

        <div className="tt-divider" />

        <Btn title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <IconList />
        </Btn>
        <Btn title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <IconOrderedList />
        </Btn>
        <Btn title="任务列表" active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <IconTaskList />
        </Btn>

        <div className="tt-divider" />

        <Btn title="引用" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <IconQuote />
        </Btn>
        <Btn title="代码块" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <IconCodeBlock />
        </Btn>
        <Btn title="分隔线" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <IconHorizontalRule />
        </Btn>

        <div className="tt-divider" />

        <Btn title="链接" active={editor.isActive('link')} onClick={setLink}>
          <IconLink />
        </Btn>
        <Btn title="图片" onClick={addImage}>
          <IconImage />
        </Btn>
        <TableSizePicker onPick={insertTable} placement="bottom">
          <IconTable />
        </TableSizePicker>

        <div className="tt-divider" />

        <Btn title="复制为 Markdown" onClick={onCopyMarkdown}>
          <IconMarkdown />
        </Btn>
        <Btn title="复制为 HTML" onClick={onCopyHtml}>
          <IconHtml />
        </Btn>
      </div>
      {showRightArrow && (
        <button
          type="button"
          className="no-drag tt-toolbar-btn tt-scroll-btn flex-shrink-0"
          onClick={scrollRight}
          title="向右滚动"
        >
          <IconChevronRight />
        </button>
      )}
    </div>
  )
}