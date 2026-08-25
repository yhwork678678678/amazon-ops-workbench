import {
  Activity,
  Archive,
  Bell,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  LayoutDashboard,
  NotebookPen,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Save,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'

type Note = {
  id: string
  title: string
  body: string
  tag: string
  createdAt: string
  dueAt?: string
}

type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string | null
  path: string
  htmlUrl?: string
  commitUrl?: string
  sha?: string
}

type PreviewFile = {
  name: string
  type: string
  url: string
  text?: string
}

type CalculatorState = {
  salePrice: number
  cost: number
  shipping: number
  fbaFee: number
  adSpend: number
  referralRate: number
}

type Workflow = {
  id: string
  time: string
  title: string
  body: string
  reminderEnabled: boolean
  reminderMinutes: number
}

const STORAGE_KEYS = {
  notes: 'amazon-workbench-notes',
  calculator: 'amazon-workbench-calculator',
  workflows: 'amazon-workbench-workflows',
  uploadedFiles: 'amazon-workbench-uploaded-files',
  uploadKey: 'amazon-workbench-upload-key',
}

const uploadWorkerUrl = import.meta.env.VITE_UPLOAD_WORKER_URL as string | undefined

const defaultNotes: Note[] = [
  {
    id: 'note-1',
    title: '今天先看广告异常',
    body: '先筛 ACOS 高于 35% 的广告组，再看转化率低但点击多的关键词。',
    tag: '广告',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: '新品页检查',
    body: '主图、五点、A+、QA、coupon、库存、配送时效逐项过一遍。',
    tag: 'Listing',
    createdAt: new Date().toISOString(),
  },
]

const defaultWorkflows: Workflow[] = [
  { id: 'workflow-1', time: '09:30', title: '库存与断货风险', body: '检查 30 天销量、可售库存、在途和补货 ETA。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-2', time: '11:00', title: '广告预算巡检', body: '找花费突增、ACOS 失控、点击多无转化的活动。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-3', time: '14:30', title: 'Listing 质量', body: '检查差评、QA、图片、价格、coupon 和竞品变化。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-4', time: '17:30', title: '复盘记录', body: '把今天调整动作写进备忘，方便明天追踪结果。', reminderEnabled: true, reminderMinutes: 10 },
]

const defaultCalculator: CalculatorState = {
  salePrice: 29.99,
  cost: 7.2,
  shipping: 2.1,
  fbaFee: 5.3,
  adSpend: 3.5,
  referralRate: 15,
}

function readStoredNotes() {
  const raw = localStorage.getItem(STORAGE_KEYS.notes)
  if (!raw) return defaultNotes

  try {
    const parsed = JSON.parse(raw) as Note[]
    return Array.isArray(parsed) ? parsed : defaultNotes
  } catch {
    return defaultNotes
  }
}

function readStoredCalculator() {
  const raw = localStorage.getItem(STORAGE_KEYS.calculator)
  if (!raw) return defaultCalculator

  try {
    return { ...defaultCalculator, ...(JSON.parse(raw) as Partial<CalculatorState>) }
  } catch {
    return defaultCalculator
  }
}

