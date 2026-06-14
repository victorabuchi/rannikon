import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { saveAuth } from '../lib/auth'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

const PAPERS = [
  {
    id: 'white',
    nameKey: 'papers.whitePaper',
    accent: '#4ade80',
    headerBg: 'rgba(45,106,45,0.35)',
    colsKeys: ['papers.day', 'papers.start', 'papers.finish', 'papers.hours'],
    rows: [
      ['1', '09:30', '18:00', '7:30'],
      ['2', '10:00', '19:30', '7:30'],
      ['3', '09:15', '18:00', '7:30'],
    ],
  },
  {
    id: 'orange',
    nameKey: 'papers.orangePaper',
    accent: '#fb923c',
    headerBg: 'rgba(180,83,9,0.35)',
    colsKeys: ['papers.day', 'papers.start', 'papers.finish', 'papers.extraHrs'],
    rows: [
      ['1', '18:00', '21:30', '3:15'],
      ['2', '19:30', '22:00', '2:15'],
      ['3', '18:30', '21:15', '2:30'],
    ],
  },
  {
    id: 'weekly',
    nameKey: 'papers.weeklySummary',
    accent: '#60a5fa',
    headerBg: 'rgba(21,101,192,0.35)',
    colsKeys: ['papers.week', 'papers.regHrs', 'papers.extraHrs', 'papers.total'],
    rows: [
      ['1', '37:30', '12:15', '49:45'],
      ['2', '37:30', '9:00',  '46:30'],
      ['3', '30:00', '7:45',  '37:45'],
    ],
  },
  {
    id: 'green',
    nameKey: 'papers.greenPaper',
    accent: '#34d399',
    headerBg: 'rgba(5,150,105,0.35)',
    colsKeys: ['papers.day', 'papers.start', 'papers.finish', 'days.kgPicked'],
    rows: [
      ['1', '09:00', '16:30', '240 kg'],
      ['2', '09:30', '17:00', '195 kg'],
      ['3', '08:45', '16:15', '280 kg'],
    ],
  },
]

/* Cycles through all 4 papers, filling rows one by one — no movement */
function PaperFillAnimation() {
  const { t } = useLanguage()
  const [paperIdx, setPaperIdx] = useState(0)
  const [filledCount, setFilledCount] = useState(0)
  const [paperDone, setPaperDone] = useState(false)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    if (allDone) {
      const t = setTimeout(() => { setPaperIdx(0); setFilledCount(0); setPaperDone(false); setAllDone(false) }, 2600)
      return () => clearTimeout(t)
    }
    if (paperDone) {
      if (paperIdx < 3) {
        const t = setTimeout(() => { setPaperIdx(p => p + 1); setFilledCount(0); setPaperDone(false) }, 700)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setAllDone(true), 500)
        return () => clearTimeout(t)
      }
    }
    if (filledCount < 3) {
      const t = setTimeout(() => setFilledCount(c => c + 1), 550)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setPaperDone(true), 400)
      return () => clearTimeout(t)
    }
  }, [paperIdx, filledCount, paperDone, allDone])

  const paper = PAPERS[paperIdx]

  return (
    <div style={{ marginTop: '32px', maxWidth: '380px' }}>

      {/* Paper tab indicators */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        {PAPERS.map((p, i) => (
          <div key={p.id} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i < paperIdx || allDone ? p.accent : i === paperIdx ? p.accent : 'rgba(255,255,255,0.12)',
            opacity: i < paperIdx || allDone ? 0.5 : 1,
            transition: 'background 0.4s',
          }} />
        ))}
      </div>

      {/* Current paper card */}
      <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${paper.accent}30`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.4s' }}>

        <div style={{ background: paper.headerBg, padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.4s' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: paper.accent, textTransform: 'uppercase', letterSpacing: '0.8px', transition: 'color 0.4s' }}>{t(paper.nameKey)}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{t('months')[5]} 2026</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 72px', padding: '5px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {paper.colsKeys.map(k => (
            <span key={k} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t(k)}</span>
          ))}
        </div>

        {paper.rows.map((row, i) => {
          const visible = i < filledCount
          const isNew = i === filledCount - 1
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '36px 1fr 1fr 72px',
              padding: '6px 14px',
              borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: isNew ? `${paper.accent}10` : 'transparent',
              transition: 'background 0.5s',
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{row[0]}</span>
              <span style={{ fontSize: '12px', color: visible ? 'rgba(255,255,255,0.7)' : 'transparent', transition: 'color 0.3s' }}>{row[1]}</span>
              <span style={{ fontSize: '12px', color: visible ? 'rgba(255,255,255,0.7)' : 'transparent', transition: 'color 0.3s' }}>{row[2]}</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: visible ? paper.accent : 'transparent', transition: 'color 0.3s' }}>{row[3]}</span>
            </div>
          )
        })}
      </div>

      {/* Status badge */}
      <div style={{
        marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px',
        justifyContent: 'center', padding: '7px 14px',
        background: allDone ? 'rgba(45,106,45,0.3)' : paperDone ? `${paper.accent}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${allDone ? 'rgba(74,222,128,0.45)' : paperDone ? `${paper.accent}40` : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '8px', transition: 'all 0.45s',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={allDone ? '#4ade80' : paperDone ? paper.accent : 'rgba(255,255,255,0.18)'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 0.4s', flexShrink: 0 }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span style={{ fontSize: '12px', fontWeight: '600', transition: 'color 0.4s',
          color: allDone ? '#4ade80' : paperDone ? paper.accent : 'rgba(255,255,255,0.22)' }}>
          {allDone ? t('register.allPapersFilled') : paperDone ? `${t(paper.nameKey)} ${t('register.complete')}` : `${t('register.filling')} ${t(paper.nameKey)}...`}
        </span>
      </div>
    </div>
  )
}

