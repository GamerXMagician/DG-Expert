import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { Logo, Spinner } from '@/components/ui'
import { PasswordInput } from '@/components/PasswordInput'
import { useAuth } from '@/contexts/AuthContext'
import { ConfigWarning, friendly } from './LoginPage'
import { supabase } from '@/lib/supabase'
import { applyAsVendor, getMyVendor } from '@/services/vendors'
import { VendorApplicationForm } from '@/components/VendorApplicationForm'

function VendorShell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <div className="card p-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600/10 text-brand-600">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold">Vendor Portal</h1>
              <p className="text-xs text-steel-500">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function VendorLoginPage() {
  const { signIn, configured } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      navigate('/vendor')
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <VendorShell subtitle="Log in to manage your services">
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
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Vendor login'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-steel-500">
        New vendor?{' '}
        <Link to="/vendor/signup" className="font-medium text-brand-600 hover:underline">Register your business</Link>
      </p>
      <p className="mt-2 text-center text-sm text-steel-500">
        Regular user?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">User login</Link>
      </p>
    </VendorShell>
  )
}

export function VendorSignUpPage() {
  const { configured } = useAuth()
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
  // 'form' = account creation; 'apply' = account made, show full application;
  // 'confirm' = email confirmation required before applying.
  const [step, setStep] = useState<'form' | 'apply' | 'confirm'>('form')

  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (f.password.length < 8) return setError('Password must be at least 8 characters.')
    if (f.password !== f.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const { error: signErr } = await supabase.auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: { data: { first_name: f.firstName, last_name: f.lastName, phone: f.phone } },
      })
      if (signErr) throw signErr

      // Ensure we have a session so the application step can file the vendor row.
      // (signUp returns a session when email confirmation is OFF; when it's ON we
      // try an immediate sign-in — some projects allow it, otherwise confirm first.)
      let hasSession = (await supabase.auth.getSession()).data.session
      if (!hasSession) {
        await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password }).catch(() => {})
        hasSession = (await supabase.auth.getSession()).data.session
      }

      if (hasSession) {
        const existing = await getMyVendor().catch(() => null)
        if (existing) { navigate('/vendor'); return }
        setStep('apply') // collect full application next
      } else {
        setStep('confirm') // email confirmation required before applying
      }
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  // Step 2: full KYC application (PAN, GST, MSME docs, categories, etc.)
  if (step === 'apply') {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="mb-6 flex justify-center"><Logo className="text-xl" /></div>
        <div className="mb-4 text-center">
          <h1 className="text-2xl font-bold">Complete your vendor application</h1>
          <p className="text-sm text-steel-500">Provide your business & KYC details for admin verification.</p>
        </div>
        <VendorApplicationForm
          initial={{ contact_name: `${f.firstName} ${f.lastName}`.trim(), contact_email: f.email, contact_phone: f.phone }}
          note="Your application is reviewed by an administrator before you can list services. Log out and back in after approval to refresh your role."
          onSubmit={async (input) => {
            await applyAsVendor(input)
            navigate('/vendor')
          }}
        />
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <VendorShell subtitle="Confirm your email">
        <p className="text-sm text-steel-600 dark:text-steel-300">
          Your account was created. Email confirmation is enabled — please confirm your email, then
          log in and complete your vendor application (PAN, GST, MSME) from the vendor portal.
        </p>
        <Link to="/vendor/login" className="btn-primary mt-4 w-full">Go to vendor login</Link>
      </VendorShell>
    )
  }

  return (
    <VendorShell subtitle="Create your account, then apply">
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
          <label className="label">Phone</label>
          <input className="input" type="tel" required value={f.phone} onChange={on('phone')} autoComplete="tel" />
        </div>
        <div>
          <label className="label">Password</label>
          <PasswordInput value={f.password} onChange={(v) => setF((p) => ({ ...p, password: v }))} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <PasswordInput value={f.confirm} onChange={(v) => setF((p) => ({ ...p, confirm: v }))} autoComplete="new-password" />
        </div>
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          Next you&apos;ll provide your business details (PAN, GST, MSME) for admin verification.
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Create account & continue'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-steel-500">
        Already registered?{' '}
        <Link to="/vendor/login" className="font-medium text-brand-600 hover:underline">Vendor login</Link>
      </p>
    </VendorShell>
  )
}
