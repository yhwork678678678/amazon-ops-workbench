import { NotebookPen, Pencil, Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { Note } from '../types'

type NotesPanelProps = {
  notes: Note[]
  noteTitle: string
  noteBody: string
  noteTag: string
  noteCreatedAt: string
  noteDueAt: string
  onTitleChange: Dispatch<SetStateAction<string>>
  onBodyChange: Dispatch<SetStateAction<string>>
  onTagChange: Dispatch<SetStateAction<string>>
  onCreatedAtChange: Dispatch<SetStateAction<string>>
  onDueAtChange: Dispatch<SetStateAction<string>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDelete: (id: string) => void
  editingNoteId: string | null
  onEdit: (note: Note) => void
  onCancelEdit: () => void
}

function formatNoteTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function localDayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(key: string) {
  if (key === 'unknown') return '日期未知'

  const now = new Date()
  if (key === localDayKey(now)) return '今天'

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (key === localDayKey(yesterday)) return '昨天'

  const [year, month, day] = key.split('-').map(Number)
  return year === now.getFullYear() ? `${month}月${day}日` : `${year}年${month}月${day}日`
}

// 常见运营标签按语义配色，不认识的标签用默认青绿色
const TAG_CLASSES: Record<string, string> = {
  广告: 'tag-ad',
  Listing: 'tag-listing',
  库存: 'tag-inventory',
  调价: 'tag-pricing',
  复盘: 'tag-review',
}

type NoteGroup = { key: string; label: string; notes: Note[] }

export function NotesPanel({
  notes,
  noteTitle,
  noteBody,
  noteTag,
  noteCreatedAt,
  noteDueAt,
  onTitleChange,
  onBodyChange,
  onTagChange,
  onCreatedAtChange,
  onDueAtChange,
  onSubmit,
  onDelete,
  editingNoteId,
  onEdit,
  onCancelEdit,
}: NotesPanelProps) {
  // 按创建时间倒序排列并分天分组，仅在备忘列表变化时重新计算
  const noteGroups = useMemo(() => {
    const sorted = [...notes].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    const groups: NoteGroup[] = []
    for (const note of sorted) {
      const date = new Date(note.createdAt)
      const key = Number.isNaN(date.getTime()) ? 'unknown' : localDayKey(date)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.notes.push(note)
      } else {
        groups.push({ key, label: formatDayLabel(key), notes: [note] })
      }
    }
    return groups
  }, [notes])

  return (
    <section className="split-grid notes-section">
      <article className="panel" id="notes">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Memo stack</p>
            <h3>运营备忘录</h3>
          </div>
          <NotebookPen size={20} />
        </div>

        <form className="note-form note-composer" onSubmit={onSubmit}>
          {editingNoteId && <div className="note-editing-state">正在编辑备忘</div>}
          <div className="note-form-row">
            <input
              aria-label="备忘标题"
              placeholder="标题"
              value={noteTitle}
              onChange={(event) => onTitleChange(event.target.value)}
            />
            <input
              aria-label="标签"
              placeholder="标签"
              value={noteTag}
              onChange={(event) => onTagChange(event.target.value)}
            />
          </div>
          <textarea
            aria-label="备忘内容"
            placeholder="记录今天调价、广告、Listing 或库存动作"
            value={noteBody}
            onChange={(event) => onBodyChange(event.target.value)}
          />
          <div className="note-composer-footer">
            <div className="note-time-fields">
              <label>
                <span>创建时间</span>
                <input type="datetime-local" value={noteCreatedAt} onChange={(event) => onCreatedAtChange(event.target.value)} />
              </label>
              <label>
                <span>提醒时间（可选）</span>
                <input type="datetime-local" value={noteDueAt} onChange={(event) => onDueAtChange(event.target.value)} />
              </label>
            </div>
            <div className="note-composer-actions">
              <button type="submit">
                {editingNoteId ? <Pencil size={16} /> : <Plus size={16} />}
                {editingNoteId ? '保存修改' : '新增备忘'}
              </button>
              {editingNoteId && (
                <button type="button" className="icon-text-button" onClick={onCancelEdit}>
                  取消编辑
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="note-timeline">
          {noteGroups.map((group) => (
            <div className="note-day-group" key={group.key}>
              <div className="note-day-label">{group.label}</div>
              {group.notes.map((note) => {
                const time = formatNoteTime(note.createdAt)

                return (
                  <article className="note-entry" key={note.id}>
                    <div className="note-date" aria-label={`记录于 ${group.label} ${time}`}>
                      <strong>{time}</strong>
                    </div>
                    <div className="note-marker" aria-hidden="true" />
                    <div className="note-card">
                      <div>
                        <span className={`note-tag ${TAG_CLASSES[note.tag] || ''}`}>{note.tag}</span>
                        <div className="note-card-actions">
                          <button type="button" title="编辑备忘" aria-label={`编辑备忘 ${note.title}`} onClick={() => onEdit(note)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" title="删除备忘" aria-label={`删除备忘 ${note.title}`} onClick={() => onDelete(note.id)}>
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                      <strong>{note.title}</strong>
                      <p>{note.body}</p>
                      {note.dueAt && <small className="note-due">提醒：{new Date(note.dueAt).toLocaleString('zh-CN')}</small>}
                    </div>
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}
