import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton, Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { listUsers, logActivity } from '@/services/admin'
import { listPlans } from '@/services/subscription'
import type { Profile, Plan } from '@/types'

export default function AdminSubscriptions() {
  const [users, setUsers] = useState<Profile[] | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subs, setSubs] = useState<Record<string, string>>({}) // user_id -> plan_id
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]))
    listPlans().then(setPlans).catch(() => {})
    supabase
      .from('subscriptions')
      .select('user_id, plan_id')
      .then(({ data }) => {
        const map: Record<string, string> = {}
        ;(data ?? []).forEach((s: any) => (map[s.user_id] = s.plan_id))
        setSubs(map)
      })
  }, [])

  const setPlan = async (userId: string, planId: string) => {
    setSavingId(userId)
    // Admin-controlled subscription for testing. DB (RLS) only allows admins here.
    const { error } = await supabase
      .from('subscriptions')
      .upsert({ user_id: userId, plan_id: planId, status: 'active' }, { onConflict: 'user_id' })
    if (!error) {
      setSubs((m) => ({ ...m, [userId]: planId }))
      await logActivity('set_subscription', 'subscriptions', userId)
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Your subscription has been updated',
        body: `Your plan is now ${plans.find((p) => p.id === planId)?.name ?? ''}.`,
      })
    } else {
      alert(error.message)
    }
    setSavingId(null)
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Admin-controlled plans for testing. Payment provider (Stripe/Razorpay) can be added later. The database is the source of truth."
      />
      {users === null && <Skeleton className="h-40" />}
      {users && (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{u.first_name} {u.last_name}</p>
                <p className="text-sm text-steel-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {savingId === u.id && <Spinner className="text-brand-600" />}
                <select
                  className="input !w-auto"
                  value={subs[u.id] ?? ''}
                  onChange={(e) => setPlan(u.id, e.target.value)}
                >
                  <option value="" disabled>Set plan…</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
