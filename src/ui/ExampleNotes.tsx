import { useEffect, useRef, useState } from 'react'
import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { findExample, type Example } from '../examples'
import { CloseIcon } from './icons'

/**
 * A strip under the top bar: what the open example shows and what to try next.
 * On a phone it is one 44px row ("Curve Race · About"); About opens the notes as a bottom sheet.
 */
export function ExampleNotes() {
  const exampleId = useAppState((s) => s.exampleId)
  const example = exampleId ? findExample(exampleId) : undefined
  // Keyed by example, so About starts closed for each newly opened example.
  return example ? <Notes key={example.id} example={example} /> : null
}

function Notes({ example }: { example: Example }) {
  const [about, setAbout] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!about) return
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setAbout(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setAbout(false)
      ref.current?.querySelector<HTMLElement>('.about-button')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [about])

  return (
    <aside ref={ref} className={`notes${about ? ' about-open' : ''}`} aria-label={`About the ${example.title} example`}>
      <h2 className="notes-title">{example.title}</h2>
      <div className="notes-body" id="example-notes-body">
        <p className="notes-summary">{example.summary}</p>
        <p className="try">
          <span className="try-label">Try:</span> {example.tryNext}
        </p>
      </div>
      <button
        type="button"
        className="btn about-button compact-only"
        aria-label="About"
        aria-expanded={about}
        aria-controls="example-notes-body"
        title="What this example shows"
        onClick={() => setAbout((open) => !open)}
      >
        <span className="label">About</span>
      </button>
      <button type="button" className="btn square" onClick={() => appStore.closeExampleNotes()} aria-label="Close example notes" title="Close">
        <CloseIcon />
      </button>
    </aside>
  )
}
