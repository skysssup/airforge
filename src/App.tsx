import { useCallback, useEffect, useState } from 'react'
import { SceneCanvas } from './render/SceneCanvas'
import { Toolbar } from './ui/Toolbar'
import { DrawingOverlay } from './ui/DrawingOverlay'
import { Tutorial } from './ui/Tutorial'
import { SuggestionPicker } from './ui/SuggestionPicker'
import { GestureHelp } from './ui/GestureHelp'
import { WebcamPanel } from './ui/WebcamPanel'
import { ReplayPanel } from './ui/ReplayPanel'
import { StatusBar } from './ui/StatusBar'
import { useGlobalShortcuts } from './ui/useGlobalShortcuts'
import { useAppState } from './ui/hooks'
import { appStore } from './store/appStore'
import './styles/app.css'

export default function App() {
  const { tutorialDismissed, webcamEnabled, replayMode } = useAppState()
  const [helpOpen, setHelpOpen] = useState(false)
  const [replayOpen, setReplayOpen] = useState(false)
  const dialogOpen = helpOpen || !tutorialDismissed

  const toggleWebcam = useCallback(() => {
    if (webcamEnabled) {
      appStore.setWebcamEnabled(false)
    } else {
      appStore.setWebcamEnabled(true)
    }
  }, [webcamEnabled])

  useGlobalShortcuts({
    dialogOpen,
    onToggleHelp: () => tutorialDismissed && setHelpOpen((v) => !v),
    onEscape: () => {
      setHelpOpen(false)
      setReplayOpen(false)
    },
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => document.documentElement.classList.toggle('reduced-motion', mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <>
      <div className="app-shell" inert={dialogOpen} aria-hidden={dialogOpen || undefined}>
        <Toolbar
          onToggleWebcam={toggleWebcam}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenReplay={() => setReplayOpen(true)}
        />

        <main className="stage">
          <SceneCanvas />
          <DrawingOverlay enabled={!replayMode && !dialogOpen} />
          <SuggestionPicker />
          <WebcamPanel
            active={webcamEnabled && !replayMode && !dialogOpen}
            onClose={() => appStore.setWebcamEnabled(false)}
          />
        </main>

        <StatusBar />
        {replayOpen && <ReplayPanel onClose={() => setReplayOpen(false)} />}
      </div>

      {!tutorialDismissed && <Tutorial />}
      <GestureHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
