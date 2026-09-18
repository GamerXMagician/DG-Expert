import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/ui'
import { listUsers } from '@/services/admin'
import type { Profile } from '@/types'

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[] | null>(null)

  useEffect(() => {
    listUsers().then(setUsers).catch(() => setUsers([]))
  }, [])

  return (
    <div>
      <PageHeader title="Users" subtitle="All registered users" />
      {users === null && <Skeleton className="h-40" />}
      {users && (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-steel-200 text-left text-xs uppercase text-steel-400 dark:border-steel-800">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100 dark:divide-steel-800">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.phone ?? '—'}</td>
                    <td className="p-3"><RoleBadge role={u.role} /></td>
                    <td className="p-3 capitalize">{u.account_status}</td>
                    <td className="p-3">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div key={u.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{u.first_name} {u.last_name}</p>
                  <RoleBadge role={u.role} />
                </div>
                <p className="text-sm text-steel-500">{u.email}</p>
                <p className="text-sm text-steel-500">{u.phone ?? '—'}</p>
                <p className="mt-1 text-xs text-steel-400">Registered {new Date(u.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`badge ${role === 'admin' ? 'bg-brand-600 text-white' : 'bg-steel-100 text-steel-600 dark:bg-steel-800 dark:text-steel-300'}`}>
      {role}
    </span>
  )
}
