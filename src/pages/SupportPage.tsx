import { useEffect, useRef, useState } from 'react'
import { Send, ImagePlus, X, LifeBuoy } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  listSupportMessages,
  sendSupportMessage,
  uploadSupportImage,
  subscribeSupportThread,
  type SupportMessage,
} from '@/services/chat'

export default function SupportPage() {
  const { session } = useAuth()
  const myId = session?.user?.id ?? ''
  const [messages, setMessages] = useState<SupportMessage[] | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!myId) return
    let alive = true
    listSupportMessages(myId).then((m) => alive && setMessages(m)).catch(() => alive && setMessages([]))
    const unsub = subscribeSupportThread(myId, (m) =>
      setMessages((cur) => (cur && cur.some((x) => x.id === m.id) ? cur : [...(cur ?? []), m])),
    )
    return () => { alive = false; unsub() }
  }, [myId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !file) return
    setBusy(true)
    setError(null)
    try {
      let image_url: string | null = null
      if (file) image_url = await uploadSupportImage(myId, file)
      await sendSupportMessage({ thread_user: myId, from_admin: false, body: text, image_url })
      setText('')
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Support" subtitle="Chat with the DG Expert team for any complaint or help." />
      <div className="card flex h-[calc(100vh-13rem)] flex-col overflow-hidden p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages === null && <Spinner className="mx-auto" />}
          {messages?.length === 0 && (
            <div className="grid place-items-center py-10 text-center text-sm text-steel-400">
              <LifeBuoy className="mb-2 h-8 w-8" />
              Start a conversation — describe your complaint or question and the team will reply here.
            </div>
          )}
          {messages?.map((m) => {
            const mine = m.sender_id === myId && !m.from_admin
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'rounded-br-sm bg-brand-600 text-white' : 'rounded-bl-sm bg-steel-100 text-steel-800 dark:bg-steel-800 dark:text-steel-100'}`}>
                  {m.from_admin && <p className="mb-0.5 text-[10px] font-semibold uppercase text-brand-500">Support team</p>}
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer"><img src={m.image_url} alt="attachment" className="mb-1 max-h-60 rounded-lg object-cover" /></a>
                  )}
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <p className={`mt-1 text-right text-[10px] ${mine ? 'text-brand-100/80' : 'text-steel-400'}`}>{new Date(m.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="border-t border-steel-200 p-3 dark:border-steel-800">
          {file && (
            <div className="mb-2 flex items-center gap-2 text-xs text-steel-500">
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-red-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <label className="btn-ghost cursor-pointer !px-2" title="Attach image">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <input className="input flex-1" placeholder="Describe your issue…" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary !px-3" disabled={busy || (!text.trim() && !file)}>{busy ? <Spinner /> : <Send className="h-4 w-4" />}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
