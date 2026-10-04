import { useEffect } from 'react'
import { appStore } from '../store/appStore'

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const ACTIVATABLE = 'button, a[href], summary, [role="button"]'

interface Handlers {
  dialogOpen: boolean
  onToggleHelp: () => void
  onEscape: () => void
}

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
      if (command) return

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
