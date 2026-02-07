import { PDFDocument } from "pdf-lib"
import { pdf } from "pdf-to-img"
import sharp from "sharp"

export interface ExtractedPage {
  pageNumber: number
  imageBuffer: Buffer
  width: number
  height: number
}

export async function extractPagesAsImages(
  pdfBuffer: Buffer,
  dpi: number = 300
): Promise<ExtractedPage[]> {
  const scale = Math.max(dpi / 72, 1)
  const pages: ExtractedPage[] = []
  const pdfDocument = await pdf(pdfBuffer, { scale })

  let pageNumber = 0
  for await (const pageImage of pdfDocument) {
    pageNumber++
    const imageBuffer = Buffer.isBuffer(pageImage)
      ? pageImage
      : Buffer.from(pageImage)
    const metadata = await sharp(imageBuffer).metadata()

    pages.push({
      pageNumber,
      imageBuffer,
      width: metadata.width ?? 1,
      height: metadata.height ?? 1,
    })
  }

  return pages
}

export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  return pdfDoc.getPageCount()
}

export async function getPdfInfo(pdfBuffer: Buffer): Promise<{
  pageCount: number
  pages: { width: number; height: number; hasText: boolean }[]
}> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const hasTextPages = await detectPagesWithRealText(pdfBuffer, pageCount)
  const pages = []

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i)
    const { width, height } = page.getSize()
    pages.push({ width, height, hasText: hasTextPages[i] ?? false })
  }

  return { pageCount, pages }
}

async function detectPagesWithRealText(
  pdfBuffer: Buffer,
  pageCount: number
): Promise<boolean[]> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      disableFontFace: true,
      isEvalSupported: false,
      useSystemFonts: false,
    })

    const document = await loadingTask.promise
    const hasText: boolean[] = []

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const containsText = textContent.items.some((item: unknown) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "str" in item &&
          typeof (item as { str?: unknown }).str === "string"
        ) {
          return (item as { str: string }).str.trim().length > 0
        }
        return false
      })
      hasText.push(containsText)
      page.cleanup()
    }

    await document.destroy()
    loadingTask.destroy()
    return hasText
  } catch (error) {
    console.warn("[EXTRACT] Failed to detect existing text; falling back to OCR for all pages", error)
    return new Array(pageCount).fill(false)
  }
}
