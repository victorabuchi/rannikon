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
  missing_worker:     { bg: '#f3f3f3', text: '#666',    label: 'Missing from worker' },
}

const HOUSE_GROUP_ORDER = ['Kivilinna/Salo','Karton Cambodia','Karton International','Vassila','Suppala','Salo/Turku']

function getDaysInMonth(m, y) { return new Date(y, m, 0).getDate() }
function toMins(t) { if (!t) return 0; const [h,m] = String(t).slice(0,5).split(':').map(Number); return h*60+m }
function minsToHHMM(m) { if (m <= 0) return '0:00'; return Math.floor(m/60)+':'+String(m%60).padStart(2,'0') }
function hasOrangeWork(e) { return !!(e?.orange_hours && e.orange_hours !== '0:00' && e.orange_hours !== '0:0') }
function parseJSON(v) { if (!v) return []; if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } } return v }

// Table cell style helpers — exact same as dashboard
const thW = (x) => ({ border:'1px solid #333', padding:'7px 8px', textAlign:'left', whiteSpace:'nowrap', background:'#e0e0e0', fontSize:'12px', fontWeight:'700', ...x })
const tdW = (x) => ({ border:'1px solid #333', padding:'6px 8px', fontSize:'12px', ...x })
const thO = (x) => ({ border:'1px solid #c97d00', padding:'7px 8px', textAlign:'left', whiteSpace:'nowrap', background:'#ffe0a0', fontSize:'12px', fontWeight:'700', ...x })
const tdO = (x) => ({ border:'1px solid #c97d00', padding:'6px 8px', fontSize:'12px', background:'#fffbf0', ...x })
const thB = (x) => ({ border:'1px solid #1565c0', padding:'7px 8px', textAlign:'center', background:'#bbdefb', fontSize:'12px', fontWeight:'700', ...x })
const tdB = (x) => ({ border:'1px solid #1565c0', padding:'6px 8px', fontSize:'12px', textAlign:'center', background:'#f0f7ff', ...x })
const thG = (x) => ({ border:'1px solid #2d6a2d', padding:'7px 8px', textAlign:'left', whiteSpace:'nowrap', background:'#e8f5e9', fontSize:'12px', fontWeight:'700', ...x })
const tdG = (x) => ({ border:'1px solid #2d6a2d', padding:'6px 8px', fontSize:'12px', ...x })

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.submitted
  return <span style={{ background:s.bg, color:s.text, border:`1px solid ${s.border}`, padding:'3px 10px', borderRadius:'10px', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' }}>{s.label}</span>
}

function VerifyBadge({ status }) {
  const s = VERIFY_STYLE[status] || { bg:'#f3f3f3', text:'#666', label:status }
  return <span style={{ background:s.bg, color:s.text, padding:'2px 8px', borderRadius:'8px', fontSize:'11px', fontWeight:'700', whiteSpace:'nowrap' }}>{s.label}</span>
}

// Full paper view — read-only copy of dashboard paper tables
function SubmissionPaperView({ sub, activeTab, onTabChange }) {
  const included = sub.papers_included || []
  const month = sub.month
  const year = sub.year
  const days = getDaysInMonth(month, year)
  const monthLabel = MONTHS[month - 1] + ' ' + year

  const rawEntries = parseJSON(sub.white_paper_data || sub.weekly_data)
  const entries = {}
  rawEntries.forEach(e => {
    const day = parseInt(String(e.entry_date).split('T')[0].split('-')[2])
    entries[day] = e
  })

  const rawGreen = parseJSON(sub.green_paper_data)
  const greenEntries = {}
  rawGreen.forEach(e => {
    const day = parseInt(String(e.entry_date).split('T')[0].split('-')[2])
    greenEntries[day] = e
  })

  const tabs = [
    { key: 'white',  label: 'White paper',     sub: 'Regular hrs' },
    { key: 'orange', label: 'Orange paper',     sub: 'Extra hrs' },
    { key: 'weekly', label: 'Weekly summary',   sub: 'Summary' },
    { key: 'green',  label: 'Green paper',      sub: 'Berry picking' },
  ].filter(t => included.includes(t.key))

  return (
    <div style={{ border:'1px solid #ccc', borderRadius:'8px', overflow:'hidden', background:'#fff' }}>
      {/* Tab bar */}
      <div style={{ background:'#f5f5f5', borderBottom:'1px solid #ccc', padding:'8px', display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => onTabChange(t.key)} style={{
            padding:'6px 10px', textAlign:'center', borderRadius:'6px', fontSize:'11px', fontWeight:'600',
            cursor:'pointer', border: activeTab === t.key ? 'none' : '1px solid #ddd',
            background: activeTab === t.key ? '#2d6a2d' : '#fff',
            color: activeTab === t.key ? '#fff' : '#333',
            whiteSpace:'nowrap'
          }}>
            {t.label}
            <div style={{ fontSize:'10px', color: activeTab === t.key ? '#cfffcf' : '#aaa', marginTop:'2px', fontWeight:'400' }}>{t.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ padding:'16px', overflowX:'auto' }}>

        {/* ── WHITE PAPER ── */}
        {activeTab === 'white' && (
          <div>
            <p style={{ fontWeight:'800', fontSize:'14px', marginBottom:'2px' }}>Work paid by hour</p>
            <p style={{ fontSize:'12px', fontWeight:'700', marginBottom:'2px' }}>Hours per day / week</p>
            <p style={{ fontSize:'11px', color:'#333', marginBottom:'10px' }}>Name: <b>{sub.full_name}</b> &nbsp;&nbsp; Work#: <b>{sub.work_number}</b> &nbsp;&nbsp; {monthLabel}</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', minWidth:'600px', width:'100%', fontSize:'12px' }}>
                <thead>
                  <tr>
                    <th style={thW()}>Date</th>
                    <th style={thW()}>Start</th>
                    <th style={thW()}>Finish</th>
                    <th style={thW()}>Eating break</th>
                    <th style={thW()}>Hours – breaks</th>
                    <th style={thW()}>What work</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:days},(_,i)=>i+1).map(day => {
                    const e = entries[day]
                    return (
                      <tr key={day} style={{ background: e ? '#fafafa' : '#fff' }}>
                        <td style={tdW()}><b>{day}</b></td>
                        <td style={tdW()}>{e ? String(e.white_start||'').slice(0,5) : ''}</td>
                        <td style={tdW()}>{e ? String(e.white_finish||'').slice(0,5) : ''}</td>
                        <td style={tdW({textAlign:'center'})}>30 min</td>
                        <td style={tdW({fontWeight:'700', color: e ? '#2d6a2d' : ''})}>{e ? (e.white_hours||'8:00') : ''}</td>
                        <td style={tdW()}>{e ? e.what_work : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORANGE PAPER ── */}
        {activeTab === 'orange' && (
          <div>
            <p style={{ fontWeight:'800', fontSize:'14px', marginBottom:'2px', color:'#b45309' }}>Extra work paid by hour</p>
            <p style={{ fontSize:'11px', color:'#333', marginBottom:'10px' }}>Name: <b>{sub.full_name}</b> &nbsp;&nbsp; Work#: <b>{sub.work_number}</b> &nbsp;&nbsp; {monthLabel}</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', minWidth:'600px', width:'100%', fontSize:'12px', background:'#fffbf0' }}>
                <thead>
                  <tr>
                    <th style={thO()}>Date</th>
                    <th style={thO()}>Start</th>
                    <th style={thO()}>Finish</th>
                    <th style={thO()}>Break</th>
                    <th style={thO()}>Hours – breaks</th>
                    <th style={thO()}>What work</th>
                    <th style={thO()}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:days},(_,i)=>i+1).map(day => {
                    const e = entries[day]
                    const hasO = hasOrangeWork(e)
                    return (
                      <tr key={day} style={{ background: hasO ? '#fff8e1' : '#fffbf0' }}>
                        <td style={tdO()}><b>{day}</b></td>
                        <td style={tdO()}>{hasO ? String(e.orange_start||'').slice(0,5) : ''}</td>
                        <td style={tdO()}>{hasO ? String(e.orange_finish||'').slice(0,5) : ''}</td>
                        <td style={tdO({textAlign:'center'})}>{hasO ? (e.orange_break||'0:00') : ''}</td>
                        <td style={tdO({fontWeight:'700', color: hasO ? '#b45309' : ''})}>{hasO ? e.orange_hours : ''}</td>
                        <td style={tdO()}>{hasO ? e.what_work : ''}</td>
                        <td style={tdO()}></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── WEEKLY SUMMARY ── */}
        {activeTab === 'weekly' && (
          <div>
            <p style={{ fontWeight:'800', fontSize:'14px', marginBottom:'2px' }}>WEEKLY SUMMARY</p>
            <p style={{ fontSize:'11px', color:'#333', marginBottom:'12px' }}>Name: <b>{sub.full_name}</b> &nbsp;&nbsp; Work#: <b>{sub.work_number}</b> &nbsp;&nbsp; {monthLabel}</p>
            {Array.from({length: Math.min(Math.ceil(days/7),4)}, (_,wi) => {
              const ws = wi*7+1
              const dayInfos = Array.from({length:7},(_,i) => {
                const d = ws+i
                const dow = d <= days ? new Date(year,month-1,d).getDay() : null
                const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                return { d, exists: d<=days, dow, name: dow!==null ? DAY_NAMES[dow] : '', isSun: dow===0, isSat: dow===6 }
              })
              const validDays = dayInfos.filter(x=>x.exists)
              const tw = validDays.reduce((s,x)=>{ if(!entries[x.d]||x.isSun) return s; return s+toMins(entries[x.d].white_hours) },0)
              const te = validDays.reduce((s,x)=>{ if(!entries[x.d]?.orange_hours||x.isSun) return s; return s+toMins(entries[x.d].orange_hours) },0)
              const tk = validDays.reduce((s,x)=>{ if(x.isSun) return s; return s+(greenEntries[x.d]?.kg_picked!=null ? Number(greenEntries[x.d].kg_picked)||0 : 0) },0)
              const thW2 = (x) => ({ border:'1px solid #333', padding:'5px 6px', textAlign:'center', background:'#e0e0e0', fontSize:'11px', fontWeight:'700', ...x })
              const tdW2 = (x) => ({ border:'1px solid #333', padding:'5px 6px', fontSize:'11px', textAlign:'center', ...x })
              const tdO2 = (x) => ({ border:'1px solid #c97d00', padding:'5px 6px', fontSize:'11px', textAlign:'center', background:'#fffbf0', ...x })
              const tdG2 = (x) => ({ border:'1px solid #2d6a2d', padding:'5px 6px', fontSize:'11px', textAlign:'center', background:'#f6fff6', ...x })
              return (
                <div key={wi} style={{ marginBottom:'20px' }}>
                  <p style={{ fontWeight:'800', fontSize:'12px', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Week {wi+1}</p>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'11px' }}>
                      <thead>
                        <tr>
                          <th style={thW2({textAlign:'left', minWidth:'130px', background:'#d0d0d0'})}></th>
                          {dayInfos.map(({d,name,isSun,isSat}) => (
                            <th key={d} style={thW2({minWidth:'44px', background: isSun?'#e8e8e8':'#e0e0e0', color: isSun?'#999':'#1a1a18'})}>
                              {name||''}<br/>
                              {d<=days && !isSun && <span style={{fontSize:'9px',fontWeight:'400',color:'#666'}}>{isSat?'max 11h':'max 3h'}</span>}
                            </th>
                          ))}
                          <th style={thW2({minWidth:'60px',background:'#d0d0d0'})}>total<br/><span style={{fontSize:'9px',fontWeight:'400'}}>hours</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={tdG2({textAlign:'left',fontWeight:'700',color:'#2d6a2d',background:'#e8f5e9'})}>
                            <span style={{display:'inline-block',width:'9px',height:'9px',background:'#2d6a2d',borderRadius:'2px',marginRight:'5px',verticalAlign:'middle'}}/>
                            Berry picking (kg)
                          </td>
                          {dayInfos.map(({d,isSun})=>(
                            <td key={d} style={tdG2({color:isSun?'#bbb':'#2d6a2d',background:'#e8f5e9',fontWeight:'700'})}>
                              {isSun?'X':(greenEntries[d]?.kg_picked!=null?greenEntries[d].kg_picked:'')}
                            </td>
                          ))}
                          <td style={tdG2({fontWeight:'700',color:'#2d6a2d',background:'#e8f5e9'})}>
                            {tk>0?Math.round(tk*100)/100:''}<div style={{fontSize:'9px',color:'#888',fontWeight:'400'}}>kg</div>
                          </td>
                        </tr>
                        <tr>
                          <td style={tdW2({textAlign:'left',fontWeight:'700',background:'#fafafa'})}>
                            <span style={{display:'inline-block',width:'9px',height:'9px',background:'#ccc',border:'1px solid #999',borderRadius:'2px',marginRight:'5px',verticalAlign:'middle'}}/>
                            Reg hrs<div style={{fontSize:'9px',color:'#888',fontWeight:'400'}}>max 8h</div>
                          </td>
                          {dayInfos.map(({d,isSun})=>(
                            <td key={d} style={tdW2({fontWeight:entries[d]?'700':'400',background:'#fafafa',color:isSun?'#bbb':(entries[d]?'#1a1a18':'#ccc')})}>
                              {isSun?'X':(entries[d]?(entries[d].white_hours||'8:00'):'')}
                            </td>
                          ))}
                          <td style={tdW2({fontWeight:'700',background:'#fafafa'})}>
                            {minsToHHMM(tw)}<div style={{fontSize:'9px',color:'#888',fontWeight:'400'}}>max 40h</div>
                          </td>
                        </tr>
                        <tr>
                          <td style={tdO2({textAlign:'left',fontWeight:'700',color:'#b45309',background:'#fff3e0'})}>
                            <span style={{display:'inline-block',width:'9px',height:'9px',background:'#f59e0b',borderRadius:'2px',marginRight:'5px',verticalAlign:'middle'}}/>
                            Extra hrs / lisatyö
                          </td>
                          {dayInfos.map(({d,isSun})=>(
                            <td key={d} style={tdO2({fontWeight:entries[d]?'700':'400',background:'#fff3e0',color:isSun?'#bbb':(entries[d]?'#b45309':'#ccc')})}>
                              {isSun?'X':(entries[d]?entries[d].orange_hours:'')}
                            </td>
                          ))}
                          <td style={tdO2({fontWeight:'700',color:'#b45309',background:'#fff3e0'})}>
                            {minsToHHMM(te)}<div style={{fontSize:'9px',color:'#888',fontWeight:'400'}}>max 17h</div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={9} style={{border:'1px solid #333',padding:'6px 10px',fontSize:'11px',background:'#fff'}}>
                            I want to do extra hours &nbsp;☐&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature: _______________________
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── GREEN PAPER ── */}
        {activeTab === 'green' && (
          <div>
            <p style={{ fontWeight:'800', fontSize:'14px', marginBottom:'2px', color:'#2d6a2d' }}>Green paper — Berry picking</p>
            <p style={{ fontSize:'11px', color:'#333', marginBottom:'10px' }}>Name: <b>{sub.full_name}</b> &nbsp;&nbsp; Work#: <b>{sub.work_number}</b> &nbsp;&nbsp; {monthLabel}</p>
            <div style={{ overflowX:'auto' }}>
              <table style={{ borderCollapse:'collapse', minWidth:'640px', width:'100%', fontSize:'12px' }}>
                <thead>
                  <tr>
                    <th style={thG()}>Date</th>
                    <th style={thG()}>Start</th>
                    <th style={thG()}>Finish</th>
                    <th style={thG()}>Eating break</th>
                    <th style={thG()}>Extra breaks</th>
                    <th style={thG()}>Hours – breaks</th>
                    <th style={thG()}>What picked</th>
                    <th style={thG()}>kg picked</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length:days},(_,i)=>i+1).map(day => {
                    const ge = greenEntries[day]
                    return (
                      <tr key={day} style={{ background: ge ? '#f6fff6' : '#fff' }}>
                        <td style={tdG()}><b>{day}</b></td>
                        <td style={tdG()}>{ge ? String(ge.start_time||'').slice(0,5) : ''}</td>
                        <td style={tdG()}>{ge ? String(ge.finish_time||'').slice(0,5) : ''}</td>
                        <td style={tdG({textAlign:'center',color:'#888'})}>1 hour</td>
                        <td style={tdG({textAlign:'center'})}></td>
                        <td style={tdG()}></td>
                        <td style={tdG()}>{ge?.what_picked}</td>
                        <td style={tdG({fontWeight:'700', color: ge?.kg_picked ? '#2d6a2d' : ''})}>{ge?.kg_picked!=null ? ge.kg_picked : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
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
  const [expandedSubTabs, setExpandedSubTabs] = useState({}) // subId → active paper tab
  const [statusUpdating, setStatusUpdating] = useState(null)

  // Daily logs tab
  const [logsDate, setLogsDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Delete confirmation modal
  const [confirmDeleteSub, setConfirmDeleteSub] = useState(null) // { id, name, monthLabel }

  // Submissions tab — expanded months
  const [expandedMonths, setExpandedMonths] = useState(new Set())

  // Verify tab — manual
  const [allWorkers, setAllWorkers] = useState([])
  const [workerSearch, setWorkerSearch] = useState('')
  const [showWorkerList, setShowWorkerList] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [verifyMonth, setVerifyMonth] = useState(new Date().getMonth() + 1)
  const [verifyYear, setVerifyYear] = useState(new Date().getFullYear())
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const searchRef = useRef(null)

  // Verify tab — monthly board
  const [boardMonth, setBoardMonth] = useState(new Date().getMonth() + 1)
  const [boardYear, setBoardYear] = useState(new Date().getFullYear())
  const [boardData, setBoardData] = useState([])
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardExpandedId, setBoardExpandedId] = useState(null)
  const [boardDetail, setBoardDetail] = useState({})
  const [boardDetailLoading, setBoardDetailLoading] = useState(null)

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

  async function doDeleteSub() {
    const { id } = confirmDeleteSub
    setConfirmDeleteSub(null)
    try {
      await api.delete('/api/payroll/submissions/' + id)
      setSubmissions(prev => prev.filter(s => s.id !== id))
      if (expandedSub === id) setExpandedSub(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete submission')
    }
  }

  async function loadMonthBoard() {
    setBoardLoading(true)
    setBoardData([])
    setBoardExpandedId(null)
    setBoardDetail({})
    try {
      const res = await api.get(`/api/payroll/month-summary/${boardMonth}/${boardYear}`)
      setBoardData(res.data.summaries)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load monthly summary')
    } finally {
      setBoardLoading(false)
    }
  }

  async function loadBoardDetail(workerId) {
    if (boardExpandedId === workerId) { setBoardExpandedId(null); return }
    setBoardDetailLoading(workerId)
    try {
      const res = await api.get(`/api/payroll/verify/${workerId}/${boardMonth}/${boardYear}`)
      setBoardDetail(prev => ({ ...prev, [workerId]: res.data }))
      setBoardExpandedId(workerId)
    } catch (err) {
      alert(err.response?.data?.error || 'Verification failed')
    } finally {
      setBoardDetailLoading(null)
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
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(45,106,45)
    doc.text('Payroll Verification Report', 14, 16)
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(`Worker: ${worker.full_name}  |  #${worker.work_number}  |  ${worker.house_group||'—'}  |  ${monthLabel}`, 14, 24)
    doc.text(`Status: ${summary.verification_status.replace(/_/g,' ').toUpperCase()}  |  Days: ${summary.total_days_worked}  |  Match: ${summary.days_match}  |  Mismatch: ${summary.days_mismatch}  |  Missing: ${summary.days_missing}`, 14, 30)
    doc.text(`Regular: ${summary.total_white_hours}  |  Extra: ${summary.total_orange_hours}  |  Total: ${summary.total_hours}`, 14, 36)
    autoTable(doc, {
      startY: 42,
      head: [['Date','Sup Start','Sup Finish','Sup Break','Sup Total','Worker Start','Worker Finish','Worker Break','Worker Total','Status']],
      body: matches.map(m => [
        m.date,
        m.supervisor_recorded?.start||'—', m.supervisor_recorded?.finish||'—',
        m.supervisor_recorded ? m.supervisor_recorded.break+' min' : '—',
        m.supervisor_recorded?.total||'—',
        m.worker_submitted?.start||'—', m.worker_submitted?.finish||'—',
        m.worker_submitted ? m.worker_submitted.break+' min' : '—',
        m.worker_submitted?.total||'—',
        VERIFY_STYLE[m.status]?.label||m.status,
      ]),
      styles:{ fontSize:8, lineWidth:0.2 },
      headStyles:{ fillColor:[45,106,45], textColor:255, fontStyle:'bold' },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const s = matches[data.row.index]?.status
          if (s==='match') data.cell.styles.fillColor=[232,245,233]
          else if (s==='mismatch') data.cell.styles.fillColor=[253,236,234]
          else if (s==='missing_supervisor') data.cell.styles.fillColor=[255,243,224]
          else if (s==='missing_worker') data.cell.styles.fillColor=[245,245,245]
        }
      }
    })
    doc.save(`verification-${worker.work_number}-${monthLabel}.pdf`)
  }

  // Group submissions by month/year (newest first), then by house group (sorted), then by work number
  const byMonthMap = {}
  submissions.forEach(sub => {
    const key = `${sub.year}-${String(sub.month).padStart(2,'0')}`
    if (!byMonthMap[key]) byMonthMap[key] = { month: sub.month, year: sub.year, byGroup: {} }
    const g = sub.house_group || 'Unknown'
    if (!byMonthMap[key].byGroup[g]) byMonthMap[key].byGroup[g] = []
    byMonthMap[key].byGroup[g].push(sub)
  })
  // Sort each house group by work number
  Object.values(byMonthMap).forEach(mv => {
    Object.values(mv.byGroup).forEach(arr => {
      arr.sort((a, b) => (parseInt(a.work_number)||9999) - (parseInt(b.work_number)||9999))
    })
  })
  const monthKeys = Object.keys(byMonthMap).sort().reverse()
  function toggleMonth(key) {
    setExpandedMonths(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
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

  function toggleSub(id, papers) {
    if (expandedSub === id) { setExpandedSub(null); return }
    setExpandedSub(id)
    if (!expandedSubTabs[id]) {
      const firstPaper = (papers || ['white'])[0]
      setExpandedSubTabs(prev => ({ ...prev, [id]: firstPaper }))
    }
  }

  const navBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding:'8px 20px', fontSize:'13px', fontWeight:'700', cursor:'pointer', border:'none', borderRadius:'6px',
      background: tab===id ? '#2d6a2d' : '#fff', color: tab===id ? '#fff' : '#555', whiteSpace:'nowrap'
    }}>{label}</button>
  )

  const thTd = (extra) => ({ padding:'8px 10px', textAlign:'left', background:'#2d6a2d', color:'#fff', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap', ...extra })
  const bodyTd = (extra) => ({ padding:'7px 10px', fontSize:'12px', borderBottom:'1px solid #f0f0f0', ...extra })

  return (
    <>
      <Head><title>Payroll — Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background:'#f5f5f5', minHeight:'100vh' }}>

        {/* Nav */}
        <div style={{ background:'#fff', borderBottom:'1px solid #ddd', padding:'6px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height:'40px' }} />
            <span style={{ fontWeight:'800', fontSize:'15px', color:'#2d6a2d' }}>PAYROLL</span>
            <span style={{ background:'#2d6a2d', color:'#fff', fontSize:'10px', fontWeight:'800', padding:'2px 8px', borderRadius:'10px', letterSpacing:'0.5px' }}>PAYROLL</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            {me && <span style={{ fontSize:'13px', color:'#666' }}>{me.full_name}</span>}
            {me?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} style={{ padding:'6px 14px', background:'#fff', border:'1px solid #2d6a2d', borderRadius:'6px', fontSize:'13px', cursor:'pointer', color:'#2d6a2d', fontWeight:'600' }}>Admin</button>
            )}
            <button onClick={() => { clearAuth(); router.push('/login') }} style={{ padding:'6px 14px', background:'#2d6a2d', border:'none', borderRadius:'6px', fontSize:'13px', cursor:'pointer', color:'#fff', fontWeight:'600' }}>Sign out</button>
          </div>
        </div>

        <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'16px' }}>

          {/* Main tabs */}
          <div style={{ display:'flex', gap:'4px', marginBottom:'20px', background:'#fff', borderRadius:'8px', padding:'6px', border:'1px solid #e8e8e3', width:'fit-content' }}>
            {navBtn('submissions', 'Submissions')}
            {navBtn('logs', 'Daily Logs')}
            {navBtn('verify', 'Verify')}
          </div>

          {/* ── SUBMISSIONS TAB ── */}
          {tab === 'submissions' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <h2 style={{ fontSize:'18px', fontWeight:'800', margin:0 }}>Worker Submissions</h2>
                <button onClick={loadSubmissions} style={{ padding:'6px 14px', background:'#fff', border:'1px solid #ccc', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Refresh</button>
              </div>

              {subsLoading && <p style={{ color:'#888', fontSize:'14px' }}>Loading submissions…</p>}

              {!subsLoading && submissions.length === 0 && (
                <div style={{ background:'#fff', borderRadius:'10px', padding:'40px', textAlign:'center', border:'1px solid #e8e8e3' }}>
                  <p style={{ color:'#888', fontSize:'14px' }}>No submissions yet</p>
                </div>
              )}

              {/* Grouped by month, then by house group */}
              {monthKeys.map(mKey => {
                const mv = byMonthMap[mKey]
                const mLabel = MONTHS[mv.month - 1] + ' ' + mv.year
                const totalSubs = Object.values(mv.byGroup).reduce((s,a)=>s+a.length,0)
                const isMonthOpen = expandedMonths.has(mKey)
                const sortedGroups = Object.keys(mv.byGroup).sort((a,b) => {
                  const ai = HOUSE_GROUP_ORDER.indexOf(a), bi = HOUSE_GROUP_ORDER.indexOf(b)
                  return (ai===-1?99:ai) - (bi===-1?99:bi)
                })
                return (
                  <div key={mKey} style={{ marginBottom:'16px', border:'1px solid #dde8dd', borderRadius:'12px', overflow:'hidden' }}>
                    {/* Month header — click to expand/collapse */}
                    <div onClick={() => toggleMonth(mKey)}
                      style={{ padding:'14px 20px', background: isMonthOpen ? '#2d6a2d' : '#f0f7f0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', userSelect:'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <span style={{ fontSize:'17px', fontWeight:'800', color: isMonthOpen ? '#fff' : '#2d6a2d' }}>{mLabel}</span>
                        <span style={{ fontSize:'12px', fontWeight:'700', background: isMonthOpen ? 'rgba(255,255,255,0.25)' : '#d4edda', color: isMonthOpen ? '#fff' : '#2d6a2d', padding:'2px 10px', borderRadius:'10px' }}>
                          {totalSubs} submission{totalSubs!==1?'s':''}
                        </span>
                        <span style={{ fontSize:'11px', color: isMonthOpen ? '#cfffcf' : '#888' }}>{sortedGroups.length} house group{sortedGroups.length!==1?'s':''}</span>
                      </div>
                      <span style={{ color: isMonthOpen ? '#fff' : '#2d6a2d', fontSize:'18px', fontWeight:'700' }}>{isMonthOpen ? '▲' : '▼'}</span>
                    </div>

                    {isMonthOpen && (
                      <div style={{ padding:'16px', background:'#fafefe' }}>
                        {sortedGroups.map(group => {
                          const subs = mv.byGroup[group]
                          return (
                            <div key={group} style={{ marginBottom:'20px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                                <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.15 }} />
                                <span style={{ fontSize:'11px', fontWeight:'800', color:'#2d6a2d', textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>{group}</span>
                                <span style={{ fontSize:'11px', color:'#888', background:'#f0f7f0', padding:'2px 8px', borderRadius:'10px' }}>{subs.length}</span>
                                <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.15 }} />
                              </div>

                              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                                {subs.map(sub => {
                                  const isExpanded = expandedSub === sub.id
                                  const activeSubTab = expandedSubTabs[sub.id] || (sub.papers_included||['white'])[0]
                                  const paperLabels = { white:'White', orange:'Orange', weekly:'Weekly', green:'Green' }
                                  return (
                                    <div key={sub.id} style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', overflow:'hidden', boxShadow: isExpanded ? '0 2px 12px rgba(45,106,45,0.10)' : 'none' }}>
                                      {/* Card header */}
                                      <div style={{ padding:'12px 16px', display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', justifyContent:'space-between' }}>
                                        <div onClick={() => toggleSub(sub.id, sub.papers_included)}
                                          style={{ display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center', cursor:'pointer', flex:1, userSelect:'none' }}>
                                          <span style={{ fontWeight:'800', fontSize:'14px' }}>{sub.full_name}</span>
                                          <span style={{ fontSize:'12px', background:'#f0f7f0', border:'1px solid #c8e6c9', padding:'2px 8px', borderRadius:'6px', fontWeight:'700', color:'#2d6a2d' }}>#{sub.work_number}</span>
                                          <span style={{ fontSize:'11px', color:'#888' }}>{(sub.papers_included||[]).map(p=>paperLabels[p]||p).join(', ')}</span>
                                        </div>
                                        <div style={{ display:'flex', gap:'8px', alignItems:'center', flexShrink:0 }}>
                                          <span style={{ fontSize:'11px', color:'#999' }}>{new Date(sub.submitted_at).toLocaleDateString('en-GB')}</span>
                                          <StatusBadge status={sub.status} />
                                          <button
                                            onClick={e => { e.stopPropagation(); setConfirmDeleteSub({ id: sub.id, name: sub.full_name, monthLabel: mLabel }) }}
                                            style={{ padding:'4px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:'1px solid #f5c6c6', borderRadius:'6px', background:'#fff5f5', color:'#c0392b', whiteSpace:'nowrap' }}>
                                            Delete
                                          </button>
                                          <span onClick={() => toggleSub(sub.id, sub.papers_included)}
                                            style={{ color:'#aaa', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>{isExpanded ? '▲' : '▼'}</span>
                                        </div>
                                      </div>

                                      {isExpanded && (
                                        <div style={{ padding:'0 16px 16px', borderTop:'1px solid #f0f0f0', background:'#fafafa' }}>
                                          {sub.notes && (
                                            <p style={{ fontSize:'13px', color:'#555', margin:'12px 0', fontStyle:'italic', padding:'8px 12px', background:'#fff', borderRadius:'6px', border:'1px solid #eee' }}>
                                              Notes: {sub.notes}
                                            </p>
                                          )}
                                          <div style={{ marginTop:'12px' }}>
                                            <SubmissionPaperView
                                              sub={sub}
                                              activeTab={activeSubTab}
                                              onTabChange={t => setExpandedSubTabs(prev => ({ ...prev, [sub.id]: t }))}
                                            />
                                          </div>
                                          {/* Status buttons */}
                                          <div style={{ display:'flex', gap:'8px', marginTop:'16px', flexWrap:'wrap' }}>
                                            {['approved','rejected','needs_review'].map(s => {
                                              const st = STATUS_STYLE[s]
                                              const busy = statusUpdating === sub.id + s
                                              return (
                                                <button key={s} disabled={!!statusUpdating || sub.status===s} onClick={() => updateStatus(sub.id, s)}
                                                  style={{
                                                    padding:'7px 18px', fontSize:'12px', fontWeight:'700',
                                                    cursor: sub.status===s ? 'default' : 'pointer',
                                                    border:`1px solid ${st.border}`, borderRadius:'6px',
                                                    background: sub.status===s ? st.bg : '#fff',
                                                    color: sub.status===s ? st.text : '#555',
                                                    opacity: !!statusUpdating && !busy ? 0.5 : 1
                                                  }}>
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
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── DAILY LOGS TAB ── */}
          {tab === 'logs' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
                <h2 style={{ fontSize:'18px', fontWeight:'800', margin:0 }}>Daily Supervisor Logs</h2>
                <input type="date" value={logsDate} onChange={e => setLogsDate(e.target.value)}
                  style={{ padding:'7px 12px', border:'1px solid #ccc', borderRadius:'6px', fontSize:'14px', fontFamily:'inherit' }} />
                <button onClick={loadLogs} style={{ padding:'7px 14px', background:'#2d6a2d', color:'#fff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>Load</button>
              </div>

              {logsLoading && <p style={{ color:'#888' }}>Loading logs…</p>}
              {!logsLoading && logs.length === 0 && (
                <div style={{ background:'#fff', borderRadius:'10px', padding:'40px', textAlign:'center', border:'1px solid #e8e8e3' }}>
                  <p style={{ color:'#888', fontSize:'14px' }}>No supervisor logs for this date</p>
                </div>
              )}
              {!logsLoading && logs.length > 0 && (
                <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', overflow:'hidden' }}>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'13px' }}>
                      <thead>
                        <tr>
                          <th style={thTd()}>Work#</th>
                          <th style={thTd()}>Name</th>
                          <th style={thTd()}>Group</th>
                          <th style={thTd()}>Start</th>
                          <th style={thTd()}>Finish</th>
                          <th style={thTd()}>Break</th>
                          <th style={thTd()}>Total hrs</th>
                          <th style={thTd()}>Work done</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((r,i) => (
                          <tr key={i} style={{ background: i%2===0 ? '#fff' : '#fafafa' }}>
                            <td style={bodyTd({fontWeight:'700'})}>{r.worker_number}</td>
                            <td style={bodyTd()}>{r.worker_name||'—'}</td>
                            <td style={bodyTd({color:'#666',fontSize:'11px'})}>{r.house_group||'—'}</td>
                            <td style={bodyTd()}>{String(r.start_time||'').slice(0,5)}</td>
                            <td style={bodyTd()}>{String(r.finish_time||'').slice(0,5)}</td>
                            <td style={bodyTd()}>{r.total_break_mins||r.session_break||0} min</td>
                            <td style={bodyTd({fontWeight:'700',color:'#2d6a2d'})}>{r.total_hours}</td>
                            <td style={bodyTd({color:'#555'})}>{r.what_work}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding:'10px 16px', background:'#f9f9f9', borderTop:'1px solid #f0f0f0', fontSize:'12px', color:'#666' }}>
                    {logs.length} workers recorded
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── VERIFY TAB ── */}
          {tab === 'verify' && (
            <div>
              <h2 style={{ fontSize:'18px', fontWeight:'800', marginBottom:'16px' }}>Smart Verification</h2>
              <p style={{ fontSize:'13px', color:'#666', marginBottom:'20px' }}>Compare a worker's submitted paper entries against the supervisor's recorded daily worklogs.</p>

              <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', padding:'20px', marginBottom:'20px' }}>
                <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'flex-end' }}>
                  <div style={{ flex:2, minWidth:'220px', position:'relative' }} ref={searchRef}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', marginBottom:'6px', color:'#555' }}>Worker (name or work number)</label>
                    <input type="text" placeholder="Search by name or work number…" value={workerSearch}
                      onChange={e => { setWorkerSearch(e.target.value); setShowWorkerList(true); setSelectedWorker(null); setVerifyResult(null) }}
                      onFocus={() => setShowWorkerList(true)}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #ccc', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit', boxSizing:'border-box' }} />
                    {showWorkerList && filteredWorkers.length > 0 && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #ccc', borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', zIndex:200, maxHeight:'240px', overflowY:'auto', marginTop:'2px' }}>
                        {filteredWorkers.map(w => (
                          <div key={w.id} onClick={() => selectWorker(w)}
                            style={{ padding:'9px 14px', cursor:'pointer', fontSize:'13px', borderBottom:'1px solid #f0f0f0', display:'flex', gap:'8px', alignItems:'center' }}
                            onMouseEnter={e => e.currentTarget.style.background='#f5f5f5'}
                            onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                            <span style={{ fontWeight:'700', color:'#2d6a2d', minWidth:'40px' }}>#{w.work_number}</span>
                            <span>{w.full_name}</span>
                            {w.house_group && <span style={{ fontSize:'11px', color:'#888' }}>{w.house_group}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth:'130px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', marginBottom:'6px', color:'#555' }}>Month</label>
                    <select value={verifyMonth} onChange={e => { setVerifyMonth(parseInt(e.target.value)); setVerifyResult(null) }}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #ccc', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit' }}>
                      {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ minWidth:'90px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', marginBottom:'6px', color:'#555' }}>Year</label>
                    <input type="number" value={verifyYear} onChange={e => { setVerifyYear(parseInt(e.target.value)); setVerifyResult(null) }}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #ccc', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit' }} />
                  </div>
                  <button onClick={runVerify} disabled={verifying || !selectedWorker}
                    style={{ padding:'10px 24px', background: verifying||!selectedWorker ? '#aaa' : '#2d6a2d', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor: verifying||!selectedWorker ? 'not-allowed' : 'pointer', whiteSpace:'nowrap' }}>
                    {verifying ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </div>

              {verifyResult && (
                <div>
                  <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', padding:'16px 20px', marginBottom:'16px' }}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'20px', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <p style={{ fontSize:'16px', fontWeight:'800', margin:'0 0 4px' }}>{verifyResult.worker.full_name} <span style={{ color:'#888', fontSize:'13px', fontWeight:'400' }}>#{verifyResult.worker.work_number}</span></p>
                        <p style={{ fontSize:'12px', color:'#666', margin:0 }}>{verifyResult.worker.house_group} — {MONTHS[verifyMonth-1]} {verifyYear}</p>
                      </div>
                      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                        {[['total_days_worked','Days worked',''],['days_match','Match','#2d6a2d'],['days_mismatch','Mismatch','#c0392b'],['days_missing','Missing','#e65100'],['total_hours','Total hrs','#1565c0']].map(([k,l,c])=>(
                          <div key={k} style={{ textAlign:'center' }}>
                            <div style={{ fontSize:'22px', fontWeight:'800', color:c||undefined }}>{verifyResult.summary[k]}</div>
                            <div style={{ fontSize:'11px', color:'#888' }}>{l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                        <span style={{
                          padding:'6px 16px', borderRadius:'20px', fontWeight:'800', fontSize:'13px',
                          background: verifyResult.summary.verification_status==='verified'?'#e8f5e9':verifyResult.summary.verification_status==='discrepancies_found'?'#fdecea':'#fff3e0',
                          color: verifyResult.summary.verification_status==='verified'?'#2d6a2d':verifyResult.summary.verification_status==='discrepancies_found'?'#c0392b':'#e65100',
                        }}>
                          {verifyResult.summary.verification_status==='verified'?'✓ Verified':verifyResult.summary.verification_status==='discrepancies_found'?'✗ Discrepancies Found':'⚠ Incomplete'}
                        </span>
                        <button onClick={exportVerifyPDF} style={{ padding:'7px 14px', background:'#fff', border:'1px solid #ccc', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                          Export PDF
                        </button>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'16px', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #f0f0f0', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'12px', color:'#555' }}>Regular: <b style={{ color:'#2d6a2d' }}>{verifyResult.summary.total_white_hours}</b></span>
                      <span style={{ fontSize:'12px', color:'#555' }}>Extra: <b style={{ color:'#b45309' }}>{verifyResult.summary.total_orange_hours}</b></span>
                      <span style={{ fontSize:'12px', color:'#555' }}>Total: <b>{verifyResult.summary.total_hours}</b></span>
                    </div>
                  </div>

                  <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', overflow:'hidden' }}>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'12px' }}>
                        <thead>
                          <tr>
                            <th style={thTd({rowSpan:2})}>Date</th>
                            <th style={thTd({background:'#1b5e20',textAlign:'center'})} colSpan={4}>Supervisor Recorded</th>
                            <th style={thTd({background:'#4a148c',textAlign:'center'})} colSpan={4}>Worker Submitted</th>
                            <th style={thTd()}>Status</th>
                          </tr>
                          <tr>
                            {['Start','Finish','Break','Total'].map(l=><th key={l} style={thTd({background:'#2e7d32'})}>{l}</th>)}
                            {['Start','Finish','Break','Total'].map(l=><th key={l} style={thTd({background:'#6a1b9a'})}>{l}</th>)}
                            <th style={thTd()}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verifyResult.matches.map((m,i) => {
                            const vs = VERIFY_STYLE[m.status]
                            return (
                              <tr key={i} style={{ background:vs?.bg||'#fff', borderBottom:'1px solid #f0f0f0' }}>
                                <td style={{ padding:'7px 10px', fontWeight:'700', fontSize:'12px' }}>{m.date}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.supervisor_recorded?.start||'—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.supervisor_recorded?.finish||'—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.supervisor_recorded ? m.supervisor_recorded.break+' min' : '—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px', fontWeight:'700' }}>{m.supervisor_recorded?.total||'—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.worker_submitted?.start||'—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.worker_submitted?.finish||'—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px' }}>{m.worker_submitted ? m.worker_submitted.break+' min' : '—'}</td>
                                <td style={{ padding:'7px 10px', fontSize:'12px', fontWeight:'700' }}>{m.worker_submitted?.total||'—'}</td>
                                <td style={{ padding:'7px 10px' }}><VerifyBadge status={m.status} /></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MONTHLY VERIFICATION BOARD ── */}
              <div style={{ marginTop:'36px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                  <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.2 }} />
                  <span style={{ fontSize:'13px', fontWeight:'800', color:'#2d6a2d', textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>Monthly Verification Board</span>
                  <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.2 }} />
                </div>
                <p style={{ fontSize:'13px', color:'#666', marginBottom:'16px' }}>Auto-verify all workers who submitted papers for a given month.</p>

                <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', padding:'16px 20px', marginBottom:'16px', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'flex-end' }}>
                  <div style={{ minWidth:'130px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', marginBottom:'6px', color:'#555' }}>Month</label>
                    <select value={boardMonth} onChange={e => setBoardMonth(parseInt(e.target.value))}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #ccc', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit' }}>
                      {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div style={{ minWidth:'90px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:'600', marginBottom:'6px', color:'#555' }}>Year</label>
                    <input type="number" value={boardYear} onChange={e => setBoardYear(parseInt(e.target.value))}
                      style={{ width:'100%', padding:'9px 12px', border:'1px solid #ccc', borderRadius:'8px', fontSize:'13px', fontFamily:'inherit' }} />
                  </div>
                  <button onClick={loadMonthBoard} disabled={boardLoading}
                    style={{ padding:'10px 24px', background: boardLoading ? '#aaa' : '#2d6a2d', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor: boardLoading ? 'not-allowed' : 'pointer' }}>
                    {boardLoading ? 'Loading…' : 'Load'}
                  </button>
                </div>

                {boardData.length > 0 && (
                  <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', overflow:'hidden' }}>
                    <div style={{ overflowX:'auto' }}>
                      <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'12px' }}>
                        <thead>
                          <tr>
                            <th style={thTd()}>Work#</th>
                            <th style={thTd()}>Name</th>
                            <th style={thTd()}>Group</th>
                            <th style={thTd()}>Sub Status</th>
                            <th style={thTd({textAlign:'center'})}>Days</th>
                            <th style={thTd({textAlign:'center',background:'#2e7d32'})}>Match</th>
                            <th style={thTd({textAlign:'center',background:'#b71c1c'})}>Mismatch</th>
                            <th style={thTd({textAlign:'center',background:'#e65100'})}>Missing</th>
                            <th style={thTd()}>Total hrs</th>
                            <th style={thTd()}>Verify Status</th>
                            <th style={thTd()}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {boardData.map((row,i) => {
                            const vs = row.verification_status
                            const isRowExpanded = boardExpandedId === row.worker_id
                            const detail = boardDetail[row.worker_id]
                            return (
                              <React.Fragment key={row.id}>
                                <tr style={{ background: i%2===0 ? '#fff' : '#fafafa', borderBottom: isRowExpanded ? 'none' : '1px solid #f0f0f0' }}>
                                  <td style={bodyTd({fontWeight:'700'})}>{row.work_number}</td>
                                  <td style={bodyTd()}>{row.full_name}</td>
                                  <td style={bodyTd({fontSize:'11px',color:'#666'})}>{row.house_group||'—'}</td>
                                  <td style={bodyTd()}><StatusBadge status={row.status} /></td>
                                  <td style={bodyTd({textAlign:'center',fontWeight:'700'})}>{row.total_days_worked}</td>
                                  <td style={bodyTd({textAlign:'center',color:'#2d6a2d',fontWeight:'700'})}>{row.days_match}</td>
                                  <td style={bodyTd({textAlign:'center',color:'#c0392b',fontWeight:'700'})}>{row.days_mismatch}</td>
                                  <td style={bodyTd({textAlign:'center',color:'#e65100',fontWeight:'700'})}>{row.days_missing}</td>
                                  <td style={bodyTd({fontWeight:'700'})}>{row.total_hours}</td>
                                  <td style={bodyTd()}>
                                    <span style={{
                                      padding:'2px 8px', borderRadius:'8px', fontSize:'11px', fontWeight:'700',
                                      background: vs==='verified'?'#e8f5e9':vs==='discrepancies_found'?'#fdecea':'#fff3e0',
                                      color: vs==='verified'?'#2d6a2d':vs==='discrepancies_found'?'#c0392b':'#e65100'
                                    }}>
                                      {vs==='verified'?'✓ Verified':vs==='discrepancies_found'?'✗ Issues':'⚠ Incomplete'}
                                    </span>
                                  </td>
                                  <td style={bodyTd()}>
                                    <button onClick={() => loadBoardDetail(row.worker_id)} disabled={boardDetailLoading === row.worker_id}
                                      style={{ padding:'4px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', color:'#333', whiteSpace:'nowrap' }}>
                                      {boardDetailLoading === row.worker_id ? '…' : isRowExpanded ? 'Close' : 'Details'}
                                    </button>
                                  </td>
                                </tr>
                                {isRowExpanded && detail && (
                                  <tr>
                                    <td colSpan={11} style={{ padding:'0', background:'#f5faf5', borderBottom:'1px solid #f0f0f0' }}>
                                      <div style={{ padding:'12px 16px', overflowX:'auto' }}>
                                        <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'11px' }}>
                                          <thead>
                                            <tr>
                                              <th style={thTd({fontSize:'11px'})}>Date</th>
                                              <th style={thTd({fontSize:'11px',background:'#2e7d32'})}>Sup Start</th>
                                              <th style={thTd({fontSize:'11px',background:'#2e7d32'})}>Sup Finish</th>
                                              <th style={thTd({fontSize:'11px',background:'#2e7d32'})}>Sup Total</th>
                                              <th style={thTd({fontSize:'11px',background:'#6a1b9a'})}>Worker Start</th>
                                              <th style={thTd({fontSize:'11px',background:'#6a1b9a'})}>Worker Finish</th>
                                              <th style={thTd({fontSize:'11px',background:'#6a1b9a'})}>Worker Total</th>
                                              <th style={thTd({fontSize:'11px'})}>Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {detail.matches.map((m,mi) => {
                                              const vs2 = VERIFY_STYLE[m.status]
                                              return (
                                                <tr key={mi} style={{ background: vs2?.bg||'#fff' }}>
                                                  <td style={{ padding:'5px 8px', fontWeight:'700', fontSize:'11px' }}>{m.date}</td>
                                                  <td style={{ padding:'5px 8px', fontSize:'11px' }}>{m.supervisor_recorded?.start||'—'}</td>
                                                  <td style={{ padding:'5px 8px', fontSize:'11px' }}>{m.supervisor_recorded?.finish||'—'}</td>
                                                  <td style={{ padding:'5px 8px', fontWeight:'700', fontSize:'11px' }}>{m.supervisor_recorded?.total||'—'}</td>
                                                  <td style={{ padding:'5px 8px', fontSize:'11px' }}>{m.worker_submitted?.start||'—'}</td>
                                                  <td style={{ padding:'5px 8px', fontSize:'11px' }}>{m.worker_submitted?.finish||'—'}</td>
                                                  <td style={{ padding:'5px 8px', fontWeight:'700', fontSize:'11px' }}>{m.worker_submitted?.total||'—'}</td>
                                                  <td style={{ padding:'5px 8px' }}><VerifyBadge status={m.status} /></td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding:'8px 16px', background:'#f9f9f9', borderTop:'1px solid #f0f0f0', fontSize:'12px', color:'#666' }}>
                      {boardData.length} workers submitted for {MONTHS[boardMonth-1]} {boardYear}
                    </div>
                  </div>
                )}

                {!boardLoading && boardData.length === 0 && boardMonth && (
                  <div style={{ background:'#fff', borderRadius:'10px', padding:'32px', textAlign:'center', border:'1px solid #e8e8e3' }}>
                    <p style={{ color:'#aaa', fontSize:'13px' }}>No submissions found — click Load to check a month</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── CUSTOM DELETE MODAL ── */}
      {confirmDeleteSub && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'14px', padding:'32px', maxWidth:'400px', width:'90%', boxShadow:'0 12px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ fontSize:'28px', marginBottom:'12px' }}>🗑️</div>
            <p style={{ fontWeight:'800', fontSize:'17px', margin:'0 0 8px', color:'#1a1a18' }}>Delete submission?</p>
            <p style={{ fontSize:'13px', color:'#666', margin:'0 0 28px', lineHeight:'1.6' }}>
              You are about to delete <b>{confirmDeleteSub.name}</b>'s submission for <b>{confirmDeleteSub.monthLabel}</b>. This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmDeleteSub(null)}
                style={{ padding:'9px 22px', border:'1px solid #ccc', borderRadius:'8px', background:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'600', color:'#555' }}>
                Cancel
              </button>
              <button onClick={doDeleteSub}
                style={{ padding:'9px 22px', border:'none', borderRadius:'8px', background:'#c0392b', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'700' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
