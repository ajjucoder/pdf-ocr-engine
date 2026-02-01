export * from "./types"
export * from "./extractor"
export * from "./ocr"
export * from "./builder"

import { getPdfInfo } from "./extractor"
import { ocrImage, initializeWorker, terminateWorker } from "./ocr"
import { buildSearchablePdf } from "./builder"
import type { OcrOptions, ConversionResult, ConversionProgress } from "./types"

export async function convertPdfToSearchable(
  pdfBuffer: Buffer,
  imageBuffers: Buffer[],
  options: OcrOptions = {},
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const { language = "eng", preserveImages = true } = options

  try {
    console.time("[OCR] Total OCR time")
    
    const pdfInfo = await getPdfInfo(pdfBuffer)
    const totalPages = pdfInfo.pageCount

    console.log(`[OCR] Processing ${totalPages} pages`)

    if (onProgress) {
      onProgress({
        stage: "extracting",
        currentPage: 0,
        totalPages,
        percentage: 0,
      })
    }

    // Initialize worker once before processing all pages
    console.time("[OCR] Worker pre-initialization")
    await initializeWorker(language)
    console.timeEnd("[OCR] Worker pre-initialization")

    // OCR each page sequentially (Tesseract worker is single-threaded)
    // But now we reuse the same worker - MUCH faster!
    const pageResults = []
    for (let i = 0; i < imageBuffers.length; i++) {
      if (onProgress) {
        onProgress({
          stage: "ocr",
          currentPage: i + 1,
          totalPages,
          percentage: Math.round(((i + 1) / totalPages) * 80),
        })
      }

      // Use ocrImage which reuses the shared worker
      const result = await ocrImage(
        imageBuffers[i],
        i + 1,
        language
      )
      pageResults.push(result)
    }
    
    console.timeEnd("[OCR] Total OCR time")

    if (onProgress) {
      onProgress({
        stage: "building",
        currentPage: totalPages,
        totalPages,
        percentage: 90,
      })
    }

    // Build the searchable PDF
    console.time("[BUILD] PDF assembly")
    const outputBuffer = await buildSearchablePdf(
      pdfBuffer,
      pageResults,
      preserveImages
    )
    console.timeEnd("[BUILD] PDF assembly")

    if (onProgress) {
      onProgress({
        stage: "building",
        currentPage: totalPages,
        totalPages,
        percentage: 100,
      })
    }

    // Keep worker alive for potential subsequent requests
    // Only terminate if explicitly needed
    // await terminateWorker()

    return {
      success: true,
      pageCount: totalPages,
      pages: pageResults,
      outputBuffer,
    }
  } catch (error) {
    await terminateWorker()
    return {
      success: false,
      pageCount: 0,
      pages: [],
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
