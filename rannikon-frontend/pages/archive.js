import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { clearAuth, getWorker, isLoggedIn } from '../lib/auth'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'
import PagesMenu from '@/components/PagesMenu'
import MonthGrid from '@/components/MonthGrid'

const LOCALE_MAP = { en: 'en-GB', uk: 'uk-UA', km: 'km-KH', vi: 'vi-VN', ne: 'ne-NP' }

function formatDate(d, lang) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ArchiveWorklogCard({ wl }) {
  const { t, lang } = useLanguage()
  const logs = Array.isArray(wl.logs) ? wl.logs : (typeof wl.logs === 'string' ? JSON.parse(wl.logs) : [])
  const dateLabel = formatDate(wl.session_date, lang)

  function downloadPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text(`${wl.house_group} — ${t('housemaster.workLog')}`, 14, 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text(`${dateLabel}   |   ${logs.length} ${logs.length !== 1 ? t('housemaster.workers') : t('housemaster.worker')}`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [[t('housemaster.workNumberShort'), t('housemaster.name'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('housemaster.totalHrs'), t('housemaster.workDone')]],
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
      [`${wl.house_group} — ${t('housemaster.workLog')}`],
      [dateLabel + '   |   ' + logs.length + ' ' + (logs.length !== 1 ? t('housemaster.workers') : t('housemaster.worker'))],
      [],
      [t('housemaster.workNumberShort'), t('housemaster.name'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('housemaster.totalHrs'), t('housemaster.workDone')],
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), t('housemaster.workLog'))
    XLSX.writeFile(wb, `worklog-${wl.house_group.replace(/[^a-z0-9]/gi, '-')}-${wl.session_date}.xlsx`)
  }

  function share() {
    const lines = logs.map(r =>
      `#${r.worker_number} ${r.worker_name || ''} — ${r.start_time?.slice(0,5) || '?'} to ${r.finish_time?.slice(0,5) || '?'} — ${r.total_hours || '?'} hrs`
    ).join('\n')
    const text = `Rannikon Puutarha ${t('housemaster.workLog')} - ${wl.house_group} - ${dateLabel}\n\n${lines}`
    if (navigator.share) {
      navigator.share({ title: `${t('housemaster.workLog')} — ${wl.house_group}`, text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
      alert(t('housemaster.copiedToClipboard'))
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0ec', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a1a18', marginBottom: '2px' }}>{wl.house_group}</div>
          <div style={{ fontSize: '13px', color: '#888' }}>{dateLabel} &nbsp;|&nbsp; {logs.length} {logs.length !== 1 ? t('housemaster.workers') : t('housemaster.worker')}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPDF}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#E53935"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">PDF</text></svg>
            {t('housemaster.pdf')}
          </button>
          <button
            onClick={downloadExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="#217346"/><text x="7" y="10" textAnchor="middle" fontSize="5.5" fontWeight="bold" fontFamily="Arial" fill="white">XLS</text></svg>
            {t('housemaster.excel')}
          </button>
          <button
            onClick={share}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', background: '#fff', border: '1px solid #ddd', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            {t('housemaster.share')}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p style={{ padding: '20px', color: '#bbb', fontSize: '13px', textAlign: 'center' }}>{t('housemaster.noWorkerData')}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '580px' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {[t('housemaster.workNumberShort'), t('housemaster.name'), t('papers.start'), t('papers.finish'), t('housemaster.breakShort'), t('housemaster.totalHrs'), t('housemaster.workDone')].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: '700', fontSize: '11px', color: '#555', borderBottom: '1px solid #f0f0ec', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f8f8f5', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ padding: '8px 12px', fontWeight: '700', fontFamily: 'monospace' }}>#{r.worker_number}</td>
                  <td style={{ padding: '8px 12px', color: '#333' }}>{r.worker_name || <span style={{ color: '#ccc' }}>{t('housemaster.unknown')}</span>}</td>
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

export default function ArchivePage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [me, setMe] = useState(null)
  const [worklogs, setWorklogs] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [archiveMonth, setArchiveMonth] = useState(now.getMonth() + 1)
  const [archiveYear, setArchiveYear] = useState(now.getFullYear())

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return }
    api.get('/api/auth/me').then(res => {
      setMe(res.data.worker)
      loadWorklogs()
    }).catch(() => {
      const w = getWorker()
      if (!w) { router.push('/login'); return }
      setMe(w)
      loadWorklogs()
    })
  }, [])

  async function loadWorklogs() {
    setLoading(true)
    try {
      const res = await api.get('/api/archive/worklogs')
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

  const monthWorklogs = worklogs.filter(wl => {
    const d = new Date(wl.session_date || wl.sent_at)
    return d.getMonth() + 1 === archiveMonth && d.getFullYear() === archiveYear
  })

  if (loading || !me) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <p style={{ color: '#555' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('archive.badge')} | Rannikon</title>
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
        @media (max-width: 600px) { .ar-badge { display: none !important; } }
      `}</style>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon" style={{ height: '46px', width: 'auto' }} />
            <span style={{ fontFamily: 'Dancing Script, cursive', fontWeight: '700', fontSize: '22px', color: '#2d6a2d', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <span className="ar-badge" style={{ background: '#0277bd', color: '#fff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>{t('archive.badge')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#444', fontWeight: '500' }}>#{me.work_number} {me.full_name}</span>
          <PagesMenu role={me.role} />
          {me.role !== 'admin' && (
            <button className="btn btn-outline" onClick={() => router.push('/dashboard')} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.myTimesheet')}</button>
          )}
          <button className="btn btn-outline" onClick={() => { clearAuth(); router.push('/login') }} style={{ fontSize: '12px', padding: '5px 12px' }}>{t('nav.signOut')}</button>
          <LanguageSelector />
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.4px', marginBottom: '2px' }}>{t('archive.title')}</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>{t('archive.desc')}</p>
          </div>
          <button className="btn btn-outline" onClick={loadWorklogs} style={{ fontSize: '12px' }}>{t('housemaster.refresh')}</button>
        </div>

        {/* Month calendar grid — same visual style as the payroll page's month picker */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e8e8e3', padding: '16px', marginBottom: '20px' }}>
          <MonthGrid
            selectedMonth={archiveMonth}
            selectedYear={archiveYear}
            onMonthClick={m => setArchiveMonth(m)}
            onYearChange={y => setArchiveYear(y)}
            badgeCounts={(() => {
              const counts = {}
              worklogs.forEach(wl => {
                const d = new Date(wl.session_date || wl.sent_at)
                if (d.getFullYear() === archiveYear) counts[d.getMonth() + 1] = (counts[d.getMonth() + 1] || 0) + 1
              })
              return counts
            })()}
          />
        </div>

        {monthWorklogs.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '14px', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', color: '#888', fontWeight: '500' }}>{t('archive.noLogsYet')}</p>
            <p style={{ fontSize: '13px', color: '#bbb', marginTop: '6px' }}>{t('archive.noLogsDesc')}</p>
          </div>
        ) : (
          monthWorklogs.map(wl => <ArchiveWorklogCard key={wl.id} wl={wl} />)
        )}

      </div>
    </>
  )
}
