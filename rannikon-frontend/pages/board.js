import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { getWorker, isLoggedIn } from '../lib/auth'
import { useLanguage } from '@/lib/i18n'

const LOCALE_MAP = { en: 'en-GB', uk: 'uk-UA', km: 'km-KH', vi: 'vi-VN', ne: 'ne-NP' }

// Exact same house ↔ color mapping as the supervisor page's batch cards.
const GROUP_COLORS = {
  'Kivilinna/Salo':        { bg: '#e8f5e9', text: '#1b5e20', border: '#a5d6a7' },
  'Karton Cambodia':       { bg: '#e3f2fd', text: '#0d47a1', border: '#90caf9' },
  'Karton International':  { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  'Vassila':                { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },
  'Suppala':                { bg: '#f3e5f5', text: '#4a148c', border: '#ce93d8' },
  'Salo/Turku':             { bg: '#e0f7fa', text: '#006064', border: '#80deea' },
  'Unknown':                { bg: '#f5f5f5', text: '#555', border: '#ccc' },
}
const HOUSE_ORDER = Object.keys(GROUP_COLORS).filter(h => h !== 'Unknown')

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

const REFRESH_MS = 30000

export default function BoardPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [me, setMe] = useState(null)
  const [batches, setBatches] = useState([])
  const [now, setNow] = useState(new Date())

  const todayStr = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return }
    api.get('/api/auth/me').then(res => {
      setMe(res.data.worker)
    }).catch(() => {
      const w = getWorker()
      if (!w) { router.push('/login'); return }
      setMe(w)
    })
  }, [])

  useEffect(() => {
    loadBatches()
    const dataTimer = setInterval(loadBatches, REFRESH_MS)
    const clockTimer = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(dataTimer); clearInterval(clockTimer) }
  }, [])

  async function loadBatches() {
    try {
      const res = await api.get('/api/board/batches/' + todayStr)
      setBatches(res.data.batches || [])
    } catch {}
  }

  const dateLabel = now.toLocaleDateString(LOCALE_MAP[lang] || 'en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString(LOCALE_MAP[lang] || 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  if (!me) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#888' }}>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{t('board.badge')} | Rannikon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f5f5f0; -webkit-font-smoothing: antialiased; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f5f0', color: '#1a1a18' }}>

        {/* NAV — same white bar as every other page, so the logo blends the same way */}
        <div style={{ background: '#fff', borderBottom: '1px solid #ddd', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon" style={{ height: '48px', width: 'auto' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', color: '#2d6a2d' }}>Rannikon Puutarha</span>
                <span style={{ background: '#2d6a2d', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '5px', letterSpacing: '0.5px' }}>{t('board.badge')}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>{t('board.desc')}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '32px', fontWeight: '800', fontVariantNumeric: 'tabular-nums', letterSpacing: '1px', color: '#1a1a18' }}>{timeLabel}</div>
            <div style={{ fontSize: '14px', color: '#888', textTransform: 'capitalize' }}>{dateLabel}</div>
          </div>
        </div>

        <div style={{ padding: '28px 40px' }}>

        {/* House color legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px', background: '#fff', border: '1px solid #e8e8e3', borderRadius: '12px', padding: '14px 18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: '0.8px', marginRight: '4px', alignSelf: 'center' }}>{t('board.houses')}</span>
          {HOUSE_ORDER.map(house => (
            <span key={house} style={{ background: GROUP_COLORS[house].bg, color: GROUP_COLORS[house].text, border: `1px solid ${GROUP_COLORS[house].border}`, display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
              {house}
            </span>
          ))}
        </div>

        {/* Batches */}
        {batches.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '14px', padding: '64px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: '#555' }}>{t('board.noEntries')}</p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>{t('board.noEntriesDesc')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {batches.map(b => {
              const hasFinish = !!b.finish_time
              return (
                <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e8e3', borderLeft: `5px solid ${hasFinish ? '#2d6a2d' : '#f59e0b'}`, borderRadius: '14px', padding: '18px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px' }}>
                  <div style={{ minWidth: '190px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', fontVariantNumeric: 'tabular-nums' }}>
                      {b.start_time?.slice(0, 5)}
                      <span style={{ color: '#bbb', margin: '0 6px' }}>→</span>
                      {hasFinish ? b.finish_time?.slice(0, 5) : (
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('board.inProgress')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                      {b.worker_numbers?.length} {b.worker_numbers?.length !== 1 ? t('housemaster.workers') : t('housemaster.worker')}
                      {b.supervisor_name && <> &nbsp;·&nbsp; {b.supervisor_name}</>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
                    {b.worker_numbers?.map(wn => {
                      const c = GROUP_COLORS[getHouseGroup(wn)]
                      return (
                        <span key={wn} style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '6px 14px', borderRadius: '9px', fontSize: '16px', fontWeight: '800', letterSpacing: '0.3px' }}>
                          #{wn}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
            ‹ {t('board.exit')}
          </button>
        </div>

        </div>
      </div>
    </>
  )
}
