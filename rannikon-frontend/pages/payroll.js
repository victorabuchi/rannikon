import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { clearAuth } from '../lib/auth'
import PagesMenu from '@/components/PagesMenu'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

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
                <tfoot>
                  <tr style={{ background:'#d8ead8' }}>
                    <td style={tdW({fontWeight:'800', fontSize:'13px'})} colSpan={4}>TOTAL REGULAR HOURS</td>
                    <td style={tdW({fontWeight:'800', fontSize:'14px', color:'#2d6a2d'})}>
                      {minsToHHMM(Object.values(entries).reduce((s, e) => s + toMins(e.white_hours || '8:00'), 0))}
                    </td>
                    <td style={tdW()}></td>
                  </tr>
                </tfoot>
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
                <tfoot>
                  <tr style={{ background:'#ffe8b0' }}>
                    <td style={tdO({fontWeight:'800', fontSize:'13px', border:'1px solid #c97d00'})} colSpan={4}>TOTAL EXTRA HOURS</td>
                    <td style={tdO({fontWeight:'800', fontSize:'14px', color:'#b45309', border:'1px solid #c97d00'})}>
                      {minsToHHMM(Object.values(entries).filter(e => hasOrangeWork(e)).reduce((s, e) => s + toMins(e.orange_hours), 0))}
                    </td>
                    <td style={tdO({border:'1px solid #c97d00'})}></td>
                    <td style={tdO({border:'1px solid #c97d00'})}></td>
                  </tr>
                </tfoot>
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

// ── Submission export helpers ──────────────────────────────────────────────
function buildSubPDF(sub) {
  const monthLabel = MONTHS[sub.month - 1] + ' ' + sub.year
  const days = getDaysInMonth(sub.month, sub.year)
  const included = sub.papers_included || []
  const doc = new jsPDF({ orientation: 'landscape' })

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
  const allDays = Array.from({ length: days }, (_, i) => i + 1)

  let y = 14
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(45, 106, 45)
  doc.text('Worker Timesheet', 14, y); y += 8
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
  doc.text(`Worker: ${sub.full_name}   |   #${sub.work_number}   |   ${sub.house_group || '—'}   |   ${monthLabel}`, 14, y); y += 5
  doc.text(`Submitted: ${new Date(sub.submitted_at).toLocaleDateString('en-GB')}   |   Status: ${STATUS_STYLE[sub.status]?.label || sub.status}`, 14, y); y += 7

  if (included.includes('white')) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60)
    doc.text('White Paper — Regular Hours', 14, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Start', 'Finish', 'Break', 'Hours', 'What Work']],
      body: allDays.filter(d => entries[d]).map(d => {
        const e = entries[d]
        return [d, String(e.white_start || '').slice(0, 5), String(e.white_finish || '').slice(0, 5), '30 min', e.white_hours || '', e.what_work || '']
      }),
      styles: { fontSize: 8, lineWidth: 0.2 },
      headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (included.includes('orange')) {
    const orangeDays = allDays.filter(d => hasOrangeWork(entries[d]))
    if (orangeDays.length > 0) {
      if (y > 170) { doc.addPage(); y = 14 }
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 83, 9)
      doc.text('Orange Paper — Extra Hours', 14, y); y += 4
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Start', 'Finish', 'Break', 'Extra Hours', 'What Work']],
        body: orangeDays.map(d => {
          const e = entries[d]
          return [d, String(e.orange_start || '').slice(0, 5), String(e.orange_finish || '').slice(0, 5), e.orange_break || '0:00', e.orange_hours || '', e.what_work || '']
        }),
        styles: { fontSize: 8, lineWidth: 0.2 },
        headStyles: { fillColor: [255, 160, 0], textColor: 0, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 251, 230] },
      })
      y = doc.lastAutoTable.finalY + 8
    }
  }

  if (included.includes('green') && Object.keys(greenEntries).length > 0) {
    if (y > 170) { doc.addPage(); y = 14 }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(45, 106, 45)
    doc.text('Green Paper — Berry Picking', 14, y); y += 4
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0)
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Start', 'Finish', 'What Picked', 'KG Picked']],
      body: allDays.filter(d => greenEntries[d]).map(d => {
        const ge = greenEntries[d]
        return [d, String(ge.start_time || '').slice(0, 5), String(ge.finish_time || '').slice(0, 5), ge.what_picked || '', ge.kg_picked != null ? ge.kg_picked : '']
      }),
      styles: { fontSize: 8, lineWidth: 0.2 },
      headStyles: { fillColor: [45, 106, 45], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [232, 245, 233] },
    })
  }
  return doc
}

