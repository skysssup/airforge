import { appStore } from '../store/appStore'
import { useAppState } from './hooks'
import { shapeToObjectKind } from '../shapes/recognize'

export function SuggestionPicker() {
  const { suggestion } = useAppState()
  if (!suggestion) return null

  const primaryKind = suggestion.primary
    ? shapeToObjectKind(suggestion.primary.kind)
    : null

  return (
    <div className="suggestion-panel" role="region" aria-label="Shape suggestion">
      <div className="suggestion-inner">
        <p>
          {suggestion.primary
            ? `Detected ${suggestion.primary.kind} (quality ${suggestion.primary.quality.toFixed(2)})${
                suggestion.alternatives.length ? ' — ambiguous with alternatives' : ''
              }.`
            : 'Could not recognize a clean shape.'}{' '}
          Choose what to forge (stroke is kept until you discard):
        </p>
        <div className="suggestion-actions">
          <button
            type="button"
            className={`btn ${primaryKind === 'ramp' ? 'primary' : ''}`}
            onClick={() => appStore.resolveSuggestion('ramp')}
          >
            Ramp
          </button>
          <button
            type="button"
            className={`btn ${primaryKind === 'ball' ? 'primary' : ''}`}
            onClick={() => appStore.resolveSuggestion('ball')}
          >
            Ball
          </button>
          <button
            type="button"
            className={`btn ${primaryKind === 'platform' ? 'primary' : ''}`}
            onClick={() => appStore.resolveSuggestion('platform')}
          >
            Platform
          </button>
          <button type="button" className="btn danger" onClick={() => appStore.resolveSuggestion('discard')}>
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}
