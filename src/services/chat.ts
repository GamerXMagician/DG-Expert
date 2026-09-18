import { supabase } from '@/lib/supabase'
import type { OrderMessage } from '@/types'

// ---- per-order chat (buyer <-> vendor, admin read-only) ---------------------

export async function listMessages(orderId: string): Promise<OrderMessage[]> {
  const { data, error } = await supabase
    .from('order_messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function sendMessage(input: {
  order_id: string
  body?: string | null
  image_url?: string | null
}): Promise<OrderMessage> {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('order_messages')
    .insert({
      order_id: input.order_id,
      sender_id: uid,
      body: input.body?.trim() || null,
      image_url: input.image_url ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Upload an image into order-chat/<orderId>/<uuid>.<ext> and return its public URL.
export async function uploadChatImage(orderId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${orderId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('order-chat')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('order-chat').getPublicUrl(path)
  return data.publicUrl
}

// Realtime: new messages for a single order thread. Returns an unsubscribe fn.
export function subscribeOrderMessages(
  orderId: string,
  onInsert: (m: OrderMessage) => void,
): () => void {
  const channel = supabase
    .channel(`order-chat-${orderId}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'order_messages', filter: `order_id=eq.${orderId}` },
      (payload) => onInsert(payload.new as OrderMessage),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// ---- my threads (user or vendor sees only their own orders) -----------------

export interface MyThread {
  id: string
  created_at: string
  status: string
  // The other party's display label, resolved by the caller's role.
  counterparty: string
  service_title: string
  message_count: number
}

// RLS on service_orders already restricts rows to the buyer, the vendor owner,
// and admins. A single account can be BOTH a buyer (on orders it placed) and a
// vendor (on orders it received), so we decide the counterparty PER THREAD from
// whether the current user is the order's buyer or its vendor owner.
export async function listMyThreads(_role?: 'user' | 'vendor'): Promise<MyThread[]> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? ''

  // Which vendor ids does the current user own? (usually 0 or 1)
  const { data: myVendors } = await supabase.from('vendors').select('id').eq('user_id', uid)
  const myVendorIds = new Set((myVendors ?? []).map((v: any) => v.id))

  const { data, error } = await supabase
    .from('service_orders')
    .select('id, created_at, status, user_id, vendor_id, contact_email, vendor:vendors(business_name), service:vendor_services(title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as any[]

  // Message counts per order (one cheap query, best-effort).
  const counts = new Map<string, number>()
  if (rows.length) {
    const { data: msgs } = await supabase
      .from('order_messages')
      .select('order_id')
      .in('order_id', rows.map((r) => r.id))
    for (const m of (msgs ?? []) as any[]) {
      counts.set(m.order_id, (counts.get(m.order_id) ?? 0) + 1)
    }
  }

  return rows.map((r) => {
    // I'm the vendor on this order if I own its vendor row (even if my order
    // was placed by me too, being the vendor owner takes the vendor view).
    const iAmVendor = myVendorIds.has(r.vendor_id)
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      counterparty: iAmVendor
        ? r.contact_email || 'Customer'
        : r.vendor?.business_name ?? 'Vendor',
      service_title: r.service?.title ?? 'Service',
      message_count: counts.get(r.id) ?? 0,
    }
  }) as MyThread[]
}

// ---- support chat (user <-> admin) ------------------------------------------

export interface SupportMessage {
  id: string
  thread_user: string
  sender_id: string
  from_admin: boolean
  body: string | null
  image_url: string | null
  created_at: string
}

// List a support thread. threadUser defaults to the current user (their own
// thread); an admin passes a specific user's id to view that thread.
export async function listSupportMessages(threadUser?: string): Promise<SupportMessage[]> {
  const uid = threadUser ?? (await supabase.auth.getUser()).data.user?.id ?? ''
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('thread_user', uid)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function sendSupportMessage(input: {
  thread_user: string
  from_admin: boolean
  body?: string | null
  image_url?: string | null
}): Promise<SupportMessage> {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      thread_user: input.thread_user,
      sender_id: uid,
      from_admin: input.from_admin,
      body: input.body?.trim() || null,
      image_url: input.image_url ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export function subscribeSupportThread(
  threadUser: string,
  onInsert: (m: SupportMessage) => void,
): () => void {
  const channel = supabase
    .channel(`support-${threadUser}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `thread_user=eq.${threadUser}` },
      (payload) => onInsert(payload.new as SupportMessage),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}

// Upload a support image (reuses the order-chat bucket under a support/ prefix).
export async function uploadSupportImage(threadUser: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${threadUser}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('order-chat').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('order-chat').getPublicUrl(path)
  return data.publicUrl
}

export interface SupportThread {
  thread_user: string
  user_name: string
  last_body: string | null
  last_at: string
  count: number
}

// Admin: distinct support threads with a lightweight preview, newest first.
export async function listSupportThreads(): Promise<SupportThread[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('thread_user, body, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  const map = new Map<string, SupportThread>()
  for (const r of (data ?? []) as any[]) {
    const ex = map.get(r.thread_user)
    if (ex) { ex.count += 1; continue }
    map.set(r.thread_user, { thread_user: r.thread_user, user_name: r.thread_user, last_body: r.body, last_at: r.created_at, count: 1 })
  }
  // Label each thread with the user's name/email (admins can read all profiles).
  const ids = [...map.keys()]
  if (ids.length) {
    const { data: profs } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', ids)
    for (const p of (profs ?? []) as any[]) {
      const t = map.get(p.id)
      if (t) t.user_name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || p.id
    }
  }
  return [...map.values()]
}

export interface AdminThread {
  id: string
  created_at: string
  status: string
  user: { first_name: string | null; last_name: string | null; email: string } | null
  vendor: { business_name: string } | null
  service: { title: string } | null
  message_count: number
}

// Admin sees every order (RLS grants admins select on all orders). We hydrate a
// lightweight thread list and filter client-side by the search query.
export async function listAdminThreads(query?: string): Promise<AdminThread[]> {
  // user_id references auth.users (not profiles), so profiles can't be embedded;
  // fetch orders first, then batch-load the buyer profiles by id.
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, created_at, status, user_id, contact_email, vendor:vendors(business_name), service:vendor_services(title)')
    .order('created_at', { ascending: false })
  if (error) throw error
  const orders = (data ?? []) as any[]

  const profiles = new Map<string, { first_name: string | null; last_name: string | null; email: string }>()
  const counts = new Map<string, number>()
  if (orders.length) {
    const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))]
    const [{ data: profs }, { data: msgs }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email').in('id', userIds),
      supabase.from('order_messages').select('order_id').in('order_id', orders.map((o) => o.id)),
    ])
    for (const p of (profs ?? []) as any[]) profiles.set(p.id, p)
    for (const m of (msgs ?? []) as any[]) counts.set(m.order_id, (counts.get(m.order_id) ?? 0) + 1)
  }

  const rows = orders.map((r) => {
    const p = profiles.get(r.user_id)
    return {
      id: r.id,
      created_at: r.created_at,
      status: r.status,
      user: p
        ? { first_name: p.first_name, last_name: p.last_name, email: p.email }
        : r.contact_email
          ? { first_name: null, last_name: null, email: r.contact_email }
          : null,
      vendor: r.vendor ?? null,
      service: r.service ?? null,
      message_count: counts.get(r.id) ?? 0,
    }
  }) as AdminThread[]

  const q = query?.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((r) => {
    const name = `${r.user?.first_name ?? ''} ${r.user?.last_name ?? ''}`.toLowerCase()
    return (
      name.includes(q) ||
      (r.user?.email ?? '').toLowerCase().includes(q) ||
      (r.vendor?.business_name ?? '').toLowerCase().includes(q) ||
      (r.service?.title ?? '').toLowerCase().includes(q)
    )
  })
}
