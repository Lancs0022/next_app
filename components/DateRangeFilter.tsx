'use client'

import { useEffect, useMemo, useState, ReactNode } from 'react'
import Modal from '@/components/Modal/Modal'

interface DateFilterValue {
  target?: string
  mode?: string
  offset?: string
  day?: string
  week?: string
  month?: string
  year?: string
  start?: string
  end?: string
  dateMin?: string | null
  dateMax?: string | null
}

interface DateRangeFilterProps {
  label?: string
  value: DateFilterValue | null
  onChange: (value: DateFilterValue | null) => void
  buttonClassName?: string
  open?: boolean                         // controlled open from parent
  onOpenChange?: (open: boolean) => void // controlled open from parent
  hideTrigger?: boolean                  // hide the button trigger
  hideTargetSelect?: boolean             // hide the "Filtrer par" select
  defaultTarget?: string                 // pre-set draft.target on open
}

const startOfDay = (d: Date | string): Date => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const endOfDay = (d: Date | string): Date => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

const getIsoWeekInfo = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  const year = d.getUTCFullYear()
  return { year, week, iso: `${year}-W${String(week).padStart(2, '0')}` }
}

const getIsoWeekRange = (isoWeek: string) => {
  if (!isoWeek || !isoWeek.includes('-W')) return { start: null, end: null }
  const [y, w] = isoWeek.split('-W')
  const year = parseInt(y, 10)
  const week = parseInt(w, 10)
  const jan4 = new Date(year, 0, 4)
  const day = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: startOfDay(monday), end: endOfDay(sunday) }
}

const getMonthRange = (monthStr: string) => {
  if (!monthStr || !monthStr.includes('-')) return { start: null, end: null }
  const [y, m] = monthStr.split('-')
  const year = parseInt(y, 10)
  const month = parseInt(m, 10) - 1
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return { start: startOfDay(first), end: endOfDay(last) }
}

