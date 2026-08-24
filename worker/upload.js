const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
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
    'access-control-allow-methods': 'POST, OPTIONS',
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

function buildUploadPath(env, originalName) {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const stamp = now.toISOString().replace(/[:.]/g, '-')
  const safeName = sanitizeFileName(originalName)
  const id = crypto.randomUUID().slice(0, 8)

  return `${env.UPLOAD_DIR}/${year}-${month}/${day}/${stamp}-${id}-${safeName}`
}

async function uploadToGitHub(env, file, content) {
  const path = buildUploadPath(env, file.name)
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'amazon-ops-workbench-upload-worker',
      'x-github-api-version': '2022-11-28',
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, env, { error: 'Only POST is supported.' }, 405)
    }

    if (!env.GITHUB_TOKEN || !env.UPLOAD_KEY) {
      return jsonResponse(request, env, { error: 'Worker secrets are not configured.' }, 500)
    }

    if (request.headers.get('x-upload-key') !== env.UPLOAD_KEY) {
      return jsonResponse(request, env, { error: 'Upload key is invalid.' }, 401)
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
