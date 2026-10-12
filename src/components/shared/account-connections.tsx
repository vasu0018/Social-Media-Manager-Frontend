import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { api } from '@/lib/api'
import { formatCount, formatDateTime, platformLabel } from '@/lib/format'
import type { SocialAccount, TokenStatus } from '@/types/content'

const connectionErrors: Record<string, string> = {
  signin: 'Sign in again, then retry the connection.',
  denied: 'The Meta login was cancelled before any account was connected.',
  missing_code: 'Meta did not return an authorization code.',
  no_instagram_account: 'Instagram did not return a Business or Creator account. Sign in with the professional account you want to publish from.',
  no_page: 'This Facebook login does not manage a Page. Log in as the person who manages the Page, and select that Page when Facebook asks.',
  connection_failed: 'Meta did not complete the connection.',
}

export function AccountConnections({ returnTo = '/accounts' }: { returnTo?: string }) {
  const { accounts, items, refresh, removeAccountConnection, replaceAccount } = useContent()
  const [params, setParams] = useSearchParams()
  const [comments, setComments] = useState(false)
  const [instagramReady, setInstagramReady] = useState<boolean | null>(null)
  const [facebookReady, setFacebookReady] = useState<boolean | null>(null)
  const [redirectUri, setRedirectUri] = useState('')
  const [apiVersion, setApiVersion] = useState('v26.0')
  const [disconnecting, setDisconnecting] = useState<SocialAccount | null>(null)
  const finishing = useRef(false)

  useEffect(() => {
    api<{ configured: boolean; instagram?: boolean; facebook?: boolean; apiVersion: string; redirectUri?: string }>('/api/meta/status')
      .then((status) => {
        setInstagramReady(status.instagram ?? status.configured)
        setFacebookReady(status.facebook ?? status.configured)
        setApiVersion(status.apiVersion)
        setRedirectUri(status.redirectUri ?? '')
      })
      .catch(() => {
        setInstagramReady(false)
        setFacebookReady(false)
      })
  }, [])

  useEffect(() => {
    const resume = params.get('resume')
    const code = params.get('code')
    if (resume && code) {
      if (finishing.current) return
      finishing.current = true
      setParams({}, { replace: true })
      void api<{ connected: 'instagram' | 'facebook' }>('/api/oauth/finish', {
        method: 'POST',
        body: JSON.stringify({ state: resume, code }),
      })
        .then(async (result) => {
          toast.success(result.connected === 'instagram' ? 'Instagram accounts connected' : 'Facebook Pages connected')
          await refresh()
        })
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'The connection could not be completed.'))
      return
    }
    const connected = params.get('connected')
    const error = params.get('error')
    if (connected === 'instagram' || connected === 'facebook') {
      toast.success(connected === 'instagram' ? 'Instagram accounts connected' : 'Facebook Pages connected')
      void refresh()
    } else if (error) {
      const detail = params.get('detail')
      toast.error(detail || connectionErrors[error] || 'The connection could not be completed.')
    }
    if (connected || error) setParams({}, { replace: true })
  }, [params, refresh, setParams])

  const grouped = useMemo(() => ({
    instagram: accounts.filter((account) => account.platform === 'instagram'),
    facebook: accounts.filter((account) => account.platform === 'facebook'),
  }), [accounts])

  async function start(purpose: 'instagram' | 'facebook') {
    if (purpose === 'instagram' && instagramReady === false) return
    if (purpose === 'facebook' && facebookReady === false) return
    try {
      const data = await api<{ url: string }>('/api/auth/meta/connect', {
        method: 'POST',
        body: JSON.stringify({ purpose, comments: purpose === 'instagram' && comments, returnTo }),
      })
      window.location.assign(data.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The connection could not start.')
    }
  }

  async function copyCallback() {
    if (!redirectUri) return
    await navigator.clipboard.writeText(redirectUri)
    toast.success('Callback copied')
  }

  return (
    <div id="connections" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Instagram and Facebook</CardTitle>
          <CardDescription>
            Graph API {apiVersion}. Connect Instagram for posting. Connect the Facebook Page that owns that Instagram account when you want the song list.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instagramReady === false ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              Instagram login still needs INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET from API setup with Instagram login.
            </p>
          ) : null}
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Facebook shows “Invalid Scopes” until these permissions are added to the app.</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>In the Meta app, open Use cases and add Manage everything on your Page. Turn on pages_read_engagement and pages_manage_posts.</li>
              <li>Add Manage messaging and content on Instagram. Turn on instagram_basic and instagram_content_publish.</li>
              <li>Come back here, click Connect Facebook Page, log in as the person who manages that Page, and tick the Page when Facebook asks.</li>
            </ol>
            {redirectUri ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <code className="break-all rounded bg-white px-2 py-1 text-xs">{redirectUri}</code>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyCallback()}>Copy</Button>
              </div>
            ) : null}
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={comments}
              onChange={(event) => setComments(event.target.checked)}
            />
            <span>
              <span className="font-medium">Allow a first comment on Instagram</span>
              <span className="mt-1 block text-muted-foreground">Adds the Instagram comment permission. Leave this off when you do not need a first comment.</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void start('instagram')} disabled={instagramReady === false}>Connect Instagram</Button>
            <Button type="button" variant="outline" onClick={() => void start('facebook')} disabled={facebookReady === false}>Connect Facebook Page</Button>
          </div>
        </CardContent>
      </Card>

      <AccountGroup title="Instagram" accounts={grouped.instagram} returnTo={returnTo} onDisconnect={setDisconnecting} onRefresh={replaceAccount} />
      <AccountGroup title="Facebook Pages" accounts={grouped.facebook} returnTo={returnTo} onDisconnect={setDisconnecting} onRefresh={replaceAccount} />

      <ConfirmDialog
        open={disconnecting !== null}
        onOpenChange={(open) => { if (!open) setDisconnecting(null) }}
        title={`Disconnect ${disconnecting?.name ?? 'this account'}?`}
        description={disconnectCopy(disconnecting, items)}
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => {
          if (!disconnecting) return
          const account = disconnecting
          setDisconnecting(null)
          void removeAccountConnection(account.id)
            .then(() => toast.success('Account disconnected'))
            .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Disconnect failed'))
        }}
      />
    </div>
  )
}