const formatMonthLabel = (monthStr: string) => {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-')
  const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
  return dt.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const computeDateBounds = (f: DateFilterValue) => {
  if (!f?.mode) return { start: null, end: null }
  if (f.mode === 'jour' && f.day) {
    return { start: startOfDay(new Date(f.day)), end: endOfDay(new Date(f.day)) }
  }
  if (f.mode === 'semaine' && f.week) return getIsoWeekRange(f.week)
  if (f.mode === 'mois' && f.month) return getMonthRange(f.month)
  if (f.mode === 'annee' && f.year) {
    const y = parseInt(f.year, 10)
    const start = new Date(y, 0, 1)
    const end = new Date(y, 11, 31)
    return { start: startOfDay(start), end: endOfDay(end) }
  }
  if (f.mode === 'fourchette' && f.start && f.end) {
    return { start: startOfDay(new Date(f.start)), end: endOfDay(new Date(f.end)) }
  }
  return { start: null, end: null }
}

const summarizeFilter = (f: DateFilterValue) => {
  if (!f?.mode) return ''
  if (f.mode === 'jour' && f.day) {
    return new Date(f.day).toLocaleDateString('fr-FR')
  }
  if (f.mode === 'semaine' && f.week) return f.week
  if (f.mode === 'mois' && f.month) return formatMonthLabel(f.month)
  if (f.mode === 'annee' && f.year) return f.year
  if (f.mode === 'fourchette' && f.start && f.end) {
    return `${new Date(f.start).toLocaleDateString('fr-FR')} → ${new Date(f.end).toLocaleDateString('fr-FR')}`
  }
  return ''
}

const DateRangeFilter = ({
  label = 'Filtre par date',
  value,
  onChange,
  buttonClassName = '',
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  hideTargetSelect = false,
  defaultTarget,
}: DateRangeFilterProps) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v)
    else setInternalOpen(v)
  }

  const [draft, setDraft] = useState({
    target: 'date_livraison',
    mode: 'jour',
    offset: 'J0',
    day: '',
    week: '',
    month: '',
    year: '',
    start: '',
    end: ''
  })

  const hasValue = !!(value?.dateMin || value?.dateMax || value?.mode)

  const summary = useMemo(() => {
    if (!value) return ''
    return summarizeFilter(value)
  }, [value])

  const getOffsetOptions = (mode: string) => {
    if (mode === 'jour') {
      return [
        { value: 'J0', label: "Aujourd'hui" },
        { value: 'J-1', label: 'J-1 (Hier)' },
        { value: 'J-2', label: 'J-2' },
        { value: 'J-3', label: 'J-3' },
        { value: 'J-4', label: 'J-4' },
        { value: 'J-5', label: 'J-5' },
        { value: 'J-6', label: 'J-6' },
        { value: 'J-7', label: 'J-7' }
      ]
    }
    if (mode === 'semaine') {
      return [
        { value: 'S0', label: 'Semaine courante' },
        { value: 'S-1', label: 'S-1' },
        { value: 'S-2', label: 'S-2' },
        { value: 'S-3', label: 'S-3' },
        { value: 'S-4', label: 'S-4' },
        { value: 'S-5', label: 'S-5' },
        { value: 'S-6', label: 'S-6' },
        { value: 'S-7', label: 'S-7' }
      ]
    }
    if (mode === 'mois') {
      return [
        { value: 'M0', label: 'Mois courant' },
        { value: 'M-1', label: 'M-1' },
        { value: 'M-2', label: 'M-2' },
        { value: 'M-3', label: 'M-3' },
        { value: 'M-4', label: 'M-4' },
        { value: 'M-5', label: 'M-5' },
        { value: 'M-6', label: 'M-6' },
        { value: 'M-7', label: 'M-7' }
      ]
    }
    if (mode === 'annee') {
      return [
        { value: 'A0', label: 'Année courante' },
        { value: 'A-1', label: 'A-1' },
        { value: 'A-2', label: 'A-2' },
        { value: 'A-3', label: 'A-3' },
        { value: 'A-4', label: 'A-4' },
        { value: 'A-5', label: 'A-5' },
        { value: 'A-6', label: 'A-6' },
        { value: 'A-7', label: 'A-7' }
      ]
    }
    return []
  }

  const applyOffset = (mode: string, offset: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (mode === 'jour') {
      const delta = parseInt(offset.replace('J', '').replace('-', '') || '0', 10)
      const d = new Date(today)
      d.setDate(d.getDate() - delta)
      const iso = d.toISOString().split('T')[0]
      setDraft(prev => ({ ...prev, mode, offset, day: iso }))
      return
    }

    if (mode === 'semaine') {
      const delta = parseInt(offset.replace('S', '').replace('-', '') || '0', 10)
      const d = new Date(today)
      d.setDate(d.getDate() - delta * 7)
      const info = getIsoWeekInfo(d)
      setDraft(prev => ({ ...prev, mode, offset, week: info.iso }))
      return
    }

    if (mode === 'mois') {
      const delta = parseInt(offset.replace('M', '').replace('-', '') || '0', 10)
      const d = new Date(today.getFullYear(), today.getMonth() - delta, 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      setDraft(prev => ({ ...prev, mode, offset, month: `${y}-${m}` }))
      return
    }

    if (mode === 'annee') {
      const delta = parseInt(offset.replace('A', '').replace('-', '') || '0', 10)
      const y = today.getFullYear() - delta
      setDraft(prev => ({ ...prev, mode, offset, year: String(y) }))
      return
    }
  }

  useEffect(() => {
    if (!open) return
    if (value && value.mode) {
      setDraft({
        target: value.target || defaultTarget || 'date_livraison',
        mode: value.mode || 'jour',
        offset: value.offset || 'J0',
        day: value.day || '',
        week: value.week || '',
        month: value.month || '',
        year: value.year || '',
        start: value.start || '',
        end: value.end || ''
      })
    } else {
      setDraft(prev => ({ ...prev, target: defaultTarget || 'date_livraison' }))
      applyOffset('jour', 'J0')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleModeChange = (newMode: string) => {
    const defaultOffset = newMode === 'jour' ? 'J0' :
                          newMode === 'semaine' ? 'S0' :
                          newMode === 'mois' ? 'M0' :
                          newMode === 'annee' ? 'A0' : ''
    if (newMode === 'fourchette') {
      setDraft(prev => ({ ...prev, mode: newMode, offset: '' }))
    } else {
      applyOffset(newMode, defaultOffset)
    }
  }

  const handleOffsetChange = (offset: string) => {
    applyOffset(draft.mode, offset)
  }

  const apply = () => {
    const bounds = computeDateBounds(draft)
    const next: DateFilterValue = {
      target: draft.target,
      mode: draft.mode,
      offset: draft.offset,
      day: draft.day,
      week: draft.week,
      month: draft.month,
      year: draft.year,
      start: draft.start,
      end: draft.end,
      dateMin: bounds.start ? bounds.start.toISOString().split('T')[0] : null,
      dateMax: bounds.end ? bounds.end.toISOString().split('T')[0] : null
    }

    if (!next.dateMin && !next.dateMax) {
      onChange?.(null)
    } else {
      onChange?.(next)
    }

    setOpen(false)
  }

  const clear = () => {
    onChange?.(null)
    setOpen(false)
  }

  return (
    <div className="w-full">
      {label && !hideTrigger && (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full h-[42px] flex items-center justify-between gap-2 px-4 rounded-lg border text-sm transition-colors ${hasValue
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
            } ${buttonClassName}`}
        >
          <span className="truncate">{hasValue && summary ? summary : 'Sélectionner une date'}</span>
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      <Modal
        open={open}
        title="Filtre par date"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clear}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
            >
              Effacer
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={apply}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary-strong text-white"
              >
                Appliquer
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {!hideTargetSelect && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Filtrer par</label>
              <select
                value={draft.target}
                onChange={(e) => setDraft(prev => ({ ...prev, target: e.target.value }))}
                className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value="date_livraison">Date d'arrivée</option>
                <option value="date_creation">Créée le</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Période</label>
              <select
                value={draft.mode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value="jour">Jour</option>
                <option value="semaine">Semaine</option>
                <option value="mois">Mois</option>
                <option value="annee">Année</option>
                <option value="fourchette">Personnalisé</option>
              </select>
            </div>

            {draft.mode !== 'fourchette' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Raccourci</label>
                <select
                  value={draft.offset}
                  onChange={(e) => handleOffsetChange(e.target.value)}
                  className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                >
                  {getOffsetOptions(draft.mode).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            {draft.mode === 'jour' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={draft.day}
                  onChange={(e) => setDraft(prev => ({ ...prev, day: e.target.value, offset: '' }))}
                  className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            )}

            {draft.mode === 'semaine' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Semaine</label>
                <input
                  type="week"
                  value={draft.week}
                  onChange={(e) => setDraft(prev => ({ ...prev, week: e.target.value, offset: '' }))}
                  className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            )}

            {draft.mode === 'mois' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Mois</label>
                <input
                  type="month"
                  value={draft.month}
                  onChange={(e) => setDraft(prev => ({ ...prev, month: e.target.value, offset: '' }))}
                  className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            )}

            {draft.mode === 'annee' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Année</label>
                <input
                  type="number"
                  value={draft.year}
                  onChange={(e) => setDraft(prev => ({ ...prev, year: e.target.value, offset: '' }))}
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                />
              </div>
            )}

            {draft.mode === 'fourchette' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Du</label>
                  <input
                    type="date"
                    value={draft.start}
                    onChange={(e) => setDraft(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Au</label>
                  <input
                    type="date"
                    value={draft.end}
                    onChange={(e) => setDraft(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full h-[42px] px-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DateRangeFilter
