import { AXElement } from '../types'

/**
 * Converts a list of AXElements into a compact Markdown string for the AI.
 */
export function formatUITree(elements: AXElement[]): string {
  if (!elements || elements.length === 0) {
    return 'No UI elements detected.'
  }

  // Filter for unique, meaningful elements to keep the prompt clean
  const seen = new Set<string>()
  const uniqueElements = elements.filter(el => {
    const key = `${el.role}-${el.title}-${el.description}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  let output = '### 🖥️ Detected UI Elements (Active App)\n\n'
  output += '| Role | Label | Coordinates (x,y,w,h) |\n'
  output += '| :--- | :--- | :--- |\n'

  uniqueElements.forEach(el => {
    const label = el.title || el.description || '(no label)'
    // Format coordinates compactly
    const coords = `[${Math.round(el.x)}, ${Math.round(el.y)}, ${Math.round(el.width)}, ${Math.round(el.height)}]`
    output += `| ${el.role} | ${label} | ${coords} |\n`
  })

  return output
}

/**
 * Orchestrates a UI scan for the current frontmost application.
 */
export async function scanActiveApp(): Promise<string> {
  try {
    const isTrusted = await window.electronAPI.isAccessibilityTrusted()
    if (!isTrusted) {
      return '(System Permission Error: Accessibility access is not granted.)'
    }

    const pid = await window.electronAPI.getFrontmostAppPid()
    if (!pid) return 'Failed to detect active application.'

    const elements = await window.electronAPI.listUIElements(pid, 7)
    return formatUITree(elements)
  } catch (err) {
    console.error('Scan failed:', err)
    return 'Error scanning UI elements.'
  }
}
