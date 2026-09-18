import { useEffect, useRef, useState } from 'react'
import { Send, ImagePlus, X, Download } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  listMessages,
  sendMessage,
  uploadChatImage,
  subscribeOrderMessages,
} from '@/services/chat'
import type { OrderMessage } from '@/types'

// Force-download an image (bucket is cross-origin, so fetch the blob first).
async function downloadImage(url: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = url.split('/').pop()?.split('?')[0] || 'image'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  } catch {
    window.open(url, '_blank')
  }
}

interface Props {
  orderId: string
  // Read-only mode (admin view): shows the thread but hides the composer.
  readOnly?: boolean
  className?: string
}

export function OrderChat({ orderId, readOnly = false, className = '' }: Props) {
  const { session } = useAuth()
  const myId = session?.user?.id
  const [messages, setMessages] = useState<OrderMessage[] | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    listMessages(orderId)
      .then((m) => alive && setMessages(m))
      .catch(() => alive && setMessages([]))
    const unsub = subscribeOrderMessages(orderId, (m) =>
      setMessages((cur) => (cur && cur.some((x) => x.id === m.id) ? cur : [...(cur ?? []), m])),
    )
    return () => {
      alive = false
      unsub()
    }
  }, [orderId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !file) return
    setBusy(true)
    setError(null)
    try {
      let image_url: string | null = null
      if (file) image_url = await uploadChatImage(orderId, file)
      await sendMessage({ order_id: orderId, body: text, image_url })
      setText('')
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages === null && <Spinner className="mx-auto" />}
        {messages?.length === 0 && (
          <p className="py-8 text-center text-sm text-steel-400">
            No messages yet. {readOnly ? '' : 'Say hello to get started.'}
          </p>
        )}
        {messages?.map((m) => {
          const mine = !readOnly && m.sender_id === myId
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'rounded-br-sm bg-brand-600 text-white'
                    : 'rounded-bl-sm bg-steel-100 text-steel-800 dark:bg-steel-800 dark:text-steel-100'
                }`}
              >
                {m.image_url && (
                  <div className="group relative mb-1">
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      <img
                        src={m.image_url}
                        alt="attachment"
                        className="max-h-60 rounded-lg object-cover"
                      />
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadImage(m.image_url!)}
                      title="Download image"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-steel-950/70 text-white opacity-0 ring-1 ring-white/20 transition group-hover:opacity-100"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                <p className={`mt-1 text-right text-[10px] ${mine ? 'text-brand-100/80' : 'text-steel-400'}`}>
                  {new Date(m.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {!readOnly && (
        <form onSubmit={send} className="border-t border-steel-200 p-3 dark:border-steel-800">
          {file && (
            <div className="mb-2 flex items-center gap-2 text-xs text-steel-500">
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-red-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <label className="btn-ghost cursor-pointer !px-2" title="Attach image">
              <ImagePlus className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <input
              className="input flex-1"
              placeholder="Type a message…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn-primary !px-3" disabled={busy || (!text.trim() && !file)}>
              {busy ? <Spinner /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
