import Tesseract from "tesseract.js"
import sharp from "sharp"
import type { OcrResult, PageResult } from "./types"

interface TesseractWord {
  text: string
  confidence: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

interface TesseractLine {
  words: TesseractWord[]
}

interface TesseractParagraph {
  lines: TesseractLine[]
}

interface TesseractBlock {
  paragraphs: TesseractParagraph[]
}

function extractWordsFromBlocks(blocks: TesseractBlock[] | null): TesseractWord[] {
  if (!blocks) return []
  const words: TesseractWord[] = []
  for (const block of blocks) {
    if (!block.paragraphs) continue
    for (const para of block.paragraphs) {
      if (!para.lines) continue
      for (const line of para.lines) {
        if (!line.words) continue
        for (const word of line.words) {
          words.push(word)
        }
      }
    }
  }
  return words
}

export interface OcrSession {
  ocrImage: (
    imageBuffer: Buffer,
    pageNumber: number,
    onProgress?: (progress: number) => void
  ) => Promise<PageResult>
  terminate: () => Promise<void>
}

export async function createOcrSession(language: string = "eng"): Promise<OcrSession> {
  console.time("[OCR] Worker initialization")
  const worker = await Tesseract.createWorker(language, 1, {
    cachePath: "./tesseract-cache",
    cacheMethod: "readOnly",
  })
  console.timeEnd("[OCR] Worker initialization")
  console.log(`[OCR] Worker created for language: ${language}`)

  return {
    ocrImage: async (
      imageBuffer: Buffer,
      pageNumber: number,
      onProgress?: (progress: number) => void
    ): Promise<PageResult> => {
      console.time(`[OCR] Page ${pageNumber} recognition`)

      const metadata = await sharp(imageBuffer).metadata()
      const imageWidth = metadata.width ?? 1
      const imageHeight = metadata.height ?? 1

      console.log(`[OCR] Page ${pageNumber} dimensions: ${imageWidth}x${imageHeight}`)

      const result = await worker.recognize(imageBuffer, {}, { blocks: true })

      if (onProgress) {
        onProgress(1.0)
      }

      console.timeEnd(`[OCR] Page ${pageNumber} recognition`)

      const blocks = result.data.blocks as TesseractBlock[] | null
      const extractedWords = extractWordsFromBlocks(blocks)

      console.log(`[OCR] Page ${pageNumber}: Found ${extractedWords.length} words`)

      const words: OcrResult[] = extractedWords.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      }))

      return {
        pageNumber,
        width: imageWidth,
        height: imageHeight,
        words,
        fullText: result.data.text,
      }
    },
    terminate: async () => {
      console.log("[OCR] Terminating worker")
      await worker.terminate()
    },
  }
}

/**
 * OCR a single image with an isolated worker.
 * Prefer reusing a session when processing multiple pages.
 */
export async function ocrImage(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng"
): Promise<PageResult> {
  const session = await createOcrSession(language)
  try {
    return await session.ocrImage(imageBuffer, pageNumber)
  } finally {
    await session.terminate()
  }
}

/**
 * OCR a single image with progress callback.
 */
export async function ocrImageWithProgress(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng",
  onProgress?: (progress: number) => void
): Promise<PageResult> {
  const session = await createOcrSession(language)
  try {
    return await session.ocrImage(imageBuffer, pageNumber, onProgress)
  } finally {
    await session.terminate()
  }
}
