import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { saveAuth } from '../../lib/auth'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    const { token, worker } = router.query
    if (token && worker) {
      try {
        saveAuth(token, JSON.parse(decodeURIComponent(worker)))
        router.push('/dashboard')
      } catch {
        router.push('/login?error=invalid_callback')
      }
    } else {
      router.push('/login?error=no_token')
    }
  }, [router.isReady, router.query])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#555', fontSize: '15px' }}>Signing you in...</p>
    </div>
  )
}
