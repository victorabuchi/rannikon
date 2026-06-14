import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

function toMins(t) {
  const p = t.split(':')
  return parseInt(p[0]) * 60 + parseInt(p[1])
}
function toHHMM(m) {
  if (m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}
function addMins(t, add) {
  const total = toMins(t) + add
  return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}

const SCENARIOS = [
  { start: '10:30', finish: '21:15', breakMins: 30 },
  { start: '09:00', finish: '20:30', breakMins: 40 },
  { start: '09:15', finish: '22:00', breakMins: 60 },
]

function AnimatedDemo() {
  const [tick, setTick] = useState(0)
  const step = tick % 9
  const scenarioIdx = Math.floor(tick / 9) % 3

  useEffect(() => {
    const delays = [700, 500, 1100, 500, 1100, 420, 280, 400, 3200]
    const t = setTimeout(() => setTick(c => c + 1), delays[step] ?? 1000)
    return () => clearTimeout(t)
  }, [tick])

  const sc = SCENARIOS[scenarioIdx]
  const extraBreak = sc.breakMins - 30
  const wFinish = addMins(sc.start, 510)
  const oStart = wFinish
  const oMins = Math.max(0, toMins(sc.finish) - toMins(oStart) - extraBreak)
  const oHours = toHHMM(oMins)
  const totalHours = toHHMM(480 + oMins)

  const startVal = step >= 2 ? sc.start : ''
  const finishVal = step >= 4 ? sc.finish : ''
  const breakActive = step >= 6
  const btnClick = step === 7
  const showResults = step === 8

  const breakBtnLeft = [60, 148, 232][scenarioIdx]
  const cursorPos = [
    { top: 0,   left: 0,            opacity: 0   },
    { top: 155, left: 175,          opacity: 1   },
    { top: 155, left: 175,          opacity: 1   },
    { top: 212, left: 175,          opacity: 1   },
    { top: 212, left: 175,          opacity: 1   },
    { top: 265, left: breakBtnLeft, opacity: 1   },
    { top: 265, left: breakBtnLeft, opacity: 1   },
    { top: 308, left: 140,          opacity: 1   },
    { top: 308, left: 140,          opacity: 0.3 },
  ][step]

  return (
    <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>

        {/* Browser chrome */}
        <div style={{ background: '#f5f5f3', borderBottom: '1px solid #e0e0dc', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {['#ff5f57', '#ffbd2e', '#28c940'].map(c => (
              <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ flex: 1, background: '#ebebea', borderRadius: '5px', padding: '3px 8px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
            rannikon.com/dashboard
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#2d6a2d', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>
            Log work hours
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Worker number</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600', background: '#fafaf9', color: '#333' }}>247</div>
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Start time</div>
            <div style={{
              border: (step === 1 || step === 2) ? '1.5px solid #2d6a2d' : '1px solid #ddd',
              borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600',
              background: (step === 1 || step === 2) ? '#f0fff0' : '#fff', color: '#333',
              transition: 'all 0.2s', minHeight: '33px',
              boxShadow: (step === 1 || step === 2) ? '0 0 0 3px rgba(45,106,45,0.1)' : 'none'
            }}>
              {startVal}
              {(step === 1 || step === 2) && (
                <span style={{ display: 'inline-block', width: '1.5px', height: '13px', background: '#2d6a2d', marginLeft: '1px', verticalAlign: 'text-bottom', animation: 'blinkCursor 1s step-end infinite' }} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Finish time</div>
            <div style={{
              border: (step === 3 || step === 4) ? '1.5px solid #2d6a2d' : '1px solid #ddd',
              borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600',
              background: (step === 3 || step === 4) ? '#f0fff0' : '#fff', color: '#333',
              transition: 'all 0.2s', minHeight: '33px',
              boxShadow: (step === 3 || step === 4) ? '0 0 0 3px rgba(45,106,45,0.1)' : 'none'
            }}>
              {finishVal}
              {(step === 3 || step === 4) && (
                <span style={{ display: 'inline-block', width: '1.5px', height: '13px', background: '#2d6a2d', marginLeft: '1px', verticalAlign: 'text-bottom', animation: 'blinkCursor 1s step-end infinite' }} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '13px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', fontWeight: '500' }}>Break</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[30, 40, 60].map(b => (
                <div key={b} style={{
                  flex: 1, textAlign: 'center', padding: '5px 3px', fontSize: '11px', fontWeight: '600',
                  border: `1px solid ${breakActive && b === sc.breakMins ? '#2d6a2d' : '#ddd'}`,
                  borderRadius: '5px',
                  background: breakActive && b === sc.breakMins ? '#f0fff0' : '#fafaf9',
                  color: breakActive && b === sc.breakMins ? '#2d6a2d' : '#999',
                  transition: 'all 0.2s'
                }}>{b} min</div>
              ))}
            </div>
          </div>

          <div style={{
            background: '#2d6a2d', borderRadius: '7px', padding: '9px', textAlign: 'center',
            color: '#fff', fontSize: '13px', fontWeight: '700',
            transform: btnClick ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.12s', opacity: btnClick ? 0.8 : 1, cursor: 'pointer'
          }}>
            Calculate hours
          </div>

          <div style={{ overflow: 'hidden', maxHeight: showResults ? '260px' : '0', transition: 'max-height 0.5s ease', marginTop: showResults ? '10px' : '0' }}>

            {/* White Paper */}
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '7px', padding: '7px 10px', marginBottom: '5px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#2d6a2d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>White Paper</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px' }}>
                {[['Start', sc.start], ['Finish', wFinish], ['Break', extraBreak + ' min'], ['Hours', '8:00']].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center', background: '#fff', borderRadius: '4px', padding: '4px 2px' }}>
                    <div style={{ fontSize: '8px', color: '#888' }}>{l}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: l === 'Hours' ? '#2d6a2d' : '#1a1a18' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orange Paper */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '7px', padding: '7px 10px', marginBottom: '5px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Orange Paper</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px' }}>
                {[['Start', oStart], ['Finish', sc.finish], ['Break', extraBreak + ' min'], ['Hrs', oHours]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center', background: '#fff', borderRadius: '4px', padding: '4px 2px' }}>
                    <div style={{ fontSize: '8px', color: '#888' }}>{l}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: l === 'Hrs' ? '#b45309' : '#1a1a18' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Summary */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '7px', padding: '7px 10px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>Weekly Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {[['Working hrs', '8:00'], ['Extra hrs', oHours], ['Total', totalHours]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center', background: '#fff', borderRadius: '4px', padding: '4px 2px' }}>
                    <div style={{ fontSize: '8px', color: '#888' }}>{l}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#1565c0' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Animated cursor */}
      <div style={{
        position: 'absolute', top: cursorPos.top, left: cursorPos.left,
        opacity: cursorPos.opacity,
        transition: 'top 0.38s cubic-bezier(0.25,0.46,0.45,0.94), left 0.38s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s',
        pointerEvents: 'none', zIndex: 10
      }}>
        <svg width="18" height="22" viewBox="0 0 18 22">
          <path d="M1 1L1 17L5 13L8 20L10.5 19L7.5 12L13 12Z" fill="#1a1a1a" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [work, setWork] = useState('')
  const [start, setStart] = useState('')
  const [finish, setFinish] = useState('')
  const [breakMins, setBreakMins] = useState(30)
  const [res, setRes] = useState(null)
  const [activeFeatures, setActiveFeatures] = useState({ worker: 0, supervisor: 0, admin: 0, housemaster: 0 })
  const [activeRole, setActiveRole] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setActiveFeatures(s => ({
        worker: (s.worker + 1) % 5,
        supervisor: (s.supervisor + 1) % 5,
        admin: (s.admin + 1) % 5,
        housemaster: (s.housemaster + 1) % 4,
      }))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  function calc() {
    if (!date || !start || !finish) { alert('Please fill in date, start time, and finish time'); return }
    const totalBreak = Math.max(30, breakMins)
    const extraBreak = totalBreak - 30
    const WHITE_WINDOW = 510
    const workedMins = toMins(finish) - toMins(start)
    if (workedMins >= WHITE_WINDOW) {
      const wFinish = addMins(start, WHITE_WINDOW)
      const oStart = wFinish
      const oMins = Math.max(0, toMins(finish) - toMins(oStart) - extraBreak)
      setRes({ date, work, wStart: start, wFinish, oStart, oFinish: finish, wHours: '8:00', oHours: toHHMM(oMins), total: toHHMM(480 + oMins) })
    } else {
      const wHours = toHHMM(Math.max(0, workedMins - totalBreak))
      setRes({ date, work, wStart: start, wFinish: finish, oStart: finish, oFinish: finish, wHours, oHours: '0:00', total: wHours })
    }
  }

  const workerFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Calculate hours instantly',
      desc: 'Enter start, finish and break — papers auto-fill instantly.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: 'Full monthly timesheet',
      desc: '31-day view with all your entries in one place.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      title: 'Download papers as PDF or Excel',
      desc: 'White paper, orange paper, weekly summary and green paper — ready to print or share.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="14" r="3" /><circle cx="15" cy="14" r="3" /><circle cx="12" cy="9" r="3" /><path d="M12 6V3" /><path d="M9 3c0 1.5 1.5 2 3 2s3-.5 3-2" />
        </svg>
      ),
      title: 'Berry picking tracking',
      desc: 'Log the kilos picked each day on the green paper.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      title: 'Edit any value',
      desc: 'Tap any cell to correct it directly — no need to start over.'
    },
  ]

  const supervisorFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: 'Record worker batches',
      desc: 'Enter multiple worker numbers at once with one shared start time.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Track breaks automatically',
      desc: 'Add breaks throughout the day — the system totals them for you.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      title: 'Set finish time per batch',
      desc: 'One tap fills the finish time for every worker in that batch.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      title: 'Auto-fill worker timesheets',
      desc: 'Workers see their hours already calculated when they log in.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
      title: 'Send worklog to admin',
      desc: 'One tap sends the full day report by email.'
    },
  ]

  const adminFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: 'View all workers',
      desc: 'Search and manage every worker account in one place.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      title: 'Sort supervisor logs by group',
      desc: 'Kivilinna/Salo, Karton Cambodia, Karton International, Vassila, Suppala, Salo/Turku.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
      title: 'Send worklogs to housemasters',
      desc: "One tap sends the daily worklog to each group's housemaster."
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
      title: 'Invite anyone',
      desc: 'Send invitation emails with a role already assigned.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
      title: 'Full statistics',
      desc: 'Workers, entries, supervisors and housemasters at a glance.'
    },
  ]

  const housemasterFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
      ),
      title: 'Receive group worklogs',
      desc: 'The admin sends worklogs directly to your account.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      title: 'Download as PDF or Excel',
      desc: 'Clean, formatted worklog ready to share or print.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      title: 'Share to Facebook or WhatsApp',
      desc: 'One tap shares a formatted summary, ready to post.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      ),
      title: 'Delete worklogs',
      desc: 'Remove outdated records you no longer need.'
    },
  ]

  const howItWorksRoles = [
    {
      key: 'worker',
      label: 'For workers',
      color: '#2d6a2d',
      iconBg: '#e8f5e9',
      tabIcon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
      steps: [
        {
          n: '01',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          ),
          t: 'Enter your times',
          d: "Open the app, find today's row, enter your actual start time and finish time."
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="11" x2="8.01" y2="11" /><line x1="12" y1="11" x2="12.01" y2="11" /><line x1="16" y1="11" x2="16.01" y2="11" /><line x1="8" y1="15" x2="8.01" y2="15" /><line x1="12" y1="15" x2="12.01" y2="15" /><line x1="16" y1="15" x2="16.01" y2="15" /><line x1="8" y1="19" x2="12" y2="19" />
            </svg>
          ),
          t: 'Rannikon calculates everything',
          d: 'All four paper columns fill instantly and automatically. No math, no mistakes.'
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
          t: 'Copy numbers to your paper form',
          d: 'See the exact values to write on your white, orange, and green papers.'
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ),
          t: 'Download or share your papers',
          d: 'Download PDF or Excel of all your papers in one tap.'
        },
      ]
    },
    {
      key: 'supervisor',
      label: 'For supervisors',
      color: '#1a3a5c',
      iconBg: '#e8eef5',
      tabIcon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
      ),
      steps: [
        {
          n: '01',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          ),
          t: 'Record worker arrivals',
          d: 'Log each worker number and start time as they arrive at the farm.'
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="13" r="8" /><polyline points="11 9 11 13 14 14" /><line x1="19" y1="3" x2="19" y2="7" /><line x1="17" y1="5" x2="21" y2="5" />
            </svg>
          ),
          t: 'Track breaks throughout the day',
          d: 'Add each break as it happens — the system totals them automatically.'
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
          t: 'Set finish time for each batch',
          d: 'One tap fills the finish time for every worker in that batch.'
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ),
          t: 'Send worklog to admin',
          d: 'Download PDF or send the full day report to admin in one tap.'
        },
      ]
    },
    {
      key: 'admin',
      label: 'For admins',
      color: '#1565c0',
      iconBg: '#e3f2fd',
      tabIcon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
        </svg>
      ),
      steps: [
        {
          n: '01',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
            </svg>
          ),
          t: 'Receive supervisor logs',
          d: 'All supervisor reports arrive sorted by house group automatically.'
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          ),
          t: 'Sort and verify worklogs',
          d: 'View all 6 groups — Kivilinna/Salo, Karton Cambodia, Karton International, Vassila, Suppala, Salo/Turku.'
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ),
          t: 'Send to housemasters',
          d: 'One tap sends each group worklog to the correct housemaster.'
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          ),
          t: 'Manage all workers',
          d: 'Invite workers, assign roles, activate or deactivate accounts.'
        },
      ]
    },
    {
      key: 'housemaster',
      label: 'For housemasters',
      color: '#7b1fa2',
      iconBg: '#f3e5f5',
      tabIcon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      steps: [
        {
          n: '01',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          ),
          t: 'Receive your group worklog',
          d: 'Admin sends worklogs directly to your account by email and in the app.'
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          ),
          t: 'Review worker hours',
          d: "See every worker's start time, finish time, break and total hours."
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ),
          t: 'Download PDF or Excel',
          d: 'Clean formatted worklog ready to print or share.'
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          ),
          t: 'Share to Facebook or WhatsApp',
          d: 'One tap shares a formatted summary to your group.'
        },
      ]
    },
  ]

  return (
    <>
      <Head>
        <title>Rannikon Puutarha: Work Hours Made Easy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fafaf9;color:#1a1a18;-webkit-font-smoothing:antialiased}
        a{text-decoration:none;color:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes blinkCursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes popIn{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}
        .nav-btn:hover{background:#f0f0ec!important}
        .cta-btn:hover{background:#235223!important;transform:translateY(-1px)}
        .cta-btn{transition:all 0.2s}
        .feature-tab{transition:all 0.2s;cursor:pointer}
        .feature-tab-light:hover{background:#f5f5f2!important}
        .feature-tab-dark:hover{background:rgba(255,255,255,0.05)!important}
        .check-pop{animation:popIn 0.25s ease}
        .calc-inp:focus{border-color:#2d6a2d!important;outline:none;box-shadow:0 0 0 3px rgba(45,106,45,0.12)}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,0.1)!important}
        .card-hover{transition:all 0.25s}
        .fade-up{animation:fadeUp 0.7s ease both}
        .dot-pulse{animation:pulse 2s infinite}
        .footer-link:hover{color:#c9d1d9!important}
        .footer-newsletter-input:focus{outline:none;border-color:#388e3c!important}
        @media(max-width:768px){
          .hero-grid{flex-direction:column!important}
          .features-grid{grid-template-columns:1fr!important}
          .nav-links{display:none!important}
          .hero-visual{display:flex!important;justify-content:center;margin-top:36px}
          .footer-cols{flex-direction:column!important;gap:32px!important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: 'rgba(250,250,249,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e8e3', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, padding: '0 24px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '40px', width: 'auto', flexShrink: 0, borderRadius: '6px' }} />
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            {['Features', 'How it works', 'Calculator'].map(l => (
              <a key={l} href={'#' + l.toLowerCase().replace(' ', '-')} style={{ fontSize: '14px', fontWeight: '500', color: '#555', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#555'}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="nav-btn" onClick={() => router.push('/login')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#333', transition: 'background 0.15s' }}>Sign in</button>
            <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '8px 16px', background: '#2d6a2d', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>Get started</button>
          </div>
        </div>
      </nav>

      {/* spacer for fixed nav */}
      <div style={{ height: '60px' }} />

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg,#f2f8f2 0%,#fafaf9 45%,#f8f4ee 100%)', padding: '72px 24px 60px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '400px', height: '400px', background: 'radial-gradient(circle,rgba(45,106,45,0.07) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(21,101,192,0.05) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="hero-grid" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '56px' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '20px', padding: '5px 14px', marginBottom: '22px' }}>
              <span className="dot-pulse" style={{ width: '7px', height: '7px', background: '#2d6a2d', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#2d6a2d' }}>500+ workers already using Rannikon</span>
            </div>
            <h1 className="fade-up" style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: '800', lineHeight: '1.08', letterSpacing: '-1.5px', marginBottom: '18px', animationDelay: '0.1s' }}>
              Farm work hours,<br /><span style={{ color: '#2d6a2d' }}>done in seconds</span>
            </h1>
            <p className="fade-up" style={{ fontSize: '17px', color: '#555', lineHeight: '1.7', marginBottom: '30px', maxWidth: '420px', animationDelay: '0.2s' }}>
              Enter your start and finish time. Rannikon automatically calculates and fills all your paper forms: white paper, orange paper, and weekly summary. Zero mistakes.
            </p>
            <div className="fade-up" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', animationDelay: '0.3s' }}>
              <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '13px 26px', background: '#2d6a2d', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>
                Create account
              </button>
              <a href="#calculator" style={{ padding: '13px 26px', background: '#fff', border: '1px solid #e0e0dc', borderRadius: '10px', fontSize: '15px', fontWeight: '600', color: '#333', display: 'inline-block', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                Try calculator
              </a>
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '36px', flexWrap: 'wrap' }}>
              {[['500+', 'Workers'], ['4', 'All papers auto-filled'], ['0', 'Errors']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#2d6a2d', letterSpacing: '-0.5px' }}>{n}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual" style={{ flex: '1', minWidth: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AnimatedDemo />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>Built for everyone at the farm</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6' }}>Workers, supervisors, admins and housemasters — each role has its own dedicated tools</p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>

            {/* Workers */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #fafaf8 0%, #eef6ee 100%)', border: '1px solid #e8e8e3', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '44px', height: '44px', background: '#e8f5e9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px' }}>For workers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {workerFeatures.map((f, i) => (
                  <div key={i} className="feature-tab feature-tab-light" onClick={() => setActiveFeatures(s => ({ ...s, worker: i }))}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeatures.worker === i ? '#e8f5e9' : 'transparent', marginBottom: '4px', border: activeFeatures.worker === i ? '1px solid #c8e6c9' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeatures.worker === i ? '6px' : '0' }}>
                      <span style={{ color: activeFeatures.worker === i ? '#2d6a2d' : '#888', flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a18', flex: 1 }}>{f.title}</span>
                      {activeFeatures.worker === i && (
                        <svg className="check-pop" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {activeFeatures.worker === i && <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
                  </div>
                ))}
              </div>
              <button className="cta-btn" onClick={() => router.push('/register')} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#2d6a2d', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Register as worker
              </button>
            </div>

            {/* Supervisors */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #1a1a18 0%, #20231f 100%)', border: '1px solid #333', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px', color: '#fff' }}>For supervisors</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {supervisorFeatures.map((f, i) => (
                  <div key={i} className="feature-tab feature-tab-dark" onClick={() => setActiveFeatures(s => ({ ...s, supervisor: i }))}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeatures.supervisor === i ? 'rgba(45,106,45,0.22)' : 'transparent', marginBottom: '4px', border: activeFeatures.supervisor === i ? '1px solid rgba(76,175,80,0.35)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeatures.supervisor === i ? '6px' : '0' }}>
                      <span style={{ flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff', flex: 1 }}>{f.title}</span>
                      {activeFeatures.supervisor === i && (
                        <svg className="check-pop" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#66bb6a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {activeFeatures.supervisor === i && <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #fafaf8 0%, #eaf2fb 100%)', border: '1px solid #e8e8e3', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '44px', height: '44px', background: '#e3f2fd', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px' }}>For admins</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {adminFeatures.map((f, i) => (
                  <div key={i} className="feature-tab feature-tab-light" onClick={() => setActiveFeatures(s => ({ ...s, admin: i }))}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeatures.admin === i ? '#e3f2fd' : 'transparent', marginBottom: '4px', border: activeFeatures.admin === i ? '1px solid #bbdefb' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeatures.admin === i ? '6px' : '0' }}>
                      <span style={{ flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a18', flex: 1 }}>{f.title}</span>
                      {activeFeatures.admin === i && (
                        <svg className="check-pop" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {activeFeatures.admin === i && <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Housemasters */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #1a1a18 0%, #221a26 100%)', border: '1px solid #333', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(123,31,162,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px', color: '#fff' }}>For housemasters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {housemasterFeatures.map((f, i) => (
                  <div key={i} className="feature-tab feature-tab-dark" onClick={() => setActiveFeatures(s => ({ ...s, housemaster: i }))}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeatures.housemaster === i ? 'rgba(123,31,162,0.22)' : 'transparent', marginBottom: '4px', border: activeFeatures.housemaster === i ? '1px solid rgba(206,147,216,0.35)' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeatures.housemaster === i ? '6px' : '0' }}>
                      <span style={{ flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff', flex: 1 }}>{f.title}</span>
                      {activeFeatures.housemaster === i && (
                        <svg className="check-pop" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {activeFeatures.housemaster === i && <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#f5f5f0' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>How it works</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '460px', margin: '0 auto' }}>Four simple steps for every role — pick yours below</p>
          </div>

          {/* Role tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '48px' }}>
            {howItWorksRoles.map((r, i) => (
              <button key={r.key} onClick={() => setActiveRole(i)} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px',
                border: activeRole === i ? 'none' : '1px solid #e0e0dc', cursor: 'pointer',
                fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
                background: activeRole === i ? r.color : '#fff',
                color: activeRole === i ? '#fff' : '#666',
                transition: 'all 0.2s'
              }}>
                {r.tabIcon}
                {r.label}
              </button>
            ))}
          </div>

          {/* Steps for the selected role */}
          <div key={activeRole} className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px 40px' }}>
            {howItWorksRoles[activeRole].steps.map(({ n, icon, t, d }) => (
              <div key={n} style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flexShrink: 0, width: '36px', height: '36px', background: howItWorksRoles[activeRole].iconBg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: howItWorksRoles[activeRole].color, fontFamily: 'monospace' }}>{n}</span>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.1px', color: '#1a1a18' }}>{t}</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>Try the calculator</h2>
            <p style={{ fontSize: '15px', color: '#666' }}>No account needed. See your forms filled instantly.</p>
          </div>
          <div style={{ background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { l: 'Date', ph: 'e.g. 25', v: date, fn: e => setDate(e.target.value) },
                { l: 'What work', ph: 'e.g. cleaning, planting, water system', v: work, fn: e => setWork(e.target.value) },
                { l: 'Actual start time', ph: 'HH:MM e.g. 10:15', v: start, fn: e => setStart(e.target.value) },
                { l: 'Actual finish time', ph: 'HH:MM e.g. 20:45', v: finish, fn: e => setFinish(e.target.value) },
              ].map(({ l, ph, v, fn }) => (
                <div key={l}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>{l}</label>
                  <input className="calc-inp" style={{ width: '100%', padding: '11px 13px', fontSize: '15px', border: '1px solid #ddd', borderRadius: '9px', background: '#fff', fontFamily: 'inherit', transition: 'border-color 0.15s' }} placeholder={ph} value={v} onChange={fn} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '7px', color: '#333' }}>Break duration</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[30, 45, 60].map(b => (
                    <button key={b} type="button" onClick={() => setBreakMins(b)} style={{
                      flex: 1, padding: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      border: `1.5px solid ${breakMins === b ? '#2d6a2d' : '#ddd'}`,
                      borderRadius: '9px',
                      background: breakMins === b ? '#f0fff0' : '#fff',
                      color: breakMins === b ? '#2d6a2d' : '#777',
                      transition: 'all 0.15s'
                    }}>{b} min</button>
                  ))}
                </div>
              </div>
              <button className="cta-btn" onClick={calc} style={{ width: '100%', padding: '13px', background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>
                Calculate my hours
              </button>
            </div>

            {res && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#fff', border: '2px solid #2d6a2d', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#2d6a2d', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px' }}>White paper</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[['Start', res.wStart], ['Finish', res.wFinish], ['Hours', res.wHours]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center', background: '#f5f5f2', borderRadius: '8px', padding: '8px 4px' }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>{l}</div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#fff3e0', border: '2px solid #e67e22', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px' }}>Orange paper</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[['Start', res.oStart], ['Finish', res.oFinish], ['Hours', res.oHours]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '8px 4px' }}>
                        <div style={{ fontSize: '10px', color: '#c08040', marginBottom: '3px' }}>{l}</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#b45309' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#1565c0', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>Total hours today</p>
                  <p style={{ fontSize: '32px', fontWeight: '800', color: '#1565c0', letterSpacing: '-1px' }}>{res.total}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
                  Want to save all your days?{' '}
                  <a href="/register" style={{ color: '#2d6a2d', fontWeight: '600' }}>Create an account</a>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: '#2d6a2d', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', color: '#fff', letterSpacing: '-0.8px', marginBottom: '14px', lineHeight: '1.1' }}>
            Stop calculating manually.<br />Start using Rannikon.
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '32px', lineHeight: '1.6' }}>
            Join 500+ workers at Rannikon Puutarha.
          </p>
          <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '15px 36px', background: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', color: '#2d6a2d', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            Create your account
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0d1117', color: '#e6edf3', padding: '0 24px' }}>

        {/* Newsletter */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #21262d', padding: '48px 0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3', marginBottom: '6px' }}>Subscribe to our newsletter</p>
            <p style={{ fontSize: '13px', color: '#7d8590', maxWidth: '340px', lineHeight: '1.6' }}>Get tips, technical guides, and best practices. Twice a month.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Enter your email"
              className="footer-newsletter-input"
              style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid #30363d', borderRadius: '6px', background: '#161b22', color: '#e6edf3', width: '220px', fontFamily: 'inherit' }}
            />
            <button style={{ padding: '8px 16px', background: '#238636', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Subscribe</button>
          </div>
        </div>

        {/* Link columns */}
        <div className="footer-cols" style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #21262d', padding: '40px 0', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          {[
            {
              title: 'Platform',
              links: [['Features', '#features'], ['How it works', '#how-it-works'], ['Calculator', '#calculator'], ['Timesheets', '/login'], ['Paper forms', '/login']]
            },
            {
              title: 'Resources',
              links: [['Documentation', '#'], ['API reference', '#'], ['Changelog', '#'], ['Tutorials', '#'], ['System status', '#']]
            },
            {
              title: 'Support',
              links: [['Help center', '#'], ['Contact us', '#'], ['Privacy policy', '/privacy'], ['Terms of service', '/terms'], ['Cookie policy', '#']]
            },
            {
              title: 'Company',
              links: [['About us', '#'], ['Rannikon Puutarha', '#'], ['Blog', '#'], ['Careers', '#'], ['Press', '#']]
            },
          ].map(col => (
            <div key={col.title} style={{ flex: '1', minWidth: '140px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#e6edf3', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} className="footer-link" style={{ fontSize: '13px', color: '#7d8590', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7d8590' }}>
            {'© ' + new Date().getFullYear() + ' Rannikon Puutarha · '}
            <a href="/terms" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Terms</a>
            {' · '}
            <a href="/privacy" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Privacy</a>
            {' · '}
            <a href="#" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Sitemap</a>
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* LinkedIn */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            {/* YouTube */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

      </footer>
    </>
  )
}
