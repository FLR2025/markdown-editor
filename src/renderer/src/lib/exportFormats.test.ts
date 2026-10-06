import { describe, expect, it } from 'vitest'
import { EXPORT_FORMATS, getExportFormat, type ExportContext } from './exportFormats'

const ctx: ExportContext = {
  sourceFormat: 'markdown',
  fileName: 'demo.md',
  timestamp: '2026-01-01T00:00:00.000Z',
  settings: {
    includeMetadata: false,
    preserveMarkdown: false,
    imageMode: 'link',
    keepTaskState: true,
    keepCodeLanguage: true,
    fileName: 'demo'
  }
}

describe('export formats', () => {
  it('registers only the four supported export formats', () => {
    expect(EXPORT_FORMATS.map((format) => format.id)).toEqual([
      'markdown', 'html', 'txt', 'json'
    ])
  })

})
