export function partsInZone(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  const hour = pick('hour') === '24' ? '00' : pick('hour')
  return { date: `${pick('year')}-${pick('month')}-${pick('day')}`, time: `${hour.padStart(2, '0')}:${pick('minute').padStart(2, '0')}` }
}

export function todayInZone(timeZone: string) {
  return partsInZone(new Date().toISOString(), timeZone)
}

export function zonedToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const desired = Date.UTC(year, (month ?? 1) - 1, day, hour, minute)
  let utc = desired
  for (let step = 0; step < 3; step += 1) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(utc))
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    const shown = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'), pick('second'))
    utc += desired - shown
  }
  return new Date(utc)
}

export function formatInZone(iso: string, timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}
