/**
 * Pointer-aware copy (SPEC-v3 §8.11, §9): on a touch screen the status line says "Tap", with a mouse it says
 * "Click" and names the keyboard shortcut. Read once per message, so plugging in a mouse changes the next one.
 */
export function coarsePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

export const copy = {
  /** Input mode in the status line when the webcam is off. */
  mode: () => (coarsePointer() ? 'Touch' : 'Mouse'),
  modeMessage: () => (coarsePointer() ? 'Touch drawing.' : 'Mouse drawing.'),
  /** "Press Drop (D) to start." or "Tap Drop to start." */
  dropToStart: () => (coarsePointer() ? 'Tap Drop to start.' : 'Press Drop (D) to start.'),
  dropVerb: () => (coarsePointer() ? 'Tap' : 'Press'),
  selectVerb: () => (coarsePointer() ? 'Tap' : 'Click'),
}
