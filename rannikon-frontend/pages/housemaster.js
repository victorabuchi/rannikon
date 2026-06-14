import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { clearAuth } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

function toMins(t) {
  if (!t) return 0
  const p = t.slice(0, 5).split(':')
  return parseInt(p[0]) * 60 + parseInt(p[1])
}

function formatDate(d) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function WorklogCard({ wl, onDelete }) {
  const logs = Array.isArray(wl.logs) ? wl.logs : (typeof wl.logs === 'string' ? JSON.parse(wl.logs) : [])
  const dateLabel = formatDate(wl.session_date)

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(`${wl.house_group} — Work Log`, 14, 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`${dateLabel}   |   ${logs.length} workers`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [['Work#', 'Name', 'Start', 'Finish', 'Break', 'Total hrs', 'Work done']],
      body: logs.map(r => [
        r.worker_number || '',
        r.worker_name || '',
        r.start_time?.slice(0,5) || '',
        r.finish_time?.slice(0,5) || '',
        r.total_break_mins > 0 ? r.total_break_mins + ' min' : '',
        r.total_hours || '',
        r.what_work || ''
      ]),
      styles: { fontSize: 9, lineWidth: 0.2 },
      headStyles: { fillColor: [45, 106, 45], textColor: 255, fontStyle: 'bold' }
    })
    doc.save(`worklog-${wl.house_group.replace(/[^a-z0-9]/gi, '-')}-${wl.session_date}.pdf`)
  }

  function downloadExcel() {
    const data = [
      [`${wl.house_group} — Work Log`],
      [dateLabel + '   |   ' + logs.length + ' workers'],
      [],
      ['Work#', 'Name', 'Start', 'Finish', 'Break', 'Total hrs', 'Work done'],
      ...logs.map(r => [
        r.worker_number || '',
        r.worker_name || '',
        r.start_time?.slice(0,5) || '',
        r.finish_time?.slice(0,5) || '',
        r.total_break_mins > 0 ? r.total_break_mins + ' min' : '',
        r.total_hours || '',
        r.what_work || ''
      ])
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Work Log')
    XLSX.writeFile(wb, `worklog-${wl.house_group.replace(/[^a-z0-9]/gi, '-')}-${wl.session_date}.xlsx`)
  }

  function share() {
    const lines = logs.map(r =>
      `#${r.worker_number} ${r.worker_name || ''} — ${r.start_time?.slice(0,5) || '?'} to ${r.finish_time?.slice(0,5) || '?'} — ${r.total_hours || '?'} hrs`
    ).join('\n')
    const text = `Rannikon Puutarha Work Log - ${wl.house_group} - ${dateLabel}\n\n${lines}`
    if (navigator.share) {
      navigator.share({ title: `Work Log — ${wl.house_group}`, text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      alert('Copied to clipboard')
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a1a18', marginBottom: '2px' }}>{wl.house_group}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>{dateLabel} &nbsp;|&nbsp; {logs.length} worker{logs.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPDF}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">PDF</text></svg>
            PDF
          </button>
          <button
            onClick={downloadExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">XLS</text></svg>
            Excel
          </button>
          <button
            onClick={share}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button
            onClick={() => onDelete(wl.id)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #f5c2c2', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#c0392b' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p style={{ padding: '20px', color: '#bbb', fontSize: '13px', textAlign: 'center' }}>No worker data</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '580px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Work#', 'Name', 'Start', 'Finish', 'Break', 'Total hrs', 'Work done'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '700', fontSize: '11px', color: '#555', borderBottom: '1px solid #f0f0ec', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8f8f5', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '700', fontFamily: 'monospace' }}>#{r.worker_number}</td>
                  <td style={{ padding: '8px 12px', color: '#333' }}>{r.worker_name || <span style={{ color: '#ccc' }}>Unknown</span>}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.start_time?.slice(0,5) || ''}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.finish_time?.slice(0,5) || <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ padding: '8px 12px', color: '#b45309' }}>{r.total_break_mins > 0 ? r.total_break_mins + ' min' : ''}</td>
                  <td style={{ padding: '8px 12px', fontWeight: '700', color: '#2d6a2d' }}>{r.total_hours || ''}</td>
                  <td style={{ padding: '8px 12px', color: '#555' }}>{r.what_work || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function HousemasterPage() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [worklogs, setWorklogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/auth/me').then(res => {
      const w = res.data.worker
      if (!['housemaster', 'admin'].includes(w?.role)) { router.push('/dashboard'); return }
      setMe(w)
      loadWorklogs()
    }).catch(() => router.push('/login'))
  }, [])

  async function loadWorklogs() {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/housemaster-worklogs')
      const sorted = (res.data.worklogs || []).sort((a, b) => {
        const da = new Date(a.session_date || a.sent_at)
        const db2 = new Date(b.session_date || b.sent_at)
        return db2 - da
      })
      setWorklogs(sorted)
    } catch {} finally {
      setLoading(false)
    }
  }

  async function deleteWorklog(id) {
    if (!confirm('Delete this work log? This cannot be undone.')) return
    try {
      await api.delete(`/api/admin/housemaster-worklogs/${id}`)
      setWorklogs(prev => prev.filter(wl => wl.id !== id))
    } catch {
      alert('Could not delete work log. Please try again.')
    }
  }

  if (loading || !me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ color: '#555' }}>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Housemaster | Rannikon</title>
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
        @media (max-width: 600px) { .hm-badge { display: none !important; } }
      `}</style>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon" style={{ height: '46px', width: 'auto' }} />
            <span style={{ fontFamily: 'Dancing Script, cursive', fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <span className="hm-badge" style={{ background: '#7b1fa2', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>HOUSEMASTER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: '500' }}>#{me.work_number} {me.full_name}</span>
          {me.role === 'admin' && (
            <button className="btn btn-outline" onClick={() => router.push('/admin')} style={{ fontSize: '12px', padding: '5px 12px' }}>Admin</button>
          )}
          <button className="btn btn-outline" onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', padding: '5px 12px' }}>My timesheet</button>
          <button className="btn btn-outline" onClick={() => { clearAuth(); router.push('/login') }} style={{ fontSize: '12px', padding: '5px 12px' }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.4px', marginBottom: '2px' }}>Work logs</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>Work logs sent to you from the admin</p>
          </div>
          <button className="btn btn-outline" onClick={loadWorklogs} style={{ fontSize: '12px' }}>Refresh</button>
        </div>

        {worklogs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '14px', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#888', fontWeight: '500' }}>No work logs received yet</p>
            <p style={{ fontSize: '13px', color: '#bbb', marginTop: '6px' }}>When the admin sends a work log to your group, it will appear here.</p>
          </div>
        ) : (
          worklogs.map(wl => <WorklogCard key={wl.id} wl={wl} onDelete={deleteWorklog} />)
        )}

      </div>
    </>
  )
}
