import { supabase } from '@/lib/supabase'
import type { Vendor, VendorService, VendorStatus } from '@/types'

// ---- vendor account (self) --------------------------------------------------

export async function getMyVendor(): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .maybeSingle()
  if (error) throw error
  return data
}

export interface VendorApplicationInput {
  business_name: string
  contact_name?: string | null
  category?: string | null
  categories?: string[] | null
  description?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  pan_number?: string | null
  pan_doc_url?: string | null
  gst_number?: string | null
  gst_doc_url?: string | null
  msme_doc_url?: string | null
  website?: string | null
  location?: string | null
}

export async function applyAsVendor(input: VendorApplicationInput): Promise<Vendor> {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('vendors')
    .insert({ ...input, user_id: uid, status: 'pending' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Upload a vendor KYC document (PAN / MSME) into vendor-docs/<uid>/<uuid>.<ext>.
export async function uploadVendorDoc(file: File): Promise<string> {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Not authenticated')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const path = `${uid}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('vendor-docs')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('vendor-docs').getPublicUrl(path)
  return data.publicUrl
}

export async function updateMyVendorProfile(
  id: string,
  patch: Partial<VendorApplicationInput>,
): Promise<void> {
  const { error } = await supabase.from('vendors').update(patch).eq('id', id)
  if (error) throw error
}

// Re-apply after rejection/suspension: update details and reset status to
// pending. The DB guard allows this specific self-service transition.
export async function reapplyAsVendor(
  id: string,
  patch: Partial<VendorApplicationInput>,
): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .update({ ...patch, status: 'pending', review_notes: null })
    .eq('id', id)
  if (error) throw error
}

// ---- vendor services --------------------------------------------------------

export async function listMyServices(vendorId: string): Promise<VendorService[]> {
  const { data, error } = await supabase
    .from('vendor_services')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export type ServiceInput = Partial<VendorService> & { vendor_id: string; title: string }

export async function upsertService(input: ServiceInput): Promise<VendorService> {
  const { data, error } = await supabase
    .from('vendor_services')
    .upsert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('vendor_services').delete().eq('id', id)
  if (error) throw error
}

// ---- public marketplace (approved vendors' published services) --------------

export interface PublicService extends VendorService {
  vendor: Pick<Vendor, 'id' | 'business_name' | 'category' | 'location'> | null
}

export async function listPublicServices(query?: string): Promise<PublicService[]> {
  let q = supabase
    .from('vendor_services')
    .select('*, vendor:vendors(id, business_name, category, location, status)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (query && query.trim()) {
    q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
  }
  const { data, error } = await q
  if (error) throw error
  // RLS already filters to approved vendors, but guard client-side too.
  return ((data ?? []) as any[]).filter((s) => s.vendor?.status === 'approved') as PublicService[]
}

export async function listApprovedVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('status', 'approved')
    .order('business_name')
  if (error) throw error
  return data ?? []
}

// ---- admin review -----------------------------------------------------------

export async function listAllVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function setVendorStatus(
  id: string,
  status: VendorStatus,
  reviewNotes?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (reviewNotes !== undefined) patch.review_notes = reviewNotes
  const { error } = await supabase.from('vendors').update(patch).eq('id', id)
  if (error) throw error
}

// ---- service orders ---------------------------------------------------------

export async function placeOrder(input: {
  service_id: string
  vendor_id: string
  message?: string | null
  contact_email: string
  contact_phone?: string | null
}): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id
  if (!uid) throw new Error('Please log in to place an order.')
  const { error } = await supabase.from('service_orders').insert({
    service_id: input.service_id,
    vendor_id: input.vendor_id,
    user_id: uid,
    message: input.message ?? null,
    contact_email: input.contact_email,
    contact_phone: input.contact_phone ?? null,
  })
  if (error) throw error
}

export interface MyOrder {
  id: string
  status: string
  message: string | null
  vendor_notes: string | null
  user_completed: boolean
  vendor_completed: boolean
  created_at: string
  service: { title: string; price_amount: number | null; price_currency: string; price_unit: string | null } | null
  vendor: { business_name: string; contact_phone: string | null; contact_email: string | null } | null
}

export async function listMyOrders(): Promise<MyOrder[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, status, message, vendor_notes, user_completed, vendor_completed, created_at, service:vendor_services(title, price_amount, price_currency, price_unit), vendor:vendors(business_name, contact_phone, contact_email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MyOrder[]
}

export async function cancelOrder(id: string): Promise<void> {
  const { error } = await supabase.from('service_orders').update({ status: 'cancelled' }).eq('id', id)
  if (error) throw error
}

// Mark the caller's side of an order complete. The DB trigger flips status to
// 'completed' only once BOTH sides have ticked.
export async function markOrderComplete(id: string, side: 'user' | 'vendor'): Promise<void> {
  const patch = side === 'user' ? { user_completed: true } : { vendor_completed: true }
  const { error } = await supabase.from('service_orders').update(patch).eq('id', id)
  if (error) throw error
}

export interface VendorOrder {
  id: string
  status: string
  message: string | null
  contact_email: string | null
  contact_phone: string | null
  vendor_notes: string | null
  user_completed: boolean
  vendor_completed: boolean
  created_at: string
  service: { title: string } | null
}

export async function listVendorOrders(vendorId: string): Promise<VendorOrder[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('id, status, message, contact_email, contact_phone, vendor_notes, user_completed, vendor_completed, created_at, service:vendor_services(title)')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as VendorOrder[]
}

export async function updateOrder(
  id: string,
  patch: { status?: string; vendor_notes?: string },
): Promise<void> {
  const { error } = await supabase.from('service_orders').update(patch).eq('id', id)
  if (error) throw error
}
