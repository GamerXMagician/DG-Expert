import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Plus, Trash2, Pencil, Clock, CheckCircle2, XCircle, LogOut, LayoutDashboard, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, Spinner, Logo, UpgradePrompt } from '@/components/ui'
import { NotificationBell } from '@/components/NotificationBell'
import { ChatModal } from '@/components/ChatModal'
import { VendorApplicationForm } from '@/components/VendorApplicationForm'
import { subscribeServiceOrders } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'
import {
  getMyVendor,
  applyAsVendor,
  listMyServices,
  upsertService,
  deleteService,
  listVendorOrders,
  updateOrder,
  markOrderComplete,
  type ServiceInput,
  type VendorOrder,
} from '@/services/vendors'
import type { Vendor, VendorService } from '@/types'

export default function VendorDashboard() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined) // undefined = loading

  const load = () => getMyVendor().then(setVendor).catch(() => setVendor(null))
  useEffect(() => { load() }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/vendor/login')
  }

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <EmptyState title="Please log in" description="Log in to the vendor portal to continue." action={<a href="/vendor/login" className="btn-primary mt-2">Vendor login</a>} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950">
      <header className="border-b border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2"><Logo /><span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">Vendor</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/dashboard')} className="btn-ghost"><LayoutDashboard className="h-4 w-4" /> Main dashboard</button>
            <button onClick={() => navigate('/chats')} className="btn-ghost"><MessageCircle className="h-4 w-4" /> Chats</button>
            <NotificationBell />
            <button onClick={handleSignOut} className="btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 lg:p-6">
        {vendor === undefined && <Skeleton className="h-40" />}
        {vendor === null && <ApplyForm onApplied={load} />}
        {vendor && vendor.status !== 'approved' && <StatusCard vendor={vendor} />}
        {vendor && vendor.status === 'approved' && <ServicesManager vendor={vendor} />}
      </main>
    </div>
  )
}

function StatusCard({ vendor }: { vendor: Vendor }) {
  const map = {
    pending: { icon: Clock, cls: 'text-safety-600', title: 'Application under review', desc: 'An administrator is reviewing your vendor application. You will be notified once it is approved.' },
    rejected: { icon: XCircle, cls: 'text-red-600', title: 'Application not approved', desc: vendor.review_notes || 'Your application was not approved. Contact support for details.' },
    suspended: { icon: XCircle, cls: 'text-red-600', title: 'Account suspended', desc: vendor.review_notes || 'Your vendor account is currently suspended.' },
    approved: { icon: CheckCircle2, cls: 'text-green-600', title: 'Approved', desc: '' },
  }[vendor.status]
  const Icon = map.icon
  return (
    <div>
      <PageHeader title={vendor.business_name} subtitle="Vendor status" />
      <div className="card flex items-start gap-4 p-6">
        <Icon className={`h-8 w-8 shrink-0 ${map.cls}`} />
        <div>
          <h3 className="font-semibold">{map.title}</h3>
          <p className="mt-1 text-sm text-steel-500">{map.desc}</p>
        </div>
      </div>
    </div>
  )
}

function ApplyForm({ onApplied }: { onApplied: () => void }) {
  return (
    <div>
      <PageHeader title="Become a vendor" subtitle="Apply to list your diesel generator services on DG Expert." />
      <VendorApplicationForm
        note="Your application will be reviewed by an administrator before you can list services."
        onSubmit={async (input) => { await applyAsVendor(input); onApplied() }}
      />
    </div>
  )
}

