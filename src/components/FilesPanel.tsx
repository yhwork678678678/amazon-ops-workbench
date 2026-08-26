import { Download, ExternalLink, FileText, FileUp, KeyRound, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants'
import type { PreviewFile, UploadedFile } from '../types'

const uploadWorkerUrl = import.meta.env.VITE_UPLOAD_WORKER_URL as string | undefined

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
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

export function FilesPanel() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(readStoredUploadedFiles)
  const [uploadKey, setUploadKey] = useState(readStoredUploadKey)
  // 已有密钥时默认收起密钥栏，避免常驻占用整行
  const [keyFieldOpen, setKeyFieldOpen] = useState(() => !readStoredUploadKey())
  const [cloudFileMessage, setCloudFileMessage] = useState(
    uploadWorkerUrl ? '填写上传密钥后，即可上传到私密 GitHub 文件仓库。' : '需要先配置 VITE_UPLOAD_WORKER_URL 才能上传。',
  )
  const [cloudUploading, setCloudUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [cloudLoading, setCloudLoading] = useState(false)
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null)
  const cloudFileInputRef = useRef<HTMLInputElement>(null)
  const previewCloseRef = useRef<HTMLButtonElement>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

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

  // 启动时若已保存上传密钥，自动读取私密仓库文件列表
  useEffect(() => {
    if (uploadKey.trim()) void refreshUploadedFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 预览打开时聚焦关闭按钮并支持 Esc 关闭
  useEffect(() => {
    if (!previewFile) return
    previewCloseRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFile])

  async function uploadCloudFile(file: File): Promise<UploadedFile> {
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
      let message = `上传服务返回错误（HTTP ${response.status}）。`
      try {
        const payload = await response.json() as { error?: string }
        if (payload?.error) message = payload.error
      } catch {
        // 非 JSON 错误体，保留上面的兜底文案
      }
      throw new Error(message)
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
      const payload = await checkedResponse.json() as { files: Omit<UploadedFile, 'id'>[]; truncated?: boolean }
      const filesFromRepository = payload.files.map((file) => ({ id: crypto.randomUUID(), ...file }))
      setUploadedFiles(filesFromRepository)
      setCloudFileMessage(
        payload.truncated
          ? `已读取 ${filesFromRepository.length} 个私密仓库文件（文件较多，仅显示最近的部分文件）。`
          : `已读取 ${filesFromRepository.length} 个私密仓库文件。`,
      )
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '读取文件失败，请稍后重试。')
    } finally {
      setCloudLoading(false)
    }
  }

  async function handleCloudFiles(fileList: FileList | null) {
    if (!fileList?.length || cloudUploading) return

    setCloudUploading(true)
    setUploadProgress({ done: 0, total: fileList.length })
    setCloudFileMessage(`正在上传 ${fileList.length} 个文件到私密 GitHub 仓库...`)

    try {
      // 用 allSettled 避免单个文件失败导致其他成功文件的结果丢失
      const results = await Promise.allSettled(
        Array.from(fileList).map(async (file) => {
          const uploadedFile = await uploadCloudFile(file)
          setUploadProgress((progress) => (progress ? { ...progress, done: progress.done + 1 } : progress))
          return uploadedFile
        }),
      )
      const uploaded = results
        .filter((result): result is PromiseFulfilledResult<UploadedFile> => result.status === 'fulfilled')
        .map((result) => result.value)
      const failed = results.length - uploaded.length

      if (uploaded.length > 0) {
        setUploadedFiles((current) => [...uploaded, ...current])
      }
      setCloudFileMessage(
        failed > 0
          ? `${uploaded.length} 个文件已上传，${failed} 个失败（失败的文件请稍后重试）。`
          : `${uploaded.length} 个文件已上传到私密 GitHub 仓库。`,
      )
    } catch (error) {
      setCloudFileMessage(error instanceof Error ? error.message : '上传失败，请稍后重试。')
    } finally {
      setCloudUploading(false)
      setUploadProgress(null)
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
      lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
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
    lastFocusedRef.current?.focus()
  }

  return (
    <section className="file-workspace" id="files">
      <article className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GitHub vault</p>
            <h3>上传文件区</h3>
          </div>
          <div className="section-actions">
            <button
              type="button"
              className="icon-text-button"
              aria-expanded={keyFieldOpen}
              onClick={() => setKeyFieldOpen((open) => !open)}
            >
              <KeyRound size={15} />
              {keyFieldOpen ? '收起密钥' : '上传密钥'}
            </button>
            <button
              type="button"
              className="icon-button"
              title="刷新私密仓库文件"
              aria-label="刷新私密仓库文件"
              disabled={cloudLoading}
              onClick={() => void refreshUploadedFiles()}
            >
              <Search size={17} />
            </button>
          </div>
        </div>

        <input
          className="sr-only"
          ref={cloudFileInputRef}
          type="file"
          multiple
          onChange={(event) => void handleCloudFiles(event.target.files)}
        />

        {keyFieldOpen && (
          <label className="upload-key-field">
            <span>上传密钥</span>
            <input
              type="password"
              placeholder="输入 Worker 上传密钥"
              value={uploadKey}
              onChange={(event) => setUploadKey(event.target.value)}
            />
          </label>
        )}

        <button
          className="upload-zone cloud-upload-zone"
          type="button"
          disabled={!uploadWorkerUrl || !uploadKey.trim() || cloudUploading}
          onClick={() => cloudFileInputRef.current?.click()}
        >
          <FileUp size={24} />
          <span className="upload-zone-label">
            {cloudUploading && uploadProgress ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>
                  正在上传 {uploadProgress.done}/{uploadProgress.total}
                </span>
              </>
            ) : (
              '上传到私密 GitHub 仓库'
            )}
          </span>
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
                  <button type="button" title="预览文件" aria-label={`预览 ${file.name}`} onClick={() => void previewCloudFile(file)}>
                    <ExternalLink size={16} />
                  </button>
                  <button type="button" title="下载文件" aria-label={`下载 ${file.name}`} onClick={() => void downloadCloudFile(file)}>
                    <Download size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      {previewFile && (
        <div className="preview-backdrop" role="presentation" onClick={closePreview}>
          <section className="preview-dialog" role="dialog" aria-modal="true" aria-label={`预览 ${previewFile.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="preview-heading">
              <div>
                <p className="eyebrow">File preview</p>
                <h3>{previewFile.name}</h3>
              </div>
              <button ref={previewCloseRef} type="button" className="icon-button" title="关闭预览" aria-label="关闭预览" onClick={closePreview}>
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
  )
}
