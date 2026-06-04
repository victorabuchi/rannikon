import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import api from '../lib/api'
import { saveAuth } from '../lib/auth'

export default function Login() {
  const router = useRouter()
  const [workNumber, setWorkNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { work_number: workNumber, password })
      saveAuth(res.data.token, res.data.worker)
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inp = { width: '100%', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lbl = { display: 'block', fontWeight: '600', fontSize: '14px', marginBottom: '5px', color: '#333' }

  return (
    <>
      <Head><title>Login — Berrystime</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ background: '#f9f9f9', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>
            <span style={{ color: '#2d6a2d' }}>Berry</span><span style={{ color: '#000' }}>stime</span>
          </h1>
          <p style={{ textAlign: 'center', color: '#888', fontSize: '13px', marginBottom: '28px' }}>Sign in to your account</p>

          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '28px' }}>
            {error && (
              <div style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#c0392b', borderRadius: '8px', padding: '12px', fontSize: '14px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={lbl}>Work number</label>
                <input
                  style={inp}
                  type="text"
                  placeholder="e.g. 334"
                  value={workNumber}
                  onChange={e => setWorkNumber(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={lbl}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inp, paddingRight: '50px' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#666', fontFamily: 'inherit' }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '14px', background: loading ? '#aaa' : '#2d6a2d', color: '#fff', fontSize: '16px', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            No account?{' '}
            <a href="/register" style={{ color: '#2d6a2d', fontWeight: '600' }}>Register here</a>
          </p>
        </div>
      </div>
    </>
  )
}