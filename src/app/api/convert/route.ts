import { NextRequest, NextResponse } from "next/server"
import { convertPdfToSearchable } from "@/lib/ocr"
import { pdf } from "pdf-to-img"

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
    
    // Convert PDF pages to images using pdf-to-img
    const imageBuffers: Buffer[] = []
    const pdfDocument = await pdf(pdfBuffer, { scale: 2.0 })
    
    for await (const page of pdfDocument) {
      imageBuffers.push(page)
    }
    
    if (imageBuffers.length === 0) {
      return NextResponse.json(
        { error: "Could not extract pages from PDF" },
        { status: 500 }
      )
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
