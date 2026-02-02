# PDF OCR Engine

Convert image-only PDFs (scanned documents) to searchable PDFs with selectable text using OCR.

## Features

- **Local Processing** - All OCR happens server-side with Tesseract.js (no external APIs needed)
- **Preserves Layout** - Original images retained, invisible text layer added on top
- **High Accuracy** - Word-level bounding boxes ensure precise text positioning
- **Modern Stack** - Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Modular Design** - Core OCR engine can be used independently of the web app

## How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. UPLOAD      │     │  2. OCR         │     │  3. DOWNLOAD    │
│  Scanned PDF    │ ──► │  Extract text   │ ──► │  Searchable PDF │
│  (images only)  │     │  + positions    │     │  (text layer)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Technical Flow

1. **PDF to Images** - Each page rendered as PNG at 1.5x scale using `pdf-to-img`
2. **OCR Processing** - Tesseract.js extracts text with word-level bounding boxes
3. **Coordinate Mapping** - Image coordinates transformed to PDF coordinate system
4. **Text Layer** - Invisible text placed exactly over visible content using `pdf-lib`
5. **Output** - Original PDF preserved with searchable text layer embedded

## Getting Started

### Prerequisites

- Node.js 20+ (required for Next.js 16)
- npm or pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/ajjucoder/pdf-ocr-engine.git
cd pdf-ocr-engine

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Vitest tests
npm run test:watch   # Run tests in watch mode
```

## Project Structure

```
pdf-ocr-engine/
├── src/
│   ├── app/
│   │   ├── api/convert/route.ts    # POST /api/convert endpoint
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing page
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   └── pdf-uploader.tsx        # Main upload component
│   └── lib/
│       └── ocr/                    # Core OCR engine
│           ├── index.ts            # Main orchestration
│           ├── types.ts            # TypeScript interfaces
│           ├── ocr.ts              # Tesseract.js integration
│           ├── builder.ts          # PDF construction
│           └── extractor.ts        # PDF metadata extraction
├── BUGFIXES.md                     # Detailed bug fix history
└── package.json
```

## API Documentation

### POST /api/convert

Convert an image-only PDF to a searchable PDF with OCR-extracted text layer.

**Request:**
```
Content-Type: multipart/form-data

Parameters:
  pdf      (File, required)   - The PDF file to process
  language (string, optional) - OCR language code (default: "eng")
```

**Response (Success - 200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="searchable-{original-name}.pdf"

Body: Binary PDF data
```

**Response (Error - 400/500):**
```json
{ "error": "Error message" }
```

**Example:**
```typescript
const formData = new FormData()
formData.append("pdf", pdfFile)
formData.append("language", "eng")

const response = await fetch("/api/convert", {
  method: "POST",
  body: formData,
})

if (response.ok) {
  const blob = await response.blob()
  // Download the searchable PDF
}
```

## Using the OCR Engine Programmatically

The OCR engine is modular and can be used independently:

```typescript
import { convertPdfToSearchable } from "@/lib/ocr"

const pdfBuffer = Buffer.from(await file.arrayBuffer())
const imageBuffers = [/* PNG buffers from pdf-to-img */]

const result = await convertPdfToSearchable(
  pdfBuffer,
  imageBuffers,
  {
    language: "eng",
    preserveImages: true,
  },
  (progress) => {
    console.log(`${progress.stage}: ${progress.percentage}%`)
  }
)

if (result.success) {
  const searchablePdf = result.outputBuffer
  // Save or return the PDF
}
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 16](https://nextjs.org/) with App Router |
| UI | [React 19](https://react.dev/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS 4](https://tailwindcss.com/) |
| OCR | [Tesseract.js 7](https://tesseract.projectnaptha.com/) |
| PDF Processing | [pdf-lib](https://pdf-lib.js.org/), [pdf-to-img](https://github.com/nickclaw/pdf-to-img), [Sharp](https://sharp.pixelplumbing.com/) |
| Language | TypeScript 5 (strict mode) |
| Testing | [Vitest](https://vitest.dev/), Testing Library |

## Architecture

### OCR Pipeline

```
PDF Buffer
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  pdf-to-img (scale: 1.5)                                │
│  Renders each page as PNG image                         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Tesseract.js (with { blocks: true })                   │
│  Extracts: text, confidence, bounding boxes             │
│  Structure: blocks → paragraphs → lines → words         │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Coordinate Transformation                              │
│  • Scale: image pixels → PDF points                     │
│  • Y-axis flip: top-origin → bottom-origin              │
│  • Baseline offset: +20% for text alignment             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  pdf-lib                                                │
│  • Copy original pages (preserves images)               │
│  • Draw invisible text at calculated positions          │
│  • Save searchable PDF                                  │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Singleton Worker** - Tesseract worker created once, reused for all pages (64x faster)
2. **Invisible Text Layer** - Text with `opacity: 0` placed over images for selection
3. **Baseline Offset** - 20% adjustment because PDF `drawText()` uses baseline, not bbox bottom
4. **Defensive Checks** - Validation for dimensions, text width, edge cases

## Recent Bug Fixes

See [BUGFIXES.md](./BUGFIXES.md) for detailed history. Key fixes:

| Issue | Root Cause | Solution |
|-------|------------|----------|
| Text not positioned correctly | Tesseract.js v7 API change | Enable `{ blocks: true }`, extract from nested structure |
| Text shifted downward | Used bbox bottom instead of baseline | Added 20% baseline offset |
| Invisible text layer | Hardcoded `width: 0, height: 0` | Use Sharp for actual dimensions |

## Future Improvements

- [ ] MCP server for Claude/OpenCode integration
- [ ] Multi-language OCR support
- [ ] Progress streaming via Server-Sent Events
- [ ] Batch processing for multiple PDFs
- [ ] Cloud OCR fallback for better accuracy
- [ ] Memory leak fix for Blob URLs
- [ ] Rate limiting and security hardening

## License

MIT
