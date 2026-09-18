import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'
import { subscribeNotifications } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification } from '@/types'

// Short two-tone chime via WebAudio (no asset file needed).
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    const notes = [880, 1174.66] // A5 -> D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
    setTimeout(() => void ctx.close(), 600)
  } catch {
    /* audio not available — silent */
  }
}

interface Toast extends AppNotification {
  key: string
}

export function ToastHost() {
  const { session, isAdmin } = useAuth()
  const myId = session?.user?.id
  const navigate = useNavigate()
  const [toasts, setToasts] = useState<Toast[]>([])
  // Track ids we've already shown so we never double-toast the same insert.
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const unsub = subscribeNotifications((n) => {
      // My own rows always; broadcast rows (user_id = null) only for admins.
      if (n.user_id == null) {
        if (!isAdmin) return
      } else if (n.user_id !== myId) {
        return
      }
      if (seen.current.has(n.id)) return
      seen.current.add(n.id)
      const t: Toast = { ...n, key: `${n.id}-${Date.now()}` }
      setToasts((cur) => [...cur, t].slice(-4)) // keep at most 4 stacked
      playChime()
      // Auto-dismiss after 6s.
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.key !== t.key)), 6000)
    }, { userId: myId, includeBroadcast: isAdmin })
    return unsub
  }, [myId, isAdmin])

  const dismiss = (key: string) => setToasts((cur) => cur.filter((x) => x.key !== key))

  const goTo = (t: Toast) => {
    dismiss(t.key)
    if (t.link) navigate(t.link)
  }

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.key}
          className="pointer-events-auto animate-fade-in cursor-pointer rounded-xl border border-steel-200 bg-white p-3 shadow-2xl dark:border-steel-700 dark:bg-steel-900"
          onClick={() => goTo(t)}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-brand-600">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 line-clamp-2 text-xs text-steel-500">{t.body}</p>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(t.key) }}
              className="shrink-0 rounded p-1 text-steel-400 hover:text-steel-600 dark:hover:text-steel-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
