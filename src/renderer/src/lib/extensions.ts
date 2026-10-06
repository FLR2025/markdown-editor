import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { SlashCommand, renderSuggestion } from './SlashCommandExtension'

export const buildExtensions = () => [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4] },
    codeBlock: { HTMLAttributes: { class: 'tt-codeblock' } }
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level as number
        return `请输入${level === 1 ? '一级' : level === 2 ? '二级' : level === 3 ? '三级' : '四级'}标题…`
      }
      return '开始书写，或按 / 使用命令…'
    },
    showOnlyWhenEditable: true
  }),
  Typography,
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: { class: 'tt-link' }
  }),
  Image.configure({ allowBase64: true, inline: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({
    resizable: true,
    allowTableNodeSelection: false,
    HTMLAttributes: { class: 'tt-table' }
  }),
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  SlashCommand.configure({
    suggestion: {
      char: '/',
      startOfLine: false,
      allowSpaces: false,
      render: renderSuggestion
    }
  })
]