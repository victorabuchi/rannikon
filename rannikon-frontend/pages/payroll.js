import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { clearAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_STYLE = {
  submitted:    { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9', label: 'Submitted' },
  approved:     { bg: '#e8f5e9', text: '#2d6a2d', border: '#a5d6a7', label: 'Approved' },
  rejected:     { bg: '#fdecea', text: '#c0392b', border: '#f5c6c6', label: 'Rejected' },
  needs_review: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80', label: 'Needs Review' },
}

const VERIFY_STYLE = {
  match:              { bg: '#e8f5e9', text: '#2d6a2d', label: 'Match' },
  mismatch:           { bg: '#fdecea', text: '#c0392b', label: 'Mismatch' },
  missing_supervisor: { bg: '#fff3e0', text: '#e65100', label: 'Missing from supervisor' },
  missing_worker:     { bg: '#f3f3f3', text: '#666', label: 'Missing from worker' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.submitted
  return (
    <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function VerifyBadge({ status }) {
  const s = VERIFY_STYLE[status] || { bg: '#f3f3f3', text: '#666', label: status }
  return (
    <span style={{ background: s.bg, color: s.text, padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

export default function PayrollPage() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('submissions')

  // Submissions tab
  const [submissions, setSubmissions] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [expandedSub, setExpandedSub] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState(null)

  // Daily logs tab
  const [logsDate, setLogsDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Verify tab
  const [allWorkers, setAllWorkers] = useState([])
  const [workerSearch, setWorkerSearch] = useState('')
  const [showWorkerList, setShowWorkerList] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [verifyMonth, setVerifyMonth] = useState(new Date().getMonth() + 1)
  const [verifyYear, setVerifyYear] = useState(new Date().getFullYear())
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    api.get('/api/auth/me').then(res => {
      const w = res.data.worker
      if (!['payroll', 'admin'].includes(w?.role)) { router.push('/dashboard'); return }
      setMe(w)
      loadSubmissions()
      loadAllWorkers()
    }).catch(() => router.push('/login'))
  }, [])

  useEffect(() => {
    if (tab === 'logs') loadLogs()
  }, [tab, logsDate])

  async function loadSubmissions() {
    setSubsLoading(true)
    try {
      const res = await api.get('/api/payroll/submissions')
      setSubmissions(res.data.submissions)
    } catch (err) {
      console.error('Failed to load submissions')
    } finally {
      setSubsLoading(false)
    }
  }

  async function loadAllWorkers() {
    try {
      const res = await api.get('/api/payroll/workers')
      setAllWorkers(res.data.workers)
    } catch (err) {
      console.error('Failed to load workers')
    }
  }

  async function loadLogs() {
    setLogsLoading(true)
    try {
      const res = await api.get('/api/payroll/worklogs/' + logsDate)
      setLogs(res.data.logs)
    } catch (err) {
      console.error('Failed to load logs')
    } finally {
      setLogsLoading(false)
    }
  }

  async function updateStatus(id, status) {
    setStatusUpdating(id + status)
    try {
      await api.post('/api/payroll/submissions/' + id + '/status', { status })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status')
    } finally {
      setStatusUpdating(null)
    }
  }

  async function runVerify() {
    if (!selectedWorker) { alert('Please select a worker'); return }
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api.get(`/api/payroll/verify/${selectedWorker.id}/${verifyMonth}/${verifyYear}`)
      setVerifyResult(res.data)
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  function exportVerifyPDF() {
    if (!verifyResult) return
    const { worker, matches, summary } = verifyResult
    const monthLabel = MONTHS[verifyMonth - 1] + ' ' + verifyYear
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(45, 106, 45)
    doc.text('Payroll Verification Report', 14, 16)
    doc.setTextColor(0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Worker: ${worker.full_name}  |  #${worker.work_number}  |  ${worker.house_group || '—'}  |  ${monthLabel}`, 14, 24)
    doc.text(`Status: ${summary.verification_status.replace(/_/g, ' ').toUpperCase()}  |  Days worked: ${summary.total_days_worked}  |  Match: ${summary.days_match}  |  Mismatch: ${summary.days_mismatch}  |  Missing: ${summary.days_missing}`, 14, 30)
    doc.text(`Total regular: ${summary.total_white_hours}  |  Total extra: ${summary.total_orange_hours}  |  Total: ${summary.total_hours}`, 14, 36)

    const rows = matches.map(m => [
      m.date,
      m.supervisor_recorded ? m.supervisor_recorded.start : '—',
      m.supervisor_recorded ? m.supervisor_recorded.finish : '—',
      m.supervisor_recorded ? (m.supervisor_recorded.break + ' min') : '—',
      m.supervisor_recorded ? (m.supervisor_recorded.total || '—') : '—',
      m.worker_submitted ? m.worker_submitted.start : '—',
      m.worker_submitted ? m.worker_submitted.finish : '—',
      m.worker_submitted ? (m.worker_submitted.break + ' min') : '—',
      m.worker_submitted ? (m.worker_submitted.total || '—') : '—',
      VERIFY_STYLE[m.status]?.label || m.status,
    ])

    autoTable(doc, {
      startY: 42,
      head: [['Date', 'Sup Start', 'Sup Finish', 'Sup Break', 'Sup Total', 'Worker Start', 'Worker Finish', 'Worker Break', 'Worker Total', 'Status']],
      body: rows,
      styles: { fontSize: 8, lineWidth: 0.2 },
      headStyles: { fillColor: [45, 106, 45], textColor: 255, fontStyle: 'bold' },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const status = matches[data.row.index]?.status
          if (status === 'match') data.cell.styles.fillColor = [232, 245, 233]
          else if (status === 'mismatch') data.cell.styles.fillColor = [253, 236, 234]
          else if (status === 'missing_supervisor') data.cell.styles.fillColor = [255, 243, 224]
          else if (status === 'missing_worker') data.cell.styles.fillColor = [245, 245, 245]
        }
      }
    })

    doc.save(`verification-${worker.work_number}-${monthLabel}.pdf`)
  }

  const filteredWorkers = allWorkers.filter(w =>
    !workerSearch ||
    w.full_name.toLowerCase().includes(workerSearch.toLowerCase()) ||
    w.work_number.includes(workerSearch)
  ).slice(0, 20)

  function selectWorker(w) {
    setSelectedWorker(w)
    setWorkerSearch(w.full_name + ' #' + w.work_number)
    setShowWorkerList(false)
    setVerifyResult(null)
  }

  const navBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '8px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
        border: 'none', borderRadius: '6px',
        background: tab === id ? '#2d6a2d' : '#fff',
        color: tab === id ? '#fff' : '#555',
        borderBottom: tab === id ? 'none' : '2px solid transparent',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </button>
  )

  const th = (extra) => ({ padding: '8px 10px', textAlign: 'left', background: '#2d6a2d', color: '#fff', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', ...extra })
  const td = (extra) => ({ padding: '7px 10px', fontSize: '12px', borderBottom: '1px solid #f0f0f0', ...extra })

  return (
    <>
      <Head><title>Payroll — Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>

        {/* Nav */}
        <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '40px' }} />
            <span style={{ fontWeight: '800', fontSize: '15px', color: '#2d6a2d', letterSpacing: '-0.3px' }}>PAYROLL</span>
            <span style={{ background: '#2d6a2d', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>PAYROLL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {me && <span style={{ fontSize: '13px', color: '#666' }}>{me.full_name}</span>}
            {me?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #2d6a2d', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#2d6a2d', fontWeight: '600' }}>Admin</button>
            )}
            <button onClick={() => { clearAuth(); router.push('/login') }} style={{ padding: '6px 14px', background: '#2d6a2d', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff', fontWeight: '600' }}>Sign out</button>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#fff', borderRadius: '8px', padding: '6px', border: '1px solid #e8e8e3', width: 'fit-content' }}>
            {navBtn('submissions', 'Submissions')}
            {navBtn('logs', 'Daily Logs')}
            {navBtn('verify', 'Verify')}
          </div>

          {/* ── SUBMISSIONS TAB ── */}
          {tab === 'submissions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Worker Submissions</h2>
                <button onClick={loadSubmissions} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Refresh</button>
              </div>

              {subsLoading && <p style={{ color: '#888', fontSize: '14px' }}>Loading submissions…</p>}

              {!subsLoading && submissions.length === 0 && (
                <div style={{ background: '#fff', borderRadius: '10px', padding: '40px', textAlign: 'center', border: '1px solid #e8e8e3' }}>
                  <p style={{ color: '#888', fontSize: '14px' }}>No submissions yet</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {submissions.map(sub => {
                  const isExpanded = expandedSub === sub.id
                  const monthLabel = MONTHS[sub.month - 1] + ' ' + sub.year
                  const paperLabels = { white: 'White', orange: 'Orange', weekly: 'Weekly', green: 'Green' }
                  return (
                    <div key={sub.id} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', overflow: 'hidden' }}>
                      <div
                        onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '14px' }}>{sub.full_name}</span>
                          <span style={{ fontSize: '12px', background: '#f5f5f5', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>#{sub.work_number}</span>
                          {sub.house_group && <span style={{ fontSize: '12px', color: '#666' }}>{sub.house_group}</span>}
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#2d6a2d' }}>{monthLabel}</span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{(sub.papers_included || []).map(p => paperLabels[p] || p).join(', ')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#999' }}>{new Date(sub.submitted_at).toLocaleDateString('en-GB')}</span>
                          <StatusBadge status={sub.status} />
                          <span style={{ color: '#ccc', fontSize: '16px' }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '16px 18px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                          {sub.notes && (
                            <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px', fontStyle: 'italic' }}>
                              Notes: {sub.notes}
                            </p>
                          )}

                          {/* White paper summary */}
                          {sub.white_paper_data && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>White Paper — Regular Hours</p>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                                  <thead>
                                    <tr style={{ background: '#e0e0e0' }}>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Date</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Start</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Finish</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Break</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>White hrs</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Orange hrs</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Total</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Work</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(typeof sub.white_paper_data === 'string' ? JSON.parse(sub.white_paper_data) : sub.white_paper_data).map((e, i) => (
                                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={{ padding: '4px 8px' }}>{String(e.entry_date).split('T')[0]}</td>
                                        <td style={{ padding: '4px 8px' }}>{String(e.actual_start || '').slice(0,5)}</td>
                                        <td style={{ padding: '4px 8px' }}>{String(e.actual_finish || '').slice(0,5)}</td>
                                        <td style={{ padding: '4px 8px' }}>{e.break_mins} min</td>
                                        <td style={{ padding: '4px 8px', fontWeight: '700', color: '#2d6a2d' }}>{e.white_hours}</td>
                                        <td style={{ padding: '4px 8px', fontWeight: '700', color: '#b45309' }}>{e.orange_hours}</td>
                                        <td style={{ padding: '4px 8px', fontWeight: '700' }}>{e.total_hours}</td>
                                        <td style={{ padding: '4px 8px', color: '#666' }}>{e.what_work}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Green paper summary */}
                          {sub.green_paper_data && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2d6a2d' }}>Green Paper — Berry Picking</p>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '11px', width: '100%' }}>
                                  <thead>
                                    <tr style={{ background: '#e8f5e9' }}>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Date</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Start</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>Finish</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>What picked</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left' }}>kg</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(typeof sub.green_paper_data === 'string' ? JSON.parse(sub.green_paper_data) : sub.green_paper_data).map((e, i) => (
                                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fff9' }}>
                                        <td style={{ padding: '4px 8px' }}>{String(e.entry_date).split('T')[0]}</td>
                                        <td style={{ padding: '4px 8px' }}>{String(e.start_time || '').slice(0,5)}</td>
                                        <td style={{ padding: '4px 8px' }}>{String(e.finish_time || '').slice(0,5)}</td>
                                        <td style={{ padding: '4px 8px' }}>{e.what_picked}</td>
                                        <td style={{ padding: '4px 8px', fontWeight: '700', color: '#2d6a2d' }}>{e.kg_picked}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            {['approved', 'rejected', 'needs_review'].map(s => {
                              const st = STATUS_STYLE[s]
                              const busy = statusUpdating === sub.id + s
                              return (
                                <button
                                  key={s}
                                  disabled={!!statusUpdating || sub.status === s}
                                  onClick={() => updateStatus(sub.id, s)}
                                  style={{
                                    padding: '6px 16px', fontSize: '12px', fontWeight: '700', cursor: sub.status === s ? 'default' : 'pointer',
                                    border: `1px solid ${st.border}`, borderRadius: '6px',
                                    background: sub.status === s ? st.bg : '#fff',
                                    color: sub.status === s ? st.text : '#555',
                                    opacity: !!statusUpdating && !busy ? 0.5 : 1
                                  }}
                                >
                                  {busy ? '…' : st.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DAILY LOGS TAB ── */}
          {tab === 'logs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Daily Supervisor Logs</h2>
                <input
                  type="date"
                  value={logsDate}
                  onChange={e => setLogsDate(e.target.value)}
                  style={{ padding: '7px 12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                />
                <button onClick={loadLogs} style={{ padding: '7px 14px', background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Load</button>
              </div>

              {logsLoading && <p style={{ color: '#888' }}>Loading logs…</p>}

              {!logsLoading && logs.length === 0 && (
                <div style={{ background: '#fff', borderRadius: '10px', padding: '40px', textAlign: 'center', border: '1px solid #e8e8e3' }}>
                  <p style={{ color: '#888', fontSize: '14px' }}>No supervisor logs for this date</p>
                </div>
              )}

              {!logsLoading && logs.length > 0 && (
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th style={th()}>Work#</th>
                          <th style={th()}>Name</th>
                          <th style={th()}>Group</th>
                          <th style={th()}>Start</th>
                          <th style={th()}>Finish</th>
                          <th style={th()}>Break</th>
                          <th style={th()}>Total hrs</th>
                          <th style={th()}>Work done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={td({ fontWeight: '700' })}>{r.worker_number}</td>
                            <td style={td()}>{r.worker_name || '—'}</td>
                            <td style={td({ color: '#666', fontSize: '11px' })}>{r.house_group || '—'}</td>
                            <td style={td()}>{String(r.start_time || '').slice(0,5)}</td>
                            <td style={td()}>{String(r.finish_time || '').slice(0,5)}</td>
                            <td style={td()}>{r.total_break_mins || r.session_break || 0} min</td>
                            <td style={td({ fontWeight: '700', color: '#2d6a2d' })}>{r.total_hours}</td>
                            <td style={td({ color: '#555' })}>{r.what_work}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '10px 16px', background: '#f9f9f9', borderTop: '1px solid #f0f0f0', fontSize: '12px', color: '#666' }}>
                    {logs.length} workers recorded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VERIFY TAB ── */}
          {tab === 'verify' && (
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Smart Verification</h2>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Compare a worker's submitted paper entries against the supervisor's recorded daily worklogs.
              </p>

              <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

                  {/* Worker search */}
                  <div style={{ flex: 2, minWidth: '220px', position: 'relative' }} ref={searchRef}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>Worker (name or work number)</label>
                    <input
                      type="text"
                      placeholder="Search by name or work number…"
                      value={workerSearch}
                      onChange={e => { setWorkerSearch(e.target.value); setShowWorkerList(true); setSelectedWorker(null); setVerifyResult(null) }}
                      onFocus={() => setShowWorkerList(true)}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    {showWorkerList && filteredWorkers.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, maxHeight: '240px', overflowY: 'auto', marginTop: '2px' }}>
                        {filteredWorkers.map(w => (
                          <div
                            key={w.id}
                            onClick={() => selectWorker(w)}
                            style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '8px', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <span style={{ fontWeight: '700', color: '#2d6a2d', minWidth: '40px' }}>#{w.work_number}</span>
                            <span>{w.full_name}</span>
                            {w.house_group && <span style={{ fontSize: '11px', color: '#888' }}>{w.house_group}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Month */}
                  <div style={{ minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>Month</label>
                    <select
                      value={verifyMonth}
                      onChange={e => { setVerifyMonth(parseInt(e.target.value)); setVerifyResult(null) }}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
                    >
                      {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>

                  {/* Year */}
                  <div style={{ minWidth: '90px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>Year</label>
                    <input
                      type="number"
                      value={verifyYear}
                      onChange={e => { setVerifyYear(parseInt(e.target.value)); setVerifyResult(null) }}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #ccc', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit' }}
                    />
                  </div>

                  <button
                    onClick={runVerify}
                    disabled={verifying || !selectedWorker}
                    style={{ padding: '10px 24px', background: verifying || !selectedWorker ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: verifying || !selectedWorker ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {verifying ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </div>

              {verifyResult && (
                <div>
                  {/* Summary bar */}
                  <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', padding: '16px 20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 4px' }}>{verifyResult.worker.full_name} <span style={{ color: '#888', fontSize: '13px', fontWeight: '400' }}>#{verifyResult.worker.work_number}</span></p>
                        <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{verifyResult.worker.house_group} — {MONTHS[verifyMonth - 1]} {verifyYear}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800' }}>{verifyResult.summary.total_days_worked}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Days worked</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#2d6a2d' }}>{verifyResult.summary.days_match}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Match</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#c0392b' }}>{verifyResult.summary.days_mismatch}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Mismatch</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#e65100' }}>{verifyResult.summary.days_missing}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Missing</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1565c0' }}>{verifyResult.summary.total_hours}</div>
                          <div style={{ fontSize: '11px', color: '#888' }}>Total hrs</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{
                          padding: '6px 16px', borderRadius: '20px', fontWeight: '800', fontSize: '13px',
                          background: verifyResult.summary.verification_status === 'verified' ? '#e8f5e9' : verifyResult.summary.verification_status === 'discrepancies_found' ? '#fdecea' : '#fff3e0',
                          color: verifyResult.summary.verification_status === 'verified' ? '#2d6a2d' : verifyResult.summary.verification_status === 'discrepancies_found' ? '#c0392b' : '#e65100',
                        }}>
                          {verifyResult.summary.verification_status === 'verified' ? '✓ Verified' : verifyResult.summary.verification_status === 'discrepancies_found' ? '✗ Discrepancies Found' : '⚠ Incomplete'}
                        </span>
                        <button onClick={exportVerifyPDF} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#555' }}>Regular: <b style={{ color: '#2d6a2d' }}>{verifyResult.summary.total_white_hours}</b></span>
                      <span style={{ fontSize: '12px', color: '#555' }}>Extra: <b style={{ color: '#b45309' }}>{verifyResult.summary.total_orange_hours}</b></span>
                      <span style={{ fontSize: '12px', color: '#555' }}>Total: <b>{verifyResult.summary.total_hours}</b></span>
                    </div>
                  </div>

                  {/* Comparison table */}
                  <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th style={th({ rowSpan: 2 })}>Date</th>
                            <th style={th({ background: '#1b5e20', textAlign: 'center' })} colSpan={4}>Supervisor Recorded</th>
                            <th style={th({ background: '#4a148c', textAlign: 'center' })} colSpan={4}>Worker Submitted</th>
                            <th style={th()}>Status</th>
                          </tr>
                          <tr>
                            <th style={th({ background: '#2e7d32' })}>Start</th>
                            <th style={th({ background: '#2e7d32' })}>Finish</th>
                            <th style={th({ background: '#2e7d32' })}>Break</th>
                            <th style={th({ background: '#2e7d32' })}>Total</th>
                            <th style={th({ background: '#6a1b9a' })}>Start</th>
                            <th style={th({ background: '#6a1b9a' })}>Finish</th>
                            <th style={th({ background: '#6a1b9a' })}>Break</th>
                            <th style={th({ background: '#6a1b9a' })}>Total</th>
                            <th style={th()}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verifyResult.matches.map((m, i) => {
                            const vs = VERIFY_STYLE[m.status]
                            return (
                              <tr key={i} style={{ background: vs?.bg || '#fff', borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '7px 10px', fontWeight: '700', fontSize: '12px' }}>{m.date}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.supervisor_recorded?.start || '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.supervisor_recorded?.finish || '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.supervisor_recorded ? (m.supervisor_recorded.break + ' min') : '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '700' }}>{m.supervisor_recorded?.total || '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.worker_submitted?.start || '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.worker_submitted?.finish || '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px' }}>{m.worker_submitted ? (m.worker_submitted.break + ' min') : '—'}</td>
                                <td style={{ padding: '7px 10px', fontSize: '12px', fontWeight: '700' }}>{m.worker_submitted?.total || '—'}</td>
                                <td style={{ padding: '7px 10px' }}><VerifyBadge status={m.status} /></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
