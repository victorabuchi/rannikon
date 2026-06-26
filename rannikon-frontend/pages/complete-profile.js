import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { saveAuth, isLoggedIn } from '../lib/auth'
import { useLanguage } from '@/lib/i18n'

export default function CompleteProfile() {
  const router = useRouter()
  const { t } = useLanguage()
  const [workNumber, setWorkNumber] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (typeof window !== 'undefined' && !isLoggedIn()) {
    router.replace('/login')
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!workNumber.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await api.patch('/api/auth/work-number', { work_number: workNumber.trim() })
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
      <Head><title>{t('auth.workNumber')} | Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a18;-webkit-font-smoothing:antialiased}
        .gh-input{width:100%;padding:5px 12px;font-size:14px;border:1px solid #d0d7de;border-radius:6px;background:#fff;font-family:inherit;color:#1a1a18;height:32px}
        .gh-input:focus{outline:none;border-color:#2d6a2d;box-shadow:0 0 0 3px rgba(45,106,45,0.15)}
        .gh-btn-green{width:100%;padding:5px 16px;height:34px;background:#2d6a2d;color:#fff;font-size:14px;font-weight:600;border:1px solid rgba(0,0,0,0.15);border-radius:6px;cursor:pointer;font-family:inherit}
        .gh-btn-green:disabled{background:#94a68e;cursor:not-allowed}
        .hint{font-size:12px;color:#8c959f;margin-top:4px;line-height:1.5}
        .error-box{background:#fff0f0;border:1px solid #ffc1c0;color:#cf2030;border-radius:6px;padding:8px 12px;font-size:13px;margin-bottom:12px}
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: '340px', border: '1px solid #d0d7de', borderRadius: '6px', padding: '24px', background: '#fff' }}>
          <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '48px', width: 'auto', display: 'block', margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: '20px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>{t('auth.workNumber')}</h1>
          <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '20px' }}>{t('register.workNumberHint')}</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <input
              className="gh-input"
              type="text"
              autoFocus
              placeholder={t('register.workNumberPlaceholder')}
              value={workNumber}
              onChange={e => setWorkNumber(e.target.value)}
              required
              style={{ marginBottom: '16px' }}
            />
            <button type="submit" className="gh-btn-green" disabled={loading}>
              {loading ? t('register.creatingAccount') : t('auth.register')}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
