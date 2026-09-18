import { useEffect, useState } from 'react'
import { MessagesSquare, Search, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState } from '@/components/ui'
import { OrderChat } from '@/components/OrderChat'
import { listAdminThreads, type AdminThread } from '@/services/chat'

const statusCls: Record<string, string> = {
  requested: 'bg-safety-500/15 text-safety-600',
  accepted: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  in_progress: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  cancelled: 'bg-steel-200 text-steel-600 dark:bg-steel-800 dark:text-steel-300',
  declined: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

function userName(t: AdminThread): string {
  const n = `${t.user?.first_name ?? ''} ${t.user?.last_name ?? ''}`.trim()
  return n || t.user?.email || 'User'
}

export default function AdminChats() {
  const [threads, setThreads] = useState<AdminThread[] | null>(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<AdminThread | null>(null)

  const load = (query?: string) =>
    listAdminThreads(query).then(setThreads).catch(() => setThreads([]))

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => load(q), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  // Inline read-only chat view (admin can view but not send).
  if (open) {
    return (
      <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-xl border border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
        <div className="flex items-center gap-3 border-b border-steel-200 px-4 py-3 dark:border-steel-800">
          <button onClick={() => setOpen(null)} className="btn-ghost !px-2" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{userName(open)} ↔ {open.vendor?.business_name ?? 'Vendor'}</p>
            <p className="truncate text-xs text-steel-400">{open.service?.title ?? ''} · read-only</p>
          </div>
          <button onClick={() => setOpen(null)} className="btn-secondary ml-auto !py-1.5 text-xs">Close</button>
        </div>
        <OrderChat orderId={open.id} readOnly className="min-h-0 flex-1" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Chats" subtitle="Browse and monitor buyer–vendor conversations (read-only)." />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-400" />
        <input
          className="input pl-9"
          placeholder="Search by user, vendor or service…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {threads === null && <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {threads?.length === 0 && (
        <EmptyState icon={<MessagesSquare className="h-10 w-10" />} title="No conversations" description="Order chats will appear here as users and vendors talk." />
      )}
      {threads && threads.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-steel-200 dark:border-steel-800">
          <table className="w-full text-sm">
            <thead className="bg-steel-50 text-left text-xs uppercase text-steel-400 dark:bg-steel-900">
              <tr>
                <th className="px-4 py-2 font-semibold">User</th>
                <th className="px-4 py-2 font-semibold">Vendor</th>
                <th className="px-4 py-2 font-semibold">Service</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 text-right font-semibold">Messages</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 dark:divide-steel-800">
              {threads.map((t) => (
                <tr key={t.id} className="hover:bg-steel-50 dark:hover:bg-steel-900/50">
                  <td className="px-4 py-2">
                    <p className="font-medium">{userName(t)}</p>
                    <p className="text-xs text-steel-400">{t.user?.email}</p>
                  </td>
                  <td className="px-4 py-2">{t.vendor?.business_name ?? '—'}</td>
                  <td className="px-4 py-2">{t.service?.title ?? '—'}</td>
                  <td className="px-4 py-2"><span className={`badge capitalize ${statusCls[t.status] ?? 'bg-steel-100 text-steel-600'}`}>{t.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-2 text-right tabular-nums">{t.message_count}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => setOpen(t)} className="btn-secondary !py-1.5 text-xs">View chat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
