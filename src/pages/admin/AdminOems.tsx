import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { listOems } from '@/services/knowledge'
import { logActivity } from '@/services/admin'
import type { Oem } from '@/types'

type OemForm = Partial<Oem> & { name: string; slug: string }

export default function AdminOems() {
  const [oems, setOems] = useState<Oem[] | null>(null)
  const [editing, setEditing] = useState<OemForm | null>(null)

  const load = () => listOems().then(setOems).catch(() => setOems([]))
  useEffect(() => { load() }, [])

  const save = async (form: OemForm) => {
    const payload = { ...form, slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-') }
    const { error } = await supabase.from('oems').upsert(payload)
    if (!error) {
      await logActivity(form.id ? 'update_oem' : 'create_oem', 'oems', form.id)
      setEditing(null)
      load()
    } else {
      alert(error.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="OEMs"
        subtitle="Add or edit OEMs — no code changes needed."
        action={<button onClick={() => setEditing({ name: '', slug: '' })} className="btn-primary"><Plus className="h-4 w-4" /> Add OEM</button>}
      />

      {editing && <OemEditor initial={editing} onCancel={() => setEditing(null)} onSave={save} />}

      {oems === null && <Skeleton className="mt-4 h-40" />}
      {oems && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {oems.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-xs text-steel-400">{o.country}</p>
                </div>
                <button onClick={() => setEditing(o)} className="btn-ghost !p-2"><Pencil className="h-4 w-4" /></button>
              </div>
              {o.engine_families && <p className="mt-2 text-xs text-steel-500">{o.engine_families}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OemEditor({ initial, onCancel, onSave }: { initial: OemForm; onCancel: () => void; onSave: (f: OemForm) => Promise<void> }) {
  const [f, setF] = useState<OemForm>(initial)
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await onSave(f)
    setBusy(false)
  }
  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Name *</label><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="label">Country</label><input className="input" value={f.country ?? ''} onChange={(e) => setF({ ...f, country: e.target.value })} /></div>
      </div>
      <div><label className="label">Slug</label><input className="input" value={f.slug} placeholder="auto from name" onChange={(e) => setF({ ...f, slug: e.target.value })} /></div>
      <div><label className="label">Engine families</label><input className="input" value={f.engine_families ?? ''} onChange={(e) => setF({ ...f, engine_families: e.target.value })} /></div>
      <div><label className="label">Overview</label><textarea className="input" rows={2} value={f.overview ?? ''} onChange={(e) => setF({ ...f, overview: e.target.value })} /></div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save OEM'}</button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  )
}
