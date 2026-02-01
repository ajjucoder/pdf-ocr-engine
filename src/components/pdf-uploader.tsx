"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FileText, Upload, CheckCircle, AlertCircle, Download, Loader2 } from "lucide-react"

type UploadState = "idle" | "uploading" | "processing" | "downloading" | "complete" | "error"

const FETCH_TIMEOUT_MS = 300000 // 5 minutes for OCR processing

export function PdfUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    try {
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      
      // Use a timeout to ensure the link is in the DOM before clicking
      setTimeout(() => {
        a.click()
        // Clean up after download starts
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)
      }, 0)
      
      return true
    } catch (err) {
      console.error("Download trigger failed:", err)
      return false
    }
  }, [])

  const handleConvert = async () => {
    if (!file) return

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setState("uploading")
    setProgress(10)
    setError(null)

    let progressInterval: ReturnType<typeof setInterval> | null = null

    try {
      const formData = new FormData()
      formData.append("pdf", file)
      formData.append("language", "eng")

      setState("processing")
      setProgress(30)

      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 85))
      }, 2000)

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Request timed out. The PDF may be too large or complex."))
        }, FETCH_TIMEOUT_MS)
      })

      // Race fetch against timeout
      const response = await Promise.race([
        fetch("/api/convert", {
          method: "POST",
          body: formData,
          signal,
        }),
        timeoutPromise,
      ])

      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = "Conversion failed"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType?.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          }
        } catch {
          // Ignore parse errors
        }
        throw new Error(errorMessage)
      }

      // Check Content-Type to ensure we got a PDF
      const contentType = response.headers.get("content-type")
      if (!contentType?.includes("application/pdf")) {
        throw new Error("Server returned an invalid response")
      }

      setState("downloading")
      setProgress(90)

      // Get blob with timeout protection
      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error("Received empty file from server")
      }

      setProgress(95)

      // Determine filename from Content-Disposition or use fallback
      const contentDisposition = response.headers.get("content-disposition")
      let filename = `searchable-${file.name}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1]
        }
      }

      // Trigger the download
      const downloadSuccess = triggerDownload(blob, filename)
      
      if (!downloadSuccess) {
        throw new Error("Failed to initiate download")
      }

      setProgress(100)
      setState("complete")
    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      // Don't show error for user-initiated abort
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle")
        setProgress(0)
        return
      }
      
      setError(err instanceof Error ? err.message : "Conversion failed")
      setState("error")
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState("idle")
    setProgress(0)
    setError(null)
  }

  const handleReset = () => {
    setFile(null)
    setState("idle")
    setProgress(0)
    setError(null)
  }

  const isProcessing = state === "uploading" || state === "processing" || state === "downloading"

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
          onClick={isProcessing ? undefined : handleZoneClick}
          onDragEnter={isProcessing ? undefined : handleDrag}
          onDragLeave={isProcessing ? undefined : handleDrag}
          onDragOver={isProcessing ? undefined : handleDrag}
          onDrop={isProcessing ? undefined : handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
            ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
            ${file && !isProcessing ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
          `}
        >
          {file ? (
            <div className="space-y-2">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
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
            disabled={isProcessing}
          />
        </div>

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {state === "uploading" && "Uploading..."}
              {state === "processing" && "Processing with OCR... This may take a few minutes."}
              {state === "downloading" && "Preparing download..."}
            </p>
          </div>
        )}

        {state === "complete" && (
          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Conversion complete! Your file has been downloaded.
            </p>
          </div>
        )}

        {error && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-red-600 dark:text-red-400 font-medium flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          {state === "idle" && file && (
            <Button onClick={handleConvert} size="lg">
              <Download className="w-4 h-4 mr-2" />
              Convert to Searchable PDF
            </Button>
          )}
          {isProcessing && (
            <Button onClick={handleCancel} variant="outline" size="lg">
              Cancel
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
