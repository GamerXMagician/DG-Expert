import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  ClipboardList,
  LifeBuoy,
  BookOpen,
  Factory,
  Store,
  Wrench,
  Stethoscope,
  History,
  User,
  Sun,
  Moon,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui'
import { NotificationBell } from '@/components/NotificationBell'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/oems', label: 'OEMs', icon: Factory },
  { to: '/services', label: 'Services', icon: Store },
  { to: '/orders', label: 'My Orders', icon: ClipboardList },
  { to: '/chats', label: 'Chats', icon: MessagesSquare },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/troubleshooting', label: 'Troubleshoot', icon: Stethoscope },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/history', label: 'History', icon: History },
]

export default function AppLayout() {
  const { profile, isAdmin, isVendor, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-steel-200 bg-white/90 backdrop-blur dark:border-steel-800 dark:bg-steel-950/90">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost !p-2 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Logo />
          </div>

          <div className="flex items-center gap-1">
            <button className="btn-ghost !p-2" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <div className="relative">
              <NotificationBell />
            </div>

            <Link to="/profile" className="btn-ghost !p-2" aria-label="Profile">
              <User className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-steel-200 p-4 dark:border-steel-800 lg:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SideLink key={item.to} {...item} />
            ))}
            {isVendor && (
              <>
                <div className="my-3 border-t border-steel-200 dark:border-steel-800" />
                <SideLink to="/vendor" label="Vendor Dashboard" icon={Store} />
              </>
            )}
            {isAdmin && (
              <>
                <div className="my-3 border-t border-steel-200 dark:border-steel-800" />
                <SideLink to="/admin" label="Admin" icon={Shield} />
              </>
            )}
          </nav>
          <button onClick={handleSignOut} className="btn-ghost mt-4 w-full justify-start">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
          {profile && (
            <p className="mt-4 px-3 text-xs text-steel-400">
              Signed in as<br />
              <span className="font-medium text-steel-600 dark:text-steel-300">{profile.email}</span>
            </p>
          )}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-20 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <nav
              className="absolute left-0 top-16 h-full w-64 space-y-1 bg-white p-4 dark:bg-steel-950"
              onClick={(e) => e.stopPropagation()}
            >
              {navItems.map((item) => (
                <SideLink key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
              {isVendor && <SideLink to="/vendor" label="Vendor Dashboard" icon={Store} onClick={() => setMobileOpen(false)} />}
              {isAdmin && <SideLink to="/admin" label="Admin" icon={Shield} onClick={() => setMobileOpen(false)} />}
              <button onClick={handleSignOut} className="btn-ghost mt-4 w-full justify-start">
                <LogOut className="h-5 w-5" /> Sign out
              </button>
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          <div className="mx-auto max-w-6xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-steel-200 bg-white dark:border-steel-800 dark:bg-steel-950 lg:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'text-brand-600' : 'text-steel-500'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SideLink({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
            : 'text-steel-600 hover:bg-steel-100 dark:text-steel-300 dark:hover:bg-steel-800'
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}
