import { useSearchParams } from 'react-router-dom'
import { ContentTable } from '@/components/shared/content-table'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'

export function HistoryPage() {
  usePageTitle('Publishing History')
  const { items } = useContent()
  const [params, setParams] = useSearchParams()
  const statusParam = params.get('status')
  const filter = statusParam === 'failed' || statusParam === 'published' || statusParam === 'partially_published' || statusParam === 'cancelled' ? statusParam : 'all'

  const history = items
    .filter((item) => ['published', 'failed', 'partially_published', 'cancelled', 'processing'].includes(item.status))
    .filter((item) => filter === 'all' || item.status === filter)
    .sort((a, b) => +new Date(b.publishedAt ?? b.updatedAt) - +new Date(a.publishedAt ?? a.updatedAt))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publishing History"
        description="Every publishing attempt. A retry sends only the destinations that failed and leaves successful posts untouched."
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="History filter">
        {(['all', 'published', 'partially_published', 'failed', 'cancelled'] as const).map((option) => (
          <Button
            key={option}
            variant={filter === option ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filter === option}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (option === 'all') next.delete('status')
              else next.set('status', option)
              setParams(next)
            }}
          >
            {option === 'all' ? 'All' : option === 'published' ? 'Published' : option === 'failed' ? 'Failed' : option === 'cancelled' ? 'Cancelled' : 'Partial'}
          </Button>
        ))}
      </div>
      <Card>
        <ContentTable
          items={history}
          emptyTitle="No history for this filter"
          emptyDescription="Published, partial, failed, and cancelled items are listed here with each attempt."
        />
      </Card>
    </div>
  )
}
