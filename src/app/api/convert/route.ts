import { NextRequest, NextResponse } from "next/server"
import { convertPdfToSearchable } from "@/lib/ocr"

export const runtime = "nodejs"
export const maxDuration = 300
const MAX_PDF_BYTES = 50 * 1024 * 1024
const MAX_PDF_PAGES = 200

function hasPdfHeader(buffer: Buffer): boolean {
  if (buffer.length < 5) return false
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
}

function isValidOcrLanguage(language: string): boolean {
  return /^[a-z]{3}(?:\+[a-z]{3})*$/i.test(language)
}

export async function POST(request: NextRequest) {
  console.time("[TOTAL] PDF conversion")
  
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

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      )
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF is too large. Maximum size is 50 MB." },
        { status: 413 }
      )
    }

    if (!isValidOcrLanguage(language)) {
      return NextResponse.json(
        { error: "Invalid OCR language format" },
        { status: 400 }
      )
    }

    console.log(`[CONVERT] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    
    console.time("[STEP 1] Read PDF buffer")
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    console.timeEnd("[STEP 1] Read PDF buffer")

    if (!hasPdfHeader(pdfBuffer)) {
      return NextResponse.json(
        { error: "Uploaded file is not a valid PDF" },
        { status: 400 }
      )
    }
    
    // Convert PDF pages to images using pdf-to-img
    // Dynamic import to avoid build-time initialization issues
    // OPTIMIZED: Reduced scale from 2.0 to 1.5 for faster processing
    console.time("[STEP 2/3] OCR + PDF build")
    const { pdf } = await import("pdf-to-img")
    const pdfDocument = await pdf(pdfBuffer, { scale: 1.5 })
    const conversionResult = await convertPdfToSearchable(
      pdfBuffer,
      pdfDocument,
      { language, preserveImages: true, maxPages: MAX_PDF_PAGES }
    )
    console.timeEnd("[STEP 2/3] OCR + PDF build")

    if (!conversionResult.success || !conversionResult.outputBuffer) {
      const errorMessage = conversionResult.error || "Conversion failed"
      const status =
        errorMessage.includes("exceeds the maximum allowed") ? 413 :
        errorMessage.includes("has no pages") ? 400 :
        500

      return NextResponse.json(
        { error: errorMessage },
        { status }
      )
    }

    console.log(`[COMPLETE] Output size: ${(conversionResult.outputBuffer.length / 1024).toFixed(1)} KB`)

    const uint8Array = new Uint8Array(conversionResult.outputBuffer)
    
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": uint8Array.byteLength.toString(),
        "Content-Disposition": `attachment; filename="searchable-${file.name}"`,
      },
    })
  } catch (error) {
    console.error("Conversion error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  } finally {
    console.timeEnd("[TOTAL] PDF conversion")
  }
}
