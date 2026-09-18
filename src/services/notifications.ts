import { supabase } from '@/lib/supabase'
import type { AppNotification } from '@/types'

export async function listMyNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data ?? []
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

// Subscribe to realtime notifications for a SPECIFIC user (server-side filtered
// so a client never receives another user's notifications). Pass includeBroadcast
// for admins, who should also receive broadcast rows (user_id is null).
export function subscribeNotifications(
  onInsert: (n: AppNotification) => void,
  opts?: { userId?: string | null; includeBroadcast?: boolean },
): () => void {
  const uid = opts?.userId ?? null
  const suffix = Math.random().toString(36).slice(2)
  const channel = supabase.channel(`notifications-feed-${suffix}`)

  if (uid) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
      (payload) => onInsert(payload.new as AppNotification),
    )
  }
  if (opts?.includeBroadcast) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=is.null' },
      (payload) => onInsert(payload.new as AppNotification),
    )
  }
  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// Subscribe to newly published knowledge articles.
export function subscribePublishedArticles(onPublish: (row: unknown) => void): () => void {
  const channel = supabase
    .channel(`published-articles-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'knowledge_articles' },
      (payload) => {
        const row = payload.new as { status?: string } | null
        if (row && row.status === 'published') onPublish(row)
      },
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// Subscribe to any change in vendor_services (used by the public Services page).
export function subscribeVendorServices(onChange: () => void): () => void {
  const channel = supabase
    .channel(`vendor-services-feed-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vendor_services' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// Subscribe to any change in service_orders (vendor dashboard + user orders).
export function subscribeServiceOrders(onChange: () => void): () => void {
  const channel = supabase
    .channel(`service-orders-feed-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'service_orders' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
