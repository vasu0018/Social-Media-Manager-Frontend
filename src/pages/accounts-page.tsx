import { AccountConnections } from '@/components/shared/account-connections'
import { PageHeader } from '@/components/shared/page-header'
import { usePageTitle } from '@/hooks/use-page-title'

export function AccountsPage() {
  usePageTitle('Social Accounts')
  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Accounts"
        description="Connect Instagram Professional accounts and Facebook Pages with Meta’s official login. Passwords are never requested or stored."
      />
      <AccountConnections returnTo="/accounts" />
    </div>
  )
}
