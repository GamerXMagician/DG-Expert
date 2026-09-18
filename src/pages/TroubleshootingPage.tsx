import { useEffect, useState } from 'react'
import { Stethoscope, Send } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, Spinner, SafetyNote } from '@/components/ui'
import { ArticleCard, ArticleDetail } from '@/components/ArticleViews'
import { listOems, listCategories, listArticles } from '@/services/knowledge'
import { createRequest } from '@/services/requests'
import { useAuth } from '@/contexts/AuthContext'
import type { Oem, KnowledgeCategory, KnowledgeArticle } from '@/types'

const commonProblems = [
  'DG does not start', 'High coolant temperature', 'Low oil pressure', 'Low battery voltage',
  'No output voltage', 'Overfrequency', 'Underfrequency', 'Overvoltage', 'Undervoltage',
  'Black smoke', 'White smoke', 'Excessive vibration', 'Engine hunting',
]

export default function TroubleshootingPage() {
  const { session } = useAuth()
  const [oems, setOems] = useState<Oem[]>([])
  const [cats, setCats] = useState<KnowledgeCategory[]>([])
  const [oemId, setOemId] = useState('')
  const [catId, setCatId] = useState('')
  const [results, setResults] = useState<KnowledgeArticle[] | null>(null)
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listOems().then(setOems).catch(() => {})
    listCategories().then(setCats).catch(() => {})
  }, [])

  const run = async () => {
    setBusy(true)
    try {
      const r = await listArticles({
        status: 'published',
        oemId: oemId || undefined,
        categoryId: catId || undefined,
      })
      setResults(r)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Troubleshooting" subtitle="Select OEM → System → Problem to find guided diagnostics." />

      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">OEM (optional)</label>
            <select className="input" value={oemId} onChange={(e) => setOemId(e.target.value)}>
              <option value="">Any OEM</option>
              {oems.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">System</label>
            <select className="input" value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Any system</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <button onClick={run} className="btn-primary mt-4" disabled={busy}>
          {busy ? <Spinner /> : <><Stethoscope className="h-4 w-4" /> Find guidance</>}
        </button>

        <p className="mt-4 text-xs font-semibold uppercase text-steel-400">Common problems</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {commonProblems.map((p) => (
            <span key={p} className="badge bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300">{p}</span>
          ))}
        </div>
      </div>

      {results !== null && (
        <div className="mt-6">
          {results.length === 0 ? (
            <RequestInfoForm userId={session?.user.id} oems={oems} />
          ) : (
            <>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-steel-400">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((a) => <ArticleCard key={a.id} article={a} onOpen={setSelected} />)}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6">
        <SafetyNote>
          Possible causes → checks → corrective actions are a starting point only. De-energize and
          isolate the set before hands-on work; use qualified personnel for high-voltage, fuel and
          rotating-machinery tasks.
        </SafetyNote>
      </div>

      {selected && <ArticleDetail article={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export function RequestInfoForm({ userId, oems }: { userId?: string; oems: Oem[] }) {
  const [f, setF] = useState({ question: '', oem_id: '', model_text: '', system: '', description: '' })
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return setError('Please log in to submit a request.')
    setBusy(true)
    setError(null)
    try {
      await createRequest({
        user_id: userId,
        question: f.question,
        oem_id: f.oem_id || null,
        model_text: f.model_text || null,
        system: f.system || null,
        description: f.description || null,
      })
      setSent(true)
    } catch {
      setError('Could not submit the request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <EmptyState
        title="Request submitted"
        description="Your technical request has been sent to the DG Expert team. You'll be notified when new information is published."
      />
    )
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold">No matching article yet — request the information</h3>
      <p className="mt-1 text-sm text-steel-500">
        Not enough verified information for this. Submit a technical request and an administrator will
        research and publish it.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="label">Question</label>
          <input className="input" required value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="I cannot find the troubleshooting procedure for this alarm." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">OEM</label>
            <select className="input" value={f.oem_id} onChange={(e) => setF({ ...f, oem_id: e.target.value })}>
              <option value="">Select OEM</option>
              {oems.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Generator model</label>
            <input className="input" value={f.model_text} onChange={(e) => setF({ ...f, model_text: e.target.value })} placeholder="e.g. Perkins 1104" />
          </div>
        </div>
        <div>
          <label className="label">System</label>
          <input className="input" value={f.system} onChange={(e) => setF({ ...f, system: e.target.value })} placeholder="e.g. Control panel" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? <Spinner /> : <><Send className="h-4 w-4" /> Request Technical Information</>}
        </button>
      </form>
    </div>
  )
}
