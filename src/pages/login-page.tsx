import { Clapperboard } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { api } from '@/lib/api'
import { fieldErrors, loginSchema } from '@/lib/validation'

export function LoginPage() {
  usePageTitle('Sign in')
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [demo, setDemo] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    api<{ demo: { email: string; password: string } | null }>('/api/auth/config')
      .then((data) => setDemo(data.demo))
      .catch(() => setDemo(null))
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues))
      return
    }
    setErrors({})
    setSubmitting(true)
    const failure = await login(parsed.data.email, parsed.data.password)
    setSubmitting(false)
    if (failure) {
      setFormError(failure)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 px-12 py-10 text-white lg:flex">
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight">Reel Studio</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">One workspace for Instagram and Facebook.</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            A calm publishing studio for finished reels, stories, and feed posts, sent through the official Meta Graph API.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li>Preview every format before it is queued.</li>
            <li>Keep drafts, schedules, and failures in one calendar.</li>
            <li>Connect only the accounts this administrator manages.</li>
          </ul>
        </div>
        <p className="text-sm text-slate-400">Official Graph API publishing. No browser automation.</p>
      </section>
      <section className="flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-slate-900">Operator sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Enter the administrator account for this studio.</p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            {formError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-700">Work email</label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email ? <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-700">Password</label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password ? <p id="password-error" className="text-sm text-destructive" role="alert">{errors.password}</p> : null}
            </div>
            <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          {demo ? (
            <div className="mt-6 rounded-xl border bg-muted/60 p-4 text-sm">
              <p className="font-medium">Local administrator</p>
              <p className="mt-1 text-muted-foreground">{demo.email}</p>
              <p className="text-muted-foreground">{demo.password}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setEmail(demo.email)
                  setPassword(demo.password)
                }}
              >
                Fill local account
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
