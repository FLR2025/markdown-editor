import { useState } from 'react'
import type { ReactNode } from 'react'
import Modal from './Modal'
import { EXPORT_FORMATS, type ExportFormat, type ExportFormatId, type ExportSettings } from '../lib/exportFormats'

type Props = { sourceFormat: 'markdown' | 'html'; fileName: string; onClose: () => void; onPick: (selection: { format: ExportFormat; settings: ExportSettings }) => Promise<void> | void }
export type DialogSettings = ExportSettings
const DEFAULT_SETTINGS: DialogSettings = { includeMetadata: true, preserveMarkdown: false, imageMode: 'link', keepTaskState: true, keepCodeLanguage: true, fileName: '' }

export default function ExportDialog({ sourceFormat, fileName, onClose, onPick }: Props) {
  const initialId: ExportFormatId = sourceFormat === 'html' ? 'html' : 'markdown'
  const [section, setSection] = useState<'format' | 'settings'>('format')
  const [selectedId, setSelectedId] = useState<ExportFormatId>(initialId)
  const [settings, setSettings] = useState<DialogSettings>({ ...DEFAULT_SETTINGS, fileName: fileName.replace(/\.[^.]+$/, '') })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = EXPORT_FORMATS.find((format) => format.id === selectedId) ?? EXPORT_FORMATS[0]
  const update = <K extends keyof DialogSettings>(key: K, value: DialogSettings[K]) => setSettings((current) => ({ ...current, [key]: value }))
  const start = async () => { if (busy) return; setBusy(true); setError(null); try { await onPick({ format: selected, settings }); } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) } }
  return <Modal open onClose={busy ? () => undefined : onClose} closing={false} width={680}>
    <div className="flex min-h-[430px] overflow-hidden rounded-2xl bg-white text-gray-900">
      <nav className="w-[156px] shrink-0 border-r border-gray-200 bg-gray-50 p-3 pt-4"><div className="mb-4 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">导出</div><NavItem active={section === 'format'} onClick={() => setSection('format')}>导出格式</NavItem><NavItem active={section === 'settings'} onClick={() => setSection('settings')}>导出设置</NavItem></nav>
      <div className="flex min-w-0 flex-1 flex-col"><div className="border-b border-gray-200 px-6 py-4"><h3 className="text-[15px] font-semibold text-gray-900">{section === 'format' ? '导出格式' : '导出设置'}</h3></div><div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {section === 'format' ? <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">{EXPORT_FORMATS.map((format) => <button key={format.id} type="button" onClick={() => { setSelectedId(format.id); setSection('settings') }} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${selectedId === format.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}><span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 bg-white">{selectedId === format.id && <span className="h-2 w-2 rounded-full bg-gray-700" />}</span><span className="w-28 text-[13px] font-medium text-gray-800">{format.label}</span><span className="font-mono text-[12px] text-gray-400">.{format.extension}</span><span className="ml-auto text-[11px] text-gray-400">可用</span></button>)}</div> : <SettingsPanel settings={settings} update={update} />}
        {error && <div role="alert" className="mt-4 border border-[#b44] bg-[#fff4f2] px-3 py-2 text-[12px] text-[#8c2720]">{error}</div>}
      </div><div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-3"><button type="button" disabled={busy} onClick={onClose} className="h-8 rounded-lg border border-gray-200 bg-white px-4 text-[12px] text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50">取消</button><button type="button" disabled={busy} onClick={start} className="h-8 rounded-lg bg-gray-900 px-5 text-[12px] font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-wait disabled:opacity-60">{busy ? '导出中…' : '开始导出'}</button></div></div>
    </div>
  </Modal>
}
function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" onClick={onClick} className={`mb-1 block w-full rounded-lg px-2 py-2 text-left text-[12px] transition-colors ${active ? 'bg-white font-semibold text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'}`}>{children}</button> }
function SettingsPanel({ settings, update }: { settings: DialogSettings; update: <K extends keyof DialogSettings>(key: K, value: DialogSettings[K]) => void }) { return <div className="space-y-4 text-[12px]"><label className="block"><span className="mb-1 block text-gray-500">文件名</span><input value={settings.fileName} onChange={(e) => update('fileName', e.target.value)} className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-gray-800 outline-none transition-colors focus:border-gray-400 focus:ring-2 focus:ring-gray-100" /></label><div className="border-t border-gray-200 pt-3"><Toggle label="包含元数据" checked={settings.includeMetadata} onChange={(v) => update('includeMetadata', v)} /><Toggle label="保留 Markdown 标记" checked={settings.preserveMarkdown} onChange={(v) => update('preserveMarkdown', v)} /><Toggle label="保留任务列表状态" checked={settings.keepTaskState} onChange={(v) => update('keepTaskState', v)} /><Toggle label="保留代码语言标识" checked={settings.keepCodeLanguage} onChange={(v) => update('keepCodeLanguage', v)} /></div><label className="block text-gray-600">图片处理<select value={settings.imageMode} onChange={(e) => update('imageMode', e.target.value as DialogSettings['imageMode'])} className="mt-1 h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-gray-800 outline-none focus:border-gray-400"><option value="link">保留原链接</option><option value="embed">嵌入数据</option></select></label></div> }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center gap-2 py-1.5 text-gray-700"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 rounded accent-gray-800" />{label}</label> }
