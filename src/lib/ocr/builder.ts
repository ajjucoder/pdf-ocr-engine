import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { PageResult } from "./types"

export async function buildSearchablePdf(
  originalPdfBuffer: Buffer,
  pageResults: PageResult[],
  preserveImages: boolean = true
): Promise<Buffer> {
  const originalPdf = await PDFDocument.load(originalPdfBuffer)
  const newPdf = await PDFDocument.create()
  const font = await newPdf.embedFont(StandardFonts.Helvetica)

  for (let i = 0; i < originalPdf.getPageCount(); i++) {
    // Copy the original page (preserves images)
    const [copiedPage] = await newPdf.copyPages(originalPdf, [i])
    newPdf.addPage(copiedPage)
    
    const page = newPdf.getPage(i)
    const { width, height } = page.getSize()
    
    // Find the OCR result for this page
    const pageResult = pageResults.find(p => p.pageNumber === i + 1)
    if (!pageResult) continue

    // Calculate scale factors
    const scaleX = width / pageResult.width
    const scaleY = height / pageResult.height

    // Add invisible text layer
    for (const word of pageResult.words) {
      const x = word.bbox.x0 * scaleX
      // PDF coordinates are from bottom, image coords from top
      const y = height - (word.bbox.y1 * scaleY)
      const wordWidth = (word.bbox.x1 - word.bbox.x0) * scaleX
      const wordHeight = (word.bbox.y1 - word.bbox.y0) * scaleY

      // Calculate font size to fit the word in the bounding box
      const textWidth = font.widthOfTextAtSize(word.text, 12)
      const fontSize = Math.min(
        (wordWidth / textWidth) * 12,
        wordHeight * 0.9
      )

      if (fontSize > 1 && word.text.trim()) {
        page.drawText(word.text, {
          x,
          y,
          size: Math.max(fontSize, 4),
          font,
          color: rgb(0, 0, 0),
          opacity: 0, // Invisible text for selection
        })
      }
    }
  }

  const pdfBytes = await newPdf.save()
  return Buffer.from(pdfBytes)
}

export async function createTextOnlyPdf(
  pageResults: PageResult[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  for (const pageResult of pageResults) {
    const page = pdfDoc.addPage([pageResult.width, pageResult.height])
    const { height } = page.getSize()

    // Add visible text
    for (const word of pageResult.words) {
      const x = word.bbox.x0
      const y = height - word.bbox.y1
      const wordWidth = word.bbox.x1 - word.bbox.x0
      const wordHeight = word.bbox.y1 - word.bbox.y0

      const textWidth = font.widthOfTextAtSize(word.text, 12)
      const fontSize = Math.min(
        (wordWidth / textWidth) * 12,
        wordHeight * 0.9
      )

      if (fontSize > 1 && word.text.trim()) {
        page.drawText(word.text, {
          x,
          y,
          size: Math.max(fontSize, 4),
          font,
          color: rgb(0, 0, 0),
        })
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
