import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo, Spinner } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { signIn, resetPassword, configured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  const forgot = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then click "Forgot password".')
      return
    }
    setError(null)
    try {
      await resetPassword(email.trim())
      setInfo('If an account exists, a password reset email has been sent.')
    } catch (err) {
      setError(friendly(err))
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your DG Expert account">
      {!configured && <ConfigWarning />}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label">Password</label>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-steel-600 dark:text-steel-300">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <button type="button" onClick={forgot} className="font-medium text-brand-600 hover:underline">
            Forgot password?
          </button>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {info && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{info}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Login'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-steel-500">
        No account?{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:underline">Create account</Link>
      </p>
      <p className="mt-2 text-center text-sm text-steel-500">
        Are you a service provider?{' '}
        <Link to="/vendor/login" className="font-medium text-brand-600 hover:underline">Vendor login</Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mb-6 text-sm text-steel-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ConfigWarning() {
  return (
    <div className="mb-4 rounded-lg border border-safety-500/40 bg-safety-500/10 px-3 py-2 text-sm text-steel-700 dark:text-steel-200">
      Supabase is not configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
      <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code> — see README.
    </div>
  )
}

export function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(msg)) return 'Please confirm your email address first.'
  if (/already registered|already exists/i.test(msg)) return 'An account with this email already exists.'
  if (/duplicate key.*phone|profiles_phone_unique/i.test(msg)) return 'This phone number is already registered.'
  if (/duplicate key.*email|profiles_email_unique/i.test(msg)) return 'This email is already registered.'
  if (/network|failed to fetch/i.test(msg)) return 'Network error. Check your connection and try again.'
  return msg || 'Something went wrong. Please try again.'
}
