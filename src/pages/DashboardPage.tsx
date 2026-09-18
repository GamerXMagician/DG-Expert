import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare,
  Stethoscope,
  Wrench,
  Factory,
  BookOpen,
  History,
  Crown,
  Gauge,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { listMyQuestions } from '@/services/questions'
import type { Question } from '@/types'

const quickActions = [
  { to: '/assistant', label: 'Ask DG Expert', icon: MessageSquare },
  { to: '/troubleshooting', label: 'Troubleshoot a Generator', icon: Stethoscope },
  { to: '/maintenance', label: 'Maintenance Guide', icon: Wrench },
  { to: '/oems', label: 'Browse OEMs', icon: Factory },
  { to: '/knowledge', label: 'Generator Fundamentals', icon: BookOpen },
  { to: '/history', label: 'My Questions', icon: History },
]

export default function DashboardPage() {
  const { profile, planState } = useAuth()
  const [recent, setRecent] = useState<Question[] | null>(null)

  useEffect(() => {
    listMyQuestions(5).then(setRecent).catch(() => setRecent([]))
  }, [])

  const isUnlimited = planState?.plan?.code === 'unlimited'
  const remaining = planState?.aiQuestionsRemaining

  return (
    <div>
      <PageHeader title={`Welcome back, ${profile?.first_name || 'Engineer'}`} subtitle="Your DG Expert workspace" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-steel-400">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((a) => (
              <Link key={a.to} to={a.to} className="card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-600/10 text-brand-600">
                  <a.icon className="h-5 w-5" />
                </div>
                <span className="font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Subscription card */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-steel-400">Subscription</h2>
          <div className={`card p-6 ${isUnlimited ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
            <div className="flex items-center gap-2">
              {isUnlimited ? <Crown className="h-5 w-5 text-safety-500" /> : <Gauge className="h-5 w-5 text-brand-600" />}
              <span className="text-lg font-bold">{planState?.plan?.name ?? 'Free'}</span>
            </div>
            {isUnlimited ? (
              <p className="mt-2 text-sm text-steel-500">Unlimited Access</p>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-steel-500">Remaining AI questions today</p>
                <p className="text-3xl font-bold text-brand-600">{remaining ?? '—'}</p>
                <Link to="/pricing" className="btn-primary mt-4 w-full">Upgrade to Unlimited</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent questions */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-steel-400">Recent questions</h2>
          <Link to="/history" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>
        </div>
        <div className="card divide-y divide-steel-100 dark:divide-steel-800">
          {recent === null && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          )}
          {recent?.length === 0 && (
            <p className="p-6 text-center text-sm text-steel-400">
              No questions yet. <Link to="/assistant" className="text-brand-600 hover:underline">Ask DG Expert</Link>.
            </p>
          )}
          {recent?.map((q) => (
            <Link key={q.id} to="/history" className="block p-4 hover:bg-steel-50 dark:hover:bg-steel-800/50">
              <p className="line-clamp-1 font-medium">{q.question}</p>
              <p className="text-xs text-steel-400">{new Date(q.created_at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