const COUNTRIES = [
  'Finland', 'Sweden', 'Norway', 'Denmark', 'Estonia', 'Latvia', 'Lithuania',
  'Poland', 'Germany', 'Romania', 'Bulgaria', 'Hungary', 'Slovakia',
  'Ukraine', 'Nigeria', 'Cameroon', 'Cambodia',
  'Thailand', 'Vietnam', 'Nepal', 'Philippines', 'Other'
]

export default function Register() {
  const router = useRouter()
  const { t } = useLanguage()
  const [form, setForm] = useState({ work_number: '', full_name: '', email: '', password: '' })
  const [country, setCountry] = useState('Finland')
  const [emailPref, setEmailPref] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [cookieBanner, setCookieBanner] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setCookieBanner(true), 3000)
    return () => clearTimeout(t)
  }, [])

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', form)
      saveAuth(res.data.token, res.data.worker)
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || t('register.registrationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>{t('auth.register')} | Rannikon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#0e1a0e;color:#e6edf3;-webkit-font-smoothing:antialiased}
        a{text-decoration:none;color:inherit}
        .gh-input{width:100%;padding:5px 12px;font-size:14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:inherit;color:#1a1a18;height:32px;transition:border-color 0.15s,box-shadow 0.15s}
        .gh-input:focus{outline:none;border-color:#2d6a2d;box-shadow:0 0 0 3px rgba(45,106,45,0.15)}
        .gh-select{width:100%;padding:4px 12px;font-size:14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:inherit;color:#1a1a18;height:32px;cursor:pointer}
        .gh-select:focus{outline:none;border-color:#2d6a2d;box-shadow:0 0 0 3px rgba(45,106,45,0.15)}
        .gh-input-wrap{position:relative}
        .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#888;display:flex;align-items:center;padding:0}
        .gh-btn-green{width:100%;padding:5px 16px;height:34px;background:#2d6a2d;color:#fff;font-size:14px;font-weight:600;border:1px solid rgba(0,0,0,0.15);border-radius:6px;cursor:pointer;font-family:inherit;transition:background 0.15s;display:flex;align-items:center;justify-content:center;gap:6px}
        .gh-btn-green:hover{background:#235223}
        .gh-btn-green:disabled{background:#94a68e;cursor:not-allowed}
        .gh-btn-outline{width:100%;padding:5px 16px;height:32px;background:#f6f8fa;color:#1a1a18;font-size:14px;font-weight:500;border:1px solid #d0d7de;border-radius:6px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;transition:background 0.15s}
        .gh-btn-outline:hover{background:#eaeef2}
        .gh-divider{display:flex;align-items:center;gap:12px;margin:10px 0;color:#8c959f;font-size:12px}
        .gh-divider::before,.gh-divider::after{content:'';flex:1;height:1px;background:#d0d7de}
        .hint{font-size:12px;color:#8c959f;margin-top:4px;line-height:1.5}
        .error-box{background:#fff0f0;border:1px solid #ffc1c0;color:#cf2030;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:12px}
        .feature-item{display:flex;gap:10px;align-items:flex-start;padding:7px 0}
        .feature-item+.feature-item{border-top:1px solid rgba(255,255,255,0.07)}
        .features-toggle{background:none;border:none;color:rgba(255,255,255,0.65);font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:6px;padding:0;font-family:inherit;transition:color 0.15s}
        .features-toggle:hover{color:#fff}
        .field-label{display:block;font-size:14px;font-weight:600;margin-bottom:4px;color:#1a1a18}
        .field-label span{color:#cf2030;margin-left:1px}
        .cookie-popup{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid #e0e0dc;border-radius:14px;padding:18px 22px;font-size:13px;color:#444;z-index:1000;box-shadow:0 8px 32px rgba(0,0,0,0.14);width:calc(100% - 32px);max-width:460px;animation:popupSlide 0.3s ease}
        .cookie-popup a{color:#2d6a2d;text-decoration:none}
        .cookie-popup a:hover{text-decoration:underline}
        @keyframes popupSlide{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        .reg-mobile-top{display:none}
        @media(max-width:768px){
          .reg-left{display:none!important}
          .reg-right{width:100%!important;max-width:100%!important;background:#fff!important;padding:40px 20px 80px!important;min-height:100vh}
          .reg-mobile-top{display:flex;flex-direction:column;align-items:center;margin-bottom:20px}
        }
      `}</style>

      <div className="reg-layout" style={{ display: 'flex', minHeight: '100vh' }}>

        {/* LEFT PANEL */}
        <div className="reg-left" style={{
          flex: 1, padding: '56px 52px 56px',
          background: 'linear-gradient(160deg, #0e1a0e 0%, #1a3a1a 55%, #0e1f0e 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          minHeight: '100vh', position: 'relative', overflow: 'hidden'
        }}>

          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(74,222,128,0.05) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(45,106,45,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: '400px' }}>

            <div onClick={() => router.push('/')} style={{ cursor: 'pointer', display: 'inline-block', marginBottom: '28px' }}>
              <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '72px', width: 'auto', borderRadius: '12px', display: 'block', marginBottom: '8px' }} />
              <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '28px', color: '#4ade80', display: 'block', lineHeight: 1 }}>Rannikon Puutarha</span>
            </div>

            <h1 style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: '700', lineHeight: 1.15, marginBottom: '10px', color: '#fff' }}>
              {t('register.createYourAccount')}
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', marginBottom: '20px' }}>
              {t('register.trackHours')}<br />{t('register.autoCalcForms')}
            </p>

            <button className="features-toggle" onClick={() => setShowFeatures(s => !s)}>
              {t('register.seeWhatsIncluded')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: showFeatures ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            <div style={{ overflow: 'hidden', maxHeight: showFeatures ? '400px' : '0', transition: 'max-height 0.35s ease', marginTop: showFeatures ? '14px' : '0' }}>
              {t('register.features').map((f, i) => (
                <div key={i} className="feature-item">
                  <div style={{ flexShrink: 0, marginTop: '2px', width: '18px', height: '18px', background: 'rgba(74,222,128,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#e6edf3', marginBottom: '1px' }}>{f.title}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <PaperFillAnimation />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="reg-right" style={{ width: '460px', maxWidth: '460px', background: '#fff', overflowY: 'auto', padding: '40px 36px 80px', display: 'flex', flexDirection: 'column' }}>

          {/* Mobile-only header */}
          <div className="reg-mobile-top" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '48px', width: 'auto', marginBottom: '14px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: '300', letterSpacing: '-0.3px', color: '#1a1a18' }}>{t('register.createYourAccount')}</h1>
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            {t('register.alreadyHaveAccount')}{' '}
            <a href="/login" style={{ color: '#2d6a2d', fontWeight: '600' }}
              onMouseEnter={e => e.target.style.textDecoration = 'underline'}
              onMouseLeave={e => e.target.style.textDecoration = 'none'}>
              {t('auth.login')}
            </a>
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a18', marginBottom: '16px', textAlign: 'center' }}>{t('register.signUpFor')}</h2>

          <button className="gh-btn-outline" style={{ marginBottom: '4px' }} onClick={() => window.location.href = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4003') + '/api/auth/google'}>
            <GoogleIcon />
            {t('auth.continueWithGoogle')}
          </button>

          <div className="gh-divider">{t('auth.or')}</div>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div>
              <label className="field-label">{t('register.email')}<span>*</span></label>
              <input className="gh-input" type="email" name="email" placeholder={t('register.email')} value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="field-label">{t('auth.password')}<span>*</span></label>
              <div className="gh-input-wrap">
                <input className="gh-input" style={{ paddingRight: '36px' }} type={showPassword ? 'text' : 'password'} name="password" placeholder={t('auth.password')} value={form.password} onChange={handleChange} required />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}><EyeIcon open={showPassword} /></button>
              </div>
              <p className="hint">{t('register.passwordHint')}</p>
            </div>

            <div>
              <label className="field-label">{t('auth.workNumber')}<span>*</span></label>
              <input className="gh-input" type="text" name="work_number" placeholder={t('auth.workNumber')} value={form.work_number} onChange={handleChange} required />
              <p className="hint">{t('register.workNumberHint')}</p>
            </div>

            <div>
              <label className="field-label">{t('register.fullName')}<span>*</span></label>
              <input className="gh-input" type="text" name="full_name" placeholder={t('register.fullName')} value={form.full_name} onChange={handleChange} required />
            </div>

            <div>
              <label className="field-label">{t('register.countryRegion')}<span>*</span></label>
              <select className="gh-select" value={country} onChange={e => setCountry(e.target.value)}>
                {COUNTRIES.map((c, i) => <option key={c} value={c}>{t('register.countries')[i]}</option>)}
              </select>
              <p className="hint">{t('register.countryHint')}</p>
            </div>

            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a18', marginBottom: '6px' }}>{t('register.emailPreferences')}</p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={emailPref} onChange={e => setEmailPref(e.target.checked)} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#444', lineHeight: '1.5' }}>{t('register.emailPrefDesc')}</span>
              </label>
            </div>

            <button type="submit" className="gh-btn-green" disabled={loading} style={{ marginTop: '4px' }}>
              {loading ? t('register.creatingAccount') : t('auth.register')}
            </button>

          </form>

          <p style={{ fontSize: '11px', color: '#8c959f', marginTop: '14px', lineHeight: '1.7' }}>
            {t('register.agreeToTerms')}{' '}
            <a href="/terms" style={{ color: '#2d6a2d' }}>{t('register.termsOfService')}</a>.{' '}
            {t('register.seeOur')} <a href="/privacy" style={{ color: '#2d6a2d' }}>{t('register.privacyStatement')}</a> {t('register.forDetails')}{' '}
            {t('register.willSendEmails')}
          </p>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <LanguageSelector />
          </div>

        </div>
      </div>

      {/* Cookie popup */}
      {cookieBanner && (
        <div className="cookie-popup">
          <p style={{ marginBottom: '10px', lineHeight: '1.6' }}>
            {t('register.cookieMsg')}{' '}
            <a href="#">{t('register.managePreferences')}</a>{' · '}
            <a href="/privacy">{t('register.privacyStatement')}</a>{' · '}
            <a href="#">{t('register.thirdPartyCookies')}</a>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCookieBanner(false)} style={{ flex: 1, padding: '8px', background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('register.accept')}</button>
            <button onClick={() => setCookieBanner(false)} style={{ flex: 1, padding: '8px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>{t('register.reject')}</button>
          </div>
        </div>
      )}
    </>
  )
}
