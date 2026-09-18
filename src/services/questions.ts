import { supabase } from '@/lib/supabase'
import type { Question } from '@/types'

export async function saveQuestion(input: {
  user_id: string
  question: string
  answer: string | null
  oem_id?: string | null
  category?: string | null
}): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      user_id: input.user_id,
      question: input.question,
      answer: input.answer,
      oem_id: input.oem_id ?? null,
      category: input.category ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listMyQuestions(limit = 50): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('questions').delete().eq('id', id)
  if (error) throw error
}

export async function bookmarkQuestion(userId: string, questionId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_questions')
    .insert({ user_id: userId, question_id: questionId })
  if (error && error.code !== '23505') throw error // ignore duplicate
}
