// Domain types mirroring the Supabase schema (supabase/schema.sql).

export type UserRole = 'user' | 'admin' | 'vendor'
export type ArticleStatus = 'draft' | 'published'
export type RequestStatus = 'pending' | 'in_progress' | 'answered' | 'published'
export type SubStatus = 'active' | 'expired' | 'cancelled'
export type VendorStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type OrderStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'declined'

export interface ServiceOrder {
  id: string
  service_id: string
  vendor_id: string
  user_id: string
  message: string | null
  contact_email: string | null
  contact_phone: string | null
  status: OrderStatus
  vendor_notes: string | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  user_id: string
  business_name: string
  category: string | null
  categories: string[] | null
  contact_name: string | null
  description: string | null
  contact_email: string | null
  contact_phone: string | null
  pan_number: string | null
  pan_doc_url: string | null
  gst_number: string | null
  gst_doc_url: string | null
  msme_doc_url: string | null
  website: string | null
  location: string | null
  status: VendorStatus
  review_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface VendorService {
  id: string
  vendor_id: string
  title: string
  category: string | null
  description: string | null
  price_amount: number | null
  price_currency: string
  price_unit: string | null
  oem_id: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: UserRole
  account_status: string
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  ai_questions_per_day: number | null
  oem_access_limit: number | null
  saved_history_limit: number | null
  service_listing_limit: number | null
  features: Record<string, unknown>
  is_active: boolean
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  status: SubStatus
  started_at: string
  expires_at: string | null
  provider: string | null
}

export interface Oem {
  id: string
  slug: string
  name: string
  country: string | null
  overview: string | null
  engine_families: string | null
  logo_url: string | null
  is_active: boolean
  sort_order: number
}

export interface GeneratorModel {
  id: string
  oem_id: string
  name: string
  engine_family: string | null
  power_rating: string | null
  notes: string | null
}

export interface KnowledgeCategory {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
}

export interface KnowledgeArticle {
  id: string
  title: string
  oem_id: string | null
  model_id: string | null
  category_id: string | null
  system: string | null
  problem: string | null
  symptoms: string | null
  possible_causes: string | null
  diagnostic_procedure: string | null
  corrective_action: string | null
  safety_precautions: string | null
  references_text: string | null
  body: string | null
  is_demo: boolean
  status: ArticleStatus
  author_id: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface TechnicalRequest {
  id: string
  user_id: string
  question: string
  oem_id: string | null
  model_text: string | null
  system: string | null
  description: string | null
  attachment_url: string | null
  status: RequestStatus
  resolved_article_id: string | null
  created_at: string
}

export interface Question {
  id: string
  user_id: string
  question: string
  answer: string | null
  oem_id: string | null
  category: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  user_id: string | null
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export interface OrderMessage {
  id: string
  order_id: string
  sender_id: string
  body: string | null
  image_url: string | null
  created_at: string
}
