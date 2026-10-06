import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionKeyDownProps, type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import SlashMenu, { type SlashMenuHandle } from '../components/SlashMenu'
import { createSlashCommands, type SlashMenuItem } from './slashCommands'

// 由 Tiptap 在按下回车 / 鼠标点击时回调：把 item 真实地写入文档
// TSelected = 选中的 item 的类型
const filterItems = (query: string): SlashMenuItem[] => {
  const items = createSlashCommands()
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true
    return item.keywords.some((k) => k.toLowerCase().includes(q))
  })
}

type RenderArgs = SuggestionProps<SlashMenuItem, SlashMenuItem>

/**
 * 跟随光标的 React 弹层（用 tippy.js 定位，省去自己写边界判断）。
 */
export const renderSuggestion = () => {
  let component: ReactRenderer<SlashMenuHandle> | null = null
  let popup: TippyInstance[] | null = null

  return {
    onStart: (props: RenderArgs) => {
      component = new ReactRenderer(SlashMenu, {
        props: { ...props, command: props.command },
        editor: props.editor
      })

      popup = tippy('body', {
        getReferenceClientRect: () => {
          const rect = props.clientRect?.()
          return rect ?? new DOMRect(0, 0, 0, 0)
        },
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
        offset: [0, 8],
        maxWidth: 'none',
        animation: 'shift-away-subtle',
        duration: [120, 80],
        arrow: false,
        theme: 'light-border'
      })
    },

    onUpdate: (props: RenderArgs) => {
      component?.updateProps({ ...props, command: props.command })
      if (popup && props.clientRect) {
        popup[0].setProps({
          getReferenceClientRect: () => {
            const rect = props.clientRect?.()
            return rect ?? new DOMRect(0, 0, 0, 0)
          }
        })
      }
    },

    onKeyDown: (props: SuggestionKeyDownProps): boolean => {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide()
        return true
      }
      return component?.ref?.onKeyDown(props.event) ?? false
    },

    onExit: () => {
      popup?.[0]?.destroy()
      component?.destroy()
      popup = null
      component = null
    }
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        command: ({
          editor,
          range,
          props
        }: {
          editor: import('@tiptap/core').Editor
          range: import('@tiptap/core').Range
          props: SlashMenuItem
        }) => {
          props.command({ editor, range })
        },
        items: ({ query }: { query: string }) => filterItems(query),
        render: renderSuggestion
      } as Partial<SuggestionOptions<SlashMenuItem, SlashMenuItem>>
    }
  },

  addProseMirrorPlugins() {
    // `editor` 已经作为第一个参数传入，下面的 spread 里要排除掉
    const { editor: _omit, ...rest } = this.options.suggestion as Record<string, unknown>
    void _omit
    return [
      Suggestion({
        editor: this.editor,
        ...(rest as Partial<SuggestionOptions<SlashMenuItem, SlashMenuItem>>)
      })
    ]
  }
})
