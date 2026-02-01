import { NextRequest, NextResponse } from "next/server"
import { fromBuffer } from "pdf2pic"
import { convertPdfToSearchable } from "@/lib/ocr"

export const runtime = "nodejs"
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("pdf") as File | null
    const language = (formData.get("language") as string) || "eng"

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      )
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      )
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer())

    const options = {
      density: 300,
      format: "png" as const,
      width: 2480,
      height: 3508,
    }

    const convert = fromBuffer(pdfBuffer, options)
    
    const { PDFDocument } = await import("pdf-lib")
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()

    const imageBuffers: Buffer[] = []
    for (let i = 1; i <= pageCount; i++) {
      const result = await convert(i, { responseType: "buffer" })
      if (result.buffer) {
        imageBuffers.push(result.buffer as Buffer)
      }
    }

    const conversionResult = await convertPdfToSearchable(
      pdfBuffer,
      imageBuffers,
      { language, preserveImages: true }
    )

    if (!conversionResult.success || !conversionResult.outputBuffer) {
      return NextResponse.json(
        { error: conversionResult.error || "Conversion failed" },
        { status: 500 }
      )
    }

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(conversionResult.outputBuffer)
    
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="searchable-${file.name}"`,
      },
    })
  } catch (error) {
    console.error("Conversion error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
