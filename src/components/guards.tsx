import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FullPageSpinner, EmptyState } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/login" replace />
  // NOTE: this is a UX gate only. Real authorization is enforced by Supabase RLS
  // (is_admin() policies) — a non-admin who bypasses this cannot read/write admin data.
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-lg p-8">
        <EmptyState
          icon={<ShieldAlert className="h-10 w-10" />}
          title="Admin access required"
          description="You do not have permission to view this page. This is enforced by the database (RLS), not just the UI."
        />
      </div>
    )
  return <>{children}</>
}
