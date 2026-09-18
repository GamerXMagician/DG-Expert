import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2, Eye, EyeOff, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, Spinner } from '@/components/ui'
import {
  listAllArticles,
  upsertArticle,
  setArticleStatus,
  deleteArticle,
  broadcastNotification,
  logActivity,
  type ArticleInput,
} from '@/services/admin'
import { listOems, listCategories } from '@/services/knowledge'
import type { KnowledgeArticle, Oem, KnowledgeCategory } from '@/types'

export default function AdminKnowledge() {
  const [articles, setArticles] = useState<KnowledgeArticle[] | null>(null)
  const [oems, setOems] = useState<Oem[]>([])
  const [cats, setCats] = useState<KnowledgeCategory[]>([])
  const [editing, setEditing] = useState<ArticleInput | null>(null)
  const [q, setQ] = useState('')
  const [filterOem, setFilterOem] = useState('')

  const load = () => listAllArticles().then(setArticles).catch(() => setArticles([]))

  useEffect(() => {
    load()
    listOems().then(setOems).catch(() => {})
    listCategories().then(setCats).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    if (!articles) return null
    return articles.filter(
      (a) =>
        (!q || a.title.toLowerCase().includes(q.toLowerCase())) &&
        (!filterOem || a.oem_id === filterOem),
    )
  }, [articles, q, filterOem])

  const publishToggle = async (a: KnowledgeArticle) => {
    const next = a.status === 'published' ? 'draft' : 'published'
    await setArticleStatus(a.id, next)
    if (next === 'published') {
      await broadcastNotification(
        'New technical information available',
        `${a.title} has been published.`,
        '/knowledge',
      ).catch(() => {})
      await logActivity('publish_article', 'knowledge_articles', a.id)
    }
    load()
  }

  const remove = async (a: KnowledgeArticle) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    await deleteArticle(a.id)
    await logActivity('delete_article', 'knowledge_articles', a.id)
    load()
  }

  if (editing) {
    return (
      <ArticleEditor
        initial={editing}
        oems={oems}
        cats={cats}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle="Create, edit and publish technical articles."
        action={
          <button onClick={() => setEditing({ title: '', status: 'draft' })} className="btn-primary">
            <Plus className="h-4 w-4" /> Create Knowledge Article
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-400" />
          <input className="input pl-10" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={filterOem} onChange={(e) => setFilterOem(e.target.value)}>
          <option value="">All OEMs</option>
          {oems.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {filtered === null && <Skeleton className="h-40" />}
      {filtered?.length === 0 && <EmptyState title="No articles" description="Create your first knowledge article." />}
      {filtered && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${a.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-steel-100 text-steel-600 dark:bg-steel-800'}`}>
                    {a.status}
                  </span>
                  {a.system && <span className="text-xs text-steel-400">{a.system}</span>}
                </div>
                <p className="mt-1 font-medium">{a.title}</p>
                <p className="text-xs text-steel-400">Updated {new Date(a.updated_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(a)} className="btn-ghost !p-2" title="Edit"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => publishToggle(a)} className="btn-ghost !p-2" title={a.status === 'published' ? 'Unpublish' : 'Publish'}>
                  {a.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(a)} className="btn-ghost !p-2 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const fields: { key: keyof ArticleInput; label: string; area?: boolean }[] = [
  { key: 'system', label: 'System' },
  { key: 'problem', label: 'Problem' },
  { key: 'symptoms', label: 'Symptoms', area: true },
  { key: 'possible_causes', label: 'Possible Causes', area: true },
  { key: 'diagnostic_procedure', label: 'Diagnostic Procedure', area: true },
  { key: 'corrective_action', label: 'Corrective Action', area: true },
  { key: 'safety_precautions', label: 'Safety Precautions', area: true },
  { key: 'references_text', label: 'References', area: true },
  { key: 'body', label: 'Overview / Fundamentals body', area: true },
]

function ArticleEditor({
  initial,
  oems,
  cats,
  onCancel,
  onSaved,
}: {
  initial: ArticleInput
  oems: Oem[]
  cats: KnowledgeCategory[]
  onCancel: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ArticleInput>(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = (k: keyof ArticleInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const save = async (status: 'draft' | 'published') => {
    if (!form.title.trim()) return setErr('Title is required.')
    setBusy(true)
    setErr(null)
    try {
      const payload: ArticleInput = { ...form, status }
      // normalize empty strings to null for uuid FK columns
      if (!payload.oem_id) payload.oem_id = null
      if (!payload.category_id) payload.category_id = null
      const saved = await upsertArticle(payload)
      if (status === 'published') {
        await broadcastNotification(
          'New technical information available',
          `${saved.title} has been published.`,
          '/knowledge',
        ).catch(() => {})
        await logActivity('publish_article', 'knowledge_articles', saved.id)
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save article.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={initial.id ? 'Edit Article' : 'Create Knowledge Article'} />
      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Title *</label>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">OEM</label>
            <select className="input" value={form.oem_id ?? ''} onChange={(e) => set('oem_id', e.target.value || null)}>
              <option value="">— None —</option>
              {oems.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {fields.map((f) =>
          f.area ? (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <textarea
                className="input"
                rows={3}
                value={(form[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ) : (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                className="input"
                value={(form[f.key] as string) ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ),
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => save('draft')} className="btn-secondary" disabled={busy}>
            {busy ? <Spinner /> : 'Save Draft'}
          </button>
          <button onClick={() => save('published')} className="btn-primary" disabled={busy}>
            {busy ? <Spinner /> : 'Publish'}
          </button>
          <button onClick={onCancel} className="btn-ghost" disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
