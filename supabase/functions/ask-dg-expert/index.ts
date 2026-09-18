// =============================================================================
// DG Expert — ask-dg-expert Edge Function
// =============================================================================
// Deploy:  supabase functions deploy ask-dg-expert
// Secrets: supabase secrets set OPENAI_API_KEY=sk-...
//
// WHY A FUNCTION: the AI provider key must NEVER be shipped to the browser.
// This function runs on Supabase's edge, holds the key as a secret, and is the
// only place that talks to the AI provider.
//
// RAG-READY: the `context` field lets the frontend (or, later, this function
// itself) pass retrieved knowledge-article snippets. The system prompt instructs
// the model to prefer that context and to cite it. To make this a full RAG loop,
// query `knowledge_articles` here using the service role and inject the top
// matches into `context` before calling the model.
// =============================================================================

// @ts-nocheck  (Deno runtime — types resolved at deploy time)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const SYSTEM_PROMPT = `You are DG Expert, a diesel-generator technical assistant for
professionals and learners. Answer using this exact markdown structure when the
question is a fault/troubleshooting question:

## Diagnosis
## Possible Causes
## Checks
## Recommended Action
## Safety
## OEM Note

Rules:
- NEVER present a diagnosis as certain when information is insufficient. Say what
  is uncertain and ask focused follow-up questions (OEM/model, alarm code,
  temperatures, whether the problem was sudden or gradual).
- Always include a Safety section for any hands-on procedure. Flag high voltage,
  rotating machinery, hot components, fuel, batteries, exhaust gases and
  pressurized cooling systems.
- For high-risk work, state that qualified personnel should perform it.
- Do NOT claim to replace the OEM service manual.
- If provided CONTEXT from the DG Expert knowledge base, prefer it and cite it.`

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { question, context } = await req.json()
    if (!question || typeof question !== 'string') {
      return json({ error: 'A "question" string is required.' }, 400)
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      // Graceful fallback so the app is usable before an AI provider is wired up.
      return json({
        answer: fallbackAnswer(question),
        provider: 'none',
      })
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(context ? [{ role: 'system', content: `CONTEXT from DG Expert knowledge base:\n${context}` }] : []),
      { role: 'user', content: question },
    ]

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0.2 }),
    })

    if (!resp.ok) {
      const detail = await resp.text()
      return json({ error: 'AI provider error', detail }, 502)
    }
    const data = await resp.json()
    const answer = data.choices?.[0]?.message?.content ?? 'No answer generated.'
    return json({ answer, provider: 'openai' })
  } catch (e) {
    return json({ error: 'Unexpected error', detail: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Structured, safety-first placeholder used when no AI key is configured yet.
function fallbackAnswer(question: string): string {
  return `## Diagnosis
No AI provider is configured yet, so this is a structured placeholder for: "${question}".

## Possible Causes
- The AI backend key has not been set (\`OPENAI_API_KEY\`) in Supabase Edge Function secrets.

## Checks
- Confirm the Edge Function \`ask-dg-expert\` is deployed.
- Confirm the provider secret is set (see README §"Connect an AI provider").

## Recommended Action
- Wire up an AI provider, then re-ask. Meanwhile, browse the Knowledge and
  Troubleshooting sections for verified information.

## Safety
Always follow the OEM service manual. Work on electrical, fuel, mechanical and
high-voltage systems should be performed by qualified personnel.

## OEM Note
Procedures vary by manufacturer and model.`
}
