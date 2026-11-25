/**
 * Where the live loudness comes from — her voice while she speaks, the
 * microphone otherwise.
 *
 * App owns the calculation; the main window's animation loop and the mini orb
 * both read it. The orb cannot rely on the main window's loop because that
 * stops (requestAnimationFrame pauses) while the main window is minimised.
 */
let source: () => number = () => 0

export function setLevelSource(fn: () => number): void {
  source = fn
}

export function levelNow(): number {
  try {
    return source()
  } catch {
    return 0
  }
}
