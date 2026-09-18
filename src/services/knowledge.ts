import { supabase } from '@/lib/supabase'
import type {
  KnowledgeArticle,
  KnowledgeCategory,
  Oem,
  GeneratorModel,
} from '@/types'

export async function listCategories(): Promise<KnowledgeCategory[]> {
  const { data, error } = await supabase
    .from('knowledge_categories')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function listOems(): Promise<Oem[]> {
  const { data, error } = await supabase
    .from('oems')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function getOem(slug: string): Promise<Oem | null> {
  const { data, error } = await supabase.from('oems').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data
}

export async function listModels(oemId: string): Promise<GeneratorModel[]> {
  const { data, error } = await supabase
    .from('generator_models')
    .select('*')
    .eq('oem_id', oemId)
    .order('name')
  if (error) throw error
  return data ?? []
}

interface ArticleFilter {
  oemId?: string
  categoryId?: string
  system?: string
  status?: 'published' | 'draft' | 'all'
}

export async function listArticles(filter: ArticleFilter = {}): Promise<KnowledgeArticle[]> {
  let q = supabase.from('knowledge_articles').select('*').order('published_at', {
    ascending: false,
    nullsFirst: false,
  })
  if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status)
  else if (!filter.status) q = q.eq('status', 'published')
  if (filter.oemId) q = q.eq('oem_id', filter.oemId)
  if (filter.categoryId) q = q.eq('category_id', filter.categoryId)
  if (filter.system) q = q.eq('system', filter.system)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getArticle(id: string): Promise<KnowledgeArticle | null> {
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// Full-text search over published articles.
export async function searchArticles(query: string): Promise<KnowledgeArticle[]> {
  const term = query.trim()
  if (!term) return []
  const { data, error } = await supabase
    .from('knowledge_articles')
    .select('*')
    .eq('status', 'published')
    .textSearch('search_tsv', term, { type: 'websearch', config: 'english' })
    .limit(50)
  if (error) {
    // Fall back to ILIKE if text search config is unavailable.
    const { data: d2 } = await supabase
      .from('knowledge_articles')
      .select('*')
      .eq('status', 'published')
      .or(`title.ilike.%${term}%,problem.ilike.%${term}%,symptoms.ilike.%${term}%`)
      .limit(50)
    return d2 ?? []
  }
  return data ?? []
}
