import { PdfUploader } from "@/components/pdf-uploader"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            PDF OCR Engine
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert image-only PDFs (scanned documents) into searchable PDFs 
            with selectable and copyable text.
          </p>
        </div>

        <PdfUploader />

        <div className="text-center space-y-4 pt-8">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl mb-3">1️⃣</div>
              <h3 className="font-semibold mb-2">Upload PDF</h3>
              <p className="text-sm text-muted-foreground">
                Drop your scanned PDF that contains images instead of text.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl mb-3">2️⃣</div>
              <h3 className="font-semibold mb-2">OCR Processing</h3>
              <p className="text-sm text-muted-foreground">
                Tesseract.js extracts text from each page using advanced OCR.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-card border">
              <div className="text-3xl mb-3">3️⃣</div>
              <h3 className="font-semibold mb-2">Download Result</h3>
              <p className="text-sm text-muted-foreground">
                Get a searchable PDF that looks identical but has selectable text.
              </p>
            </div>
          </div>
        </div>

        <footer className="text-center pt-12 text-sm text-muted-foreground">
          <p>Built with Next.js 16, Tesseract.js, and pdf-lib</p>
          <p className="mt-2">
            <a 
              href="https://github.com/aejjusingh/pdf-ocr-engine" 
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
