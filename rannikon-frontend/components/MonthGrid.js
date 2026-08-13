const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The month/year picker used across payroll — a year switcher plus a 4-column
// grid of month buttons, with optional per-month badge counts. Shared so every
// page that needs to browse "by month" looks and behaves the same way.
export default function MonthGrid({ selectedMonth, selectedYear, onMonthClick, onYearChange, badgeCounts, monthLabels }) {
  const labels = monthLabels || SHORT_MONTHS
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button onClick={() => onYearChange(selectedYear - 1)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>‹</button>
        <span style={{ fontWeight: '800', fontSize: '16px', minWidth: '48px', textAlign: 'center' }}>{selectedYear}</span>
        <button onClick={() => onYearChange(selectedYear + 1)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
        {labels.map((m, i) => {
          const mn = i + 1
          const isSelected = mn === selectedMonth
          const count = badgeCounts?.[mn] || 0
          return (
            <button key={mn} onClick={() => onMonthClick(mn)}
              style={{
                padding: '10px 6px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', position: 'relative',
                border: isSelected ? 'none' : '1px solid #dde8dd',
                background: isSelected ? '#2d6a2d' : count > 0 ? '#f0f7f0' : '#fff',
                color: isSelected ? '#fff' : '#2d6a2d'
              }}>
              {m}
              {count > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', background: isSelected ? 'rgba(255,255,255,0.4)' : '#2d6a2d', color: '#fff', fontSize: '9px', fontWeight: '800', borderRadius: '8px', padding: '1px 5px', lineHeight: '14px' }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
