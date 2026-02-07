import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { OcrResult, PageResult } from "./types"

interface CopyFriendlyWord {
  rawText: string
  text: string
  bbox: OcrResult["bbox"]
}

interface WordWithMetrics {
  word: OcrResult
  centerY: number
  height: number
}

interface WordLine {
  centerY: number
  averageHeight: number
  words: WordWithMetrics[]
}

function isValidWord(word: OcrResult): boolean {
  const { x0, y0, x1, y1 } = word.bbox
  if (!word.text?.trim()) return false
  if (![x0, y0, x1, y1].every(Number.isFinite)) return false
  return x1 > x0 && y1 > y0
}

export function buildCopyFriendlyWordSequence(words: OcrResult[]): CopyFriendlyWord[] {
  const sortedWords = words
    .filter(isValidWord)
    .map((word) => {
      const height = word.bbox.y1 - word.bbox.y0
      return {
        word,
        height,
        centerY: (word.bbox.y0 + word.bbox.y1) / 2,
      } satisfies WordWithMetrics
    })
    .sort((a, b) => {
      if (a.centerY !== b.centerY) return a.centerY - b.centerY
      return a.word.bbox.x0 - b.word.bbox.x0
    })

  const lines: WordLine[] = []

  for (const candidate of sortedWords) {
    let bestLine: WordLine | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (const line of lines) {
      const distance = Math.abs(candidate.centerY - line.centerY)
      const tolerance = Math.max(
        2,
        Math.min(candidate.height, line.averageHeight) * 0.6
      )

      if (distance <= tolerance && distance < bestDistance) {
        bestDistance = distance
        bestLine = line
      }
    }

    if (!bestLine) {
      lines.push({
        centerY: candidate.centerY,
        averageHeight: candidate.height,
        words: [candidate],
      })
      continue
    }

    bestLine.words.push(candidate)
    const count = bestLine.words.length
    bestLine.centerY = ((bestLine.centerY * (count - 1)) + candidate.centerY) / count
    bestLine.averageHeight = ((bestLine.averageHeight * (count - 1)) + candidate.height) / count
  }

  lines.sort((a, b) => a.centerY - b.centerY)

  const output: CopyFriendlyWord[] = []
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    line.words.sort((a, b) => a.word.bbox.x0 - b.word.bbox.x0)

    const wordWidths: number[] = []
    for (const entry of line.words) {
      wordWidths.push(entry.word.bbox.x1 - entry.word.bbox.x0)
    }
    const averageWordWidth =
      wordWidths.length > 0
        ? wordWidths.reduce((sum, width) => sum + width, 0) / wordWidths.length
        : 0
    const tableGapThreshold = Math.max(
      averageWordWidth * 1.25,
      line.averageHeight * 1.5
    )

    for (let i = 0; i < line.words.length; i++) {
      const current = line.words[i]
      let prefix = ""
      if (lineIndex > 0 && i === 0) {
        prefix = "\n"
      } else if (i > 0) {
        const previous = line.words[i - 1]
        const gap = Math.max(0, current.word.bbox.x0 - previous.word.bbox.x1)

        if (gap > line.averageHeight * 0.15) {
          prefix = gap >= tableGapThreshold ? "\t" : " "
        }
      }

      output.push({
        rawText: current.word.text,
        text: `${prefix}${current.word.text}`,
        bbox: current.word.bbox,
      })
    }
  }

  return output
}

export async function buildSearchablePdf(
  originalPdfBuffer: Buffer,
  pageResults: PageResult[],
  preserveImages: boolean = true
): Promise<Buffer> {
  if (!preserveImages) {
    return createTextOnlyPdf(pageResults)
  }

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
    const copyWords = buildCopyFriendlyWordSequence(pageResult.words)

    // Add invisible text layer
    for (const word of copyWords) {
      const x = word.bbox.x0 * scaleX
      const wordWidth = (word.bbox.x1 - word.bbox.x0) * scaleX
      const wordHeight = (word.bbox.y1 - word.bbox.y0) * scaleY
      
      // PDF coordinates are from bottom, image coords from top
      // Add baseline offset (PDF drawText uses baseline, not bbox bottom)
      const baselineOffset = wordHeight * 0.2
      const y = height - (word.bbox.y1 * scaleY) + baselineOffset

      // Calculate font size to fit the word in the bounding box
      const textWidth = font.widthOfTextAtSize(word.rawText, 12)
      
      // Skip if text produces zero-width measurement
      if (
        textWidth <= 0 ||
        wordWidth <= 0 ||
        wordHeight <= 0 ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        continue
      }
      
      const fontSize = Math.min(
        (wordWidth / textWidth) * 12,
        wordHeight * 0.9
      )

      if (fontSize > 1 && word.rawText.trim()) {
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
    const copyWords = buildCopyFriendlyWordSequence(pageResult.words)

    // Add visible text
    for (const word of copyWords) {
      const x = word.bbox.x0
      const wordWidth = word.bbox.x1 - word.bbox.x0
      const wordHeight = word.bbox.y1 - word.bbox.y0
      
      // PDF coordinates are from bottom, image coords from top
      // Add baseline offset (PDF drawText uses baseline, not bbox bottom)
      const baselineOffset = wordHeight * 0.2
      const y = height - word.bbox.y1 + baselineOffset

      const textWidth = font.widthOfTextAtSize(word.rawText, 12)
      
      // Skip if text produces zero-width measurement
      if (
        textWidth <= 0 ||
        wordWidth <= 0 ||
        wordHeight <= 0 ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        continue
      }
      
      const fontSize = Math.min(
        (wordWidth / textWidth) * 12,
        wordHeight * 0.9
      )

      if (fontSize > 1 && word.rawText.trim()) {
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
