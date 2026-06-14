import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { getWorker, isLoggedIn, clearAuth, saveAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

const LOCALE_MAP = { en: 'en-GB', uk: 'uk-UA', km: 'km-KH', vi: 'vi-VN', ne: 'ne-NP' }

const GROUP_COLORS = {
  'Kivilinna/Salo':    { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7' },
  'Karton Cambodia':   { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9' },
  'Karton International': { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  'Vassila':           { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },
  'Suppala':           { bg: '#f3e5f5', text: '#4a148c', border: '#ce93d8' },
  'Salo/Turku':        { bg: '#e0f7fa', text: '#006064', border: '#80deea' },
  'Unknown':           { bg: '#f5f5f5', text: '#555', border: '#ccc' },
}

function getHouseGroup(wn) {
  const n = parseInt(wn)
  if (n >= 100 && n <= 199) return 'Kivilinna/Salo'
  if (n >= 200 && n <= 299) return 'Karton Cambodia'
  if (n >= 300 && n <= 399) return 'Karton International'
  if (n >= 400 && n <= 499) return 'Vassila'
  if (n >= 500 && n <= 599) return 'Suppala'
  if (n >= 600) return 'Salo/Turku'
  return 'Unknown'
}

function toMins(t) {
  if (!t) return 0
  const p = t.slice(0, 5).split(':')
  return parseInt(p[0]) * 60 + parseInt(p[1])
}
function toHHMM(m) {
  if (m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}

function GroupPill({ group }) {
  const c = GROUP_COLORS[group] || GROUP_COLORS['Unknown']
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {group}
    </span>
  )
}

export default function SupervisorPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [worker, setWorker] = useState(null)
  const [session, setSession] = useState(null)
  const [batches, setBatches] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('session') // 'session' | 'worklog'

  // Add batch modal
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchNumbers, setBatchNumbers] = useState('')
  const [batchStart, setBatchStart] = useState('')
  const [batchWork, setBatchWork] = useState('')
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchError, setBatchError] = useState('')

  // Break modal
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [breakMins, setBreakMins] = useState('')
  const [breakSaving, setBreakSaving] = useState(false)

  // Finish batch
  const [finishBatchId, setFinishBatchId] = useState(null)
  const [finishTime, setFinishTime] = useState('')
  const [finishSaving, setFinishSaving] = useState(false)

  // Send to admin
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return }
    api.get('/api/auth/me').then(res => {
      const w = res.data.worker
      if (!['supervisor', 'admin'].includes(w?.role)) { router.push('/dashboard'); return }
      setWorker(w)
      saveAuth(localStorage.getItem('rannikon_token'), w)
      loadToday()
    }).catch(() => {
      const w = getWorker()
      if (!['supervisor', 'admin'].includes(w?.role)) { router.push('/dashboard'); return }
      setWorker(w)
      loadToday()
    })
  }, [])

  async function loadToday() {
    setLoading(true)
    try {
      const res = await api.get('/api/supervisor/session/today')
      if (res.data.session) {
        setSession(res.data.session)
        setSent(res.data.session.status === 'sent')
        await loadBatches(res.data.session.id)
        await loadLogs(res.data.session.id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadBatches(sid) {
    const res = await api.get('/api/supervisor/session/' + sid + '/batches')
    setBatches(res.data.batches || [])
  }

  async function loadLogs(sid) {
    const res = await api.get('/api/supervisor/session/' + sid + '/logs')
    setLogs(res.data.logs || [])
  }

  async function startSession() {
    setLoading(true)
    try {
      const res = await api.post('/api/supervisor/session', {})
      setSession(res.data.session)
      setBatches([])
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  async function addBatch() {
    setBatchError('')
    const nums = batchNumbers.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean)
    if (!nums.length) { setBatchError(t('sup.enterWorkerNumber')); return }
    if (!batchStart) { setBatchError(t('sup.startTimeRequired')); return }
    setBatchSaving(true)
    try {
      await api.post('/api/supervisor/batch', {
        session_id: session.id,
        worker_numbers: nums,
        start_time: batchStart,
        what_work: batchWork
      })
      setShowBatchModal(false)
      setBatchNumbers(''); setBatchStart(''); setBatchWork('')
      await loadBatches(session.id)
      await loadLogs(session.id)
    } catch (e) {
      setBatchError(e.response?.data?.error || t('sup.failedAddBatch'))
    } finally {
      setBatchSaving(false)
    }
  }

  async function addBreak() {
    if (!breakMins || parseInt(breakMins) <= 0) return
    setBreakSaving(true)
    try {
      const res = await api.post('/api/supervisor/break', { session_id: session.id, break_mins: parseInt(breakMins) })
      setSession(s => ({ ...s, total_break_mins: res.data.total_break_mins }))
      setShowBreakModal(false)
      setBreakMins('')
    } finally {
      setBreakSaving(false)
    }
  }

  async function setFinish() {
    if (!finishTime) return
    setFinishSaving(true)
    try {
      await api.patch('/api/supervisor/batch/' + finishBatchId + '/finish', { finish_time: finishTime })
      setFinishBatchId(null)
      setFinishTime('')
      await loadBatches(session.id)
      await loadLogs(session.id)
    } finally {
      setFinishSaving(false)
    }
  }

  async function sendToAdmin() {
    setSending(true)
    try {
      await api.post('/api/supervisor/session/' + session.id + '/send-to-admin', {})
      setSent(true)
      setSession(s => ({ ...s, status: 'sent' }))
    } catch (e) {
      alert(e.response?.data?.error || t('sup.failedToSend'))
    } finally {
      setSending(false)
    }
  }

  async function removeWorker(wn) {
    await api.delete('/api/supervisor/session/' + session.id + '/log/' + wn)
    await loadLogs(session.id)
  }

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const dateLabel = new Date().toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(t('housemaster.workLog'), 14, 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`${t('sup.supervisorLabel')}: ${worker?.full_name || ''}   ${t('papers.date')}: ${dateLabel}   ${t('sup.totalBreak')}: ${session?.total_break_mins || 0} min`, 14, 23)
    const rows = logs.map(r => [r.worker_number, r.worker_name || '', r.house_group, r.start_time?.slice(0,5) || '', r.finish_time?.slice(0,5) || '', (r.total_break_mins || 0) + ' min', r.white_hours || '', r.orange_hours || '', r.total_hours || '', r.what_work || ''])
    autoTable(doc, {
      startY: 28,
      head: [[t('housemaster.workNumberShort'), t('housemaster.name'), t('sup.group'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('sup.whiteHrs'), t('sup.orangeHrs'), t('housemaster.totalHrs'), t('housemaster.workDone')]],
      body: rows,
      styles: { fontSize: 8, lineWidth: 0.2 },
      headStyles: { fillColor: [45, 106, 45], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.raw[2]) {
          const c = GROUP_COLORS[data.row.raw[2]]
          if (c) data.cell.styles.fillColor = c.bg.replace('#','').match(/../g).map(x => parseInt(x,16))
        }
      }
    })
    doc.save('worklog-' + new Date().toISOString().slice(0,10) + '.pdf')
  }

  function downloadExcel() {
    const dateLabel = new Date().toLocaleDateString(LOCALE_MAP[lang] || 'en-GB')
    const data = [
      [t('housemaster.workLog')],
      [`${t('sup.supervisorLabel')}: ${worker?.full_name || ''}   ${t('papers.date')}: ${dateLabel}   ${t('housemaster.breakShort')}: ${session?.total_break_mins || 0} min`],
      [],
      [t('housemaster.workNumberShort'), t('housemaster.name'), t('sup.group'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('sup.whiteHrs'), t('sup.orangeHrs'), t('housemaster.totalHrs'), t('housemaster.workDone')],
      ...logs.map(r => [r.worker_number, r.worker_name || '', r.house_group, r.start_time?.slice(0,5) || '', r.finish_time?.slice(0,5) || '', (r.total_break_mins || 0) + ' min', r.white_hours || '', r.orange_hours || '', r.total_hours || '', r.what_work || ''])
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('housemaster.workLog'))
    XLSX.writeFile(wb, 'worklog-' + new Date().toISOString().slice(0,10) + '.xlsx')
  }

  const inp = (extra = {}) => ({ width: '100%', padding: '10px 12px', fontSize: '15px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box', fontFamily: 'inherit', ...extra })

  const todayLabel = new Date().toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ color: '#555' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('sup.badge')} | Rannikon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f0; -webkit-font-smoothing: antialiased; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; font-family: inherit; transition: all 0.15s; }
        .btn-green { background: #2d6a2d; color: #fff; }
        .btn-green:hover { background: #235223; }
        .btn-outline { background: #fff; color: #333; border: 1px solid #ddd !important; }
        .btn-outline:hover { background: #f5f5f0; }
        .btn-red { background: #fff; color: #c0392b; border: 1px solid #e0b0b0 !important; }
        .btn-red:hover { background: #fff5f5; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .card { background: #fff; border: 1px solid #e8e8e3; border-radius: 14px; padding: 20px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        input:focus, textarea:focus { outline: none; border-color: #2d6a2d !important; box-shadow: 0 0 0 3px rgba(45,106,45,0.1); }
        @media (max-width: 600px) { .sup-badge { display: none !important; } }
      `}</style>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon" style={{ height: '46px', width: 'auto' }} />
            <span style={{ fontFamily: 'Dancing Script, cursive', fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <span className="sup-badge" style={{ background: '#1a3a5c', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>{t('sup.badge')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: '500' }}>#{worker?.work_number} {worker?.full_name}</span>
          {worker?.role === 'admin' && (
            <button className="btn btn-outline" onClick={() => router.push('/admin')} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('housemaster.adminBtn')}</button>
          )}
          <button className="btn btn-outline" onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.myTimesheet')}</button>
          <button className="btn btn-outline" onClick={() => { clearAuth(); router.push('/login') }} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.signOut')}</button>
          <LanguageSelector />
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.4px', marginBottom: '4px' }}>{t('sup.panel')}</h1>
          <p style={{ fontSize: '13px', color: '#666' }}>{todayLabel}</p>
        </div>

        {/* No session yet */}
        {!session && (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '56px', height: '56px', background: '#e8f5e9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{t('sup.noActiveSession')}</h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>{t('sup.startSessionDesc')}</p>
            <button className="btn btn-green" onClick={startSession} style={{ fontSize: '14px', padding: '10px 24px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t('sup.startSession')}
            </button>
          </div>
        )}

        {/* Active session */}
        {session && (
          <>
            {/* Session summary bar */}
            <div className="card" style={{ marginBottom: '16px', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sup.workersRecorded')}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#2d6a2d' }}>{logs.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sup.totalBreak')}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#b45309' }}>{session.total_break_mins || 0} min</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('sup.batches')}</div>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#555' }}>{batches.length}</div>
                </div>
                {sent && (
                  <div style={{ background: '#e8f5e9', color: '#2d6a2d', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: '1px solid #c8e6c9' }}>
                    {t('sup.sentToAdmin')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" onClick={() => setShowBreakModal(true)} style={{ background: '#fffbeb', borderColor: '#f59e0b !important', color: '#b45309' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {t('sup.addBreak')}
                </button>
                <button className="btn btn-green" onClick={() => setShowBatchModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('sup.addWorkers')}
                </button>
              </div>
            </div>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[['session', t('sup.batches')], ['worklog', t('sup.workLogTab')]].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid #ddd', background: view === v ? '#2d6a2d' : '#fff', color: view === v ? '#fff' : '#333' }}>{l}</button>
              ))}
            </div>

            {/* BATCHES VIEW */}
            {view === 'session' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {batches.length === 0 && (
                  <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                    <p style={{ fontSize: '14px' }}>{t('sup.noBatchesYet')}</p>
                  </div>
                )}
                {batches.map(b => {
                  const hasFinish = !!b.finish_time
                  return (
                    <div key={b.id} className="card" style={{ borderLeft: `4px solid ${hasFinish ? '#2d6a2d' : '#f59e0b'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a18' }}>
                              {t('papers.start')}: <span style={{ color: '#2d6a2d' }}>{b.start_time?.slice(0,5)}</span>
                            </span>
                            {hasFinish ? (
                              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a18' }}>
                                {t('papers.finish')}: <span style={{ color: '#b45309' }}>{b.finish_time?.slice(0,5)}</span>
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', background: '#fff3e0', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>{t('sup.noFinishYet')}</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {b.worker_numbers?.map(wn => {
                              const g = getHouseGroup(wn)
                              const c = GROUP_COLORS[g]
                              return (
                                <span key={wn} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '3px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: '700' }}>
                                  #{wn}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        {!hasFinish && (
                          <button className="btn btn-green" onClick={() => { setFinishBatchId(b.id); setFinishTime('') }} style={{ fontSize: '12px', padding: '7px 14px' }}>
                            {t('sup.setFinish')}
                          </button>
                        )}
                        {hasFinish && (
                          <button className="btn btn-outline" onClick={() => { setFinishBatchId(b.id); setFinishTime(b.finish_time?.slice(0,5) || '') }} style={{ fontSize: '12px', padding: '7px 14px' }}>
                            {t('sup.editFinish')}
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{b.worker_numbers?.length} {b.worker_numbers?.length !== 1 ? t('housemaster.workers') : t('housemaster.worker')}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* WORKLOG VIEW */}
            {view === 'worklog' && (
              <div>
                <div className="card" style={{ marginBottom: '12px', overflowX: 'auto' }}>
                  {logs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888', padding: '24px', fontSize: '14px' }}>{t('sup.noWorkersRecorded')}</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '680px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f0' }}>
                          {[t('housemaster.workNumberShort'), t('housemaster.name'), t('sup.group'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('sup.whiteHrs'), t('sup.orangeHrs'), t('papers.total'), t('housemaster.workDone'), ''].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '700', fontSize: '11px', color: '#555', borderBottom: '1px solid #e8e8e3', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((r, i) => (
                          <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8', borderBottom: '1px solid #f0f0ec' }}>
                            <td style={{ padding: '8px 10px', fontWeight: '700' }}>#{r.worker_number}</td>
                            <td style={{ padding: '8px 10px', color: '#333' }}>{r.worker_name || <span style={{ color: '#ccc' }}>{t('housemaster.unknown')}</span>}</td>
                            <td style={{ padding: '8px 10px' }}><GroupPill group={r.house_group} /></td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{r.start_time?.slice(0,5) || ''}</td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{r.finish_time?.slice(0,5) || <span style={{ color: '#ccc' }}>{t('sup.pending')}</span>}</td>
                            <td style={{ padding: '8px 10px', color: '#b45309' }}>{r.total_break_mins > 0 ? r.total_break_mins + ' min' : ''}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600', color: '#2d6a2d' }}>{r.white_hours || ''}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '600', color: '#b45309' }}>{r.orange_hours || ''}</td>
                            <td style={{ padding: '8px 10px', fontWeight: '800', color: '#1565c0' }}>{r.total_hours || ''}</td>
                            <td style={{ padding: '8px 10px', color: '#555', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.what_work || ''}</td>
                            <td style={{ padding: '8px 10px' }}>
                              <button onClick={() => removeWorker(r.worker_number)} title={t('sup.remove')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Export + Send to admin */}
                {logs.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-outline" onClick={downloadPDF} style={{ fontSize: '12px' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">PDF</text></svg>
                      {t('papers.downloadPDF')}
                    </button>
                    <button className="btn btn-outline" onClick={downloadExcel} style={{ fontSize: '12px' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">XLS</text></svg>
                      {t('papers.downloadExcel')}
                    </button>
                    <div style={{ flex: 1 }} />
                    {!sent ? (
                      <button className="btn btn-green" onClick={sendToAdmin} disabled={sending} style={{ fontSize: '13px', padding: '9px 20px' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        {sending ? t('auth.sending') : t('sup.sendToAdmin')}
                      </button>
                    ) : (
                      <div style={{ background: '#e8f5e9', color: '#2d6a2d', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', border: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {t('sup.sentToAdmin')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ADD BATCH MODAL */}
      {showBatchModal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowBatchModal(false) }}>
          <div className="modal">
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '18px' }}>{t('sup.addWorkers')}</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>{t('sup.workerNumbers')}</label>
              <textarea
                style={{ ...inp(), height: '80px', resize: 'none', fontSize: '14px' }}
                placeholder={t('sup.workerNumbersPlaceholder')}
                value={batchNumbers}
                onChange={e => setBatchNumbers(e.target.value)}
              />
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                {batchNumbers.split(/[\s,;]+/).filter(Boolean).length} {t('sup.workersEntered')}
              </div>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>{t('days.startTime')}</label>
              <input style={inp()} placeholder={t('sup.startTimePlaceholder')} value={batchStart} onChange={e => setBatchStart(e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#333' }}>{t('days.whatWork')} <span style={{ color: '#888', fontWeight: '400' }}>{t('sup.optional')}</span></label>
              <input type="text" style={inp()} placeholder={t('sup.whatWorkPlaceholder')} value={batchWork} onChange={e => setBatchWork(e.target.value)} />
            </div>
            {batchError && <div style={{ color: '#c0392b', fontSize: '13px', marginBottom: '12px' }}>{batchError}</div>}

            {/* Preview of groups */}
            {batchNumbers.trim() && (
              <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#f5f5f0', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('sup.groupsDetected')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {batchNumbers.split(/[\s,;]+/).filter(Boolean).map(wn => (
                    <div key={wn} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '13px' }}>#{wn}</span>
                      <GroupPill group={getHouseGroup(wn)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => { setShowBatchModal(false); setBatchError('') }} style={{ flex: 1 }}>{t('sup.cancel')}</button>
              <button className="btn btn-green" onClick={addBatch} disabled={batchSaving} style={{ flex: 2 }}>
                {batchSaving ? t('sup.saving') : t('sup.addBatchBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BREAK MODAL */}
      {showBreakModal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowBreakModal(false) }}>
          <div className="modal" style={{ maxWidth: '340px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>{t('sup.recordBreak')}</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '18px' }}>{t('sup.currentTotal')}: <b>{session.total_break_mins || 0} min</b></p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('sup.breakDuration')}</label>
              <input type="number" min="1" max="120" style={inp({ fontSize: '20px', fontWeight: '700', textAlign: 'center' })} placeholder={t('sup.breakPlaceholder')} value={breakMins} onChange={e => setBreakMins(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[10, 15, 20, 30, 45].map(m => (
                <button key={m} onClick={() => setBreakMins(String(m))} style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: `1.5px solid ${breakMins === String(m) ? '#2d6a2d' : '#ddd'}`, background: breakMins === String(m) ? '#f0fff0' : '#fff', color: breakMins === String(m) ? '#2d6a2d' : '#555' }}>{m}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setShowBreakModal(false)} style={{ flex: 1 }}>{t('sup.cancel')}</button>
              <button className="btn btn-green" onClick={addBreak} disabled={breakSaving || !breakMins} style={{ flex: 2 }}>
                {breakSaving ? t('sup.saving') : `${t('sup.addBreakPrefix')} ${breakMins || '—'} ${t('sup.minBreakSuffix')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINISH TIME MODAL */}
      {finishBatchId && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setFinishBatchId(null) }}>
          <div className="modal" style={{ maxWidth: '340px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>{t('sup.setFinish')}</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '18px' }}>{t('sup.applyToAllWorkers')}</p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('days.finishTime')}</label>
              <input style={inp({ fontSize: '20px', textAlign: 'center' })} placeholder={t('sup.finishTimePlaceholder')} value={finishTime} onChange={e => setFinishTime(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={() => setFinishBatchId(null)} style={{ flex: 1 }}>{t('sup.cancel')}</button>
              <button className="btn btn-green" onClick={setFinish} disabled={finishSaving || !finishTime} style={{ flex: 2 }}>
                {finishSaving ? t('sup.saving') : t('sup.setFinishBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
