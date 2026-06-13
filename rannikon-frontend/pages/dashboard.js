import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { getWorker, isLoggedIn, clearAuth, saveAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const VALID = ['09:00','09:15','09:30','09:45']
const BERRY_SEASON = false

function getDaysInMonth(m, y) {
  return new Date(y, m, 0).getDate()
}

function minsToHHMM(m) {
  if (m <= 0) return ''
  return Math.floor(m/60) + ':' + String(m%60).padStart(2,'0')
}

function toMins(t) {
  if (!t) return 0
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
function toHHMM(m) {
  if (m <= 0) return '0:00'
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
}
function addMins(t, add) {
  const total = toMins(t) + add
  return String(Math.floor(total / 60) % 24).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}
function computeEntry(e) {
  if (!e?.actual_start || !e?.actual_finish) return e
  const totalBreak = Math.max(0, e.break_mins || 0)
  const extraBreak = Math.max(0, totalBreak - 30)
  const workedMins = toMins(e.actual_finish) - toMins(e.actual_start)
  const WHITE_WINDOW = 480 + (totalBreak >= 30 ? 30 : 0) + extraBreak
  if (workedMins > WHITE_WINDOW) {
    const wFinish = addMins(e.actual_start, WHITE_WINDOW)
    const oMins = Math.max(0, toMins(e.actual_finish) - toMins(wFinish) - extraBreak)
    return { ...e, white_finish: wFinish, white_hours: '8:00', orange_start: wFinish, orange_hours: toHHMM(oMins), total_hours: toHHMM(480 + oMins), orange_break: toHHMM(extraBreak) }
  } else {
    const wHours = toHHMM(Math.max(0, workedMins - totalBreak))
    return { ...e, white_hours: wHours, orange_start: e.actual_finish, orange_hours: '0:00', total_hours: wHours, orange_break: toHHMM(extraBreak) }
  }
}

function EditableCell({ value, field, entryDate, onSave, style }) {
  const [editing, setEditing] = React.useState(false)
  const [val, setVal] = React.useState(value || '')

  React.useEffect(() => { setVal(value || '') }, [value])

  function handleBlur() {
    setEditing(false)
    if (val !== (value || '')) {
      onSave(field, val, entryDate)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        style={{ width: '100%', minWidth: '60px', padding: '2px 4px', fontSize: '12px', border: '1px solid #2d6a2d', borderRadius: '3px', fontFamily: 'inherit', background: '#f0fff0', ...style }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{ cursor: 'pointer', display: 'block', minWidth: '40px', minHeight: '18px', padding: '1px 2px', borderRadius: '3px', transition: 'background 0.15s', ...style }}
      onMouseEnter={e => e.currentTarget.style.background = '#f0f7f0'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {val || <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>}
    </span>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [worker, setWorker] = useState(null)
  const [entries, setEntries] = useState({})
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editDay, setEditDay] = useState(null)
  const [viewDay, setViewDay] = useState(null)
  const [form, setForm] = useState({ start: '', finish: '', work: '', break_mins: 30, kg_picked: '' })
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
      .then(res => {
        const w = res.data.worker
        if (w?.role === 'supervisor') { router.push('/supervisor'); return }
        setWorker(w)
      })
      .catch(() => setWorker(getWorker()))
  }, [month, year])

  async function loadEntries() {
    try {
      const res = await api.get('/api/timesheet/' + month + '/' + year)
      const map = {}
      res.data.entries.forEach(e => {
        const day = parseInt(e.entry_date.split('T')[0].split('-')[2])
        map[day] = computeEntry(e)
      })
      setEntries(map)
    } catch (err) {
      console.error('Failed to load entries')
    }
  }

  async function saveField(field, value, entryDate) {
    try {
      await api.patch('/api/timesheet/entry/' + entryDate + '/field', { field, value })
      await loadEntries()
    } catch (err) {
      console.error('Failed to save field', err)
    }
  }

  function openEdit(day) {
    const e = entries[day]
    setForm({
      start: e ? e.actual_start?.slice(0,5) || '' : '',
      finish: e ? e.actual_finish?.slice(0,5) || '' : '',
      work: e ? e.what_work || '' : '',
      break_mins: e ? (e.break_mins ?? 0) : 0,
      kg_picked: e ? (e.kg_picked || '') : ''
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
        what_work: form.work,
        break_mins: parseInt(form.break_mins) ?? 0,
        kg_picked: form.kg_picked ? parseFloat(form.kg_picked) : null
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

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px' }}>WHITE PAPER: WORK PAID BY THE HOUR</p>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>8 HOURS PER DAY / 40 HOURS PER WEEK</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thW()}>Date</th>
                <th style={thW()}>Start</th>
                <th style={thW()}>Finish</th>
                <th style={thW()}>Must have Eating break</th>
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
                <td style={tdW({ fontWeight: '700', color: '#2d6a2d' })}>{entry.white_hours}</td>
                <td style={tdW()}>{entry.what_work}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins. START WORK 9:00, 9:15, 9:30 or 9:45.</p>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#b45309' }}>ORANGE PAPER: EXTRAWORK PAID BY THE HOUR</p>
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
                <td style={tdO({ textAlign: 'center' })}>{entry.orange_break || '0:00'}</td>
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
                <td style={tdB({ fontWeight: '700', color: '#2d6a2d' })}>{entry.white_hours}</td>
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

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#2d6a2d' }}>GREEN PAPER: TIME USED FOR PICKUP (SALARY PAID BY KILOS)</p>
        <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '580px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thG()}>Date</th>
                <th style={thG()}>Start</th>
                <th style={thG()}>Finish</th>
                <th style={thG()}>Must have Eating break</th>
                <th style={thG()}>Extra Breaks</th>
                <th style={thG()}>Hours minus breaks</th>
                <th style={thG()}>What was picked up</th>
                <th style={thG()}>Kg picked</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdG()}><b>{day}</b></td>
                <td style={tdG()}>{entry.actual_start?.slice(0,5)}</td>
                <td style={tdG()}>{entry.actual_finish?.slice(0,5)}</td>
                <td style={tdG({ textAlign: 'center' })}>1 hour</td>
                <td style={tdG({ textAlign: 'center' })}>{entry.orange_break && entry.orange_break !== '0:00' ? entry.orange_break : ''}</td>
                <td style={tdG({ fontWeight: '700', color: '#2d6a2d' })}>{entry.white_hours}</td>
                <td style={tdG()}>{entry.what_work}</td>
                <td style={tdG({ fontWeight: '700', color: '#2d6a2d' })}>{entry.kg_picked != null ? entry.kg_picked : ''}</td>
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
          {navBtn('white', 'White Paper', 'Work paid by hour')}
          {navBtn('orange', 'Orange Paper', 'Extrawork')}
          {navBtn('weekly', 'Weekly Summary', 'Mon to Sun totals')}
          {navBtn('green', 'Green Paper', 'Berry picking')}
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
                          <td style={tdW()}>{entry ? <EditableCell value={entry.white_start?.slice(0,5)} field="white_start" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdW()}>{entry ? <EditableCell value={entry.white_finish?.slice(0,5)} field="white_finish" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdW({ textAlign: 'center' })}>30 min</td>
                          <td style={tdW({ fontWeight: '700', color: entry ? '#2d6a2d' : '' })}>{entry ? <EditableCell value={entry.white_hours || '8:00'} field="white_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdW()}>{entry ? <EditableCell value={entry.what_work} field="what_work" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins.</p>
              <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>START WORK 9:00, 9:15, 9:30 or 9:45. WORK DOES NOT START 9:05, 9:10, 9:20, 9:25 etc.</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('white')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  Download PDF
                </button>
                <button onClick={() => downloadExcel('white')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  Download Excel
                </button>
              </div>
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
                          <td style={tdO()}>{entry ? <EditableCell value={entry.orange_start?.slice(0,5)} field="orange_start" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}>{entry ? <EditableCell value={entry.orange_finish?.slice(0,5)} field="orange_finish" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO({ textAlign: 'center' })}>{entry ? (entry.orange_break || '0:00') : ''}</td>
                          <td style={tdO({ fontWeight: '700', color: entry ? '#b45309' : '' })}>{entry ? <EditableCell value={entry.orange_hours} field="orange_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}>{entry ? <EditableCell value={entry.what_work} field="what_work" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>Start work 9:00, 9:15, 9:30 or 9:45. Work does not start 9:05, 9:10, 9:20, 9:25 etc.</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('orange')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  Download PDF
                </button>
                <button onClick={() => downloadExcel('orange')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  Download Excel
                </button>
              </div>
            </div>
          )}

          {activeTab === 'weekly' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>WEEKLY SUMMARY</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '12px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              {Array.from({ length: Math.min(Math.ceil(days / 7), 4) }, (_, weekIdx) => {
                const weekStart = weekIdx * 7 + 1
                const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i).filter(d => d <= days)
                const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                const dayInfos = Array.from({ length: 7 }, (_, i) => {
                  const d = weekStart + i
                  const dow = d <= days ? new Date(year, month - 1, d).getDay() : null
                  return { d, exists: d <= days, dow, name: dow !== null ? DAY_NAMES[dow] : '', isSun: dow === 0, isSat: dow === 6 }
                })
                const validDays = dayInfos.filter(x => x.exists)
                const totalWorking = validDays.reduce((sum, x) => { if (!entries[x.d] || x.isSun) return sum; const p = entries[x.d].white_hours?.split(':') || ['8','0']; return sum + parseInt(p[0])*60 + parseInt(p[1]) }, 0)
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
                                {isSun ? 'X' : (entries[d] ? <EditableCell value={entries[d].white_hours || '8:00'} field="white_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0')} onSave={saveField} /> : '')}
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
                                {isSun ? 'X' : (entries[d] ? <EditableCell value={entries[d].orange_hours} field="orange_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0')} onSave={saveField} /> : '')}
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
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('weekly')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  Download PDF
                </button>
                <button onClick={() => downloadExcel('weekly')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  Download Excel
                </button>
              </div>
            </div>
          )}

          {activeTab === 'green' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px', color: '#2d6a2d' }}>TIME USED FOR PICKUP, SALARY IS PAID BY KILOS</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>8 HOURS PER DAY / 40 HOURS PER WEEK</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px', color: '#c0392b' }}>HOX, NEED TO PICKUP 10 KILO PER HOUR!</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>Name: <b>{worker?.full_name}</b> &nbsp;&nbsp; Work number: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '640px', width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thG()}>Date</th>
                      <th style={thG()}>Start</th>
                      <th style={thG()}>Finish</th>
                      <th style={thG()}>Must have Eating break</th>
                      <th style={thG()}>Extra Breaks</th>
                      <th style={thG()}>Hours minus breaks</th>
                      <th style={thG()}>What was picked up</th>
                      <th style={thG()}>Kg picked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const entry = entries[day]
                      return (
                        <tr key={day} style={{ background: entry ? '#f6fff6' : '#fff' }}>
                          <td style={tdG()}><b>{day}</b></td>
                          <td style={tdG()}>{entry ? <EditableCell value={entry.actual_start?.slice(0,5)} field="actual_start" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdG()}>{entry ? <EditableCell value={entry.actual_finish?.slice(0,5)} field="actual_finish" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdG({ textAlign: 'center', color: '#888' })}>1 hour</td>
                          <td style={tdG({ textAlign: 'center' })}>{entry ? (entry.orange_break && entry.orange_break !== '0:00' ? entry.orange_break : '') : ''}</td>
                          <td style={tdG({ fontWeight: '700', color: entry ? '#2d6a2d' : '' })}>{entry ? <EditableCell value={entry.white_hours} field="white_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdG()}>{entry ? <EditableCell value={entry.what_work} field="what_work" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdG({ fontWeight: '700', color: entry?.kg_picked ? '#2d6a2d' : '' })}>{entry ? <EditableCell value={entry.kg_picked != null ? String(entry.kg_picked) : ''} field="kg_picked" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>When you have worked 4 hours, You need to have an eating break, minimum of 30 mins.</p>
              <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>START WORK 9:00, 9:15, 9:30 or 9:45. WORK DOES NOT START 9:05, 9:10, 9:20, 9:25 etc.</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('green')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  Download PDF
                </button>
                <button onClick={() => downloadExcel('green')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  Download Excel
                </button>
              </div>
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
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.white_start?.slice(0,5) : '', e ? e.white_finish?.slice(0,5) : '', '30 min', e ? (e.white_hours || '8:00') : '', e ? e.what_work : ''] })
      autoTable(doc, {
        startY: 32,
        head: [['Date','Start','Finish','Eating break','Hours minus breaks','What work']],
        body: rows,
        styles: { fontSize: 9, lineColor: [51,51,51], lineWidth: 0.3 },
        headStyles: { fillColor: [224,224,224], textColor: 0, fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        didParseCell: (data) => {
          if (data.section === 'body' && entries[rows[data.row.index][0]]) data.cell.styles.fillColor = [250,250,250]
        }
      })
      doc.save('white-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }

    if (tab === 'orange') {
      doc.setTextColor(180, 83, 9)
      doc.text('EXTRAWORK PAID BY THE HOUR', 14, 16)
      doc.setTextColor(0)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.orange_start?.slice(0,5) : '', e ? e.orange_finish?.slice(0,5) : '', e ? (e.orange_break || '0:00') : '', e ? e.orange_hours : '', e ? e.what_work : '', ''] })
      autoTable(doc, {
        startY: 26,
        head: [['Date','Start','Finish','Break','Hours minus breaks','What work','Signature']],
        body: rows,
        styles: { fontSize: 9, lineColor: [201,125,0], lineWidth: 0.3 },
        headStyles: { fillColor: [255,224,160], textColor: 0, fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,251,240] },
        didParseCell: (data) => {
          if (data.section === 'body' && entries[rows[data.row.index][0]]) data.cell.styles.fillColor = [255,248,225]
        }
      })
      doc.save('orange-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }

    if (tab === 'weekly') {
      doc.text('WEEKLY SUMMARY', 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const toHHMM = m => m > 0 ? Math.floor(m/60) + ':' + String(m%60).padStart(2,'0') : ''
      Array.from({ length: Math.min(Math.ceil(daysCount/7), 4) }, (_, wi) => {
        const ws = wi*7+1
        const wd = Array.from({length:7},(_,i)=>ws+i).filter(d=>d<=daysCount)
        const tw = wd.reduce((s,d)=>{ if(!entries[d]?.white_hours) return s; const p=entries[d].white_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const te = wd.reduce((s,d)=>{ if(!entries[d]?.orange_hours) return s; const p=entries[d].orange_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const startY = wi===0 ? 30 : (doc.lastAutoTable?.finalY||30)+10
        doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text('Week ' + (wi+1), 14, startY - 2)
        autoTable(doc, {
          startY,
          head: [['', ...wd.map(d=>'Day '+d), ...Array(7-wd.length).fill(''), 'Total']],
          body: [
            ['pickup hours', ...wd.map(()=>''), ...Array(7-wd.length).fill(''), ''],
            ['working hrs', ...wd.map(d=>entries[d]?(entries[d].white_hours||'8:00'):''), ...Array(7-wd.length).fill(''), toHHMM(tw)],
            ['extra hrs', ...wd.map(d=>entries[d]?entries[d].orange_hours:''), ...Array(7-wd.length).fill(''), toHHMM(te)],
            ['yes, I want to work extra hours   Signature: _______________________', ...Array(8).fill('')]
          ],
          styles: { fontSize: 8, halign: 'center', lineWidth: 0.3 },
          headStyles: { fillColor: [208,208,208], textColor: 0, fontStyle: 'bold' },
          columnStyles: { 0: { halign: 'left', cellWidth: 34 } },
          didParseCell: (data) => {
            if (data.section === 'body') {
              if (data.row.index === 0) { data.cell.styles.fillColor = [232,245,233]; data.cell.styles.textColor = [45,106,45]; if (data.column.index === 0) data.cell.styles.fontStyle = 'bold' }
              else if (data.row.index === 1) { data.cell.styles.fillColor = [250,250,250]; if (data.column.index === 0) data.cell.styles.fontStyle = 'bold' }
              else if (data.row.index === 2) { data.cell.styles.fillColor = [255,243,224]; data.cell.styles.textColor = [180,83,9]; if (data.column.index === 0) data.cell.styles.fontStyle = 'bold' }
              else if (data.row.index === 3) { data.cell.styles.fillColor = [255,255,255]; data.cell.styles.textColor = [0,0,0]; if (data.column.index === 0) data.cell.styles.colSpan = 9 }
            }
          }
        })
      })
      doc.save('weekly-summary-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }

    if (tab === 'green') {
      doc.setTextColor(45, 106, 45)
      doc.text('TIME USED FOR PICKUP, SALARY PAID BY KILOS', 14, 16)
      doc.setTextColor(0)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.actual_start?.slice(0,5) : '', e ? e.actual_finish?.slice(0,5) : '', '1 hour', e ? (e.orange_break && e.orange_break !== '0:00' ? e.orange_break : '') : '', e ? (e.white_hours || '') : '', e ? e.what_work : '', e?.kg_picked != null ? e.kg_picked : ''] })
      autoTable(doc, {
        startY: 26,
        head: [['Date','Start','Finish','Eating break','Extra breaks','Hours minus breaks','What was picked up','Kg picked']],
        body: rows,
        styles: { fontSize: 9, lineColor: [45,106,45], lineWidth: 0.3 },
        headStyles: { fillColor: [232,245,233], textColor: [45,106,45], fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        didParseCell: (data) => {
          if (data.section === 'body' && entries[rows[data.row.index][0]]) data.cell.styles.fillColor = [246,255,246]
        }
      })
      doc.save('green-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
  }

  function downloadExcel(tab) {
    const daysCount = getDaysInMonth(month, year)
    const monthName = MONTHS[month - 1] + ' ' + year
    const wb = XLSX.utils.book_new()
    const toHHMM = m => m > 0 ? Math.floor(m/60) + ':' + String(m%60).padStart(2,'0') : ''

    if (tab === 'white') {
      const data = [
        ['WORK PAID BY THE HOUR'],
        ['8 HOURS PER DAY / 40 HOURS PER WEEK'],
        ['Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName],
        [],
        ['Date', 'Start', 'Finish', 'Eating break', 'Hours minus breaks', 'What work'],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.white_start?.slice(0,5) : '', e ? e.white_finish?.slice(0,5) : '', '30 min', e ? (e.white_hours || '8:00') : '', e ? e.what_work : ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'White Paper')
      XLSX.writeFile(wb, 'white-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'orange') {
      const data = [
        ['EXTRAWORK PAID BY THE HOUR'],
        ['Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName],
        [],
        ['Date', 'Start', 'Finish', 'Break', 'Hours minus breaks', 'What work', 'Signature'],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.orange_start?.slice(0,5) : '', e ? e.orange_finish?.slice(0,5) : '', e ? (e.orange_break || '0:00') : '', e ? e.orange_hours : '', e ? e.what_work : '', ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Orange Paper')
      XLSX.writeFile(wb, 'orange-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'weekly') {
      Array.from({ length: Math.min(Math.ceil(daysCount/7), 4) }, (_, wi) => {
        const ws = wi*7+1
        const wd = Array.from({length:7},(_,i)=>ws+i).filter(d=>d<=daysCount)
        const tw = wd.reduce((s,d)=>{ if(!entries[d]?.white_hours) return s; const p=entries[d].white_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const te = wd.reduce((s,d)=>{ if(!entries[d]?.orange_hours) return s; const p=entries[d].orange_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const data = [
          wi === 0 ? ['WEEKLY SUMMARY'] : [],
          wi === 0 ? ['Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName] : [],
          wi === 0 ? [] : [],
          ['Week ' + (wi+1)],
          ['', ...wd.map(d=>'Day '+d), ...Array(7-wd.length).fill(''), 'Total'],
          ['pickup hours', ...wd.map(()=>''), ...Array(7-wd.length).fill(''), ''],
          ['working hrs', ...wd.map(d=>entries[d]?(entries[d].white_hours||'8:00'):''), ...Array(7-wd.length).fill(''), toHHMM(tw)],
          ['extra hrs', ...wd.map(d=>entries[d]?entries[d].orange_hours:''), ...Array(7-wd.length).fill(''), toHHMM(te)],
          ['yes, I want to work extra hours   Signature: _______________________'],
          []
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Week ' + (wi+1))
      })
      XLSX.writeFile(wb, 'weekly-summary-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'green') {
      const data = [
        ['TIME USED FOR PICKUP, SALARY PAID BY KILOS'],
        ['Name: ' + (worker?.full_name || '') + '   Work number: ' + (worker?.work_number || '') + '   ' + monthName],
        [],
        ['Date', 'Start', 'Finish', 'Eating break', 'Extra breaks', 'Hours minus breaks', 'What was picked up', 'Kg picked'],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.actual_start?.slice(0,5) : '', e ? e.actual_finish?.slice(0,5) : '', '1 hour', e ? (e.orange_break && e.orange_break !== '0:00' ? e.orange_break : '') : '', e ? (e.white_hours || '') : '', e ? e.what_work : '', e?.kg_picked != null ? e.kg_picked : ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Green Paper')
      XLSX.writeFile(wb, 'green-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }
  }

  return (
    <>
      <Head><title>Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '46px', width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {worker && (
              <button onClick={() => { setWorkNumInput(worker.work_number || ''); setWorkNumError(''); setWorkNumModal(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', color: '#444', fontWeight: '500' }}>#{worker.work_number} {worker.full_name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {worker?.role === 'admin' && (
              <button onClick={() => router.push('/admin')} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #2d6a2d', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#2d6a2d', fontWeight: '600' }}>Admin</button>
            )}
            <button onClick={logout} style={{ padding: '6px 14px', background: '#2d6a2d', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff', fontWeight: '600' }}>Sign out</button>
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>{'<'}</button>
              <div style={{ fontWeight: '700', fontSize: '16px', textAlign: 'center', whiteSpace: 'nowrap', flex: 1 }}>{MONTHS[month-1]} {year}</div>
              <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>{'>'}</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => setView('list')} style={{ padding: '7px 13px', background: view === 'list' ? '#2d6a2d' : '#fff', color: view === 'list' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>Days</button>
              <button onClick={() => setView('papers')} style={{ padding: '7px 13px', background: view === 'papers' ? '#2d6a2d' : '#fff', color: view === 'papers' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>Papers</button>
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
                            <span style={{ fontSize: '12px', color: '#555' }}>{entry.actual_start?.slice(0,5)} to {entry.actual_finish?.slice(0,5)}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#f0f0f0', color: '#555', padding: '2px 8px', borderRadius: '4px' }}>W: {entry.white_hours}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#fff3e0', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>O: {entry.orange_hours}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '4px' }}>Total: {entry.total_hours}</span>
                            {entry.kg_picked && <span style={{ fontSize: '11px', fontWeight: '700', background: '#e8f5e9', color: '#2d6a2d', padding: '2px 8px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>KG: {entry.kg_picked}</span>}
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
                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Total break (minutes)</label>
                            <input style={inp} type="number" min="30" placeholder="30" value={form.break_mins} onChange={e => setForm({...form, break_mins: e.target.value})} />
                            <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Min 30 min eating break</p>
                          </div>
                          <div style={{ flex: 2, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>What work</label>
                            <input style={inp} placeholder="e.g. cleaning, planting" value={form.work} onChange={e => setForm({...form, work: e.target.value})} />
                          </div>
                          {BERRY_SEASON && (
                            <div style={{ flex: 1, minWidth: '130px' }}>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#2d6a2d' }}>Kg picked (optional)</label>
                              <input style={inp} type="number" step="0.1" min="0" placeholder="e.g. 24.5" value={form.kg_picked} onChange={e => setForm({...form, kg_picked: e.target.value})} />
                            </div>
                          )}
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