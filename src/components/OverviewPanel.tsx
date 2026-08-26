import { Activity, Bell, Pencil, Plus, Save, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Workflow } from '../types'

type WorkflowDraft = {
  time: string
  title: string
  body: string
  reminderEnabled: boolean
  reminderMinutes: number
}

type OverviewPanelProps = {
  workflows: Workflow[]
  onSave: (workflow: Workflow) => void
  onDelete: (id: string) => void
  onRestoreDefaults: () => void
}

const emptyDraft: WorkflowDraft = { time: '', title: '', body: '', reminderEnabled: true, reminderMinutes: 10 }

export function OverviewPanel({ workflows, onSave, onDelete, onRestoreDefaults }: OverviewPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<WorkflowDraft>({ ...emptyDraft })

  function openEditor(workflow?: Workflow) {
    setEditingId(workflow?.id ?? null)
    setDraft(
      workflow
        ? {
            time: workflow.time,
            title: workflow.title,
            body: workflow.body,
            reminderEnabled: workflow.reminderEnabled,
            reminderMinutes: workflow.reminderMinutes,
          }
        : { ...emptyDraft },
    )
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditingId(null)
    setDraft({ ...emptyDraft })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const time = draft.time.trim()
    const title = draft.title.trim()
    const body = draft.body.trim()
    if (!time || !title || !body) return

    const nextWorkflow: Workflow = {
      id: editingId ?? crypto.randomUUID(),
      time,
      title,
      body,
      reminderEnabled: draft.reminderEnabled,
      reminderMinutes: draft.reminderMinutes,
    }

    onSave(nextWorkflow)
    closeEditor()
  }

  function handleDelete(id: string) {
    onDelete(id)
    if (editingId === id) closeEditor()
  }

  function handleRestoreDefaults() {
    onRestoreDefaults()
    closeEditor()
  }

  return (
    <section className="overview-grid" id="overview" aria-label="运营概览">
      <article className="signal-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Control loop</p>
            <h3>日常巡检流程</h3>
          </div>
          <div className="section-actions">
            <button type="button" className="icon-text-button" onClick={() => openEditor()}>
              <Plus size={16} />
              新增流程
            </button>
            <Activity size={20} />
          </div>
        </div>
        <div className="timeline">
          {workflows.length === 0 ? (
            <p className="empty-state">还没有巡检流程，请新增一条或恢复默认流程。</p>
          ) : (
            workflows.map((workflow) => (
              <div className={`timeline-row ${editingId === workflow.id ? 'editing' : ''}`} key={workflow.id}>
                <span className="timeline-time">
                  <span>{workflow.time}</span>
                  {workflow.reminderEnabled && (
                    <small className="workflow-reminder-badge">
                      <Bell size={11} />
                      {workflow.reminderMinutes > 0 ? `提前${workflow.reminderMinutes}分` : '准时'}
                    </small>
                  )}
                </span>
                <strong>{workflow.title}</strong>
                <p>{workflow.body}</p>
                <div className="timeline-actions">
                  <button
                    type="button"
                    className="icon-button"
                    title="编辑"
                    aria-label={`编辑 ${workflow.title}`}
                    onClick={() => openEditor(workflow)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    title="删除"
                    aria-label={`删除 ${workflow.title}`}
                    onClick={() => handleDelete(workflow.id)}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {editorOpen && (
          <form className="workflow-editor" onSubmit={handleSubmit}>
            <div className="workflow-editor-heading">
              <strong>{editingId ? '编辑巡检流程' : '新增巡检流程'}</strong>
              <button type="button" className="icon-button" title="关闭编辑" aria-label="关闭编辑" onClick={closeEditor}>
                <X size={16} />
              </button>
            </div>
            <div className="workflow-editor-fields">
              <label>
                <span>时间</span>
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))}
                />
              </label>
              <label>
                <span>流程名称</span>
                <input
                  type="text"
                  placeholder="例如 库存与断货风险"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
              <label className="workflow-body-field">
                <span>检查说明</span>
                <textarea
                  placeholder="写下这一步要检查的内容"
                  value={draft.body}
                  onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                />
              </label>
              <div className="workflow-reminder-field">
                <span>提醒设置</span>
                <div className="workflow-reminder-controls">
                  <label className="toggle-row">
                    <input
                      type="checkbox"
                      checked={draft.reminderEnabled}
                      onChange={(event) => setDraft((current) => ({ ...current, reminderEnabled: event.target.checked }))}
                    />
                    <span>开启提醒</span>
                  </label>
                  <select
                    value={draft.reminderMinutes}
                    disabled={!draft.reminderEnabled}
                    onChange={(event) => setDraft((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
                  >
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
              <button type="button" className="icon-text-button" onClick={handleRestoreDefaults}>
                恢复默认
              </button>
            </div>
          </form>
        )}
      </article>
    </section>
  )
}
