import { supabase } from '@/lib/supabase'
import type { KnowledgeArticle, Profile } from '@/types'

export interface AdminStats {
  totalUsers: number
  freeUsers: number
  unlimitedUsers: number
  totalQuestions: number
  pendingRequests: number
  publishedArticles: number
  aiQuestionsToday: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const countOf = async (table: string, apply?: (q: any) => any): Promise<number> => {
    let q = supabase.from(table).select('*', { count: 'exact', head: true })
    if (apply) q = apply(q)
    const { count } = await q
    return count ?? 0
  }

  const [
    totalUsers,
    pendingRequests,
    publishedArticles,
    totalQuestions,
  ] = await Promise.all([
    countOf('profiles'),
    countOf('technical_requests', (q) => q.eq('status', 'pending')),
    countOf('knowledge_articles', (q) => q.eq('status', 'published')),
    countOf('questions'),
  ])

  // Free vs unlimited via subscriptions→plans join.
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('plan:plans(code)')
  let freeUsers = 0
  let unlimitedUsers = 0
  ;(subs ?? []).forEach((s: any) => {
    const code = s.plan?.code
    if (code === 'unlimited') unlimitedUsers += 1
    else freeUsers += 1
  })

  const today = new Date().toISOString().slice(0, 10)
  const { data: usageRows } = await supabase
    .from('user_usage')
    .select('ai_questions')
    .eq('usage_date', today)
  const aiQuestionsToday = (usageRows ?? []).reduce(
    (sum: number, r: any) => sum + (r.ai_questions ?? 0),
    0,
  )

  return {
    totalUsers,
    freeUsers,
    unlimitedUsers,
    totalQuestions,
    pendingRequests,
    publishedArticles,
    aiQuestionsToday,
  }
}

export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listAllArticles(): Promise<KnowledgeArticle[]> {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export type ArticleInput = Partial<KnowledgeArticle> & { title: string }

export async function upsertArticle(input: ArticleInput): Promise<KnowledgeArticle> {
  const payload = { ...input }
  const { data, error } = await supabase
    .from('knowledge_articles')
    .upsert(payload)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function setArticleStatus(
  id: string,
  status: 'draft' | 'published',
): Promise<void> {
  const { error } = await supabase.from('knowledge_articles').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('knowledge_articles').delete().eq('id', id)
  if (error) throw error
}

// Broadcast a notification to all users (user_id NULL = broadcast).
export async function broadcastNotification(title: string, body: string, link?: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_id: null, title, body, link: link ?? null })
  if (error) throw error
}

export async function logActivity(action: string, entity?: string, entityId?: string): Promise<void> {
  await supabase.from('admin_activity').insert({ action, entity, entity_id: entityId ?? null })
}
