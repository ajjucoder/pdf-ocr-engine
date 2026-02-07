import { describe, expect, it } from "vitest"
import { buildCopyFriendlyWordSequence } from "../builder"
import type { OcrResult } from "../types"

function word(
  text: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): OcrResult {
  return {
    text,
    confidence: 90,
    bbox: { x0, y0, x1, y1 },
  }
}

describe("buildCopyFriendlyWordSequence", () => {
  it("adds line breaks and tabs for table-like column gaps", () => {
    const words: OcrResult[] = [
      word("Qty", 180, 10, 220, 22),
      word("Item", 10, 10, 60, 22),
      word("Price", 320, 10, 370, 22),
      word("2", 190, 34, 205, 46),
      word("$3.00", 320, 34, 380, 46),
      word("Apple", 10, 34, 70, 46),
    ]

    const sequence = buildCopyFriendlyWordSequence(words).map((entry) => entry.text)

    expect(sequence).toEqual([
      "Item",
      "\tQty",
      "\tPrice",
      "\nApple",
      "\t2",
      "\t$3.00",
    ])
  })

  it("uses spaces for normal sentence-level gaps", () => {
    const words: OcrResult[] = [
      word("world", 62, 10, 104, 20),
      word("Hello", 10, 10, 56, 20),
      word("again", 108, 10, 150, 20),
    ]

    const sequence = buildCopyFriendlyWordSequence(words).map((entry) => entry.text)

    expect(sequence).toEqual(["Hello", " world", " again"])
  })

  it("filters malformed OCR words", () => {
    const words: OcrResult[] = [
      word("good", 10, 10, 40, 20),
      word("", 50, 10, 80, 20),
      word("bad-width", 100, 10, 100, 20),
      {
        text: "nan",
        confidence: 80,
        bbox: { x0: Number.NaN, y0: 0, x1: 10, y1: 10 },
      },
    ]

    const sequence = buildCopyFriendlyWordSequence(words).map((entry) => entry.text)
    expect(sequence).toEqual(["good"])
  })
})
