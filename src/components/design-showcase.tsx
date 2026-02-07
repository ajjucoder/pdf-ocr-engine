"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface DesignDefinition {
  id: string
  title: string
  mood: string
  render: () => ReactNode
}

const designs: DesignDefinition[] = [
  {
    id: "editorial",
    title: "The Atlas Scanroom",
    mood: "Editorial Archive",
    render: () => <EditorialDesign />,
  },
  {
    id: "brutalist",
    title: "RAW SCAN // MACHINE COPY",
    mood: "Digital Brutalism",
    render: () => <BrutalistDesign />,
  },
  {
    id: "glass",
    title: "Aurora Layer Studio",
    mood: "Glass + Neon Atmosphere",
    render: () => <GlassDesign />,
  },
  {
    id: "terminal",
    title: "Monochrome Terminal",
    mood: "Retro Console Utility",
    render: () => <TerminalDesign />,
  },
  {
    id: "bento",
    title: "Sunrise Bento Lab",
    mood: "Playful Product Grid",
    render: () => <BentoDesign />,
  },
]

export function DesignShowcase() {
  const [index, setIndex] = useState(0)

  const atStart = index === 0
  const atEnd = index === designs.length - 1
  const activeDesign = designs[index]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1))
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(designs.length - 1, current + 1))
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/30 bg-black/45 px-4 py-2 text-xs tracking-[0.25em] text-white backdrop-blur-md">
        DESIGN {index + 1} / {designs.length}
      </div>

      <div key={activeDesign.id} className="fd-page-enter min-h-screen">
        {activeDesign.render()}
      </div>

      <div className="fixed bottom-5 left-5 z-50">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={atStart}
          aria-label="Previous design"
          className="flex items-center gap-2 rounded-full border border-white/30 bg-black/50 px-4 py-2 text-sm tracking-wide text-white backdrop-blur-md transition hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Prev
        </button>
      </div>

      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(designs.length - 1, current + 1))}
          disabled={atEnd}
          aria-label="Next design"
          className="flex items-center gap-2 rounded-full border border-white/30 bg-black/50 px-4 py-2 text-sm tracking-wide text-white backdrop-blur-md transition hover:bg-black/65 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/30 bg-black/40 px-3 py-2 backdrop-blur-md">
          {designs.map((design, dotIndex) => (
            <button
              type="button"
              key={design.id}
              onClick={() => setIndex(dotIndex)}
              aria-label={`Go to design ${dotIndex + 1}`}
              className={`h-2.5 w-2.5 rounded-full transition ${
                dotIndex === index ? "bg-white" : "bg-white/35 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="fixed top-14 left-1/2 z-50 -translate-x-1/2 text-center text-[11px] uppercase tracking-[0.28em] text-white/85">
        <p className="fd-font-body-sans mb-1 tracking-[0.18em] text-white">{activeDesign.title}</p>
        <p>{activeDesign.mood}</p>
      </div>
    </main>
  )
}

function EditorialDesign() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#f2eadf] px-6 py-20 text-[#1e1b19] sm:px-10 lg:px-16">
      <div className="fd-editorial-texture pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col justify-between border border-[#2f2a25]/20 bg-[#f8f3eb]/80 p-6 shadow-[0_24px_80px_rgba(47,42,37,0.12)] backdrop-blur-[1px] sm:p-10">
        <header className="space-y-4 border-b border-[#2f2a25]/20 pb-6">
          <p className="fd-font-editorial-body text-xs tracking-[0.35em] text-[#4a433b]">
            ARCHIVE ISSUE 05
          </p>
          <h1 className="fd-font-editorial-display text-5xl leading-[0.95] sm:text-7xl">
            SCANNED PAGES,
            <br />
            FINDABLE THOUGHTS
          </h1>
        </header>

        <div className="grid gap-8 py-8 md:grid-cols-[1.3fr_1fr]">
          <article className="space-y-5">
            <p className="fd-font-editorial-body max-w-xl text-lg leading-relaxed text-[#312c26]">
              A front-end concept for a document restoration product where every scanned page keeps
              its visual character while gaining clean, selectable text.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-[#2f2a25]/20 bg-[#f5eee3] p-4">
                <p className="fd-font-editorial-display text-3xl">1.2M</p>
                <p className="fd-font-editorial-body text-xs tracking-[0.18em] text-[#5c544b]">
                  PAGES PROCESSED
                </p>
              </div>
              <div className="rounded-md border border-[#2f2a25]/20 bg-[#f5eee3] p-4">
                <p className="fd-font-editorial-display text-3xl">94%</p>
                <p className="fd-font-editorial-body text-xs tracking-[0.18em] text-[#5c544b]">
                  TABLE RETENTION
                </p>
              </div>
              <div className="rounded-md border border-[#2f2a25]/20 bg-[#f5eee3] p-4">
                <p className="fd-font-editorial-display text-3xl">42s</p>
                <p className="fd-font-editorial-body text-xs tracking-[0.18em] text-[#5c544b]">
                  MEDIAN TURNAROUND
                </p>
              </div>
            </div>
          </article>

          <aside className="fd-font-editorial-body rounded-lg border border-[#2f2a25]/20 bg-[#e9ded0]/65 p-6 text-sm leading-relaxed text-[#302a24]">
            <p className="mb-3 text-xs tracking-[0.2em] text-[#5c544b]">FIELD NOTES</p>
            <p>
              Intended for legal bundles, old contracts, and historical reports where visual
              fidelity matters as much as copyable text.
            </p>
            <ul className="mt-4 space-y-2 border-t border-[#2f2a25]/15 pt-4">
              <li>• Optical text layer matches source geometry.</li>
              <li>• Existing digital text remains untouched.</li>
              <li>• Table spacing can be copied with structure hints.</li>
            </ul>
          </aside>
        </div>

        <footer className="fd-font-editorial-body flex flex-wrap items-center justify-between gap-3 border-t border-[#2f2a25]/20 pt-5 text-xs tracking-[0.25em] text-[#544b42]">
          <span>THE ATLAS SCANROOM</span>
          <span>FRONTEND CONCEPT ONE</span>
        </footer>
      </div>
    </section>
  )
}

function BrutalistDesign() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#090909] px-6 py-20 text-[#f6f6f6] sm:px-10">
      <div className="fd-grid-hatch pointer-events-none absolute inset-0 opacity-25" />
      <div className="fd-float-slow absolute -left-24 top-10 h-72 w-72 rotate-12 bg-[#f4c806]" />
      <div className="fd-float-mid absolute -right-20 bottom-16 h-56 w-56 -rotate-6 bg-[#d42e22]" />

      <div className="relative mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.45fr_1fr]">
        <article className="border-4 border-[#f6f6f6] bg-[#131313] p-6 shadow-[12px_12px_0_#f4c806] sm:p-8">
          <p className="fd-font-industrial text-xs tracking-[0.3em] text-[#f4c806]">MODE: UNSAFE</p>
          <h2 className="fd-font-industrial mt-4 text-4xl uppercase leading-[0.9] sm:text-6xl">
            RAW SCANS
            <br />
            NEED
            <br />
            ORDER.
          </h2>
          <p className="fd-font-body-sans mt-6 max-w-xl text-base text-[#dfdfdf] sm:text-lg">
            This concept uses loud hierarchy and high-contrast geometry to feel operational and
            unapologetic.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border-2 border-[#f6f6f6] bg-[#090909] p-3">
              <p className="fd-font-industrial text-2xl">01</p>
              <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">Drop scan</p>
            </div>
            <div className="border-2 border-[#f6f6f6] bg-[#090909] p-3">
              <p className="fd-font-industrial text-2xl">02</p>
              <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">Extract text</p>
            </div>
            <div className="border-2 border-[#f6f6f6] bg-[#090909] p-3">
              <p className="fd-font-industrial text-2xl">03</p>
              <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">Ship PDF</p>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="border-4 border-[#f6f6f6] bg-[#f4c806] p-5 text-[#0f0f0f] shadow-[8px_8px_0_#d42e22]">
            <p className="fd-font-industrial text-xs uppercase tracking-[0.2em]">Warning</p>
            <p className="fd-font-industrial mt-2 text-2xl uppercase">No fake polish.</p>
          </div>
          <div className="border-4 border-[#f6f6f6] bg-[#111] p-5">
            <p className="fd-font-industrial text-sm uppercase tracking-[0.18em] text-[#f4c806]">
              Throughput
            </p>
            <p className="fd-font-industrial mt-3 text-5xl">27k</p>
            <p className="fd-font-body-sans mt-2 text-sm text-[#cbcbcb]">documents/week</p>
          </div>
          <div className="border-4 border-[#f6f6f6] bg-[#d42e22] p-5 text-white">
            <p className="fd-font-body-sans text-sm leading-relaxed">
              OCR layer alignment stays accurate even when scanned documents contain dense tables.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function GlassDesign() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#08161f] px-6 py-20 text-[#eefaff] sm:px-10">
      <div className="fd-aurora-bg pointer-events-none absolute inset-0" />
      <div className="fd-float-slow absolute -left-20 top-20 h-64 w-64 rounded-full bg-[#35f2d0]/35 blur-3xl" />
      <div className="fd-float-mid absolute right-10 top-24 h-80 w-80 rounded-full bg-[#4f78ff]/40 blur-3xl" />
      <div className="fd-float-fast absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-[#ff6b8e]/35 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <p className="fd-font-futuristic text-xs uppercase tracking-[0.35em] text-[#b6f8ee]">
            AURORA LAYER STUDIO
          </p>
          <h2 className="fd-font-futuristic mt-4 text-4xl sm:text-6xl">MAKE STATIC PAGES SEARCHABLE</h2>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="fd-glass-card md:col-span-2">
            <p className="fd-font-body-sans text-base leading-relaxed text-[#def7ff]">
              Optical text is mapped behind image surfaces with positional precision. The visible
              scan remains untouched while search and copy become effortless.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/8 p-4">
                <p className="fd-font-futuristic text-3xl">99.1%</p>
                <p className="fd-font-body-sans mt-1 text-xs uppercase tracking-[0.2em]">
                  confidence
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/8 p-4">
                <p className="fd-font-futuristic text-3xl">5</p>
                <p className="fd-font-body-sans mt-1 text-xs uppercase tracking-[0.2em]">
                  visual themes
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/8 p-4">
                <p className="fd-font-futuristic text-3xl">0</p>
                <p className="fd-font-body-sans mt-1 text-xs uppercase tracking-[0.2em]">
                  external APIs
                </p>
              </div>
            </div>
          </article>

          <aside className="fd-glass-card">
            <p className="fd-font-futuristic text-sm uppercase tracking-[0.24em] text-[#ccfff7]">
              Live Queue
            </p>
            <ul className="fd-font-body-sans mt-4 space-y-3 text-sm text-[#def7ff]">
              <li className="rounded-lg border border-white/15 bg-white/8 p-3">archive_1987.pdf</li>
              <li className="rounded-lg border border-white/15 bg-white/8 p-3">trial_bundle_scan.pdf</li>
              <li className="rounded-lg border border-white/15 bg-white/8 p-3">invoice_pack_q3.pdf</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}

function TerminalDesign() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#040708] px-6 py-20 text-[#96ffba] sm:px-10">
      <div className="fd-terminal-grid pointer-events-none absolute inset-0 opacity-45" />

      <div className="relative mx-auto max-w-6xl rounded-2xl border border-[#1d6934] bg-[#07110b]/95 p-6 shadow-[0_0_0_1px_rgba(28,111,54,0.45),0_24px_100px_rgba(0,0,0,0.55)] sm:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#1e7a3a]/55 pb-4">
          <h2 className="fd-font-terminal text-2xl sm:text-4xl">MONOCHROME TERMINAL UI</h2>
          <p className="fd-font-terminal text-xs uppercase tracking-[0.2em] text-[#7ce39f]">
            static preview mode
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <article className="rounded-xl border border-[#1e7a3a]/60 bg-[#051009] p-5">
            <p className="fd-font-terminal text-sm text-[#79d696]">$ pipeline --dry-run scanned_document.pdf</p>
            <div className="fd-font-terminal mt-4 space-y-2 text-sm text-[#89f0a8]">
              <p>&gt; detect-pages .......... done</p>
              <p>&gt; text-layer check ...... mixed-content</p>
              <p>&gt; ocr image pages ....... enabled</p>
              <p>&gt; table spacing hints ... enabled</p>
              <p>&gt; output ................ searchable.pdf</p>
            </div>
          </article>

          <aside className="rounded-xl border border-[#1e7a3a]/60 bg-[#051009] p-5">
            <p className="fd-font-terminal text-xs uppercase tracking-[0.16em] text-[#7ce39f]">
              operational values
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCell label="queue" value="11" />
              <MetricCell label="workers" value="4" />
              <MetricCell label="uptime" value="99.9%" />
              <MetricCell label="alerts" value="0" />
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-xl border border-[#1e7a3a]/60 bg-[#051009] p-5">
          <p className="fd-font-terminal text-sm leading-relaxed text-[#8ef2ac]">
            Design intent: utilitarian confidence for teams that want a dashboard that feels precise,
            quiet, and technical.
          </p>
        </div>
      </div>
    </section>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#1e7a3a]/60 bg-[#08140d] p-3">
      <p className="fd-font-terminal text-xs uppercase tracking-[0.12em] text-[#6ed08d]">{label}</p>
      <p className="fd-font-terminal mt-2 text-xl text-[#98ffbc]">{value}</p>
    </div>
  )
}

function BentoDesign() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#fff5e9] px-6 py-20 text-[#2b1d0f] sm:px-10">
      <div className="fd-bento-sunburst pointer-events-none absolute inset-0 opacity-75" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 text-center">
          <p className="fd-font-friendly text-xs uppercase tracking-[0.3em] text-[#a4601e]">
            SUNRISE BENTO LAB
          </p>
          <h2 className="fd-font-friendly mt-3 text-4xl sm:text-6xl">FIVE STATIC CONCEPTS, ONE STAGE</h2>
        </header>

        <div className="grid gap-4 md:grid-cols-6 md:grid-rows-[180px_180px_180px]">
          <article className="fd-bento-card md:col-span-4 md:row-span-2">
            <p className="fd-font-body-sans text-lg leading-relaxed text-[#4d2f18]">
              A warm, product-focused layout that highlights outcomes first. Great for demo pages and
              stakeholder walkthroughs.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#ffd8af] p-3 text-center">
                <p className="fd-font-friendly text-2xl">8x</p>
                <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">speed</p>
              </div>
              <div className="rounded-2xl bg-[#ffca8a] p-3 text-center">
                <p className="fd-font-friendly text-2xl">5</p>
                <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">themes</p>
              </div>
              <div className="rounded-2xl bg-[#ffb974] p-3 text-center">
                <p className="fd-font-friendly text-2xl">A+</p>
                <p className="fd-font-body-sans text-xs uppercase tracking-[0.12em]">clarity</p>
              </div>
            </div>
          </article>

          <article className="fd-bento-card fd-bento-card-alt md:col-span-2">
            <p className="fd-font-friendly text-2xl">Preview</p>
            <p className="fd-font-body-sans mt-2 text-sm text-[#5f3d22]">
              Swipe designs from corner controls.
            </p>
          </article>

          <article className="fd-bento-card md:col-span-2">
            <p className="fd-font-friendly text-2xl">Edge Cases</p>
            <p className="fd-font-body-sans mt-2 text-sm text-[#5f3d22]">
              Table copy, mixed text pages, and large files.
            </p>
          </article>

          <article className="fd-bento-card fd-bento-card-alt md:col-span-2">
            <p className="fd-font-friendly text-2xl">No API Keys</p>
            <p className="fd-font-body-sans mt-2 text-sm text-[#5f3d22]">
              Local OCR stack, production-friendly boundaries.
            </p>
          </article>

          <article className="fd-bento-card md:col-span-2">
            <p className="fd-font-friendly text-2xl">Ready</p>
            <p className="fd-font-body-sans mt-2 text-sm text-[#5f3d22]">
              Static frontend concepts for your next pass.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
