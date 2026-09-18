import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, Sparkles, Bookmark, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SimpleMarkdown, Spinner, SafetyNote } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { askDgExpert } from '@/services/ai'
import { saveQuestion } from '@/services/questions'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  questionId?: string
  limited?: boolean
}

const examples = [
  'Why is my DG overheating?',
  'What causes low engine oil pressure?',
  'Why does the generator fail to start?',
  'Explain the working principle of a diesel generator.',
  'What preventive maintenance should be done at 500 hours?',
]

export default function AssistantPage() {
  const { session, profile, planState, refresh } = useAuth()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: q }])
    setBusy(true)
    try {
      const result = await askDgExpert(q)
      let questionId: string | undefined
      if (!result.limited && session?.user) {
        const saved = await saveQuestion({
          user_id: session.user.id,
          question: q,
          answer: result.answer,
        }).catch(() => null)
        questionId = saved?.id
      }
      setMessages((m) => [...m, { role: 'assistant', content: result.answer, questionId, limited: result.limited }])
      await refresh() // update remaining-questions counter
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: '## Error\nSomething went wrong. Please try again.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  const remaining = planState?.aiQuestionsRemaining
  const isUnlimited = planState?.plan?.code === 'unlimited'

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <PageHeader
        title="DG Expert Assistant"
        subtitle="Ask anything about diesel generators — answers are structured and safety-first."
        action={
          <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            {isUnlimited ? 'Unlimited' : `${remaining ?? '—'} left today`}
          </span>
        }
      />

      <div className="card flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg py-6 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-brand-600/10 text-brand-600">
                <Sparkles className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold">How can I help with your generator?</h3>
              <p className="text-sm text-steel-500">Try one of these:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {examples.map((ex) => (
                  <button key={ex} onClick={() => send(ex)} className="btn-secondary !py-1.5 text-xs">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : 'bg-steel-100 text-steel-900 dark:bg-steel-800 dark:text-steel-100'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="text-sm">{m.content}</p>
                ) : (
                  <>
                    <SimpleMarkdown text={m.content} />
                    {m.limited && (
                      <div className="mt-3">
                        <Link to="/pricing" className="btn-primary !py-1.5 text-xs">Upgrade to Unlimited</Link>
                      </div>
                    )}
                    {m.questionId && (
                      <div className="mt-3 flex items-center gap-3 text-xs text-steel-400">
                        <Link to="/history" className="inline-flex items-center gap-1 hover:text-brand-600">
                          <Bookmark className="h-3.5 w-3.5" /> Saved to history
                        </Link>
                        <span>·</span>
                        <Link to="/dashboard#request" className="inline-flex items-center gap-1 hover:text-brand-600">
                          <AlertCircle className="h-3.5 w-3.5" /> Not enough info? Request it
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-steel-100 px-4 py-3 dark:bg-steel-800">
                <Spinner className="text-brand-600" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-steel-200 p-3 dark:border-steel-800">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
            className="flex items-end gap-2"
          >
            <textarea
              className="input max-h-32 min-h-[44px] resize-none"
              placeholder="Ask anything about diesel generators..."
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
            />
            <button className="btn-primary !px-3" disabled={busy || !input.trim()}>
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-2 px-1 text-[11px] text-steel-400">
            Signed in as {profile?.email}. Answers are informational — follow OEM manuals and use
            qualified personnel for high-risk work.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <SafetyNote>
          The AI never presents a diagnosis as certain when information is insufficient — it will ask
          follow-up questions. Always confirm against the OEM service manual.
        </SafetyNote>
      </div>
    </div>
  )
}
