'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { arSA, enUS } from 'date-fns/locale'
import { DayPicker, type DateRange } from 'react-day-picker'

type Locale = 'ar' | 'en'

interface DateRangePickerProps {
  locale: Locale
  fromDateLabel: string
  toDateLabel: string
  fromDate: string
  toDate: string
  onChange: (next: { fromDate: string; toDate: string }) => void
  minDate?: string
  className?: string
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDate(value: string): Date | undefined {
  if (!ISO_DATE_REGEX.test(value)) return undefined
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toIsoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

export function DateRangePicker({
  locale,
  fromDateLabel,
  toDateLabel,
  fromDate,
  toDate,
  onChange,
  minDate,
  className = '',
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down')

  const parsedFromDate = useMemo(() => parseIsoDate(fromDate), [fromDate])
  const parsedToDate = useMemo(() => parseIsoDate(toDate), [toDate])
  const parsedMinDate = useMemo(() => parseIsoDate(minDate || ''), [minDate])

  const selectedRange = useMemo<DateRange | undefined>(() => {
    if (!parsedFromDate && !parsedToDate) return undefined
    return {
      from: parsedFromDate,
      to: parsedToDate,
    }
  }, [parsedFromDate, parsedToDate])

  const dateLocale = locale === 'ar' ? arSA : enUS
  const isRangeSelected = Boolean(parsedFromDate && parsedToDate)

  useEffect(() => {
    if (!open) return

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current) return
      const target = event.target as Node | null
      if (target && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleDaySelect = (next: DateRange | undefined) => {
    if (!next?.from) {
      onChange({ fromDate: '', toDate: '' })
      return
    }

    const nextFromDate = toIsoDate(next.from)
    const nextToDate = next.to ? toIsoDate(next.to) : ''
    onChange({ fromDate: nextFromDate, toDate: nextToDate })

    if (nextToDate) {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  const clearSelection = () => {
    onChange({ fromDate: '', toDate: '' })
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return

    const updateDirection = () => {
      if (!rootRef.current || typeof window === 'undefined') return
      const rect = rootRef.current.getBoundingClientRect()
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      const popoverHeight = popoverRef.current?.offsetHeight || 420
      const shouldOpenUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow
      setOpenDirection(shouldOpenUp ? 'up' : 'down')
    }

    const rafId = window.requestAnimationFrame(updateDirection)
    window.addEventListener('resize', updateDirection)
    window.addEventListener('scroll', updateDirection, true)
    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateDirection)
      window.removeEventListener('scroll', updateDirection, true)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={`landing-date-range-picker ${isRangeSelected ? 'active' : ''} ${className}`.trim()}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <button
        ref={triggerRef}
        type="button"
        className="landing-date-range-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="landing-date-range-field">
          <span className="landing-range-label">{fromDateLabel}</span>
          <span className={`landing-date-range-value ${parsedFromDate ? 'filled' : ''}`}>
            {parsedFromDate ? format(parsedFromDate, 'yyyy-MM-dd') : '--'}
          </span>
        </span>
        <span className="landing-date-range-separator" aria-hidden="true">
          {locale === 'ar' ? 'الى' : 'to'}
        </span>
        <span className="landing-date-range-field">
          <span className="landing-range-label">{toDateLabel}</span>
          <span className={`landing-date-range-value ${parsedToDate ? 'filled' : ''}`}>
            {parsedToDate ? format(parsedToDate, 'yyyy-MM-dd') : '--'}
          </span>
        </span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`landing-date-range-popover compact ${openDirection === 'up' ? 'open-up' : 'open-down'}`}
          role="dialog"
          aria-modal="false"
        >
          <DayPicker
            mode="range"
            locale={dateLocale}
            selected={selectedRange}
            onSelect={handleDaySelect}
            numberOfMonths={1}
            showOutsideDays
            fixedWeeks
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            disabled={parsedMinDate ? { before: parsedMinDate } : undefined}
            defaultMonth={parsedFromDate || parsedMinDate || new Date()}
          />
          <div className="landing-date-range-actions">
            <button type="button" className="landing-date-range-action" onClick={clearSelection}>
              {locale === 'ar' ? 'مسح' : 'Clear'}
            </button>
            <button type="button" className="landing-date-range-action primary" onClick={() => setOpen(false)}>
              {locale === 'ar' ? 'تم' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
