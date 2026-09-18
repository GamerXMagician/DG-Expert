import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { broadcastNotification } from '@/services/admin'

interface Activity {
  id: string
  action: string
  entity: string | null
  created_at: string
}

export default function AdminNotifications() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [activity, setActivity] = useState<Activity[] | null>(null)

  useEffect(() => {
    supabase
      .from('admin_activity')
      .select('id, action, entity, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setActivity((data as Activity[]) ?? []))
  }, [])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await broadcastNotification(title, body)
      setSent(true)
      setTitle('')
      setBody('')
      setTimeout(() => setSent(false), 2500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Notifications & Activity" subtitle="Broadcast to all users and review the admin activity log." />

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={send} className="card space-y-3 p-6">
          <h3 className="font-semibold">Broadcast notification</h3>
          <div>
            <label className="label">Title</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New maintenance guide available" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {sent && <p className="text-sm text-green-600">Broadcast sent — delivered via Realtime.</p>}
          <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : <><Send className="h-4 w-4" /> Send to all users</>}</button>
        </form>

        <div className="card p-6">
          <h3 className="mb-3 font-semibold">Activity log</h3>
          {activity === null && <Skeleton className="h-32" />}
          {activity?.length === 0 && <p className="text-sm text-steel-400">No activity recorded yet.</p>}
          <ul className="space-y-2 text-sm">
            {activity?.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-steel-100 pb-2 last:border-0 dark:border-steel-800">
                <span className="font-medium">{a.action.replace(/_/g, ' ')}</span>
                <span className="text-xs text-steel-400">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
