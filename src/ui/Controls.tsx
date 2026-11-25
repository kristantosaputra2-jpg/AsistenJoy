import { useRef, useState } from 'react'
import { useStore, type Phase } from '../store'
import { BRIDGE_HTTP_URL } from '../config'
import { levelNow } from '../lib/level'

/**
 * The two buttons in the top bar: shrink JOY to a small floating orb, and
 * switch everything off.
 *
 * The orb is a Document Picture-in-Picture window (Chrome/Edge 116+), which the
 * browser keeps on top of every other app. The main window is minimised by the
 * bridge, since a web page cannot minimise its own window. Clicking the orb
 * brings the main window back and closes the orb.
 */

/** The orb's colour says what she is doing without opening the big window. */
const ORB_COLOUR: Record<Phase, string> = {
  offline: '#5b6470',
  boot: '#5bc8ff',
  dormant: '#3d8bff', // idle — blue
  waking: '#36e08a',
  listening: '#36e08a', // hearing you — green
  thinking: '#ffd23d', // thinking — yellow
  tooling: '#ffd23d',
  speaking: '#ff9a3d', // talking — orange
}

const ORB_SIZE = 140

/** Space is JOY's talk/pause key; a focused button would swallow it as a click. */
const blur = (e: { currentTarget: HTMLElement }) => e.currentTarget.blur()

async function windowAction(action: 'minimize' | 'restore'): Promise<void> {
  try {
    await fetch(`${BRIDGE_HTTP_URL}/window`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    })
  } catch {
    /* the orb still works; the main window simply stays where it is */
  }
}

export function Controls() {
  const [mini, setMini] = useState(false)
  const [off, setOff] = useState(false)
  const pipRef = useRef<Window | null>(null)

  const restore = () => {
    const pw = pipRef.current
    pipRef.current = null
    setMini(false)
    void windowAction('restore')
    // Focusing the opener from inside the orb's click is allowed and is what
    // reliably brings the window to the front.
    window.focus()
    pw?.close()
  }

  const shrink = async () => {
    const dpip = (window as unknown as { documentPictureInPicture?: { requestWindow: (o: object) => Promise<Window> } })
      .documentPictureInPicture
    if (!dpip) {
      useStore.getState().setError('Bola mini butuh Chrome atau Edge versi baru.')
      return
    }
    const pw = await dpip.requestWindow({ width: ORB_SIZE, height: ORB_SIZE })
    pipRef.current = pw
    setMini(true)

    const doc = pw.document
    doc.title = 'JOY'
    doc.body.style.cssText =
      'margin:0;background:#05070b;overflow:hidden;cursor:pointer;display:grid;place-items:center;height:100vh'
    const canvas = doc.createElement('canvas')
    const dpr = pw.devicePixelRatio || 1
    canvas.width = ORB_SIZE * dpr
    canvas.height = ORB_SIZE * dpr
    canvas.style.cssText = 'width:100vmin;height:100vmin'
    canvas.title = 'Klik untuk membuka JOY'
    doc.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!

    let smooth = 0
    let t = 0
    const draw = () => {
      if (pipRef.current !== pw) return
      const phase = useStore.getState().phase
      const colour = ORB_COLOUR[phase] ?? ORB_COLOUR.dormant
      smooth += (levelNow() - smooth) * 0.25
      t += 0.03
      const w = canvas.width
      const c = w / 2
      // A slow breath when idle, a pulse with the voice when active.
      const breath = 0.04 * Math.sin(t * 1.6)
      const r = w * (0.24 + breath + Math.min(1, smooth) * 0.12)
      ctx.clearRect(0, 0, w, w)
      const glow = ctx.createRadialGradient(c, c, r * 0.2, c, c, r * 1.9)
      glow.addColorStop(0, colour)
      glow.addColorStop(0.45, colour + '88')
      glow.addColorStop(1, colour + '00')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(c, c, r * 1.9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(c, c, r * 0.42, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      pw.requestAnimationFrame(draw)
    }
    pw.requestAnimationFrame(draw)

    doc.body.addEventListener('click', restore)
    // Closed with its own X: bring the main window back too, rather than leave
    // JOY minimised with nothing on screen to find her by.
    pw.addEventListener('pagehide', () => {
      if (pipRef.current === pw) restore()
    })

    void windowAction('minimize')
  }

  const shutdown = async () => {
    if (!window.confirm('Matikan JOY dan servernya sekarang?')) return
    setOff(true)
    pipRef.current?.close()
    try {
      await fetch(`${BRIDGE_HTTP_URL}/shutdown`, { method: 'POST' })
    } catch {
      /* the bridge going away mid-request is the expected outcome */
    }
    // Allowed for a window that was opened straight onto this page (the
    // autostart app window). If the browser refuses, the screen below says so.
    window.close()
  }

  if (off) {
    return (
      <div className="joy-off">
        <div>JOY sudah dimatikan.</div>
        <div className="joy-off-sub">Jendela ini boleh ditutup.</div>
      </div>
    )
  }

  return (
    <div className="joy-controls">
      <button type="button" onMouseUp={blur} onClick={() => (mini ? restore() : void shrink())} title="Kecilkan jadi bola">
        {mini ? '▢ Besarkan' : '● Kecilkan'}
      </button>
      <button type="button" className="joy-power" onMouseUp={blur} onClick={() => void shutdown()} title="Matikan JOY dan server">
        ⏻ Matikan
      </button>
    </div>
  )
}
