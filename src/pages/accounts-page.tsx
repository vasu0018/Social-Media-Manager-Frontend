import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { api } from '@/lib/api'
import { formatCount, formatDateTime, platformLabel } from '@/lib/format'
import type { SocialAccount, TokenStatus } from '@/types/content'

const connectionErrors: Record<string, string> = {
  signin: 'Sign in again, then retry the connection.',
  denied: 'The Meta login was cancelled before any account was connected.',
  missing_code: 'Meta did not return an authorization code.',
  no_instagram_account: 'Instagram did not return a Business or Creator account. Sign in with the professional account you want to publish from.',
  no_page: 'No Facebook Page was available for this login.',
  connection_failed: 'Meta did not complete the connection.',
}

export function AccountsPage() {
  usePageTitle('Social Accounts')
  const { accounts, items, refresh, removeAccountConnection, replaceAccount } = useContent()
  const [params, setParams] = useSearchParams()
  const [comments, setComments] = useState(false)
  const [instagramReady, setInstagramReady] = useState<boolean | null>(null)
  const [facebookReady, setFacebookReady] = useState<boolean | null>(null)
  const [apiVersion, setApiVersion] = useState('v26.0')
  const [disconnecting, setDisconnecting] = useState<SocialAccount | null>(null)
  const finishing = useRef(false)

  useEffect(() => {
    api<{ configured: boolean; instagram?: boolean; facebook?: boolean; apiVersion: string }>('/api/meta/status')
      .then((status) => {
        setInstagramReady(status.instagram ?? status.configured)
        setFacebookReady(status.facebook ?? status.configured)
        setApiVersion(status.apiVersion)
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

  function start(purpose: 'instagram' | 'facebook') {
    if (purpose === 'instagram' && instagramReady === false) return
    if (purpose === 'facebook' && facebookReady === false) return
    const commentsFlag = purpose === 'instagram' && comments ? '&comments=1' : ''
    window.location.assign(`/api/oauth/start?purpose=${purpose}${commentsFlag}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Accounts"
        description="Connect Instagram Professional accounts and Facebook Pages with Meta’s official login. Passwords are never requested or stored."
      />
      <Card>
        <CardHeader>
          <CardTitle>Connect with Meta</CardTitle>
          <CardDescription>
            Graph API {apiVersion}. Connect Instagram opens Instagram’s own login. Connect Facebook Page opens Facebook for the Page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instagramReady === false ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              Instagram login still needs INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET from API setup with Instagram login.
            </p>
          ) : null}
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
            <Button onClick={() => start('instagram')} disabled={instagramReady === false}>Connect Instagram</Button>
            <Button variant="outline" onClick={() => start('facebook')} disabled={facebookReady === false}>Connect Facebook Page</Button>
          </div>
        </CardContent>
      </Card>

      <AccountGroup title="Instagram" accounts={grouped.instagram} onDisconnect={setDisconnecting} onRefresh={replaceAccount} />
      <AccountGroup title="Facebook Pages" accounts={grouped.facebook} onDisconnect={setDisconnecting} onRefresh={replaceAccount} />

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
  onDisconnect,
  onRefresh,
}: {
  title: string
  accounts: SocialAccount[]
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
            <AccountCard key={account.id} account={account} onDisconnect={onDisconnect} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </section>
  )
}

function AccountCard({
  account,
  onDisconnect,
  onRefresh,
}: {
  account: SocialAccount
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
        </div>
        <p className="text-muted-foreground">
          {account.followers > 0 ? `${formatCount(account.followers)} followers` : 'Follower count appears after Meta returns it'}
        </p>
        <p className="text-muted-foreground">{expiryCopy(account)}</p>
        {account.eligibilityReason ? <p className="text-amber-800">{account.eligibilityReason}</p> : null}
        <div className="flex flex-wrap gap-2">
          {needsReconnect ? (
            <Button
              onClick={() => window.location.assign(`/api/oauth/start?purpose=${account.platform}`)}
            >
              Reconnect
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>
              {refreshing ? 'Checking…' : 'Check access'}
            </Button>
          )}
          {account.connected ? <Button variant="outline" onClick={() => onDisconnect(account)}>Disconnect</Button> : null}
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
