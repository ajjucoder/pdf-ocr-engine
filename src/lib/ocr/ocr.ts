import Tesseract from "tesseract.js"
import type { OcrResult, PageResult } from "./types"

let worker: Tesseract.Worker | null = null

async function getWorker(language: string = "eng"): Promise<Tesseract.Worker> {
  if (!worker) {
    worker = await Tesseract.createWorker(language)
  }
  return worker
}

export async function ocrImage(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng"
): Promise<PageResult> {
  const tesseractWorker = await getWorker(language)
  
  const result = await tesseractWorker.recognize(imageBuffer)
  
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

export async function ocrImageWithProgress(
  imageBuffer: Buffer,
  pageNumber: number,
  language: string = "eng",
  onProgress?: (progress: number) => void
): Promise<PageResult> {
  const tesseractWorker = await Tesseract.createWorker(language, undefined, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(m.progress)
      }
    },
  })
  
  const result = await tesseractWorker.recognize(imageBuffer)
  await tesseractWorker.terminate()
  
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

export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
  }
}
