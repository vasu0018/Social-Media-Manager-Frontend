import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContentPreviewDialog } from '@/components/shared/content-preview'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { PlatformIcon } from '@/components/shared/platform-badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useContent } from '@/context/content-context'
import { usePageTitle } from '@/hooks/use-page-title'
import { contentWhen, typeLabel } from '@/lib/format'
import { formatInZone } from '@/lib/time'
import type { ContentItem, ContentStatus } from '@/types/content'

const views = ['month', 'week', 'day'] as const
type CalendarView = (typeof views)[number]

const dot: Record<ContentStatus, string> = {
  draft: 'bg-slate-400',
  scheduled: 'bg-amber-500',
  processing: 'bg-indigo-500',
  published: 'bg-emerald-500',
  partially_published: 'bg-orange-500',
  failed: 'bg-rose-500',
  cancelled: 'bg-slate-300',
}

export function CalendarPage() {
  usePageTitle('Content Calendar')
  const { items } = useContent()
  const [cursor, setCursor] = useState(() => new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [preview, setPreview] = useState<ContentItem | null>(null)

  const days = useMemo(() => {
    if (view === 'day') return [cursor]
    if (view === 'week') return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) })
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) })
  }, [cursor, view])

  function shift(direction: number) {
    if (view === 'day') setCursor(addDays(cursor, direction))
    else if (view === 'week') setCursor(addDays(cursor, direction * 7))
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1))
  }

  const heading = view === 'month' ? format(cursor, 'MMMM yyyy') : view === 'week'
    ? `${format(startOfWeek(cursor), 'd MMM')} – ${format(endOfWeek(cursor), 'd MMM yyyy')}`
    : format(cursor, 'EEEE, d MMMM yyyy')

  return (
    <div className="space-y-6">
      <PageHeader title="Content Calendar" description="Scheduled and published content, shown in your saved timezone." />
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <div className="flex flex-wrap gap-2">
            {views.map((option) => (
              <Button key={option} size="sm" variant={view === option ? 'default' : 'outline'} aria-pressed={view === option} onClick={() => setView(option)}>
                {option[0]?.toUpperCase()}{option.slice(1)}
              </Button>
            ))}
            <Button variant="outline" size="icon" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
            <Button variant="outline" size="icon" aria-label="Next" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        {view === 'month' ? (
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <div key={label} className="py-2">{label}</div>)}
          </div>
        ) : null}
        <div className={view === 'day' ? 'space-y-3' : 'grid grid-cols-1 gap-2 md:grid-cols-7'}>
          {days.map((day) => {
            const dayItems = items.filter((item) => isSameDay(new Date(contentWhen(item)), day))
            return (
              <section key={day.toISOString()} className={`rounded-lg border p-2 ${isSameMonth(day, cursor) || view !== 'month' ? 'bg-card' : 'opacity-50'} ${isToday(day) ? 'ring-1 ring-primary' : ''}`}>
                <h3 className="mb-2 text-xs font-medium">{view === 'month' ? format(day, 'd') : format(day, 'EEE d')}</h3>
                {dayItems.length === 0 && view === 'day' ? (
                  <EmptyState compact icon={CalendarDays} title="No content on this day" description="Choose another date or create something new." />
                ) : (
                  <ul className="space-y-1">
                    {dayItems.slice(0, view === 'month' ? 3 : 8).map((item) => (
                      <li key={item.id}>
                        <button type="button" onClick={() => setPreview(item)} className="w-full rounded-md border px-2 py-1 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="flex items-center gap-1">
                            <span className={`h-2 w-2 rounded-full ${dot[item.status]}`} aria-hidden="true" />
                            {item.platforms.map((platform) => <PlatformIcon key={platform} platform={platform} className="h-3 w-3" />)}
                            <span className="truncate font-medium">{item.title}</span>
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2">
                            <span>{typeLabel(item.type)}</span>
                            <StatusBadge status={item.status} />
                          </span>
                          <span className="block text-muted-foreground">{formatInZone(contentWhen(item), item.timezone)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </Card>
      <ContentPreviewDialog item={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
