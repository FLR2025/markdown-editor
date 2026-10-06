import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
})

export const IconBold = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
    <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
  </svg>
)

export const IconItalic = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </svg>
)

export const IconStrike = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
)

export const IconCode = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
)

export const IconCodeBlock = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <polyline points="9 9 7 12 9 15" />
    <polyline points="15 9 17 12 15 15" />
  </svg>
)

export const IconH1 = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h8M4 6v12M12 6v12" />
    <path d="M17 8l3-2v12" />
  </svg>
)

export const IconH2 = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h8M4 6v12M12 6v12" />
    <path d="M17 8a2.5 2.5 0 0 1 5 0c0 2-5 3.5-5 7h5" />
  </svg>
)

export const IconH3 = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 12h8M4 6v12M12 6v12" />
    <path d="M17 8a2.5 2.5 0 0 1 4 2c0 1.5-2 2-2 2s2 .5 2 2.5-2 2.5-4 2" />
  </svg>
)

export const IconQuote = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
    <path d="M14 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3" />
  </svg>
)

export const IconList = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </svg>
)

export const IconOrderedList = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="10" y1="6" x2="21" y2="6" />
    <line x1="10" y1="12" x2="21" y2="12" />
    <line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </svg>
)

export const IconTaskList = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="4" height="4" rx="1" />
    <rect x="3" y="15" width="4" height="4" rx="1" />
    <path d="M9 7l2 2 4-4" />
    <line x1="11" y1="17" x2="17" y2="17" />
    <line x1="11" y1="7" x2="17" y2="7" />
  </svg>
)

export const IconLink = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11 5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L13 19" />
  </svg>
)

export const IconImage = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
)

export const IconTable = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
)

export const IconUndo = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
  </svg>
)

export const IconRedo = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
  </svg>
)

export const IconHorizontalRule = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
)

export const IconEye = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconEyeOff = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-6 0-10-7-10-7a18.4 18.4 0 0 1 4.22-5.31" />
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M1 1l22 22" />
    <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
  </svg>
)

export const IconFile = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

export const IconFilePlus = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
)

export const IconSave = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

export const IconOpen = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

export const IconColumns = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
)

export const IconEdit = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export const IconCopy = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

export const IconMarkdown = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M7 15V10l2 2 2-2v5" />
    <path d="M16 10v5M14 15l2-2.5L18 15" />
  </svg>
)

export const IconHtml = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 18l-2-6 2-6" />
    <path d="M20 18l2-6-2-6" />
    <path d="M15 6l-6 12" />
  </svg>
)

export const IconUnlink = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M18 9l3-3a3.5 3.5 0 0 0-5-5l-3 3" />
    <path d="M6 15l-3 3a3.5 3.5 0 0 0 5 5l3-3" />
    <line x1="3" y1="3" x2="21" y2="21" />
  </svg>
)

export const IconExternalLink = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

export const IconCheck = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export const IconDownload = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export const IconChevronDown = ({ size = 16, ...p }: IconProps) => (
  <svg
    {...base(size)}
    {...p}
    strokeWidth={2}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const IconChevronLeft = ({ size = 16, ...p }: IconProps) => (
  <svg
    {...base(size)}
    {...p}
    strokeWidth={2}
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

export const IconChevronRight = ({ size = 16, ...p }: IconProps) => (
  <svg
    {...base(size)}
    {...p}
    strokeWidth={2}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

// ── 文本对齐 ───────────────────────────────────
export const IconAlignLeft = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
)

export const IconAlignCenter = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="6" y1="12" x2="18" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
)

export const IconAlignRight = ({ size, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </svg>
)

// ── 文字颜色（GitHub 风格：字母 A + 颜色下划线） ─────────────
export const IconTextColor = ({ size, ...p }: IconProps) => (
  <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M6 19h12M8 16l5-12 5 12M9 13h6" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 21h16" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
  </svg>
)

// ── 高亮/背景色（GitHub 风格：字母 A + 高亮块） ─────────────
export const IconHighlight = ({ size, ...p }: IconProps) => (
  <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M6 19h12M8 16l5-12 5 12M9 13h6" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="4" y="19" width="16" height="4" fill="#fde047" stroke="none" />
  </svg>
)
