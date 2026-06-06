import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { getWorker, isLoggedIn, clearAuth, saveAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const VALID = ['09:00','09:15','09:30','09:45']

function getDaysInMonth(m, y) {
  return new Date(y, m, 0).getDate()
}

function minsToHHMM(m) {
  if (m <= 0) return ''
  return Math.floor(m/60) + ':' + String(m%60).padStart(2,'0')
}

export default function Dashboard() {
  const router = useRouter()
  const [worker, setWorker] = useState(null)
  const [entries, setEntries] = useState({})
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editDay, setEditDay] = useState(null)
  const [viewDay, setViewDay] = useState(null)
  const [form, setForm] = useState({ start: '', finish: '', work: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('white')
  const [view, setView] = useState('list')
  const [workNumModal, setWorkNumModal] = useState(false)
  const [workNumInput, setWorkNumInput] = useState('')
  const [workNumError, setWorkNumError] = useState('')
  const [workNumSaving, setWorkNumSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return }
    loadEntries()
    api.get('/api/auth/me')
      .then(res => setWorker(res.data.worker))
      .catch(() => setWorker(getWorker()))
  }, [month, year])

  async function loadEntries() {
    try {
      const res = await api.get('/api/timesheet/' + month + '/' + year)
      const map = {}
      res.data.entries.forEach(e => {
        const day = parseInt(e.entry_date.split('T')[0].split('-')[2])
        map[day] = e
      })
      setEntries(map)
    } catch (err) {
      console.error('Failed to load entries')
    }
  }

  function openEdit(day) {
    const e = entries[day]
    setForm({
      start: e ? e.actual_start?.slice(0,5) || '' : '',
      finish: e ? e.actual_finish?.slice(0,5) || '' : '',
      work: e ? e.what_work || '' : ''
    })
    setEditDay(day)
    setViewDay(null)
  }

  async function saveWorkNumber() {
    setWorkNumError('')
    if (!workNumInput.trim()) { setWorkNumError('Work number is required'); return }
    setWorkNumSaving(true)
    try {
      const res = await api.patch('/api/auth/work-number', { work_number: workNumInput.trim() })
      saveAuth(res.data.token, res.data.worker)
      setWorker(res.data.worker)
      setWorkNumModal(false)
      setWorkNumInput('')
    } catch (err) {
      setWorkNumError(err.response?.data?.error || 'Failed to update work number')
    } finally {
      setWorkNumSaving(false)
    }
  }

  async function deleteEntry(day) {
    const dateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0')
    try {
      await api.delete('/api/timesheet/entry/' + dateStr)
      await loadEntries()
      setConfirmDelete(null)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.status || err?.message || 'unknown'
      alert('Delete failed: ' + msg)
    }
  }

  async function saveEntry() {
    if (!form.start || !form.finish) { setError('Start and finish time are required'); return }
    setSaving(true)
    setError('')
    try {
      const dateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(editDay).padStart(2,'0')
      await api.post('/api/timesheet/entry', {
        entry_date: dateStr,
        actual_start: form.start,
        actual_finish: form.finish,
        what_work: form.work
      })
      await loadEntries()
      setEditDay(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function logout() {
    clearAuth()
    router.push('/login')
  }

  const days = getDaysInMonth(month, year)

  const inp = { width: '100%', padding: '10px 12px', fontSize: '15px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }

  function thW(extra) { return { border: '1px solid #333', padding: '7px 8px', textAlign: 'left', whiteSpace: 'nowrap', background: '#e0e0e0', fontSize: '12px', fontWeight: '700', ...extra } }
  function tdW(extra) { return { border: '1px solid #333', padding: '6px 8px', fontSize: '12px', ...extra } }
  function thO(extra) { return { border: '1px solid #c97d00', padding: '7px 8px', textAlign: 'left', whiteSpace: 'nowrap', background: '#ffe0a0', fontSize: '12px', fontWeight: '700', ...extra } }
  function tdO(extra) { return { border: '1px solid #c97d00', padding: '6px 8px', fontSize: '12px', background: '#fffbf0', ...extra } }
  function thB(extra) { return { border: '1px solid #1565c0', padding: '7px 8px', textAlign: 'center', background: '#bbdefb', fontSize: '12px', fontWeight: '700', ...extra } }
  function tdB(extra) { return { border: '1px solid #1565c0', padding: '6px 8px', fontSize: '12px', textAlign: 'center', background: '#f0f7ff', ...extra } }
  function thG(extra) { return { border: '1px solid #2d6a2d', padding: '7px 8px', textAlign: 'left', whiteSpace: 'nowrap', background: '#e8f5e9', fontSize: '12px', fontWeight: '700', ...extra } }
  function tdG(extra) { return { border: '1px solid #2d6a2d', padding: '6px 8px', fontSize: '12px', ...extra } }

  function InlineDayView({ day, entry }) {
    return (
      <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px', overflowX: 'auto' }}>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px' }}>WHITE PAPER — WORK PAID BY THE HOUR</p>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>8 HOURS PER DAY / 40 HOURS PER WEEK</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thW()}>Date</th>
                <th style={thW()}>Start</th>
                <th style={thW()}>Finish</th>
                <th style={thW()}>Must have Eating break</th>
                <th style={thW()}>Extra Breaks</th>
                <th style={thW()}>Hours minus breaks</th>
                <th style={thW()}>What work</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#fafafa' }}>
                <td style={tdW()}><b>{day}</b></td>
                <td style={tdW()}>{entry.white_start?.slice(0,5)}</td>
                <td style={tdW()}>{entry.white_finish?.slice(0,5)}</td>
                <td style={tdW({ textAlign: 'center' })}>30 min</td>
                <td style={tdW()}></td>
                <td style={tdW({ fontWeight: '700', color: '#2d6a2d' })}>7:30</td>
                <td style={tdW()}>{entry.what_work}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins. START WORK 9:00, 9:15, 9:30 or 9:45.</p>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#b45309' }}>ORANGE PAPER — EXTRAWORK PAID BY THE HOUR</p>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>MAXIMUM 3 HOURS PER DAY (MONDAY-FRIDAY) | MAXIMUM 11 HOURS PER DAY (SATURDAY)</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thO()}>Date</th>
                <th style={thO()}>Start</th>
                <th style={thO()}>Finish</th>
                <th style={thO()}>Break</th>
                <th style={thO()}>Hours minus breaks</th>
                <th style={thO()}>What work</th>
                <th style={thO()}>Signature</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdO()}><b>{day}</b></td>
                <td style={tdO()}>{entry.orange_start?.slice(0,5)}</td>
                <td style={tdO()}>{entry.orange_finish?.slice(0,5)}</td>
                <td style={tdO({ textAlign: 'center' })}>0:15</td>
                <td style={tdO({ fontWeight: '700', color: '#b45309' })}>{entry.orange_hours}</td>
                <td style={tdO()}>{entry.what_work}</td>
                <td style={tdO()}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontStyle: 'italic' }}>Start work 9:00, 9:15, 9:30 or 9:45. Work does not start 9:05, 9:10, 9:20, 9:25 etc.</p>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '6px', color: '#1565c0' }}>WEEKLY SUMMARY</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thB({ textAlign: 'left', minWidth: '140px' })}>Type</th>
                <th style={thB()}>Mon</th>
                <th style={thB()}>Tue</th>
                <th style={thB()}>Wed</th>
                <th style={thB()}>Thur</th>
                <th style={thB()}>Fri</th>
                <th style={thB()}>Sat (max 11)</th>
                <th style={thB()}>Sun</th>
                <th style={thB()}>Total hours</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdB({ textAlign: 'left', fontWeight: '600' })}>Working hours (max 8)</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#2d6a2d' })}>7:30</td>
              </tr>
              <tr>
                <td style={tdB({ textAlign: 'left', fontWeight: '600' })}>Extra hours (max 3)</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#b45309' })}>{entry.orange_hours}</td>
              </tr>
              <tr style={{ background: '#e3f2fd' }}>
                <td style={tdB({ textAlign: 'left', fontWeight: '700' })}>Total</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#1565c0', fontSize: '13px' })}>{entry.total_hours}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#2d6a2d' }}>GREEN PAPER — TIME USED FOR PICKUP (SALARY PAID BY KILOS)</p>
        <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontStyle: 'italic' }}>Not in use yet — berry picking season coming soon</p>
        <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thG()}>Date</th>
                <th style={thG()}>Start</th>
                <th style={thG()}>Finish</th>
                <th style={thG()}>Must have Eating break</th>
                <th style={thG()}>Extra Breaks</th>
                <th style={thG()}>Hours minus breaks</th>
                <th style={thG()}>What was picked up</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdG()}><b>{day}</b></td>
                <td style={tdG()}></td>
                <td style={tdG()}></td>
                <td style={tdG({ textAlign: 'center' })}>1 hour</td>
                <td style={tdG()}></td>
                <td style={tdG()}></td>
                <td style={tdG()}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>HOX, NEED TO PICKUP 10 KILO PER HOUR!</p>
      </div>
    )
  }

  function PapersFullView() {
    const navBtn = (tab, label, sub) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        style={{
          padding: '6px 10px', textAlign: 'center', borderRadius: '6px',
          fontSize: '11px', fontWeight: '600', cursor: 'pointer', border: 'none',
          background: activeTab === tab ? '#2d6a2d' : '#fff',
          color: activeTab === tab ? '#fff' : '#333',
          border: activeTab === tab ? 'none' : '1px solid #ddd',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
        {sub && <div style={{ fontSize: '10px', color: activeTab === tab ? '#cfffcf' : '#aaa', marginTop: '2px', fontWeight: '400' }}>{sub}</div>}
      </button>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>

        <div style={{ background: '#f5f5f5', borderBottom: '1px solid #ccc', padding: '8px', display: 'flex', flexDirection: 'row', gap: '6px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Papers</p>
          <div style={{display:'flex',flexDirection:'row',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
            {[['white','White Paper','Work paid by hour'],['orange','Orange Paper','Extrawork'],['weekly','Weekly Summary','Mon to Sun totals'],['green','Green Paper','Berry picking']].map(([tab,label,sub])=>(
              <div key={tab} style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                {navBtn(tab,label,sub)}
                <button onClick={()=>downloadPDF(tab)} style={{padding:'3px 8px',fontSize:'10px',fontWeight:'600',background:'#f5f5f0',border:'1px solid #ddd',borderRadius:'4px',cursor:'pointer',color:'#555',whiteSpace:'nowrap'}}>Download PDF</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowX: 'auto' }}>

          {activeTab === 'white' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>WORK PAID BY THE HOUR</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>8 HOURS PER DAY / 40 HOURS PER WEEK</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thW()}>Date</th>
                      <th style={thW()}>Start</th>
                      <th style={thW()}>Finish</th>
                      <th style={thW()}>Must have Eating break</th>
                      <th style={thW()}>Extra Breaks</th>
                      <th style={thW()}>Hours minus breaks</th>
                      <th style={thW()}>What work</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const entry = entries[day]
                      return (
                        <tr key={day} style={{ background: entry ? '#fafafa' : '#fff' }}>
                          <td style={tdW()}><b>{day}</b></td>
                          <td style={tdW()}>{entry ? entry.white_start?.slice(0,5) : ''}</td>
                          <td style={tdW()}>{entry ? entry.white_finish?.slice(0,5) : ''}</td>
                          <td style={tdW({ textAlign: 'center' })}>30 min</td>
                          <td style={tdW()}></td>
                          <td style={tdW({ fontWeight: '700', color: entry ? '#2d6a2d' : '' })}>{entry ? '7:30' : ''}</td>
                          <td style={tdW()}>{entry ? entry.what_work : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins.</p>
              <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>START WORK 9:00, 9:15, 9:30 or 9:45. WORK DOES NOT START 9:05, 9:10, 9:20, 9:25 etc.</p>
            </div>
          )}

          {activeTab === 'orange' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px', color: '#b45309' }}>EXTRAWORK PAID BY THE HOUR</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>MAXIMUM 3 HOURS PER DAY (MONDAY-FRIDAY)</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>MAXIMUM 11 HOURS PER DAY (SATURDAY)</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%', fontSize: '12px', background: '#fffbf0' }}>
                  <thead>
                    <tr>
                      <th style={thO()}>Date</th>
                      <th style={thO()}>Start</th>
                      <th style={thO()}>Finish</th>
                      <th style={thO()}>Break</th>
                      <th style={thO()}>Hours minus breaks</th>
                      <th style={thO()}>What work</th>
                      <th style={thO()}>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const entry = entries[day]
                      return (
                        <tr key={day} style={{ background: entry ? '#fff8e1' : '#fffbf0' }}>
                          <td style={tdO()}><b>{day}</b></td>
                          <td style={tdO()}>{entry ? entry.orange_start?.slice(0,5) : ''}</td>
                          <td style={tdO()}>{entry ? entry.orange_finish?.slice(0,5) : ''}</td>
                          <td style={tdO({ textAlign: 'center' })}>{entry ? '0:15' : ''}</td>
                          <td style={tdO({ fontWeight: '700', color: entry ? '#b45309' : '' })}>{entry ? entry.orange_hours : ''}</td>
                          <td style={tdO()}>{entry ? entry.what_work : ''}</td>
                          <td style={tdO()}></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>Start work 9:00, 9:15, 9:30 or 9:45. Work does not start 9:05, 9:10, 9:20, 9:25 etc.</p>
            </div>
          )}

          {activeTab === 'weekly' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>WEEKLY SUMMARY</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '12px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              {Array.from({ length: Math.ceil(days / 7) }, (_, weekIdx) => {
                const weekStart = weekIdx * 7 + 1
                const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i).filter(d => d <= days)
                const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                const dayInfos = Array.from({ length: 7 }, (_, i) => {
                  const d = weekStart + i
                  const dow = d <= days ? new Date(year, month - 1, d).getDay() : null
                  return { d, exists: d <= days, dow, name: dow !== null ? DAY_NAMES[dow] : '', isSun: dow === 0, isSat: dow === 6 }
                })
                const validDays = dayInfos.filter(x => x.exists)
                const totalWorking = validDays.filter(x => entries[x.d] && !x.isSun).length * 450
                const totalExtra = validDays.reduce((sum, x) => {
                  if (!entries[x.d]?.orange_hours || x.isSun) return sum
                  const p = entries[x.d].orange_hours.split(':')
                  return sum + parseInt(p[0]) * 60 + parseInt(p[1])
                }, 0)
                const thW2 = (extra) => ({ border: '1px solid #333', padding: '5px 6px', textAlign: 'center', background: '#e0e0e0', fontSize: '11px', fontWeight: '700', ...extra })
                const tdW2 = (extra) => ({ border: '1px solid #333', padding: '5px 6px', fontSize: '11px', textAlign: 'center', ...extra })
                const tdO2 = (extra) => ({ border: '1px solid #c97d00', padding: '5px 6px', fontSize: '11px', textAlign: 'center', background: '#fffbf0', ...extra })
                const tdG2 = (extra) => ({ border: '1px solid #2d6a2d', padding: '5px 6px', fontSize: '11px', textAlign: 'center', background: '#f6fff6', ...extra })
                return (
                  <div key={weekIdx} style={{ marginBottom: '20px' }}>
                    <p style={{ fontWeight: '800', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Week {weekIdx + 1}</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th style={thW2({ textAlign: 'left', minWidth: '130px', background: '#d0d0d0' })}></th>
                            {dayInfos.map(({ d, name, exists, isSun, isSat }) => (
                              <th key={d} style={thW2({ minWidth: '44px', background: isSun ? '#e8e8e8' : '#e0e0e0', color: isSun ? '#999' : '#1a1a18' })}>
                                {name || ''}<br/>
                                {exists && !isSun && <span style={{ fontSize: '9px', fontWeight: '400', color: '#666' }}>{isSat ? 'max 11' : 'max 3'}</span>}
                              </th>
                            ))}
                            <th style={thW2({ minWidth: '60px', background: '#d0d0d0' })}>
                              total<br/><span style={{ fontSize: '9px', fontWeight: '400' }}>hours</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Green row — pickup hours */}
                          <tr>
                            <td style={tdG2({ textAlign: 'left', fontWeight: '700', color: '#2d6a2d', background: '#e8f5e9' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#2d6a2d', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              pickup hours
                            </td>
                            {dayInfos.map(({ d, isSun, exists }) => (
                              <td key={d} style={tdG2({ color: isSun ? '#bbb' : '#2d6a2d', background: '#e8f5e9', fontWeight: '700' })}>
                                {isSun ? 'X' : ''}
                              </td>
                            ))}
                            <td style={tdG2({ fontWeight: '700', color: '#2d6a2d', background: '#e8f5e9' })}>
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>max 40</div>
                            </td>
                          </tr>
                          {/* White row — working hours */}
                          <tr>
                            <td style={tdW2({ textAlign: 'left', fontWeight: '700', background: '#fafafa' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#ccc', border: '1px solid #999', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              working hours
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>max 8</div>
                            </td>
                            {dayInfos.map(({ d, isSun, exists }) => (
                              <td key={d} style={tdW2({ fontWeight: entries[d] ? '700' : '400', background: '#fafafa', color: isSun ? '#bbb' : (entries[d] ? '#1a1a18' : '#ccc') })}>
                                {isSun ? 'X' : (entries[d] ? '7:30' : '')}
                              </td>
                            ))}
                            <td style={tdW2({ fontWeight: '700', background: '#fafafa' })}>
                              {minsToHHMM(totalWorking)}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>max 40</div>
                            </td>
                          </tr>
                          {/* Orange row — extra hours */}
                          <tr>
                            <td style={tdO2({ textAlign: 'left', fontWeight: '700', color: '#b45309', background: '#fff3e0' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#f59e0b', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              extra hours / lisatyö
                            </td>
                            {dayInfos.map(({ d, isSun, exists, isSat }) => (
                              <td key={d} style={tdO2({ fontWeight: entries[d] ? '700' : '400', background: '#fff3e0', color: isSun ? '#bbb' : (entries[d] ? '#b45309' : '#ccc') })}>
                                {isSun ? 'X' : (entries[d] ? entries[d].orange_hours : '')}
                              </td>
                            ))}
                            <td style={tdO2({ fontWeight: '700', color: '#b45309', background: '#fff3e0' })}>
                              {minsToHHMM(totalExtra)}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>max 17/week</div>
                            </td>
                          </tr>
                          {/* Yes / Signature row */}
                          <tr>
                            <td colSpan={9} style={{ border: '1px solid #333', padding: '6px 10px', fontSize: '11px', background: '#fff' }}>
                              yes, I want to work extra hours &nbsp;☐&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature: _______________________
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

          {activeTab === 'green' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px', color: '#2d6a2d' }}>TIME USED FOR PICKUP, SALARY IS PAID BY KILOS</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>8 HOURS PER DAY / 40 HOURS PER WEEK</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px', color: '#c0392b' }}>HOX, NEED TO PICKUP 10 KILO PER HOUR!</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              <div style={{ background: '#fff9c4', border: '1px solid #f9a825', borderRadius: '6px', padding: '8px 12px', marginBottom: '12px', fontSize: '12px', color: '#6d4c00' }}>
                Berry picking season not yet started. This paper will be active when picking begins.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thG()}>Date</th>
                      <th style={thG()}>Start</th>
                      <th style={thG()}>Finish</th>
                      <th style={thG()}>Must have Eating break</th>
                      <th style={thG()}>Extra Breaks</th>
                      <th style={thG()}>Hours minus breaks</th>
                      <th style={thG()}>What was picked up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => (
                      <tr key={day} style={{ background: '#fff' }}>
                        <td style={tdG()}><b>{day}</b></td>
                        <td style={tdG()}></td>
                        <td style={tdG()}></td>
                        <td style={tdG({ textAlign: 'center', color: '#888' })}>1 hour</td>
                        <td style={tdG()}></td>
                        <td style={tdG()}></td>
                        <td style={tdG()}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins.</p>
              <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>START WORK 9:00, 9:15, 9:30 or 9:45. WORK DOES NOT START 9:05, 9:10, 9:20, 9:25 etc.</p>
            </div>
          )}

        </div>
      </div>
    )
  }

  function downloadPDF(tab) {
    const doc = new jsPDF({ orientation: tab === 'weekly' ? 'landscape' : 'portrait' })
    const daysCount = getDaysInMonth(month, year)
    const monthName = MONTHS[month - 1] + ' ' + year

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    if (tab === 'white') {
      doc.text('WORK PAID BY THE HOUR', 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('8 HOURS PER DAY / 40 HOURS PER WEEK', 14, 22)
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 28)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.white_start?.slice(0,5) : '', e ? e.white_finish?.slice(0,5) : '', '30 min', '', e ? '7:30' : '', e ? e.what_work : ''] })
      doc.autoTable({ startY: 32, head: [['Date','Start','Finish','Eating break','Extra breaks','Hours minus breaks','What work']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [220,220,220], textColor: 0 } })
      doc.save('white-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
    if (tab === 'orange') {
      doc.text('EXTRAWORK PAID BY THE HOUR', 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.orange_start?.slice(0,5) : '', e ? e.orange_finish?.slice(0,5) : '', e ? '0:15' : '', e ? e.orange_hours : '', e ? e.what_work : '', ''] })
      doc.autoTable({ startY: 26, head: [['Date','Start','Finish','Break','Hours minus breaks','What work','Signature']], body: rows, styles: { fontSize: 9 }, headStyles: { fillColor: [255,224,160], textColor: 0 } })
      doc.save('orange-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
    if (tab === 'weekly') {
      doc.text('WEEKLY SUMMARY', 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const toHHMM = m => m > 0 ? Math.floor(m/60) + ':' + String(m%60).padStart(2,'0') : ''
      Array.from({ length: Math.ceil(daysCount/7) }, (_, wi) => {
        const ws = wi*7+1; const wd = Array.from({length:7},(_,i)=>ws+i).filter(d=>d<=daysCount)
        const tw = wd.filter(d=>entries[d]).length*450
        const te = wd.reduce((s,d)=>{ if(!entries[d]?.orange_hours) return s; const p=entries[d].orange_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        doc.autoTable({ startY: wi===0?26:doc.lastAutoTable.finalY+6, head: [['Type',...wd.map(d=>'Day '+d),...Array(7-wd.length).fill(''),'Total']], body: [['Working hrs',...wd.map(d=>entries[d]?'7:30':''),...Array(7-wd.length).fill(''),toHHMM(tw)],['Extra hrs',...wd.map(d=>entries[d]?entries[d].orange_hours:''),...Array(7-wd.length).fill(''),toHHMM(te)],['Total',...wd.map(d=>entries[d]?entries[d].total_hours:''),...Array(7-wd.length).fill(''),toHHMM(tw+te)]], styles:{fontSize:8}, headStyles:{fillColor:[187,222,251],textColor:0} })
      })
      doc.save('weekly-summary-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
    if (tab === 'green') {
      doc.text('TIME USED FOR PICKUP — SALARY PAID BY KILOS', 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => [i+1, '', '', '1 hour', '', '', ''])
      doc.autoTable({ startY: 26, head: [['Date','Start','Finish','Eating break','Extra breaks','Hours minus breaks','What was picked up']], body: rows, styles:{fontSize:9}, headStyles:{fillColor:[200,230,201],textColor:0} })
      doc.save('green-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
  }

  return (
    <>
      <Head><title>Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>

        <div style={{ background: '#2d6a2d', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '44px', width: 'auto', borderRadius: '8px', display: 'block' }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '22px', color: '#fff', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {worker && (
              <button onClick={() => { setWorkNumInput(worker.work_number || ''); setWorkNumError(''); setWorkNumModal(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#cfffcf' }}>#{worker.work_number} {worker.full_name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {worker?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff' }}>Admin</button>
            )}
            <button onClick={logout} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff' }}>Sign out</button>
          </div>
        </div>

        {/* Work number banner — shown when account has a temporary G-XXXXXX number */}
        {worker?.work_number?.startsWith('G-') && (
          <div style={{ background: '#fff3e0', borderBottom: '1px solid #fde0b0', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: '13px', color: '#b45309', fontWeight: '600' }}>
                Your account has a temporary work number ({worker.work_number}). Please set your official farm work number.
              </span>
            </div>
            <button onClick={() => { setWorkNumInput(''); setWorkNumError(''); setWorkNumModal(true) }}
              style={{ padding: '5px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Set work number
            </button>
          </div>
        )}

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 16px 16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px' }}>{'<'}</button>
              <div style={{ fontWeight: '700', fontSize: '16px', minWidth: '140px', textAlign: 'center' }}>{MONTHS[month-1]} {year}</div>
              <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px' }}>{'>'}</button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setView('list')} style={{ padding: '7px 14px', background: view === 'list' ? '#2d6a2d' : '#fff', color: view === 'list' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Days</button>
              <button onClick={() => setView('papers')} style={{ padding: '7px 14px', background: view === 'papers' ? '#2d6a2d' : '#fff', color: view === 'papers' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>Papers</button>
            </div>
          </div>

          {view === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                const entry = entries[day]
                const hasEntry = !!entry
                return (
                  <div key={day} style={{ background: '#fff', border: hasEntry ? '2px solid #2d6a2d' : '1px solid #ddd', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
                        <span style={{ fontWeight: '800', fontSize: '15px', minWidth: '55px' }}>Day {day}</span>
                        {hasEntry ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>{entry.actual_start?.slice(0,5)} — {entry.actual_finish?.slice(0,5)}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#f0f0f0', color: '#555', padding: '2px 8px', borderRadius: '4px' }}>W: 7:30</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#fff3e0', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>O: {entry.orange_hours}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '4px' }}>Total: {entry.total_hours}</span>
                            {entry.what_work && <span style={{ fontSize: '11px', color: '#888' }}>{entry.what_work}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#bbb' }}>No entry yet</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                        {hasEntry && (
                          <button
                            onClick={() => setViewDay(viewDay === day ? null : day)}
                            style={{ padding: '5px 10px', background: viewDay === day ? '#2d6a2d' : '#e8f5e9', border: '1px solid #2d6a2d', borderRadius: '6px', fontSize: '12px', color: viewDay === day ? '#fff' : '#2d6a2d', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {viewDay === day ? 'Hide' : 'View'}
                          </button>
                        )}
                        <button
                          onClick={() => { openEdit(editDay === day ? null : day) }}
                          style={{ padding: '5px 12px', background: hasEntry ? '#fff' : '#2d6a2d', border: hasEntry ? '1px solid #ccc' : 'none', borderRadius: '6px', fontSize: '12px', color: hasEntry ? '#333' : '#fff', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {editDay === day ? 'Close' : hasEntry ? 'Edit' : '+ Add'}
                        </button>
                        {hasEntry && confirmDelete !== day && (
                          <button onClick={() => setConfirmDelete(day)}
                            style={{ padding: '5px 10px', background: '#fdecea', border: '1px solid #ffc1c0', borderRadius: '6px', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            Delete
                          </button>
                        )}
                        {hasEntry && confirmDelete === day && (
                          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', maxWidth: '340px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>Delete Day {day}?</h3>
                              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5', marginBottom: '20px' }}>This will permanently remove this entry from all papers.</p>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => setConfirmDelete(null)}
                                  style={{ padding: '10px 24px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                  Cancel
                                </button>
                                <button onClick={() => deleteEntry(day)}
                                  style={{ padding: '10px 24px', background: '#c0392b', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>
                                  Yes, delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {editDay === day && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {error && <p style={{ color: 'red', fontSize: '13px', margin: 0 }}>{error}</p>}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Actual start time</label>
                            <input style={inp} placeholder="HH:MM e.g. 10:15" value={form.start} onChange={e => setForm({...form, start: e.target.value})} />
                            {form.start && !VALID.includes(form.start) && <p style={{ color: 'orange', fontSize: '11px', margin: '2px 0 0' }}>Should be 9:00, 9:15, 9:30, or 9:45</p>}
                          </div>
                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Actual finish time</label>
                            <input style={inp} placeholder="HH:MM e.g. 20:45" value={form.finish} onChange={e => setForm({...form, finish: e.target.value})} />
                          </div>
                          <div style={{ flex: 2, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>What work</label>
                            <input style={inp} placeholder="e.g. cleaning, planting" value={form.work} onChange={e => setForm({...form, work: e.target.value})} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={saveEntry} disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Saving...' : 'Save'}</button>
                          <button onClick={() => { setEditDay(null); setError('') }} style={{ padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {viewDay === day && hasEntry && InlineDayView({ day, entry })}
                  </div>
                )
              })}
            </div>
          )}

          {view === 'papers' && PapersFullView()}

        </div>
      </div>

      {/* Work number modal */}
      {workNumModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '380px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Set your work number</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
              Enter your official farm work number. This is the number assigned to you by the farm manager.
            </p>
            {workNumError && (
              <div style={{ background: '#fdecea', border: '1px solid #ffc1c0', color: '#c0392b', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '14px' }}>
                {workNumError}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Work number</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. 334"
                value={workNumInput}
                onChange={e => setWorkNumInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveWorkNumber()}
                style={{ width: '100%', padding: '10px 12px', fontSize: '15px', border: '1px solid #d0d7de', borderRadius: '8px', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveWorkNumber} disabled={workNumSaving}
                style={{ flex: 1, padding: '11px', background: workNumSaving ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: workNumSaving ? 'not-allowed' : 'pointer' }}>
                {workNumSaving ? 'Saving...' : 'Save work number'}
              </button>
              <button onClick={() => setWorkNumModal(false)}
                style={{ padding: '11px 18px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}