import Tesseract from "tesseract.js"
import type { OcrResult, PageResult } from "./types"

// Singleton worker instance - created once, reused for all pages
let worker: Tesseract.Worker | null = null
let workerLanguage: string | null = null

/**
 * Get or create a reusable Tesseract worker.
 * Worker is cached and reused across all OCR operations for performance.
 */
async function getWorker(language: string = "eng"): Promise<Tesseract.Worker> {
  // If worker exists but language changed, terminate and recreate
  if (worker && workerLanguage !== language) {
    console.log(`[OCR] Switching language from ${workerLanguage} to ${language}`)
    await worker.terminate()
    worker = null
    workerLanguage = null
  }
  
  if (!worker) {
    console.time("[OCR] Worker initialization")
    worker = await Tesseract.createWorker(language, 1, {
      cachePath: "./tesseract-cache",
      cacheMethod: "readOnly",
    })
    workerLanguage = language
    console.timeEnd("[OCR] Worker initialization")
    console.log(`[OCR] Worker created for language: ${language}`)
  }
  
  return worker
}

/**
 * OCR a single image using the shared worker.
 */
export async function ocrImage(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng"
): Promise<PageResult> {
  console.time(`[OCR] Page ${pageNumber} recognition`)
  
  const tesseractWorker = await getWorker(language)
  const result = await tesseractWorker.recognize(imageBuffer)
  
  console.timeEnd(`[OCR] Page ${pageNumber} recognition`)
  
  // Access words from the result data
  const data = result.data as {
    text: string
    words?: Array<{
      text: string
      confidence: number
      bbox: { x0: number; y0: number; x1: number; y1: number }
    }>
  }
  
  const words: OcrResult[] = (data.words || []).map((word) => ({
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
    width: 0,
    height: 0,
    words,
    fullText: data.text,
  }
}

/**
 * OCR a single image with progress callback.
 * OPTIMIZED: Now reuses shared worker instead of creating a new one per page.
 */
export async function ocrImageWithProgress(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng",
  onProgress?: (progress: number) => void
): Promise<PageResult> {
  console.time(`[OCR] Page ${pageNumber} recognition`)
  
  // Use shared worker for performance - no more per-page worker creation!
  const tesseractWorker = await getWorker(language)
  
  const result = await tesseractWorker.recognize(imageBuffer)
  
  // Call progress callback at completion if provided
  if (onProgress) {
    onProgress(1.0)
  }
  
  console.timeEnd(`[OCR] Page ${pageNumber} recognition`)
  
  // Access words from the result data with proper typing
  const data = result.data as {
    text: string
    words?: Array<{
      text: string
      confidence: number
      bbox: { x0: number; y0: number; x1: number; y1: number }
    }>
  }
  
  const words: OcrResult[] = (data.words || []).map((word) => ({
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
    width: 0,
    height: 0,
    words,
    fullText: data.text,
  }
}

/**
 * Terminate the shared worker. Call this when done with all OCR operations.
 */
export async function terminateWorker(): Promise<void> {
  if (worker) {
    console.log("[OCR] Terminating worker")
    await worker.terminate()
    worker = null
    workerLanguage = null
  }
}

/**
 * Initialize the worker ahead of time for faster first-page OCR.
 */
export async function initializeWorker(language: string = "eng"): Promise<void> {
  await getWorker(language)
}
