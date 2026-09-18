import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { listMyNotifications, subscribeNotifications, markRead } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'
import type { AppNotification } from '@/types'

// Bell + dropdown feed, wired to realtime. Reusable across layouts.
export function NotificationBell() {
  const [notifs, setNotifs] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { session, isAdmin } = useAuth()
  const myId = session?.user?.id

  useEffect(() => {
    listMyNotifications().then(setNotifs).catch(() => {})
    const unsub = subscribeNotifications(
      (n) => setNotifs((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev])),
      { userId: myId, includeBroadcast: isAdmin },
    )
    return unsub
  }, [myId, isAdmin])

  const unread = notifs.filter((n) => !n.is_read).length

  const openFeed = () => {
    const next = !open
    setOpen(next)
    if (next) {
      // Persist read only for rows the user OWNS (broadcast rows with user_id=null
      // can't be updated under RLS, so we just clear them locally).
      notifs
        .filter((n) => !n.is_read && n.user_id)
        .forEach((n) => void markRead(n.id).catch(() => {}))
      // Clear the badge in the UI for everything currently shown.
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  return (
    <div className="relative">
      <button onClick={openFeed} className="btn-ghost relative !p-2" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-auto card p-2">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-steel-400">Notifications</p>
          {notifs.length === 0 && <p className="px-2 py-6 text-center text-sm text-steel-400">No notifications yet.</p>}
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => { setOpen(false); if (n.link) navigate(n.link) }}
              className={`rounded-md px-2 py-2 hover:bg-steel-100 dark:hover:bg-steel-800 ${n.link ? 'cursor-pointer' : ''}`}
            >
              <p className="text-sm font-medium">{n.title}</p>
              {n.body && <p className="text-xs text-steel-500">{n.body}</p>}
              <p className="mt-0.5 text-[10px] text-steel-400">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
