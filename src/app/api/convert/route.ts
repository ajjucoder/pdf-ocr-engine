import { NextRequest, NextResponse } from "next/server"
import { convertPdfToSearchable } from "@/lib/ocr"
import { pdf } from "pdf-to-img"

export const runtime = "nodejs"
export const maxDuration = 300

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

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      )
    }

    console.log(`[CONVERT] Processing: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    
    console.time("[STEP 1] Read PDF buffer")
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    console.timeEnd("[STEP 1] Read PDF buffer")
    
    // Convert PDF pages to images using pdf-to-img
    // OPTIMIZED: Reduced scale from 2.0 to 1.5 for faster processing
    console.time("[STEP 2] PDF to images")
    const imageBuffers: Buffer[] = []
    const pdfDocument = await pdf(pdfBuffer, { scale: 1.5 })
    
    let pageNum = 0
    for await (const page of pdfDocument) {
      pageNum++
      console.log(`[STEP 2] Extracted page ${pageNum} (${(page.length / 1024).toFixed(1)} KB)`)
      imageBuffers.push(page)
    }
    console.timeEnd("[STEP 2] PDF to images")
    console.log(`[STEP 2] Total pages extracted: ${imageBuffers.length}`)
    
    if (imageBuffers.length === 0) {
      return NextResponse.json(
        { error: "Could not extract pages from PDF" },
        { status: 500 }
      )
    }

    console.time("[STEP 3] OCR + PDF build")
    const conversionResult = await convertPdfToSearchable(
      pdfBuffer,
      imageBuffers,
      { language, preserveImages: true }
    )
    console.timeEnd("[STEP 3] OCR + PDF build")

    if (!conversionResult.success || !conversionResult.outputBuffer) {
      console.timeEnd("[TOTAL] PDF conversion")
      return NextResponse.json(
        { error: conversionResult.error || "Conversion failed" },
        { status: 500 }
      )
    }

    console.log(`[COMPLETE] Output size: ${(conversionResult.outputBuffer.length / 1024).toFixed(1)} KB`)
    console.timeEnd("[TOTAL] PDF conversion")

    const uint8Array = new Uint8Array(conversionResult.outputBuffer)
    
    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": uint8Array.byteLength.toString(),
        "Content-Disposition": `attachment; filename="searchable-${file.name}"`,
      },
    })
  } catch (error) {
    console.timeEnd("[TOTAL] PDF conversion")
    console.error("Conversion error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
