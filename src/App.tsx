import { useCallback, useEffect, useState } from 'react'
import { SceneCanvas } from './render/SceneCanvas'
import { TopBar } from './ui/TopBar'
import { EditControls, RunControls, WorldButton } from './ui/Controls'
import { WorldPanel } from './ui/WorldPanel'
import { StatusLine } from './ui/StatusLine'
import { SheetBackdrop } from './ui/SheetBackdrop'
import { EmptyState } from './ui/EmptyState'
import { DrawingOverlay } from './ui/DrawingOverlay'
import { Tutorial } from './ui/Tutorial'
import { PendingStrokePicker } from './ui/PendingStrokePicker'
import { SelectionBar } from './ui/SelectionBar'
import { ExampleNotes } from './ui/ExampleNotes'
import { HelpDialog } from './ui/HelpDialog'
import { WebcamPanel } from './ui/WebcamPanel'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
import { useAppState } from './ui/hooks'
import { appStore } from './store/appStore'

/** Keep the document's theme attribute and the browser's theme color in step with the store. */
function useDocumentTheme() {
  const theme = useAppState((s) => s.theme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()
    if (paper) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper)
  }, [theme])

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const follow = () => appStore.followSystemTheme(query.matches)
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [])
}

export default function App() {
  const tutorialDismissed = useAppState((s) => s.tutorialDismissed)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const [helpOpen, setHelpOpen] = useState(false)
  const [worldOpen, setWorldOpen] = useState(false)
  const closeWorld = useCallback(() => setWorldOpen(false), [])
  const dialogOpen = helpOpen || !tutorialDismissed

  useDocumentTheme()
  useGlobalShortcuts({
    dialogOpen,
    onToggleHelp: () => tutorialDismissed && setHelpOpen((open) => !open),
    onEscape: () => (tutorialDismissed ? setHelpOpen(false) : appStore.dismissTutorial()),
  })

  return (
    <>
      <div className="app" inert={dialogOpen} aria-hidden={dialogOpen || undefined}>
        <TopBar onOpenHelp={() => setHelpOpen(true)} />
        <ExampleNotes />
        <main className="stage">
          <SheetBackdrop />
          <SceneCanvas />
          <EmptyState />
          <DrawingOverlay enabled={!dialogOpen} />
          <SelectionBar />
          <PendingStrokePicker />
          <WebcamPanel active={webcamEnabled && !dialogOpen} onClose={() => appStore.setWebcamEnabled(false)} />
        </main>
        <footer className="bottombar">
          <div className="bottombar-start">
            <EditControls />
            <WorldButton open={worldOpen} onToggle={() => setWorldOpen((open) => !open)} />
            {worldOpen && !dialogOpen && <WorldPanel onClose={closeWorld} />}
          </div>
          <RunControls />
          <StatusLine />
        </footer>
      </div>

      {!tutorialDismissed && <Tutorial />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </>
  )
}
