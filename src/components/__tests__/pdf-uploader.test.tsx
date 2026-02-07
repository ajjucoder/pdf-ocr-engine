import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PdfUploader } from "../pdf-uploader"

// Mock URL methods
const mockCreateObjectURL = vi.fn(() => "blob:test-url")
const mockRevokeObjectURL = vi.fn()

// Mock fetch
const mockFetch = vi.fn()

describe("PdfUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const createMockPdfFile = () => {
    return new File(["test pdf content"], "test.pdf", { type: "application/pdf" })
  }

  const mockSuccessfulConversion = () => {
    const mockBlob = new Blob(["converted pdf content"], { type: "application/pdf" })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="searchable-test.pdf"',
      }),
      blob: () => Promise.resolve(mockBlob),
    })
    return mockBlob
  }

  it("renders the upload zone initially", () => {
    render(<PdfUploader />)
    expect(screen.getByText("Drop your PDF here")).toBeInTheDocument()
    expect(screen.getByText("or click to browse")).toBeInTheDocument()
  })

  it("shows convert button after file selection", async () => {
    const user = userEvent.setup()
    render(<PdfUploader />)
    
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await user.upload(input, file)
    
    expect(screen.getByText("Convert to Searchable PDF")).toBeInTheDocument()
  })

  it("rejects non-PDF files on selection", () => {
    render(<PdfUploader />)

    const txtFile = new File(["hello"], "notes.txt", { type: "text/plain" })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [txtFile] } })

    expect(screen.getByText("Please upload a PDF file")).toBeInTheDocument()
    expect(screen.queryByText("Convert to Searchable PDF")).not.toBeInTheDocument()
  })

  it("rejects oversized PDF files", async () => {
    const user = userEvent.setup()
    render(<PdfUploader />)

    const largePdf = new File(["x"], "large.pdf", { type: "application/pdf" })
    Object.defineProperty(largePdf, "size", { value: 51 * 1024 * 1024 })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, largePdf)

    expect(screen.getByText("File is too large. Maximum size is 50 MB.")).toBeInTheDocument()
    expect(screen.queryByText("Convert to Searchable PDF")).not.toBeInTheDocument()
  })

  it("shows a timeout error when conversion exceeds the request limit", async () => {
    const originalSetTimeout = global.setTimeout
    vi.spyOn(global, "setTimeout").mockImplementation(
      ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === 300000) {
          Promise.resolve().then(() => {
            if (typeof handler === "function") {
              handler(...args)
            }
          })
          return 0 as unknown as ReturnType<typeof setTimeout>
        }
        return originalSetTimeout(handler, timeout, ...args)
      }) as typeof setTimeout
    )

    render(<PdfUploader />)

    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    mockFetch.mockImplementation((_url, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined
      return new Promise((_resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"))
          return
        }
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        )
      })
    })

    fireEvent.click(screen.getByText("Convert to Searchable PDF"))

    await waitFor(() => {
      expect(
        screen.getByText("Request timed out. The PDF may be too large or complex.")
      ).toBeInTheDocument()
    })
  })

  it("shows 'Click to download' button after conversion completes", async () => {
    const user = userEvent.setup()
    render(<PdfUploader />)
    
    // Upload a file
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    
    // Mock successful conversion
    mockSuccessfulConversion()
    
    // Click convert
    const convertButton = screen.getByText("Convert to Searchable PDF")
    await user.click(convertButton)
    
    // Wait for conversion to complete
    await waitFor(() => {
      expect(screen.getByText("Click to download")).toBeInTheDocument()
    })
    
    // Verify the success message
    expect(screen.getByText("Conversion complete! Click the button below to download.")).toBeInTheDocument()
  })

  it("shows 'Download again' button after clicking download", async () => {
    const user = userEvent.setup()
    
    // Mock document.createElement and appendChild for download link
    const mockClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === "a") {
        element.click = mockClick
      }
      return element
    })
    
    render(<PdfUploader />)
    
    // Upload a file
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    
    // Mock successful conversion
    mockSuccessfulConversion()
    
    // Click convert
    const convertButton = screen.getByText("Convert to Searchable PDF")
    await user.click(convertButton)
    
    // Wait for "Click to download" button
    await waitFor(() => {
      expect(screen.getByText("Click to download")).toBeInTheDocument()
    })
    
    // Click download button
    const downloadButton = screen.getByText("Click to download")
    await user.click(downloadButton)
    
    // Wait for state change - use fake timers for the setTimeout in triggerDownload
    await waitFor(() => {
      expect(screen.getByText("Download again")).toBeInTheDocument()
    }, { timeout: 500 })
    
    // Verify success message changed
    expect(screen.getByText("File downloaded successfully.")).toBeInTheDocument()
  })

  it("allows re-downloading after initial download", async () => {
    const user = userEvent.setup()
    
    // Mock document.createElement for download link
    const mockClick = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === "a") {
        element.click = mockClick
      }
      return element
    })
    
    render(<PdfUploader />)
    
    // Upload a file
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    
    // Mock successful conversion
    mockSuccessfulConversion()
    
    // Click convert
    const convertButton = screen.getByText("Convert to Searchable PDF")
    await user.click(convertButton)
    
    // Wait for "Click to download"
    await waitFor(() => {
      expect(screen.getByText("Click to download")).toBeInTheDocument()
    })
    
    // First download
    await user.click(screen.getByText("Click to download"))
    
    // Wait for "Download again"
    await waitFor(() => {
      expect(screen.getByText("Download again")).toBeInTheDocument()
    }, { timeout: 500 })
    
    // Click "Download again"
    const downloadAgainButton = screen.getByText("Download again")
    await user.click(downloadAgainButton)
    
    // Button should still say "Download again"
    await waitFor(() => {
      expect(screen.getByText("Download again")).toBeInTheDocument()
    })
  })

  it("shows 'Convert Another PDF' button after conversion", async () => {
    const user = userEvent.setup()
    render(<PdfUploader />)
    
    // Upload a file
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    
    // Mock successful conversion
    mockSuccessfulConversion()
    
    // Click convert
    const convertButton = screen.getByText("Convert to Searchable PDF")
    await user.click(convertButton)
    
    // Wait for conversion to complete
    await waitFor(() => {
      expect(screen.getByText("Click to download")).toBeInTheDocument()
    })
    
    // Convert Another PDF button should be visible
    expect(screen.getByText("Convert Another PDF")).toBeInTheDocument()
  })

  it("resets state when clicking 'Convert Another PDF'", async () => {
    const user = userEvent.setup()
    render(<PdfUploader />)
    
    // Upload a file
    const file = createMockPdfFile()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    
    // Mock successful conversion
    mockSuccessfulConversion()
    
    // Click convert
    const convertButton = screen.getByText("Convert to Searchable PDF")
    await user.click(convertButton)
    
    // Wait for conversion
    await waitFor(() => {
      expect(screen.getByText("Click to download")).toBeInTheDocument()
    })
    
    // Click "Convert Another PDF"
    const resetButton = screen.getByText("Convert Another PDF")
    await user.click(resetButton)
    
    // Should be back to initial state
    expect(screen.getByText("Drop your PDF here")).toBeInTheDocument()
    expect(screen.queryByText("Click to download")).not.toBeInTheDocument()
    expect(screen.queryByText("Download again")).not.toBeInTheDocument()
  })

  describe("download timing fix", () => {
    it("does not revoke blob URL immediately after click (regression test for download stuck bug)", async () => {
      const user = userEvent.setup()
      
      // Mock document.createElement for download link
      const mockClick = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName)
        if (tagName === "a") {
          element.click = mockClick
        }
        return element
      })
      
      render(<PdfUploader />)
      
      // Upload a file
      const file = createMockPdfFile()
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      
      // Mock successful conversion
      mockSuccessfulConversion()
      
      // Click convert
      const convertButton = screen.getByText("Convert to Searchable PDF")
      await user.click(convertButton)
      
      // Wait for "Click to download"
      await waitFor(() => {
        expect(screen.getByText("Click to download")).toBeInTheDocument()
      })
      
      // Clear any previous calls
      mockRevokeObjectURL.mockClear()
      
      // Click download button
      const downloadButton = screen.getByText("Click to download")
      await user.click(downloadButton)
      
      // Wait for the click to be triggered (uses setTimeout 0)
      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled()
      })
      
      // The key assertion: revokeObjectURL should NOT be called immediately
      // It should only be called after DOWNLOAD_CLEANUP_DELAY_MS (60 seconds)
      // If called too early (e.g., 100ms), downloads get stuck at 100%
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
      
      // Even after a short wait, it should still not be revoked
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(mockRevokeObjectURL).not.toHaveBeenCalled()
    })

    it("verifies blob URL stays valid long enough for browser to complete download", async () => {
      const user = userEvent.setup()
      
      // Track when URL was created vs revoked
      let urlCreatedAt: number | null = null
      let urlRevokedAt: number | null = null
      
      const trackedCreateObjectURL = vi.fn(() => {
        urlCreatedAt = Date.now()
        return "blob:test-url"
      })
      
      const trackedRevokeObjectURL = vi.fn(() => {
        urlRevokedAt = Date.now()
      })
      
      global.URL.createObjectURL = trackedCreateObjectURL
      global.URL.revokeObjectURL = trackedRevokeObjectURL
      
      // Mock document.createElement for download link
      const mockClick = vi.fn()
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName)
        if (tagName === "a") {
          element.click = mockClick
        }
        return element
      })
      
      render(<PdfUploader />)
      
      // Upload a file
      const file = createMockPdfFile()
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      
      // Mock successful conversion
      mockSuccessfulConversion()
      
      // Click convert
      const convertButton = screen.getByText("Convert to Searchable PDF")
      await user.click(convertButton)
      
      // Wait for "Click to download"
      await waitFor(() => {
        expect(screen.getByText("Click to download")).toBeInTheDocument()
      })
      
      // Click download button
      const downloadButton = screen.getByText("Click to download")
      await user.click(downloadButton)
      
      // Wait for the click to be triggered
      await waitFor(() => {
        expect(mockClick).toHaveBeenCalled()
      })
      
      // URL should have been created
      expect(urlCreatedAt).not.toBeNull()
      
      // URL should NOT be revoked yet (this was the bug - it was revoked after only 100ms)
      expect(urlRevokedAt).toBeNull()
    })
  })
})