function AccountGroup({
  title,
  accounts,
  returnTo,
  onDisconnect,
  onRefresh,
}: {
  title: string
  accounts: SocialAccount[]
  returnTo: string
  onDisconnect: (account: SocialAccount) => void
  onRefresh: (account: SocialAccount) => void
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No {title.toLowerCase()} connected yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} returnTo={returnTo} onDisconnect={onDisconnect} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </section>
  )
}

function AccountCard({
  account,
  returnTo,
  onDisconnect,
  onRefresh,
}: {
  account: SocialAccount
  returnTo: string
  onDisconnect: (account: SocialAccount) => void
  onRefresh: (account: SocialAccount) => void
}) {
  const [refreshing, setRefreshing] = useState(false)
  const status = account.tokenStatus ?? (account.connected ? 'unknown' : 'disconnected')
  const needsReconnect = !account.connected || status === 'expired' || status === 'revoked' || status === 'disconnected'

  async function refresh() {
    setRefreshing(true)
    try {
      const data = await api<{ account: SocialAccount; warning?: string }>(`/api/accounts/${account.id}/refresh`, { method: 'POST' })
      onRefresh(data.account)
      toast.success(data.warning ? 'Connection needs attention' : 'Connection checked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh this connection')
    } finally {
      setRefreshing(false)
    }
  }

  async function reconnect() {
    const data = await api<{ url: string }>('/api/auth/meta/connect', {
      method: 'POST',
      body: JSON.stringify({ purpose: account.platform, returnTo }),
    })
    window.location.assign(data.url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <AccountPhoto account={account} />
          <div className="min-w-0">
            <CardTitle className="truncate">{account.name}</CardTitle>
            <CardDescription>{account.handle} · {platformLabel(account.platform)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={account.connected ? 'default' : 'secondary'}>{account.connected ? 'Connected' : 'Disconnected'}</Badge>
          <Badge variant="outline">{tokenLabel(status)}</Badge>
          {account.accountType ? <Badge variant="outline">{accountTypeLabel(account.accountType)}</Badge> : null}
          {account.eligible ? <Badge variant="outline">Eligible to publish</Badge> : <Badge variant="outline">Not eligible</Badge>}
          {account.platform === 'instagram' ? (
            <Badge variant="outline">{account.canBrowseSongs ? 'Songs ready' : 'Songs need the Facebook Page'}</Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground">
          {account.followers > 0 ? `${formatCount(account.followers)} followers` : 'Follower count appears after Meta returns it'}
        </p>
        <p className="text-muted-foreground">{expiryCopy(account)}</p>
        {account.eligibilityReason ? <p className="text-amber-800">{account.eligibilityReason}</p> : null}
        {account.platform === 'instagram' && !account.canBrowseSongs ? (
          <p className="text-amber-800">This Instagram login can publish. The song list opens after you connect the Facebook Page that owns it.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {needsReconnect ? (
            <Button type="button" onClick={() => void reconnect()}>Reconnect</Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={refreshing}>
              {refreshing ? 'Checking…' : 'Check access'}
            </Button>
          )}
          {account.connected ? <Button type="button" variant="outline" onClick={() => onDisconnect(account)}>Disconnect</Button> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function AccountPhoto({ account }: { account: SocialAccount }) {
  const [failed, setFailed] = useState(false)
  if (account.pictureUrl && !failed) {
    return <img src={account.pictureUrl} alt="" className="h-12 w-12 rounded-full object-cover" onError={() => setFailed(true)} />
  }
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold">
      {account.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function tokenLabel(status: TokenStatus) {
  if (status === 'valid') return 'Access valid'
  if (status === 'expiring') return 'Access expiring'
  if (status === 'expired') return 'Access expired'
  if (status === 'revoked') return 'Access revoked'
  if (status === 'disconnected') return 'Access removed'
  return 'Access not checked'
}

function accountTypeLabel(value: string) {
  if (value === 'BUSINESS') return 'Business'
  if (value === 'MEDIA_CREATOR') return 'Creator'
  if (value === 'PAGE') return 'Page'
  return value
}

function expiryCopy(account: SocialAccount) {
  if (account.tokenExpiresAt) return `Token expires ${formatDateTime(account.tokenExpiresAt)}`
  if (account.dataAccessExpiresAt) return `Data access expires ${formatDateTime(account.dataAccessExpiresAt)}`
  if (account.connected) return 'Page access does not have a short token expiry.'
  return 'Reconnect to issue a new access token.'
}

function disconnectCopy(account: SocialAccount | null, items: { status: string; accountIds: string[] }[]) {
  if (!account) return ''
  const scheduled = items.filter((item) => item.status === 'scheduled' && item.accountIds.includes(account.id)).length
  if (scheduled === 0) return 'The saved access token is deleted. Scheduled posts stay in the workspace and will not publish until you connect this account again.'
  return `${scheduled} scheduled item${scheduled === 1 ? '' : 's'} will stay in the workspace and will not publish until you connect this account again.`
}
