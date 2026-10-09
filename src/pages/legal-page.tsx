import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '@/hooks/use-page-title'

const updated = '10 October 2026'

const documents = {
  privacy: {
    title: 'Privacy Policy',
    path: '/privacy',
  },
  terms: {
    title: 'Terms and Conditions',
    path: '/terms',
  },
  deletion: {
    title: 'Account Deletion',
    path: '/account-deletion',
  },
} as const

export function LegalLinks({ current }: { current?: keyof typeof documents }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500" aria-label="Legal">
      {(Object.keys(documents) as Array<keyof typeof documents>).map((key) => (
        <Link
          key={key}
          to={documents[key].path}
          className={key === current ? 'font-medium text-slate-900' : 'hover:text-slate-900'}
          aria-current={key === current ? 'page' : undefined}
        >
          {documents[key].title}
        </Link>
      ))}
    </nav>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2 text-sm leading-6 text-slate-600">{children}</div>
    </section>
  )
}

export function PrivacyPage() {
  usePageTitle('Privacy Policy')
  return (
    <LegalShell current="privacy" title="Privacy Policy">
      <p>Reel Studio, operated by Ananta Labs, publishes finished posts to Instagram and Facebook through the official Meta Graph API. This policy explains what the studio stores and why.</p>
      <Section title="Information we store">
        <ul className="list-disc space-y-1 pl-5">
          <li>The administrator’s email address and sign-in session.</li>
          <li>Names, usernames, profile pictures, and follower counts of Instagram professional accounts and Facebook Pages you connect.</li>
          <li>Access tokens from Meta, stored in encrypted form, and the permissions those accounts granted.</li>
          <li>Captions, schedules, publishing results, and the media files you upload.</li>
        </ul>
      </Section>
      <Section title="How we use it">
        <p>We use this information only to sign you in, show the connected accounts, and publish or schedule the content you submit. We do not sell this information, and we do not use it for advertising profiles.</p>
      </Section>
      <Section title="Who receives it">
        <p>When you publish, the selected media and caption are sent to Meta so Instagram or Facebook can create the post. Uploaded files may also be copied to private object storage so Meta can retrieve them. Hosting and database providers process this data only to run the studio.</p>
      </Section>
      <Section title="How long we keep it">
        <p>Connected-account tokens are removed when you disconnect an account. Media and content remain until you delete them or until you ask us to delete the studio account. Sign-in sessions expire after seven days.</p>
      </Section>
      <Section title="Your choices">
        <p>You can disconnect an account, delete media, and ask for the studio account to be deleted. The steps are on the <Link className="font-medium text-slate-900 underline" to="/account-deletion">account deletion</Link> page. Questions about this policy can be sent to privacy@anantalabs.in.</p>
      </Section>
    </LegalShell>
  )
}

export function TermsPage() {
  usePageTitle('Terms and Conditions')
  return (
    <LegalShell current="terms" title="Terms and Conditions">
      <p>These terms apply to the Reel Studio workspace at social.anantalabs.in. By signing in or connecting an account, you agree to them.</p>
      <Section title="The service">
        <p>Reel Studio lets an authorized administrator prepare reels, stories, and feed posts and send them through Meta’s official publishing APIs. It does not bypass Instagram or Facebook, and it does not collect social-account passwords.</p>
      </Section>
      <Section title="Your responsibilities">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must own or have permission to manage every Instagram account and Facebook Page you connect.</li>
          <li>You must have the rights to the photos, videos, captions, and music you upload.</li>
          <li>You must follow Meta’s Platform Terms, Community Standards, and the rules of Instagram and Facebook.</li>
        </ul>
      </Section>
      <Section title="Accounts and access">
        <p>The workspace is limited to its administrator. You are responsible for keeping the sign-in credentials private and for disconnecting an account you no longer want the studio to publish to.</p>
      </Section>
      <Section title="Availability">
        <p>Publishing depends on Meta’s APIs. A post can be delayed or rejected by Instagram or Facebook. Ananta Labs may suspend the workspace if it is used to publish unlawful content or to misuse Meta’s platform.</p>
      </Section>
      <Section title="Contact">
        <p>Questions about these terms can be sent to privacy@anantalabs.in.</p>
      </Section>
    </LegalShell>
  )
}

export function AccountDeletionPage() {
  usePageTitle('Account Deletion')
  return (
    <LegalShell current="deletion" title="Account Deletion">
      <p>You can remove connected social accounts, uploaded media, and the Reel Studio administrator account. Disconnecting an account stops future publishing and deletes the stored access token.</p>
      <Section title="Remove a connected Instagram or Facebook account">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Sign in at social.anantalabs.in.</li>
          <li>Open Accounts.</li>
          <li>Choose Disconnect on the Instagram account or Facebook Page.</li>
        </ol>
        <p>This removes that account’s token and profile details from the studio. It does not delete the Instagram or Facebook account itself, and it does not remove posts already published on those platforms.</p>
      </Section>
      <Section title="Delete uploaded media">
        <p>Sign in, open Media, and delete the files you no longer want stored. Files attached to a scheduled post must be unscheduled before they can be deleted.</p>
      </Section>
      <Section title="Delete the studio account and remaining data">
        <p>Email privacy@anantalabs.in with the subject “Reel Studio account deletion” and the administrator email address. We will delete the sign-in account, remaining connected-account data, uploaded media, captions, and publishing records within 30 days. Posts that Meta has already published stay on Instagram or Facebook until you delete them there.</p>
      </Section>
    </LegalShell>
  )
}

function LegalShell({
  current,
  title,
  children,
}: {
  current: keyof typeof documents
  title: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <article className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-slate-500">Reel Studio</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500">Last updated {updated}</p>
          <LegalLinks current={current} />
        </header>
        {children}
      </article>
    </main>
  )
}
