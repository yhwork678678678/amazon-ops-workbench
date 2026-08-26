const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
}

const MIME_TYPES = {
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = new Set([
    env.ALLOWED_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ])

  return {
    'access-control-allow-origin': allowedOrigins.has(origin) ? origin : env.ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-upload-key',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function jsonResponse(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(request, env),
    },
  })
}

function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|#%{}^~[\]`;\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'uploaded-file'
}

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function fileTypeFromPath(path) {
  const dotIndex = path.lastIndexOf('.')
  const extension = dotIndex >= 0 ? path.slice(dotIndex).toLowerCase() : ''
  return MIME_TYPES[extension] || 'application/octet-stream'
}

function isSafeUploadPath(path, env) {
  return path.startsWith(`${env.UPLOAD_DIR}/`) && !path.includes('..') && !path.includes('\\')
}

function githubHeaders(env, accept = 'application/vnd.github+json') {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept,
    'user-agent': 'amazon-ops-workbench-upload-worker',
    'x-github-api-version': '2022-11-28',
  }
}

function buildUploadPath(env, originalName) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const safeName = sanitizeFileName(originalName)

  return `${env.UPLOAD_DIR}/${year}-${month}/${day}/${year}-${month}-${day}-${safeName}`
}

async function pathExists(env, path) {
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`
  try {
    const response = await fetch(endpoint, { headers: githubHeaders(env) })
    if (response.ok) return true
    // 404 表示不存在；其他错误交给后续 PUT 返回真实错误
    return false
  } catch {
    return false
  }
}

function withSequence(path, sequence) {
  const lastSlash = path.lastIndexOf('/')
  const dotIndex = path.lastIndexOf('.')
  return dotIndex > lastSlash
    ? `${path.slice(0, dotIndex)}-${sequence}${path.slice(dotIndex)}`
    : `${path}-${sequence}`
}

async function resolveAvailablePath(env, basePath) {
  if (!(await pathExists(env, basePath))) return basePath

  for (let sequence = 2; sequence <= 99; sequence += 1) {
    const candidate = withSequence(basePath, sequence)
    if (!(await pathExists(env, candidate))) return candidate
  }

  return withSequence(basePath, Date.now())
}

async function uploadToGitHub(env, file, content) {
  const path = await resolveAvailablePath(env, buildUploadPath(env, file.name))
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      ...githubHeaders(env),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      branch: env.GITHUB_BRANCH,
      message: `Upload ${file.name}`,
      content,
    }),
  })

  const result = await response.json()
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: result?.message || 'GitHub upload failed',
    }
  }

  return {
    ok: true,
    path,
    htmlUrl: result.content?.html_url,
    commitUrl: result.commit?.html_url,
    sha: result.content?.sha,
  }
}

async function listGitHubFiles(env) {
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/git/trees/${encodeURIComponent(env.GITHUB_BRANCH)}?recursive=1`
  const response = await fetch(endpoint, { headers: githubHeaders(env) })
  const result = await response.json()

  if (!response.ok) {
    return { ok: false, status: response.status, message: result?.message || 'Unable to list files.' }
  }

  const files = (result.tree || [])
    .filter((entry) => entry.type === 'blob' && isSafeUploadPath(entry.path, env))
    .map((entry) => ({
      name: entry.path.split('/').pop() || entry.path,
      path: entry.path,
      size: entry.size || 0,
      type: fileTypeFromPath(entry.path),
      uploadedAt: null,
      sha: entry.sha,
    }))
    .sort((left, right) => right.path.localeCompare(left.path))

  const maxListed = Number(env.MAX_LISTED_FILES || 500)
  const truncated = files.length > maxListed

  return { ok: true, files: files.slice(0, maxListed), truncated }
}

async function getGitHubFile(env, path) {
  if (!isSafeUploadPath(path, env)) {
    return { ok: false, status: 400, message: 'Invalid file path.' }
  }

  // 用 raw 媒体类型直接取文件原始内容，避免 Contents API 对超过 1MB 文件返回 403
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`
  const response = await fetch(endpoint, { headers: githubHeaders(env, 'application/vnd.github.raw') })

  if (response.ok) {
    const body = await response.arrayBuffer()
    return {
      ok: true,
      name: path.split('/').pop() || path,
      path,
      size: body.byteLength,
      type: fileTypeFromPath(path),
      body: new Uint8Array(body),
    }
  }

  let message = 'Unable to read file.'
  try {
    const payload = await response.json()
    if (payload && typeof payload.message === 'string') message = payload.message
  } catch {
    // 非 JSON 错误体，保留默认信息
  }

  return { ok: false, status: response.status || 404, message }
}

function fileResponse(request, env, file, download) {
  const headers = {
    'content-type': file.type,
    'content-length': String(file.body.byteLength),
    'cache-control': 'private, no-store',
    ...corsHeaders(request, env),
    'content-disposition': `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(file.name)}"`,
  }
  return new Response(file.body, { status: 200, headers })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (!env.GITHUB_TOKEN || !env.UPLOAD_KEY) {
      return jsonResponse(request, env, { error: 'Worker secrets are not configured.' }, 500)
    }

    if (request.headers.get('x-upload-key') !== env.UPLOAD_KEY) {
      return jsonResponse(request, env, { error: 'Upload key is invalid.' }, 401)
    }

    if (request.method === 'GET') {
      const url = new URL(request.url)
      const action = url.searchParams.get('action') || 'list'

      if (action === 'list') {
        const listed = await listGitHubFiles(env)
        return listed.ok
          ? jsonResponse(request, env, { files: listed.files })
          : jsonResponse(request, env, { error: listed.message }, listed.status)
      }

      if (action === 'file') {
        const path = url.searchParams.get('path') || ''
        const file = await getGitHubFile(env, path)
        if (!file.ok) return jsonResponse(request, env, { error: file.message }, file.status)
        return fileResponse(request, env, file, url.searchParams.get('download') === '1')
      }

      return jsonResponse(request, env, { error: 'Unknown action.' }, 400)
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, { error: 'Only GET and POST are supported.' }, 405)
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return jsonResponse(request, env, { error: 'Missing file.' }, 400)
    }

    const maxBytes = Number(env.MAX_FILE_BYTES || 20 * 1024 * 1024)
    if (file.size > maxBytes) {
      return jsonResponse(request, env, { error: `File is larger than ${Math.floor(maxBytes / 1024 / 1024)} MB.` }, 413)
    }

    const content = toBase64(await file.arrayBuffer())
    const uploaded = await uploadToGitHub(env, file, content)
    if (!uploaded.ok) {
      return jsonResponse(request, env, { error: uploaded.message, status: uploaded.status }, 502)
    }

    return jsonResponse(request, env, {
      file: {
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        path: uploaded.path,
        htmlUrl: uploaded.htmlUrl,
        commitUrl: uploaded.commitUrl,
        sha: uploaded.sha,
      },
    })
  },
}
