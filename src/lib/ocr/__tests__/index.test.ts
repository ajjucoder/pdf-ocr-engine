import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../extractor", () => ({
  getPdfInfo: vi.fn(),
}))

vi.mock("../ocr", () => ({
  createOcrSession: vi.fn(),
}))

vi.mock("../builder", () => ({
  buildSearchablePdf: vi.fn(),
}))

import { convertPdfToSearchable } from "../index"
import { getPdfInfo } from "../extractor"
import { createOcrSession } from "../ocr"
import { buildSearchablePdf } from "../builder"

function createAsyncPageSource(pageCount: number): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = 0; i < pageCount; i++) {
        yield Uint8Array.from([i + 1, i + 2, i + 3])
      }
    },
  }
}

describe("convertPdfToSearchable", () => {
  const mockedGetPdfInfo = vi.mocked(getPdfInfo)
  const mockedCreateOcrSession = vi.mocked(createOcrSession)
  const mockedBuildSearchablePdf = vi.mocked(buildSearchablePdf)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("processes async page images and builds output PDF", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 2,
      pages: [
        { width: 612, height: 792, hasText: false },
        { width: 612, height: 792, hasText: false },
      ],
    })

    const ocrImage = vi
      .fn()
      .mockResolvedValueOnce({
        pageNumber: 1,
        width: 100,
        height: 100,
        words: [],
        fullText: "page 1",
      })
      .mockResolvedValueOnce({
        pageNumber: 2,
        width: 100,
        height: 100,
        words: [],
        fullText: "page 2",
      })
    const terminate = vi.fn().mockResolvedValue(undefined)

    mockedCreateOcrSession.mockResolvedValue({
      ocrImage,
      terminate,
    })

    const outputBuffer = Buffer.from("pdf-bytes")
    mockedBuildSearchablePdf.mockResolvedValue(outputBuffer)

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(2)
    )

    expect(result.success).toBe(true)
    expect(result.outputBuffer).toEqual(outputBuffer)
    expect(ocrImage).toHaveBeenCalledTimes(2)
    expect(ocrImage).toHaveBeenNthCalledWith(
      1,
      expect.any(Buffer),
      1
    )
    expect(ocrImage).toHaveBeenNthCalledWith(
      2,
      expect.any(Buffer),
      2
    )
    expect(mockedBuildSearchablePdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.arrayContaining([
        expect.objectContaining({ pageNumber: 1 }),
        expect.objectContaining({ pageNumber: 2 }),
      ]),
      true
    )
    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it("fails when rendered page count does not match PDF metadata", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 3,
      pages: [
        { width: 612, height: 792, hasText: false },
        { width: 612, height: 792, hasText: false },
        { width: 612, height: 792, hasText: false },
      ],
    })

    const ocrImage = vi.fn().mockResolvedValue({
      pageNumber: 1,
      width: 100,
      height: 100,
      words: [],
      fullText: "",
    })
    const terminate = vi.fn().mockResolvedValue(undefined)
    mockedCreateOcrSession.mockResolvedValue({ ocrImage, terminate })

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(2)
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("Page extraction mismatch")
    expect(mockedBuildSearchablePdf).not.toHaveBeenCalled()
    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it("terminates worker session when OCR throws", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 1,
      pages: [{ width: 612, height: 792, hasText: false }],
    })

    const ocrImage = vi.fn().mockRejectedValue(new Error("ocr failure"))
    const terminate = vi.fn().mockResolvedValue(undefined)
    mockedCreateOcrSession.mockResolvedValue({ ocrImage, terminate })

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(1)
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("ocr failure")
    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it("fails fast when PDF page count exceeds the configured maxPages", async () => {
    const pages = Array.from({ length: 250 }, () => ({
      width: 612,
      height: 792,
      hasText: false,
    }))
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 250,
      pages,
    })

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(1),
      { maxPages: 200 }
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("exceeds the maximum allowed 200 pages")
    expect(mockedCreateOcrSession).not.toHaveBeenCalled()
    expect(mockedBuildSearchablePdf).not.toHaveBeenCalled()
  })

  it("fails fast when PDF has zero pages", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 0,
      pages: [],
    })

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(0)
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("PDF has no pages")
    expect(mockedCreateOcrSession).not.toHaveBeenCalled()
  })

  it("skips OCR on pages that already contain selectable text", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 3,
      pages: [
        { width: 612, height: 792, hasText: true },
        { width: 612, height: 792, hasText: false },
        { width: 612, height: 792, hasText: true },
      ],
    })

    const ocrImage = vi.fn().mockResolvedValue({
      pageNumber: 2,
      width: 100,
      height: 100,
      words: [],
      fullText: "ocr-page-2",
    })
    const terminate = vi.fn().mockResolvedValue(undefined)
    mockedCreateOcrSession.mockResolvedValue({ ocrImage, terminate })
    mockedBuildSearchablePdf.mockResolvedValue(Buffer.from("output"))

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(3)
    )

    expect(result.success).toBe(true)
    expect(ocrImage).toHaveBeenCalledTimes(1)
    expect(ocrImage).toHaveBeenCalledWith(expect.any(Buffer), 2)
    expect(mockedBuildSearchablePdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      [expect.objectContaining({ pageNumber: 2 })],
      true
    )
  })

  it("does not initialize OCR worker when all pages already contain text", async () => {
    mockedGetPdfInfo.mockResolvedValue({
      pageCount: 2,
      pages: [
        { width: 612, height: 792, hasText: true },
        { width: 612, height: 792, hasText: true },
      ],
    })
    mockedBuildSearchablePdf.mockResolvedValue(Buffer.from("output"))

    const result = await convertPdfToSearchable(
      Buffer.from("%PDF-1.7"),
      createAsyncPageSource(2)
    )

    expect(result.success).toBe(true)
    expect(mockedCreateOcrSession).not.toHaveBeenCalled()
    expect(mockedBuildSearchablePdf).toHaveBeenCalledWith(
      expect.any(Buffer),
      [],
      true
    )
  })
})
