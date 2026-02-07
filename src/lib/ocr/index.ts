export * from "./types"
export * from "./extractor"
export * from "./ocr"
export * from "./builder"

import { getPdfInfo } from "./extractor"
import { createOcrSession } from "./ocr"
import { buildSearchablePdf } from "./builder"
import type { OcrOptions, ConversionResult, ConversionProgress, PageResult } from "./types"

type PageImage = Buffer | Uint8Array
type PageImageSource = Iterable<PageImage> | AsyncIterable<PageImage>

async function* toAsyncPageImageIterator(source: PageImageSource): AsyncIterable<PageImage> {
  if (Symbol.asyncIterator in source) {
    for await (const imageBuffer of source as AsyncIterable<PageImage>) {
      yield imageBuffer
    }
    return
  }

  for (const imageBuffer of source as Iterable<PageImage>) {
    yield imageBuffer
  }
}

export async function convertPdfToSearchable(
  pdfBuffer: Buffer,
  imageSource: PageImageSource,
  options: OcrOptions = {},
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const { language = "eng", preserveImages = true, maxPages } = options
  const pageResults: PageResult[] = []
  let totalPages = 0
  let expectedOcrPages = 0
  let session: Awaited<ReturnType<typeof createOcrSession>> | null = null
  let ocrTimerStarted = false

  try {
    console.time("[OCR] Total OCR time")
    ocrTimerStarted = true
    
    const pdfInfo = await getPdfInfo(pdfBuffer)
    totalPages = pdfInfo.pageCount
    if (totalPages === 0) {
      throw new Error("PDF has no pages")
    }
    if (maxPages && totalPages > maxPages) {
      throw new Error(
        `PDF has ${totalPages} pages, which exceeds the maximum allowed ${maxPages} pages`
      )
    }
    expectedOcrPages = pdfInfo.pages.filter((page) => page.hasText !== true).length

    console.log(`[OCR] Processing ${totalPages} pages`)
    console.log(
      `[OCR] Skipping OCR on ${totalPages - expectedOcrPages} page(s) with existing selectable text`
    )

    if (onProgress) {
      onProgress({
        stage: "extracting",
        currentPage: 0,
        totalPages,
        percentage: 0,
      })
    }

    let processedPages = 0
    for await (const rawImageBuffer of toAsyncPageImageIterator(imageSource)) {
      processedPages++
      const imageBuffer = Buffer.isBuffer(rawImageBuffer)
        ? rawImageBuffer
        : Buffer.from(rawImageBuffer)

      const currentPage = processedPages
      if (onProgress) {
        onProgress({
          stage: "ocr",
          currentPage,
          totalPages,
          percentage: Math.round((currentPage / totalPages) * 80),
        })
      }

      const pageInfo = pdfInfo.pages[currentPage - 1]
      if (!pageInfo) {
        throw new Error(
          `Page extraction mismatch: extracted ${processedPages} pages for a ${totalPages}-page PDF`
        )
      }

      if (pageInfo.hasText) {
        console.log(`[OCR] Page ${currentPage}: skipping OCR (existing selectable text found)`)
        continue
      }

      if (!session) {
        console.time("[OCR] Worker initialization")
        session = await createOcrSession(language)
        console.timeEnd("[OCR] Worker initialization")
      }

      const result = await session.ocrImage(imageBuffer, currentPage)
      pageResults.push(result)
    }

    if (processedPages !== totalPages) {
      throw new Error(
        `Page extraction mismatch: OCR received ${processedPages} of ${totalPages} page(s)`
      )
    }

    if (pageResults.length !== expectedOcrPages) {
      throw new Error(
        `Page extraction mismatch: OCR processed ${pageResults.length} of ${expectedOcrPages} expected OCR page(s)`
      )
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
    return {
      success: false,
      pageCount: totalPages,
      pages: pageResults,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  } finally {
    if (ocrTimerStarted) {
      console.timeEnd("[OCR] Total OCR time")
    }
    if (session) {
      await session.terminate()
    }
  }
}
