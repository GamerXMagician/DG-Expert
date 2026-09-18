import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, Phone, Mail, MessageCircle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, EmptyState } from '@/components/ui'
import { ChatModal } from '@/components/ChatModal'
import { listMyOrders, cancelOrder, markOrderComplete, type MyOrder } from '@/services/vendors'
import { subscribeServiceOrders } from '@/services/notifications'

const statusCls: Record<string, string> = {
  requested: 'bg-safety-500/15 text-safety-600',
  accepted: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  in_progress: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  cancelled: 'bg-steel-200 text-steel-600 dark:bg-steel-800 dark:text-steel-300',
  declined: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null)
  const [chat, setChat] = useState<MyOrder | null>(null)

  const load = () => listMyOrders().then(setOrders).catch(() => setOrders([]))
  useEffect(() => {
    load()
    const unsub = subscribeServiceOrders(() => load())
    return unsub
  }, [])

  const cancel = async (id: string) => {
    if (!confirm('Cancel this order?')) return
    await cancelOrder(id).catch(() => {})
    load()
  }

  const complete = async (id: string) => {
    await markOrderComplete(id, 'user').catch(() => {})
    load()
  }

  return (
    <div>
      <PageHeader title="My Orders" subtitle="Services you've ordered or requested help with." action={<Link to="/services" className="btn-secondary">Browse services</Link>} />

      {orders === null && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>}
      {orders?.length === 0 && (
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="No orders yet" description="Browse vendor services and place your first request." action={<Link to="/services" className="btn-primary mt-2">Browse services</Link>} />
      )}
      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge capitalize ${statusCls[o.status] ?? 'bg-steel-100 text-steel-600'}`}>{o.status.replace('_', ' ')}</span>
                    <span className="text-xs text-steel-400">{new Date(o.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 font-medium">{o.service?.title ?? 'Service'}</p>
                  <p className="text-sm text-steel-500">by {o.vendor?.business_name ?? 'Vendor'}</p>
                  {o.message && <p className="mt-2 text-sm text-steel-600 dark:text-steel-300">You: {o.message}</p>}
                  {o.vendor_notes && <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">Vendor: {o.vendor_notes}</p>}
                  {(o.status === 'accepted' || o.status === 'in_progress' || o.status === 'completed') && (
                    <p className="mt-2 flex flex-wrap gap-3 text-xs text-steel-400">
                      {o.vendor?.contact_phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {o.vendor.contact_phone}</span>}
                      {o.vendor?.contact_email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {o.vendor.contact_email}</span>}
                    </p>
                  )}
                </div>
                {(o.status === 'requested' || o.status === 'accepted') && (
                  <button onClick={() => cancel(o.id)} className="btn-ghost !py-1.5 text-xs text-red-600">Cancel</button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-steel-100 pt-3 dark:border-steel-800">
                <button onClick={() => setChat(o)} className="btn-secondary !py-1.5 text-xs">
                  <MessageCircle className="h-4 w-4" /> Chat with vendor
                </button>
                {o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'declined' && (
                  o.user_completed ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> You marked complete{!o.vendor_completed && ' — waiting for vendor'}
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
          title={`Chat — ${chat.vendor?.business_name ?? 'Vendor'}`}
          subtitle={chat.service?.title ?? undefined}
          onClose={() => setChat(null)}
        />
      )}
    </div>
  )
}
