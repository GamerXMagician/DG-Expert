import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessagesSquare, ChevronRight, ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState } from '@/components/ui'
import { OrderChat } from '@/components/OrderChat'
import { useAuth } from '@/contexts/AuthContext'
import { listMyThreads, type MyThread } from '@/services/chat'
import { subscribeServiceOrders } from '@/services/notifications'

const statusCls: Record<string, string> = {
  requested: 'bg-safety-500/15 text-safety-600',
  accepted: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  in_progress: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  cancelled: 'bg-steel-200 text-steel-600 dark:bg-steel-800 dark:text-steel-300',
  declined: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export default function ChatsPage() {
  const { isVendor } = useAuth()
  const role = isVendor ? 'vendor' : 'user'
  const [threads, setThreads] = useState<MyThread[] | null>(null)
  const [open, setOpen] = useState<MyThread | null>(null)

  const load = () => listMyThreads(role).then(setThreads).catch(() => setThreads([]))
  useEffect(() => {
    load()
    const unsub = subscribeServiceOrders(() => load())
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  // Inline chat view — fills the content area (sidebar + top nav stay visible).
  if (open) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-900">
        <div className="flex items-center gap-3 border-b border-steel-200 px-4 py-3 dark:border-steel-800">
          <button onClick={() => setOpen(null)} className="btn-ghost !px-2" aria-label="Back to chats">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-semibold">{open.counterparty}</p>
            <p className="truncate text-xs text-steel-400">{open.service_title}</p>
          </div>
          <button onClick={() => setOpen(null)} className="btn-secondary ml-auto !py-1.5 text-xs">Close</button>
        </div>
        <OrderChat orderId={open.id} className="min-h-0 flex-1" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Chats" subtitle="Your conversations with vendors and customers." action={<Link to={isVendor ? '/vendor' : '/orders'} className="btn-secondary">My orders</Link>} />

      {threads === null && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>}
      {threads?.length === 0 && (
        <EmptyState
          icon={<MessagesSquare className="h-10 w-10" />}
          title="No chats yet"
          description={isVendor ? 'Conversations appear here when a customer orders a service.' : 'Order a service and message the vendor to start a chat.'}
          action={!isVendor ? <Link to="/services" className="btn-primary mt-2">Browse services</Link> : undefined}
        />
      )}
      {threads && threads.length > 0 && (
        <div className="space-y-2">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpen(t)}
              className="card flex w-full items-center justify-between gap-3 p-4 text-left transition hover:border-brand-400"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{t.counterparty}</p>
                <p className="truncate text-sm text-steel-500">{t.service_title}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`badge capitalize ${statusCls[t.status] ?? 'bg-steel-100 text-steel-600'}`}>{t.status.replace('_', ' ')}</span>
                <span className="text-xs text-steel-400">{t.message_count} msg</span>
                <ChevronRight className="h-4 w-4 text-steel-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
