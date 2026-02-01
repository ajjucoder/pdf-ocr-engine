"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type UploadState = "idle" | "uploading" | "processing" | "complete" | "error"

export function PdfUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please drop a PDF file")
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }, [])

  const handleZoneClick = () => {
    inputRef.current?.click()
  }

  const handleConvert = async () => {
    if (!file) return

    setState("uploading")
    setProgress(10)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("pdf", file)
      formData.append("language", "eng")

      setState("processing")
      setProgress(30)

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90))
      }, 1000)

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Conversion failed")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `searchable-${file.name}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress(100)
      setState("complete")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed")
      setState("error")
    }
  }

  const handleReset = () => {
    setFile(null)
    setState("idle")
    setProgress(0)
    setError(null)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">PDF OCR Converter</CardTitle>
        <CardDescription>
          Upload an image-only PDF and convert it to a searchable PDF with selectable text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onClick={handleZoneClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
            ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            ${file ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
          `}
        >
          {file ? (
            <div className="space-y-2">
              <div className="text-4xl">📄</div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📤</div>
              <p className="font-medium">Drop your PDF here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {(state === "uploading" || state === "processing") && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              {state === "uploading" ? "Uploading..." : "Processing with OCR... This may take a few minutes."}
            </p>
          </div>
        )}

        {state === "complete" && (
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-green-600 dark:text-green-400 font-medium">
              Conversion complete! Your file has been downloaded.
            </p>
          </div>
        )}

        {error && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-red-600 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          {state === "idle" && file && (
            <Button onClick={handleConvert} size="lg">
              Convert to Searchable PDF
            </Button>
          )}
          {(state === "complete" || state === "error") && (
            <Button onClick={handleReset} variant="outline" size="lg">
              Convert Another PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
