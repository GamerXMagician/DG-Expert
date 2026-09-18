import { supabase } from '@/lib/supabase'
import type { Plan, Subscription } from '@/types'

export interface PlanState {
  plan: Plan | null
  subscription: Subscription | null
  aiQuestionsRemaining: number | null // null = unlimited
}

export async function getMyPlan(): Promise<Plan | null> {
  const { data, error } = await supabase.rpc('my_plan')
  if (error) throw error
  // RPC returning a table row → supabase returns an array or single object.
  if (Array.isArray(data)) return (data[0] as Plan) ?? null
  return (data as Plan) ?? null
}

export async function getMySubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getAiQuestionsRemaining(): Promise<number | null> {
  const { data, error } = await supabase.rpc('ai_questions_remaining')
  if (error) throw error
  return data as number | null
}

// Atomically consume one AI question; false = daily limit reached.
export async function consumeAiQuestion(): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_ai_question')
  if (error) throw error
  return data as boolean
}

export async function getPlanState(): Promise<PlanState> {
  const [plan, subscription, remaining] = await Promise.all([
    getMyPlan().catch(() => null),
    getMySubscription().catch(() => null),
    getAiQuestionsRemaining().catch(() => null),
  ])
  return { plan, subscription, aiQuestionsRemaining: remaining }
}

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_cents')
  if (error) throw error
  return data ?? []
}
