import { useState } from 'react'
import { Store, Upload, CheckCircle2, X, FileText } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { VendorTermsModal } from '@/components/VendorTermsModal'
import { uploadVendorDoc, type VendorApplicationInput } from '@/services/vendors'
import type { Vendor } from '@/types'

export const VENDOR_CATEGORIES = ['Service', 'Parts', 'Rental', 'Installation', 'Consulting', 'AMC', 'Spares'] as const

interface Props {
  initial?: Partial<Vendor> | null
  title?: string
  submitLabel?: string
  note?: string
  onSubmit: (input: VendorApplicationInput) => Promise<void>
  onCancel?: () => void
}

// One shared vendor application/edit form: contact + business + KYC (PAN, GST,
// MSME) with document uploads and multi-category selection.
export function VendorApplicationForm({ initial, title, submitLabel = 'Submit application', note, onSubmit, onCancel }: Props) {
  const [f, setF] = useState({
    business_name: initial?.business_name ?? '',
    contact_name: initial?.contact_name ?? '',
    contact_phone: initial?.contact_phone ?? '',
    contact_email: initial?.contact_email ?? '',
    pan_number: initial?.pan_number ?? '',
    gst_number: initial?.gst_number ?? '',
    location: initial?.location ?? '',
    website: initial?.website ?? '',
    description: initial?.description ?? '',
  })
  const [categories, setCategories] = useState<string[]>(
    initial?.categories?.length ? initial.categories : initial?.category ? [initial.category] : [],
  )
  const [panDocUrl, setPanDocUrl] = useState<string | null>(initial?.pan_doc_url ?? null)
  const [gstDocUrl, setGstDocUrl] = useState<string | null>(initial?.gst_doc_url ?? null)
  const [msmeDocUrl, setMsmeDocUrl] = useState<string | null>(initial?.msme_doc_url ?? null)
  const [uploading, setUploading] = useState<'pan' | 'gst' | 'msme' | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  const toggleCat = (c: string) =>
    setCategories((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  const upload = async (which: 'pan' | 'gst' | 'msme', file: File | undefined) => {
    if (!file) return
    setUploading(which)
    setError(null)
    try {
      const url = await uploadVendorDoc(file)
      if (which === 'pan') setPanDocUrl(url)
      else if (which === 'gst') setGstDocUrl(url)
      else setMsmeDocUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Required-field validation.
    if (!f.business_name.trim()) return setError('Business name is required.')
    if (!f.contact_name.trim()) return setError('Contact name is required.')
    if (!f.contact_phone.trim()) return setError('Contact number is required.')
    if (!f.contact_email.trim()) return setError('Contact email is required.')
    if (!f.pan_number.trim()) return setError('PAN number is required.')
    if (!panDocUrl) return setError('PAN card attachment is required.')
    if (!f.gst_number.trim()) return setError('GST number is required.')
    if (!gstDocUrl) return setError('GST certificate attachment is required.')
    if (!msmeDocUrl) return setError('MSME certificate is required.')
    if (!f.location.trim()) return setError('Location is required.')
    if (categories.length === 0) return setError('Select at least one category.')
    if (!agreed) return setError('You must agree to the Vendor Terms & Conditions to proceed.')

    setBusy(true)
    setError(null)
    try {
      await onSubmit({
        business_name: f.business_name.trim(),
        contact_name: f.contact_name.trim(),
        contact_phone: f.contact_phone.trim(),
        contact_email: f.contact_email.trim(),
        pan_number: f.pan_number.trim(),
        pan_doc_url: panDocUrl,
        gst_number: f.gst_number.trim(),
        gst_doc_url: gstDocUrl,
        msme_doc_url: msmeDocUrl,
        location: f.location.trim(),
        website: f.website.trim() || null,
        description: f.description.trim() || null,
        categories,
        category: categories[0] ?? null, // keep legacy single-category column in sync
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit application.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {title && <p className="font-semibold">{title}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name *"><input className="input" required value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></Field>
        <Field label="Business name *"><input className="input" required value={f.business_name} onChange={(e) => set('business_name', e.target.value)} /></Field>
        <Field label="Contact number *"><input className="input" required value={f.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} /></Field>
        <Field label="Contact email *"><input className="input" type="email" required value={f.contact_email} onChange={(e) => set('contact_email', e.target.value)} /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PAN number *"><input className="input" required value={f.pan_number} onChange={(e) => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" /></Field>
        <Field label="GST number *"><input className="input" required value={f.gst_number} onChange={(e) => set('gst_number', e.target.value.toUpperCase())} placeholder="22ABCDE1234F1Z5" /></Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DocField label="PAN card attachment *" url={panDocUrl} uploading={uploading === 'pan'} onPick={(file) => upload('pan', file)} onClear={() => setPanDocUrl(null)} />
        <DocField label="GST certificate *" url={gstDocUrl} uploading={uploading === 'gst'} onPick={(file) => upload('gst', file)} onClear={() => setGstDocUrl(null)} />
        <DocField label="MSME certificate *" url={msmeDocUrl} uploading={uploading === 'msme'} onPick={(file) => upload('msme', file)} onClear={() => setMsmeDocUrl(null)} />
      </div>

      <div>
        <label className="label">Categories * (select all that apply)</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map((c) => {
            const on = categories.includes(c)
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggleCat(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  on
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : 'border-steel-300 text-steel-600 hover:border-brand-400 dark:border-steel-700 dark:text-steel-300'
                }`}
              >
                {on && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}{c}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location *"><input className="input" required value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" /></Field>
        <Field label="Website (optional)"><input className="input" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
      </div>

      <Field label="Description"><textarea className="input" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What does your business offer?" /></Field>

      {note && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">{note}</p>
      )}

      <div className="rounded-lg border border-steel-200 p-3 dark:border-steel-800">
        {agreed ? (
          <p className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> You have agreed to the Vendor Terms &amp; Conditions.
            <button type="button" onClick={() => setShowTerms(true)} className="ml-1 text-xs text-brand-600 underline">Re-read</button>
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-steel-600 dark:text-steel-300">You must read and agree to the Terms &amp; Conditions to submit. *</span>
            <button type="button" onClick={() => setShowTerms(true)} className="btn-secondary !py-1.5 text-sm">
              <FileText className="h-4 w-4" /> Read Terms &amp; Conditions
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy || uploading !== null || !agreed}>
          {busy ? <Spinner /> : <><Store className="h-4 w-4" /> {submitLabel}</>}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>}
      </div>

      {showTerms && (
        <VendorTermsModal
          onAgree={() => { setAgreed(true); setShowTerms(false); setError(null) }}
          onClose={() => setShowTerms(false)}
        />
      )}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function DocField({
  label,
  url,
  uploading,
  onPick,
  onClear,
}: {
  label: string
  url: string | null
  uploading: boolean
  onPick: (file: File | undefined) => void
  onClear: () => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {url ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <a href={url} target="_blank" rel="noreferrer" className="truncate text-green-700 underline dark:text-green-300">Uploaded — view</a>
          <button type="button" onClick={onClear} className="ml-auto text-red-600" aria-label="Remove"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-steel-300 px-3 py-2 text-sm text-steel-500 hover:border-brand-400 dark:border-steel-700">
          {uploading ? <Spinner /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Upload image or PDF'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  )
}
