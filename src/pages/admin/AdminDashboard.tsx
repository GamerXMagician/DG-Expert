import { useEffect, useState } from 'react'
import { Users, UserCheck, Crown, Inbox, FileText, MessageSquare } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui'
import { getAdminStats, type AdminStats } from '@/services/admin'

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => setStats(null))
  }, [])

  const cards = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-brand-600' },
    { label: 'Free Users', value: stats?.freeUsers, icon: UserCheck, color: 'text-steel-500' },
    { label: 'Unlimited Users', value: stats?.unlimitedUsers, icon: Crown, color: 'text-safety-500' },
    { label: 'Pending Requests', value: stats?.pendingRequests, icon: Inbox, color: 'text-orange-500' },
    { label: 'Published Articles', value: stats?.publishedArticles, icon: FileText, color: 'text-green-600' },
    { label: 'AI Questions Today', value: stats?.aiQuestionsToday, icon: MessageSquare, color: 'text-brand-600' },
  ]

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Platform overview" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-steel-500">{c.label}</p>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            {stats === null ? (
              <Skeleton className="mt-2 h-9 w-16" />
            ) : (
              <p className="mt-1 text-3xl font-bold">{c.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
