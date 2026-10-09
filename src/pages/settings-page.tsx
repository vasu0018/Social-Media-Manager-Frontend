import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/shared/field'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { useContent } from '@/context/content-context'
import { timezones } from '@/data/mock'
import { usePageTitle } from '@/hooks/use-page-title'
import { api } from '@/lib/api'
import { platformLabel } from '@/lib/format'
import { fieldErrors, settingsSchema } from '@/lib/validation'
import type { Platform } from '@/types/content'

export function SettingsPage() {
  usePageTitle('Settings')
  const { settings, updateSettings } = useContent()
  const [displayName, setDisplayName] = useState(settings.displayName)
  const [timezone, setTimezone] = useState(settings.timezone)
  const [emailNotifications, setEmailNotifications] = useState(settings.emailNotifications)
  const [failureAlerts, setFailureAlerts] = useState(settings.failureAlerts)
  const [meta, setMeta] = useState<{ configured: boolean; apiVersion: string } | null>(null)
  const [defaultPlatforms, setDefaultPlatforms] = useState<Platform[]>(settings.defaultPlatforms)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api<{ configured: boolean; apiVersion: string }>('/api/meta/status')
      .then(setMeta)
      .catch(() => setMeta({ configured: false, apiVersion: 'v26.0' }))
  }, [])

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = settingsSchema.safeParse({
      displayName,
      timezone,
      emailNotifications,
      failureAlerts,
      defaultPlatforms,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error.issues))
      return
    }
    setErrors({})
    updateSettings(parsed.data)
    toast.success('Settings saved')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace profile, default platforms, and notification preferences."
      />
      <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Shown in the sidebar and dashboard greeting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Display name" htmlFor="display-name" error={errors.displayName}>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? 'display-name-error' : undefined}
              />
            </Field>
            <Field label="Timezone" htmlFor="timezone" error={errors.timezone} hint="Stored for the publishing jobs. Times in this panel use your browser clock.">
              <NativeSelect id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} aria-invalid={Boolean(errors.timezone)}>
                {timezones.map((zone) => (
                  <option key={zone.value} value={zone.value}>{zone.label}</option>
                ))}
              </NativeSelect>
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Defaults and alerts</CardTitle>
            <CardDescription>Applied when you open the create form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <fieldset>
              <legend className="text-sm font-medium">Default platforms</legend>
              <div className="mt-3 flex flex-wrap gap-4">
                {(['instagram', 'facebook'] as const).map((platform) => (
                  <label key={platform} className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={defaultPlatforms.includes(platform)}
                      onCheckedChange={(checked) => {
                        setDefaultPlatforms((current) =>
                          checked === true
                            ? Array.from(new Set([...current, platform]))
                            : current.filter((item) => item !== platform),
                        )
                      }}
                      aria-label={platformLabel(platform)}
                    />
                    {platformLabel(platform)}
                  </label>
                ))}
              </div>
              {errors.defaultPlatforms ? <p className="mt-2 text-sm text-destructive" role="alert">{errors.defaultPlatforms}</p> : null}
            </fieldset>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="email-alerts">Email notifications</Label>
                <p className="text-sm text-muted-foreground">A summary when scheduled content is marked published.</p>
              </div>
              <Switch id="email-alerts" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="failure-alerts">Failure alerts</Label>
                <p className="text-sm text-muted-foreground">Notify the administrator when a publish fails.</p>
              </div>
              <Switch id="failure-alerts" checked={failureAlerts} onCheckedChange={setFailureAlerts} />
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Button type="submit">Save settings</Button>
        </div>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>Meta Graph API</CardTitle>
          <CardDescription>Server credentials stay outside the browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="inline-flex items-center gap-2 font-medium">
            <span className={`h-2 w-2 rounded-full ${meta?.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {meta?.configured ? `Configured · Graph API ${meta.apiVersion}` : `Not configured · Graph API ${meta?.apiVersion ?? 'v26.0'}`}
          </p>
          <p className="max-w-2xl text-muted-foreground">
            Publishing uses the official Instagram content publishing API and Facebook Page publishing API. Set META_APP_ID, META_APP_SECRET, and META_REDIRECT_URI on the server. This screen does not collect access tokens or passwords.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
