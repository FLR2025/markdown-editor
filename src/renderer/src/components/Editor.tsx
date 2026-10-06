import { BubbleMenu, EditorContent, type Editor } from '@tiptap/react'
import { useState, useCallback } from 'react'
import {
  IconBold,
  IconItalic,
  IconStrike,
  IconCode,
  IconLink,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconTextColor,
  IconHighlight
} from './Icons'
import LinkPopover from './LinkPopover'
import ColorPicker from './ColorPicker'

type Props = {
  editor: Editor | null
}

export default function EditorArea({ editor }: Props) {
  const [linkEditing, setLinkEditing] = useState(false)

  const onLinkClick = useCallback(() => {
    setLinkEditing(true)
  }, [])

  const onLinkClose = useCallback(() => {
    setLinkEditing(false)
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[760px] mx-auto px-10 py-12">
        <EditorContent editor={editor} className="tiptap" />

        {editor && (
          <>
            {/* 选中文本（非链接）时的格式化气泡 */}
            <BubbleMenu
              editor={editor}
              tippyOptions={{
                duration: [200, 150],
                placement: 'top',
                animation: 'shift-away-subtle',
                arrow: false,
                interactive: true,
                maxWidth: 'none',
                theme: 'light-border',
                offset: [0, 8]
              }}
              className="bubble-menu"
              shouldShow={({ editor: e, from, to }) => {
                if (e.isActive('link')) return false
                if (e.isActive('codeBlock')) return false
                if (linkEditing) return true
                return from !== to
              }}
            >
              {linkEditing ? (
                <LinkPopover editor={editor} />
              ) : (
                <>
                  {/* 文字格式 */}
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive('bold') ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="加粗"
                    aria-label="加粗"
                  >
                    <IconBold size={15} />
                  </button>
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive('italic') ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="斜体"
                    aria-label="斜体"
                  >
                    <IconItalic size={15} />
                  </button>
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive('strike') ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    title="删除线"
                    aria-label="删除线"
                  >
                    <IconStrike size={15} />
                  </button>
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive('code') ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    title="行内代码"
                    aria-label="行内代码"
                  >
                    <IconCode size={15} />
                  </button>

                  <span className="bubble-menu__divider" />

                  {/* 对齐 */}
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive({ textAlign: 'left' }) ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    title="居左"
                    aria-label="居左"
                  >
                    <IconAlignLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive({ textAlign: 'center' }) ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    title="居中"
                    aria-label="居中"
                  >
                    <IconAlignCenter size={15} />
                  </button>
                  <button
                    type="button"
                    className={`bubble-menu__btn${editor.isActive({ textAlign: 'right' }) ? ' is-active' : ''}`}
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    title="居右"
                    aria-label="居右"
                  >
                    <IconAlignRight size={15} />
                  </button>

                  <span className="bubble-menu__divider" />

                  {/* 文字颜色 */}
                  <ColorPicker
                    title="文字颜色"
                    value={editor.getAttributes('textStyle').color ?? ''}
                    onChange={(color) => editor.chain().focus().setColor(color).run()}
                    triggerClass="bubble-menu__btn"
                  >
                    <IconTextColor size={15} />
                  </ColorPicker>

                  {/* 高亮 */}
                  <ColorPicker
                    title="背景高亮"
                    value={editor.getAttributes('highlight').color ?? ''}
                    onChange={(color) => editor.chain().focus().setHighlight({ color }).run()}
                    triggerClass="bubble-menu__btn"
                  >
                    <IconHighlight size={15} />
                  </ColorPicker>

                  <span className="bubble-menu__divider" />

                  {/* 链接 */}
                  <button
                    type="button"
                    className="bubble-menu__btn"
                    onClick={onLinkClick}
                    title="插入/编辑链接"
                    aria-label="链接"
                  >
                    <IconLink size={15} />
                  </button>
                </>
              )}
            </BubbleMenu>

            {/* 光标在链接上 / 选区包含链接时显示链接气泡 */}
            <BubbleMenu
              editor={editor}
              tippyOptions={{
                duration: [200, 150],
                placement: 'top',
                animation: 'shift-away-subtle',
                arrow: false,
                interactive: true,
                maxWidth: 'none',
                theme: 'light-border',
                offset: [0, 8]
              }}
              shouldShow={({ editor: e }) => {
                if (e.isActive('codeBlock')) return false
                return e.isActive('link')
              }}
            >
              <LinkPopover editor={editor} />
            </BubbleMenu>
          </>
        )}
      </div>
    </div>
  )
}
