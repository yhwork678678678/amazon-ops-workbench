import {
  Activity,
  Archive,
  Calculator,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  LayoutDashboard,
  Link2,
  NotebookPen,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
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
}

type StoredFile = {
  id: string
  name: string
  size: number
  type: string
  addedAt: string
  blob: Blob
}

type CalculatorState = {
  salePrice: number
  cost: number
  shipping: number
  fbaFee: number
  adSpend: number
  referralRate: number
}

const STORAGE_KEYS = {
  notes: 'amazon-workbench-notes',
  calculator: 'amazon-workbench-calculator',
}

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

const quickLinks = [
  {
    title: 'Seller Central',
    desc: '后台、订单、库存、广告入口',
    href: 'https://sellercentral.amazon.com/',
    group: '核心',
  },
  {
    title: 'Amazon Ads',
    desc: '广告活动和报表',
    href: 'https://advertising.amazon.com/',
    group: '广告',
  },
  {
    title: 'FBA Revenue Calculator',
    desc: '官方 FBA 收益估算',
    href: 'https://sell.amazon.com/tools/fba-revenue-calculator',
    group: '利润',
  },
  {
    title: 'Keepa',
    desc: '价格历史和竞品跟踪',
    href: 'https://keepa.com/',
    group: '竞品',
  },
  {
    title: 'Helium 10',
    desc: '关键词、Listing、竞品工具',
    href: 'https://www.helium10.com/',
    group: '选品',
  },
  {
    title: 'Brand Analytics',
    desc: '品牌关键词与市场篮子分析',
    href: 'https://sellercentral.amazon.com/brand-analytics',
    group: '品牌',
  },
]

const workflows = [
  ['09:30', '库存与断货风险', '检查 30 天销量、可售库存、在途和补货 ETA。'],
  ['11:00', '广告预算巡检', '找花费突增、ACOS 失控、点击多无转化的活动。'],
  ['14:30', 'Listing 质量', '检查差评、QA、图片、价格、coupon 和竞品变化。'],
  ['17:30', '复盘记录', '把今天调整动作写进备忘，方便明天追踪结果。'],
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

function openFileDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('amazon-workbench-file-vault', 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getStoredFiles() {
  const db = await openFileDatabase()
  return new Promise<StoredFile[]>((resolve, reject) => {
    const transaction = db.transaction('files', 'readonly')
    const request = transaction.objectStore('files').getAll()

    request.onsuccess = () => resolve(request.result as StoredFile[])
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

async function putStoredFile(file: File) {
  const db = await openFileDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite')
    const storedFile: StoredFile = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      addedAt: new Date().toISOString(),
      blob: file,
    }

    transaction.objectStore('files').put(storedFile)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

async function removeStoredFile(id: string) {
  const db = await openFileDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('files', 'readwrite')
    transaction.objectStore('files').delete(id)
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function openExternal(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer')
}

export function App() {
  const [notes, setNotes] = useState<Note[]>(readStoredNotes)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [noteTag, setNoteTag] = useState('运营')
  const [files, setFiles] = useState<StoredFile[]>([])
  const [fileMessage, setFileMessage] = useState('文件只保存在当前浏览器，不会上传到 GitHub。')
  const [calculator, setCalculator] = useState<CalculatorState>(readStoredCalculator)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes))
  }, [notes])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.calculator, JSON.stringify(calculator))
  }, [calculator])

  useEffect(() => {
    getStoredFiles()
      .then((items) => setFiles(items.sort((a, b) => b.addedAt.localeCompare(a.addedAt))))
      .catch(() => setFileMessage('当前浏览器不支持本地文件库，上传区暂不可用。'))
  }, [])

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
    }

    setNotes((current) => [nextNote, ...current])
    setNoteTitle('')
    setNoteBody('')
    setNoteTag('运营')
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return

    setFileMessage('正在写入浏览器本地文件库...')
    await Promise.all(Array.from(fileList).map((file) => putStoredFile(file)))
    const nextFiles = await getStoredFiles()
    setFiles(nextFiles.sort((a, b) => b.addedAt.localeCompare(a.addedAt)))
    setFileMessage(`${fileList.length} 个文件已保存到当前浏览器。`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function downloadFile(file: StoredFile) {
    const url = URL.createObjectURL(file.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  }

  async function deleteFile(id: string) {
    await removeStoredFile(id)
    setFiles((current) => current.filter((file) => file.id !== id))
    setFileMessage('文件已从当前浏览器移除。')
  }

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
          <a href="#tools">
            <Link2 size={18} />
            常用工具
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

        <div className="privacy-note">
          <ShieldCheck size={18} />
          <span>静态网页优先，本地数据优先；运营文件默认不离开浏览器。</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Daily operating desk</p>
            <h2>今天的重点、工具和临时资料都放在一个页面里。</h2>
          </div>
          <div className="topbar-actions">
            <button type="button" onClick={() => openExternal('https://sellercentral.amazon.com/')}>
              <ExternalLink size={16} />
              打开后台
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={16} />
              添加文件
            </button>
          </div>
        </header>

        <section className="overview-grid" id="overview" aria-label="运营概览">
          <article className="signal-card span-2">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Control loop</p>
                <h3>日常巡检流程</h3>
              </div>
              <Activity size={20} />
            </div>
            <div className="timeline">
              {workflows.map(([time, title, body]) => (
                <div className="timeline-row" key={time}>
                  <span>{time}</span>
                  <strong>{title}</strong>
                  <p>{body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="signal-card metric-card">
            <p className="eyebrow">Files</p>
            <strong>{files.length}</strong>
            <span>本地临时文件</span>
          </article>

          <article className="signal-card metric-card">
            <p className="eyebrow">Notes</p>
            <strong>{notes.length}</strong>
            <span>运营备忘</span>
          </article>
        </section>

        <section className="panel" id="tools">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Tool bay</p>
              <h3>亚马逊运营常用入口</h3>
            </div>
            <Search size={20} />
          </div>
          <div className="tool-grid">
            {quickLinks.map((tool) => (
              <button className="tool-tile" type="button" key={tool.href} onClick={() => openExternal(tool.href)}>
                <span className="tool-group">{tool.group}</span>
                <strong>{tool.title}</strong>
                <small>{tool.desc}</small>
                <ExternalLink size={16} />
              </button>
            ))}
          </div>
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

        <section className="split-grid">
          <article className="panel" id="files">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Local vault</p>
                <h3>临时文件区</h3>
              </div>
              <UploadCloud size={20} />
            </div>

            <input
              className="sr-only"
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <button className="upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={24} />
              <span>选择文件保存到当前浏览器</span>
              <small>{fileMessage}</small>
            </button>

            <div className="file-list">
              {files.length === 0 ? (
                <p className="empty-state">还没有文件。适合临时放广告报表、竞品截图、Listing 草稿。</p>
              ) : (
                files.map((file) => (
                  <div className="file-row" key={file.id}>
                    <FileText size={18} />
                    <div>
                      <strong>{file.name}</strong>
                      <span>
                        {formatBytes(file.size)} · {new Date(file.addedAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <button type="button" title="下载" onClick={() => downloadFile(file)}>
                      <Download size={16} />
                    </button>
                    <button type="button" title="删除" onClick={() => void deleteFile(file.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </article>

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
      </section>
    </main>
  )
}
