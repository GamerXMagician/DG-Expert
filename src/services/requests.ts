import { supabase } from '@/lib/supabase'
import type { TechnicalRequest, RequestStatus } from '@/types'

export async function createRequest(input: {
  user_id: string
  question: string
  oem_id?: string | null
  model_text?: string | null
  system?: string | null
  description?: string | null
  attachment_url?: string | null
}): Promise<TechnicalRequest> {
  const { data, error } = await supabase
    .from('technical_requests')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listMyRequests(): Promise<TechnicalRequest[]> {
  const { data, error } = await supabase
    .from('technical_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Admin: all requests
export async function listAllRequests(): Promise<TechnicalRequest[]> {
  const { data, error } = await supabase
    .from('technical_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateRequestStatus(
  id: string,
  status: RequestStatus,
): Promise<void> {
  const { error } = await supabase
    .from('technical_requests')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
