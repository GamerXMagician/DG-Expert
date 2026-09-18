// =============================================================================
// DG Expert — vendor-email Edge Function
// =============================================================================
// Sends a transactional email to a vendor on approval / rejection.
//
// Deploy:  supabase functions deploy vendor-email --no-verify-jwt
// Secrets: supabase secrets set RESEND_API_KEY=re_...           (email provider)
//          supabase secrets set VENDOR_EMAIL_FROM="DG Expert <noreply@yourdomain>"
//          supabase secrets set VENDOR_EMAIL_HOOK_SECRET=<any-long-random-string>
//
// It is called by the database (via pg_net in vendors.sql) with a shared-secret
// header, so it does NOT rely on a user JWT — hence --no-verify-jwt plus our own
// secret check below.
//
// WHY A FUNCTION: the email-provider API key must never live in the DB or the
// browser. It lives only in this function's secrets.
// =============================================================================

// @ts-nocheck  (Deno runtime — types resolved at deploy time)
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Shared-secret gate (the DB sends this header). Rejects arbitrary callers.
  const expected = Deno.env.get('VENDOR_EMAIL_HOOK_SECRET')
  if (expected && req.headers.get('x-hook-secret') !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { to?: string; status?: string; business_name?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 })
  }

  const { to, status, business_name, notes } = body
  if (!to || !status) {
    return new Response(JSON.stringify({ error: 'to and status are required' }), { status: 400 })
  }

  const approved = status === 'approved'
  const subject = approved
    ? `Your DG Expert vendor account is approved`
    : `Update on your DG Expert vendor application`
  const html = approved
    ? `<h2>You're approved 🎉</h2>
       <p>Your vendor account <strong>${escapeHtml(business_name ?? '')}</strong> has been approved on DG Expert.</p>
       <p>You can now log in and list your services and pricing.</p>
       <p><a href="${appUrl()}/vendor">Open your vendor dashboard</a></p>`
    : `<h2>Vendor application update</h2>
       <p>Your vendor application for <strong>${escapeHtml(business_name ?? '')}</strong> was not approved.</p>
       ${notes ? `<p>Reason: ${escapeHtml(notes)}</p>` : ''}
       <p>You may contact support or re-apply from your dashboard.</p>`

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('VENDOR_EMAIL_FROM') ?? 'DG Expert <onboarding@resend.dev>'
  if (!apiKey) {
    // No provider configured yet — succeed as a no-op so the DB call doesn't fail.
    return json({ ok: true, sent: false, reason: 'RESEND_API_KEY not set' })
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!resp.ok) {
    const detail = await resp.text()
    return json({ ok: false, sent: false, detail }, 502)
  }
  return json({ ok: true, sent: true })
})

function appUrl(): string {
  return Deno.env.get('APP_URL') ?? 'http://localhost:5173'
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })
}
