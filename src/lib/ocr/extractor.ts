import { PDFDocument } from "pdf-lib"

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
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pageCount = pdfDoc.getPageCount()
  const pages: ExtractedPage[] = []

  // For PDFs with embedded images, we need to extract them
  // This is a simplified approach - for production, use pdf2pic or similar
  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i)
    const { width, height } = page.getSize()
    
    // Create a placeholder - in production, use pdf-to-img or poppler
    // For now, we will handle this in the API route with a different approach
    pages.push({
      pageNumber: i + 1,
      imageBuffer: Buffer.alloc(0), // Will be populated by pdf2pic in API
      width: Math.round(width * dpi / 72),
      height: Math.round(height * dpi / 72),
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
