import { useState } from 'react'
import { SceneCanvas } from './render/SceneCanvas'
import { Toolbar } from './ui/Toolbar'
import { DrawingOverlay } from './ui/DrawingOverlay'
import { Tutorial } from './ui/Tutorial'
import { PendingStrokePicker } from './ui/PendingStrokePicker'
import { ExampleNotes } from './ui/ExampleNotes'
import { HelpDialog } from './ui/HelpDialog'
import { WebcamPanel } from './ui/WebcamPanel'
import { StatusBar } from './ui/StatusBar'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
import { useAppState } from './ui/hooks'
import { appStore } from './store/appStore'

export default function App() {
  const tutorialDismissed = useAppState((s) => s.tutorialDismissed)
  const webcamEnabled = useAppState((s) => s.webcamEnabled)
  const [helpOpen, setHelpOpen] = useState(false)
  const dialogOpen = helpOpen || !tutorialDismissed

  useGlobalShortcuts({
    dialogOpen,
    onToggleHelp: () => tutorialDismissed && setHelpOpen((open) => !open),
    onEscape: () => (tutorialDismissed ? setHelpOpen(false) : appStore.dismissTutorial()),
  })

  return (
    <>
      <div className="app-shell" inert={dialogOpen} aria-hidden={dialogOpen || undefined}>
        <Toolbar onToggleWebcam={() => appStore.setWebcamEnabled(!webcamEnabled)} onOpenHelp={() => setHelpOpen(true)} />
        <ExampleNotes />
        <main className="stage">
          <SceneCanvas />
          <DrawingOverlay enabled={!dialogOpen} />
          <PendingStrokePicker />
          <WebcamPanel active={webcamEnabled && !dialogOpen} onClose={() => appStore.setWebcamEnabled(false)} />
        </main>
        <StatusBar />
      </div>

      {!tutorialDismissed && <Tutorial />}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </>
  )
}
