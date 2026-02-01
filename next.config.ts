import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "canvas", "pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig
