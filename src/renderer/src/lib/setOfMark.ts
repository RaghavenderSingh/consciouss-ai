import { AXElement } from '../types'

export interface SoMElement extends AXElement {
  boxId: number
}

// Vibrant palette for box borders — cycles through colours
const PALETTE = [
  '#FF4B33', '#FF54B0', '#4BFFB5', '#FFD700', '#00BFFF',
  '#FF8C00', '#A855F7', '#22D3EE', '#84CC16', '#F43F5E',
]

/**
 * annotateScreenshot
 *
 * Takes a raw screenshot dataURL and an array of AXElements, draws
 * numbered bounding boxes over every element, and returns:
 *  - annotatedDataURL: the marked-up image (base64 JPEG)
 *  - elements: the elements enriched with their assigned boxId
 *
 * The model can then reference elements by number, e.g.:
 *   { "type": "click", "payload": { "boxId": 4 } }
 *
 * IMPORTANT: coordinates in AXElements are in physical screen space.
 * The screenshot canvas is scaled to 1280px wide, so we apply the
 * same scale factor used in useScreenCapture before drawing.
 */
export async function annotateScreenshot(
  dataURL: string,
  elements: AXElement[],
  screenWidth = 2560  // physical screen width (retina default)
): Promise<{ annotatedDataURL: string; elements: SoMElement[] }> {
  if (!dataURL || elements.length === 0) {
    return { annotatedDataURL: dataURL, elements: elements.map((el, i) => ({ ...el, boxId: i + 1 })) }
  }

  const scale = 1280 / screenWidth

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)

      // Filter to only elements with a visible, non-trivial bounding box
      const meaningful = elements.filter(
        (el) =>
          el.width > 4 &&
          el.height > 4 &&
          el.x >= 0 &&
          el.y >= 0 &&
          (el.title || el.description || el.role !== 'AXGroup')
      )

      const enriched: SoMElement[] = meaningful.map((el, idx) => {
        const boxId = idx + 1
        const color = PALETTE[idx % PALETTE.length]

        const sx = Math.round(el.x * scale)
        const sy = Math.round(el.y * scale)
        const sw = Math.round(el.width * scale)
        const sh = Math.round(el.height * scale)

        // Draw border
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(sx, sy, sw, sh)

        // Draw label pill background
        const label = String(boxId)
        ctx.font = 'bold 11px monospace'
        const textW = ctx.measureText(label).width + 8
        const pillH = 16
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(sx, sy - pillH, textW, pillH, 3)
        ctx.fill()

        // Draw label number
        ctx.fillStyle = '#000000'
        ctx.fillText(label, sx + 4, sy - 3)

        return { ...el, boxId }
      })

      const annotatedDataURL = canvas.toDataURL('image/jpeg', 0.85)
      resolve({ annotatedDataURL, elements: enriched })
    }

    img.onerror = () => {
      // Fallback: return original if image fails to load
      resolve({ annotatedDataURL: dataURL, elements: elements.map((el, i) => ({ ...el, boxId: i + 1 })) })
    }

    img.src = dataURL
  })
}

/**
 * formatSoMTable
 *
 * Returns the box-ID → element mapping as compact markdown so the model
 * gets a full lookup table alongside the annotated visual.
 */
export function formatSoMTable(elements: SoMElement[]): string {
  if (elements.length === 0) return 'No visual elements annotated.'

  let output = '### 🏷️ Set-of-Mark Visual Index\n\n'
  output += '| ID | Role | Label | Center (x, y) |\n'
  output += '| -- | ---- | ----- | ------------- |\n'

  for (const el of elements) {
    const label = el.title || el.description || '—'
    const cx = Math.round(el.x + el.width / 2)
    const cy = Math.round(el.y + el.height / 2)
    output += `| **${el.boxId}** | ${el.role} | ${label} | (${cx}, ${cy}) |\n`
  }

  output += '\n> Click an element by using its center (x, y) from this table.\n'
  return output
}
