export interface OcrOptions {
  language?: string
  dpi?: number
  preserveImages?: boolean
}

export interface OcrResult {
  text: string
  confidence: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export interface PageResult {
  pageNumber: number
  width: number
  height: number
  words: OcrResult[]
  fullText: string
}

export interface ConversionResult {
  success: boolean
  pageCount: number
  pages: PageResult[]
  outputBuffer?: Buffer
  error?: string
}

export interface ConversionProgress {
  stage: "extracting" | "ocr" | "building"
  currentPage: number
  totalPages: number
  percentage: number
}
