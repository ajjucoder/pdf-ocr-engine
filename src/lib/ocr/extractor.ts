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
  pages: { width: number; height: number }[]
}> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const pages = []

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i)
    const { width, height } = page.getSize()
    pages.push({ width, height })
  }

  return { pageCount, pages }
}