function readStoredUploadedFiles() {
  const raw = localStorage.getItem(STORAGE_KEYS.uploadedFiles)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as UploadedFile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readStoredUploadKey() {
  return localStorage.getItem(STORAGE_KEYS.uploadKey) || ''
}

function readStoredWorkflows() {
  const raw = localStorage.getItem(STORAGE_KEYS.workflows)
  if (!raw) return defaultWorkflows

  try {
    const parsed = JSON.parse(raw) as Partial<Workflow>[]
    return Array.isArray(parsed)
      ? parsed.map((workflow) => ({
          ...workflow,
          reminderEnabled: workflow.reminderEnabled ?? true,
          reminderMinutes: workflow.reminderMinutes ?? 10,
        })) as Workflow[]
      : defaultWorkflows
  } catch {
    return defaultWorkflows
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function App() {
  const [notes, setNotes] = useState<Note[]>(readStoredNotes)
  const [workflows, setWorkflows] = useState<Workflow[]>(readStoredWorkflows)
  const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [workflowDraft, setWorkflowDraft] = useState({ time: '', title: '', body: '', reminderEnabled: true, reminderMinutes: 10 })
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteTag, setNoteTag] = useState('运营')
  const [noteDueAt, setNoteDueAt] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(readStoredUploadedFiles)
  const [uploadKey, setUploadKey] = useState(readStoredUploadKey)
  const [cloudFileMessage, setCloudFileMessage] = useState(
    uploadWorkerUrl ? '上传后会写入私密 GitHub 文件仓库。' : '需要先配置 VITE_UPLOAD_WORKER_URL 才能上传。',
  )
  const [cloudUploading, setCloudUploading] = useState(false)
  const [cloudLoading, setCloudLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const [reminderMessage, setReminderMessage] = useState('')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [calculator, setCalculator] = useState<CalculatorState>(readStoredCalculator)
  const cloudFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.calculator, JSON.stringify(calculator))
  }, [calculator])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.workflows, JSON.stringify(workflows))
  }, [workflows])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.uploadedFiles, JSON.stringify(uploadedFiles))
  }, [uploadedFiles])

  useEffect(() => {
    if (uploadKey) {
      localStorage.setItem(STORAGE_KEYS.uploadKey, uploadKey)
    } else {
      localStorage.removeItem(STORAGE_KEYS.uploadKey)
    }
  }, [uploadKey])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const pendingReminders = useMemo(() => {
    const now = clock.getTime()
    const end = now + 24 * 60 * 60 * 1000
    const items: { id: string; title: string; dueAt: Date; source: string }[] = []

    workflows.forEach((workflow) => {
      if (!workflow.reminderEnabled) return
      const [hour, minute] = workflow.time.split(':').map(Number)
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return
      const dueAt = new Date(clock)
      dueAt.setHours(hour, minute, 0, 0)
      if (dueAt.getTime() < now - 15 * 60 * 1000) dueAt.setDate(dueAt.getDate() + 1)
      if (dueAt.getTime() <= end) items.push({ id: workflow.id, title: workflow.title, dueAt, source: '巡检' })
    })

    notes.forEach((note) => {
      if (!note.dueAt) return
      const dueAt = new Date(note.dueAt)
      if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() <= end && dueAt.getTime() >= now - 15 * 60 * 1000) {
        items.push({ id: note.id, title: note.title, dueAt, source: '备忘' })
      }
    })

    return items.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  }, [clock, notes, workflows])

  useEffect(() => {
    const now = clock.getTime()
    pendingReminders.forEach((item) => {
      const workflow = workflows.find((entry) => entry.id === item.id)
      const reminderMinutes = workflow?.reminderMinutes ?? 0
      const reminderAt = item.dueAt.getTime() - reminderMinutes * 60 * 1000
      if (now < reminderAt || now > item.dueAt.getTime() + 15 * 60 * 1000) return

      const reminderKey = `amazon-workbench-reminded:${item.id}:${item.dueAt.toISOString().slice(0, 10)}`
      if (sessionStorage.getItem(reminderKey)) return
      sessionStorage.setItem(reminderKey, '1')
      const message = `${item.source}提醒：${item.title}`
      setReminderMessage(message)
      if (notificationPermission === 'granted') new Notification('亚马逊运营工作台', { body: message })
    })
  }, [clock, notes, notificationPermission, pendingReminders, workflows])

  const financials = useMemo(() => {
    const referralFee = calculator.salePrice * (calculator.referralRate / 100)
    const totalCost =
      calculator.cost + calculator.shipping + calculator.fbaFee + calculator.adSpend + referralFee
    const profit = calculator.salePrice - totalCost
    const margin = calculator.salePrice ? (profit / calculator.salePrice) * 100 : 0
    const landedCost = calculator.cost + calculator.shipping
    const roi = landedCost ? (profit / landedCost) * 100 : 0

    return { referralFee, totalCost, profit, margin, roi }
  }, [calculator])

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteTitle.trim() && !noteBody.trim()) return

    const nextNote: Note = {
      id: crypto.randomUUID(),
      title: noteTitle.trim() || '未命名备忘',
      body: noteBody.trim(),
      tag: noteTag.trim() || '运营',
      createdAt: new Date().toISOString(),
      dueAt: noteDueAt || undefined,
    }

    setNotes((current) => [nextNote, ...current])
    setNoteTitle('')
    setNoteBody('')
    setNoteTag('运营')
    setNoteDueAt('')
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  function openWorkflowEditor(workflow?: Workflow) {
    setEditingWorkflowId(workflow?.id ?? null)
    setWorkflowDraft(
      workflow
        ? { time: workflow.time, title: workflow.title, body: workflow.body, reminderEnabled: workflow.reminderEnabled, reminderMinutes: workflow.reminderMinutes }
        : { time: '', title: '', body: '', reminderEnabled: true, reminderMinutes: 10 },
    )
    setWorkflowEditorOpen(true)
  }

  function closeWorkflowEditor() {
    setWorkflowEditorOpen(false)
    setEditingWorkflowId(null)
    setWorkflowDraft({ time: '', title: '', body: '', reminderEnabled: true, reminderMinutes: 10 })
  }

  function handleWorkflowSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const time = workflowDraft.time.trim()
    const title = workflowDraft.title.trim()
    const body = workflowDraft.body.trim()
    if (!time || !title || !body) return

    const nextWorkflow: Workflow = {
      id: editingWorkflowId ?? crypto.randomUUID(),
      time,
      title,
      body,
      reminderEnabled: workflowDraft.reminderEnabled,
      reminderMinutes: workflowDraft.reminderMinutes,
    }

    setWorkflows((current) =>
      editingWorkflowId
        ? current.map((workflow) => (workflow.id === editingWorkflowId ? nextWorkflow : workflow))
        : [...current, nextWorkflow],
    )
    closeWorkflowEditor()
  }

  function deleteWorkflow(id: string) {
    setWorkflows((current) => current.filter((workflow) => workflow.id !== id))
    if (editingWorkflowId === id) closeWorkflowEditor()
  }

  function restoreDefaultWorkflows() {
    setWorkflows(defaultWorkflows)
    closeWorkflowEditor()
  }

  async function uploadCloudFile(file: File) {
    if (!uploadWorkerUrl) throw new Error('没有配置上传服务地址。')
    if (!uploadKey.trim()) throw new Error('请先填写上传密钥。')

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(uploadWorkerUrl, {
      method: 'POST',
      headers: {
        'x-upload-key': uploadKey.trim(),
      },
      body: formData,
    })

    const payload = await response.json() as { file?: Omit<UploadedFile, 'id'>; error?: string }
    if (!response.ok || !payload.file) {
      throw new Error(payload.error || '上传失败。')
    }

    return {
      id: crypto.randomUUID(),
      ...payload.file,
    }
  }

  async function readCloudResponse(response: Response) {
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    if (!response.ok) {
      const payload = await response.json() as { error?: string }
      throw new Error(payload.error || '请求上传文件服务失败。')
    }
    return { contentType, response }
  }

  async function refreshUploadedFiles() {
    if (!uploadWorkerUrl) {
      setCloudFileMessage('需要先配置 VITE_UPLOAD_WORKER_URL 才能读取。')
      return
    }
    if (!uploadKey.trim()) {
      setCloudFileMessage('请先填写上传密钥，再读取私密仓库文件。')
      return
    }

    setCloudLoading(true)
    setCloudFileMessage('正在读取私密 GitHub 仓库文件...')
    try {
      const response = await fetch(`${uploadWorkerUrl}?action=list`, {
        headers: { 'x-upload-key': uploadKey.trim() },
      })
      const { response: checkedResponse } = await readCloudResponse(response)
      const payload = await checkedResponse.json() as { files: Omit<UploadedFile, 'id'>[] }
      const filesFromRepository = payload.files.map((file) => ({ id: crypto.randomUUID(), ...file }))
      setUploadedFiles(filesFromRepository)
      setCloudFileMessage(`已读取 ${filesFromRepository.length} 个私密仓库文件。`)
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '读取文件失败，请稍后重试。')
    } finally {
      setCloudLoading(false)
    }
  }

  async function handleCloudFiles(fileList: FileList | null) {
    if (!fileList?.length || cloudUploading) return

    setCloudUploading(true)
    setCloudFileMessage(`正在上传 ${fileList.length} 个文件到私密 GitHub 仓库...`)

    try {
      const uploaded = await Promise.all(Array.from(fileList).map((file) => uploadCloudFile(file)))
      setUploadedFiles((current) => [...uploaded, ...current])
      setCloudFileMessage(`${uploaded.length} 个文件已上传到私密 GitHub 仓库。`)
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '上传失败，请稍后重试。')
    } finally {
      setCloudUploading(false)
      if (cloudFileInputRef.current) cloudFileInputRef.current.value = ''
    }
  }

  async function fetchCloudFile(file: UploadedFile, download = false) {
    if (!uploadWorkerUrl || !uploadKey.trim()) {
      setCloudFileMessage('请先配置上传服务并填写上传密钥。')
      return null
    }

    const endpoint = new URL(uploadWorkerUrl)
    endpoint.searchParams.set('action', 'file')
    endpoint.searchParams.set('path', file.path)
    if (download) endpoint.searchParams.set('download', '1')

    const response = await fetch(endpoint, { headers: { 'x-upload-key': uploadKey.trim() } })
    const { contentType } = await readCloudResponse(response)
    const blob = await response.blob()
    return { blob, contentType }
  }

  async function previewCloudFile(file: UploadedFile) {
    try {
      const result = await fetchCloudFile(file)
      if (!result) return
      const url = URL.createObjectURL(result.blob)
      const preview: PreviewFile = { name: file.name, type: result.contentType, url }
      if (result.contentType.startsWith('text/') || result.contentType === 'application/json') {
        preview.text = await result.blob.text()
      }
      setPreviewFile(preview)
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '预览文件失败，请稍后重试。')
    }
  }

  async function downloadCloudFile(file: UploadedFile) {
    try {
      const result = await fetchCloudFile(file, true)
      if (!result) return
      const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '下载文件失败，请稍后重试。')
    }
  }

  function closePreview() {
    if (previewFile) URL.revokeObjectURL(previewFile.url)
    setPreviewFile(null)
  }

  useEffect(() => {
    if (uploadKey.trim()) void refreshUploadedFiles()
  }, [])

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="工作台导航">
        <div className="brand-block">
          <div className="brand-mark">AMZ</div>
          <div>
            <p className="eyebrow">Personal console</p>
            <h1>亚马逊运营工作台</h1>
          </div>
        </div>

        <nav className="nav-list">
          <a href="#overview">
            <LayoutDashboard size={18} />
            概览
          </a>
          <a href="#calculator">
            <Calculator size={18} />
            利润测算
          </a>
          <a href="#files">
            <Archive size={18} />
            文件区
          </a>
          <a href="#notes">
            <NotebookPen size={18} />
            备忘录
          </a>
        </nav>

      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-actions">
            {notificationPermission === 'default' && (
              <button type="button" onClick={() => void enableNotifications()}>
                <Bell size={16} />
                开启通知
              </button>
            )}
          </div>
        </header>

        {(reminderMessage || pendingReminders.length > 0) && (
          <section className="reminder-bar" aria-live="polite">
            <Bell size={18} />
            <div>
              <strong>{reminderMessage || '即将到期事项'}</strong>
              {pendingReminders.length > 0 && (
                <span>
                  {pendingReminders.slice(0, 3).map((item) => `${item.source}：${item.title}（${item.dueAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}）`).join('　')}
                </span>
              )}
            </div>
          </section>
        )}

        <section className="overview-grid" id="overview" aria-label="运营概览">
          <article className="signal-card span-2">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Control loop</p>
                <h3>日常巡检流程</h3>
              </div>
              <div className="section-actions">
                <button type="button" className="icon-text-button" onClick={() => openWorkflowEditor()}>
                  <Plus size={16} />
                  新增流程
                </button>
                <button type="button" className="icon-button" title="编辑巡检流程" onClick={() => setWorkflowEditorOpen((open) => !open)}>
                  <Pencil size={17} />
                </button>
                <Activity size={20} />
              </div>
            </div>
            <div className="timeline">
              {workflows.length === 0 ? (
                <p className="empty-state">还没有巡检流程，请新增一条或恢复默认流程。</p>
              ) : workflows.map((workflow) => (
                <div className="timeline-row" key={workflow.id}>
                  <span>{workflow.time}</span>
                  <strong>{workflow.title}</strong>
                  <p>{workflow.body}</p>
                  {workflowEditorOpen && (
                    <div className="timeline-actions">
                      <button type="button" className="icon-button" title="编辑" onClick={() => openWorkflowEditor(workflow)}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="icon-button" title="删除" onClick={() => deleteWorkflow(workflow.id)}>
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {workflowEditorOpen && (
              <form className="workflow-editor" onSubmit={handleWorkflowSubmit}>
                <div className="workflow-editor-heading">
                  <strong>{editingWorkflowId ? '编辑巡检流程' : '新增巡检流程'}</strong>
                  <button type="button" className="icon-button" title="关闭编辑" onClick={closeWorkflowEditor}>
                    <X size={16} />
                  </button>
                </div>
                <div className="workflow-editor-fields">
                  <label>
                    <span>时间</span>
                    <input type="text" placeholder="例如 09:30" value={workflowDraft.time} onChange={(event) => setWorkflowDraft((draft) => ({ ...draft, time: event.target.value }))} />
                  </label>
                  <label>
                    <span>流程名称</span>
                    <input type="text" placeholder="例如 库存与断货风险" value={workflowDraft.title} onChange={(event) => setWorkflowDraft((draft) => ({ ...draft, title: event.target.value }))} />
                  </label>
                  <label className="workflow-body-field">
                    <span>检查说明</span>
                    <textarea placeholder="写下这一步要检查的内容" value={workflowDraft.body} onChange={(event) => setWorkflowDraft((draft) => ({ ...draft, body: event.target.value }))} />
                  </label>
                  <div className="workflow-reminder-field">
                    <span>提醒设置</span>
                    <div className="workflow-reminder-controls">
                      <label className="toggle-row">
                        <input type="checkbox" checked={workflowDraft.reminderEnabled} onChange={(event) => setWorkflowDraft((draft) => ({ ...draft, reminderEnabled: event.target.checked }))} />
                        <span>开启提醒</span>
                      </label>
                      <select value={workflowDraft.reminderMinutes} disabled={!workflowDraft.reminderEnabled} onChange={(event) => setWorkflowDraft((draft) => ({ ...draft, reminderMinutes: Number(event.target.value) }))}>
                        <option value={0}>准时</option>
                        <option value={5}>提前 5 分钟</option>
                        <option value={10}>提前 10 分钟</option>
                        <option value={30}>提前 30 分钟</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="workflow-editor-actions">
                  <button type="submit" className="icon-text-button primary-button">
                    <Save size={16} />
                    保存流程
                  </button>
                  <button type="button" className="icon-text-button" onClick={restoreDefaultWorkflows}>
                    恢复默认
                  </button>
                </div>
              </form>
            )}
          </article>

          <article className="signal-card metric-card">
            <p className="eyebrow">Notes</p>
            <strong>{notes.length}</strong>
            <span>运营备忘</span>
          </article>
        </section>

        <section className="split-grid">
          <article className="panel" id="calculator">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Margin desk</p>
                <h3>单品利润测算</h3>
              </div>
              <Calculator size={20} />
            </div>

            <div className="calculator-grid">
              {Object.entries({
                salePrice: '售价',
                cost: '采购成本',
                shipping: '头程/物流',
                fbaFee: 'FBA 费用',
                adSpend: '单件广告',
                referralRate: '佣金比例 %',
              }).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={calculator[key as keyof CalculatorState]}
                    onChange={(event) =>
                      setCalculator((current) => ({
                        ...current,
                        [key]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="result-strip">
              <div>
                <span>预估利润</span>
                <strong className={financials.profit >= 0 ? 'positive' : 'negative'}>
                  ${financials.profit.toFixed(2)}
                </strong>
              </div>
              <div>
                <span>利润率</span>
                <strong>{financials.margin.toFixed(1)}%</strong>
              </div>
              <div>
                <span>ROI</span>
                <strong>{financials.roi.toFixed(1)}%</strong>
              </div>
            </div>
          </article>

          <article className="panel compact-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Checklist</p>
                <h3>上架前检查</h3>
              </div>
              <ClipboardList size={20} />
            </div>
            {['主图是否清晰', '标题是否覆盖核心词', '五点是否写出利益点', '价格/coupon 是否同步', 'FBA 库存是否够 30 天'].map(
              (item) => (
                <label className="check-row" key={item}>
                  <input type="checkbox" />
                  <CheckCircle2 size={17} />
                  <span>{item}</span>
                </label>
              ),
            )}
          </article>
        </section>

        <section className="file-workspace" id="files">
          <article className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">GitHub vault</p>
                <h3>上传文件区</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                title="刷新私密仓库文件"
                disabled={cloudLoading}
                onClick={() => void refreshUploadedFiles()}
              >
                <Search size={17} />
              </button>
            </div>

            <input
              className="sr-only"
              ref={cloudFileInputRef}
              type="file"
              multiple
              onChange={(event) => void handleCloudFiles(event.target.files)}
            />

            <label className="upload-key-field">
              <span>上传密钥</span>
              <input
                type="password"
                placeholder="输入 Worker 上传密钥"
                value={uploadKey}
                onChange={(event) => setUploadKey(event.target.value)}
              />
            </label>

            <button
              className="upload-zone cloud-upload-zone"
              type="button"
              disabled={!uploadWorkerUrl || !uploadKey.trim() || cloudUploading}
              onClick={() => cloudFileInputRef.current?.click()}
            >
              <FileUp size={24} />
              <span>{cloudUploading ? '正在上传...' : '上传到私密 GitHub 仓库'}</span>
              <small>{cloudFileMessage}</small>
            </button>

            <div className="file-list">
              {uploadedFiles.length === 0 ? (
                <p className="empty-state">暂无文件。填写上传密钥后点击刷新，即可读取私密仓库中的文件。</p>
              ) : (
                uploadedFiles.map((file) => (
                  <div className="file-row cloud-file-row" key={file.id}>
                    <FileText size={18} />
                    <div>
                      <strong>{file.name}</strong>
                      <span>
                        {formatBytes(file.size)} · {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString('zh-CN') : '仓库文件'}
                      </span>
                      <small>{file.path}</small>
                    </div>
                    <div className="cloud-file-actions">
                      <button type="button" title="预览文件" onClick={() => void previewCloudFile(file)}>
                        <ExternalLink size={16} />
                      </button>
                      <button type="button" title="下载文件" onClick={() => void downloadCloudFile(file)}>
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="split-grid notes-section">
          <article className="panel" id="notes">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Memo stack</p>
                <h3>运营备忘录</h3>
              </div>
              <NotebookPen size={20} />
            </div>

            <form className="note-form" onSubmit={handleNoteSubmit}>
              <div className="note-form-row">
                <input
                  aria-label="备忘标题"
                  placeholder="标题"
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                />
                <input
                  aria-label="标签"
                  placeholder="标签"
                  value={noteTag}
                  onChange={(event) => setNoteTag(event.target.value)}
                />
              </div>
              <textarea
                aria-label="备忘内容"
                placeholder="记录今天调价、广告、Listing 或库存动作"
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
              />
              <label className="note-due-field">
                <span>提醒时间（可选）</span>
                <input type="datetime-local" value={noteDueAt} onChange={(event) => setNoteDueAt(event.target.value)} />
              </label>
              <button type="submit">
                <Plus size={16} />
                新增备忘
              </button>
            </form>

            <div className="note-list">
              {notes.map((note) => (
                <article className="note-card" key={note.id}>
                  <div>
                    <span>{note.tag}</span>
                    <button
                      type="button"
                      title="删除备忘"
                      onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                  {note.dueAt && <small className="note-due">提醒：{new Date(note.dueAt).toLocaleString('zh-CN')}</small>}
                </article>
              ))}
            </div>
          </article>
        </section>

        <footer className="footer-note">
          <PackageSearch size={18} />
          <span>下一步可以接入真实销售报表、广告 CSV 解析、关键词库和 Cloudflare R2 文件同步。</span>
          <Settings size={18} />
        </footer>

        {previewFile && (
          <div className="preview-backdrop" role="presentation" onClick={closePreview}>
            <section className="preview-dialog" role="dialog" aria-modal="true" aria-label={`预览 ${previewFile.name}`} onClick={(event) => event.stopPropagation()}>
              <div className="preview-heading">
                <div>
                  <p className="eyebrow">File preview</p>
                  <h3>{previewFile.name}</h3>
                </div>
                <button type="button" className="icon-button" title="关闭预览" onClick={closePreview}>
                  <X size={17} />
                </button>
              </div>
              <div className="preview-content">
                {previewFile.text !== undefined ? (
                  <pre>{previewFile.text}</pre>
                ) : previewFile.type.startsWith('image/') ? (
                  <img src={previewFile.url} alt={previewFile.name} />
                ) : previewFile.type === 'application/pdf' ? (
                  <iframe title={previewFile.name} src={previewFile.url} />
                ) : previewFile.type.startsWith('video/') ? (
                  <video controls src={previewFile.url} />
                ) : previewFile.type.startsWith('audio/') ? (
                  <audio controls src={previewFile.url} />
                ) : (
                  <p className="empty-state">这个文件类型不能在网页内预览，请关闭窗口后点击下载。</p>
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
