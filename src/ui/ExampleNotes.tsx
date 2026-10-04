import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { findExample } from '../examples'

/** What the open example shows and what to try next. */
export function ExampleNotes() {
  const exampleId = useAppState((s) => s.exampleId)
  const example = exampleId ? findExample(exampleId) : undefined
  if (!example) return null

  return (
    <aside className="example-notes" aria-label={`About the ${example.title} example`}>
      <p>
        <strong>{example.title}.</strong> {example.summary} <span className="muted">Try: {example.tryNext}</span>
      </p>
      <button type="button" className="btn small" onClick={() => appStore.closeExampleNotes()} aria-label="Close example notes">
        Close
      </button>
    </aside>
  )
}
