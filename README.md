# PDF OCR Engine

Convert image-only PDFs (scanned documents) to searchable PDFs with selectable text using OCR.

## Features

- **Next.js 16** with App Router and Turbopack
- **Tesseract.js** for local OCR processing (no API keys needed)
- **pdf-lib** for PDF manipulation
- **shadcn/ui** for beautiful, accessible UI components
- **TypeScript** for type safety

## How It Works

1. **Upload** - Drop your scanned PDF that contains images instead of text
2. **OCR Processing** - Tesseract.js extracts text from each page
3. **Download** - Get a searchable PDF that looks identical but has selectable text

## Getting Started

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

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [Tesseract.js](https://tesseract.projectnaptha.com/) - Pure JavaScript OCR
- [pdf-lib](https://pdf-lib.js.org/) - PDF manipulation
- [pdf2pic](https://github.com/yakovmeister/pdf2pic) - PDF to image conversion
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Core OCR Engine

The OCR engine is modular and can be used independently:

```typescript
import { convertPdfToSearchable } from "@/lib/ocr"

const result = await convertPdfToSearchable(pdfBuffer, imageBuffers, {
  language: "eng",
  preserveImages: true,
})
```

## API Route

POST to `/api/convert` with a FormData containing:
- `pdf` - The PDF file
- `language` - OCR language (default: "eng")

Returns the searchable PDF as a download.

## Future Improvements

- [ ] MCP server for Claude/OpenCode integration
- [ ] Multi-language OCR support
- [ ] Progress streaming via Server-Sent Events
- [ ] Batch processing for multiple PDFs
- [ ] Cloud OCR fallback for better accuracy

## License

MIT
