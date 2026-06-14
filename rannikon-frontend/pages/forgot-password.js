import { useState } from 'react'
import Head from 'next/head'
import api from '../lib/api'
import { useLanguage } from '@/lib/i18n'
import LanguageSelector from '@/components/LanguageSelector'

export default function ForgotPassword() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      setError(err.response?.data?.error || t('auth.forgotEmailFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>{t('auth.resetYourPassword')} | Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a18;-webkit-font-smoothing:antialiased}
        .gh-input{width:100%;padding:5px 12px;font-size:14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:inherit;color:#1a1a18;height:32px;transition:border-color 0.15s,box-shadow 0.15s}
        .gh-input:focus{outline:none;border-color:#2d6a2d;box-shadow:0 0 0 3px rgba(45,106,45,0.15)}
        .gh-btn-green{width:100%;padding:5px 16px;height:34px;background:#2d6a2d;color:#fff;font-size:14px;font-weight:600;border:1px solid rgba(0,0,0,0.15);border-radius:6px;cursor:pointer;font-family:inherit;transition:background 0.15s}
        .gh-btn-green:hover{background:#235223}
        .gh-btn-green:disabled{background:#94a68e;cursor:not-allowed}
        .error-box{background:#fff0f0;border:1px solid #ffc1c0;color:#cf2030;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:12px}
        .footer-link{color:#0969da;font-size:11px;text-decoration:none}
        .footer-link:hover{text-decoration:underline}
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', marginBottom: '16px' }}>
          <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '48px', width: 'auto', marginBottom: '14px', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '300', letterSpacing: '-0.3px', color: '#1a1a18' }}>{t('auth.resetYourPassword')}</h1>
        </div>

        <div style={{ width: '100%', maxWidth: '340px', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px', background: '#fff' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2d6a2d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#2d6a2d' }}>{t('auth.checkYourEmail')}</h2>
              <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                {t('auth.resetLinkSentTo')} <b>{email}</b>.<br />
                {t('auth.clickLinkToReset')}
              </p>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>{t('auth.didNotReceive')}</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px', lineHeight: '1.6' }}>
                {t('auth.enterEmailForReset')}
              </p>
              {error && <div className="error-box">{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.emailAddress')}</label>
                  <input className="gh-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="gh-btn-green" disabled={loading}>
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
          <a href="/login" style={{ color: '#2d6a2d', fontWeight: '500' }}>{t('auth.backToSignIn')}</a>
        </p>

        <div style={{ marginTop: '20px' }}>
          <LanguageSelector />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px', paddingBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px 16px', justifyContent: 'center' }}>
          {['terms', 'privacy', 'contactSupport', 'manageCookies'].map(k => (
            <a key={k} href="#" className="footer-link">{t(`footer.${k}`)}</a>
          ))}
        </div>

      </div>
    </>
  )
}
