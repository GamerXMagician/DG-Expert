import { supabase } from '@/lib/supabase'
import { consumeAiQuestion } from './subscription'
import { searchArticles } from './knowledge'
import type { KnowledgeArticle } from '@/types'

export interface AiResult {
  answer: string
  provider: string
  limited: boolean // true if the daily limit blocked the request
}

// RAG-lite: pull top matching published articles to pass as grounding context.
async function buildContext(question: string): Promise<string> {
  try {
    const arts: KnowledgeArticle[] = await searchArticles(question)
    if (!arts.length) return ''
    return arts
      .slice(0, 3)
      .map(
        (a) =>
          `# ${a.title}\nSystem: ${a.system ?? '-'}\nCauses: ${a.possible_causes ?? '-'}\n` +
          `Checks: ${a.diagnostic_procedure ?? '-'}\nAction: ${a.corrective_action ?? '-'}\n` +
          `Safety: ${a.safety_precautions ?? '-'}`,
      )
      .join('\n\n---\n\n')
  } catch {
    return ''
  }
}

export async function askDgExpert(question: string): Promise<AiResult> {
  // Enforce the per-day limit in the DB BEFORE calling the model.
  const allowed = await consumeAiQuestion()
  if (!allowed) {
    return {
      answer:
        '## Daily limit reached\n\nYou have used all of your Free-plan AI questions for today. ' +
        'Upgrade to **Unlimited** for unlimited questions, or come back tomorrow.',
      provider: 'none',
      limited: true,
    }
  }

  const context = await buildContext(question)

  const { data, error } = await supabase.functions.invoke('ask-dg-expert', {
    body: { question, context },
  })

  if (error || !data) {
    return {
      answer:
        '## AI temporarily unavailable\n\nThe AI backend could not be reached. ' +
        'Please try again shortly, or browse the Knowledge and Troubleshooting sections.\n\n' +
        '## Safety\nAlways follow the OEM service manual and use qualified personnel for high-risk work.',
      provider: 'error',
      limited: false,
    }
  }
  return {
    answer: (data as { answer?: string }).answer ?? 'No answer generated.',
    provider: (data as { provider?: string }).provider ?? 'unknown',
    limited: false,
  }
}
