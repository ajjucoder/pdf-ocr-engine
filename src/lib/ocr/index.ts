export * from "./types"
export * from "./extractor"
export * from "./ocr"
export * from "./builder"

import { getPdfInfo } from "./extractor"
import { ocrImageWithProgress, terminateWorker } from "./ocr"
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
    const pdfInfo = await getPdfInfo(pdfBuffer)
    const totalPages = pdfInfo.pageCount

    if (onProgress) {
      onProgress({
        stage: "extracting",
        currentPage: 0,
        totalPages,
        percentage: 0,
      })
    }

    // OCR each page
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

      const result = await ocrImageWithProgress(
        imageBuffers[i],
        i + 1,
        language
      )
      pageResults.push(result)
    }

    if (onProgress) {
      onProgress({
        stage: "building",
        currentPage: totalPages,
        totalPages,
        percentage: 90,
      })
    }

    // Build the searchable PDF
    const outputBuffer = await buildSearchablePdf(
      pdfBuffer,
      pageResults,
      preserveImages
    )

    if (onProgress) {
      onProgress({
        stage: "building",
        currentPage: totalPages,
        totalPages,
        percentage: 100,
      })
    }

    await terminateWorker()

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
