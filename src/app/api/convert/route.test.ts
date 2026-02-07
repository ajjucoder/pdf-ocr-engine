import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/ocr", () => ({
  convertPdfToSearchable: vi.fn(),
}))

vi.mock("pdf-to-img", () => ({
  pdf: vi.fn(),
}))

import { POST } from "./route"
import { convertPdfToSearchable } from "@/lib/ocr"
import { pdf } from "pdf-to-img"

function createRequest(file: File, language = "eng"): NextRequest {
  const formData = new FormData()
  formData.append("pdf", file)
  formData.append("language", language)

  return new NextRequest("http://localhost/api/convert", {
    method: "POST",
    body: formData,
  })
}

function createPdfPageStream(): AsyncIterable<Uint8Array> {
  return {
    async *[Symbol.asyncIterator]() {
      yield Uint8Array.from([1, 2, 3])
    },
  }
}

describe("POST /api/convert", () => {
  const mockedConvertPdfToSearchable = vi.mocked(convertPdfToSearchable)
  const mockedPdf = vi.mocked(pdf)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects files that do not have a valid PDF header", async () => {
    const badFile = new File(["not-a-pdf"], "scan.pdf", {
      type: "application/pdf",
    })

    const response = await POST(createRequest(badFile))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("not a valid PDF")
    expect(mockedPdf).not.toHaveBeenCalled()
  })

  it("rejects invalid OCR language format", async () => {
    const pdfFile = new File([Buffer.from("%PDF-1.7\n")], "scan.pdf", {
      type: "application/pdf",
    })

    const response = await POST(createRequest(pdfFile, "english"))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain("Invalid OCR language format")
    expect(mockedPdf).not.toHaveBeenCalled()
  })

  it("maps max page conversion errors to 413", async () => {
    const pdfFile = new File([Buffer.from("%PDF-1.7\n")], "scan.pdf", {
      type: "application/pdf",
    })

    mockedPdf.mockResolvedValue(createPdfPageStream())
    mockedConvertPdfToSearchable.mockResolvedValue({
      success: false,
      pageCount: 250,
      pages: [],
      error: "PDF has 250 pages, which exceeds the maximum allowed 200 pages",
    })

    const response = await POST(createRequest(pdfFile))
    const body = await response.json()

    expect(response.status).toBe(413)
    expect(body.error).toContain("exceeds the maximum allowed")
  })
})
