import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
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

export default function ResetPassword() {
  const router = useRouter()
  const { t } = useLanguage()
  const { token } = router.query
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }
    if (password.length < 8) {
      setError(t('auth.passwordMinLength'))
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>{t('auth.setNewPassword')} | Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a18;-webkit-font-smoothing:antialiased}
        .gh-input{width:100%;padding:5px 12px;font-size:14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:inherit;color:#1a1a18;height:32px;transition:border-color 0.15s,box-shadow 0.15s}
        .gh-input:focus{outline:none;border-color:#2d6a2d;box-shadow:0 0 0 3px rgba(45,106,45,0.15)}
        .gh-input-wrap{position:relative}
        .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#888;display:flex;align-items:center;padding:0}
        .gh-btn-green{width:100%;padding:5px 16px;height:34px;background:#2d6a2d;color:#fff;font-size:14px;font-weight:600;border:1px solid rgba(0,0,0,0.15);border-radius:6px;cursor:pointer;font-family:inherit;transition:background 0.15s}
        .gh-btn-green:hover{background:#235223}
        .gh-btn-green:disabled{background:#94a68e;cursor:not-allowed}
        .error-box{background:#fff0f0;border:1px solid #ffc1c0;color:#cf2030;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:12px}
        .success-box{background:#f0fff4;border:1px solid #c8e6c9;color:#2d6a2d;border-radius:6px;padding:12px;font-size:14px;text-align:center}
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', marginBottom: '16px' }}>
          <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '48px', width: 'auto', marginBottom: '14px', borderRadius: '8px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '300', letterSpacing: '-0.3px', color: '#1a1a18' }}>{t('auth.setNewPassword')}</h1>
        </div>

        <div style={{ width: '100%', maxWidth: '340px', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px', background: '#fff' }}>
          {success ? (
            <div className="success-box">
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#10003;</div>
              <p style={{ fontWeight: '700', marginBottom: '4px' }}>{t('auth.passwordUpdated')}</p>
              <p style={{ fontSize: '13px', color: '#555' }}>{t('auth.redirectingToSignIn')}</p>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && <div className="error-box">{error}</div>}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.newPassword')}</label>
                <div className="gh-input-wrap">
                  <input
                    className="gh-input"
                    style={{ paddingRight: '36px' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.min8Chars')}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(s => !s)}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>{t('auth.confirmNewPassword')}</label>
                <div className="gh-input-wrap">
                  <input
                    className="gh-input"
                    style={{ paddingRight: '36px' }}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('auth.repeatPassword')}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowConfirm(s => !s)}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              <button type="submit" className="gh-btn-green" disabled={loading || !token}>
                {loading ? t('auth.updatingPassword') : t('auth.setNewPasswordBtn')}
              </button>
            </form>
          )}
        </div>

        <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
          <a href="/login" style={{ color: '#2d6a2d', fontWeight: '500' }}>{t('auth.backToSignIn')}</a>
        </p>

        <div style={{ marginTop: '20px' }}>
          <LanguageSelector />
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px', paddingBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '10px 16px', justifyContent: 'center' }}>
          {['terms', 'privacy', 'contactSupport'].map(k => (
            <a key={k} href="#" style={{ color: '#0969da', fontSize: '11px' }}>{t(`footer.${k}`)}</a>
          ))}
        </div>
      </div>
    </>
  )
}
