import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

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

const WORKER_DELAYS = [700, 500, 1100, 500, 1100, 420, 280, 400, 3200]

function AnimatedDemo({ step = 0 }) {
  const { t } = useLanguage()
  const scenarioIdx = 0

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
            {t('home.logWorkHours')}
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>{t('home.workerNumber')}</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600', background: '#fafaf9', color: '#333' }}>247</div>
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>{t('days.startTime')}</div>
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
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>{t('days.finishTime')}</div>
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
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', fontWeight: '500' }}>{t('housemaster.breakShort')}</div>
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
            {t('home.calculateHours')}
          </div>

          <div style={{ overflow: 'hidden', maxHeight: showResults ? '260px' : '0', transition: 'max-height 0.5s ease', marginTop: showResults ? '10px' : '0' }}>

            {/* White Paper */}
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '7px', padding: '7px 10px', marginBottom: '5px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#2d6a2d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{t('papers.whitePaper')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px' }}>
                {[['Start', t('papers.start'), sc.start], ['Finish', t('papers.finish'), wFinish], ['Break', t('housemaster.breakShort'), extraBreak + ' min'], ['Hours', t('papers.hours'), '8:00']].map(([key, label, v]) => (
                  <div key={key} style={{ textAlign: 'center', background: '#fff', borderRadius: '4px', padding: '4px 2px' }}>
                    <div style={{ fontSize: '8px', color: '#888' }}>{label}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: key === 'Hours' ? '#2d6a2d' : '#1a1a18' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Orange Paper */}
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '7px', padding: '7px 10px', marginBottom: '5px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{t('papers.orangePaper')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px' }}>
                {[['Start', t('papers.start'), oStart], ['Finish', t('papers.finish'), sc.finish], ['Break', t('housemaster.breakShort'), extraBreak + ' min'], ['Hrs', t('papers.hours'), oHours]].map(([key, label, v]) => (
                  <div key={key} style={{ textAlign: 'center', background: '#fff', borderRadius: '4px', padding: '4px 2px' }}>
                    <div style={{ fontSize: '8px', color: '#888' }}>{label}</div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: key === 'Hrs' ? '#b45309' : '#1a1a18' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Summary */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '7px', padding: '7px 10px' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{t('papers.weeklySummary')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {[[t('papers.regHrs'), '8:00'], [t('papers.extraHrs'), oHours], [t('papers.total'), totalHours]].map(([l, v]) => (
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

function BrowserChrome({ url }) {
  return (
    <div style={{ background: '#f5f5f3', borderBottom: '1px solid #e0e0dc', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '5px' }}>
        {['#ff5f57', '#ffbd2e', '#28c940'].map(c => (
          <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />
        ))}
      </div>
      <div style={{ flex: 1, background: '#ebebea', borderRadius: '5px', padding: '3px 8px', fontSize: '10px', color: '#888', textAlign: 'center' }}>
        {url}
      </div>
    </div>
  )
}

function CursorArrow({ pos }) {
  return (
    <div style={{
      position: 'absolute', top: pos.top, left: pos.left, opacity: pos.opacity,
      transition: 'top 0.38s cubic-bezier(0.25,0.46,0.45,0.94), left 0.38s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.25s',
      pointerEvents: 'none', zIndex: 10
    }}>
      <svg width="18" height="22" viewBox="0 0 18 22">
        <path d="M1 1L1 17L5 13L8 20L10.5 19L7.5 12L13 12Z" fill="#1a1a1a" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function BlinkCursor({ color }) {
  return <span style={{ display: 'inline-block', width: '1.5px', height: '13px', background: color, marginLeft: '1px', verticalAlign: 'text-bottom', animation: 'blinkCursor 1s step-end infinite' }} />
}

const SUPERVISOR_DELAYS = [700, 500, 900, 500, 900, 350, 700, 350, 900, 700, 350, 3000]

function SupervisorDemo({ step = 0 }) {
  const { t } = useLanguage()

  const numbersVal = step >= 2 ? '247, 248, 251' : ''
  const startVal = step >= 4 ? '07:30' : ''
  const addPress = step === 5
  const showResults = step >= 6
  const finishPress = step === 7
  const finishVal = step >= 8 ? '16:00' : ''
  const showWorklog = step >= 8
  const sendPress = step === 10
  const sent = step >= 11

  const cursorPos = [
    { top: 0,   left: 0,   opacity: 0 },
    { top: 112, left: 175, opacity: 1 },
    { top: 112, left: 175, opacity: 1 },
    { top: 167, left: 175, opacity: 1 },
    { top: 167, left: 175, opacity: 1 },
    { top: 209, left: 140, opacity: 1 },
    { top: 292, left: 230, opacity: 1 },
    { top: 292, left: 230, opacity: 1 },
    { top: 292, left: 230, opacity: 1 },
    { top: 458, left: 145, opacity: 1 },
    { top: 458, left: 145, opacity: 1 },
    { top: 458, left: 145, opacity: 0.3 },
  ][step]

  return (
    <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>
        <BrowserChrome url="rannikon.com/supervisor" />
        <div style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a3a5c', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>
            {t('sup.addWorkers')}
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>{t('sup.workerNumbers')}</div>
            <div style={{
              border: (step === 1 || step === 2) ? '1.5px solid #1a3a5c' : '1px solid #ddd',
              borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600',
              background: (step === 1 || step === 2) ? '#eef3f8' : '#fff', color: '#333',
              transition: 'all 0.2s', minHeight: '33px',
              boxShadow: (step === 1 || step === 2) ? '0 0 0 3px rgba(26,58,92,0.1)' : 'none'
            }}>
              {numbersVal}
              {(step === 1 || step === 2) && <BlinkCursor color="#1a3a5c" />}
            </div>
          </div>

          <div style={{ marginBottom: '13px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>{t('days.startTime')}</div>
            <div style={{
              border: (step === 3 || step === 4) ? '1.5px solid #1a3a5c' : '1px solid #ddd',
              borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600',
              background: (step === 3 || step === 4) ? '#eef3f8' : '#fff', color: '#333',
              transition: 'all 0.2s', minHeight: '33px',
              boxShadow: (step === 3 || step === 4) ? '0 0 0 3px rgba(26,58,92,0.1)' : 'none'
            }}>
              {startVal}
              {(step === 3 || step === 4) && <BlinkCursor color="#1a3a5c" />}
            </div>
          </div>

          <div style={{
            background: '#1a3a5c', borderRadius: '7px', padding: '9px', textAlign: 'center',
            color: '#fff', fontSize: '13px', fontWeight: '700',
            transform: addPress ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.12s', opacity: addPress ? 0.8 : 1, cursor: 'pointer'
          }}>
            {t('sup.addBatchBtn')}
          </div>

          <div style={{ overflow: 'hidden', maxHeight: showResults ? '340px' : '0', transition: 'max-height 0.5s ease', marginTop: showResults ? '12px' : '0' }}>
            <div style={{ background: '#f5f8fb', border: '1px solid #dbe4ec', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                {['247', '248', '251'].map(n => (
                  <span key={n} style={{ background: '#e8f5e9', color: '#1b5e20', border: '1px solid #a5d6a7', padding: '2px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>#{n}</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: '700' }}>{t('papers.start')}: <span style={{ color: '#1a3a5c' }}>07:30</span></span>
                {!finishVal ? (
                  <span style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer',
                    background: finishPress ? '#1a3a5c' : '#fff', color: finishPress ? '#fff' : '#1a3a5c',
                    border: '1px solid #1a3a5c', transform: finishPress ? 'scale(0.95)' : 'scale(1)', transition: 'all 0.15s'
                  }}>{t('sup.setFinish')}</span>
                ) : (
                  <span style={{ fontSize: '12px', fontWeight: '700' }}>{t('papers.finish')}: <span style={{ color: '#b45309' }}>{finishVal}</span></span>
                )}
              </div>
            </div>

            <div style={{ overflow: 'hidden', maxHeight: showWorklog ? '160px' : '0', transition: 'max-height 0.4s ease' }}>
              <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#f5f5f0', padding: '5px 8px', fontSize: '9px', fontWeight: '700', color: '#888' }}>
                  <span>{t('housemaster.workNumberShort')}</span><span>{t('sup.whiteHrs')}</span><span>{t('sup.orangeHrs')}</span>
                </div>
                {[['247', '8:00', '0:30'], ['248', '8:00', '0:15'], ['251', '8:00', '0:00']].map(([n, w, o]) => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '5px 8px', fontSize: '11px', borderTop: '1px solid #f0f0ec' }}>
                    <span style={{ fontWeight: '700' }}>#{n}</span><span style={{ color: '#2d6a2d', fontWeight: '600' }}>{w}</span><span style={{ color: '#b45309', fontWeight: '600' }}>{o}</span>
                  </div>
                ))}
              </div>

              <div style={{
                borderRadius: '7px', padding: '9px', textAlign: 'center', fontSize: '13px', fontWeight: '700',
                transition: 'all 0.2s',
                background: sent ? '#e8f5e9' : '#2d6a2d',
                color: sent ? '#2d6a2d' : '#fff',
                border: sent ? '1px solid #c8e6c9' : 'none',
                transform: sendPress ? 'scale(0.96)' : 'scale(1)',
              }}>
                {sent ? '✓ ' + t('sup.sentToAdmin') : t('sup.sendToAdmin')}
              </div>
            </div>
          </div>
        </div>
      </div>
      <CursorArrow pos={cursorPos} />
    </div>
  )
}

const ADMIN_DELAYS = [900, 500, 350, 900, 350, 3000]

function AdminDemo({ step = 0 }) {
  const { t } = useLanguage()

  const g1Press = step === 2
  const g1Sent = step >= 3
  const g2Press = step === 4
  const g2Sent = step >= 5

  const cursorPos = [
    { top: 0,   left: 0,   opacity: 0 },
    { top: 108, left: 235, opacity: 1 },
    { top: 108, left: 235, opacity: 1 },
    { top: 108, left: 235, opacity: 1 },
    { top: 205, left: 235, opacity: 1 },
    { top: 205, left: 235, opacity: 0.3 },
  ][step]

  const GroupCard = ({ name, colors, workers, sent, press }) => (
    <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>{name}</span>
        {sent ? (
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#2d6a2d', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            {t('admin.sent')}
          </span>
        ) : (
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', cursor: 'pointer',
            background: press ? '#154d8f' : '#1565c0', color: '#fff', transform: press ? 'scale(0.95)' : 'scale(1)', transition: 'all 0.15s'
          }}>{t('admin.sendToHousemaster')}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {workers.map(([n, h]) => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555' }}>
            <span style={{ fontWeight: '700', color: '#333' }}>#{n}</span><span>{h}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>
        <BrowserChrome url="rannikon.com/admin" />
        <div style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1565c0', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>
            {t('admin.tabLogs')}
          </div>
          <GroupCard name="Kivilinna/Salo" colors={{ bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7' }} workers={[['247', '8:00'], ['248', '8:15']]} sent={g1Sent} press={g1Press} />
          <GroupCard name="Karton Cambodia" colors={{ bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9' }} workers={[['312', '8:00'], ['318', '7:45']]} sent={g2Sent} press={g2Press} />
        </div>
      </div>
      <CursorArrow pos={cursorPos} />
    </div>
  )
}

const HOUSEMASTER_DELAYS = [1200, 1200, 500, 500, 500, 3000]

function HousemasterDemo({ step = 0 }) {
  const { t } = useLanguage()

  const cardIn = step >= 1
  const pdfPress = step === 3
  const sharePress = step === 5

  const cursorPos = [
    { top: 0,   left: 0,   opacity: 0 },
    { top: 0,   left: 0,   opacity: 0 },
    { top: 228, left: 50,  opacity: 1 },
    { top: 228, left: 50,  opacity: 1 },
    { top: 228, left: 165, opacity: 1 },
    { top: 228, left: 165, opacity: 0.3 },
  ][step]

  return (
    <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>
        <BrowserChrome url="rannikon.com/housemaster" />
        <div style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#7b1fa2', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>
            {t('housemaster.workLogs')}
          </div>

          {!cardIn ? (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: '#bbb', fontSize: '12px', border: '1px dashed #e0e0dc', borderRadius: '8px' }}>
              {t('housemaster.noLogsYet')}
            </div>
          ) : (
            <div className="fade-up" style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0ec' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#1a1a18', marginBottom: '2px' }}>Kivilinna/Salo</div>
                <div style={{ fontSize: '10px', color: '#888' }}>28 Aug 2026 &nbsp;|&nbsp; 3 workers</div>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '5px', borderBottom: '1px solid #f0f0ec' }}>
                {[['247', '8:00'], ['248', '8:15'], ['251', '8:00']].map(([n, h]) => (
                  <div key={n} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ fontWeight: '700' }}>#{n}</span><span style={{ color: '#2d6a2d', fontWeight: '600' }}>{h}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '9px 12px', display: 'flex', gap: '6px' }}>
                <span style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '700', borderRadius: '6px', border: '1px solid #ddd', background: pdfPress ? '#f5f5f0' : '#fff', color: '#333', transform: pdfPress ? 'scale(0.94)' : 'scale(1)', transition: 'all 0.15s' }}>{t('housemaster.pdf')}</span>
                <span style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '700', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', color: '#333' }}>{t('housemaster.excel')}</span>
                <span style={{ padding: '4px 10px', fontSize: '10px', fontWeight: '700', borderRadius: '6px', border: '1px solid #ddd', background: sharePress ? '#f5f5f0' : '#fff', color: '#333', transform: sharePress ? 'scale(0.94)' : 'scale(1)', transition: 'all 0.15s' }}>{t('housemaster.share')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <CursorArrow pos={cursorPos} />
    </div>
  )
}

const PAYROLL_DELAYS = [1000, 500, 400, 900, 500, 400, 3200]

function PayrollDemo({ step = 0 }) {
  const openPress = step === 2
  const expanded = step >= 3
  const approvePress = step === 5
  const approved = step >= 6

  const cursorPos = [
    { top: 0,   left: 0,   opacity: 0 },
    { top: 112, left: 225, opacity: 1 },
    { top: 112, left: 225, opacity: 1 },
    { top: 112, left: 225, opacity: 1 },
    { top: 235, left: 70,  opacity: 1 },
    { top: 235, left: 70,  opacity: 1 },
    { top: 235, left: 70,  opacity: 0.3 },
  ][step]

  return (
    <div style={{ position: 'relative', width: '300px', flexShrink: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e0e0dc', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13)' }}>
        <BrowserChrome url="rannikon.com/payroll" />
        <div style={{ padding: '18px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
            Submissions
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {['Jun', 'Jul', 'Aug'].map(m => (
              <span key={m} style={{
                flex: 1, textAlign: 'center', padding: '5px 0', fontSize: '10px', fontWeight: '700', borderRadius: '6px',
                background: m === 'Aug' ? '#b45309' : '#f5f5f0', color: m === 'Aug' ? '#fff' : '#888'
              }}>{m}</span>
            ))}
          </div>

          <div style={{ fontSize: '9px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Kivilinna/Salo</div>

          <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#b45309' }}>#247 <span style={{ color: '#333', fontWeight: '700' }}>Ahmed K.</span></div>
                <div style={{ fontSize: '10px', color: '#888' }}>White, Orange</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '8px',
                  background: approved ? '#e8f5e9' : '#fff3e0', color: approved ? '#2d6a2d' : '#b45309',
                  border: `1px solid ${approved ? '#a5d6a7' : '#ffcc80'}`, transition: 'all 0.2s'
                }}>{approved ? 'Approved' : 'Pending'}</span>
                <span style={{
                  fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid #b45309', color: openPress ? '#fff' : '#b45309', background: openPress ? '#b45309' : '#fff9f0',
                  transform: openPress ? 'scale(0.94)' : 'scale(1)', transition: 'all 0.15s'
                }}>{expanded ? 'Close' : 'Open'}</span>
              </div>
            </div>

            <div style={{ overflow: 'hidden', maxHeight: expanded ? '150px' : '0', transition: 'max-height 0.4s ease' }}>
              <div style={{ padding: '0 12px 12px', borderTop: '1px solid #f0f0ec' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '3px', margin: '10px 0' }}>
                  {['Start', 'Finish', 'Break', 'Hours'].map((l, i) => (
                    <div key={l} style={{ textAlign: 'center', background: '#f5f5f2', borderRadius: '4px', padding: '4px 2px' }}>
                      <div style={{ fontSize: '7px', color: '#888' }}>{l}</div>
                      <div style={{ fontSize: '9px', fontWeight: '700' }}>{['07:30', '16:00', '30 min', '8:00'][i]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[['Approved', true], ['Rejected', false], ['Needs review', false]].map(([label, isApprove]) => (
                    <span key={label} style={{
                      fontSize: '9px', fontWeight: '700', padding: '4px 9px', borderRadius: '5px', cursor: 'pointer',
                      border: `1px solid ${approved && isApprove ? '#2d6a2d' : '#ddd'}`,
                      background: approved && isApprove ? '#e8f5e9' : '#fff',
                      color: approved && isApprove ? '#2d6a2d' : '#666',
                      transform: approvePress && isApprove ? 'scale(0.92)' : 'scale(1)', transition: 'all 0.15s'
                    }}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CursorArrow pos={cursorPos} />
    </div>
  )
}

function FixedDemoFrame({ children }) {
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const measure = () => {
      const ow = outer.clientWidth
      const oh = outer.clientHeight
      const iw = inner.scrollWidth
      const ih = inner.scrollHeight
      if (!iw || !ih || !ow || !oh) return
      setScale(Math.min(ow / iw, oh / ih))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={outerRef} className="fixed-demo-frame" style={{ position: 'relative', overflow: 'hidden', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  )
}

function PlayPauseButton({ playing, onClick }) {
  return (
    <button onClick={onClick} aria-label={playing ? 'Pause animation' : 'Play animation'} style={{
      position: 'absolute', right: '16px', bottom: '16px', width: '38px', height: '38px', borderRadius: '50%',
      background: 'rgba(26,26,24,0.72)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', zIndex: 5, transition: 'background 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,26,24,0.9)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,26,24,0.72)'}>
      {playing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l14 8-14 8V4z" /></svg>
      )}
    </button>
  )
}

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const [activeFeatures, setActiveFeatures] = useState({ worker: 0, supervisor: 0, admin: 0, housemaster: 0, payroll: 0 })
  const [activeRole, setActiveRole] = useState(0)
  const [activeShowcase, setActiveShowcase] = useState(0)
  const [showcaseStep, setShowcaseStep] = useState(0)
  const [showcasePlaying, setShowcasePlaying] = useState(true)

  const showcaseTabs = [
    { key: 'supervisor', label: t('admin.roleSupervisor'), color: '#1a3a5c', title: t('home.tourSupervisorTitle'), desc: t('home.tourSupervisorDesc'), Demo: SupervisorDemo, delays: SUPERVISOR_DELAYS },
    { key: 'admin', label: t('admin.roleAdmin'), color: '#1565c0', title: t('home.tourAdminTitle'), desc: t('home.tourAdminDesc'), Demo: AdminDemo, delays: ADMIN_DELAYS },
    { key: 'housemaster', label: t('admin.roleHousemaster'), color: '#7b1fa2', title: t('home.tourHousemasterTitle'), desc: t('home.tourHousemasterDesc'), Demo: HousemasterDemo, delays: HOUSEMASTER_DELAYS },
    { key: 'worker', label: t('admin.roleWorker'), color: '#2d6a2d', title: t('home.tourWorkerTitle'), desc: t('home.tourWorkerDesc'), Demo: AnimatedDemo, delays: WORKER_DELAYS },
    { key: 'payroll', label: t('admin.rolePayroll'), color: '#b45309', title: t('home.tourPayrollTitle'), desc: t('home.tourPayrollDesc'), Demo: PayrollDemo, delays: PAYROLL_DELAYS },
  ]
  const activeShowcaseDef = showcaseTabs[activeShowcase]
  const showcaseFinished = showcaseStep >= activeShowcaseDef.delays.length - 1

  useEffect(() => {
    setShowcaseStep(0)
    setShowcasePlaying(true)
  }, [activeShowcase])

  useEffect(() => {
    if (!showcasePlaying) return
    const delays = activeShowcaseDef.delays
    if (showcaseStep >= delays.length - 1) return
    const tmr = setTimeout(() => setShowcaseStep(s => Math.min(s + 1, delays.length - 1)), delays[showcaseStep] ?? 1000)
    return () => clearTimeout(tmr)
  }, [showcasePlaying, showcaseStep, activeShowcase])

  function toggleShowcasePlay() {
    if (showcaseFinished) {
      setShowcaseStep(0)
      setShowcasePlaying(true)
    } else {
      setShowcasePlaying(p => !p)
    }
  }

  useEffect(() => {
    const t = setInterval(() => {
      setActiveFeatures(s => ({
        worker: (s.worker + 1) % 5,
        supervisor: (s.supervisor + 1) % 5,
        admin: (s.admin + 1) % 5,
        housemaster: (s.housemaster + 1) % 4,
        payroll: (s.payroll + 1) % 4,
      }))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const workerFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: t('home.wf1Title'),
      desc: t('home.wf1Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: t('home.wf2Title'),
      desc: t('home.wf2Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      title: t('home.wf3Title'),
      desc: t('home.wf3Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="14" r="3" /><circle cx="15" cy="14" r="3" /><circle cx="12" cy="9" r="3" /><path d="M12 6V3" /><path d="M9 3c0 1.5 1.5 2 3 2s3-.5 3-2" />
        </svg>
      ),
      title: t('home.wf4Title'),
      desc: t('home.wf4Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      title: t('home.wf5Title'),
      desc: t('home.wf5Desc')
    },
  ]

  const supervisorFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: t('home.sf1Title'),
      desc: t('home.sf1Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: t('home.sf2Title'),
      desc: t('home.sf2Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      title: t('home.sf3Title'),
      desc: t('home.sf3Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      title: t('home.sf4Title'),
      desc: t('home.sf4Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
      title: t('home.sf5Title'),
      desc: t('home.sf5Desc')
    },
  ]

  const adminFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: t('home.af1Title'),
      desc: t('home.af1Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      title: t('home.af2Title'),
      desc: t('home.af2Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
      title: t('home.af3Title'),
      desc: t('home.af3Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
      title: t('home.af4Title'),
      desc: t('home.af4Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
      title: t('home.af5Title'),
      desc: t('home.af5Desc')
    },
  ]

  const housemasterFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
        </svg>
      ),
      title: t('home.hf1Title'),
      desc: t('home.hf1Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      title: t('home.hf2Title'),
      desc: t('home.hf2Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      title: t('home.hf3Title'),
      desc: t('home.hf3Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      ),
      title: t('home.hf4Title'),
      desc: t('home.hf4Desc')
    },
  ]

  const payrollFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: t('home.pf1Title'),
      desc: t('home.pf1Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
      ),
      title: t('home.pf2Title'),
      desc: t('home.pf2Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      title: t('home.pf3Title'),
      desc: t('home.pf3Desc')
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
      title: t('home.pf4Title'),
      desc: t('home.pf4Desc')
    },
  ]

  const howItWorksRoles = [
    {
      key: 'worker',
      label: t('home.forWorkers'),
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
          t: t('home.wStep1T'),
          d: t('home.wStep1D')
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="11" x2="8.01" y2="11" /><line x1="12" y1="11" x2="12.01" y2="11" /><line x1="16" y1="11" x2="16.01" y2="11" /><line x1="8" y1="15" x2="8.01" y2="15" /><line x1="12" y1="15" x2="12.01" y2="15" /><line x1="16" y1="15" x2="16.01" y2="15" /><line x1="8" y1="19" x2="12" y2="19" />
            </svg>
          ),
          t: t('home.wStep2T'),
          d: t('home.wStep2D')
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
          t: t('home.wStep3T'),
          d: t('home.wStep3D')
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ),
          t: t('home.wStep4T'),
          d: t('home.wStep4D')
        },
      ]
    },
    {
      key: 'supervisor',
      label: t('home.forSupervisors'),
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
          t: t('home.sStep1T'),
          d: t('home.sStep1D')
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="13" r="8" /><polyline points="11 9 11 13 14 14" /><line x1="19" y1="3" x2="19" y2="7" /><line x1="17" y1="5" x2="21" y2="5" />
            </svg>
          ),
          t: t('home.sStep2T'),
          d: t('home.sStep2D')
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
          t: t('home.sStep3T'),
          d: t('home.sStep3D')
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ),
          t: t('home.sStep4T'),
          d: t('home.sStep4D')
        },
      ]
    },
    {
      key: 'admin',
      label: t('home.forAdmins'),
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
          t: t('home.aStep1T'),
          d: t('home.aStep1D')
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          ),
          t: t('home.aStep2T'),
          d: t('home.aStep2D')
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          ),
          t: t('home.aStep3T'),
          d: t('home.aStep3D')
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          ),
          t: t('home.aStep4T'),
          d: t('home.aStep4D')
        },
      ]
    },
    {
      key: 'housemaster',
      label: t('home.forHousemasters'),
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
          t: t('home.hStep1T'),
          d: t('home.hStep1D')
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          ),
          t: t('home.hStep2T'),
          d: t('home.hStep2D')
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          ),
          t: t('home.hStep3T'),
          d: t('home.hStep3D')
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1fa2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          ),
          t: t('home.hStep4T'),
          d: t('home.hStep4D')
        },
      ]
    },
    {
      key: 'payroll',
      label: t('home.forPayroll'),
      color: '#b45309',
      iconBg: '#fff3e0',
      tabIcon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      steps: [
        {
          n: '01',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          ),
          t: t('home.pStep1T'),
          d: t('home.pStep1D')
        },
        {
          n: '02',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          ),
          t: t('home.pStep2T'),
          d: t('home.pStep2D')
        },
        {
          n: '03',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
          t: t('home.pStep3T'),
          d: t('home.pStep3D')
        },
        {
          n: '04',
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
            </svg>
          ),
          t: t('home.pStep4T'),
          d: t('home.pStep4D')
        },
      ]
    },
  ]

  return (
    <>
      <Head>
        <title>{t('home.pageTitle')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fafaf9;color:#1a1a18;-webkit-font-smoothing:antialiased}
        a{text-decoration:none;color:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes blinkCursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes popIn{from{opacity:0;transform:scale(0.4)}to{opacity:1;transform:scale(1)}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .float-produce{display:inline-block;animation:floatY 4.5s ease-in-out infinite}
        .nav-btn:hover{background:#f0f0ec!important}
        .cta-btn:hover{background:#235223!important;transform:translateY(-1px)}
        .cta-btn{transition:all 0.2s}
        .feature-tab{transition:all 0.2s;cursor:pointer}
        .feature-tab-light:hover{background:#f5f5f2!important}
        .feature-tab-dark:hover{background:rgba(255,255,255,0.05)!important}
        .check-pop{animation:popIn 0.25s ease}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,0.1)!important}
        .card-hover{transition:all 0.25s}
        .fade-up{animation:fadeUp 0.7s ease both}
        .footer-link:hover{color:#2d6a2d!important}
        .footer-newsletter-input:focus{outline:none;border-color:#2d6a2d!important}
        .fixed-demo-frame{height:520px}
        @media(max-width:768px){
          .nav-links{display:none!important}
          .footer-cols{flex-direction:column!important;gap:32px!important}
          .fixed-demo-frame{height:420px}
        }
        @media(max-width:480px){
          .nav-bar{padding:0 12px!important}
          .nav-actions{gap:6px!important}
          .nav-action-btn{padding:7px 10px!important;font-size:13px!important}
          .fixed-demo-frame{height:360px}
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-bar" style={{ background: '#fff', borderBottom: '1px solid #e8e8e3', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, padding: '0 24px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '40px', width: 'auto', flexShrink: 0, borderRadius: '6px' }} />
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            {[
              { href: '#features', label: t('home.features') },
              { href: '#how-it-works', label: t('home.howItWorksTitle') },
            ].map(l => (
              <a key={l.href} href={l.href} style={{ fontSize: '14px', fontWeight: '500', color: '#555', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#555'}>{l.label}</a>
            ))}
          </div>
          <div className="nav-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="nav-btn nav-action-btn" onClick={() => router.push('/login')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#333', whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.15s' }}>{t('auth.login')}</button>
            <button className="cta-btn nav-action-btn" onClick={() => router.push('/register')} style={{ padding: '8px 16px', background: '#2d6a2d', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0 }}>{t('home.getStarted')}</button>
            <LanguageSelector className="lang-full" />
            <LanguageSelector compact className="lang-compact" />
          </div>
        </div>
      </nav>

      {/* spacer for fixed nav */}
      <div style={{ height: '60px' }} />

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg,#f2f8f2 0%,#fafaf9 45%,#f8f4ee 100%)', padding: '72px 24px 60px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '400px', height: '400px', background: 'radial-gradient(circle,rgba(45,106,45,0.07) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(21,101,192,0.05) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h1 className="fade-up" style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: '800', lineHeight: '1.08', letterSpacing: '-1.5px', marginBottom: '18px' }}>
            {t('home.heroTitleLine1')}<br /><span style={{ color: '#2d6a2d' }}>{t('home.heroTitleLine2')}</span>
          </h1>
          <p className="fade-up" style={{ fontSize: '17px', color: '#555', lineHeight: '1.7', marginBottom: '30px', animationDelay: '0.2s' }}>
            {t('home.heroDesc')}
          </p>
          <div className="fade-up" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', animationDelay: '0.3s' }}>
            <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '13px 26px', background: '#2d6a2d', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>
              {t('auth.createAnAccount')}
            </button>
            <button onClick={() => router.push('/login')} style={{ padding: '13px 26px', background: '#fff', border: '1px solid #e0e0dc', borderRadius: '10px', fontSize: '15px', fontWeight: '600', color: '#333', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              {t('auth.login')}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '28px', flexWrap: 'wrap', maxWidth: '780px', margin: '64px auto 0' }}>
            {[
              {
                key: 'strawberry', color: '#e5393b', size: 60, offset: 0, delay: '0s',
                svg: (
                  <svg width="60" height="60" viewBox="0 0 64 64">
                    <path d="M32 22c-11 0-19 9-19 21 0 9 8.5 17 19 17s19-8 19-17c0-12-8-21-19-21z" fill="#e5393b" />
                    <g fill="#fff" opacity="0.85">
                      <circle cx="24" cy="35" r="1.6" /><circle cx="32" cy="31" r="1.6" /><circle cx="40" cy="35" r="1.6" />
                      <circle cx="26" cy="45" r="1.6" /><circle cx="38" cy="45" r="1.6" /><circle cx="32" cy="51" r="1.6" />
                    </g>
                    <path d="M32 22l-6-8 6 3 6-3-6 8z" fill="#43a047" />
                    <path d="M19 20c4.5-3.5 9-3.5 13 0 4-3.5 8.5-3.5 13 0" stroke="#43a047" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                key: 'pea', color: '#558b2f', size: 68, offset: 18, delay: '0.6s',
                svg: (
                  <svg width="68" height="68" viewBox="0 0 64 64">
                    <g transform="rotate(-16 32 32)">
                      <rect x="8" y="23" width="48" height="22" rx="11" fill="#7cb342" />
                      <circle cx="19" cy="34" r="8" fill="#33691e" />
                      <circle cx="32" cy="34" r="8" fill="#33691e" />
                      <circle cx="45" cy="34" r="8" fill="#33691e" />
                    </g>
                  </svg>
                )
              },
              {
                key: 'blueberry', color: '#3949ab', size: 52, offset: -6, delay: '1.1s',
                svg: (
                  <svg width="52" height="52" viewBox="0 0 64 64">
                    <circle cx="32" cy="36" r="20" fill="#3949ab" />
                    <circle cx="25" cy="28" r="5" fill="#7986cb" opacity="0.5" />
                    <path d="M32 19l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#1a237e" />
                  </svg>
                )
              },
              {
                key: 'cucumber', color: '#689f38', size: 64, offset: 10, delay: '1.6s',
                svg: (
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <g transform="rotate(-22 32 32)">
                      <rect x="5" y="25" width="54" height="18" rx="9" fill="#8bc34a" />
                      <g fill="#558b2f" opacity="0.75">
                        <circle cx="15" cy="30" r="1.4" /><circle cx="24" cy="38" r="1.4" /><circle cx="33" cy="30" r="1.4" />
                        <circle cx="42" cy="38" r="1.4" /><circle cx="51" cy="30" r="1.4" />
                      </g>
                    </g>
                  </svg>
                )
              },
              {
                key: 'raspberry', color: '#c2185b', size: 54, offset: -10, delay: '2.1s',
                svg: (
                  <svg width="54" height="54" viewBox="0 0 64 64">
                    <path d="M32 16l-4-6 4 2 4-2-4 6z" fill="#4caf50" />
                    <g fill="#c2185b">
                      <circle cx="26" cy="24" r="6" /><circle cx="38" cy="24" r="6" />
                      <circle cx="20" cy="34" r="6" /><circle cx="32" cy="34" r="6" /><circle cx="44" cy="34" r="6" />
                      <circle cx="26" cy="44" r="6" /><circle cx="38" cy="44" r="6" />
                      <circle cx="32" cy="52" r="6" />
                    </g>
                    <g fill="#fff" opacity="0.3">
                      <circle cx="24" cy="22" r="1.3" /><circle cx="30" cy="32" r="1.3" /><circle cx="36" cy="42" r="1.3" />
                    </g>
                  </svg>
                )
              },
              {
                key: 'blackcurrant', color: '#4a2c6d', size: 50, offset: 14, delay: '2.6s',
                svg: (
                  <svg width="50" height="50" viewBox="0 0 64 64">
                    <path d="M32 14v16M32 30l-14 6M32 30l14 6M32 30l-10 16M32 30l10 16" stroke="#6a4c93" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <g fill="#2c0f3d">
                      <circle cx="18" cy="32" r="7" /><circle cx="46" cy="32" r="7" />
                      <circle cx="22" cy="46" r="7" /><circle cx="42" cy="46" r="7" />
                    </g>
                  </svg>
                )
              },
              {
                key: 'redcurrant', color: '#e53935', size: 46, offset: -6, delay: '3.1s',
                svg: (
                  <svg width="46" height="46" viewBox="0 0 64 64">
                    <path d="M32 12v42" stroke="#7cb342" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <g fill="#e53935">
                      <circle cx="32" cy="20" r="5" /><circle cx="32" cy="30" r="5.5" /><circle cx="32" cy="41" r="6" /><circle cx="32" cy="52" r="6" />
                    </g>
                    <g fill="#fff" opacity="0.35">
                      <circle cx="30" cy="18" r="1.4" /><circle cx="30" cy="28" r="1.5" /><circle cx="30" cy="39" r="1.6" /><circle cx="30" cy="50" r="1.6" />
                    </g>
                  </svg>
                )
              },
              {
                key: 'rhubarb', color: '#e05a6e', size: 58, offset: 6, delay: '3.6s',
                svg: (
                  <svg width="58" height="58" viewBox="0 0 64 64">
                    <path d="M28 60V24" stroke="#e05a6e" strokeWidth="8" strokeLinecap="round" />
                    <path d="M36 60V28" stroke="#d1435a" strokeWidth="6" strokeLinecap="round" />
                    <path d="M32 26c-10-2-16-10-16-18 10 0 16 8 16 14 0-6 6-14 16-14 0 8-6 16-16 18z" fill="#4caf50" />
                  </svg>
                )
              },
              {
                key: 'watermelon', color: '#e53935', size: 62, offset: -12, delay: '4.1s',
                svg: (
                  <svg width="62" height="62" viewBox="0 0 64 64">
                    <path d="M8 30c0 18 12 30 24 30s24-12 24-30" fill="#8bc34a" />
                    <path d="M12 30c0 15 10 25 20 25s20-10 20-25" fill="#fff" />
                    <path d="M15 30c0 13 8 22 17 22s17-9 17-22" fill="#e53935" />
                    <g fill="#212121">
                      <circle cx="24" cy="26" r="1.5" /><circle cx="32" cy="22" r="1.5" /><circle cx="40" cy="26" r="1.5" />
                      <circle cx="28" cy="34" r="1.5" /><circle cx="36" cy="34" r="1.5" />
                    </g>
                  </svg>
                )
              },
            ].map(item => (
              <div key={item.key} style={{ marginBottom: item.offset }}>
                <div className="float-produce" style={{ animationDelay: item.delay, filter: `drop-shadow(0 0 10px ${item.color}99) drop-shadow(0 0 26px ${item.color}66)` }}>
                  {item.svg}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLE SHOWCASE */}
      <section style={{ padding: '72px 24px 90px', background: '#fafaf9' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div key={activeShowcaseDef.key} className="fade-up" style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: '800', letterSpacing: '-0.6px', marginBottom: '14px', lineHeight: '1.2' }}>{activeShowcaseDef.title}</h2>
            <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.7' }}>{activeShowcaseDef.desc}</p>
          </div>

          <div style={{ position: 'relative', marginTop: '48px', paddingBottom: '30px' }}>
            <div style={{
              position: 'relative', width: '100%',
              background: '#fff', border: '1px solid #e8e8e3', borderRadius: '24px', padding: '32px',
              boxShadow: `0 0 100px -20px ${activeShowcaseDef.color}55, 0 4px 24px rgba(0,0,0,0.06)`,
              transition: 'box-shadow 0.3s ease'
            }}>
              <FixedDemoFrame>
                <activeShowcaseDef.Demo step={showcaseStep} />
              </FixedDemoFrame>
              <PlayPauseButton playing={showcasePlaying && !showcaseFinished} onClick={toggleShowcasePlay} />
            </div>

            <div style={{
              position: 'absolute', left: '50%', bottom: 0, transform: 'translate(-50%, 50%)',
              display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap',
              background: '#fff', border: '1px solid #e8e8e3', borderRadius: '28px', padding: '6px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: 'max-content', maxWidth: '92vw'
            }}>
              {showcaseTabs.map((r, i) => (
                <button key={r.key} onClick={() => setActiveShowcase(i)} style={{
                  padding: '10px 20px', borderRadius: '22px',
                  border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
                  background: activeShowcase === i ? r.color : 'transparent',
                  color: activeShowcase === i ? '#fff' : '#666',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>{t('home.featuresTitle')}</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6' }}>{t('home.featuresDesc')}</p>
          </div>

          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>

            {/* Workers */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #fafaf8 0%, #eef6ee 100%)', border: '1px solid #e8e8e3', borderRadius: '24px', padding: '44px', boxShadow: '0 0 90px -25px rgba(45,106,45,0.35), 0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', background: '#e8f5e9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '24px' }}>{t('home.forWorkers')}</h3>
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
                {t('home.registerAsWorker')}
              </button>
            </div>

            {/* Supervisors */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #1a1a18 0%, #20231f 100%)', border: '1px solid #333', borderRadius: '24px', padding: '44px', boxShadow: '0 0 100px -20px rgba(26,58,92,0.55), 0 4px 24px rgba(0,0,0,0.18)' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '24px', color: '#fff' }}>{t('home.forSupervisors')}</h3>
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
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #fafaf8 0%, #eaf2fb 100%)', border: '1px solid #e8e8e3', borderRadius: '24px', padding: '44px', boxShadow: '0 0 90px -25px rgba(21,101,192,0.35), 0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', background: '#e3f2fd', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '24px' }}>{t('home.forAdmins')}</h3>
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
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #1a1a18 0%, #221a26 100%)', border: '1px solid #333', borderRadius: '24px', padding: '44px', boxShadow: '0 0 100px -20px rgba(123,31,162,0.5), 0 4px 24px rgba(0,0,0,0.18)' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(123,31,162,0.25)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ce93d8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '24px', color: '#fff' }}>{t('home.forHousemasters')}</h3>
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

            {/* Payroll */}
            <div className="card-hover" style={{ background: 'linear-gradient(145deg, #fffaf3 0%, #fdf1e0 100%)', border: '1px solid #f3e0c0', borderRadius: '24px', padding: '44px', boxShadow: '0 0 90px -25px rgba(180,83,9,0.35), 0 4px 24px rgba(0,0,0,0.04)' }}>
              <div style={{ width: '56px', height: '56px', background: '#fff3e0', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '24px' }}>{t('home.forPayroll')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {payrollFeatures.map((f, i) => (
                  <div key={i} className="feature-tab feature-tab-light" onClick={() => setActiveFeatures(s => ({ ...s, payroll: i }))}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeatures.payroll === i ? '#fff3e0' : 'transparent', marginBottom: '4px', border: activeFeatures.payroll === i ? '1px solid #ffcc80' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeatures.payroll === i ? '6px' : '0' }}>
                      <span style={{ color: activeFeatures.payroll === i ? '#b45309' : '#888', flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a18', flex: 1 }}>{f.title}</span>
                      {activeFeatures.payroll === i && (
                        <svg className="check-pop" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    {activeFeatures.payroll === i && <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
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
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>{t('home.howItWorksTitle')}</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '460px', margin: '0 auto' }}>{t('home.howItWorksDesc')}</p>
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
            {howItWorksRoles[activeRole].steps.map(({ n, icon, t: stepTitle, d }) => (
              <div key={n} style={{ display: 'flex', gap: '14px' }}>
                <div style={{ flexShrink: 0, width: '36px', height: '36px', background: howItWorksRoles[activeRole].iconBg, borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: howItWorksRoles[activeRole].color, fontFamily: 'monospace' }}>{n}</span>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.1px', color: '#1a1a18' }}>{stepTitle}</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#f5f5f0', color: '#1a1a18', padding: '0 24px', borderTop: '1px solid #e8e8e3' }}>

        {/* Newsletter */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #e0e0dc', padding: '48px 0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a18', marginBottom: '6px' }}>{t('home.newsletterTitle')}</p>
            <p style={{ fontSize: '13px', color: '#666', maxWidth: '340px', lineHeight: '1.6' }}>{t('home.newsletterDesc')}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder={t('home.enterEmail')}
              className="footer-newsletter-input"
              style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px', background: '#fff', color: '#1a1a18', width: '220px', fontFamily: 'inherit' }}
            />
            <button style={{ padding: '8px 16px', background: '#2d6a2d', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('home.subscribe')}</button>
          </div>
        </div>

        {/* Link columns */}
        <div className="footer-cols" style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #e0e0dc', padding: '40px 0', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          {[
            {
              title: t('home.platform'),
              links: [[t('home.features'), '#features'], [t('home.howItWorksTitle'), '#how-it-works'], [t('home.timesheets'), '/login'], [t('home.paperForms'), '/login']]
            },
            {
              title: t('home.resources'),
              links: [[t('home.documentation'), '#'], [t('home.apiReference'), '#'], [t('home.changelog'), '#'], [t('home.tutorials'), '#'], [t('home.systemStatus'), '#']]
            },
            {
              title: t('home.support'),
              links: [[t('home.helpCenter'), '#'], [t('home.contactUs'), '#'], [t('home.privacyPolicy'), '/privacy'], [t('home.termsOfService'), '/terms'], [t('home.cookiePolicy'), '#']]
            },
            {
              title: t('home.company'),
              links: [[t('home.aboutUs'), '#'], ['Rannikon Puutarha', '#'], [t('home.blog'), '#'], [t('home.careers'), '#'], [t('home.press'), '#']]
            },
          ].map(col => (
            <div key={col.title} style={{ flex: '1', minWidth: '140px' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a18', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} className="footer-link" style={{ fontSize: '13px', color: '#666', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#666'}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: '#888' }}>
            {'© ' + new Date().getFullYear() + ' Rannikon Puutarha · '}
            <a href="/terms" style={{ color: '#888' }} onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#888'}>{t('footer.terms')}</a>
            {' · '}
            <a href="/privacy" style={{ color: '#888' }} onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#888'}>{t('footer.privacy')}</a>
            {' · '}
            <a href="#" style={{ color: '#888' }} onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#888'}>{t('home.sitemap')}</a>
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Facebook */}
            <a href="#" style={{ color: '#888', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#2d6a2d'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" style={{ color: '#888', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#2d6a2d'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
          </div>
        </div>

      </footer>
    </>
  )
}