function exportSubPDF(sub) {
  const monthLabel = MONTHS[sub.month - 1] + ' ' + sub.year
  buildSubPDF(sub).save(`timesheet-${sub.work_number}-${monthLabel}.pdf`)
}

function printSubPDF(sub) {
  const doc = buildSubPDF(sub)
  doc.autoPrint()
  window.open(doc.output('bloburl'), '_blank')
}

function exportSubExcel(sub) {
  const monthLabel = MONTHS[sub.month - 1] + ' ' + sub.year
  const days = getDaysInMonth(sub.month, sub.year)
  const included = sub.papers_included || []
  const wb = XLSX.utils.book_new()

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
  const allDays = Array.from({ length: days }, (_, i) => i + 1)

  if (included.includes('white') || included.includes('orange')) {
    const rows = [
      [`Worker Timesheet — ${monthLabel}`],
      [`Worker: ${sub.full_name}`, `Work#: ${sub.work_number}`, `Group: ${sub.house_group || '—'}`],
      [`Submitted: ${new Date(sub.submitted_at).toLocaleDateString('en-GB')}`, `Status: ${STATUS_STYLE[sub.status]?.label || sub.status}`],
      [],
      ['Date', 'Reg Start', 'Reg Finish', 'Reg Hours', 'Extra Start', 'Extra Finish', 'Extra Hours', 'What Work'],
    ]
    allDays.forEach(d => {
      const e = entries[d]
      if (!e) return
      rows.push([
        d,
        String(e.white_start || '').slice(0, 5),
        String(e.white_finish || '').slice(0, 5),
        e.white_hours || '',
        hasOrangeWork(e) ? String(e.orange_start || '').slice(0, 5) : '',
        hasOrangeWork(e) ? String(e.orange_finish || '').slice(0, 5) : '',
        hasOrangeWork(e) ? (e.orange_hours || '') : '',
        e.what_work || '',
      ])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Timesheet')
  }

  if (included.includes('green') && Object.keys(greenEntries).length > 0) {
    const rows = [
      [`Green Paper — Berry Picking — ${monthLabel}`],
      [`Worker: ${sub.full_name}`, `Work#: ${sub.work_number}`],
      [],
      ['Date', 'Start', 'Finish', 'What Picked', 'KG Picked'],
    ]
    allDays.forEach(d => {
      const ge = greenEntries[d]
      if (!ge) return
      rows.push([d, String(ge.start_time || '').slice(0, 5), String(ge.finish_time || '').slice(0, 5), ge.what_picked || '', ge.kg_picked != null ? ge.kg_picked : ''])
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Berry Picking')
  }

  XLSX.writeFile(wb, `timesheet-${sub.work_number}-${monthLabel}.xlsx`)
}

// ── Verify export helpers ──────────────────────────────────────────────────
function exportVerifyExcel(result, month, year) {
  const { worker, matches, summary } = result
  const monthLabel = MONTHS[month - 1] + ' ' + year
  const wb = XLSX.utils.book_new()
  const rows = [
    [`Payroll Verification Report — ${monthLabel}`],
    [`Worker: ${worker.full_name}`, `Work#: ${worker.work_number}`, `Group: ${worker.house_group || '—'}`],
    [`Status: ${summary.verification_status.replace(/_/g, ' ').toUpperCase()}`, `Match: ${summary.days_match}`, `Mismatch: ${summary.days_mismatch}`, `Missing: ${summary.days_missing}`, `Total hrs: ${summary.total_hours}`],
    [`Regular hrs: ${summary.total_white_hours}`, `Extra hrs: ${summary.total_orange_hours}`],
    [],
    ['Date', 'Sup Start', 'Sup Finish', 'Sup Total', 'Worker Start', 'Worker Finish', 'Worker Total', 'Status'],
  ]
  matches.forEach(m => {
    rows.push([
      m.date,
      m.supervisor_recorded?.start || '—',
      m.supervisor_recorded?.finish || '—',
      m.supervisor_recorded?.total || '—',
      m.worker_submitted?.start || '—',
      m.worker_submitted?.finish || '—',
      m.worker_submitted?.total || '—',
      VERIFY_STYLE[m.status]?.label || m.status,
    ])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Verification')
  XLSX.writeFile(wb, `verification-${worker.work_number}-${monthLabel}.xlsx`)
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function PayrollPage() {
  const router = useRouter()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('submissions')

  const now = new Date()
  // Submissions tab
  const [submissions, setSubmissions] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subMonth, setSubMonth] = useState(now.getMonth() + 1)
  const [subYear, setSubYear] = useState(now.getFullYear())
  const [expandedSub, setExpandedSub] = useState(null)
  const [expandedSubTabs, setExpandedSubTabs] = useState({})
  const [statusUpdating, setStatusUpdating] = useState(null)
  const [confirmDeleteSub, setConfirmDeleteSub] = useState(null)

  // Daily logs tab
  const [logsDate, setLogsDate] = useState(now.toISOString().split('T')[0])
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Verify tab
  const [allWorkers, setAllWorkers] = useState([])
  const [verifyMonth, setVerifyMonth] = useState(now.getMonth() + 1)
  const [verifyYear, setVerifyYear] = useState(now.getFullYear())
  const [verifyResults, setVerifyResults] = useState({}) // `${workerId}-${month}-${year}` → result
  const [verifying, setVerifying] = useState(null) // workerId being verified
  const [collapsedVerify, setCollapsedVerify] = useState(new Set())

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
    } catch (err) { console.error('Failed to load submissions') }
    finally { setSubsLoading(false) }
  }

  async function loadAllWorkers() {
    try {
      const res = await api.get('/api/payroll/workers')
      setAllWorkers(res.data.workers)
    } catch (err) { console.error('Failed to load workers') }
  }

  async function loadLogs() {
    setLogsLoading(true)
    try {
      const res = await api.get('/api/payroll/worklogs/' + logsDate)
      setLogs(res.data.logs)
    } catch (err) { console.error('Failed to load logs') }
    finally { setLogsLoading(false) }
  }

  async function doDeleteSub() {
    const { id } = confirmDeleteSub
    setConfirmDeleteSub(null)
    try {
      await api.delete('/api/payroll/submissions/' + id)
      setSubmissions(prev => prev.filter(s => s.id !== id))
      if (expandedSub === id) setExpandedSub(null)
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete') }
  }

  async function updateStatus(id, status) {
    setStatusUpdating(id + status)
    try {
      await api.post('/api/payroll/submissions/' + id + '/status', { status })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    } catch (err) { alert(err.response?.data?.error || 'Failed to update status') }
    finally { setStatusUpdating(null) }
  }

  async function runVerify(worker) {
    const cacheKey = `${worker.id}-${verifyMonth}-${verifyYear}`
    setCollapsedVerify(prev => { const s = new Set(prev); s.delete(cacheKey); return s })
    setVerifying(worker.id)
    try {
      const res = await api.get(`/api/payroll/verify/${worker.id}/${verifyMonth}/${verifyYear}`)
      setVerifyResults(prev => ({ ...prev, [cacheKey]: res.data }))
    } catch (err) { alert(err.response?.data?.error || 'Verification failed') }
    finally { setVerifying(null) }
  }

  function exportVerifyPDF(result, month, year, doPrint = false) {
    const { worker, matches, summary } = result
    const monthLabel = MONTHS[month - 1] + ' ' + year
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(45,106,45)
    doc.text('Payroll Verification Report', 14, 16)
    doc.setTextColor(0); doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text(`Worker: ${worker.full_name}  |  #${worker.work_number}  |  ${worker.house_group||'—'}  |  ${monthLabel}`, 14, 24)
    doc.text(`Status: ${summary.verification_status.replace(/_/g,' ').toUpperCase()}  |  Match: ${summary.days_match}  |  Mismatch: ${summary.days_mismatch}  |  Missing: ${summary.days_missing}  |  Total: ${summary.total_hours}`, 14, 30)
    doc.setFontSize(9)
    doc.text(`Regular hrs: ${summary.total_white_hours}   Extra hrs: ${summary.total_orange_hours}`, 14, 35)
    autoTable(doc, {
      startY: 40,
      head: [['Date','Sup Start','Sup Finish','Sup Total','Worker Start','Worker Finish','Worker Total','Status']],
      body: matches.map(m => [m.date, m.supervisor_recorded?.start||'—', m.supervisor_recorded?.finish||'—', m.supervisor_recorded?.total||'—', m.worker_submitted?.start||'—', m.worker_submitted?.finish||'—', m.worker_submitted?.total||'—', VERIFY_STYLE[m.status]?.label||m.status]),
      styles:{ fontSize:8, lineWidth:0.2 },
      headStyles:{ fillColor:[45,106,45], textColor:255, fontStyle:'bold' },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const s = matches[data.row.index]?.status
          if (s==='match') data.cell.styles.fillColor=[232,245,233]
          else if (s==='mismatch') data.cell.styles.fillColor=[253,236,234]
          else if (s==='missing_supervisor') data.cell.styles.fillColor=[255,243,224]
        }
      }
    })
    if (doPrint) { doc.autoPrint(); window.open(doc.output('bloburl'), '_blank') }
    else doc.save(`verification-${worker.work_number}-${monthLabel}.pdf`)
  }

  // Submissions for the selected sub month, grouped by house group sorted
  const subMonthSubs = submissions
    .filter(s => s.month === subMonth && s.year === subYear)
    .sort((a, b) => {
      const ai = HOUSE_GROUP_ORDER.indexOf(a.house_group||''), bi = HOUSE_GROUP_ORDER.indexOf(b.house_group||'')
      const gd = (ai===-1?99:ai)-(bi===-1?99:bi)
      return gd !== 0 ? gd : (parseInt(a.work_number)||9999)-(parseInt(b.work_number)||9999)
    })
  const subMonthGrouped = {}
  subMonthSubs.forEach(s => {
    const g = s.house_group || 'Unknown'
    if (!subMonthGrouped[g]) subMonthGrouped[g] = []
    subMonthGrouped[g].push(s)
  })
  // Count submissions per month for the calendar grid badges
  const subCountByMonth = {}
  submissions.forEach(s => {
    if (s.year === subYear) subCountByMonth[s.month] = (subCountByMonth[s.month]||0) + 1
  })
  // Submission lookup for verify tab: worker_id+month+year → submission
  const subLookup = {}
  submissions.forEach(s => { subLookup[`${s.worker_id}-${s.month}-${s.year}`] = s })

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
  const dlBtn = (color) => ({ padding:'4px 12px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:`1px solid ${color}`, borderRadius:'6px', background:'#fff', color, whiteSpace:'nowrap' })

  // Shared month-grid component
  function MonthGrid({ selectedMonth, selectedYear, onMonthClick, onYearChange, badgeCounts }) {
    return (
      <div style={{ marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
          <button onClick={() => onYearChange(selectedYear - 1)} style={{ padding:'4px 10px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer', fontSize:'13px' }}>‹</button>
          <span style={{ fontWeight:'800', fontSize:'16px', minWidth:'48px', textAlign:'center' }}>{selectedYear}</span>
          <button onClick={() => onYearChange(selectedYear + 1)} style={{ padding:'4px 10px', border:'1px solid #ccc', borderRadius:'6px', background:'#fff', cursor:'pointer', fontSize:'13px' }}>›</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
          {SHORT_MONTHS.map((m, i) => {
            const mn = i + 1
            const isSelected = mn === selectedMonth
            const count = badgeCounts?.[mn] || 0
            return (
              <button key={mn} onClick={() => onMonthClick(mn)}
                style={{ padding:'10px 6px', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', position:'relative',
                  border: isSelected ? 'none' : '1px solid #dde8dd',
                  background: isSelected ? '#2d6a2d' : count > 0 ? '#f0f7f0' : '#fff',
                  color: isSelected ? '#fff' : '#2d6a2d' }}>
                {m}
                {count > 0 && (
                  <span style={{ position:'absolute', top:'4px', right:'4px', background: isSelected ? 'rgba(255,255,255,0.4)' : '#2d6a2d', color:'#fff', fontSize:'9px', fontWeight:'800', borderRadius:'8px', padding:'1px 5px', lineHeight:'14px' }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

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
            <PagesMenu role={me?.role} />
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
                <button onClick={loadSubmissions} disabled={subsLoading} style={{ padding:'6px 14px', background:'#fff', border:'1px solid #ccc', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>{subsLoading ? 'Loading…' : 'Refresh'}</button>
              </div>

              {/* Month calendar grid */}
              <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', padding:'16px', marginBottom:'20px' }}>
                <MonthGrid
                  selectedMonth={subMonth}
                  selectedYear={subYear}
                  onMonthClick={m => { setSubMonth(m); setExpandedSub(null) }}
                  onYearChange={y => { setSubYear(y); setExpandedSub(null) }}
                  badgeCounts={subCountByMonth}
                />
                <p style={{ fontSize:'12px', color:'#888', margin:0 }}>
                  {subMonthSubs.length > 0
                    ? <><b style={{ color:'#2d6a2d' }}>{subMonthSubs.length} submission{subMonthSubs.length!==1?'s':''}</b> for {MONTHS[subMonth-1]} {subYear} — {Object.keys(subMonthGrouped).length} house group{Object.keys(subMonthGrouped).length!==1?'s':''}</>
                    : `No submissions for ${MONTHS[subMonth-1]} ${subYear}`
                  }
                </p>
              </div>

              {/* Submissions for selected month, by house group */}
              {Object.keys(subMonthGrouped).length === 0 && !subsLoading && (
                <div style={{ background:'#fff', borderRadius:'10px', padding:'40px', textAlign:'center', border:'1px solid #e8e8e3' }}>
                  <p style={{ color:'#aaa', fontSize:'14px' }}>No submissions for {MONTHS[subMonth-1]} {subYear}</p>
                </div>
              )}

              {Object.entries(subMonthGrouped).map(([group, subs]) => (
                <div key={group} style={{ marginBottom:'24px' }}>
                  {/* House group divider */}
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                    <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.18 }} />
                    <span style={{ fontSize:'11px', fontWeight:'800', color:'#2d6a2d', textTransform:'uppercase', letterSpacing:'1px', whiteSpace:'nowrap' }}>{group}</span>
                    <span style={{ fontSize:'11px', color:'#aaa', background:'#f0f7f0', padding:'2px 8px', borderRadius:'8px' }}>{subs.length}</span>
                    <div style={{ height:'2px', flex:1, background:'#2d6a2d', opacity:0.18 }} />
                  </div>

                  {/* Table-style submission rows */}
                  <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', overflow:'hidden' }}>
                    <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'13px' }}>
                      <thead>
                        <tr>
                          <th style={thTd()}>Work#</th>
                          <th style={thTd()}>Name</th>
                          <th style={thTd()}>Papers</th>
                          <th style={thTd()}>Submitted</th>
                          <th style={thTd()}>Status</th>
                          <th style={thTd()}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map((sub, i) => {
                          const paperLabels = { white:'White', orange:'Orange', weekly:'Weekly', green:'Green' }
                          const isExpanded = expandedSub === sub.id
                          const activeSubTab = expandedSubTabs[sub.id] || (sub.papers_included||['white'])[0]
                          const mLabel = MONTHS[sub.month - 1] + ' ' + sub.year
                          return (
                            <React.Fragment key={sub.id}>
                              <tr style={{ background: i%2===0?'#fff':'#fafafa' }}>
                                <td style={bodyTd({fontWeight:'800', color:'#2d6a2d'})}>{sub.work_number}</td>
                                <td style={bodyTd({fontWeight:'700'})}>{sub.full_name}</td>
                                <td style={bodyTd({fontSize:'11px', color:'#666'})}>{(sub.papers_included||[]).map(p=>paperLabels[p]||p).join(', ')}</td>
                                <td style={bodyTd({fontSize:'11px', color:'#555', whiteSpace:'nowrap'})}>
                                  {new Date(sub.submitted_at).toLocaleDateString('en-GB')}
                                  <span style={{ marginLeft:'6px', color:'#aaa' }}>{new Date(sub.submitted_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
                                </td>
                                <td style={bodyTd()}><StatusBadge status={sub.status} /></td>
                                <td style={bodyTd({textAlign:'right', whiteSpace:'nowrap'})}>
                                  <div style={{ display:'inline-flex', gap:'5px', alignItems:'center' }}>
                                    {isExpanded
                                      ? <button onClick={() => toggleSub(sub.id, sub.papers_included)}
                                          style={{ padding:'3px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:'1px solid #b0b0b0', borderRadius:'6px', background:'#f5f5f5', color:'#333' }}>Close</button>
                                      : <button onClick={() => toggleSub(sub.id, sub.papers_included)}
                                          style={{ padding:'3px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:'1px solid #2d6a2d', borderRadius:'6px', background:'#f0f7f0', color:'#2d6a2d' }}>Open</button>
                                    }
                                    <button onClick={() => setConfirmDeleteSub({ id:sub.id, name:sub.full_name, monthLabel:mLabel })}
                                      style={{ padding:'3px 10px', fontSize:'11px', fontWeight:'700', cursor:'pointer', border:'1px solid #f5c6c6', borderRadius:'6px', background:'#fff5f5', color:'#c0392b' }}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} style={{ padding:'16px', background:'#f8fbf8', borderBottom:'2px solid #e8e8e3' }}>
                                    {sub.notes && <p style={{ fontSize:'13px', color:'#555', margin:'0 0 12px', fontStyle:'italic', padding:'8px 12px', background:'#fff', borderRadius:'6px', border:'1px solid #eee' }}>Notes: {sub.notes}</p>}
                                    <SubmissionPaperView sub={sub} activeTab={activeSubTab} onTabChange={t => setExpandedSubTabs(prev => ({ ...prev, [sub.id]: t }))} />
                                    {/* Download / print row */}
                                    <div style={{ display:'flex', gap:'6px', marginTop:'12px', flexWrap:'wrap', paddingBottom:'2px', borderBottom:'1px solid #eee' }}>
                                      <span style={{ fontSize:'11px', color:'#888', alignSelf:'center', marginRight:'4px' }}>Download:</span>
                                      <button onClick={() => exportSubPDF(sub)} style={dlBtn('#1565c0')}>PDF</button>
                                      <button onClick={() => exportSubExcel(sub)} style={dlBtn('#2e7d32')}>Excel</button>
                                      <button onClick={() => printSubPDF(sub)} style={dlBtn('#555')}>Print</button>
                                    </div>
                                    <div style={{ display:'flex', gap:'8px', marginTop:'10px', flexWrap:'wrap' }}>
                                      {['approved','rejected','needs_review'].map(s => {
                                        const st = STATUS_STYLE[s]
                                        const busy = statusUpdating === sub.id + s
                                        return (
                                          <button key={s} disabled={!!statusUpdating||sub.status===s} onClick={() => updateStatus(sub.id, s)}
                                            style={{ padding:'7px 18px', fontSize:'12px', fontWeight:'700', cursor:sub.status===s?'default':'pointer', border:`1px solid ${st.border}`, borderRadius:'6px', background:sub.status===s?st.bg:'#fff', color:sub.status===s?st.text:'#555', opacity:!!statusUpdating&&!busy?0.5:1 }}>
                                            {busy?'…':st.label}
                                          </button>
                                        )
                                      })}
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
                </div>
              ))}
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
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                <h2 style={{ fontSize:'18px', fontWeight:'800', margin:0 }}>Smart Verification</h2>
              </div>

              {/* Month calendar grid */}
              <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e8e8e3', padding:'16px', marginBottom:'20px' }}>
                <MonthGrid
                  selectedMonth={verifyMonth}
                  selectedYear={verifyYear}
                  onMonthClick={m => setVerifyMonth(m)}
                  onYearChange={y => setVerifyYear(y)}
                  badgeCounts={(() => {
                    const counts = {}
                    submissions.forEach(s => { if (s.year === verifyYear) counts[s.month] = (counts[s.month]||0) + 1 })
                    return counts
                  })()}
                />
                <p style={{ fontSize:'12px', color:'#888', margin:0 }}>
                  Workers who submitted for <b style={{ color:'#2d6a2d' }}>{MONTHS[verifyMonth-1]} {verifyYear}</b>
                  {' — '}click <b>Verify</b> to compare their timesheet against supervisor logs.
                </p>
              </div>

              {/* Submitted workers list */}
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {subMonthSubs.length === 0 && (
                  <div style={{ background:'#fff', borderRadius:'12px', padding:'48px', textAlign:'center', border:'1px solid #e8e8e3' }}>
                    <div style={{ fontSize:'32px', marginBottom:'10px' }}>📋</div>
                    <p style={{ color:'#aaa', fontSize:'14px', margin:0 }}>No submissions for {MONTHS[verifyMonth-1]} {verifyYear}</p>
                  </div>
                )}
                {allWorkers.filter(w => subLookup[`${w.id}-${verifyMonth}-${verifyYear}`]).map(worker => {
                  const cacheKey = `${worker.id}-${verifyMonth}-${verifyYear}`
                  const sub = subLookup[cacheKey]
                  const result = verifyResults[cacheKey]
                  const isVerifying = verifying === worker.id
                  const isCollapsed = collapsedVerify.has(cacheKey)
                  const vs = result?.summary?.verification_status
                  const vsColor  = vs==='verified' ? '#2d6a2d'  : vs==='discrepancies_found' ? '#c0392b'  : '#b45309'
                  const vsBg     = vs==='verified' ? '#f0faf0'  : vs==='discrepancies_found' ? '#fff0f0'  : '#fff8ee'
                  const vsBorder = vs==='verified' ? '#a5d6a7'  : vs==='discrepancies_found' ? '#f5c6c6'  : '#ffcc80'
                  const vsLabel  = vs==='verified' ? '✓  Verified' : vs==='discrepancies_found' ? '✗  Discrepancies Found' : '⚠  Incomplete'
                  const initials = worker.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
                  return (
                    <div key={worker.id} style={{ background:'#fff', borderRadius:'12px', border:'1px solid #dde8dd', overflow:'hidden', boxShadow:'0 1px 6px rgba(45,106,45,0.07)' }}>

                      {/* ── Worker header ── */}
                      <div style={{ padding:'16px 20px', display:'flex', flexWrap:'wrap', gap:'12px', alignItems:'center', justifyContent:'space-between' }}>
                        <div style={{ display:'flex', gap:'14px', alignItems:'center', minWidth:0 }}>
                          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'linear-gradient(135deg,#2d6a2d,#4caf50)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'15px', flexShrink:0, letterSpacing:'0.5px' }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                              <span style={{ fontWeight:'800', fontSize:'15px', color:'#1a1a18' }}>{worker.full_name}</span>
                              <span style={{ fontSize:'12px', fontWeight:'700', color:'#2d6a2d', background:'#f0f7f0', border:'1px solid #c8e6c9', padding:'2px 9px', borderRadius:'20px' }}>#{worker.work_number}</span>
                              {result && (
                                <span style={{ fontSize:'11px', fontWeight:'700', color:vsColor, background:vsBg, border:`1px solid ${vsBorder}`, padding:'2px 9px', borderRadius:'20px' }}>{vsLabel}</span>
                              )}
                            </div>
                            <div style={{ display:'flex', gap:'6px', alignItems:'center', marginTop:'4px', flexWrap:'wrap' }}>
                              {worker.house_group && <span style={{ fontSize:'11px', color:'#888' }}>{worker.house_group}</span>}
                              <span style={{ fontSize:'11px', color:'#ddd' }}>|</span>
                              <span style={{ fontSize:'11px', color:'#999' }}>Submitted {new Date(sub.submitted_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                              <span style={{ fontSize:'11px', color:'#ddd' }}>|</span>
                              <span style={{ fontSize:'11px', color:'#bbb' }}>{new Date(sub.submitted_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => runVerify(worker)} disabled={isVerifying}
                          style={{ padding:'9px 24px', fontSize:'13px', fontWeight:'700', cursor:isVerifying?'not-allowed':'pointer', border:'none', borderRadius:'8px', background:isVerifying?'#aaa':'#2d6a2d', color:'#fff', whiteSpace:'nowrap', boxShadow:isVerifying?'none':'0 2px 6px rgba(45,106,45,0.25)', letterSpacing:'0.2px' }}>
                          {isVerifying ? 'Verifying…' : result ? 'Re-verify' : 'Verify'}
                        </button>
                      </div>

                      {/* ── Verification result ── */}
                      {result && !isCollapsed && (
                        <div style={{ borderTop:`2px solid ${vsBorder}` }}>

                          {/* Status banner */}
                          <div style={{ padding:'11px 20px', background:vsBg, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                            <span style={{ fontWeight:'800', fontSize:'13px', color:vsColor, letterSpacing:'0.2px' }}>{vsLabel}</span>
                            <span style={{ fontSize:'12px', color:'#888' }}>{MONTHS[verifyMonth-1]} {verifyYear} &nbsp;·&nbsp; {result.summary.total_days_worked} day{result.summary.total_days_worked!==1?'s':''} with activity</span>
                          </div>

                          {/* Stat tiles */}
                          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:'10px', borderBottom:'1px solid #f0f0f0' }}>
                            {[
                              { label:'Days Worked',   value:result.summary.total_days_worked,  color:'#333',    bg:'#f7f7f7', border:'#e0e0e0' },
                              { label:'Match',         value:result.summary.days_match,          color:'#2d6a2d', bg:'#e8f5e9', border:'#a5d6a7' },
                              { label:'Mismatch',      value:result.summary.days_mismatch,       color:'#c0392b', bg:'#fdecea', border:'#f5c6c6' },
                              { label:'Missing',       value:result.summary.days_missing,        color:'#b45309', bg:'#fff8ee', border:'#ffcc80' },
                              { label:'Regular Hours', value:result.summary.total_white_hours,   color:'#1565c0', bg:'#e8f0fd', border:'#90caf9' },
                              { label:'Extra Hours',   value:result.summary.total_orange_hours,  color:'#b45309', bg:'#fff3e0', border:'#ffcc80' },
                            ].map(({ label, value, color, bg, border }) => (
                              <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:'10px', padding:'12px 10px', textAlign:'center' }}>
                                <div style={{ fontSize:'24px', fontWeight:'900', color, lineHeight:1.1 }}>{value}</div>
                                <div style={{ fontSize:'10px', color:'#888', marginTop:'5px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.6px' }}>{label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Download bar */}
                          <div style={{ padding:'10px 20px', display:'flex', gap:'8px', alignItems:'center', background:'#fafcfa', borderBottom:'1px solid #f0f0f0', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'12px', color:'#888', fontWeight:'600' }}>Download:</span>
                            <button onClick={() => exportVerifyPDF(result, verifyMonth, verifyYear)} style={{ padding:'6px 18px', fontSize:'12px', fontWeight:'700', cursor:'pointer', border:'1px solid #1565c0', borderRadius:'6px', background:'#fff', color:'#1565c0' }}>PDF</button>
                            <button onClick={() => exportVerifyExcel(result, verifyMonth, verifyYear)} style={{ padding:'6px 18px', fontSize:'12px', fontWeight:'700', cursor:'pointer', border:'1px solid #2d6a2d', borderRadius:'6px', background:'#fff', color:'#2d6a2d' }}>Excel</button>
                            <button onClick={() => exportVerifyPDF(result, verifyMonth, verifyYear, true)} style={{ padding:'6px 18px', fontSize:'12px', fontWeight:'700', cursor:'pointer', border:'1px solid #555', borderRadius:'6px', background:'#fff', color:'#555' }}>Print</button>
                            <div style={{ flex:1 }} />
                            <button onClick={() => setCollapsedVerify(prev => new Set([...prev, cacheKey]))}
                              style={{ padding:'6px 18px', fontSize:'12px', fontWeight:'700', cursor:'pointer', border:'1px solid #e0e0e0', borderRadius:'6px', background:'#f5f5f5', color:'#666' }}>
                              Close
                            </button>
                          </div>

                          {/* Day-by-day table */}
                          <div style={{ overflowX:'auto' }}>
                            <table style={{ borderCollapse:'collapse', width:'100%', fontSize:'12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding:'11px 16px', textAlign:'left', background:'#1a2e1a', color:'#fff', fontSize:'12px', fontWeight:'700', whiteSpace:'nowrap' }}>Date</th>
                                  <th style={{ padding:'11px 16px', textAlign:'center', background:'#1b5e20', color:'#fff', fontSize:'12px', fontWeight:'700' }} colSpan={3}>Supervisor Recorded</th>
                                  <th style={{ padding:'11px 16px', textAlign:'center', background:'#1a237e', color:'#fff', fontSize:'12px', fontWeight:'700' }} colSpan={3}>Worker Submitted</th>
                                  <th style={{ padding:'11px 16px', textAlign:'center', background:'#1a2e1a', color:'#fff', fontSize:'12px', fontWeight:'700' }}>Status</th>
                                </tr>
                                <tr>
                                  <th style={{ padding:'7px 16px', background:'#243824', color:'#aaa', fontSize:'11px' }}></th>
                                  {['Start','Finish','Total'].map(l=><th key={'s'+l} style={{ padding:'7px 16px', background:'#2e7d32', color:'#c8e6c9', fontSize:'11px', fontWeight:'600', textAlign:'center' }}>{l}</th>)}
                                  {['Start','Finish','Total'].map(l=><th key={'w'+l} style={{ padding:'7px 16px', background:'#283593', color:'#c5cae9', fontSize:'11px', fontWeight:'600', textAlign:'center' }}>{l}</th>)}
                                  <th style={{ padding:'7px 16px', background:'#243824', color:'#aaa', fontSize:'11px' }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.matches.map((m, i) => {
                                  const rowBg    = m.status==='match' ? '#f4fbf4' : m.status==='mismatch' ? '#fff4f4' : m.status==='missing_supervisor' ? '#fffbf0' : '#fafafa'
                                  const accentBg = m.status==='match' ? '#4caf50' : m.status==='mismatch' ? '#e53935' : m.status==='missing_supervisor' ? '#fb8c00' : '#9e9e9e'
                                  return (
                                    <tr key={i} style={{ background:rowBg, borderBottom:'1px solid #f0f0f0' }}>
                                      <td style={{ padding:'10px 16px', fontWeight:'700', fontSize:'12px', color:'#222', borderLeft:`4px solid ${accentBg}`, whiteSpace:'nowrap' }}>{m.date}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', color:'#2d4a2d' }}>{m.supervisor_recorded?.start||'—'}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', color:'#2d4a2d' }}>{m.supervisor_recorded?.finish||'—'}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', fontWeight:'700', color:'#1b5e20' }}>{m.supervisor_recorded?.total||'—'}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', color:'#283593' }}>{m.worker_submitted?.start||'—'}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', color:'#283593' }}>{m.worker_submitted?.finish||'—'}</td>
                                      <td style={{ padding:'10px 16px', fontSize:'12px', textAlign:'center', fontWeight:'700', color:'#1a237e' }}>{m.worker_submitted?.total||'—'}</td>
                                      <td style={{ padding:'10px 16px', textAlign:'center' }}><VerifyBadge status={m.status} /></td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      )}
                    </div>
                  )
                })}
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
