import { appStore } from '../store/appStore'
import { useAppState, useCompact } from './hooks'
import { screenAnchor } from '../coords/bounds'
import { DeleteIcon, DuplicateIcon, RotateLeftIcon, RotateRightIcon } from './icons'
import { ROTATE_STEP } from './useGlobalShortcuts'

/** Gap between the shape and the bar and the margin it keeps from the stage edges, in CSS pixels. */
const GAP = 10
const EDGE = 8
/** Button size inside the bar (32px; 44px touch targets on a phone) plus the bar's 1px frame and 1px gaps. */
const BUTTON = 32
const BUTTON_COMPACT = 44

/** Rotate, duplicate, and delete buttons next to the selected shape. Released balls belong to the physics engine and get none. */
export function SelectionBar() {
  const selectedId = useAppState((s) => s.selectedId)
  const objects = useAppState((s) => s.objects)
  const view = useAppState((s) => s.view)
  const compact = useCompact()
  const object = objects.find((o) => o.id === selectedId)
  if (!object || (object.kind === 'ball' && object.dynamic)) return null

  const size = compact ? BUTTON_COMPACT : BUTTON
  const buttons = object.kind === 'ball' ? 2 : 4
  const BAR_H = size + 2
  const width = buttons * size + (buttons - 1) + 2
  const anchor = screenAnchor(object, view, width / 2)
  const above = anchor.y - anchor.reach - GAP - BAR_H >= EDGE
  const left = Math.min(Math.max(anchor.x, width / 2 + EDGE), view.width - width / 2 - EDGE)
  const top = above ? anchor.y - anchor.reach - GAP - BAR_H : Math.min(anchor.y + anchor.reach + GAP, view.height - BAR_H - EDGE)
  const turn = (degrees: number) => appStore.rotateSelected((degrees * Math.PI) / 180)

  return (
    <div className="group selection-bar" role="toolbar" aria-label={`Selected ${object.kind}`} style={{ left, top }}>
      {object.kind !== 'ball' && (
        <>
          <button type="button" className="btn square" aria-label="Rotate counterclockwise" title={`Rotate ${ROTATE_STEP * 3}° counterclockwise ({ or [ for ${ROTATE_STEP}°)`} onClick={() => turn(ROTATE_STEP * 3)}>
            <RotateLeftIcon />
          </button>
          <button type="button" className="btn square" aria-label="Rotate clockwise" title={`Rotate ${ROTATE_STEP * 3}° clockwise (} or ] for ${ROTATE_STEP}°)`} onClick={() => turn(-ROTATE_STEP * 3)}>
            <RotateRightIcon />
          </button>
        </>
      )}
      <button type="button" className="btn square" aria-label="Duplicate" title="Duplicate (Ctrl+D)" onClick={() => appStore.duplicateSelected()}>
        <DuplicateIcon />
      </button>
      <button type="button" className="btn square" aria-label="Delete" title="Delete (Delete)" onClick={() => appStore.deleteSelected()}>
        <DeleteIcon />
      </button>
    </div>
  )
}
