import { useState } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Day-of-month picker matching MonthGrid's visual language (same nav-button
// style, same selected/badge colors) but at day granularity — for pages that
// need to pick one specific date rather than a whole month.
export default function DayGrid({ selectedDate, onSelect, maxDate, monthLabels, weekdayLabels }) {
  const sel = new Date(selectedDate + 'T00:00:00')
  const [viewMonth, setViewMonth] = useState(sel.getMonth() + 1)
  const [viewYear, setViewYear] = useState(sel.getFullYear())

  const labels = monthLabels || MONTHS
  const weekdays = weekdayLabels || WEEKDAY_LABELS
  const max = maxDate ? new Date(maxDate + 'T00:00:00') : null
  const todayStr = new Date().toISOString().slice(0, 10)

  function shiftMonth(delta) {
    let m = viewMonth + delta, y = viewYear
    if (m < 1) { m = 12; y -= 1 }
    if (m > 12) { m = 1; y += 1 }
    setViewMonth(m); setViewYear(y)
  }

  const startWeekday = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function dateStr(d) {
    return `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
        <button onClick={() => shiftMonth(-1)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>‹</button>
        <span style={{ fontWeight: '800', fontSize: '15px', minWidth: '140px', textAlign: 'center' }}>{labels[viewMonth - 1]} {viewYear}</span>
        <button onClick={() => shiftMonth(1)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px', marginBottom: '4px' }}>
        {weekdays.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#999', textTransform: 'uppercase', padding: '2px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={'e' + i} />
          const ds = dateStr(d)
          const isSelected = ds === selectedDate
          const isFuture = max ? new Date(viewYear, viewMonth - 1, d) > max : false
          const isToday = ds === todayStr
          return (
            <button key={d} disabled={isFuture} onClick={() => onSelect(ds)}
              style={{
                padding: '8px 0', borderRadius: '8px', fontSize: '13px', fontWeight: isSelected ? '800' : '600',
                cursor: isFuture ? 'not-allowed' : 'pointer',
                border: isSelected ? 'none' : isToday ? '1.5px solid #2d6a2d' : '1px solid #dde8dd',
                background: isSelected ? '#2d6a2d' : '#fff',
                color: isSelected ? '#fff' : isFuture ? '#ccc' : '#2d6a2d'
              }}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
