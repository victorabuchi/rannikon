export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('berrystime_token')
}

export function getWorker() {
  if (typeof window === 'undefined') return null
  const w = localStorage.getItem('berrystime_worker')
  return w ? JSON.parse(w) : null
}

export function saveAuth(token, worker) {
  localStorage.setItem('berrystime_token', token)
  localStorage.setItem('berrystime_worker', JSON.stringify(worker))
}

export function clearAuth() {
  localStorage.removeItem('berrystime_token')
  localStorage.removeItem('berrystime_worker')
}

export function isLoggedIn() {
  return !!getToken()
}