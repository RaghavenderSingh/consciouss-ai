import { AIAction, CaptureResult } from '../types'

export async function executeAction(
  action: AIAction,
  onStatus?: (status: 'running' | 'done' | 'failed') => void
): Promise<string | CaptureResult | void> {
  const api = window.electronAPI
  const p = action.payload ?? {}

  onStatus?.('running')

  try {
    switch (action.type) {
      case 'open_app': {
        const appName = p.name ?? p.app_name
        if (!appName) {
          console.warn('[actions] open_app missing name')
          break
        }
        await api.openApp(appName)
        console.log(`[actions] Opened app: ${appName}`)
        break
      }

      case 'open_url':
        if (!p.url) {
          console.warn('[actions] open_url missing url')
          break
        }
        await api.openUrl(p.url, p.browser || p.name || p.app_name)
        console.log(`[actions] Opened URL: ${p.url} in ${p.browser || 'default browser'}`)
        break

      case 'click':
        if (p.x == null || p.y == null) {
          console.warn('[actions] click missing x/y')
          break
        }
        await api.clickMouse(p.x, p.y)
        console.log(`[actions] Clicked at (${p.x}, ${p.y})`)
        break

      case 'type_text':
        if (!p.text) {
          console.warn('[actions] type_text missing text')
          break
        }
        await api.typeText(p.text)
        console.log(`[actions] Typed text: "${p.text}"`)
        break

      case 'run_command': {
        const cmd = p.cmd ?? ((p as Record<string, unknown>).command as string)
        if (!cmd) {
          console.warn('[actions] run_command missing cmd')
          break
        }
        const output = await api.runCommand(cmd)
        console.log(`[actions] Command output: ${output}`)
        onStatus?.('done')
        return output
      }

      case 'applescript': {
        if (!p.script) {
          console.warn('[actions] applescript missing script')
          break
        }
        const result = await api.appleScript(p.script)
        console.log(`[actions] AppleScript result: ${result}`)
        onStatus?.('done')
        return result
      }

      case 'screenshot': {
        const result = await api.captureScreen()
        console.log(`[actions] Screenshot captured, screens: ${result.screens?.length || 0}`)
        onStatus?.('done')
        return result
      }

      case 'orchestrate_task':
        // Orchestrator handles this natively, silent no-op here
        break

      case 'scrape_url': {
        if (!p.url) {
          console.warn('[actions] scrape_url missing url')
          break
        }
        console.log(`[actions] Scraping URL with FireCrawl: ${p.url}`)
        const apiKey = import.meta.env.VITE_FIRECRAWL_KEY
        if (!apiKey) {
          throw new Error('VITE_FIRECRAWL_KEY is not set in your .env file.')
        }

        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ url: p.url, formats: ['markdown'] })
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`FireCrawl Error ${res.status}: ${errText}`)
        }

        const data = await res.json()
        const markdown = data.data?.markdown || 'No content found.'
        console.log(`[actions] Scrape finished. Markdown length: ${markdown.length}`)
        onStatus?.('done')
        return `[SCRAPE RESULT FOR ${p.url}]:\n${markdown.substring(0, 8000)}... (truncated for context)`
      }

      case 'none':
        break

      default:
        console.warn(`[actions] Unknown action type: ${(action as AIAction).type}`)
    }
    onStatus?.('done')
  } catch (err: unknown) {
    onStatus?.('failed')
    const errMsg = err instanceof Error ? err.message : String(err)
    if (errMsg.includes('Allow JavaScript from Apple Events')) {
      console.error(
        '[actions] Browser Permission Error: You must enable "Allow JavaScript from Apple Events" in your browser (Chrome or Brave). Go to View > Developer > Allow JavaScript from Apple Events.'
      )
    } else {
      console.error(`[actions] Failed to execute action "${action.type}":`, err)
    }
  }
}
