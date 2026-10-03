import { useEffect } from 'react'
import { appStore } from '../store/appStore'

const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
const ACTIVATABLE = 'button, a[href], summary, [role="button"]'

interface Handlers {
  dialogOpen: boolean
  onToggleHelp: () => void
  onEscape: () => void
}

export function useGlobalShortcuts({ dialogOpen, onToggleHelp, onEscape }: Handlers): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(EDITABLE)) return

      if (e.key === 'Escape') {
        onEscape()
        return
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        onToggleHelp()
        return
      }
      if (dialogOpen) return

      if (e.key === ' ') {
        if (target?.closest(ACTIVATABLE)) return
        e.preventDefault()
        appStore.togglePause()
        return
      }
      const key = e.key.toLowerCase()
      const action =
        key === 'z' ? appStore.undo
        : key === 'r' ? appStore.resetScene
        : key === 'd' ? appStore.dropBall
        : key === 'f' ? appStore.freezeBalls
        : null
      if (!action) return
      e.preventDefault()
      action.call(appStore)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogOpen, onToggleHelp, onEscape])
}
