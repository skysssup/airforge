import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { EXAMPLES, findExample } from '../examples'
import { CloseIcon } from './icons'

const pad = (n: number) => String(n).padStart(2, '0')

/** A strip under the top bar: what the open example shows and what to try next. */
export function ExampleNotes() {
  const exampleId = useAppState((s) => s.exampleId)
  const example = exampleId ? findExample(exampleId) : undefined
  if (!example) return null

  return (
    <aside className="notes" aria-label={`About the ${example.title} example`}>
      <span className="notes-index t-ui">
        Example {pad(EXAMPLES.indexOf(example) + 1)}
        <span className="muted">/{pad(EXAMPLES.length)}</span>
      </span>
      <div className="notes-text">
        <p>
          <strong className="notes-title">{example.title}</strong> {example.summary}
        </p>
        <p className="try">
          <span className="t-label">Try</span> {example.tryNext}
        </p>
      </div>
      <button type="button" className="btn square" onClick={() => appStore.closeExampleNotes()} aria-label="Close example notes" title="Close">
        <CloseIcon />
      </button>
    </aside>
  )
}
