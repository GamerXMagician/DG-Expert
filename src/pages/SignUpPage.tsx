import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Spinner } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { useAuth } from '@/contexts/AuthContext'
import { AuthShell, ConfigWarning, friendly } from './LoginPage'

export default function SignUpPage() {
  const { signUp, configured } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (f.password.length < 8) return setError('Password must be at least 8 characters.')
    if (f.password !== f.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await signUp({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        email: f.email.trim(),
        phone: f.phone.trim(),
        password: f.password,
      })
      setDone(true)
      // If email confirmation is off, session is active — go to dashboard.
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthShell title="Account created" subtitle="Welcome to DG Expert">
        <p className="text-sm text-steel-600 dark:text-steel-300">
          Your account is ready. If email confirmation is enabled on the project, check your inbox to
          confirm before logging in. Redirecting…
        </p>
        <Link to="/login" className="btn-primary mt-4 w-full">Go to login</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="One account per user — one email, one phone number.">
      {!configured && <ConfigWarning />}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input className="input" required value={f.firstName} onChange={on('firstName')} />
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" required value={f.lastName} onChange={on('lastName')} />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={f.email} onChange={on('email')} autoComplete="email" />
        </div>
        <div>
          <label className="label">Phone number</label>
          <input className="input" type="tel" required value={f.phone} onChange={on('phone')} autoComplete="tel" />
        </div>
        <div>
          <label className="label">Password</label>
          <PasswordInput value={f.password} onChange={(v) => setF((prev) => ({ ...prev, password: v }))} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <PasswordInput value={f.confirm} onChange={(v) => setF((prev) => ({ ...prev, confirm: v }))} autoComplete="new-password" />
        </div>
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          One account per user. Duplicate email or phone registrations are prevented.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-steel-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Login</Link>
      </p>
      <div className="mt-4 rounded-lg border border-steel-200 bg-steel-50 px-3 py-3 text-center text-sm dark:border-steel-800 dark:bg-steel-900/50">
        <p className="text-steel-600 dark:text-steel-300">Want to sell services on DG Expert?</p>
        <Link to="/vendor/signup" className="font-medium text-brand-600 hover:underline">Become a vendor →</Link>
      </div>
    </AuthShell>
  )
}
