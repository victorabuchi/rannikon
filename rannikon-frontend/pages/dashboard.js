import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { getWorker, isLoggedIn, clearAuth, saveAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const VALID = ['09:00','09:15','09:30','09:45']
const BERRY_SEASON = true

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

function hasOrangeWork(entry) {
  return !!(entry && entry.orange_hours && entry.orange_hours !== '0:00' && entry.orange_hours !== '0:0')
}

function EditableCell({ value, field, entryDate, onSave, style }) {
  const { t } = useLanguage()
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
      title={t('dashboard.clickToEdit')}
      style={{ cursor: 'pointer', display: 'block', minWidth: '40px', minHeight: '18px', padding: '1px 2px', borderRadius: '3px', transition: 'background 0.15s', ...style }}
      onMouseEnter={e => e.currentTarget.style.background = '#f0f7f0'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {val || <span style={{ color: '#ccc', fontSize: '11px' }}>—</span>}
    </span>
  )
}

export default function Dashboard() {
  const { t } = useLanguage()
  const router = useRouter()
  const [worker, setWorker] = useState(null)
  const [entries, setEntries] = useState({})
  const [greenEntries, setGreenEntries] = useState({})
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editDay, setEditDay] = useState(null)
  const [viewDay, setViewDay] = useState(null)
  const [form, setForm] = useState({ start: '', finish: '', work: '', break_mins: 30 })
  const [greenForm, setGreenForm] = useState({ start: '', finish: '', kg: '', what: '' })
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
    loadGreenEntries()
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

  async function loadGreenEntries() {
    try {
      const res = await api.get('/api/green/' + month + '/' + year)
      const map = {}
      res.data.entries.forEach(e => {
        const day = parseInt(e.entry_date.split('T')[0].split('-')[2])
        map[day] = e
      })
      setGreenEntries(map)
    } catch (err) { console.error(err) }
  }

  async function saveField(field, value, entryDate) {
    try {
      await api.patch('/api/timesheet/entry/' + entryDate + '/field', { field, value })
      await loadEntries()
    } catch (err) {
      console.error('Failed to save field', err)
    }
  }

  async function saveGreenField(field, value, entryDate) {
    try {
      await api.patch('/api/green/entry/' + entryDate + '/field', { field, value })
      await loadGreenEntries()
    } catch (err) {
      console.error('Failed to save green field', err)
    }
  }

  function openEdit(day) {
    const e = entries[day]
    setForm({
      start: e ? e.actual_start?.slice(0,5) || '' : '',
      finish: e ? e.actual_finish?.slice(0,5) || '' : '',
      work: e ? e.what_work || '' : '',
      break_mins: e ? (e.break_mins ?? 0) : 0
    })
    const ge = greenEntries[day]
    setGreenForm({ start: ge?.start_time?.slice(0,5) || '', finish: ge?.finish_time?.slice(0,5) || '', kg: ge?.kg_picked || '', what: ge?.what_picked || '' })
    setEditDay(day)
    setViewDay(null)
  }

  async function saveWorkNumber() {
    setWorkNumError('')
    if (!workNumInput.trim()) { setWorkNumError(t('dashboard.workNumberRequired')); return }
    setWorkNumSaving(true)
    try {
      const res = await api.patch('/api/auth/work-number', { work_number: workNumInput.trim() })
      saveAuth(res.data.token, res.data.worker)
      setWorker(res.data.worker)
      setWorkNumModal(false)
      setWorkNumInput('')
    } catch (err) {
      setWorkNumError(err.response?.data?.error || t('dashboard.failedUpdateWorkNumber'))
    } finally {
      setWorkNumSaving(false)
    }
  }

  async function deleteEntry(day) {
    const dateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0')
    try {
      await api.delete('/api/timesheet/entry/' + dateStr)
      const greenDateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0') + 'T12:00:00.000Z'
      try { await api.delete('/api/green/entry/' + greenDateStr) } catch {}
      await loadEntries()
      await loadGreenEntries()
      setConfirmDelete(null)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.status || err?.message || t('housemaster.unknown')
      alert(t('dashboard.deleteFailedPrefix') + msg)
    }
  }

  async function saveEntry() {
    if (!form.start || !form.finish) { setError(t('dashboard.startFinishRequired')); return }
    setSaving(true)
    setError('')
    try {
      const dateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(editDay).padStart(2,'0')
      await api.post('/api/timesheet/entry', {
        entry_date: dateStr,
        actual_start: form.start,
        actual_finish: form.finish,
        what_work: form.work,
        break_mins: parseInt(form.break_mins) ?? 0
      })
      await loadEntries()
      if (greenForm.start || greenForm.finish || greenForm.kg || greenForm.what) {
        const greenDateStr = year + '-' + String(month).padStart(2,'0') + '-' + String(editDay).padStart(2,'0') + 'T12:00:00.000Z'
        await api.post('/api/green/entry', {
          entry_date: greenDateStr,
          start_time: greenForm.start || null,
          finish_time: greenForm.finish || null,
          kg_picked: greenForm.kg ? parseFloat(greenForm.kg) : null,
          what_picked: greenForm.what || ''
        })
        await loadGreenEntries()
      }
      setEditDay(null)
    } catch (err) {
      setError(err.response?.data?.error || t('dashboard.failedToSave'))
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

  function InlineDayView({ day, entry, ge }) {
    return (
      <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '12px', overflowX: 'auto' }}>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px' }}>{t('papers.whitePaper').toUpperCase()}: {t('papers.workPaidByHour')}</p>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>{t('papers.hoursPerDayWeek')}</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thW()}>{t('papers.date')}</th>
                <th style={thW()}>{t('papers.start')}</th>
                <th style={thW()}>{t('papers.finish')}</th>
                <th style={thW()}>{t('papers.eatingBreak')}</th>
                <th style={thW()}>{t('papers.hoursMinusBreaks')}</th>
                <th style={thW()}>{t('papers.whatWork')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#fafafa' }}>
                <td style={tdW()}><b>{day}</b></td>
                <td style={tdW()}>{entry.white_start?.slice(0,5)}</td>
                <td style={tdW()}>{entry.white_finish?.slice(0,5)}</td>
                <td style={tdW({ textAlign: 'center' })}>{t('papers.thirtyMin')}</td>
                <td style={tdW({ fontWeight: '700', color: '#2d6a2d' })}>{entry.white_hours}</td>
                <td style={tdW()}>{entry.what_work}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontStyle: 'italic' }}>{t('papers.eatingBreakFull')}</p>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#b45309' }}>{t('papers.orangePaper').toUpperCase()}: {t('papers.extraWorkPaidByHour')}</p>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>{t('papers.maxHoursWeekday')} | {t('papers.maxHoursSaturday')}</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thO()}>{t('papers.date')}</th>
                <th style={thO()}>{t('papers.start')}</th>
                <th style={thO()}>{t('papers.finish')}</th>
                <th style={thO()}>{t('housemaster.breakShort')}</th>
                <th style={thO()}>{t('papers.hoursMinusBreaks')}</th>
                <th style={thO()}>{t('papers.whatWork')}</th>
                <th style={thO()}>{t('papers.signature')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdO()}><b>{day}</b></td>
                <td style={tdO()}>{hasOrangeWork(entry) ? entry.orange_start?.slice(0,5) : ''}</td>
                <td style={tdO()}>{hasOrangeWork(entry) ? entry.orange_finish?.slice(0,5) : ''}</td>
                <td style={tdO({ textAlign: 'center' })}>{hasOrangeWork(entry) ? (entry.orange_break || '0:00') : ''}</td>
                <td style={tdO({ fontWeight: '700', color: hasOrangeWork(entry) ? '#b45309' : '' })}>{hasOrangeWork(entry) ? entry.orange_hours : ''}</td>
                <td style={tdO()}>{hasOrangeWork(entry) ? entry.what_work : ''}</td>
                <td style={tdO()}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', marginBottom: '16px', fontStyle: 'italic' }}>{t('papers.startWorkNote')}</p>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '6px', color: '#1565c0' }}>{t('papers.weeklySummary').toUpperCase()}</p>
        <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '540px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thB({ textAlign: 'left', minWidth: '140px' })}>{t('papers.type')}</th>
                <th style={thB()}>{t('papers.daysShort')[1]}</th>
                <th style={thB()}>{t('papers.daysShort')[2]}</th>
                <th style={thB()}>{t('papers.daysShort')[3]}</th>
                <th style={thB()}>{t('papers.daysShort')[4]}</th>
                <th style={thB()}>{t('papers.daysShort')[5]}</th>
                <th style={thB()}>{t('papers.daysShort')[6]} ({t('papers.max11')})</th>
                <th style={thB()}>{t('papers.daysShort')[0]}</th>
                <th style={thB()}>{t('papers.totalHours')}</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#e8f5e9' }}>
                <td style={tdG({ textAlign: 'left', fontWeight: '700' })}>{t('days.berryPicking')} (kg)</td>
                <td style={tdG()}></td><td style={tdG()}></td><td style={tdG()}></td><td style={tdG()}></td><td style={tdG()}></td><td style={tdG()}></td>
                <td style={tdG({ color: '#999' })}>X</td>
                <td style={tdG({ fontWeight: '700', color: '#2d6a2d' })}>{ge?.kg_picked != null ? ge.kg_picked : ''}</td>
              </tr>
              <tr>
                <td style={tdB({ textAlign: 'left', fontWeight: '600' })}>{t('papers.regHrs')} ({t('papers.max8')})</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#2d6a2d' })}>{entry.white_hours}</td>
              </tr>
              <tr>
                <td style={tdB({ textAlign: 'left', fontWeight: '600' })}>{t('papers.extraHrs')} ({t('papers.max3')})</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#b45309' })}>{entry.orange_hours}</td>
              </tr>
              <tr style={{ background: '#e3f2fd' }}>
                <td style={tdB({ textAlign: 'left', fontWeight: '700' })}>{t('papers.total')}</td>
                <td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td><td style={tdB()}></td>
                <td style={tdB({ color: '#999' })}>X</td>
                <td style={tdB({ fontWeight: '700', color: '#1565c0', fontSize: '13px' })}>{entry.total_hours}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style={{ fontWeight: '800', fontSize: '13px', marginBottom: '2px', color: '#2d6a2d' }}>{t('papers.greenPaperTitle')}</p>
        <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '580px', width: '100%', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={thG()}>{t('papers.date')}</th>
                <th style={thG()}>{t('papers.start')}</th>
                <th style={thG()}>{t('papers.finish')}</th>
                <th style={thG()}>{t('papers.eatingBreak')}</th>
                <th style={thG()}>{t('papers.extraBreaks')}</th>
                <th style={thG()}>{t('papers.hoursMinusBreaks')}</th>
                <th style={thG()}>{t('days.whatPicked')}</th>
                <th style={thG()}>{t('days.kgPicked')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdG()}><b>{day}</b></td>
                <td style={tdG()}>{ge?.start_time?.slice(0,5)}</td>
                <td style={tdG()}>{ge?.finish_time?.slice(0,5)}</td>
                <td style={tdG({ textAlign: 'center' })}>{t('papers.oneHour')}</td>
                <td style={tdG({ textAlign: 'center' })}></td>
                <td style={tdG()}></td>
                <td style={tdG()}>{ge?.what_picked}</td>
                <td style={tdG({ fontWeight: '700', color: '#2d6a2d' })}>{ge?.kg_picked != null ? ge.kg_picked : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>{t('papers.kiloPerHourNote')}</p>
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
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.papersLabel')}</p>
          {navBtn('white', t('papers.whitePaper'), t('dashboard.whitePaperSub'))}
          {navBtn('orange', t('papers.orangePaper'), t('dashboard.orangePaperSub'))}
          {navBtn('weekly', t('papers.weeklySummary'), t('dashboard.weeklySub'))}
          {navBtn('green', t('papers.greenPaper'), t('days.berryPicking'))}
        </div>

        <div style={{ flex: 1, padding: '16px', overflowX: 'auto' }}>

          {activeTab === 'white' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{t('papers.workPaidByHour')}</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>{t('papers.hoursPerDayWeek')}</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>{t('housemaster.name')}: <b>{worker?.full_name}</b> &nbsp;&nbsp; {t('auth.workNumber')}: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thW()}>{t('papers.date')}</th>
                      <th style={thW()}>{t('papers.start')}</th>
                      <th style={thW()}>{t('papers.finish')}</th>
                      <th style={thW()}>{t('papers.eatingBreak')}</th>
                      <th style={thW()}>{t('papers.hoursMinusBreaks')}</th>
                      <th style={thW()}>{t('papers.whatWork')}</th>
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
                          <td style={tdW({ textAlign: 'center' })}>{t('papers.thirtyMin')}</td>
                          <td style={tdW({ fontWeight: '700', color: entry ? '#2d6a2d' : '' })}>{entry ? <EditableCell value={entry.white_hours || '8:00'} field="white_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdW()}>{entry ? <EditableCell value={entry.what_work} field="what_work" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>{t('papers.eatingBreakShort')}</p>
              <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>{t('papers.startWorkCaps')}</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('white')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  {t('papers.downloadPDF')}
                </button>
                <button onClick={() => downloadExcel('white')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  {t('papers.downloadExcel')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'orange' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px', color: '#b45309' }}>{t('papers.extraWorkPaidByHour')}</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>{t('papers.maxHoursWeekday')}</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px' }}>{t('papers.maxHoursSaturday')}</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>{t('housemaster.name')}: <b>{worker?.full_name}</b> &nbsp;&nbsp; {t('auth.workNumber')}: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%', fontSize: '12px', background: '#fffbf0' }}>
                  <thead>
                    <tr>
                      <th style={thO()}>{t('papers.date')}</th>
                      <th style={thO()}>{t('papers.start')}</th>
                      <th style={thO()}>{t('papers.finish')}</th>
                      <th style={thO()}>{t('housemaster.breakShort')}</th>
                      <th style={thO()}>{t('papers.hoursMinusBreaks')}</th>
                      <th style={thO()}>{t('papers.whatWork')}</th>
                      <th style={thO()}>{t('papers.signature')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const entry = entries[day]
                      const hasOrange = hasOrangeWork(entry)
                      return (
                        <tr key={day} style={{ background: hasOrange ? '#fff8e1' : '#fffbf0' }}>
                          <td style={tdO()}><b>{day}</b></td>
                          <td style={tdO()}>{hasOrange ? <EditableCell value={entry.orange_start?.slice(0,5)} field="orange_start" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}>{hasOrange ? <EditableCell value={entry.orange_finish?.slice(0,5)} field="orange_finish" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO({ textAlign: 'center' })}>{hasOrange ? (entry.orange_break || '0:00') : ''}</td>
                          <td style={tdO({ fontWeight: '700', color: hasOrange ? '#b45309' : '' })}>{hasOrange ? <EditableCell value={entry.orange_hours} field="orange_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}>{hasOrange ? <EditableCell value={entry.what_work} field="what_work" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')} onSave={saveField} /> : ''}</td>
                          <td style={tdO()}></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>{t('papers.startWorkNote')}</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('orange')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  {t('papers.downloadPDF')}
                </button>
                <button onClick={() => downloadExcel('orange')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  {t('papers.downloadExcel')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'weekly' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px' }}>{t('papers.weeklySummary').toUpperCase()}</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '12px' }}>{t('housemaster.name')}: <b>{worker?.full_name}</b> &nbsp;&nbsp; {t('auth.workNumber')}: <b>{worker?.work_number}</b></p>
              {Array.from({ length: Math.min(Math.ceil(days / 7), 4) }, (_, weekIdx) => {
                const weekStart = weekIdx * 7 + 1
                const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i).filter(d => d <= days)
                const DAY_NAMES = t('papers.daysShort')
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
                const totalKg = validDays.reduce((sum, x) => {
                  if (x.isSun) return sum
                  const ge = greenEntries[x.d]
                  return ge?.kg_picked != null ? sum + (Number(ge.kg_picked) || 0) : sum
                }, 0)
                const thW2 = (extra) => ({ border: '1px solid #333', padding: '5px 6px', textAlign: 'center', background: '#e0e0e0', fontSize: '11px', fontWeight: '700', ...extra })
                const tdW2 = (extra) => ({ border: '1px solid #333', padding: '5px 6px', fontSize: '11px', textAlign: 'center', ...extra })
                const tdO2 = (extra) => ({ border: '1px solid #c97d00', padding: '5px 6px', fontSize: '11px', textAlign: 'center', background: '#fffbf0', ...extra })
                const tdG2 = (extra) => ({ border: '1px solid #2d6a2d', padding: '5px 6px', fontSize: '11px', textAlign: 'center', background: '#f6fff6', ...extra })
                return (
                  <div key={weekIdx} style={{ marginBottom: '20px' }}>
                    <p style={{ fontWeight: '800', fontSize: '12px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('papers.week')} {weekIdx + 1}</p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}>
                        <thead>
                          <tr>
                            <th style={thW2({ textAlign: 'left', minWidth: '130px', background: '#d0d0d0' })}></th>
                            {dayInfos.map(({ d, name, exists, isSun, isSat }) => (
                              <th key={d} style={thW2({ minWidth: '44px', background: isSun ? '#e8e8e8' : '#e0e0e0', color: isSun ? '#999' : '#1a1a18' })}>
                                {name || ''}<br/>
                                {exists && !isSun && <span style={{ fontSize: '9px', fontWeight: '400', color: '#666' }}>{isSat ? t('papers.max11') : t('papers.max3')}</span>}
                              </th>
                            ))}
                            <th style={thW2({ minWidth: '60px', background: '#d0d0d0' })}>
                              {t('papers.total').toLowerCase()}<br/><span style={{ fontSize: '9px', fontWeight: '400' }}>{t('papers.hours').toLowerCase()}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Green row — berry picking (kg) */}
                          <tr>
                            <td style={tdG2({ textAlign: 'left', fontWeight: '700', color: '#2d6a2d', background: '#e8f5e9' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#2d6a2d', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              {t('days.berryPicking')} (kg)
                            </td>
                            {dayInfos.map(({ d, isSun, exists }) => (
                              <td key={d} style={tdG2({ color: isSun ? '#bbb' : '#2d6a2d', background: '#e8f5e9', fontWeight: '700' })}>
                                {isSun ? 'X' : (greenEntries[d]?.kg_picked != null ? greenEntries[d].kg_picked : '')}
                              </td>
                            ))}
                            <td style={tdG2({ fontWeight: '700', color: '#2d6a2d', background: '#e8f5e9' })}>
                              {totalKg > 0 ? Math.round(totalKg * 100) / 100 : ''}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>kg</div>
                            </td>
                          </tr>
                          {/* White row — working hours */}
                          <tr>
                            <td style={tdW2({ textAlign: 'left', fontWeight: '700', background: '#fafafa' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#ccc', border: '1px solid #999', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              {t('papers.regHrs')}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>{t('papers.max8')}</div>
                            </td>
                            {dayInfos.map(({ d, isSun, exists }) => (
                              <td key={d} style={tdW2({ fontWeight: entries[d] ? '700' : '400', background: '#fafafa', color: isSun ? '#bbb' : (entries[d] ? '#1a1a18' : '#ccc') })}>
                                {isSun ? 'X' : (entries[d] ? <EditableCell value={entries[d].white_hours || '8:00'} field="white_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0')} onSave={saveField} /> : '')}
                              </td>
                            ))}
                            <td style={tdW2({ fontWeight: '700', background: '#fafafa' })}>
                              {minsToHHMM(totalWorking)}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>{t('papers.max40')}</div>
                            </td>
                          </tr>
                          {/* Orange row — extra hours */}
                          <tr>
                            <td style={tdO2({ textAlign: 'left', fontWeight: '700', color: '#b45309', background: '#fff3e0' })}>
                              <span style={{ display: 'inline-block', width: '9px', height: '9px', background: '#f59e0b', borderRadius: '2px', marginRight: '5px', verticalAlign: 'middle' }}/>
                              {t('papers.extraHrs')} / lisatyö
                            </td>
                            {dayInfos.map(({ d, isSun, exists, isSat }) => (
                              <td key={d} style={tdO2({ fontWeight: entries[d] ? '700' : '400', background: '#fff3e0', color: isSun ? '#bbb' : (entries[d] ? '#b45309' : '#ccc') })}>
                                {isSun ? 'X' : (entries[d] ? <EditableCell value={entries[d].orange_hours} field="orange_hours" entryDate={year+'-'+String(month).padStart(2,'0')+'-'+String(d).padStart(2,'0')} onSave={saveField} /> : '')}
                              </td>
                            ))}
                            <td style={tdO2({ fontWeight: '700', color: '#b45309', background: '#fff3e0' })}>
                              {minsToHHMM(totalExtra)}
                              <div style={{ fontSize: '9px', color: '#888', fontWeight: '400' }}>{t('papers.max17Week')}</div>
                            </td>
                          </tr>
                          {/* Yes / Signature row */}
                          <tr>
                            <td colSpan={9} style={{ border: '1px solid #333', padding: '6px 10px', fontSize: '11px', background: '#fff' }}>
                              {t('papers.yesWantExtraHours')} &nbsp;☐&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {t('papers.signature')}: _______________________
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
                  {t('papers.downloadPDF')}
                </button>
                <button onClick={() => downloadExcel('weekly')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  {t('papers.downloadExcel')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'green' && (
            <div>
              <p style={{ fontWeight: '800', fontSize: '14px', marginBottom: '2px', color: '#2d6a2d' }}>{t('papers.greenPaperTitle')}</p>
              <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '2px', color: '#c0392b' }}>{t('papers.kiloPerHourNote')}</p>
              <p style={{ fontSize: '11px', color: '#333', marginBottom: '10px' }}>{t('housemaster.name')}: <b>{worker?.full_name}</b> &nbsp;&nbsp; {t('auth.workNumber')}: <b>{worker?.work_number}</b></p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: '640px', width: '100%', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={thG()}>{t('papers.date')}</th>
                      <th style={thG()}>{t('papers.start')}</th>
                      <th style={thG()}>{t('papers.finish')}</th>
                      <th style={thG()}>{t('papers.eatingBreak')}</th>
                      <th style={thG()}>{t('papers.extraBreaks')}</th>
                      <th style={thG()}>{t('papers.hoursMinusBreaks')}</th>
                      <th style={thG()}>{t('days.whatPicked')}</th>
                      <th style={thG()}>{t('days.kgPicked')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                      const ge = greenEntries[day]
                      const dateStr = year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0')
                      return (
                        <tr key={day} style={{ background: ge ? '#f6fff6' : '#fff' }}>
                          <td style={tdG()}><b>{day}</b></td>
                          <td style={tdG()}><EditableCell value={ge?.start_time?.slice(0,5)} field="start_time" entryDate={dateStr} onSave={saveGreenField} /></td>
                          <td style={tdG()}><EditableCell value={ge?.finish_time?.slice(0,5)} field="finish_time" entryDate={dateStr} onSave={saveGreenField} /></td>
                          <td style={tdG({ textAlign: 'center', color: '#888' })}>{t('papers.oneHour')}</td>
                          <td style={tdG({ textAlign: 'center' })}></td>
                          <td style={tdG()}></td>
                          <td style={tdG()}><EditableCell value={ge?.what_picked} field="what_picked" entryDate={dateStr} onSave={saveGreenField} /></td>
                          <td style={tdG({ fontWeight: '700', color: ge?.kg_picked ? '#2d6a2d' : '' })}><EditableCell value={ge?.kg_picked != null ? String(ge.kg_picked) : ''} field="kg_picked" entryDate={dateStr} onSave={saveGreenField} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>{t('papers.eatingBreakShort')}</p>
              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                <button onClick={() => downloadPDF('green')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">PDF</text></svg>
                  {t('papers.downloadPDF')}
                </button>
                <button onClick={() => downloadExcel('green')} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', background: '#fff', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', color: '#333' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial,sans-serif" fill="white">XLS</text></svg>
                  {t('papers.downloadExcel')}
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
    const localizedMonth = t('months')[month - 1] + ' ' + year

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')

    if (tab === 'white') {
      doc.text(t('papers.workPaidByHour'), 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(t('papers.hoursPerDayWeek'), 14, 22)
      doc.text(t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth, 14, 28)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.white_start?.slice(0,5) : '', e ? e.white_finish?.slice(0,5) : '', t('papers.thirtyMin'), e ? (e.white_hours || '8:00') : '', e ? e.what_work : ''] })
      autoTable(doc, {
        startY: 32,
        head: [[t('papers.date'), t('papers.start'), t('papers.finish'), t('papers.eatingBreak'), t('papers.hoursMinusBreaks'), t('papers.whatWork')]],
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
      doc.text(t('papers.extraWorkPaidByHour'), 14, 16)
      doc.setTextColor(0)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; const o = hasOrangeWork(e); return [d, o ? e.orange_start?.slice(0,5) : '', o ? e.orange_finish?.slice(0,5) : '', o ? (e.orange_break || '0:00') : '', o ? e.orange_hours : '', o ? e.what_work : '', ''] })
      autoTable(doc, {
        startY: 26,
        head: [[t('papers.date'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('papers.hoursMinusBreaks'), t('papers.whatWork'), t('papers.signature')]],
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
      doc.text(t('papers.weeklySummary').toUpperCase(), 14, 16)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth, 14, 22)
      const toHHMM = m => m > 0 ? Math.floor(m/60) + ':' + String(m%60).padStart(2,'0') : ''
      Array.from({ length: Math.min(Math.ceil(daysCount/7), 4) }, (_, wi) => {
        const ws = wi*7+1
        const wd = Array.from({length:7},(_,i)=>ws+i).filter(d=>d<=daysCount)
        const tw = wd.reduce((s,d)=>{ if(!entries[d]?.white_hours) return s; const p=entries[d].white_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const te = wd.reduce((s,d)=>{ if(!entries[d]?.orange_hours) return s; const p=entries[d].orange_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const tk = wd.reduce((s,d)=>{ const ge=greenEntries[d]; return ge?.kg_picked != null ? s+(Number(ge.kg_picked)||0) : s },0)
        const startY = wi===0 ? 30 : (doc.lastAutoTable?.finalY||30)+10
        doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text(t('papers.week') + ' ' + (wi+1), 14, startY - 2)
        autoTable(doc, {
          startY,
          head: [['', ...wd.map(d=>t('papers.day')+' '+d), ...Array(7-wd.length).fill(''), t('papers.total')]],
          body: [
            [t('days.berryPicking') + ' (kg)', ...wd.map(d=>{ const ge=greenEntries[d]; return ge?.kg_picked != null ? ge.kg_picked : '' }), ...Array(7-wd.length).fill(''), tk > 0 ? Math.round(tk*100)/100 : ''],
            [t('papers.regHrs'), ...wd.map(d=>entries[d]?(entries[d].white_hours||'8:00'):''), ...Array(7-wd.length).fill(''), toHHMM(tw)],
            [t('papers.extraHrs'), ...wd.map(d=>entries[d]?entries[d].orange_hours:''), ...Array(7-wd.length).fill(''), toHHMM(te)],
            [t('papers.yesWantExtraHours') + '   ' + t('papers.signature') + ': _______________________', ...Array(8).fill('')]
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
      doc.text(t('papers.greenPaperTitle'), 14, 16)
      doc.setTextColor(0)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text(t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth, 14, 22)
      const rows = Array.from({ length: daysCount }, (_, i) => { const d = i+1; const ge = greenEntries[d]; return [d, ge?.start_time?.slice(0,5) || '', ge?.finish_time?.slice(0,5) || '', t('papers.oneHour'), '', '', ge?.what_picked || '', ge?.kg_picked != null ? ge.kg_picked : ''] })
      autoTable(doc, {
        startY: 26,
        head: [[t('papers.date'), t('papers.start'), t('papers.finish'), t('papers.eatingBreak'), t('papers.extraBreaks'), t('papers.hoursMinusBreaks'), t('days.whatPicked'), t('days.kgPicked')]],
        body: rows,
        styles: { fontSize: 9, lineColor: [45,106,45], lineWidth: 0.3 },
        headStyles: { fillColor: [232,245,233], textColor: [45,106,45], fontStyle: 'bold' },
        bodyStyles: { fillColor: [255,255,255] },
        didParseCell: (data) => {
          if (data.section === 'body' && greenEntries[rows[data.row.index][0]]) data.cell.styles.fillColor = [246,255,246]
        }
      })
      doc.save('green-paper-' + monthName + '-' + (worker?.work_number || '') + '.pdf')
    }
  }

  function downloadExcel(tab) {
    const daysCount = getDaysInMonth(month, year)
    const monthName = MONTHS[month - 1] + ' ' + year
    const localizedMonth = t('months')[month - 1] + ' ' + year
    const wb = XLSX.utils.book_new()
    const toHHMM = m => m > 0 ? Math.floor(m/60) + ':' + String(m%60).padStart(2,'0') : ''

    if (tab === 'white') {
      const data = [
        [t('papers.workPaidByHour')],
        [t('papers.hoursPerDayWeek')],
        [t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth],
        [],
        [t('papers.date'), t('papers.start'), t('papers.finish'), t('papers.eatingBreak'), t('papers.hoursMinusBreaks'), t('papers.whatWork')],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; return [d, e ? e.white_start?.slice(0,5) : '', e ? e.white_finish?.slice(0,5) : '', t('papers.thirtyMin'), e ? (e.white_hours || '8:00') : '', e ? e.what_work : ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('papers.whitePaper'))
      XLSX.writeFile(wb, 'white-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'orange') {
      const data = [
        [t('papers.extraWorkPaidByHour')],
        [t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth],
        [],
        [t('papers.date'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('papers.hoursMinusBreaks'), t('papers.whatWork'), t('papers.signature')],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const e = entries[d]; const o = hasOrangeWork(e); return [d, o ? e.orange_start?.slice(0,5) : '', o ? e.orange_finish?.slice(0,5) : '', o ? (e.orange_break || '0:00') : '', o ? e.orange_hours : '', o ? e.what_work : '', ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('papers.orangePaper'))
      XLSX.writeFile(wb, 'orange-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'weekly') {
      Array.from({ length: Math.min(Math.ceil(daysCount/7), 4) }, (_, wi) => {
        const ws = wi*7+1
        const wd = Array.from({length:7},(_,i)=>ws+i).filter(d=>d<=daysCount)
        const tw = wd.reduce((s,d)=>{ if(!entries[d]?.white_hours) return s; const p=entries[d].white_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const te = wd.reduce((s,d)=>{ if(!entries[d]?.orange_hours) return s; const p=entries[d].orange_hours.split(':'); return s+parseInt(p[0])*60+parseInt(p[1]) },0)
        const tk = wd.reduce((s,d)=>{ const ge=greenEntries[d]; return ge?.kg_picked != null ? s+(Number(ge.kg_picked)||0) : s },0)
        const data = [
          wi === 0 ? [t('papers.weeklySummary').toUpperCase()] : [],
          wi === 0 ? [t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth] : [],
          wi === 0 ? [] : [],
          [t('papers.week') + ' ' + (wi+1)],
          ['', ...wd.map(d=>t('papers.day')+' '+d), ...Array(7-wd.length).fill(''), t('papers.total')],
          [t('days.berryPicking') + ' (kg)', ...wd.map(d=>{ const ge=greenEntries[d]; return ge?.kg_picked != null ? ge.kg_picked : '' }), ...Array(7-wd.length).fill(''), tk > 0 ? Math.round(tk*100)/100 : ''],
          [t('papers.regHrs'), ...wd.map(d=>entries[d]?(entries[d].white_hours||'8:00'):''), ...Array(7-wd.length).fill(''), toHHMM(tw)],
          [t('papers.extraHrs'), ...wd.map(d=>entries[d]?entries[d].orange_hours:''), ...Array(7-wd.length).fill(''), toHHMM(te)],
          [t('papers.yesWantExtraHours') + '   ' + t('papers.signature') + ': _______________________'],
          []
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('papers.week') + ' ' + (wi+1))
      })
      XLSX.writeFile(wb, 'weekly-summary-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }

    if (tab === 'green') {
      const data = [
        [t('papers.greenPaperTitle')],
        [t('housemaster.name') + ': ' + (worker?.full_name || '') + '   ' + t('auth.workNumber') + ': ' + (worker?.work_number || '') + '   ' + localizedMonth],
        [],
        [t('papers.date'), t('papers.start'), t('papers.finish'), t('papers.eatingBreak'), t('papers.extraBreaks'), t('papers.hoursMinusBreaks'), t('days.whatPicked'), t('days.kgPicked')],
        ...Array.from({ length: daysCount }, (_, i) => { const d = i+1; const ge = greenEntries[d]; return [d, ge?.start_time?.slice(0,5) || '', ge?.finish_time?.slice(0,5) || '', t('papers.oneHour'), '', '', ge?.what_picked || '', ge?.kg_picked != null ? ge.kg_picked : ''] })
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('papers.greenPaper'))
      XLSX.writeFile(wb, 'green-paper-' + monthName + '-' + (worker?.work_number || '') + '.xlsx')
    }
  }

  return (
    <>
      <Head><title>Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '46px', width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
              <button onClick={() => router.push('/admin')} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #2d6a2d', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#2d6a2d', fontWeight: '600' }}>{t('housemaster.adminBtn')}</button>
            )}
            <button onClick={logout} style={{ padding: '6px 14px', background: '#2d6a2d', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#fff', fontWeight: '600' }}>{t('nav.signOut')}</button>
            <LanguageSelector className="lang-full" />
            <LanguageSelector compact className="lang-compact" />
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
                {t('dashboard.tempWorkNumberPrefix')} ({worker.work_number}). {t('dashboard.tempWorkNumberSuffix')}
              </span>
            </div>
            <button onClick={() => { setWorkNumInput(''); setWorkNumError(''); setWorkNumModal(true) }}
              style={{ padding: '5px 14px', background: '#b45309', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t('dashboard.setWorkNumber')}
            </button>
          </div>
        )}

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '12px 16px 16px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>{'<'}</button>
              <div style={{ fontWeight: '700', fontSize: '16px', textAlign: 'center', whiteSpace: 'nowrap', flex: 1 }}>{t('months')[month-1]} {year}</div>
              <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}>{'>'}</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => setView('list')} style={{ padding: '7px 13px', background: view === 'list' ? '#2d6a2d' : '#fff', color: view === 'list' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('dashboard.daysTab')}</button>
              <button onClick={() => setView('papers')} style={{ padding: '7px 13px', background: view === 'papers' ? '#2d6a2d' : '#fff', color: view === 'papers' ? '#fff' : '#333', border: '1px solid #ccc', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('dashboard.papersLabel')}</button>
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
                        <span style={{ fontWeight: '800', fontSize: '15px', minWidth: '55px' }}>{t('papers.day')} {day}</span>
                        {hasEntry ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>{entry.actual_start?.slice(0,5)} {t('dashboard.to')} {entry.actual_finish?.slice(0,5)}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#f0f0f0', color: '#555', padding: '2px 8px', borderRadius: '4px' }}>W: {entry.white_hours}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#fff3e0', color: '#b45309', padding: '2px 8px', borderRadius: '4px' }}>O: {entry.orange_hours}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '4px' }}>{t('papers.total')}: {entry.total_hours}</span>
                            {greenEntries[day]?.kg_picked && (
                              <span style={{ fontSize: '11px', fontWeight: '700', background: '#e8f5e9', color: '#2d6a2d', padding: '2px 8px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                                KG: {greenEntries[day].kg_picked}
                              </span>
                            )}
                            {entry.what_work && <span style={{ fontSize: '11px', color: '#888' }}>{entry.what_work}</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#bbb' }}>{t('days.noEntry')}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                        {hasEntry && (
                          <button
                            onClick={() => setViewDay(viewDay === day ? null : day)}
                            style={{ padding: '5px 10px', background: viewDay === day ? '#2d6a2d' : '#e8f5e9', border: '1px solid #2d6a2d', borderRadius: '6px', fontSize: '12px', color: viewDay === day ? '#fff' : '#2d6a2d', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {viewDay === day ? t('dashboard.hide') : t('days.view')}
                          </button>
                        )}
                        <button
                          onClick={() => { openEdit(editDay === day ? null : day) }}
                          style={{ padding: '5px 12px', background: hasEntry ? '#fff' : '#2d6a2d', border: hasEntry ? '1px solid #ccc' : 'none', borderRadius: '6px', fontSize: '12px', color: hasEntry ? '#333' : '#fff', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {editDay === day ? t('dashboard.close') : hasEntry ? t('days.edit') : t('days.add')}
                        </button>
                        {hasEntry && confirmDelete !== day && (
                          <button onClick={() => setConfirmDelete(day)}
                            style={{ padding: '5px 10px', background: '#fdecea', border: '1px solid #ffc1c0', borderRadius: '6px', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {t('days.delete')}
                          </button>
                        )}
                        {hasEntry && confirmDelete === day && (
                          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '28px 32px', maxWidth: '340px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                              <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '8px' }}>{t('dashboard.deleteDayTitle')} {day}?</h3>
                              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.5', marginBottom: '20px' }}>{t('dashboard.deleteDayDesc')}</p>
                              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={() => setConfirmDelete(null)}
                                  style={{ padding: '10px 24px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                                  {t('sup.cancel')}
                                </button>
                                <button onClick={() => deleteEntry(day)}
                                  style={{ padding: '10px 24px', background: '#c0392b', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>
                                  {t('dashboard.yesDelete')}
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
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('dashboard.actualStartTime')}</label>
                            <input style={inp} placeholder={t('dashboard.startTimePlaceholder')} value={form.start} onChange={e => setForm({...form, start: e.target.value})} />
                            {form.start && !VALID.includes(form.start) && <p style={{ color: 'orange', fontSize: '11px', margin: '2px 0 0' }}>{t('dashboard.shouldBeTime')}</p>}
                          </div>
                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('dashboard.actualFinishTime')}</label>
                            <input style={inp} placeholder={t('dashboard.finishTimePlaceholder')} value={form.finish} onChange={e => setForm({...form, finish: e.target.value})} />
                          </div>
                          <div style={{ flex: 1, minWidth: '130px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.breakMins')}</label>
                            <input style={inp} type="number" min="30" placeholder="30" value={form.break_mins} onChange={e => setForm({...form, break_mins: e.target.value})} />
                            <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{t('dashboard.min30Break')}</p>
                          </div>
                          <div style={{ flex: 2, minWidth: '180px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.whatWork')}</label>
                            <input style={inp} placeholder={t('dashboard.whatWorkPlaceholder')} value={form.work} onChange={e => setForm({...form, work: e.target.value})} />
                          </div>
                        </div>

                        {BERRY_SEASON && (
                          <div style={{ borderTop: '2px solid #e8f5e9', marginTop: '16px', paddingTop: '16px' }}>
                            <p style={{ fontSize: '13px', fontWeight: '800', color: '#2d6a2d', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dashboard.berryPickingGreenPaper')}</p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '120px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.startTime')}</label>
                                <input style={inp} placeholder={t('dashboard.hhmmPlaceholder')} value={greenForm.start} onChange={e => setGreenForm({...greenForm, start: e.target.value})} />
                              </div>
                              <div style={{ flex: 1, minWidth: '120px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.finishTime')}</label>
                                <input style={inp} placeholder={t('dashboard.hhmmPlaceholder')} value={greenForm.finish} onChange={e => setGreenForm({...greenForm, finish: e.target.value})} />
                              </div>
                              <div style={{ flex: 1, minWidth: '120px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.kgPicked')}</label>
                                <input style={inp} type="number" step="0.1" min="0" placeholder="e.g. 24.5" value={greenForm.kg} onChange={e => setGreenForm({...greenForm, kg: e.target.value})} />
                              </div>
                              <div style={{ flex: 2, minWidth: '180px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{t('days.whatPicked')}</label>
                                <input style={inp} placeholder={t('dashboard.whatPickedPlaceholder')} value={greenForm.what} onChange={e => setGreenForm({...greenForm, what: e.target.value})} />
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={saveEntry} disabled={saving} style={{ flex: 1, padding: '10px', background: saving ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? t('sup.saving') : t('days.save')}</button>
                          <button onClick={() => { setEditDay(null); setError('') }} style={{ padding: '10px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>{t('sup.cancel')}</button>
                        </div>
                      </div>
                    )}

                    {viewDay === day && hasEntry && InlineDayView({ day, entry, ge: greenEntries[day] })}
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
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>{t('dashboard.setYourWorkNumber')}</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
              {t('dashboard.workNumberModalDesc')}
            </p>
            {workNumError && (
              <div style={{ background: '#fdecea', border: '1px solid #ffc1c0', color: '#c0392b', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '14px' }}>
                {workNumError}
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.workNumber')}</label>
              <input
                autoFocus
                type="text"
                placeholder={t('admin.workNumberPlaceholder')}
                value={workNumInput}
                onChange={e => setWorkNumInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveWorkNumber()}
                style={{ width: '100%', padding: '10px 12px', fontSize: '15px', border: '1px solid #d0d7de', borderRadius: '8px', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveWorkNumber} disabled={workNumSaving}
                style={{ flex: 1, padding: '11px', background: workNumSaving ? '#aaa' : '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: workNumSaving ? 'not-allowed' : 'pointer' }}>
                {workNumSaving ? t('sup.saving') : t('dashboard.saveWorkNumberBtn')}
              </button>
              <button onClick={() => setWorkNumModal(false)}
                style={{ padding: '11px 18px', background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>
                {t('sup.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}