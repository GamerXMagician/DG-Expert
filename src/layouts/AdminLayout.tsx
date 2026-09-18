import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Store,
  Inbox,
  BookOpen,
  Factory,
  CreditCard,
  Bell,
  ArrowLeft,
  MessagesSquare,
  LifeBuoy,
} from 'lucide-react'
import { Logo } from '@/components/ui'
import { NotificationBell } from '@/components/NotificationBell'

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/vendors', label: 'Vendors', icon: Store },
  { to: '/admin/chats', label: 'Chats', icon: MessagesSquare },
  { to: '/admin/support', label: 'Support', icon: LifeBuoy },
  { to: '/admin/requests', label: 'Technical Requests', icon: Inbox },
  { to: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/admin/oems', label: 'OEMs', icon: Factory },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
]

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-steel-200 bg-white p-4 dark:border-steel-800 dark:bg-steel-900 md:block">
        <div className="mb-6"><Logo /></div>
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-steel-400">
          Admin
        </p>
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/dashboard" className="btn-ghost mt-6 w-full justify-start">
          <ArrowLeft className="h-4 w-4" /> Back to app
        </Link>
      </aside>

      <div className="min-w-0 flex-1 bg-steel-50 dark:bg-steel-950">
        {/* Mobile admin nav */}
        <div className="flex gap-2 overflow-x-auto border-b border-steel-200 bg-white p-2 dark:border-steel-800 dark:bg-steel-900 md:hidden">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-brand-600 text-white' : 'bg-steel-100 dark:bg-steel-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center justify-end border-b border-steel-200 bg-white px-4 py-2 dark:border-steel-800 dark:bg-steel-900">
          <NotificationBell />
        </div>
        <main className="p-4 lg:p-6">
          <div className="mx-auto max-w-6xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
