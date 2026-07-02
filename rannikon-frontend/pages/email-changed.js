import { useRouter } from 'next/router'
import Head from 'next/head'

const MESSAGES = {
  success: { title: 'Email confirmed', body: 'Your account email has been updated.', color: '#2d6a2d' },
  expired: { title: 'Link expired', body: 'This confirmation link has expired or was already used. Please request the change again.', color: '#cf2030' },
  invalid: { title: 'Invalid link', body: 'This confirmation link is invalid.', color: '#cf2030' },
}

export default function EmailChanged() {
  const router = useRouter()
  const status = router.query.status
  const info = MESSAGES[status] || MESSAGES.invalid

  return (
    <>
      <Head><title>Confirm email | Rannikon</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'sans-serif', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '380px', border: '1px solid #d0d7de', borderRadius: '6px', padding: '28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px', color: info.color }}>{info.title}</h1>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{info.body}</p>
        </div>
      </div>
    </>
  )
}
