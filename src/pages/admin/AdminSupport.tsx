import { useEffect, useRef, useState } from 'react'
import { LifeBuoy, ArrowLeft, Send, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, Spinner } from '@/components/ui'
import {
  listSupportThreads,
  listSupportMessages,
  sendSupportMessage,
  subscribeSupportThread,
  type SupportThread,
  type SupportMessage,
} from '@/services/chat'

export default function AdminSupport() {
  const [threads, setThreads] = useState<SupportThread[] | null>(null)
  const [open, setOpen] = useState<SupportThread | null>(null)

  const load = () => listSupportThreads().then(setThreads).catch(() => setThreads([]))
  useEffect(() => { load() }, [])

  if (open) {
    return <AdminSupportThread threadUser={open.thread_user} userName={open.user_name} onBack={() => { setOpen(null); load() }} />
  }

  return (
    <div>
      <PageHeader title="Support" subtitle="Complaints and support requests from users." />
      {threads === null && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {threads?.length === 0 && <EmptyState icon={<LifeBuoy className="h-10 w-10" />} title="No support messages" description="User support conversations appear here." />}
      {threads && threads.length > 0 && (
        <div className="space-y-2">
          {threads.map((t) => (
            <button key={t.thread_user} onClick={() => setOpen(t)} className="card flex w-full items-center justify-between gap-3 p-4 text-left transition hover:border-brand-400">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.user_name}</p>
                <p className="truncate text-xs text-steel-500">{t.last_body || 'Image'}</p>
                <p className="text-xs text-steel-400">{t.count} message{t.count !== 1 ? 's' : ''} · last {new Date(t.last_at).toLocaleString()}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-steel-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminSupportThread({ threadUser, userName, onBack }: { threadUser: string; userName: string; onBack: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    listSupportMessages(threadUser).then((m) => alive && setMessages(m)).catch(() => alive && setMessages([]))
    const unsub = subscribeSupportThread(threadUser, (m) =>
      setMessages((cur) => (cur && cur.some((x) => x.id === m.id) ? cur : [...(cur ?? []), m])),
    )
    return () => { alive = false; unsub() }
  }, [threadUser])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      await sendSupportMessage({ thread_user: threadUser, from_admin: true, body: text })
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-4 !px-2 text-sm"><ArrowLeft className="h-4 w-4" /> Back to support</button>
      <p className="mb-2 font-semibold">{userName}</p>
      <div className="card flex h-[calc(100vh-13rem)] flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages === null && <Spinner className="mx-auto" />}
          {messages?.map((m) => (
            <div key={m.id} className={`flex ${m.from_admin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.from_admin ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-steel-100 text-steel-800 dark:bg-steel-800 dark:text-steel-100'}`}>
                {!m.from_admin && <p className="mb-0.5 text-[10px] font-semibold uppercase text-steel-400">User</p>}
                {m.image_url && <a href={m.image_url} target="_blank" rel="noreferrer"><img src={m.image_url} alt="attachment" className="mb-1 max-h-60 rounded-lg object-cover" /></a>}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={`mt-1 text-right text-[10px] ${m.from_admin ? 'text-brand-100/80' : 'text-steel-400'}`}>{new Date(m.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-steel-200 p-3 dark:border-steel-800">
          <input className="input flex-1" placeholder="Reply to the user…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary !px-3" disabled={busy || !text.trim()}>{busy ? <Spinner /> : <Send className="h-4 w-4" />}</button>
        </form>
      </div>
    </div>
  )
}
