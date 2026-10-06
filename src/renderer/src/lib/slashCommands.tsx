import { type Editor, type Range } from '@tiptap/core'
import {
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
  IconHorizontalRule,
  IconCodeBlock,
  IconCode
} from '../components/Icons'

export type SlashMenuItem = {
  title: string
  description: string
  icon: React.ReactNode
  keywords: string[]
  command: (props: { editor: Editor; range: Range }) => void
}

const promptLink = (editor: Editor) => {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? 'https://'
  const url = window.prompt('请输入链接地址', previous)
  if (url === null) return null
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return ''
  }
  return url
}

const promptImage = () => {
  return window.prompt('请输入图片地址 (https://…)')
}

/**
 * 斜杠命令清单。
 * - 顺序即为默认展示顺序
 * - `keywords` 用来做模糊匹配（中文 / 英文 / 别名都支持）
 */
export const createSlashCommands = (): SlashMenuItem[] => [
  {
    title: '一级标题',
    description: '大号章节标题',
    icon: <IconH1 size={16} />,
    keywords: ['h1', 'heading', 'title', '标题', '一级'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
    }
  },
  {
    title: '二级标题',
    description: '中号章节标题',
    icon: <IconH2 size={16} />,
    keywords: ['h2', 'heading', 'title', '标题', '二级'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
    }
  },
  {
    title: '三级标题',
    description: '小号章节标题',
    icon: <IconH3 size={16} />,
    keywords: ['h3', 'heading', 'title', '标题', '三级'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
    }
  },
  {
    title: '引用',
    description: '突出显示一段文字',
    icon: <IconQuote size={16} />,
    keywords: ['quote', 'blockquote', '引用'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run()
    }
  },
  {
    title: '代码块',
    description: '多行代码',
    icon: <IconCodeBlock size={16} />,
    keywords: ['code', 'codeblock', 'pre', '代码块'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run()
    }
  },
  {
    title: '无序列表',
    description: '简单的项目符号列表',
    icon: <IconList size={16} />,
    keywords: ['list', 'ul', 'bullet', '无序', '列表'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    }
  },
  {
    title: '有序列表',
    description: '带数字编号的列表',
    icon: <IconOrderedList size={16} />,
    keywords: ['list', 'ol', 'ordered', '有序', '列表'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    }
  },
  {
    title: '任务列表',
    description: '带勾选框的待办清单',
    icon: <IconTaskList size={16} />,
    keywords: ['task', 'todo', 'checklist', '任务', '待办'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run()
    }
  },
  {
    title: '分隔线',
    description: '横向分割线',
    icon: <IconHorizontalRule size={16} />,
    keywords: ['hr', 'divider', 'line', '分隔', '分割线'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    }
  },
  {
    title: '链接',
    description: '为选中文本添加链接',
    icon: <IconLink size={16} />,
    keywords: ['link', 'url', 'href', '链接', '网址'],
    command: ({ editor, range }) => {
      const url = promptLink(editor)
      if (url === null) return
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    }
  },
  {
    title: '图片',
    description: '通过链接插入图片',
    icon: <IconImage size={16} />,
    keywords: ['image', 'img', 'picture', 'photo', '图片'],
    command: ({ editor, range }) => {
      const url = promptImage()
      if (!url) return
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
    }
  },
  {
    title: '表格',
    description: '插入 3×3 表格',
    icon: <IconTable size={16} />,
    keywords: ['table', 'grid', '表格'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .insertParagraph()
        .run()
    }
  },
  {
    title: '行内代码',
    description: '段落中的代码片段',
    icon: <IconCode size={16} />,
    keywords: ['code', 'inline', '行内', '代码'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMark('code').run()
    }
  }
]
