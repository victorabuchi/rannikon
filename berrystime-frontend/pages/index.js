import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

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

function AnimatedDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const delays = [700, 500, 1100, 500, 1100, 450, 300, 3200]
    const t = setTimeout(() => setStep(s => (s + 1) % 8), delays[step] ?? 1000)
    return () => clearTimeout(t)
  }, [step])

  const startVal = step >= 2 ? '10:30' : ''
  const finishVal = step >= 4 ? '18:30' : ''
  const btnClick = step === 6
  const showResults = step === 7

  const cursorPos = [
    { top: 0,   left: 0,   opacity: 0   },
    { top: 155, left: 175, opacity: 1   },
    { top: 155, left: 175, opacity: 1   },
    { top: 210, left: 175, opacity: 1   },
    { top: 210, left: 175, opacity: 1   },
    { top: 247, left: 140, opacity: 1   },
    { top: 247, left: 140, opacity: 1   },
    { top: 247, left: 140, opacity: 0.3 },
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
            Log work hours
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Worker number</div>
            <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '7px 9px', fontSize: '13px', fontWeight: '600', background: '#fafaf9', color: '#333' }}>247</div>
          </div>

          <div style={{ marginBottom: '9px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Start time</div>
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

          <div style={{ marginBottom: '13px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '500' }}>Finish time</div>
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

          <div style={{
            background: '#2d6a2d', borderRadius: '7px', padding: '9px', textAlign: 'center',
            color: '#fff', fontSize: '13px', fontWeight: '700',
            transform: btnClick ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.12s', opacity: btnClick ? 0.8 : 1, cursor: 'pointer'
          }}>
            Calculate hours
          </div>

          <div style={{ overflow: 'hidden', maxHeight: showResults ? '120px' : '0', transition: 'max-height 0.45s ease', marginTop: showResults ? '10px' : '0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
              {[['White', '7:30', '#e8f5e9', '#2d6a2d'], ['Orange', '1:00', '#fff3e0', '#b45309'], ['Total', '8:30', '#e3f2fd', '#1565c0']].map(([l, v, bg, c]) => (
                <div key={l} style={{ background: bg, borderRadius: '7px', padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: c, fontWeight: '700', marginBottom: '2px', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '7px', background: '#e8f5e9', borderRadius: '6px', padding: '5px 8px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#2d6a2d', fontWeight: '700' }}>All 3 papers auto-filled</span>
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

export default function Home() {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [work, setWork] = useState('')
  const [start, setStart] = useState('')
  const [finish, setFinish] = useState('')
  const [res, setRes] = useState(null)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(s => (s + 1) % 3), 3000)
    return () => clearInterval(t)
  }, [])

  function calc() {
    if (!date || !start || !finish) { alert('Please fill in date, start time, and finish time'); return }
    const wFinish = addMins(start, 450)
    const oStart = addMins(start, 480)
    const oMins = Math.max(0, toMins(finish) - toMins(oStart) - 15)
    setRes({ date, work, wStart: start, wFinish, oStart, oFinish: finish, oHours: toHHMM(oMins), total: toHHMM(450 + oMins) })
  }

  const workerFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: 'Calculate hours instantly',
      desc: 'Enter actual start and finish time. All 3 paper forms filled automatically.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      title: 'Track the full month',
      desc: 'See all 31 days in one view. Add, edit, and save each working day.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
        </svg>
      ),
      title: 'Weekly summary auto-built',
      desc: 'Your weekly totals calculate automatically as you add daily entries.'
    },
  ]

  const staffFeatures = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: 'View all workers',
      desc: "See every worker's timesheet in one admin panel."
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      title: 'Verify hours',
      desc: 'Approve working hours before they go to payroll.'
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      title: 'Export reports',
      desc: 'Download reports for the housemaster and payroll team.'
    },
  ]

  return (
    <>
      <Head>
        <title>Rannikon Puutarha — Work Hours Made Easy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fafaf9;color:#1a1a18;-webkit-font-smoothing:antialiased}
        a{text-decoration:none;color:inherit}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes blinkCursor{0%,100%{opacity:1}50%{opacity:0}}
        .nav-btn:hover{background:#f0f0ec!important}
        .cta-btn:hover{background:#235223!important;transform:translateY(-1px)}
        .cta-btn{transition:all 0.2s}
        .feature-tab{transition:all 0.2s;cursor:pointer}
        .feature-tab:hover{background:#f0f7f0!important}
        .calc-inp:focus{border-color:#2d6a2d!important;outline:none;box-shadow:0 0 0 3px rgba(45,106,45,0.12)}
        .card-hover:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,0.1)!important}
        .card-hover{transition:all 0.25s}
        .fade-up{animation:fadeUp 0.7s ease both}
        .dot-pulse{animation:pulse 2s infinite}
        .footer-link:hover{color:#c9d1d9!important}
        .footer-newsletter-input:focus{outline:none;border-color:#388e3c!important}
        @media(max-width:768px){
          .hero-grid{flex-direction:column!important}
          .features-grid{flex-direction:column!important}
          .nav-links{display:none!important}
          .hero-visual{display:none!important}
          .footer-cols{flex-direction:column!important;gap:32px!important}
        }
      `}</style>

      {/* NAV */}
      <nav style={{ background: 'rgba(250,250,249,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e8e8e3', position: 'sticky', top: 0, zIndex: 200, padding: '0 24px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '36px', width: 'auto', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '26px', color: '#1a1a18', lineHeight: 1 }}>Rannikon Puutarha</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
            {['Features', 'How it works', 'Calculator'].map(l => (
              <a key={l} href={'#' + l.toLowerCase().replace(' ', '-')} style={{ fontSize: '14px', fontWeight: '500', color: '#555', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#2d6a2d'} onMouseLeave={e => e.target.style.color = '#555'}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="nav-btn" onClick={() => router.push('/login')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#333', transition: 'background 0.15s' }}>Sign in</button>
            <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '8px 16px', background: '#2d6a2d', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>Get started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg,#f2f8f2 0%,#fafaf9 45%,#f8f4ee 100%)', padding: '72px 24px 60px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '400px', height: '400px', background: 'radial-gradient(circle,rgba(45,106,45,0.07) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle,rgba(21,101,192,0.05) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div className="hero-grid" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '56px' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '20px', padding: '5px 14px', marginBottom: '22px' }}>
              <span className="dot-pulse" style={{ width: '7px', height: '7px', background: '#2d6a2d', borderRadius: '50%', display: 'inline-block' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#2d6a2d' }}>500+ workers already using Rannikon</span>
            </div>
            <h1 className="fade-up" style={{ fontSize: 'clamp(30px,5vw,54px)', fontWeight: '800', lineHeight: '1.08', letterSpacing: '-1.5px', marginBottom: '18px', animationDelay: '0.1s' }}>
              Farm work hours,<br /><span style={{ color: '#2d6a2d' }}>done in seconds</span>
            </h1>
            <p className="fade-up" style={{ fontSize: '17px', color: '#555', lineHeight: '1.7', marginBottom: '30px', maxWidth: '420px', animationDelay: '0.2s' }}>
              Enter your start and finish time. Rannikon automatically calculates and fills all your paper forms — white paper, orange paper, and weekly summary. Zero mistakes.
            </p>
            <div className="fade-up" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', animationDelay: '0.3s' }}>
              <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '13px 26px', background: '#2d6a2d', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>
                Create account
              </button>
              <a href="#calculator" style={{ padding: '13px 26px', background: '#fff', border: '1px solid #e0e0dc', borderRadius: '10px', fontSize: '15px', fontWeight: '600', color: '#333', display: 'inline-block', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                Try calculator
              </a>
            </div>
            <div style={{ display: 'flex', gap: '32px', marginTop: '36px', flexWrap: 'wrap' }}>
              {[['500+', 'Workers'], ['3', 'Papers auto-filled'], ['0', 'Errors']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: '#2d6a2d', letterSpacing: '-0.5px' }}>{n}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual" style={{ flex: '1', minWidth: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AnimatedDemo />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>Built for everyone at the farm</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '440px', margin: '0 auto', lineHeight: '1.6' }}>Whether you pick berries or manage the team — Rannikon has you covered</p>
          </div>

          <div className="features-grid" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

            {/* Workers */}
            <div style={{ flex: '1', background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: '20px', padding: '32px', minWidth: '280px' }}>
              <div style={{ width: '44px', height: '44px', background: '#e8f5e9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px' }}>For workers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {workerFeatures.map((f, i) => (
                  <div key={i} className="feature-tab" onClick={() => setActiveFeature(i)}
                    style={{ padding: '14px', borderRadius: '12px', background: activeFeature === i ? '#e8f5e9' : 'transparent', marginBottom: '4px', border: activeFeature === i ? '1px solid #c8e6c9' : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: activeFeature === i ? '6px' : '0' }}>
                      <span style={{ color: activeFeature === i ? '#2d6a2d' : '#888', flexShrink: 0 }}>{f.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a18' }}>{f.title}</span>
                    </div>
                    {activeFeature === i && <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', paddingLeft: '28px', animation: 'slideIn 0.2s ease' }}>{f.desc}</p>}
                  </div>
                ))}
              </div>
              <button className="cta-btn" onClick={() => router.push('/register')} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#2d6a2d', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Register as worker
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '80px', gap: '8px', opacity: 0.4 }}>
              <div style={{ width: '1px', height: '60px', background: '#ccc' }} />
              <span style={{ fontSize: '11px', color: '#999', fontWeight: '500' }}>AND</span>
              <div style={{ width: '1px', height: '60px', background: '#ccc' }} />
            </div>

            {/* Supervisors */}
            <div style={{ flex: '1', background: '#1a1a18', border: '1px solid #333', borderRadius: '20px', padding: '32px', minWidth: '280px' }}>
              <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', marginBottom: '20px', color: '#fff' }}>For supervisors</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {staffFeatures.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '32px', height: '32px', background: 'rgba(45,106,45,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '3px' }}>{f.title}</div>
                      <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.4' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: '#888', fontWeight: '500' }}>Admin panel — coming soon</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '80px 24px', background: '#f5f5f0' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>How it works</h2>
            <p style={{ fontSize: '16px', color: '#666', maxWidth: '400px', margin: '0 auto' }}>Three steps to perfectly filled paper forms every day</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '20px' }}>
            {[
              {
                n: '01',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ),
                t: 'Enter your times',
                d: "Open the app, find today's date, and type your actual start time and finish time."
              },
              {
                n: '02',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                ),
                t: 'Rannikon calculates',
                d: 'All columns for white paper, orange paper, and weekly summary fill instantly and automatically.'
              },
              {
                n: '03',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ),
                t: 'Copy to paper form',
                d: 'See the exact values to write on your paper forms. Correct every time, zero math errors.'
              },
            ].map(({ n, icon, t, d }) => (
              <div key={n} className="card-hover" style={{ background: '#fff', border: '1px solid #e8e8e3', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#e8f5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#2d6a2d', fontFamily: 'monospace' }}>{n}</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.2px', marginBottom: '8px' }}>{t}</h3>
                <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: '800', letterSpacing: '-0.8px', marginBottom: '10px' }}>Try the calculator</h2>
            <p style={{ fontSize: '15px', color: '#666' }}>No account needed. See your forms filled instantly.</p>
          </div>
          <div style={{ background: '#fafaf8', border: '1px solid #e8e8e3', borderRadius: '20px', padding: '28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { l: 'Date', ph: 'e.g. 25', v: date, fn: e => setDate(e.target.value) },
                { l: 'What work', ph: 'e.g. cleaning, planting, water system', v: work, fn: e => setWork(e.target.value) },
                { l: 'Actual start time', ph: 'HH:MM e.g. 10:15', v: start, fn: e => setStart(e.target.value) },
                { l: 'Actual finish time', ph: 'HH:MM e.g. 20:45', v: finish, fn: e => setFinish(e.target.value) },
              ].map(({ l, ph, v, fn }) => (
                <div key={l}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>{l}</label>
                  <input className="calc-inp" style={{ width: '100%', padding: '11px 13px', fontSize: '15px', border: '1px solid #ddd', borderRadius: '9px', background: '#fff', fontFamily: 'inherit', transition: 'border-color 0.15s' }} placeholder={ph} value={v} onChange={fn} />
                </div>
              ))}
              <button className="cta-btn" onClick={calc} style={{ width: '100%', padding: '13px', background: '#2d6a2d', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>
                Calculate my hours
              </button>
            </div>

            {res && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#fff', border: '2px solid #2d6a2d', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#2d6a2d', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px' }}>White paper</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[['Start', res.wStart], ['Finish', res.wFinish], ['Hours', '7:30']].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center', background: '#f5f5f2', borderRadius: '8px', padding: '8px 4px' }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>{l}</div>
                        <div style={{ fontSize: '15px', fontWeight: '700' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#fff3e0', border: '2px solid #e67e22', borderRadius: '14px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '12px' }}>Orange paper</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[['Start', res.oStart], ['Finish', res.oFinish], ['Hours', res.oHours]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '8px 4px' }}>
                        <div style={{ fontSize: '10px', color: '#c08040', marginBottom: '3px' }}>{l}</div>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#b45309' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#1565c0', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '6px' }}>Total hours today</p>
                  <p style={{ fontSize: '32px', fontWeight: '800', color: '#1565c0', letterSpacing: '-1px' }}>{res.total}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
                  Want to save all your days?{' '}
                  <a href="/register" style={{ color: '#2d6a2d', fontWeight: '600' }}>Create an account</a>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: '#2d6a2d', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: '800', color: '#fff', letterSpacing: '-0.8px', marginBottom: '14px', lineHeight: '1.1' }}>
            Stop calculating manually.<br />Start using Rannikon.
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '32px', lineHeight: '1.6' }}>
            Join 500+ workers at Rannikon Puutarha.
          </p>
          <button className="cta-btn" onClick={() => router.push('/register')} style={{ padding: '15px 36px', background: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', color: '#2d6a2d', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            Create your account
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0d1117', color: '#e6edf3', padding: '0 24px' }}>

        {/* Newsletter */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #21262d', padding: '48px 0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3', marginBottom: '6px' }}>Subscribe to our newsletter</p>
            <p style={{ fontSize: '13px', color: '#7d8590', maxWidth: '340px', lineHeight: '1.6' }}>Get tips, technical guides, and best practices. Twice a month.</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              placeholder="Enter your email"
              className="footer-newsletter-input"
              style={{ padding: '8px 14px', fontSize: '13px', border: '1px solid #30363d', borderRadius: '6px', background: '#161b22', color: '#e6edf3', width: '220px', fontFamily: 'inherit' }}
            />
            <button style={{ padding: '8px 16px', background: '#238636', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Subscribe</button>
          </div>
        </div>

        {/* Link columns */}
        <div className="footer-cols" style={{ maxWidth: '1080px', margin: '0 auto', borderBottom: '1px solid #21262d', padding: '40px 0', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          {[
            {
              title: 'Platform',
              links: [['Features', '#features'], ['How it works', '#how-it-works'], ['Calculator', '#calculator'], ['Timesheets', '/login'], ['Paper forms', '/login']]
            },
            {
              title: 'Resources',
              links: [['Documentation', '#'], ['API reference', '#'], ['Changelog', '#'], ['Tutorials', '#'], ['System status', '#']]
            },
            {
              title: 'Support',
              links: [['Help center', '#'], ['Contact us', '#'], ['Privacy policy', '#'], ['Terms of service', '#'], ['Cookie policy', '#']]
            },
            {
              title: 'Company',
              links: [['About us', '#'], ['Rannikon Puutarha', '#'], ['Blog', '#'], ['Careers', '#'], ['Press', '#']]
            },
          ].map(col => (
            <div key={col.title} style={{ flex: '1', minWidth: '140px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#e6edf3', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {col.links.map(([label, href]) => (
                  <a key={label} href={href} className="footer-link" style={{ fontSize: '13px', color: '#7d8590', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: '#7d8590' }}>
            {'© ' + new Date().getFullYear() + ' Rannikon Puutarha · '}
            <a href="#" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Terms</a>
            {' · '}
            <a href="#" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Privacy</a>
            {' · '}
            <a href="#" style={{ color: '#7d8590' }} onMouseEnter={e => e.target.style.color = '#c9d1d9'} onMouseLeave={e => e.target.style.color = '#7d8590'}>Sitemap</a>
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* LinkedIn */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /><circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            {/* Instagram */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            {/* YouTube */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a href="#" style={{ color: '#7d8590', transition: 'color 0.15s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#c9d1d9'} onMouseLeave={e => e.currentTarget.style.color = '#7d8590'}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.636zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>

      </footer>
    </>
  )
}
