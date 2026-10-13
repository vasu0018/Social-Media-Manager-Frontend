import { X } from 'lucide-react'
import { useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

export function TagInput({
  id,
  values,
  onChange,
  normalize,
  max,
  placeholder,
  invalidMessage,
  chipClass = 'bg-blue-50 text-blue-700',
  onInvalid,
  ariaDescribedBy,
}: {
  id: string
  values: string[]
  onChange: (next: string[]) => void
  normalize: (raw: string) => string | null
  max?: number
  placeholder?: string
  invalidMessage: string
  chipClass?: string
  onInvalid?: (message: string | null) => void
  ariaDescribedBy?: string
}) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const parts = raw.split(/[\s,]+/).map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) return true
    const next = [...values]
    let rejected: string | null = null
    for (const part of parts) {
      const value = normalize(part)
      if (!value) {
        rejected = `${part}: ${invalidMessage}`
        continue
      }
      if (next.some((entry) => entry.toLowerCase() === value.toLowerCase())) continue
      if (max && next.length >= max) {
        rejected = `You can add up to ${max}.`
        break
      }
      next.push(value)
    }
    if (next.length !== values.length) onChange(next)
    onInvalid?.(rejected)
    return rejected == null
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',' || event.key === ' ' || event.key === 'Tab') {
      if (!draft.trim()) {
        if (event.key !== 'Tab') event.preventDefault()
        return
      }
      event.preventDefault()
      commit(draft)
      setDraft('')
      return
    }
    if (event.key === 'Backspace' && !draft && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (!/[\s,]/.test(text)) return
    event.preventDefault()
    commit(text)
  }

  const full = Boolean(max && values.length >= max)

  return (
    <div className="space-y-2">
      <div
        className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 shadow-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        onClick={() => document.getElementById(id)?.focus()}
      >
        {values.map((value) => (
          <span key={value} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', chipClass)}>
            {value}
            <button
              type="button"
              className="rounded p-0.5 hover:bg-black/10"
              aria-label={`Remove ${value}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(values.filter((entry) => entry !== value))
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={full}
          aria-describedby={ariaDescribedBy}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          placeholder={full ? 'Limit reached' : values.length === 0 ? placeholder : 'Add more…'}
          onChange={(event) => {
            const text = event.target.value
            const cut = Math.max(text.lastIndexOf(' '), text.lastIndexOf(','), text.lastIndexOf('\n'))
            if (cut < 0) {
              setDraft(text)
              return
            }
            commit(text.slice(0, cut))
            setDraft(text.slice(cut + 1))
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => {
            if (draft.trim()) {
              commit(draft)
              setDraft('')
            }
          }}
        />
      </div>
      {values.length > 1 ? (
        <button type="button" className="text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => onChange([])}>Clear all</button>
      ) : null}
    </div>
  )
}

export function normalizeHashtag(raw: string) {
  const word = raw.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '')
  if (!word || word.length > 100) return null
  return `#${word}`
}

export function normalizeHandle(raw: string) {
  const handle = raw.trim().replace(/^@+/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null
}
