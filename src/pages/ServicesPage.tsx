import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Store, MapPin, X, Send, Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, Spinner, UpgradePrompt } from '@/components/ui'
import { listPublicServices, placeOrder, getMyVendor, type PublicService } from '@/services/vendors'
import { subscribeVendorServices } from '@/services/notifications'
import { useAuth } from '@/contexts/AuthContext'

const FREE_VIEW_LIMIT = 5

export default function ServicesPage() {
  const [services, setServices] = useState<PublicService[] | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PublicService | null>(null)
  const [isApprovedVendor, setIsApprovedVendor] = useState(false)

  const load = () => listPublicServices().then(setServices).catch(() => setServices([]))
  useEffect(() => {
    load()
    getMyVendor().then((v) => setIsApprovedVendor(v?.status === 'approved')).catch(() => {})
    const unsub = subscribeVendorServices(() => load())
    return unsub
  }, [])

  const filtered = useMemo(() => {
    if (!services) return null
    if (!query.trim()) return services
    const q = query.toLowerCase()
    return services.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q) ||
        (s.vendor?.business_name ?? '').toLowerCase().includes(q),
    )
  }, [services, query])

  const { planState } = useAuth()
  const unlimited = planState?.plan?.code === 'unlimited'
  const visible = filtered && !unlimited ? filtered.slice(0, FREE_VIEW_LIMIT) : filtered
  const capped = !!filtered && !unlimited && filtered.length > FREE_VIEW_LIMIT

  return (
    <div>
      <PageHeader
        title="Vendor Services"
        subtitle="Browse services from approved vendors — click one to order or request help."
        action={
          <div className="flex gap-2">
            {isApprovedVendor && (
              <Link to="/vendor" className="btn-primary"><Plus className="h-4 w-4" /> Add service</Link>
            )}
            <Link to="/orders" className="btn-secondary">My orders</Link>
          </div>
        }
      />

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-400" />
        <input className="input pl-10" placeholder="Search services, vendors, categories…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      )}
      {filtered?.length === 0 && (
        <EmptyState icon={<Store className="h-10 w-10" />} title="No services listed yet" description="Approved vendors' published services will appear here." />
      )}
      {filtered && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible!.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="card flex flex-col p-5 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2">
                {s.category && <span className="badge bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300">{s.category}</span>}
              </div>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              {s.description && <p className="mt-1 line-clamp-3 text-sm text-steel-500">{s.description}</p>}
              <div className="mt-3 text-lg font-bold text-brand-600">
                {s.price_amount != null ? `${s.price_currency} ${s.price_amount}` : 'Contact for pricing'}
                {s.price_amount != null && s.price_unit && <span className="text-sm font-normal text-steel-400"> / {s.price_unit}</span>}
              </div>
              <div className="mt-auto pt-4 text-xs text-steel-400">
                <div className="flex items-center gap-1"><Store className="h-3.5 w-3.5" /> {s.vendor?.business_name ?? 'Vendor'}</div>
                {s.vendor?.location && <div className="mt-0.5 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.vendor.location}</div>}
              </div>
              <span className="mt-3 text-sm font-medium text-brand-600">Order / request help →</span>
            </button>
          ))}
        </div>
      )}

      {capped && <UpgradePrompt message={`Free plan shows ${FREE_VIEW_LIMIT} services. Upgrade to see all ${filtered!.length}.`} />}

      {selected && <OrderModal service={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function OrderModal({ service, onClose }: { service: PublicService; onClose: () => void }) {
  const { session } = useAuth()
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(session?.user?.email ?? '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await placeOrder({
        service_id: service.id,
        vendor_id: service.vendor_id,
        message: message.trim() || null,
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place the order.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{service.title}</h2>
            <p className="mt-1 text-sm text-steel-500">by {service.vendor?.business_name}</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2"><X className="h-5 w-5" /></button>
        </div>

        {service.description && <p className="mb-3 text-sm text-steel-600 dark:text-steel-300">{service.description}</p>}
        <div className="mb-4 text-lg font-bold text-brand-600">
          {service.price_amount != null ? `${service.price_currency} ${service.price_amount}` : 'Contact for pricing'}
          {service.price_amount != null && service.price_unit && <span className="text-sm font-normal text-steel-400"> / {service.price_unit}</span>}
        </div>

        {done ? (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
            Your request has been sent to <strong>{service.vendor?.business_name}</strong>. Track it under
            {' '}<Link to="/orders" className="underline">My orders</Link>. The vendor will be notified and will respond.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">What do you need? (optional)</label>
              <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your requirement, generator model, timeframe…" />
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Contact phone (optional)</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="So the vendor can reach you" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Spinner /> : <><Send className="h-4 w-4" /> Send request to vendor</>}
            </button>
            <p className="text-center text-xs text-steel-400">This sends an enquiry/order to the vendor. No payment is taken here.</p>
          </form>
        )}
      </div>
    </div>
  )
}
