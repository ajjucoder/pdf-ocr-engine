import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DesignShowcase } from "../design-showcase"

describe("DesignShowcase", () => {
  it("renders the first design initially", () => {
    render(<DesignShowcase />)

    expect(screen.getByText("The Atlas Scanroom")).toBeInTheDocument()
    expect(screen.getByText("DESIGN 1 / 5")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous design" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next design" })).toBeEnabled()
  })

  it("moves forward and backward through designs", async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)

    await user.click(screen.getByRole("button", { name: "Next design" }))
    expect(screen.getByText("RAW SCAN // MACHINE COPY")).toBeInTheDocument()
    expect(screen.getByText("DESIGN 2 / 5")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous design" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Previous design" }))
    expect(screen.getByText("The Atlas Scanroom")).toBeInTheDocument()
    expect(screen.getByText("DESIGN 1 / 5")).toBeInTheDocument()
  })

  it("disables next navigation on the final design", async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)

    const nextButton = screen.getByRole("button", { name: "Next design" })
    await user.click(nextButton)
    await user.click(nextButton)
    await user.click(nextButton)
    await user.click(nextButton)

    expect(screen.getByText("Sunrise Bento Lab")).toBeInTheDocument()
    expect(screen.getByText("DESIGN 5 / 5")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next design" })).toBeDisabled()
  })
})
