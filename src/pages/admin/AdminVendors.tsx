import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Store, Ban, ArrowLeft, ChevronRight, Download } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState, Spinner } from '@/components/ui'
import { listAllVendors, setVendorStatus } from '@/services/vendors'
import { logActivity } from '@/services/admin'
import type { Vendor, VendorStatus } from '@/types'

const statusBadge: Record<VendorStatus, string> = {
  pending: 'bg-safety-500/15 text-safety-600',
  approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  suspended: 'bg-steel-200 text-steel-600 dark:bg-steel-800 dark:text-steel-300',
}

export default function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[] | null>(null)
  const [filter, setFilter] = useState<'all' | VendorStatus>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => listAllVendors().then(setVendors).catch(() => setVendors([]))
  useEffect(() => { load() }, [])

  const act = async (v: Vendor, status: VendorStatus) => {
    let notes: string | undefined
    if (status === 'rejected' || status === 'suspended') {
      notes = prompt(`Reason for ${status} (shown to the vendor):`) ?? undefined
      if (notes === undefined) return // cancelled
    }
    setBusyId(v.id)
    try {
      await setVendorStatus(v.id, status, notes)
      await logActivity(`vendor_${status}`, 'vendors', v.id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const selected = selectedId ? (vendors ?? []).find((v) => v.id === selectedId) ?? null : null

  // ---- Detail view ----
  if (selected) {
    return (
      <div>
        <button onClick={() => setSelectedId(null)} className="btn-ghost mb-4 !px-2 text-sm"><ArrowLeft className="h-4 w-4" /> Back to applications</button>
        <VendorDetail
          v={selected}
          busy={busyId === selected.id}
          onApprove={() => act(selected, 'approved')}
          onReject={() => act(selected, 'rejected')}
          onSuspend={() => act(selected, 'suspended')}
        />
      </div>
    )
  }

  // ---- List view ----
  const shown = (vendors ?? []).filter((v) => filter === 'all' || v.status === filter)

  return (
    <div>
      <PageHeader title="Vendors" subtitle="Review and approve vendor applications. Click one to see full details." />

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(['pending', 'approved', 'rejected', 'suspended', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium capitalize ${
              filter === s ? 'bg-brand-600 text-white' : 'bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {vendors === null && <Skeleton className="h-40" />}
      {vendors !== null && shown.length === 0 && (
        <EmptyState icon={<Store className="h-10 w-10" />} title="No vendors" description="Vendor applications appear here for review." />
      )}
      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className="card flex w-full items-center justify-between gap-3 p-4 text-left transition hover:border-brand-400"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`badge capitalize ${statusBadge[v.status]}`}>{v.status}</span>
                  <span className="truncate font-semibold">{v.business_name}</span>
                </div>
                <p className="mt-1 truncate text-xs text-steel-400">
                  {v.contact_name && <>{v.contact_name} · </>}
                  {(v.categories?.length ? v.categories.join(', ') : v.category) || 'No category'} ·
                  {' '}applied {new Date(v.created_at).toLocaleDateString()}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-steel-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VendorDetail({
  v,
  busy,
  onApprove,
  onReject,
  onSuspend,
}: {
  v: Vendor
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onSuspend: () => void
}) {
  const cats = v.categories?.length ? v.categories.join(', ') : v.category
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className={`badge capitalize ${statusBadge[v.status]}`}>{v.status}</span>
          <h2 className="mt-2 text-2xl font-bold">{v.business_name}</h2>
          <p className="text-sm text-steel-500">Applied {new Date(v.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          {busy && <Spinner className="text-brand-600" />}
          <button onClick={() => downloadVendorPdf(v)} className="btn-secondary !py-2 text-sm"><Download className="h-4 w-4" /> Download PDF</button>
          {v.status !== 'approved' && (
            <button onClick={onApprove} className="btn-primary !py-2 text-sm"><CheckCircle2 className="h-4 w-4" /> Approve</button>
          )}
          {v.status !== 'rejected' && v.status !== 'approved' && (
            <button onClick={onReject} className="btn-secondary !py-2 text-sm text-red-600"><XCircle className="h-4 w-4" /> Reject</button>
          )}
          {v.status === 'approved' && (
            <button onClick={onSuspend} className="btn-secondary !py-2 text-sm text-red-600"><Ban className="h-4 w-4" /> Suspend</button>
          )}
        </div>
      </div>

      {v.review_notes && (
        <p className="mt-3 rounded-lg bg-steel-100 px-3 py-2 text-sm text-steel-600 dark:bg-steel-800 dark:text-steel-300">
          Review note: {v.review_notes}
        </p>
      )}

      <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Detail label="Contact name" value={v.contact_name} />
        <Detail label="Contact number" value={v.contact_phone} />
        <Detail label="Contact email" value={v.contact_email} />
        <Detail label="Location" value={v.location} />
        <Detail label="Categories" value={cats} />
        <Detail label="PAN number" value={v.pan_number} />
        <Detail label="GST number" value={v.gst_number} />
        <Detail label="Website" value={v.website} link={v.website} />
      </dl>

      {v.description && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-steel-400">Description</p>
          <p className="mt-1 text-sm">{v.description}</p>
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase text-steel-400">Documents</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <DocPreview label="PAN card" url={v.pan_doc_url} />
          <DocPreview label="GST certificate" url={v.gst_doc_url} />
          <DocPreview label="MSME certificate" url={v.msme_doc_url} />
        </div>
      </div>
    </div>
  )
}

// Build a print-friendly window with all info + document images and invoke the
// browser's print dialog (Save as PDF). Dependency-free.
function downloadVendorPdf(v: Vendor) {
  const esc = (s: unknown) => String(s ?? '—').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const cats = v.categories?.length ? v.categories.join(', ') : v.category
  const row = (label: string, val: unknown) => `<tr><td class="l">${esc(label)}</td><td>${esc(val)}</td></tr>`
  const docImg = (label: string, url: string | null) => {
    if (!url) return `<div class="doc"><b>${esc(label)}</b><p>Not provided</p></div>`
    const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf')
    return `<div class="doc"><b>${esc(label)}</b>${
      isPdf ? `<p><a href="${esc(url)}">${esc(url)}</a> (PDF)</p>` : `<img src="${esc(url)}" />`
    }</div>`
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Vendor — ${esc(v.business_name)}</title>
  <style>
    body{font-family:system-ui,Arial,sans-serif;color:#111;margin:32px;}
    h1{margin:0 0 4px;} .sub{color:#666;margin:0 0 20px;}
    table{border-collapse:collapse;width:100%;margin-bottom:20px;}
    td{border:1px solid #ddd;padding:8px;font-size:14px;vertical-align:top;}
    td.l{width:180px;color:#555;font-weight:600;background:#f7f7f7;}
    .doc{margin:12px 0;} .doc img{max-width:100%;max-height:360px;border:1px solid #ddd;border-radius:6px;margin-top:6px;}
    h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px;}
  </style></head><body>
    <h1>${esc(v.business_name)}</h1>
    <p class="sub">Vendor application · status: ${esc(v.status)} · applied ${esc(new Date(v.created_at).toLocaleString())}</p>
    <h2>Details</h2>
    <table>
      ${row('Contact name', v.contact_name)}
      ${row('Contact number', v.contact_phone)}
      ${row('Contact email', v.contact_email)}
      ${row('Location', v.location)}
      ${row('Categories', cats)}
      ${row('PAN number', v.pan_number)}
      ${row('GST number', v.gst_number)}
      ${row('Website', v.website)}
      ${row('Description', v.description)}
      ${row('Review note', v.review_notes)}
    </table>
    <h2>Documents</h2>
    ${docImg('PAN card', v.pan_doc_url)}
    ${docImg('GST certificate', v.gst_doc_url)}
    ${docImg('MSME certificate', v.msme_doc_url)}
    <script>
      // Wait for images to load, then print.
      const imgs = Array.from(document.images);
      let left = imgs.length;
      if (!left) { window.print(); }
      imgs.forEach((im) => { if (im.complete) { if(--left===0) window.print(); }
        else { im.onload = im.onerror = () => { if(--left===0) window.print(); }; } });
    </script>
  </body></html>`
  const w = window.open('', '_blank')
  if (!w) { alert('Please allow pop-ups to download the PDF.'); return }
  w.document.write(html)
  w.document.close()
}

function Detail({ label, value, link }: { label: string; value?: string | null; link?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-steel-400">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value
          ? link
            ? <a href={link} target="_blank" rel="noreferrer" className="text-brand-600 underline">{value}</a>
            : value
          : <span className="text-steel-400">—</span>}
      </dd>
    </div>
  )
}

function DocPreview({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="rounded-lg border border-steel-200 p-3 text-sm text-steel-400 dark:border-steel-800">
        {label}: not provided
      </div>
    )
  }
  const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf')
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-steel-200 transition hover:border-brand-400 dark:border-steel-800">
      {isPdf ? (
        <div className="grid h-40 place-items-center bg-steel-100 text-sm text-steel-500 dark:bg-steel-800">PDF — click to open</div>
      ) : (
        <img src={url} alt={label} className="h-40 w-full object-cover" />
      )}
      <p className="px-3 py-2 text-sm font-medium">{label}</p>
    </a>
  )
}
