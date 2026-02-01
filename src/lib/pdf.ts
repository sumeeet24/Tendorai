import { createCanvas } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import path from 'path'

// Convert PDF Buffer to Array of Base64 Images
export async function convertPdfToImages(pdfBuffer: ArrayBuffer): Promise<{ pageNumber: number, base64: string }[]> {

  // Point to standard fonts to avoid warnings and potential rendering issues
  const standardFontDataUrl = path.join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBuffer,
    disableFontFace: true, // We don't need exact fonts for OCR usually, but good to have fallback
    standardFontDataUrl
  })

  const pdfDocument = await loadingTask.promise
  const pageCount = pdfDocument.numPages
  const results: { pageNumber: number, base64: string }[] = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdfDocument.getPage(i)

    // Scale: 2.0 for better quality for OCR
    const viewport = page.getViewport({ scale: 2.0 })

    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')

    await page.render({
      canvasContext: context as any, // Type mismatch between napi-canvas and DOM canvas
      viewport: viewport,
    } as any).promise

    // Convert to JPEG base64 (smaller than PNG)
    const base64 = canvas.toDataURL('image/jpeg', 0.8)
    // Remove prefix "data:image/jpeg;base64," if desired, but Agents might need it or not.
    // Prompt says: "page_image": "<base64>"
    // Usually means pure base64.
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')

    results.push({
      pageNumber: i,
      base64: cleanBase64
    })
  }

  return results
}
