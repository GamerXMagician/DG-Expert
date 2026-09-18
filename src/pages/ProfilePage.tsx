import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, Gauge, Store, Clock, CheckCircle2, XCircle, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { getMyVendor, applyAsVendor, updateMyVendorProfile, reapplyAsVendor } from '@/services/vendors'
import { VendorApplicationForm } from '@/components/VendorApplicationForm'
import type { Vendor } from '@/types'

export default function ProfilePage() {
  const { profile, planState, updateProfile } = useAuth()
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined)
  const loadVendor = () => getMyVendor().then(setVendor).catch(() => setVendor(null))
  useEffect(() => { loadVendor() }, [])

  // Show "Vendor" as the role once an approved vendor record exists, even if the
  // profiles.role column hasn't been flipped yet (avoids a misleading "User").
  const displayRole = vendor?.status === 'approved' ? 'vendor' : profile?.role ?? 'user'

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    setErr(null)
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, phone })
      setMsg('Profile updated.')
    } catch (e2) {
      const m = e2 instanceof Error ? e2.message : String(e2)
      setErr(/phone/i.test(m) ? 'This phone number is already in use.' : 'Could not update profile.')
    } finally {
      setBusy(false)
    }
  }

  const isUnlimited = planState?.plan?.code === 'unlimited'

  return (
    <div>
      <PageHeader title="Profile" subtitle="Manage your account details." />

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={save} className="card space-y-4 p-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First name</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-70" value={profile?.email ?? ''} disabled />
            <p className="mt-1 text-xs text-steel-400">Email is managed by Supabase Auth.</p>
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
        </form>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase text-steel-400">Account</p>
            <dl className="mt-2 space-y-2 text-sm">
              <Row label="Role" value={displayRole} />
              <Row label="Status" value={profile?.account_status ?? 'active'} />
              <Row label="Created" value={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
            </dl>
          </div>

          <div className={`card p-6 ${isUnlimited ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
            <div className="flex items-center gap-2">
              {isUnlimited ? <Crown className="h-5 w-5 text-safety-500" /> : <Gauge className="h-5 w-5 text-brand-600" />}
              <span className="font-bold">{planState?.plan?.name ?? 'Free'}</span>
            </div>
            <p className="mt-1 text-sm text-steel-500">{planState?.plan?.description}</p>
            {planState?.subscription?.expires_at && (
              <p className="mt-2 text-xs text-steel-400">
                Expires {new Date(planState.subscription.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <VendorSection vendor={vendor} onChange={loadVendor} />
    </div>
  )
}

function VendorSection({ vendor, onChange }: { vendor: Vendor | null | undefined; onChange: () => void }) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-steel-400">Vendor account</h2>
      {vendor === undefined && <div className="card h-24 animate-pulse" />}
      {vendor === null && <BecomeVendorForm onApplied={onChange} />}
      {vendor && <VendorStatusCard vendor={vendor} onUpdated={onChange} />}
    </div>
  )
}

function VendorStatusCard({ vendor, onUpdated }: { vendor: Vendor; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false)

  if (vendor.status === 'approved') {
    if (editing) {
      return <VendorEditForm vendor={vendor} onDone={() => { setEditing(false); onUpdated() }} onCancel={() => setEditing(false)} />
    }
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 border-brand-500 p-6 ring-1 ring-brand-500">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold">{vendor.business_name} — approved vendor</p>
            <p className="text-sm text-steel-500">
              {[vendor.category, vendor.location].filter(Boolean).join(' · ') || 'Manage your services, pricing and orders in the vendor dashboard.'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit details</button>
          <Link to="/vendor" className="btn-primary"><Store className="h-4 w-4" /> Open vendor dashboard</Link>
        </div>
      </div>
    )
  }
  const map = {
    pending: { icon: Clock, cls: 'text-safety-600', title: 'Vendor application under review', desc: 'An administrator is verifying your application. You\u2019ll be notified once it\u2019s approved.' },
    rejected: { icon: XCircle, cls: 'text-red-600', title: 'Vendor application not approved', desc: vendor.review_notes || 'Your application was not approved.' },
    suspended: { icon: XCircle, cls: 'text-red-600', title: 'Vendor account suspended', desc: vendor.review_notes || 'Your vendor account is suspended.' },
    approved: { icon: CheckCircle2, cls: '', title: '', desc: '' },
  }[vendor.status]
  const Icon = map.icon
  const canReapply = vendor.status === 'rejected' || vendor.status === 'suspended'

  if (canReapply && editing) {
    return <VendorEditForm vendor={vendor} reapply onDone={() => { setEditing(false); onUpdated() }} onCancel={() => setEditing(false)} />
  }

  return (
    <div className="card flex flex-wrap items-start justify-between gap-3 p-6">
      <div className="flex items-start gap-3">
        <Icon className={`h-6 w-6 shrink-0 ${map.cls}`} />
        <div>
          <p className="font-semibold">{map.title}</p>
          <p className="mt-1 text-sm text-steel-500">{map.desc}</p>
        </div>
      </div>
      {canReapply && (
        <button onClick={() => setEditing(true)} className="btn-primary shrink-0">
          <Store className="h-4 w-4" /> Apply again
        </button>
      )}
    </div>
  )
}

function VendorEditForm({ vendor, reapply = false, onDone, onCancel }: { vendor: Vendor; reapply?: boolean; onDone: () => void; onCancel: () => void }) {
  return (
    <VendorApplicationForm
      initial={vendor}
      title={reapply ? 'Re-apply as a vendor' : 'Edit vendor details'}
      submitLabel={reapply ? 'Submit application' : 'Save details'}
      onSubmit={async (input) => {
        if (reapply) await reapplyAsVendor(vendor.id, input)
        else await updateMyVendorProfile(vendor.id, input)
        onDone()
      }}
      onCancel={onCancel}
    />
  )
}

function BecomeVendorForm({ onApplied }: { onApplied: () => void }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600/10 text-brand-600"><Store className="h-5 w-5" /></span>
          <div>
            <p className="font-semibold">Become a vendor</p>
            <p className="text-sm text-steel-500">Sell your services on DG Expert. Applications are verified by an administrator.</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">Become a vendor</button>
      </div>
    )
  }

  return (
    <VendorApplicationForm
      title="Vendor application"
      note="After you submit, an administrator verifies your application. Once approved your role becomes Vendor and you can list services. Log out and back in after approval to refresh your role."
      onSubmit={async (input) => { await applyAsVendor(input); onApplied() }}
      onCancel={() => setOpen(false)}
    />
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-steel-400">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  )
}
