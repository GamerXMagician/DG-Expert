import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState } from '@/components/ui'
import { listAllRequests, updateRequestStatus } from '@/services/requests'
import type { TechnicalRequest, RequestStatus } from '@/types'

const statuses: RequestStatus[] = ['pending', 'in_progress', 'answered', 'published']

export default function AdminRequests() {
  const [items, setItems] = useState<TechnicalRequest[] | null>(null)

  useEffect(() => {
    listAllRequests().then(setItems).catch(() => setItems([]))
  }, [])

  const change = async (id: string, status: RequestStatus) => {
    await updateRequestStatus(id, status).catch(() => {})
    setItems((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null)
  }

  return (
    <div>
      <PageHeader title="Technical Requests" subtitle="User requests for missing information" />
      {items === null && <Skeleton className="h-40" />}
      {items?.length === 0 && <EmptyState title="No requests" description="User-submitted technical requests will appear here." />}
      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{r.question}</p>
                  {r.description && <p className="mt-1 text-sm text-steel-500">{r.description}</p>}
                  <p className="mt-2 text-xs text-steel-400">
                    {r.model_text && <>Model: {r.model_text} · </>}
                    {r.system && <>System: {r.system} · </>}
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <select
                  value={r.status}
                  onChange={(e) => change(r.id, e.target.value as RequestStatus)}
                  className="input !w-auto !py-1.5 text-xs"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
