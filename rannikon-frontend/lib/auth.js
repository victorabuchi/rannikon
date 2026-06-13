export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('rannikon_token')
}

export function getWorker() {
  if (typeof window === 'undefined') return null
  const w = localStorage.getItem('rannikon_worker')
  return w ? JSON.parse(w) : null
}

export function saveAuth(token, worker) {
  localStorage.setItem('rannikon_token', token)
  localStorage.setItem('rannikon_worker', JSON.stringify(worker))
}

export function clearAuth() {
  localStorage.removeItem('rannikon_token')
  localStorage.removeItem('rannikon_worker')
}

export function isLoggedIn() {
  return !!getToken()
}