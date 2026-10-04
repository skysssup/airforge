import { useEffect } from 'react'
import { NUDGE_STEP, appStore } from '../store/appStore'

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const ACTIVATABLE = 'button, a[href], summary, [role="button"]'

interface Handlers {
  dialogOpen: boolean
  onToggleHelp: () => void
  onEscape: () => void
}

/** Rotation per press of [ or ], in degrees; with Shift ({ or }) it is three times as much. */
export const ROTATE_STEP = 5

const ARROWS: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, 1], arrowdown: [0, -1] }
const ROTATIONS: Record<string, number> = { '[': ROTATE_STEP, ']': -ROTATE_STEP, '{': ROTATE_STEP * 3, '}': -ROTATE_STEP * 3 }

const LETTER_ACTIONS: Record<string, () => void> = {
  d: () => appStore.drop(),
  r: () => appStore.restart(),
  f: () => appStore.freezeBalls(),
}

export function useGlobalShortcuts({ dialogOpen, onToggleHelp, onEscape }: Handlers): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(EDITABLE)) return
      const key = e.key.toLowerCase()
      const command = e.ctrlKey || e.metaKey

      if (key === 'escape' && !command) {
        if (dialogOpen) {
          onEscape()
        } else if (appStore.getState().pending) {
          appStore.resolvePending('discard')
        } else {
          appStore.clearSelection()
        }
        return
      }
      if (e.key === '?' && !command) {
        e.preventDefault()
        onToggleHelp()
        return
      }
      if (dialogOpen) return

      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) appStore.redo()
        else appStore.undo()
        return
      }
      // With a shape selected, Ctrl/Cmd+D duplicates it; otherwise the browser keeps the shortcut.
      const hasSelection = appStore.getState().selectedId !== null
      if (command && key === 'd' && hasSelection) {
        e.preventDefault()
        appStore.duplicateSelected()
        return
      }
      if (command) return

      const arrow = ARROWS[key]
      if (arrow && hasSelection) {
        e.preventDefault()
        const step = NUDGE_STEP * (e.shiftKey ? 10 : 1)
        appStore.nudgeSelected(arrow[0] * step, arrow[1] * step)
        return
      }
      const degrees = ROTATIONS[e.key]
      if (degrees !== undefined && hasSelection) {
        e.preventDefault()
        appStore.rotateSelected((degrees * Math.PI) / 180)
        return
      }

      if (key === ' ') {
        if (target?.closest(ACTIVATABLE)) return
        e.preventDefault()
        appStore.togglePause()
        return
      }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        appStore.deleteSelected()
        return
      }
      const action = e.shiftKey ? undefined : LETTER_ACTIONS[key]
      if (!action) return
      e.preventDefault()
      action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogOpen, onToggleHelp, onEscape])
}
