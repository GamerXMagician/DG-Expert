import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types'
import { getPlanState, type PlanState } from '@/services/subscription'

interface SignUpInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  planState: PlanState | null
  loading: boolean
  isAdmin: boolean
  isVendor: boolean
  configured: boolean
  signUp: (input: SignUpInput) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (patch: Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone'>>) => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [planState, setPlanState] = useState<PlanState | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data ?? null)
    const ps = await getPlanState().catch(() => null)
    setPlanState(ps)
  }, [])

  const refresh = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        void loadProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) void loadProfile(s.user.id)
      else {
        setProfile(null)
        setPlanState(null)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async (input: SignUpInput) => {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone: input.phone,
        },
      },
    })
    if (error) throw error
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setPlanState(null)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw error
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'first_name' | 'last_name' | 'phone'>>) => {
      if (!session?.user) throw new Error('Not authenticated')
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id)
      if (error) throw error
      await loadProfile(session.user.id)
    },
    [session, loadProfile],
  )

  const value: AuthContextValue = {
    session,
    profile,
    planState,
    loading,
    isAdmin: profile?.role === 'admin',
    isVendor: profile?.role === 'vendor',
    configured: isSupabaseConfigured,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
