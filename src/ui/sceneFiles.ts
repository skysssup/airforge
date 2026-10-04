import { appStore } from '../store/appStore'
import { exportSceneJson, importSceneJson } from '../io/serialize'
import { MAX_JSON_BYTES } from '../io/schema'
import { setExampleParam } from '../examples'

function fileNameFor(sceneName: string): string {
  const slug = sceneName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || 'airforge-scene'}.json`
}

/** Download the scene as it is on screen, moving balls included. */
export function saveScene(): void {
  const { name, objects, physics } = appStore.exportState()
  const url = URL.createObjectURL(new Blob([exportSceneJson(name, objects, physics)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileNameFor(name)
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  appStore.setStatus(`Saved ${link.download}.`)
}

/** Validate and load a scene file, reporting anything that stops it. */
export async function openSceneFile(file: File): Promise<void> {
  if (file.size > MAX_JSON_BYTES) {
    appStore.setStatus(`Could not open ${file.name}: files over ${MAX_JSON_BYTES / 1000} KB are not accepted.`)
    return
  }
  let text: string
  try {
    text = await file.text()
  } catch {
    appStore.setStatus(`Could not read ${file.name}.`)
    return
  }
  const result = importSceneJson(text)
  if (!result.ok) {
    appStore.setStatus(`Could not open ${file.name}: ${result.error}`)
    return
  }
  setExampleParam(null)
  appStore.loadScene(result, { message: `Opened “${result.name}” from ${file.name}.` })
}
