import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './style.css'

async function refreshWhenBuildChanges() {
  const entryScript = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  const currentAsset = entryScript?.src.match(/\/assets\/index-[^/?]+\.js(?:\?.*)?$/)?.[0]
  if (!currentAsset) return

  try {
    const indexUrl = new URL('./index.html', window.location.href)
    indexUrl.searchParams.set('check', Date.now().toString())
    const response = await fetch(indexUrl, { cache: 'no-store' })
    if (!response.ok) return

    const latestHtml = await response.text()
    const latestAsset = latestHtml.match(/(?:\.\/)?assets\/index-[^"']+\.js/)?.[0]
    if (latestAsset && !currentAsset.includes(latestAsset.split('/').pop()!)) {
      window.location.replace(`${window.location.pathname}?refresh=${Date.now()}${window.location.hash}`)
    }
  } catch {
    // A failed background check should never prevent the app from opening.
  }
}

void refreshWhenBuildChanges()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
