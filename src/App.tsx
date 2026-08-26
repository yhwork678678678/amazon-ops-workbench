import {
  Archive,
  Bell,
  Calculator,
  LayoutDashboard,
  NotebookPen,
  PackageSearch,
  Settings,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { CalculatorPanel } from './components/CalculatorPanel'
import { FilesPanel } from './components/FilesPanel'
import { NotesPanel } from './components/NotesPanel'
import { OverviewPanel } from './components/OverviewPanel'
import { STORAGE_KEYS } from './constants'
import type { CalculatorState, Note, Workflow } from './types'

// 删除/恢复操作的可撤销记录，5 秒内可以恢复
type UndoEntry =
  | { kind: 'note'; note: Note; index: number }
  | { kind: 'workflow'; workflow: Workflow; index: number }
  | { kind: 'workflows'; workflows: Workflow[] }

// 示例备忘使用固定时间戳，避免首次打开或数据损坏回退时显示"刚刚创建"
const defaultNotes: Note[] = [
  {
    id: 'note-1',
    title: '今天先看广告异常',
    body: '先筛 ACOS 高于 35% 的广告组，再看转化率低但点击多的关键词。',
    tag: '广告',
    createdAt: '2026-08-05T09:00:00.000Z',
  },
  {
    id: 'note-2',
    title: '新品页检查',
    body: '主图、五点、A+、QA、coupon、库存、配送时效逐项过一遍。',
    tag: 'Listing',
    createdAt: '2026-08-05T10:30:00.000Z',
  },
]

const defaultWorkflows: Workflow[] = [
  { id: 'workflow-1', time: '09:30', title: '库存与断货风险', body: '检查 30 天销量、可售库存、在途和补货 ETA。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-2', time: '11:00', title: '广告预算巡检', body: '找花费突增、ACOS 失控、点击多无转化的活动。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-3', time: '14:30', title: 'Listing 质量', body: '检查差评、QA、图片、价格、coupon 和竞品变化。', reminderEnabled: true, reminderMinutes: 10 },
  { id: 'workflow-4', time: '17:30', title: '复盘记录', body: '把今天调整动作写进备忘，方便明天追踪结果。', reminderEnabled: true, reminderMinutes: 10 },
]

const defaultCalculator: CalculatorState = {
  salePrice: '29.99',
  cost: '7.2',
  shipping: '2.1',
  fbaFee: '5.3',
  adSpend: '3.5',
  referralRate: '15',
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

function readStoredCalculator(): CalculatorState {
  const raw = localStorage.getItem(STORAGE_KEYS.calculator)
  if (!raw) return defaultCalculator

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next = { ...defaultCalculator }
    // 兼容旧版本保存的数字类型数据
    for (const key of Object.keys(defaultCalculator) as (keyof CalculatorState)[]) {
      const value = parsed[key]
      if (typeof value === 'number' || typeof value === 'string') next[key] = String(value)
    }
    return next
  } catch {
    return defaultCalculator
  }
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

function toDateTimeLocal(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toISOStringOrNow(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

// 提醒去重键使用本地日期（此前用 UTC 日期，跨时区边界时同一天可能重复提醒）
function toLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function App() {
  const [notes, setNotes] = useState<Note[]>(readStoredNotes)
  const [workflows, setWorkflows] = useState<Workflow[]>(readStoredWorkflows)
  const [calculator, setCalculator] = useState<CalculatorState>(readStoredCalculator)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteTag, setNoteTag] = useState('运营')
  const [noteCreatedAt, setNoteCreatedAt] = useState(() => toDateTimeLocal(new Date()))
  const [noteDueAt, setNoteDueAt] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [clock, setClock] = useState(() => new Date())
  const [reminderMessage, setReminderMessage] = useState('')
  const [activeSection, setActiveSection] = useState('notes')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null)
  const undoTimeoutRef = useRef<number | null>(null)

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
    const timer = window.setInterval(() => setClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // 提醒消息显示 10 分钟后自动清空，避免一直挂在顶部
  useEffect(() => {
    if (!reminderMessage) return
    const timer = window.setTimeout(() => setReminderMessage(''), 10 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [reminderMessage])

  useEffect(() => {
    const sectionIds = ['notes', 'overview', 'calculator', 'files']
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.2, 0.5] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
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

      const reminderKey = `amazon-workbench-reminded:${item.id}:${toLocalDateKey(item.dueAt)}`
      if (sessionStorage.getItem(reminderKey)) return
      sessionStorage.setItem(reminderKey, '1')
      const message = `${item.source}提醒：${item.title}`
      setReminderMessage(message)
      if (notificationPermission === 'granted') new Notification('亚马逊运营工作台', { body: message })
    })
  }, [clock, notes, notificationPermission, pendingReminders, workflows])

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!noteTitle.trim() && !noteBody.trim()) return

    const nextNote: Note = {
      id: editingNoteId ?? crypto.randomUUID(),
      title: noteTitle.trim() || '未命名备忘',
      body: noteBody.trim(),
      tag: noteTag.trim() || '运营',
      createdAt: toISOStringOrNow(noteCreatedAt),
      dueAt: noteDueAt || undefined,
    }

    // 编辑后清除当天的已提醒标记，让修改过的提醒时间当天可以重新触发
    if (nextNote.dueAt) {
      sessionStorage.removeItem(`amazon-workbench-reminded:${nextNote.id}:${toLocalDateKey(new Date(nextNote.dueAt))}`)
    }

    setNotes((current) => editingNoteId
      ? current.map((note) => note.id === editingNoteId ? nextNote : note)
      : [nextNote, ...current])
    setEditingNoteId(null)
    setNoteTitle('')
    setNoteBody('')
    setNoteTag('运营')
    setNoteCreatedAt(toDateTimeLocal(new Date()))
    setNoteDueAt('')
  }

  function startNoteEdit(note: Note) {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteBody(note.body)
    setNoteTag(note.tag)
    setNoteCreatedAt(toDateTimeLocal(note.createdAt))
    setNoteDueAt(note.dueAt || '')
    document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelNoteEdit() {
    setEditingNoteId(null)
    setNoteTitle('')
    setNoteBody('')
    setNoteTag('运营')
    setNoteCreatedAt(toDateTimeLocal(new Date()))
    setNoteDueAt('')
  }

  function deleteNote(id: string) {
    const index = notes.findIndex((item) => item.id === id)
    if (index < 0) return
    scheduleUndo({ kind: 'note', note: notes[index], index })
    setNotes((current) => current.filter((item) => item.id !== id))
    if (editingNoteId === id) cancelNoteEdit()
  }

  function saveWorkflow(workflow: Workflow) {
    setWorkflows((current) =>
      current.some((entry) => entry.id === workflow.id)
        ? current.map((entry) => (entry.id === workflow.id ? workflow : entry))
        : [...current, workflow],
    )
  }

  function deleteWorkflow(id: string) {
    const index = workflows.findIndex((entry) => entry.id === id)
    if (index < 0) return
    scheduleUndo({ kind: 'workflow', workflow: workflows[index], index })
    setWorkflows((current) => current.filter((entry) => entry.id !== id))
  }

  function restoreDefaultWorkflows() {
    if (workflows.length > 0) scheduleUndo({ kind: 'workflows', workflows })
    setWorkflows(defaultWorkflows)
  }

  function scheduleUndo(entry: UndoEntry) {
    if (undoTimeoutRef.current !== null) window.clearTimeout(undoTimeoutRef.current)
    setUndoEntry(entry)
    undoTimeoutRef.current = window.setTimeout(() => {
      setUndoEntry(null)
      undoTimeoutRef.current = null
    }, 5000)
  }

  function dismissUndo() {
    if (undoTimeoutRef.current !== null) window.clearTimeout(undoTimeoutRef.current)
    undoTimeoutRef.current = null
    setUndoEntry(null)
  }

  function performUndo() {
    const entry = undoEntry
    dismissUndo()
    if (!entry) return

    if (entry.kind === 'note') {
      setNotes((current) => [...current.slice(0, entry.index), entry.note, ...current.slice(entry.index)])
    } else if (entry.kind === 'workflow') {
      setWorkflows((current) => [...current.slice(0, entry.index), entry.workflow, ...current.slice(entry.index)])
    } else {
      setWorkflows(entry.workflows)
    }
  }

  function handleCalculatorChange(key: keyof CalculatorState, value: string) {
    setCalculator((current) => ({ ...current, [key]: value }))
  }

  async function enableNotifications() {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  return (
    <main className="shell">
      <aside className="sidebar" aria-label="工作台导航">
        <div className="brand-block">
          <h1>工作台</h1>
        </div>

        <nav className="nav-list">
          <a className={activeSection === 'notes' ? 'active' : ''} href="#notes" onClick={() => setActiveSection('notes')}>
            <NotebookPen size={18} />
            备忘录
          </a>
          <a className={activeSection === 'overview' ? 'active' : ''} href="#overview" onClick={() => setActiveSection('overview')}>
            <LayoutDashboard size={18} />
            概览
          </a>
          <a className={activeSection === 'calculator' ? 'active' : ''} href="#calculator" onClick={() => setActiveSection('calculator')}>
            <Calculator size={18} />
            利润测算
          </a>
          <a className={activeSection === 'files' ? 'active' : ''} href="#files" onClick={() => setActiveSection('files')}>
            <Archive size={18} />
            文件区
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
            {reminderMessage && (
              <button
                type="button"
                className="reminder-close"
                aria-label="关闭提醒消息"
                onClick={() => setReminderMessage('')}
              >
                <X size={14} />
              </button>
            )}
          </section>
        )}

        <OverviewPanel
          workflows={workflows}
          onSave={saveWorkflow}
          onDelete={deleteWorkflow}
          onRestoreDefaults={restoreDefaultWorkflows}
        />

        <CalculatorPanel calculator={calculator} onChange={handleCalculatorChange} />

        <FilesPanel />

        <NotesPanel
          notes={notes}
          noteTitle={noteTitle}
          noteBody={noteBody}
          noteTag={noteTag}
          noteCreatedAt={noteCreatedAt}
          noteDueAt={noteDueAt}
          onTitleChange={setNoteTitle}
          onBodyChange={setNoteBody}
          onTagChange={setNoteTag}
          onCreatedAtChange={setNoteCreatedAt}
          onDueAtChange={setNoteDueAt}
          onSubmit={handleNoteSubmit}
          onDelete={deleteNote}
          editingNoteId={editingNoteId}
          onEdit={startNoteEdit}
          onCancelEdit={cancelNoteEdit}
        />

        <footer className="footer-note">
          <PackageSearch size={18} />
          <span>下一步可以接入真实销售报表、广告 CSV 解析、关键词库和 Cloudflare R2 文件同步。</span>
          <Settings size={18} />
        </footer>

        {undoEntry && (
          <div className="undo-toast" role="status">
            <span>
              {undoEntry.kind === 'note'
                ? '备忘已删除'
                : undoEntry.kind === 'workflow'
                  ? '巡检流程已删除'
                  : '已恢复默认巡检流程'}
            </span>
            <button type="button" className="undo-button" onClick={performUndo}>
              撤销
            </button>
            <button type="button" className="icon-button undo-close" aria-label="关闭提示" onClick={dismissUndo}>
              <X size={14} />
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