function ServicesManager({ vendor }: { vendor: Vendor }) {
  const { planState } = useAuth()
  const [services, setServices] = useState<VendorService[] | null>(null)
  const [editing, setEditing] = useState<ServiceInput | null>(null)

  const load = () => listMyServices(vendor.id).then(setServices).catch(() => setServices([]))
  useEffect(() => { load() }, [vendor.id])

  const remove = async (id: string) => {
    if (!confirm('Delete this service?')) return
    await deleteService(id)
    load()
  }

  if (editing) {
    return <ServiceEditor vendorId={vendor.id} initial={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
  }

  const limit = planState?.plan?.service_listing_limit ?? null // null = unlimited
  const count = services?.length ?? 0
  const atCap = limit !== null && count >= limit
  const startAdd = () => setEditing({ vendor_id: vendor.id, title: '', is_published: true, price_currency: 'USD' })

  return (
    <div>
      <PageHeader
        title={vendor.business_name}
        subtitle="Approved vendor · manage your services and pricing"
        action={
          <button onClick={startAdd} disabled={atCap} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4" /> Add service
          </button>
        }
      />
      {limit !== null && (
        <p className="mb-3 text-xs text-steel-400">{count} / {limit} services used on your plan.</p>
      )}
      {atCap && <UpgradePrompt message={`Free vendors can list up to ${limit} services. Upgrade to Unlimited to add more.`} />}
      {services === null && <Skeleton className="h-32" />}
      {services?.length === 0 && <EmptyState icon={<Store className="h-10 w-10" />} title="No services yet" description="Add your first service and set its pricing. It becomes visible to all DG Expert users immediately." />}
      {services && services.length > 0 && (
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge ${s.is_published ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-steel-100 text-steel-600 dark:bg-steel-800'}`}>{s.is_published ? 'Published' : 'Hidden'}</span>
                  {s.category && <span className="text-xs text-steel-400">{s.category}</span>}
                </div>
                <p className="mt-1 font-medium">{s.title}</p>
                <p className="text-sm text-steel-500">
                  {s.price_amount != null ? `${s.price_currency} ${s.price_amount}${s.price_unit ? ' / ' + s.price_unit : ''}` : 'Contact for pricing'}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(s)} className="btn-ghost !p-2"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(s.id)} className="btn-ghost !p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <IncomingOrders vendorId={vendor.id} />
    </div>
  )
}

function IncomingOrders({ vendorId }: { vendorId: string }) {
  const [orders, setOrders] = useState<VendorOrder[] | null>(null)
  const [chat, setChat] = useState<VendorOrder | null>(null)
  const load = () => listVendorOrders(vendorId).then(setOrders).catch(() => setOrders([]))
  useEffect(() => {
    load()
    const unsub = subscribeServiceOrders(() => load())
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  const setStatus = async (id: string, status: string) => {
    let notes: string | undefined
    if (status === 'declined') {
      notes = prompt('Reason (optional, shown to the customer):') ?? undefined
    }
    await updateOrder(id, { status, ...(notes !== undefined ? { vendor_notes: notes } : {}) }).catch(() => {})
    load()
  }

  const complete = async (id: string) => {
    await markOrderComplete(id, 'vendor').catch(() => {})
    load()
  }

  const flow: Record<string, { next: { label: string; status: string }[] }> = {
    requested: { next: [{ label: 'Accept', status: 'accepted' }, { label: 'Decline', status: 'declined' }] },
    accepted: { next: [{ label: 'Start work', status: 'in_progress' }] },
  }

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-steel-400">Incoming orders</h2>
      {orders === null && <Skeleton className="h-24" />}
      {orders?.length === 0 && <p className="text-sm text-steel-400">No orders yet. They appear here when a user requests one of your services.</p>}
      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-steel-100 capitalize text-steel-600 dark:bg-steel-800 dark:text-steel-300">{o.status.replace('_', ' ')}</span>
                    <span className="text-xs text-steel-400">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-medium">{o.service?.title ?? 'Service'}</p>
                  {o.message && <p className="mt-1 text-sm text-steel-600 dark:text-steel-300">{o.message}</p>}
                  <p className="mt-1 text-xs text-steel-400">
                    {o.contact_email && <>Email: {o.contact_email}</>}
                    {o.contact_phone && <> · Phone: {o.contact_phone}</>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {(flow[o.status]?.next ?? []).map((n) => (
                    <button key={n.status} onClick={() => setStatus(o.id, n.status)} className="btn-secondary !py-1.5 text-xs">{n.label}</button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-steel-100 pt-3 dark:border-steel-800">
                <button onClick={() => setChat(o)} className="btn-secondary !py-1.5 text-xs">
                  <MessageCircle className="h-4 w-4" /> Chat with customer
                </button>
                {o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'declined' && (
                  o.vendor_completed ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> You marked complete{!o.user_completed && ' — waiting for customer'}
                    </span>
                  ) : (
                    <button onClick={() => complete(o.id)} className="btn-secondary !py-1.5 text-xs text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> Mark complete
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {chat && (
        <ChatModal
          orderId={chat.id}
          title={`Chat — ${chat.service?.title ?? 'Order'}`}
          subtitle={chat.contact_email ?? undefined}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  )
}

function ServiceEditor({ vendorId, initial, onCancel, onSaved }: { vendorId: string; initial: ServiceInput; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState<ServiceInput>({ ...initial, vendor_id: vendorId })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof ServiceInput, v: unknown) => setF((prev) => ({ ...prev, [k]: v }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.title?.trim()) return setError('Title is required.')
    setBusy(true)
    setError(null)
    try {
      const payload: ServiceInput = { ...f, vendor_id: vendorId }
      if (payload.price_amount === undefined || (payload.price_amount as unknown as string) === '') payload.price_amount = null
      await upsertService(payload)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save service.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title={initial.id ? 'Edit service' : 'Add service'} />
      <form onSubmit={save} className="card space-y-4 p-6">
        <div><label className="label">Title *</label><input className="input" value={f.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="e.g. On-site generator servicing" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Category</label><input className="input" value={f.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Maintenance" /></div>
          <div className="flex items-center gap-2 pt-6">
            <input id="pub" type="checkbox" checked={f.is_published ?? true} onChange={(e) => set('is_published', e.target.checked)} />
            <label htmlFor="pub" className="text-sm">Published (visible to users)</label>
          </div>
        </div>
        <div><label className="label">Description</label><textarea className="input" rows={3} value={f.description ?? ''} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Price</label><input className="input" type="number" step="0.01" value={(f.price_amount as number | null) ?? ''} onChange={(e) => set('price_amount', e.target.value === '' ? null : Number(e.target.value))} /></div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={f.price_currency ?? 'USD'} onChange={(e) => set('price_currency', e.target.value)}>
              <option>USD</option><option>INR</option><option>EUR</option><option>GBP</option><option>AUD</option>
            </select>
          </div>
          <div><label className="label">Unit</label><input className="input" value={f.price_unit ?? ''} onChange={(e) => set('price_unit', e.target.value)} placeholder="per visit / hour / fixed" /></div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save service'}</button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  )
}
