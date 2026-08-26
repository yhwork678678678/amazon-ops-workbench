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

function formatNoteDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { day: '--/--', time: '--:--' }

  return {
    day: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
}

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
  // 按创建时间倒序排列，仅在备忘列表变化时重新排序
  const timelineNotes = useMemo(
    () =>
      [...notes].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [notes],
  )

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
          {timelineNotes.map((note) => {
            const date = formatNoteDate(note.createdAt)

            return (
              <article className="note-entry" key={note.id}>
                <div className="note-date" aria-label={`记录于 ${date.day} ${date.time}`}>
                  <strong>{date.day}</strong>
                  <span>{date.time}</span>
                </div>
                <div className="note-marker" aria-hidden="true" />
                <div className="note-card">
                  <div>
                    <span>{note.tag}</span>
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
      </article>
    </section>
  )
}
