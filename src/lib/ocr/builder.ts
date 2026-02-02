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

    // Calculate scale factors - skip if dimensions are invalid
    if (pageResult.width <= 0 || pageResult.height <= 0) {
      console.warn(`[BUILD] Page ${i + 1}: Invalid OCR dimensions (${pageResult.width}x${pageResult.height}), skipping text layer`)
      continue
    }

    const scaleX = width / pageResult.width
    const scaleY = height / pageResult.height

    // Add invisible text layer
    for (const word of pageResult.words) {
      const x = word.bbox.x0 * scaleX
      const wordWidth = (word.bbox.x1 - word.bbox.x0) * scaleX
      const wordHeight = (word.bbox.y1 - word.bbox.y0) * scaleY
      
      // PDF coordinates are from bottom, image coords from top
      // Add baseline offset (PDF drawText uses baseline, not bbox bottom)
      const baselineOffset = wordHeight * 0.2
      const y = height - (word.bbox.y1 * scaleY) + baselineOffset

      // Calculate font size to fit the word in the bounding box
      const textWidth = font.widthOfTextAtSize(word.text, 12)
      
      // Skip if text produces zero-width measurement
      if (textWidth <= 0 || wordWidth <= 0 || wordHeight <= 0) continue
      
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
    // Use default page size if dimensions are invalid
    const pageWidth = pageResult.width > 0 ? pageResult.width : 612
    const pageHeight = pageResult.height > 0 ? pageResult.height : 792
    
    const page = pdfDoc.addPage([pageWidth, pageHeight])
    const { height } = page.getSize()

    // Add visible text
    for (const word of pageResult.words) {
      const x = word.bbox.x0
      const wordWidth = word.bbox.x1 - word.bbox.x0
      const wordHeight = word.bbox.y1 - word.bbox.y0
      
      // PDF coordinates are from bottom, image coords from top
      // Add baseline offset (PDF drawText uses baseline, not bbox bottom)
      const baselineOffset = wordHeight * 0.2
      const y = height - word.bbox.y1 + baselineOffset

      const textWidth = font.widthOfTextAtSize(word.text, 12)
      
      // Skip if text produces zero-width measurement
      if (textWidth <= 0 || wordWidth <= 0 || wordHeight <= 0) continue
      
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
