import { appStore } from '../store/appStore'
import { exportSceneJson, importSceneJson } from '../io/serialize'
import { MAX_JSON_BYTES } from '../io/schema'
import { SCENE_PARAM, canShareLinks, decodeSceneToken, encodeSceneToken, sceneTokenFromHash } from '../io/shareLink'
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

/** A link to this page that opens the scene as it is on screen. */
export async function sceneLink(): Promise<string> {
  const { name, objects, physics } = appStore.exportState()
  const token = await encodeSceneToken(exportSceneJson(name, objects, physics))
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = `${SCENE_PARAM}=${token}`
  return url.toString()
}

/** Copy a scene link; if the clipboard is unavailable, put the link in the address bar instead. */
export async function copySceneLink(): Promise<void> {
  if (!canShareLinks()) {
    appStore.setStatus('This browser cannot create scene links. Use Save instead.')
    return
  }
  const link = await sceneLink()
  const { sceneName } = appStore.getState()
  try {
    await navigator.clipboard.writeText(link)
    appStore.setStatus(`Copied a link to “${sceneName}” (${link.length.toLocaleString('en-US')} characters).`)
  } catch {
    window.history.replaceState(window.history.state, '', link)
    appStore.setStatus('The clipboard is not available here, so the link is in the address bar.')
  }
}

/** Open the scene carried by the address bar's #scene=… fragment, if there is one. */
export async function openSceneLinkFromUrl(): Promise<void> {
  const token = sceneTokenFromHash(window.location.hash)
  if (!token) return
  appStore.skipTutorial()
  if (!canShareLinks()) {
    appStore.setStatus('This browser cannot open scene links. Try a current Chrome, Edge, Firefox, or Safari.')
    return
  }
  const decoded = await decodeSceneToken(token)
  const result = decoded.ok ? importSceneJson(decoded.json) : decoded
  if (!result.ok) {
    appStore.setStatus(`Could not open the scene in this link: ${result.error}`)
    return
  }
  const url = new URL(window.location.href)
  url.searchParams.delete('example')
  window.history.replaceState(window.history.state, '', url)
  appStore.loadScene(result, { message: `Opened “${result.name}” from a link. Press Drop (D) to start.` })
}
